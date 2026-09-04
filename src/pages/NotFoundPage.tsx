import { Link } from 'react-router-dom';
import { ChefHat } from 'lucide-react';
import { Logo } from '../components/Logo';
import { useTheme } from '../context/ThemeContext';

export default function NotFoundPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div className={`min-h-screen flex items-center justify-center p-8 not-found-page transition-colors ${isDark ? 'bg-dark-bg' : 'bg-slate-50'}`}>
      <div className="text-center max-w-md">
        <Link to="/" className="inline-block mb-6">
          <Logo size="md" variant="colored" />
        </Link>
        <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 ${isDark ? 'bg-[#FFC928]/10' : 'bg-[#FFC928]/10'}`}>
          <ChefHat size={40} className="text-[#FFC928]" />
        </div>
        <h1 className={`font-black text-6xl mb-2 ${isDark ? 'text-white' : 'text-[#111]'}`}>404</h1>
        <p className={`text-sm mb-8 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Página não encontrada</p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 bg-[#FFC928] text-[#111] font-black px-6 py-3 rounded-2xl hover:bg-[#e6b520] hover:scale-105 active:scale-95 transition-all"
        >
          Voltar ao início
        </Link>
      </div>
    </div>
  );
}
