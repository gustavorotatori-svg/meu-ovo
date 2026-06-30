import { useState, useEffect } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { Restaurant } from '../../types';
import { db } from '../../lib/firebase';
import { collection, query, where, getDocs, doc, updateDoc, setDoc, getDoc } from 'firebase/firestore';
import { Trophy, Shield, Calendar, Utensils, CheckCircle2, Loader2, ArrowRight } from 'lucide-react';
import AdminLayout from './AdminLayout';
import { Button } from '../../components/Button';
import { toast } from 'react-hot-toast';

export default function OvosDeOuro() {
  const { currentRestaurant, setCurrentRestaurant } = useRestaurant();
  const [loading, setLoading] = useState(true);
  const [isParticipant, setIsParticipant] = useState(false);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    if (!currentRestaurant) return;
    const checkParticipation = async () => {
      try {
        const rDoc = await getDoc(doc(db, 'restaurants', currentRestaurant.id));
        let optedIn = false;
        if (rDoc.exists() && rDoc.data().ovosDeOuroParticipant) {
          optedIn = true;
        } else {
          const partDoc = await getDoc(doc(db, 'ovos_de_ouro_participants', currentRestaurant.id));
          if (partDoc.exists()) optedIn = true;
        }
        setIsParticipant(optedIn);
      } catch {
        setIsParticipant(false);
      } finally {
        setLoading(false);
      }
    };
    checkParticipation();
  }, [currentRestaurant]);

  const handleAcceptParticipation = async () => {
    if (!currentRestaurant) return;
    setAccepting(true);
    try {
      const rRef = doc(db, 'restaurants', currentRestaurant.id);
      await updateDoc(rRef, { ovosDeOuroParticipant: true }).catch(async () => {
        await setDoc(doc(db, 'ovos_de_ouro_participants', currentRestaurant.id), {
          restaurantId: currentRestaurant.id,
          restaurantName: currentRestaurant.name,
          acceptedAt: new Date().toISOString()
        });
      });
      if (currentRestaurant) {
        setCurrentRestaurant({
          ...currentRestaurant,
          ovosDeOuroParticipant: true,
        } as Restaurant);
      }
      setIsParticipant(true);
      toast.success('Participação confirmada!');
    } catch {
      toast.error('Erro ao registrar participação.');
    } finally {
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center p-12 min-h-[50vh]">
          <Loader2 className="animate-spin text-amber-500 mb-4" size={40} />
          <p className="text-sm font-semibold text-slate-500 uppercase tracking-widest">Carregando...</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto space-y-8 pb-12">
        <div className="relative rounded-[2.5rem] bg-gradient-to-r from-[#111111] via-[#1a1a1a] to-[#111111] border border-[#FFC928]/30 p-8 md:p-10 text-white overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-yellow-500/10 to-transparent blur-3xl rounded-full" />
          <div className="absolute -bottom-8 -left-8 w-48 h-48 bg-gradient-to-tr from-amber-500/10 to-transparent blur-2xl rounded-full" />
          <div className="flex flex-col md:flex-row items-center gap-6 md:gap-8 relative z-10">
            <div className="p-5 bg-[#FFC928] rounded-[2rem] text-[#111] shadow-xl shadow-yellow-500/10 border-2 border-yellow-300 transform md:-rotate-3">
              <Trophy size={40} className="text-[#111]" />
            </div>
            <div className="flex-1 text-center md:text-left space-y-2">
              <div className="inline-flex items-center gap-2 bg-[#FFC928]/10 text-[#FFC928] border border-[#FFC928]/20 px-3.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider">
                👑 Prêmio Ovos de Ouro
              </div>
              <h2 className="text-3xl font-black italic uppercase tracking-tighter leading-none">Votação Popular Meu Ovo</h2>
              <p className="text-sm text-gray-400 font-medium max-w-xl leading-relaxed">
                O prêmio que elege os melhores pratos e restaurantes do ano, impulsionado pelas notas dos consumidores.
              </p>
            </div>
          </div>
        </div>

        {!isParticipant ? (
          <div className="bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-xl space-y-6">
            <div className="space-y-2">
              <h3 className="text-2xl font-black italic uppercase tracking-tighter text-[#111]">Regulamento e Termo de Adesão</h3>
              <p className="text-sm text-slate-500">Leia atentamente as diretrizes para inscrever seu estabelecimento:</p>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 flex gap-3.5">
                <Calendar className="text-amber-500 shrink-0 mt-0.5" size={20} />
                <div className="text-left space-y-1">
                  <p className="font-extrabold text-[#111] text-xs uppercase tracking-wider">Cronograma Anual</p>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Votação de <strong>1 de Janeiro</strong> a <strong>15 de Dezembro</strong>. Resultados divulgados em <strong>20 de Dezembro</strong>. A competição fica offline de 15 de Dezembro a 1 de Janeiro.
                  </p>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 flex gap-3.5">
                <Utensils className="text-amber-500 shrink-0 mt-0.5" size={20} />
                <div className="text-left space-y-1">
                  <p className="font-extrabold text-[#111] text-xs uppercase tracking-wider">Metodologia</p>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Clientes avaliam pratos que realmente compraram. Bebidas e industrializados não entram na disputa. Sistema antifraude contra votos falsos.
                  </p>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 flex gap-3.5">
                <Trophy className="text-amber-500 shrink-0 mt-0.5" size={20} />
                <div className="text-left space-y-1">
                  <p className="font-extrabold text-[#111] text-xs uppercase tracking-wider">Categorias</p>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Top 3 por bairro • Melhores por tipo de cozinha • Top 3 por cidade • Pratos premiados ganham selo por 1 ano.
                  </p>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-amber-50/50 border border-amber-100 flex gap-3.5">
                <Shield className="text-amber-600 shrink-0 mt-0.5" size={20} />
                <div className="text-left space-y-1">
                  <p className="font-extrabold text-amber-950 text-xs uppercase tracking-wider">Ranking 100% Privado</p>
                  <p className="text-xs text-amber-850 leading-relaxed">
                    O ranking geral e as notas brutas individuais são confidenciais. Nenhum concorrente ou cliente terá acesso às suas notas. Apenas o Top 3 é revelado publicamente em 20 de Dezembro.
                  </p>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-slate-500 text-xs font-bold">
                <CheckCircle2 className="text-green-500" size={18} />
                <span>Inscrição Gratuita</span>
              </div>

              <Button
                onClick={handleAcceptParticipation}
                disabled={accepting}
                className="bg-[#111111] hover:bg-slate-800 text-[#FFC928] h-14 px-8 rounded-2xl font-black text-xs uppercase tracking-widest italic flex items-center justify-center gap-2 transform active:scale-95 transition-all shadow-xl shadow-black/5 disabled:opacity-50"
              >
                {accepting ? (
                  <>
                    <Loader2 className="animate-spin text-yellow-500" size={16} />
                    <span>PROCESSANDO...</span>
                  </>
                ) : (
                  <>
                    <span>ACEITAR PARTICIPAÇÃO & CONCORRER</span>
                    <ArrowRight size={14} />
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-[2.5rem] border border-slate-100 p-8 md:p-10 shadow-xl text-center space-y-6">
            <div className="w-16 h-16 bg-[#FFC928] rounded-full flex items-center justify-center mx-auto shadow-lg">
              <CheckCircle2 size={32} className="text-[#111]" />
            </div>
            <h3 className="text-2xl font-black italic uppercase tracking-tighter text-[#111]">
              Você está participando!
            </h3>
            <p className="text-slate-500 text-sm max-w-lg mx-auto">
              Seus pratos estão concorrendo nas categorias. As notas e o ranking são confidenciais — apenas a administração da plataforma tem acesso. 
              Acompanhe em 20 de Dezembro a divulgação dos vencedores.
            </p>
            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-6 max-w-lg mx-auto">
              <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest mb-2">
                📅 Ciclo {new Date().getFullYear()}
              </p>
              <p className="text-xs text-amber-800 font-medium">
                Votação encerra em 15 de Dezembro. Resultados divulgados em 20 de Dezembro.
              </p>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
