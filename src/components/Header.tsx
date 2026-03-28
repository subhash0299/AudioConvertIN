import { Moon, Sun, Music } from 'lucide-react';

interface HeaderProps {
  darkMode: boolean;
  onToggleDarkMode: () => void;
}

export function Header({ darkMode, onToggleDarkMode }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/90 bg-white/90 shadow-sm backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/90">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 shadow-sm dark:bg-indigo-500">
            <Music size={20} className="text-white" strokeWidth={2.25} />
          </div>
          <div>
            <h1 className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-zinc-50 sm:text-xl">
              AudioConvertIN
            </h1>
            <p className="hidden text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:text-zinc-500 sm:block">
              In-browser · Private
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onToggleDarkMode}
          className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-600 dark:hover:bg-zinc-800"
          aria-label="Toggle dark mode"
        >
          {darkMode ? <Sun size={20} strokeWidth={2} /> : <Moon size={20} strokeWidth={2} />}
        </button>
      </div>
    </header>
  );
}
