import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, ChevronDown, Check } from 'lucide-react';
import { cn } from '../lib/utils';

const languages = [
  { code: 'pt', name: 'Português', flag: '🇧🇷' },
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
];

export default function LanguageSwitcher({ isDark }: { isDark?: boolean }) {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const current =
    languages.find((l) => i18n.language.startsWith(l.code)) || languages[0];

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const select = (code: string) => {
    i18n.changeLanguage(code);
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Idioma"
        className={cn(
          "flex items-center justify-center gap-1 w-9 h-9 sm:w-auto sm:h-auto sm:px-3 sm:py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-colors cursor-pointer",
          isDark
            ? "text-gray-300 hover:bg-white/10"
            : "text-slate-700 hover:bg-gray-100"
        )}
      >
        <Globe size={14} />
        <span className="text-sm leading-none">{current.flag}</span>
        <span className="hidden sm:inline">{current.code.toUpperCase()}</span>
        <ChevronDown size={12} className="hidden sm:block opacity-60" />
      </button>

      {open && (
        <div
          role="listbox"
          className={cn(
            "absolute right-0 top-[calc(100%+8px)] w-44 rounded-2xl shadow-2xl border py-1.5 z-50",
            isDark ? "bg-[#0f0f0f] border-white/10" : "bg-white border-gray-100"
          )}
        >
          {languages.map((lang) => (
            <button
              key={lang.code}
              type="button"
              role="option"
              aria-selected={lang.code === current.code}
              onClick={() => select(lang.code)}
              className={cn(
                "w-full flex items-center gap-3 px-3.5 py-2.5 text-left transition-colors",
                lang.code === current.code
                  ? isDark
                    ? "bg-white/5 text-white"
                    : "bg-slate-50 text-[#111]"
                  : isDark
                    ? "text-gray-300 hover:bg-white/5"
                    : "text-slate-600 hover:bg-gray-50"
              )}
            >
              <span className="text-base leading-none">{lang.flag}</span>
              <span className="text-xs font-bold flex-1">{lang.name}</span>
              {lang.code === current.code && <Check size={14} className="text-[#FFC928]" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}