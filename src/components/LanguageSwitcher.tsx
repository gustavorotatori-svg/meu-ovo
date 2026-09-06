import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';
import { cn } from '../lib/utils';

const languages = [
  { code: 'pt', name: 'Português', flag: '🇧🇷' },
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
];

export default function LanguageSwitcher({ isDark }: { isDark?: boolean }) {
  const { i18n } = useTranslation();

  return (
    <div className="relative">
      <Globe size={14} className={cn(
        "absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none z-10",
        isDark ? "text-gray-400" : "text-slate-500"
      )} />
      <select
        value={i18n.language.startsWith('pt') ? 'pt' : i18n.language.startsWith('es') ? 'es' : 'en'}
        onChange={(e) => i18n.changeLanguage(e.target.value)}
        className={cn(
          "appearance-none pl-7 pr-5 sm:pl-8 sm:pr-7 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-colors cursor-pointer",
          isDark
            ? "bg-white/5 text-gray-300 hover:bg-white/10 border-0"
            : "bg-slate-100 text-slate-700 hover:bg-slate-200 border-0"
        )}
      >
        {languages.map((lang) => (
          <option key={lang.code} value={lang.code} title={lang.name}>
            {lang.flag} {lang.code.toUpperCase()}
          </option>
        ))}
      </select>
      <div className={cn(
        "absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none",
        isDark ? "text-gray-500" : "text-slate-400"
      )}>
        <svg width="10" height="6" viewBox="0 0 10 6" fill="none">
          <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
    </div>
  );
}
