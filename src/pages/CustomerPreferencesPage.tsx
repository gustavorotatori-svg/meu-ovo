import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Utensils, ChevronRight, Check, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { cuisineTypes, cuisineEmojis } from '../data/mockData';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { toast } from 'react-hot-toast';

export default function CustomerPreferencesPage() {
  const { user, updateCuisinePreferences } = useAuth();
  const navigate = useNavigate();
  const [selected, setSelected] = useState<string[]>(user?.cuisinePreferences || []);
  const [saving, setSaving] = useState(false);

  const toggle = (cuisine: string) => {
    setSelected(prev =>
      prev.includes(cuisine)
        ? prev.filter(c => c !== cuisine)
        : [...prev, cuisine]
    );
  };

  const handleSave = async () => {
    if (selected.length === 0) {
      toast.error('Selecione pelo menos um tipo de cozinha.');
      return;
    }
    setSaving(true);
    try {
      await updateCuisinePreferences(selected);
      toast.success('Preferências salvas!');
      navigate('/busca');
    } catch {
      toast.error('Erro ao salvar preferências.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <Navbar />
      <main className="max-w-2xl mx-auto px-6 py-12 lg:py-20">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-400 hover:text-slate-600 mb-8 transition-colors"
        >
          <ArrowLeft size={14} /> Voltar
        </button>

        <div className="text-center mb-10">
          <div className="w-16 h-16 rounded-2xl bg-[#FFC928]/10 flex items-center justify-center mx-auto mb-4">
            <Utensils size={28} className="text-[#FFC928]" />
          </div>
          <h1 className="font-display font-black text-3xl uppercase tracking-tighter italic leading-none text-[#111]">
            Suas Preferências
          </h1>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2 max-w-xs mx-auto">
            Selecione os tipos de cozinha que você mais gosta para encontrar os melhores restaurantes
          </p>
        </div>

        <div className="flex flex-wrap gap-3 justify-center mb-10">
          {cuisineTypes.map(cuisine => {
            const isSelected = selected.includes(cuisine);
            return (
              <motion.button
                key={cuisine}
                onClick={() => toggle(cuisine)}
                whileTap={{ scale: 0.95 }}
                className={`relative flex items-center gap-2 px-4 py-3 rounded-2xl border-2 transition-all font-black text-xs uppercase tracking-wider ${
                  isSelected
                    ? 'bg-[#111] border-[#111] text-white shadow-lg'
                    : 'bg-white border-slate-100 text-slate-600 hover:border-slate-200 hover:bg-slate-50'
                }`}
              >
                <span className="text-lg">{cuisineEmojis[cuisine] || '🍽️'}</span>
                {cuisine}
                {isSelected && (
                  <span className="w-5 h-5 rounded-full bg-[#FFC928] flex items-center justify-center">
                    <Check size={12} className="text-black" />
                  </span>
                )}
              </motion.button>
            );
          })}
        </div>

        <div className="text-center space-y-4">
          <button
            onClick={handleSave}
            disabled={saving || selected.length === 0}
            className="inline-flex items-center gap-2 bg-[#FFC928] hover:bg-[#e6b520] text-black font-black uppercase tracking-wider text-xs px-8 py-4 rounded-full transition-all hover:scale-105 shadow-lg shadow-[#FFC928]/25 disabled:opacity-50 disabled:hover:scale-100"
          >
            {saving ? 'Salvando...' : 'Salvar Preferências'}
            <ChevronRight size={14} />
          </button>
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
            {selected.length} de {cuisineTypes.length} selecionados
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
