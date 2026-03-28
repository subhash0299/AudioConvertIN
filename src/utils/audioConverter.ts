import { FFmpeg } from '@ffmpeg/ffmpeg';
import type { FFMessageLoadConfig } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';

/** Vite `?url` strings are often root-relative; workers need absolute URLs for importScripts(). */
function sameOriginAssetUrl(path: string): string {
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('blob:')) {
    return path;
  }
  return new URL(path, window.location.origin).href;
}

export type OutputFormat = 'mp3' | 'flac' | 'wav';
export type ConversionStatus = 'waiting' | 'converting' | 'done' | 'error' | 'cancelled';

export interface AudioFile {
  id: string;
  file: File;
  name: string;
  size: number;
  format: string;
  status: ConversionStatus;
  progress: number;
  outputFormat: OutputFormat;
  convertedBlob?: Blob;
  convertedSize?: number;
  error?: string;
}

function canUseMultiThreadedCore(): boolean {
  return (
    typeof crossOriginIsolated !== 'undefined' &&
    crossOriginIsolated === true &&
    typeof SharedArrayBuffer !== 'undefined'
  );
}

export class AudioConverter {
  private ffmpeg: FFmpeg;
  private loaded: boolean = false;
  private multiThread: boolean = false;

  constructor() {
    this.ffmpeg = new FFmpeg();
  }

  /** True after load() if multi-threaded core-mt is active (needs COOP/COEP headers). */
  usesMultiThread(): boolean {
    return this.multiThread;
  }

  private async resolveLoadConfig(): Promise<FFMessageLoadConfig> {
    if (canUseMultiThreadedCore()) {
      const { mtCoreUrls } = await import('./ffmpegMtAssets');
      this.multiThread = true;

      return {
        coreURL: sameOriginAssetUrl(mtCoreUrls.corePath),
        wasmURL: sameOriginAssetUrl(mtCoreUrls.wasmPath),
        workerURL: sameOriginAssetUrl(mtCoreUrls.workerPath),
      };
    }

    const { stCoreUrls } = await import('./ffmpegStAssets');
    this.multiThread = false;

    return {
      coreURL: sameOriginAssetUrl(stCoreUrls.corePath),
      wasmURL: sameOriginAssetUrl(stCoreUrls.wasmPath),
    };
  }

  private registerLoggerHandlers(onProgress?: (progress: number) => void): void {
    this.ffmpeg.on('log', ({ message }) => {
      if (import.meta.env.DEV) {
        console.log(message);
      }
    });
    if (onProgress) {
      this.ffmpeg.on('progress', ({ progress }) => {
        onProgress(Math.round(progress * 100));
      });
    }
  }

  async load(onProgress?: (progress: number) => void): Promise<void> {
    if (this.loaded) return;

    this.registerLoggerHandlers(onProgress);

    const config = await this.resolveLoadConfig();

    try {
      await this.ffmpeg.load(config);
    } catch (err) {
      if (!this.multiThread) {
        throw err;
      }
      console.warn('FFmpeg multi-threaded core failed; retrying with single-threaded (ESM) core.', err);
      this.ffmpeg = new FFmpeg();
      this.multiThread = false;
      this.registerLoggerHandlers(onProgress);
      const { stCoreUrls } = await import('./ffmpegStAssets');
      await this.ffmpeg.load({
        coreURL: sameOriginAssetUrl(stCoreUrls.corePath),
        wasmURL: sameOriginAssetUrl(stCoreUrls.wasmPath),
      });
    }

    this.loaded = true;
  }

  async convert(
    file: File,
    outputFormat: OutputFormat,
    onProgress?: (progress: number) => void,
    signal?: AbortSignal
  ): Promise<Blob> {
    if (!this.loaded) {
      await this.load();
    }

    if (signal?.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }

    const inputFileName = `input.${file.name.split('.').pop()}`;
    const outputFileName = `output.${outputFormat}`;

    const onProg = ({ progress }: { progress: number }) => {
      onProgress?.(Math.round(progress * 100));
    };
    if (onProgress) {
      this.ffmpeg.on('progress', onProg);
    }

    try {
      const raw = await fetchFile(file);
      if (signal?.aborted) {
        throw new DOMException('Aborted', 'AbortError');
      }
      await this.ffmpeg.writeFile(inputFileName, raw, { signal });

      const args = this.getFFmpegArgs(inputFileName, outputFileName, outputFormat);
      await this.ffmpeg.exec(args, undefined, { signal });

      const data = await this.ffmpeg.readFile(outputFileName, 'binary', { signal });

      await this.ffmpeg.deleteFile(inputFileName, { signal });
      await this.ffmpeg.deleteFile(outputFileName, { signal });

      const mimeType = this.getMimeType(outputFormat);
      const u8 = new Uint8Array(data as Uint8Array);
      return new Blob([u8], { type: mimeType });
    } finally {
      if (onProgress) {
        this.ffmpeg.off('progress', onProg);
      }
    }
  }

  private getFFmpegArgs(input: string, output: string, format: OutputFormat): string[] {
    // Speed-focused: hide_banner + error logs, drop video/cover streams, use all threads (core-mt).
    // Omitting -ar avoids resampling (large win when source is already 44.1/48 kHz).
    const baseArgs = ['-hide_banner', '-loglevel', 'error', '-threads', '0', '-i', input, '-vn'];

    switch (format) {
      case 'mp3':
        // VBR q=4: faster than high CBR; typical ~165 kbps. Tweak q (0=best/slow … 9=fast/smaller).
        return [...baseArgs, '-codec:a', 'libmp3lame', '-q:a', '4', output];
      case 'flac':
        return [...baseArgs, '-codec:a', 'flac', '-compression_level', '0', output];
      case 'wav':
        return [...baseArgs, '-codec:a', 'pcm_s16le', output];
      default:
        return [...baseArgs, output];
    }
  }

  private getMimeType(format: OutputFormat): string {
    switch (format) {
      case 'mp3':
        return 'audio/mpeg';
      case 'flac':
        return 'audio/flac';
      case 'wav':
        return 'audio/wav';
      default:
        return 'audio/mpeg';
    }
  }

  isLoaded(): boolean {
    return this.loaded;
  }

  /** Stop worker and free memory (call after a batch when using extra pool instances). */
  terminate(): void {
    this.ffmpeg.terminate();
    this.loaded = false;
    this.multiThread = false;
  }
}

export const audioConverter = new AudioConverter();

/** How many FFmpeg instances to run at once (caps RAM: ~32MB wasm each). */
export function conversionParallelism(fileCount: number): number {
  const hw = typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 4 : 4;
  return Math.max(1, Math.min(fileCount, hw, 8));
}
