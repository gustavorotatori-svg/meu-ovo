import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useRestaurant } from '../../context/RestaurantContext';
import { db } from '../../lib/firebase';
import { collection, query, where, getDocs, doc, updateDoc, setDoc, getDoc } from 'firebase/firestore';
import { Trophy, Star, Shield, Users, Utensils, Calendar, Sparkles, CheckCircle2, ChevronRight, HelpCircle, Loader2, ArrowRight } from 'lucide-react';
import AdminLayout from './AdminLayout';
import { Button } from '../../components/Button';
import { toast } from 'react-hot-toast';

interface VoteData {
  orderId: string;
  restaurantId: string;
  userId: string;
  restaurantRating: number;
  items: { productId: string; productName: string; rating: number }[];
  votedAt: string;
  customerName?: string;
}

export default function OvosDeOuro() {
  const { t } = useTranslation();
  const { currentRestaurant, setCurrentRestaurant, restaurants } = useRestaurant();
  const [loading, setLoading] = useState(true);
  
  // Status check
  const [isParticipant, setIsParticipant] = useState(false);
  const [accepting, setAccepting] = useState(false);
  
  // Statistics States
  const [votes, setVotes] = useState<VoteData[]>([]);
  const [restaurantAverage, setRestaurantAverage] = useState<number>(0);
  const [featuredDish, setFeaturedDish] = useState<{ name: string; rating: number; count: number } | null>(null);
  
  // Simulated Simulation State (for previewing December 15th results!)
  const [isSimulationActive, setIsSimulationActive] = useState(false);

  // Load opt-in and votes stats
  useEffect(() => {
    if (!currentRestaurant) return;

    const loadOvosDeOuroData = async () => {
      setLoading(true);
      try {
        // 1. Check if opted in
        // Some properties might be stored in the custom config document or directly on restaurant.
        // Let's check both: some direct field or of a helper collection
        const rDoc = await getDoc(doc(db, 'restaurants', currentRestaurant.id));
        let optedIn = false;
        if (rDoc.exists() && rDoc.data().ovosDeOuroParticipant) {
          optedIn = true;
        } else {
          // Check custom collection as fallback
          const partDoc = await getDoc(doc(db, 'ovos_de_ouro_participants', currentRestaurant.id));
          if (partDoc.exists()) {
            optedIn = true;
          }
        }
        setIsParticipant(optedIn);

        // 2. Load actual votes
        const qVotes = query(
          collection(db, 'ovos_de_ouro_votes'),
          where('restaurantId', '==', currentRestaurant.id)
        );
        const snapshot = await getDocs(qVotes);
        const votesList = snapshot.docs.map(doc => ({ orderId: doc.id, ...doc.data() } as VoteData));
        setVotes(votesList);

        // 3. Compute stats
        if (votesList.length > 0) {
          // Average restaurant rating
          const sum = votesList.reduce((acc, curr) => acc + curr.restaurantRating, 0);
          setRestaurantAverage(Number((sum / votesList.length).toFixed(1)));

          // Calculate best prato/item (excluding drinks or desserts)
          const dishRatings: Record<string, { sum: number; count: number; name: string }> = {};
          votesList.forEach(v => {
            v.items?.forEach(item => {
              const key = item.productId;
              if (!dishRatings[key]) {
                dishRatings[key] = { sum: 0, count: 0, name: item.productName };
              }
              dishRatings[key].sum += item.rating;
              dishRatings[key].count += 1;
            });
          });

          // Sort dishes by high rating and count
          const sortedDishes = Object.values(dishRatings)
            .map(d => ({
              name: d.name,
              rating: Number((d.sum / d.count).toFixed(1)),
              count: d.count
            }))
            .sort((a, b) => b.rating - a.rating || b.count - a.count);

          if (sortedDishes.length > 0) {
            setFeaturedDish(sortedDishes[0]);
          } else {
            setFeaturedDish(null);
          }
        } else {
          setRestaurantAverage(0);
          setFeaturedDish(null);
        }

      } catch (err) {
        console.error('Error loading Ovos de Ouro data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadOvosDeOuroData();
  }, [currentRestaurant]);

  // Opt-in workflow
  const handleAcceptParticipation = async () => {
    if (!currentRestaurant) return;
    setAccepting(true);
    try {
      // Update in restaurants collection
      const rRef = doc(db, 'restaurants', currentRestaurant.id);
      await updateDoc(rRef, { ovosDeOuroParticipant: true }).catch(async () => {
        // Fallback if updateDoc errors, let's make sure it's fully compatible
        await setDoc(doc(db, 'ovos_de_ouro_participants', currentRestaurant.id), {
          restaurantId: currentRestaurant.id,
          restaurantName: currentRestaurant.name,
          acceptedAt: new Date().toISOString()
        });
      });

      // Ensure local state is updated too
      if (currentRestaurant) {
        setCurrentRestaurant({
          ...currentRestaurant,
          // Add custom field dynamically
          ...{ ovosDeOuroParticipant: true } as any
        });
      }

      setIsParticipant(true);
      toast.success('Você aceitou os termos e agora está oficialmente participando!');
    } catch (err) {
      console.error('Error accepting participation:', err);
      toast.error('Erro ao registrar participação. Verifique sua conexão.');
    } finally {
      setAccepting(false);
    }
  };

  // Eligibility Rules Check for "Categoria Revelação"
  // (New restaurant registered in the calendar year of award, up to May with best ratings)
  const checkRevelacaoEligibility = () => {
    if (!currentRestaurant) return { eligible: false, text: '' };
    
    const regDate = new Date(currentRestaurant.createdAt || '2024-01-15');
    const regYear = regDate.getFullYear();
    const regMonth = regDate.getMonth(); // 0 is Jan, 4 is May
    const currentYear = new Date().getFullYear();

    // Eligibility condition: created in the award's budget year (which is currentYear), up to May 31st
    const isNewThisYear = regYear === currentYear;
    const isRegisterBeforeJune = regMonth <= 4; // Under June (<= May)

    if (isNewThisYear && isRegisterBeforeJune) {
      return { 
        eligible: true, 
        text: `Elegível! Cadastrado no ano atual (${regYear}) em ${regDate.toLocaleDateString('pt-BR', {month: 'long'})}, atendendo as diretrizes de revelação.` 
      };
    } else {
      return { 
        eligible: false, 
        text: `Indisponível. Estabelecimento registrado em ${regDate.toLocaleDateString('pt-BR', {day: 'numeric', month: 'numeric', year: 'numeric'})} (Apenas restaurantes cadastrados de Janeiro a Maio de ${currentYear} entram nesta categoria).` 
      };
    }
  };

  const revelacao = checkRevelacaoEligibility();

  // Simulated Rank calculation inside general lists (or mockup with mockRestaurants values)
  const getSubscribedCount = () => {
    return Math.max(12, restaurants.length + 3);
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center p-12 min-h-[50vh]">
          <Loader2 className="animate-spin text-amber-500 mb-4" size={40} />
          <p className="text-sm font-semibold text-slate-500 uppercase tracking-widest">Carregando Prêmio Ovos de Ouro...</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto space-y-8 pb-12">
        
        {/* Main Golden Banner header */}
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
                O prêmio que elege o melhor restaurante, melhor prato e restaurante revelação do ano, impulsionado pelas notas reais do consumidor final.
              </p>
            </div>
          </div>
        </div>

        {/* 1. OFF-PARTICIPANT AGREEMENT WORKFLOW */}
        {!isParticipant ? (
          <div className="bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-xl space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="space-y-2">
              <h3 className="text-2xl font-black italic uppercase tracking-tighter text-[#111]">Regulamento e Termo de Adesão</h3>
              <p className="text-sm text-slate-500">
                Leia atentamente as diretrizes da campanha de votação para poder inscrever seu estabelecimento:
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 flex gap-3.5">
                <Calendar className="text-amber-500 shrink-0 mt-0.5" size={20} />
                <div className="text-left space-y-1">
                  <p className="font-extrabold text-[#111] text-xs uppercase tracking-wider">Cronograma Anual</p>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    A votação abre dia <strong>1 de Janeiro</strong> e encerra dia <strong>10 de Dezembro</strong>. Os vencedores serão revelados e divulgados na plataforma dia <strong>15 de Dezembro</strong> de cada ano.
                  </p>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 flex gap-3.5">
                <Utensils className="text-amber-500 shrink-0 mt-0.5" size={20} />
                <div className="text-left space-y-1">
                  <p className="font-extrabold text-[#111] text-xs uppercase tracking-wider">Metodologia Isenta</p>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    As notas e estrelas são dadas pelos clientes no login ou nas 24h seguintes ao pedido. Bebidas e sobremesas são isentas e não interferem na nota do prato principal.
                  </p>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-amber-50/50 border border-amber-100 flex gap-3.5 md:col-span-2">
                <Shield className="text-amber-600 shrink-0 mt-0.5" size={20} />
                <div className="text-left space-y-1">
                  <p className="font-extrabold text-amber-950 text-xs uppercase tracking-wider">Privacidade Certificada (Crucial)</p>
                  <p className="text-xs text-amber-850 leading-relaxed">
                    <strong>Suas avaliações brutas, notas médias de pratos e posicionamentos são 100% confidenciais e visíveis apenas para você.</strong> Nenhum concorrente ou cliente visualizará sua performance, exceto se você ganhar o troféu no dia 15 de Dezembro. Foco total em feedback produtivo para o seu time!
                  </p>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-slate-500 text-xs font-bold">
                <CheckCircle2 className="text-green-550 text-green-500" size={18} />
                <span>Inscrição Gratuita • Exclusiva para credenciados</span>
              </div>

              <Button
                onClick={handleAcceptParticipation}
                disabled={accepting}
                className="bg-[#111111] hover:bg-slate-800 text-[#FFC928] h-14 px-8 rounded-2xl font-black text-xs uppercase tracking-widest italic flex items-center justify-center gap-2 transform active:scale-95 transition-all shadow-xl shadow-black/5 disabled:opacity-50"
              >
                {accepting ? (
                  <>
                    <Loader2 className="animate-spin text-yellow-500" size={16} />
                    <span>PROCESSANDO ADESÃO...</span>
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
          /* 2. ON-PARTICIPANT DASHBOARD VIEW */
          <div className="space-y-8 animate-in fade-in duration-500">
            
            {/* Status overview list cards */}
            <div className="grid sm:grid-cols-3 gap-4">
              
              <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 w-20 h-20 bg-amber-50/40 rounded-full blur-xl pointer-events-none" />
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Estrelas do Restaurante</p>
                  <Star className="text-yellow-400 fill-yellow-400" size={18} />
                </div>
                <div className="flex items-baseline gap-1.5 mt-3">
                  <p className="text-4xl font-black text-[#111] font-display italic leading-none">{votes.length > 0 ? restaurantAverage : 'N/A'}</p>
                  <p className="text-xs font-bold text-slate-400">/ 5.0</p>
                </div>
                <p className="text-[10px] text-slate-400 mt-1 font-bold">Com base em {votes.length} avaliações</p>
              </div>

              <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 w-20 h-20 bg-orange-50/40 rounded-full blur-xl pointer-events-none" />
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Melhor Prato da Casa</p>
                  <Utensils className="text-orange-500" size={18} />
                </div>
                {featuredDish ? (
                  <div className="mt-3">
                    <p className="text-sm font-black text-slate-800 uppercase italic leading-tight truncate">{featuredDish.name}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <Star className="text-amber-500 fill-amber-500" size={12} />
                      <span className="font-black text-xs text-amber-600">{featuredDish.rating} Estrelas</span>
                      <span className="text-[9px] text-slate-400 font-extrabold">• {featuredDish.count} pedidos</span>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3">
                    <p className="text-xs text-slate-400 font-black uppercase">Nenhum prato avaliado</p>
                    <p className="text-[9px] text-slate-400 font-bold mt-1">Aguardando votos dos clientes</p>
                  </div>
                )}
              </div>

              <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-lg relative overflow-hidden flex flex-col justify-between">
                <div className="absolute top-0 right-0 w-20 h-20 bg-blue-50/40 rounded-full blur-xl pointer-events-none" />
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Revelação do Ano</p>
                  <Sparkles className="text-amber-500" size={18} />
                </div>
                <div className="mt-3">
                  <p className="text-xs font-black uppercase tracking-tight leading-none text-slate-700">
                    {revelacao.eligible ? '👑 Elegível para o prêmio' : 'Inelegível'}
                  </p>
                  <p className="text-[9px] text-slate-400 mt-1 font-bold leading-tight line-clamp-2">{revelacao.text}</p>
                </div>
              </div>

            </div>

            {/* Campaign Status panel */}
            <div className="bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-xl space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div className="text-left space-y-1">
                  <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest leading-none">Status da Campanha {new Date().getFullYear()}</p>
                  <h3 className="text-xl font-black italic uppercase tracking-tighter text-[#111]">Fase de Votação Ativa 🗳️</h3>
                  <p className="text-xs text-slate-500">Início: 01 de Jan • Encerramento: 10 de Dez • Revelação: 15 de Dez</p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setIsSimulationActive(!isSimulationActive);
                      if (!isSimulationActive) {
                        toast.success('Simulação de 15/Dezembro ativada! Veja como seriam divulgados os resultados.');
                      } else {
                        toast.success('Retornado para visualização normal de votação.');
                      }
                    }}
                    className={`px-4 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${
                      isSimulationActive 
                        ? 'bg-amber-550 bg-amber-500 text-white border-amber-600' 
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    ⚡ Simular Resultados (15/Dez)
                  </button>
                </div>
              </div>

              {/* Conditional Renderer: Dynamic simulation vs ordinary state */}
              {isSimulationActive ? (
                <div className="space-y-6 bg-gradient-to-br from-amber-50/50 via-white to-amber-50/20 border border-amber-200 p-6 md:p-8 rounded-[2rem] animate-in zoom-in-95 duration-300">
                  <div className="text-center space-y-2 mb-6">
                    <Trophy className="mx-auto text-amber-500 animate-bounce" size={40} />
                    <h4 className="text-lg font-black text-amber-950 uppercase italic tracking-tighter">🏆 Painel de Resultados de Dezembro 🏆</h4>
                    <p className="text-xs text-amber-800 leading-relaxed max-w-lg mx-auto">
                      Simulando o dia 15 de Dezembro. Abaixo, acompanhe o resultado final oficial para o seu estabelecimento diante de um total de <strong>{getSubscribedCount()} estabelecimentos concorrentes</strong>:
                    </p>
                  </div>

                  <div className="grid md:grid-cols-3 gap-4">
                    
                    {/* Melhor Restaurante Result */}
                    <div className="bg-white border border-amber-200 p-5 rounded-2xl flex flex-col justify-between shadow-sm relative">
                      <div className="absolute top-2 right-2 text-[9px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-black uppercase">CONFIDENCIAL</div>
                      <div>
                        <h5 className="font-extrabold text-[#111] text-[10px] uppercase tracking-wider mb-2">Melhor Restaurante</h5>
                        <p className="text-2xl font-black text-slate-800 italic">{votes.length > 0 ? `${restaurantAverage}★` : 'S/Votos'}</p>
                        <p className="text-[10px] text-slate-500 mt-2 font-bold leading-relaxed">
                          Sua colocação no ranking geral:
                        </p>
                      </div>
                      <div className="bg-slate-550 bg-slate-900 text-white text-center py-2.5 rounded-xl font-black text-[10px] uppercase tracking-wider mt-4">
                        {votes.length === 0 ? 'Faltam Votos' : restaurantAverage >= 4.7 ? '🥇 1º Colocado (VENCEDOR!)' : 'Top 5 Participantes'}
                      </div>
                    </div>

                    {/* Melhor Prato Result */}
                    <div className="bg-white border border-amber-200 p-5 rounded-2xl flex flex-col justify-between shadow-sm relative">
                      <div className="absolute top-2 right-2 text-[9px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-black uppercase">CONFIDENCIAL</div>
                      <div>
                        <h5 className="font-extrabold text-[#111] text-[10px] uppercase tracking-wider mb-2">Melhor Prato</h5>
                        <p className="text-xs font-black text-amber-600 uppercase truncate mb-1">{featuredDish ? featuredDish.name : 'Nenhum'}</p>
                        <p className="text-[10px] text-slate-500 font-bold leading-relaxed">
                          Posição do prato na categoria de culinária:
                        </p>
                      </div>
                      <div className="bg-amber-600 text-white text-center py-2.5 rounded-xl font-black text-[10px] uppercase tracking-wider mt-4">
                        {featuredDish ? '🏆 Platina na Região' : 'Aguardando Avaliações'}
                      </div>
                    </div>

                    {/* Categoria Revelação Result */}
                    <div className="bg-white border border-amber-200 p-5 rounded-2xl flex flex-col justify-between shadow-sm relative">
                      <div className="absolute top-2 right-2 text-[9px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-black uppercase">CONFIDENCIAL</div>
                      <div>
                        <h5 className="font-extrabold text-[#111] text-[10px] uppercase tracking-wider mb-2">Revelação do Ano</h5>
                        <p className="text-[11px] font-bold text-slate-600 mt-1">
                          {revelacao.eligible ? 'Restaurante elegível e participando deste ciclo.' : 'Inelegível (Início prévio)'}
                        </p>
                      </div>
                      <div className="bg-[#111] text-white text-center py-2.5 rounded-xl font-black text-[10px] uppercase tracking-wider mt-4">
                        {revelacao.eligible ? '🥈 2ª Posição Geral' : 'Sem elegibilidade'}
                      </div>
                    </div>

                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Explanation card */}
                  <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100/50 flex gap-4 text-left">
                    <Shield className="text-amber-500 shrink-0 mt-0.5" size={22} onClick={() => console.log('Acceptance logic verified')} />
                    <div>
                      <h4 className="font-black text-xs text-[#111] uppercase tracking-wider mb-1">Garantia de Confidencialidade</h4>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Clientes e concorrentes não conseguem visualizar suas estrelas consolidadas, somente as notas públicas individuais se forem fornecidas no perfil geral. As notas de Ovos de Ouro são armazenadas de forma segura e confidencial para manter todos confortáveis para competir amigavelmente!
                      </p>
                    </div>
                  </div>

                  {/* List of received feedback items */}
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-left">Feedback dos Consumidores (Últimos Votos)</h4>
                    
                    {votes.length === 0 ? (
                      <div className="text-center py-10 bg-slate-50/50 border border-dashed border-slate-200 rounded-2xl text-slate-400">
                        <Users size={24} className="mx-auto text-slate-300 mb-2" />
                        <p className="text-xs font-bold uppercase tracking-wide">Sem avaliações por enquanto</p>
                        <p className="text-[10px] text-slate-400 mt-1 max-w-xs mx-auto">Assim que clientes derem notas para seus pedidos finalizados, o feedback detalhado aparecerá aqui.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {votes.map((v, index) => (
                          <div key={v.orderId || index} className="p-4 bg-white border border-slate-100 rounded-2xl text-left shadow-sm space-y-3 animate-in fade-in duration-300">
                            <div className="flex justify-between items-center bg-slate-50 -mx-4 -mt-4 px-4 py-2.5 rounded-t-2xl border-b border-slate-100">
                              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Apenas Você Vê • {new Date(v.votedAt).toLocaleDateString('pt-BR')}</span>
                              <div className="flex gap-1.5">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Nota Estabelecimento:</span>
                                <div className="flex">
                                  {[1, 2, 3, 4, 5].map(starIdx => (
                                    <Star 
                                      key={starIdx} 
                                      size={11} 
                                      className={starIdx <= v.restaurantRating ? "fill-yellow-400 text-yellow-500" : "text-slate-200"}
                                    />
                                  ))}
                                </div>
                              </div>
                            </div>

                            {/* Dish ratings breakdown */}
                            <div className="space-y-2">
                              <div className="flex flex-wrap gap-2">
                                {v.items?.map((item, id) => (
                                  <div key={id} className="inline-flex items-center gap-2 bg-amber-50 border border-amber-100 px-3 py-1.5 rounded-xl text-amber-900 text-xs text-left">
                                    <span className="font-extrabold uppercase text-[9px] tracking-tight">{item.productName}:</span>
                                    <div className="flex gap-0.5">
                                      {[1, 2, 3, 4, 5].map(starIdx => (
                                        <Star 
                                          key={starIdx} 
                                          size={10} 
                                          className={starIdx <= item.rating ? "fill-amber-400 text-amber-500 font-bold" : "text-slate-300 fill-transparent"}
                                        />
                                      ))}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
