import { useState } from 'react';
import { Sparkles, X, Loader2, Wand2, Check, AlertCircle } from 'lucide-react';
import { Button } from '../Button';
import { toast } from 'react-hot-toast';
import { db } from '../../lib/firebase';
import { collection, addDoc } from 'firebase/firestore';

interface AIMenuGeneratorProps {
  restaurantId: string;
  onClose: () => void;
  onSuccess: () => void;
}

interface GeneratedItem {
  name: string;
  description: string;
  price: number;
  estimatedPrepTime: number;
}

interface GeneratedCategory {
  name: string;
  items: GeneratedItem[];
}

interface GeneratedMenu {
  categories: GeneratedCategory[];
}

export default function AIMenuGenerator({ restaurantId, onClose, onSuccess }: AIMenuGeneratorProps) {
  const [cuisine, setCuisine] = useState('');
  const [restaurantName, setRestaurantName] = useState('');
  const [slogan, setSlogan] = useState('');
  const [loading, setLoading] = useState(false);
  const [generatedMenu, setGeneratedMenu] = useState<GeneratedMenu | null>(null);
  const [applying, setApplying] = useState(false);

  const generateMenu = async () => {
    if (!cuisine || !restaurantName) {
      toast.error('Por favor, informe o tipo de culinária e o nome do restaurante.');
      return;
    }

    setLoading(true);
    try {
      const resp = await fetch('/api/ai/generate-menu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cuisine, restaurantName, slogan: slogan || undefined })
      });
      if (!resp.ok) {
        const errData = await resp.json();
        throw new Error(errData.error || 'Erro na geração');
      }
      const result = await resp.json();
      setGeneratedMenu(result.data);
      toast.success('Cardápio gerado com sucesso!');
    } catch (error) {
      console.error('Erro ao gerar cardápio:', error);
      toast.error('Ocorreu um erro ao gerar o cardápio. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const applyMenu = async () => {
    if (!generatedMenu) return;

    setApplying(true);
    try {
      for (let i = 0; i < generatedMenu.categories.length; i++) {
        const cat = generatedMenu.categories[i];
        
        // Create category
        const catRef = await addDoc(collection(db, 'categories'), {
          restaurantId,
          name: cat.name,
          order: i,
          isActive: true
        });

        // Create products for this category
        for (const item of cat.items) {
          await addDoc(collection(db, 'products'), {
            restaurantId,
            categoryId: catRef.id,
            name: item.name,
            description: item.description,
            price: item.price,
            estimatedPrepTime: item.estimatedPrepTime,
            isActive: true,
            isAvailable: true,
            isFeatured: false,
            optionGroups: [],
            createdAt: new Date().toISOString()
          });
        }
      }

      toast.success('Cardápio aplicado com sucesso!');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Erro ao aplicar cardápio:', error);
      toast.error('Erro ao salvar o cardápio gerado.');
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md">
      <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-slate-100 bg-brand-black text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand-egg rounded-xl">
              <Sparkles className="text-brand-black" size={20} />
            </div>
            <div>
              <h3 className="text-lg font-black uppercase italic tracking-tighter leading-none">Gerador de Cardápio IA</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Crie um menu inicial em segundos</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          {!generatedMenu ? (
            <div className="space-y-8">
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-brand-egg flex items-center justify-center shrink-0">
                    <Wand2 size={20} className="text-brand-black" />
                  </div>
                  <p className="text-sm font-medium text-slate-600 leading-relaxed">
                    Olá! Eu vou te ajudar a criar um cardápio incrível. Só preciso de algumas informações básicas sobre o seu restaurante.
                  </p>
                </div>
              </div>

              <div className="grid gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Tipo de Culinária</label>
                  <input 
                    type="text" 
                    placeholder="Ex: Pizzaria, Hamburgueria, Comida Japonesa..."
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 font-bold text-slate-700 focus:border-brand-egg focus:bg-white transition-all outline-none"
                    value={cuisine}
                    onChange={(e) => setCuisine(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Nome do Restaurante</label>
                  <input 
                    type="text" 
                    placeholder="Como se chama o seu negócio?"
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 font-bold text-slate-700 focus:border-brand-egg focus:bg-white transition-all outline-none"
                    value={restaurantName}
                    onChange={(e) => setRestaurantName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Slogan ou Curta Descrição (Opcional)</label>
                  <input 
                    type="text" 
                    placeholder="Ex: O melhor Burger da cidade"
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 font-bold text-slate-700 focus:border-brand-egg focus:bg-white transition-all outline-none"
                    value={slogan}
                    onChange={(e) => setSlogan(e.target.value)}
                  />
                </div>
              </div>

              <Button 
                onClick={generateMenu} 
                disabled={loading}
                className="w-full h-16 bg-brand-black text-white hover:bg-slate-800 rounded-2xl font-black text-sm uppercase tracking-[0.2em] italic shadow-xl shadow-slate-200 disabled:opacity-50"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="animate-spin" size={20} />
                    <span>GERANDO CARDÁPIO...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Sparkles size={20} className="text-brand-egg" />
                    <span>GERAR CARDÁPIO MÁGICO</span>
                  </div>
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-black text-brand-black uppercase italic tracking-tighter">Sugestão de Cardápio</h4>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Clique em aplicar para salvar no seu restaurante</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => setGeneratedMenu(null)} className="h-9 px-4 text-[10px] font-black">
                  RECOMEÇAR
                </Button>
              </div>

              <div className="space-y-6">
                {generatedMenu.categories.map((cat, idx) => (
                  <div key={idx} className="bg-slate-50 rounded-2xl border border-slate-100 overflow-hidden">
                    <div className="bg-slate-200/50 px-5 py-3 border-b border-slate-200">
                      <h5 className="text-[11px] font-black text-brand-black uppercase tracking-wider">{cat.name}</h5>
                    </div>
                    <div className="p-4 space-y-4">
                      {cat.items.map((item, itemIdx) => (
                        <div key={itemIdx} className="flex justify-between gap-4">
                          <div className="space-y-1">
                            <p className="text-sm font-black text-slate-700 uppercase leading-none">{item.name}</p>
                            <p className="text-[10px] text-slate-500 font-medium leading-relaxed">{item.description}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-xs font-black text-orange-600">R$ {item.price.toFixed(2)}</p>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{item.estimatedPrepTime} MIN</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl flex items-start gap-3">
                 <AlertCircle size={18} className="text-amber-500 shrink-0 mt-0.5" />
                 <p className="text-[10px] font-bold text-amber-700 leading-relaxed uppercase italic">
                   Atenção: Ao aplicar, as categorias e produtos serão adicionados ao seu cardápio atual. Você poderá editá-los ou excluí-los depois.
                 </p>
              </div>
            </div>
          )}
        </div>

        {generatedMenu && (
          <div className="p-6 border-t border-slate-100 bg-white flex gap-3">
             <Button 
               variant="outline" 
               className="flex-1 h-14 rounded-2xl font-black text-xs uppercase tracking-widest"
               onClick={onClose}
               disabled={applying}
             >
                CANCELAR
             </Button>
             <Button 
               className="flex-2 h-14 bg-brand-egg text-brand-black hover:bg-yellow-400 rounded-2xl font-black text-xs uppercase tracking-widest border-b-4 border-yellow-600 shadow-lg shadow-yellow-100"
               onClick={applyMenu}
               disabled={applying}
             >
                {applying ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="animate-spin" size={18} />
                    <span>APLICANDO...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Check size={18} strokeWidth={3} />
                    <span>APLICAR ESTE CARDÁPIO</span>
                  </div>
                )}
             </Button>
          </div>
        )}
      </div>
    </div>
  );
}
