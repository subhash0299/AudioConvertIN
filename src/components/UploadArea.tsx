import { useCallback, useState } from 'react';
import { Upload } from 'lucide-react';
import { isValidAudioFile, MAX_FILES } from '../utils/fileHelpers';

interface UploadAreaProps {
  onFilesSelected: (files: File[]) => void;
  disabled?: boolean;
}

export function UploadArea({ onFilesSelected, disabled }: UploadAreaProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragIn = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  }, []);

  const handleDragOut = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      if (disabled) return;

      const files = Array.from(e.dataTransfer.files);
      const validFiles = files.filter(isValidAudioFile).slice(0, MAX_FILES);

      if (validFiles.length > 0) {
        onFilesSelected(validFiles);
      }
    },
    [onFilesSelected, disabled]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (disabled) return;

      const files = Array.from(e.target.files || []);
      const validFiles = files.filter(isValidAudioFile).slice(0, MAX_FILES);

      if (validFiles.length > 0) {
        onFilesSelected(validFiles);
      }

      e.target.value = '';
    },
    [onFilesSelected, disabled]
  );

  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border-2 border-dashed text-center transition-all duration-200 ${
        isDragging
          ? 'scale-[1.005] border-indigo-500 bg-indigo-50 dark:border-indigo-400 dark:bg-indigo-950/40'
          : 'border-slate-300 bg-white shadow-sm hover:border-indigo-400 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-indigo-500/60'
      } ${disabled ? 'cursor-not-allowed opacity-45' : 'cursor-pointer'}`}
      onDragEnter={handleDragIn}
      onDragLeave={handleDragOut}
      onDragOver={handleDrag}
      onDrop={handleDrop}
    >
      <input
        type="file"
        multiple
        accept=".wav,.mp3,.flac,.aac,.m4a,.ogg,.wma"
        onChange={handleFileInput}
        className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
        disabled={disabled}
      />

      <div className="relative z-0 flex flex-col items-center gap-5 px-6 py-14 sm:py-16">
        <div
          className={`flex h-20 w-20 items-center justify-center rounded-2xl transition-all duration-200 ${
            isDragging
              ? 'scale-105 bg-indigo-600 text-white shadow-md dark:bg-indigo-500'
              : 'bg-slate-100 text-slate-600 group-hover:bg-indigo-100 group-hover:text-indigo-700 dark:bg-zinc-800 dark:text-zinc-400 dark:group-hover:bg-indigo-950 dark:group-hover:text-indigo-300'
          }`}
        >
          <Upload size={36} strokeWidth={1.75} />
        </div>

        <div className="space-y-2">
          <h3 className="text-lg font-bold tracking-tight text-slate-900 dark:text-zinc-50 sm:text-xl">
            Drop audio files here
          </h3>
          <p className="text-sm font-medium text-slate-600 dark:text-zinc-400">
            or click to browse — up to {MAX_FILES} files
          </p>
        </div>

        <div className="rounded-full border border-slate-200 bg-slate-50 px-4 py-1.5 text-xs font-medium text-slate-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400">
          WAV · MP3 · FLAC · AAC · M4A · OGG · WMA
        </div>
      </div>
    </div>
  );
}
