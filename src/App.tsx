import { useState, useEffect, useCallback, useRef } from 'react';
import { Download, Loader2, Ban } from 'lucide-react';
import { Header } from './components/Header';
import { UploadArea } from './components/UploadArea';
import { FileCard } from './components/FileCard';
import {
  AudioFile,
  OutputFormat,
  audioConverter,
  AudioConverter,
  conversionParallelism,
} from './utils/audioConverter';
import { generateId, getFileExtension, downloadBlob } from './utils/fileHelpers';

function App() {
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : false;
  });
  const [audioFiles, setAudioFiles] = useState<AudioFile[]>([]);
  const [isConverting, setIsConverting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [parallelBatchSize, setParallelBatchSize] = useState(1);
  /** Output format for every file in the list (single control for the whole batch). */
  const [convertToFormat, setConvertToFormat] = useState<OutputFormat>('mp3');

  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  useEffect(() => {
    const loadFFmpeg = async () => {
      setIsLoading(true);
      try {
        await audioConverter.load();
      } catch (error) {
        console.error('Failed to load FFmpeg:', error);
      }
      setIsLoading(false);
    };

    loadFFmpeg();
  }, []);

  const handleFilesSelected = useCallback(
    (files: File[]) => {
      const newAudioFiles: AudioFile[] = files.map((file) => ({
        id: generateId(),
        file,
        name: file.name,
        size: file.size,
        format: getFileExtension(file.name),
        status: 'waiting',
        progress: 0,
        outputFormat: convertToFormat,
      }));

      setAudioFiles((prev) => [...prev, ...newAudioFiles]);
    },
    [convertToFormat]
  );

  useEffect(() => {
    setAudioFiles((prev) =>
      prev.map((f) => (f.status === 'waiting' ? { ...f, outputFormat: convertToFormat } : f))
    );
  }, [convertToFormat]);

  const handleCancelConversion = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  const handleConvertAll = async () => {
    const filesToConvert = audioFiles.filter((file) => file.status === 'waiting');
    if (filesToConvert.length === 0) return;

    const batchFormat = convertToFormat;

    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    const { signal } = abortController;

    const workers = conversionParallelism(filesToConvert.length);
    setParallelBatchSize(workers);
    setIsConverting(true);

    const pool: AudioConverter[] = Array.from({ length: workers }, () => new AudioConverter());

    try {
      await Promise.all(pool.map((c) => c.load()));

      let next = 0;
      const runWorker = async (conv: AudioConverter) => {
        while (!signal.aborted) {
          const idx = next;
          next += 1;
          if (idx >= filesToConvert.length) {
            return;
          }

          const audioFile = filesToConvert[idx];

          setAudioFiles((prev) =>
            prev.map((f) =>
              f.id === audioFile.id ? { ...f, status: 'converting' as const, progress: 0 } : f
            )
          );

          try {
            const blob = await conv.convert(
              audioFile.file,
              batchFormat,
              (progress) => {
                setAudioFiles((prev) =>
                  prev.map((f) => (f.id === audioFile.id ? { ...f, progress } : f))
                );
              },
              signal
            );

            setAudioFiles((prev) =>
              prev.map((f) =>
                f.id === audioFile.id
                  ? {
                      ...f,
                      status: 'done' as const,
                      progress: 100,
                      outputFormat: batchFormat,
                      convertedBlob: blob,
                      convertedSize: blob.size,
                    }
                  : f
              )
            );
          } catch (err) {
            const aborted =
              signal.aborted || (err instanceof DOMException && err.name === 'AbortError');
            setAudioFiles((prev) =>
              prev.map((f) =>
                f.id === audioFile.id
                  ? aborted
                    ? { ...f, status: 'cancelled' as const, progress: 0 }
                    : { ...f, status: 'error' as const, error: 'Conversion failed' }
                  : f
              )
            );
          }
        }
      };

      await Promise.all(pool.map((c) => runWorker(c)));
    } catch (e) {
      console.error('Batch conversion error:', e);
    } finally {
      pool.forEach((c) => c.terminate());
      abortControllerRef.current = null;
      setIsConverting(false);

      if (signal.aborted) {
        setAudioFiles((prev) =>
          prev.map((f) =>
            f.status === 'waiting' || f.status === 'converting'
              ? { ...f, status: 'cancelled' as const, progress: 0 }
              : f
          )
        );
      }
    }
  };

  const handleDownload = useCallback(
    (id: string) => {
      const audioFile = audioFiles.find((file) => file.id === id);
      if (!audioFile || !audioFile.convertedBlob) return;

      const baseFileName = audioFile.name.substring(0, audioFile.name.lastIndexOf('.'));
      const ext = audioFile.outputFormat ?? 'mp3';
      const fileName = `${baseFileName}.${ext}`;

      downloadBlob(audioFile.convertedBlob, fileName);
    },
    [audioFiles]
  );

  const handleDownloadAll = useCallback(() => {
    const completedFiles = audioFiles.filter((file) => file.status === 'done');
    completedFiles.forEach((file) => {
      handleDownload(file.id);
    });
  }, [audioFiles, handleDownload]);

  const handleClear = useCallback(() => {
    setAudioFiles([]);
  }, []);

  const hasFiles = audioFiles.length > 0;
  const hasWaitingFiles = audioFiles.some((file) => file.status === 'waiting');
  const hasCompletedFiles = audioFiles.some((file) => file.status === 'done');

  return (
    <div className="relative min-h-screen bg-slate-50 dark:bg-zinc-950">
      {/* Subtle top glow only — avoids a bright “band” across the middle */}
      <div
        className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-[min(60vh,560px)] bg-[radial-gradient(ellipse_90%_60%_at_50%_0%,rgba(99,102,241,0.09),transparent_65%)] dark:bg-[radial-gradient(ellipse_80%_50%_at_50%_0%,rgba(99,102,241,0.07),transparent_60%)]"
        aria-hidden
      />

      <div className="relative">
        <Header darkMode={darkMode} onToggleDarkMode={() => setDarkMode(!darkMode)} />

        <main className="mx-auto max-w-5xl px-4 pb-20 pt-10 sm:px-6 sm:pt-14 lg:px-8">
          <div className="mb-10 text-center sm:mb-14">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-zinc-500">
              Private · No uploads
            </p>
            <h2 className="mx-auto max-w-2xl text-4xl font-extrabold tracking-tight text-slate-900 dark:text-zinc-50 sm:text-5xl">
              Convert audio{' '}
              <span className="text-indigo-600 dark:text-indigo-400">flawlessly</span>
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-base font-medium leading-relaxed text-slate-600 dark:text-zinc-400">
              Fast, secure, and free — everything runs locally in your browser.
            </p>
          </div>

          {isLoading && (
            <div className="mb-8 flex items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <Loader2 className="h-5 w-5 shrink-0 animate-spin text-indigo-600 dark:text-indigo-400" />
              <span className="text-sm font-semibold text-slate-800 dark:text-zinc-200">
                Loading audio converter…
              </span>
            </div>
          )}

          <div className="mb-10">
            <UploadArea onFilesSelected={handleFilesSelected} disabled={isConverting} />
          </div>

          {hasFiles && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                    <h3 className="shrink-0 text-lg font-bold tracking-tight text-slate-900 dark:text-zinc-100">
                      Queue{' '}
                      <span className="font-extrabold text-indigo-600 dark:text-indigo-400">
                        ({audioFiles.length})
                      </span>
                    </h3>
                    <label className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-700 dark:text-zinc-300">
                      <span className="whitespace-nowrap">Convert to</span>
                      <select
                        value={convertToFormat}
                        onChange={(e) => setConvertToFormat(e.target.value as OutputFormat)}
                        disabled={isConverting}
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 shadow-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/25 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                      >
                        <option value="mp3">MP3</option>
                        <option value="flac">FLAC</option>
                        <option value="wav">WAV</option>
                      </select>
                    </label>
                    {isConverting && (
                      <span className="inline-flex items-center rounded-full bg-indigo-100 px-2.5 py-1 text-xs font-semibold text-indigo-800 dark:bg-indigo-950 dark:text-indigo-200">
                        Up to {parallelBatchSize} parallel
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={handleClear}
                      disabled={isConverting}
                      className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                    >
                      Clear All
                    </button>
                    {hasCompletedFiles && (
                      <button
                        type="button"
                        onClick={handleDownloadAll}
                        disabled={isConverting}
                        className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-500 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Download size={17} strokeWidth={2.25} />
                        Download All
                      </button>
                    )}
                    {isConverting && (
                      <button
                        type="button"
                        onClick={handleCancelConversion}
                        className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-red-500 active:scale-[0.98]"
                      >
                        <Ban size={17} strokeWidth={2.25} />
                        Cancel
                      </button>
                    )}
                    {(hasWaitingFiles || isConverting) && (
                      <button
                        type="button"
                        onClick={handleConvertAll}
                        disabled={isConverting || isLoading || !hasWaitingFiles}
                        className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-500 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isConverting ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Converting…
                          </>
                        ) : (
                          'Convert All'
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {audioFiles.map((audioFile) => (
                  <FileCard key={audioFile.id} audioFile={audioFile} onDownload={handleDownload} />
                ))}
              </div>
            </div>
          )}

          {!hasFiles && !isLoading && (
            <div className="py-14 text-center">
              <p className="text-sm font-medium text-slate-500 dark:text-zinc-500">
                Upload audio files above to get started
              </p>
            </div>
          )}
        </main>

        <footer className="mt-12 border-t border-slate-200 py-8 dark:border-zinc-800">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <p className="text-center text-xs font-medium leading-relaxed text-slate-500 dark:text-zinc-500">
              All conversions run in your browser. Your files never leave your device.
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default App;
