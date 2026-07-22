import { Link } from 'react-router-dom';
import { ChefHat } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-8 not-found-page">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 bg-[#FFC928]/10 rounded-3xl flex items-center justify-center mx-auto mb-6">
          <ChefHat size={40} className="text-[#FFC928]" />
        </div>
        <h1 className="font-black text-6xl text-[#111] mb-2">404</h1>
        <p className="text-slate-500 text-sm mb-8">Página não encontrada</p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 bg-[#111] text-white font-black px-6 py-3 rounded-2xl hover:bg-[#2a2a2a] transition-all"
        >
          Voltar ao início
        </Link>
      </div>
    </div>
  );
}
