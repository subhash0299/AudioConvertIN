import { Download, FileAudio, Loader2, CheckCircle, XCircle, Ban } from 'lucide-react';
import { AudioFile } from '../utils/audioConverter';
import { formatFileSize } from '../utils/fileHelpers';

interface FileCardProps {
  audioFile: AudioFile;
  onDownload: (id: string) => void;
}

export function FileCard({ audioFile, onDownload }: FileCardProps) {
  const getStatusIcon = () => {
    const wrap = 'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl';
    switch (audioFile.status) {
      case 'waiting':
        return (
          <div className={`${wrap} bg-slate-100 dark:bg-zinc-800`}>
            <FileAudio className="text-slate-500 dark:text-zinc-400" size={22} strokeWidth={1.75} />
          </div>
        );
      case 'converting':
        return (
          <div className={`${wrap} bg-indigo-100 dark:bg-indigo-950`}>
            <Loader2 className="animate-spin text-indigo-600 dark:text-indigo-400" size={22} />
          </div>
        );
      case 'done':
        return (
          <div className={`${wrap} bg-emerald-100 dark:bg-emerald-950/60`}>
            <CheckCircle className="text-emerald-600 dark:text-emerald-400" size={22} strokeWidth={2} />
          </div>
        );
      case 'error':
        return (
          <div className={`${wrap} bg-red-100 dark:bg-red-950/50`}>
            <XCircle className="text-red-600 dark:text-red-400" size={22} strokeWidth={2} />
          </div>
        );
      case 'cancelled':
        return (
          <div className={`${wrap} bg-amber-100 dark:bg-amber-950/50`}>
            <Ban className="text-amber-600 dark:text-amber-400" size={22} strokeWidth={2} />
          </div>
        );
    }
  };

  const getStatusText = () => {
    switch (audioFile.status) {
      case 'waiting':
        return 'Waiting';
      case 'converting':
        return `Converting… ${audioFile.progress}%`;
      case 'done':
        return 'Done';
      case 'error':
        return 'Error';
      case 'cancelled':
        return 'Cancelled';
    }
  };

  return (
    <div className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-200 hover:border-slate-300 hover:shadow dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700">
      <div className="flex items-start gap-4">
        <div className="mt-0.5 shrink-0">{getStatusIcon()}</div>

        <div className="min-w-0 flex-1">
          <div className="mb-3">
            <h4 className="truncate text-sm font-semibold tracking-tight text-slate-900 dark:text-zinc-50">
              {audioFile.name}
            </h4>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-slate-500 dark:text-zinc-400">
                {formatFileSize(audioFile.size)}
              </span>
              <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-600 dark:bg-zinc-800 dark:text-zinc-400">
                {audioFile.format}
              </span>
            </div>
          </div>

          {audioFile.status === 'converting' && (
            <div className="mb-3">
              <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-zinc-800">
                <div
                  className="h-full rounded-full bg-indigo-500 transition-[width] duration-300 ease-out dark:bg-indigo-400"
                  style={{ width: `${audioFile.progress}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-semibold text-slate-600 dark:text-zinc-400">
              {getStatusText()}
            </span>

            {audioFile.status === 'done' && audioFile.convertedSize && (
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  {formatFileSize(audioFile.convertedSize)}
                </span>
                <button
                  type="button"
                  onClick={() => onDownload(audioFile.id)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-indigo-500 active:scale-[0.98]"
                >
                  <Download size={14} strokeWidth={2.25} />
                  Download
                </button>
              </div>
            )}

            {audioFile.status === 'error' && (
              <span className="text-xs font-medium text-red-600 dark:text-red-400">{audioFile.error}</span>
            )}
            {audioFile.status === 'cancelled' && (
              <span className="text-xs font-medium text-amber-600 dark:text-amber-400">Stopped</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
