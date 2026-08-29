import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, onSnapshot, updateDoc, getDoc, collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Order, Restaurant, Category } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { ChefHat, CheckCircle2, Clock, MapPin, Smartphone, ArrowLeft, Utensils, Bike, CreditCard, Heart, Ticket, Check, XCircle, Star, RefreshCw, RotateCcw } from 'lucide-react';
import { cn } from '../lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useRestaurant } from '../context/RestaurantContext';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { generatePixPayload } from '../lib/pix';
import { WA_NUMBER } from '../services/whatsappService';
import { toast } from 'react-hot-toast';
import SEO from '../components/SEO';
import { OrderSkeleton } from '../components/Skeleton';
import { QRCodeSVG } from 'qrcode.react';

const MEU_OVO_PIX_KEY = import.meta.env.VITE_PLATFORM_PIX_KEY || 'meuovo@example.com';

export default function OrderStatusPage() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [showPostPayment, setShowPostPayment] = useState(false);

  // Caixinha Meu OVO
  const [caixinhaAmount, setCaixinhaAmount] = useState(0.25);
  const [caixinhaConfirmed, setCaixinhaConfirmed] = useState(false);
  const [caixinhaSkipped, setCaixinhaSkipped] = useState(false);

  // Social cause
  const [socialAmount, setSocialAmount] = useState(1);
  const [socialConfirmed, setSocialConfirmed] = useState(false);
  const navigate = useNavigate();
  const { restaurants } = useRestaurant();
  const { addItem } = useCart();
  const { user } = useAuth();

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);

  // Dish rating state
  const [eligibleItems, setEligibleItems] = useState<{ productId: string; productName: string }[]>([]);
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [submittingRating, setSubmittingRating] = useState(false);
  const [ratingSubmitted, setRatingSubmitted] = useState(false);

  useEffect(() => {
    if (!id) return;

    const unsub = onSnapshot(doc(db, 'orders', id), async (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as Order;
        setOrder({ id: snapshot.id, ...data });
        if (data.paymentStatus === 'paid' && !data.meuOvoCaixinha) {
          setShowPostPayment(true);
        }
        // Fetch restaurant data from Firestore
        const restSnap = await getDoc(doc(db, 'restaurants', data.restaurantId));
        if (restSnap.exists()) {
          setRestaurant({ id: restSnap.id, ...restSnap.data() } as Restaurant);
        } else {
          const localRest = restaurants.find(r => r.id === data.restaurantId);
          if (localRest) setRestaurant(localRest);
        }
      }
      setLoading(false);
    });

    return () => unsub();
  }, [id, restaurants]);

  // Load eligible items for rating when order is finished
  useEffect(() => {
    if (!order || !restaurant || order.status !== 'finished') return;

    const ratedKey = `rated_order_${order.id}`;
    if (localStorage.getItem(ratedKey)) {
      setRatingSubmitted(true);
      return;
    }

    const within48h = (Date.now() - new Date(order.createdAt).getTime()) < 48 * 60 * 60 * 1000;
    if (!within48h) return;

    const loadEligible = async () => {
      try {
        const catsSnap = await getDocs(query(collection(db, 'categories'), where('restaurantId', '==', restaurant.id)));
        const categories = catsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Category));

        const nonFoodKeywords = ['bebida', 'sobremesa', 'doce', 'refrigerante', 'suco', 'cerveja', 'vinho', 'drink', 'chope', 'licor', 'água'];
        const foodCatIds = categories
          .filter(c => !nonFoodKeywords.some(k => c.name.toLowerCase().includes(k)))
          .map(c => c.id);

        if (foodCatIds.length === 0) return;

        const prodsSnap = await getDocs(query(
          collection(db, 'products'),
          where('restaurantId', '==', restaurant.id),
          where('categoryId', 'in', foodCatIds)
        ));
        const foodProductIds = new Set(prodsSnap.docs.map(d => d.id));

        const eligible = order.items
          .filter(item => foodProductIds.has(item.productId))
          .map(item => ({ productId: item.productId, productName: item.productName }));

        setEligibleItems(eligible);
      } catch (err) {
        console.error('Error loading eligible items for rating:', err);
      }
    };
    loadEligible();
  }, [order?.id, order?.status, restaurant?.id]);

  const handleRateDish = async () => {
    if (!order || !restaurant || eligibleItems.length === 0) return;
    const ratedItems = Object.keys(ratings);
    if (ratedItems.length === 0) { toast.error('Selecione ao menos uma nota'); return; }

    setSubmittingRating(true);
    try {
      const now = new Date();
      const promises = ratedItems.map(productId =>
        addDoc(collection(db, 'dish_ratings'), {
          dishId: productId,
          dishName: order.items.find(i => i.productId === productId)?.productName || '',
          restaurantId: restaurant.id,
          restaurantName: restaurant.name,
          restaurantBairro: restaurant.neighborhood || '',
          userId: order.userId || 'guest',
          orderId: order.id,
          rating: ratings[productId],
          year: now.getFullYear(),
          createdAt: now.toISOString(),
        })
      );
      await Promise.all(promises);
      const ratedKey = `rated_order_${order.id}`;
      localStorage.setItem(ratedKey, '1');
      setRatingSubmitted(true);
      toast.success('Avaliação enviada! Obrigado por ajudar a premiar os melhores pratos!');
    } catch (err) {
      console.error('Error submitting ratings:', err);
      toast.error('Erro ao enviar avaliação');
    } finally {
      setSubmittingRating(false);
    }
  };

  const handleConfirmPayment = async () => {
    if (!order) return;
    if (!user) {
      toast.error('Envie o comprovante pelo WhatsApp do restaurante para confirmar o pagamento');
      return;
    }
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/order/${order.id}/payment-confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.error === 'Forbidden' ? 'Você não pode confirmar este pedido' : 'Erro ao confirmar pagamento');
        return;
      }
      if (data.paymentStatus === 'awaiting_confirmation') {
        setPaymentConfirmed(true);
        toast.success('Pagamento em confirmação pelo restaurante!');
      } else {
        toast.success('Pagamento já confirmado!');
      }
    } catch (err) {
      toast.error('Erro ao confirmar pagamento');
    }
  };

  const handleCaixinha = async () => {
    if (!order) return;
    try {
      await updateDoc(doc(db, 'orders', order.id), {
        meuOvoCaixinha: caixinhaAmount
      });
      setCaixinhaConfirmed(true);
      toast.success('Caixinha Meu OVO de R$ ' + caixinhaAmount.toFixed(2) + ' registrada!');
    } catch {
      toast.error('Erro ao registrar caixinha');
    }
  };

  const handleSocialDonation = async () => {
    if (!order) return;
    try {
      await updateDoc(doc(db, 'orders', order.id), {
        donationAmount: socialAmount
      });
      setSocialConfirmed(true);
      toast.success('Doação social de R$ ' + socialAmount.toFixed(2) + ' registrada! Obrigado!');
    } catch {
      toast.error('Erro ao registrar doação');
    }
  };

  const steps = [
    { status: 'received', label: 'Recebido', icon: <Clock size={20} />, description: 'O restaurante recebeu seu pedido', time: order?.createdAt },
    { status: 'accepted', label: 'Aprovado', icon: <CreditCard size={20} />, description: 'Restaurante aprovou! Aguardando pagamento', time: order?.acceptedAt },
    { status: 'preparing', label: 'Preparando', icon: <ChefHat size={20} />, description: 'Seu pedido está sendo preparado', time: undefined },
    { status: 'ready', label: 'Pronto', icon: <Utensils size={20} />, description: 'Pedido finalizado e pronto!', time: undefined },
    { status: 'out-for-delivery', label: 'A caminho', icon: <Bike size={20} />, description: 'O entregador já saiu com seu pedido', time: undefined },
    { status: 'finished', label: 'Entregue', icon: <CheckCircle2 size={20} />, description: 'Bom apetite!', time: undefined },
  ];

  const currentStep = steps.findIndex(s => s.status === order?.status);

  const etaRange = useMemo(() => {
    if (!order) return '30-40 min';
    const prepOffset = order.status === 'received' ? 40 : order.status === 'accepted' ? 35 : order.status === 'preparing' ? 25 : order.status === 'ready' ? 15 : 10;
    return `${prepOffset - 5}-${prepOffset + 5} min`;
  }, [order?.status]);

  const dynamicPixCode = useMemo(() => {
    if (!restaurant?.pixKey || !order) return null;
    return generatePixPayload({
      key: restaurant.pixKey,
      name: restaurant.name || 'MEU OVO',
      amount: order.total,
      txid: order.id.replace(/[^a-zA-Z0-9]/g, 'X').slice(-25).toUpperCase()
    });
  }, [restaurant, order]);

  if (loading) {
    return <OrderSkeleton />;
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center order-status-page">
        <h2 className="text-2xl font-black uppercase italic tracking-tighter mb-4">Pedido não encontrado</h2>
        <button 
          onClick={() => navigate('/')}
          className="flex items-center gap-2 bg-[#111] text-white px-6 py-3 rounded-2xl font-bold"
        >
          <ArrowLeft size={20} />
          Voltar ao início
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-12 order-status-page">
      {/* Header */}
      <div className="bg-[#111111] text-white p-8 rounded-b-[3rem] shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#FFC928] rounded-full blur-[100px] opacity-20 -mr-32 -mt-32" />
        
        <button onClick={() => navigate(-1)} className="mb-4 opacity-60 hover:opacity-100 transition-opacity focus:outline-none" id="btn-status-back" aria-label="Voltar">
          <ArrowLeft size={24} />
        </button>

        <div className="flex items-center gap-4">
          {restaurant?.logo && (
            <img 
              src={restaurant.logo} 
              alt={restaurant.name} 
              className="w-14 h-14 rounded-2xl object-cover border-2 border-white/10 shadow-lg shrink-0" 
              referrerPolicy="no-referrer"
            />
          )}
          <div>
            <h1 className="text-2xl md:text-3xl font-black italic uppercase tracking-tighter leading-none mb-1">Acompanhe seu Pedido</h1>
            <p className="text-xs font-bold text-gray-400">
              Loja: <span className="text-[#FFC928] font-black">{restaurant?.name || 'Parceiro'}</span> • ID #{order.id.slice(-6).toUpperCase()}
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-6 -mt-8 space-y-6">
        {/* Live ETA Card & Progress */}
        <div className="bg-[#111] text-white rounded-3xl p-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500 rounded-full blur-[60px] opacity-20 -mr-16 -mt-16 animate-pulse" />
          <div className="flex items-center justify-between relative z-10">
            <div>
              <span className="text-[10px] font-black uppercase text-amber-400 tracking-widest block mb-1">Previsão de Entrega</span>
              <h2 className="text-3xl font-black italic tracking-tighter uppercase text-white flex items-center gap-2">
                <Clock className="text-[#FFC928]" size={24} /> {order.status === 'finished' ? 'Entregue!' : order.status === 'cancelled' ? 'Cancelado' : etaRange}
              </h2>
            </div>
            {order.status !== 'finished' && order.status !== 'cancelled' && (
              <div className="flex flex-col items-end">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-ping" />
                  <span className="text-[8px] font-black text-[#FFC928] uppercase tracking-widest">Pedido em tempo real</span>
                </div>
              </div>
            )}
          </div>

          {order.status === 'out-for-delivery' && (
            <div className="mt-5 pt-4 border-t border-white/10 relative z-10 space-y-3 font-sans">
              <div className="flex justify-between text-[8px] font-black uppercase tracking-widest text-slate-400">
                <span>Saiu da Loja</span>
                <span className="text-[#FFC928] animate-pulse">Motoboy a caminho</span>
                <span>Sua Residência</span>
              </div>
              <div className="h-1.5 bg-white/10 rounded-full relative">
                <motion.div 
                  initial={{ width: '15%' }}
                  animate={{ width: '85%' }}
                  transition={{ repeat: Infinity, duration: 12, ease: 'easeInOut' }}
                  className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-orange-500 to-[#FFC928] rounded-full"
                />
              </div>
            </div>
          )}
        </div>

        {/* Cancelado Banner */}
        {order.status === 'cancelled' && (
          <div className="bg-red-50 border-2 border-red-200 rounded-3xl p-6 text-center">
            <XCircle size={48} className="text-red-400 mx-auto mb-3" />
            <h2 className="font-black text-xl text-red-700 uppercase tracking-tighter mb-2">Pedido Cancelado</h2>
            <p className="text-sm text-red-600 font-medium">{order.rejectionReason || 'O restaurante não pôde aceitar seu pedido.'}</p>
            <button
              onClick={() => navigate('/busca')}
              className="mt-4 bg-red-600 text-white px-6 py-3 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-red-700 transition-all"
            >
              Buscar outro restaurante
            </button>
          </div>
        )}

        {/* Agendado Banner */}
        {order.scheduledAt && order.status !== 'finished' && order.status !== 'cancelled' && (
          <div className="bg-amber-50 border-2 border-amber-200 rounded-3xl p-5 flex items-center gap-4">
            <Clock size={28} className="text-amber-500 shrink-0" />
            <div>
              <p className="font-black text-amber-800 uppercase tracking-tighter text-sm">Pedido agendado</p>
              <p className="text-sm text-amber-700 font-bold">
                Para {new Date(order.scheduledAt).toLocaleString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        )}

        {/* Payment awaiting restaurant confirmation */}
        {order.status === 'accepted' && order.paymentStatus === 'awaiting_confirmation' && (
          <div className="bg-blue-50 border-2 border-blue-200 rounded-3xl p-5 flex items-center gap-4">
            <RefreshCw size={24} className="text-blue-500 shrink-0" />
            <div>
              <p className="font-black text-blue-800 uppercase tracking-tighter text-sm">Pagamento em confirmação</p>
              <p className="text-sm text-blue-700 font-bold">O restaurante confirmará assim que receber seu pagamento.</p>
            </div>
          </div>
        )}

        {/* Payment Section (when accepted and not paid) */}
        {order.status === 'accepted' && order.paymentStatus === 'pending' && !paymentConfirmed && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl p-8 shadow-xl border-2 border-emerald-100 relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-full h-2 bg-emerald-500" />
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-emerald-100 rounded-2xl text-emerald-600">
                <CreditCard size={24} />
              </div>
              <div>
                <h2 className="font-black text-xl text-[#111] uppercase tracking-tighter">Pagamento</h2>
                <p className="text-xs text-slate-500 font-medium">Seu pedido foi aceito! Realize o pagamento para continuar.</p>
              </div>
            </div>

            {/* PIX Payment */}
            {restaurant?.pixKey && (
              <div className="bg-slate-50 border border-slate-100 rounded-[2rem] p-6 mb-6 text-center">
                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Pague via PIX</h3>
                <div className="w-48 h-48 bg-white p-3 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-center relative mx-auto mb-4">
                  {dynamicPixCode ? (
                    <QRCodeSVG value={dynamicPixCode} size={170} />
                  ) : (
                    <div className="grid grid-cols-6 grid-rows-6 gap-1 w-full h-full opacity-80">
                      {Array.from({ length: 36 }).map((_, i) => (
                        <div key={i} className={Math.random() > 0.5 ? 'bg-slate-800' : 'bg-transparent'} />
                      ))}
                    </div>
                  )}
                </div>

                {dynamicPixCode && (
                  <div className="w-full space-y-3">
                    <div className="p-4 bg-white border border-slate-100 rounded-xl font-mono text-[10px] break-all text-slate-500 relative group overflow-hidden">
                      <div className="truncate pr-8">{dynamicPixCode}</div>
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={() => {
                          navigator.clipboard.writeText(dynamicPixCode).catch(() => {});
                          toast.success('Código PIX copiado!');
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-[#FFC928] text-black rounded-lg shadow-sm"
                      >
                        <Ticket size={14} />
                      </motion.button>
                    </div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Pague o valor de <strong className="text-emerald-600">R$ {order.total.toFixed(2)}</strong> via PIX</p>
                  </div>
                )}
              </div>
            )}

            {/* Payment Links */}
            {restaurant?.paymentSettings?.acceptCreditCard && restaurant.paymentSettings.creditCardLink && (
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-6 mb-4 text-center">
                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Pague com Cartão de Crédito</h3>
                <a
                  href={restaurant.paymentSettings.creditCardLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-4 rounded-2xl font-black text-sm hover:bg-blue-700 transition-all shadow-lg"
                >
                  <CreditCard size={20} />
                  Ir para Pagamento
                </a>
              </div>
            )}
            {restaurant?.paymentSettings?.acceptDebit && restaurant.paymentSettings.debitLink && (
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-6 mb-4 text-center">
                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Pague com Cartão de Débito</h3>
                <a
                  href={restaurant.paymentSettings.debitLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-4 rounded-2xl font-black text-sm hover:bg-blue-700 transition-all shadow-lg"
                >
                  <CreditCard size={20} />
                  Ir para Pagamento
                </a>
              </div>
            )}
            {restaurant?.paymentSettings?.acceptVoucher && restaurant.paymentSettings.voucherLink && (
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-6 mb-4 text-center">
                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Pague com Vale-Refeição</h3>
                <a
                  href={restaurant.paymentSettings.voucherLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-purple-600 text-white px-6 py-4 rounded-2xl font-black text-sm hover:bg-purple-700 transition-all shadow-lg"
                >
                  <CreditCard size={20} />
                  Ir para Pagamento
                </a>
              </div>
            )}

            <button
              onClick={handleConfirmPayment}
              className="w-full bg-emerald-600 text-white font-black py-5 rounded-2xl hover:bg-emerald-700 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
            >
              <Check size={20} />
              Já paguei - Confirmar Pagamento
            </button>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center mt-3">
              Após o pagamento, clique no botão acima para confirmar
            </p>
          </motion.div>
        )}

        {/* Post-Payment: Caixinha Meu OVO + Social Cause */}
        {showPostPayment && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Step 1: Caixinha Meu OVO */}
            {!caixinhaConfirmed && !caixinhaSkipped && (
              <div className="bg-white rounded-3xl p-8 shadow-xl border-2 border-amber-200">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 bg-amber-100 rounded-2xl text-amber-600">
                    <Heart size={24} />
                  </div>
                  <div>
                    <h2 className="font-black text-xl text-[#111] uppercase tracking-tighter">🐣 Caixinha Meu OVO</h2>
                    <p className="text-xs text-slate-500 font-medium">Ajude a manter a plataforma gratuita para os restaurantes!</p>
                  </div>
                </div>

                <div className="flex gap-2 mb-6">
                  {[0.25, 0.50, 1].map(v => (
                    <button
                      key={v}
                      onClick={() => setCaixinhaAmount(v)}
                      className={`flex-1 py-4 rounded-2xl border-2 text-sm font-black transition-all ${
                        caixinhaAmount === v
                          ? 'border-amber-500 bg-amber-100 text-amber-800'
                          : 'border-slate-100 bg-slate-50 text-slate-500 hover:border-amber-300 hover:text-amber-600'
                      }`}
                    >
                      R$ {v.toFixed(2)}
                    </button>
                  ))}
                </div>

                  <div className="bg-slate-50 border border-slate-100 rounded-[2rem] p-6 mb-6 text-center">
                    <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">
                      Pague via PIX para o MEU OVO
                    </h3>
                    <p className="text-xs font-bold text-amber-600 mb-4">
                      Chave PIX: <strong className="text-amber-800">{MEU_OVO_PIX_KEY}</strong>
                    </p>
                    <div className="w-36 h-36 mx-auto bg-white p-2 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-center mb-4">
                      {(() => {
                        const pixCode = generatePixPayload({ key: MEU_OVO_PIX_KEY, name: 'MEU OVO', amount: caixinhaAmount, txid: 'CAIXINHA' + order.id.slice(-20) });
                        return <QRCodeSVG value={pixCode} size={130} />;
                      })()}
                    </div>
                    <button
                      onClick={() => {
                        const pixCode = generatePixPayload({ key: MEU_OVO_PIX_KEY, name: 'MEU OVO', amount: caixinhaAmount, txid: 'CAIXINHA' + order.id.slice(-20) });
                        navigator.clipboard.writeText(pixCode).catch(() => {});
                        toast.success('Código PIX da caixinha copiado!');
                      }}
                      className="text-[10px] font-black text-amber-600 uppercase tracking-widest hover:text-amber-800 transition-colors"
                    >
                      Copiar código PIX
                    </button>
                  </div>

                <div className="space-y-3">
                  <button
                    onClick={handleCaixinha}
                    className="w-full bg-amber-500 text-white font-black py-5 rounded-2xl hover:bg-amber-600 transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2"
                  >
                    <Heart size={20} />
                    Caixinha de R$ {caixinhaAmount.toFixed(2)}
                  </button>
                  <button
                    onClick={() => setCaixinhaSkipped(true)}
                    className="w-full bg-slate-100 text-slate-500 font-black py-4 rounded-2xl hover:bg-slate-200 transition-all text-sm"
                  >
                    Pular caixinha
                  </button>
                </div>
              </div>
            )}

            {/* Step 1b: Caixinha Confirmed */}
            {caixinhaConfirmed && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-amber-50 border-2 border-amber-200 rounded-3xl p-6 text-center"
              >
                <Heart size={48} className="text-amber-400 mx-auto mb-3 animate-pulse" />
                <h2 className="font-black text-xl text-amber-700 uppercase tracking-tighter mb-2">Obrigado pela Caixinha!</h2>
                <p className="text-sm text-amber-600 font-medium">
                  Sua contribuição de <strong>R$ {caixinhaAmount.toFixed(2)}</strong> fortalece o MEU OVO!
                </p>
              </motion.div>
            )}

            {/* Step 2: Social Cause */}
            {!socialConfirmed && (
              <div className="bg-white rounded-3xl p-8 shadow-xl border-2 border-dashed border-rose-200">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 bg-rose-50 rounded-2xl text-rose-500">
                    <Heart size={24} className="animate-pulse" />
                  </div>
                  <div>
                    <h2 className="font-black text-xl text-[#111] uppercase tracking-tighter">❤️ Ajude uma Causa Social</h2>
                    <p className="text-xs text-slate-500 font-medium">Sua doação vai para instituições que ajudam os menos afortunados do bairro.</p>
                  </div>
                </div>

                <div className="flex gap-2 mb-6">
                  {[1, 5, 10].map(v => (
                    <button
                      key={v}
                      onClick={() => setSocialAmount(v)}
                      className={`flex-1 py-4 rounded-2xl border-2 text-sm font-black transition-all ${
                        socialAmount === v
                          ? 'border-rose-500 bg-rose-100 text-rose-800'
                          : 'border-slate-100 bg-slate-50 text-slate-500 hover:border-rose-300 hover:text-rose-600'
                      }`}
                    >
                      R$ {v}
                    </button>
                  ))}
                </div>

                  <div className="bg-slate-50 border border-slate-100 rounded-[2rem] p-6 mb-6 text-center">
                    <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">
                      Doe via PIX para o MEU OVO
                    </h3>
                    <p className="text-xs font-bold text-rose-600 mb-4">
                      Chave PIX: <strong className="text-rose-800">{MEU_OVO_PIX_KEY}</strong>
                    </p>
                    <div className="w-36 h-36 mx-auto bg-white p-2 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-center mb-4">
                      {(() => {
                        const pixCode = generatePixPayload({ key: MEU_OVO_PIX_KEY, name: 'MEU OVO', amount: socialAmount, txid: 'DOACAO' + order.id.slice(-20) });
                        return <QRCodeSVG value={pixCode} size={130} />;
                      })()}
                    </div>
                    <button
                      onClick={() => {
                        const pixCode = generatePixPayload({ key: MEU_OVO_PIX_KEY, name: 'MEU OVO', amount: socialAmount, txid: 'DOACAO' + order.id.slice(-20) });
                        navigator.clipboard.writeText(pixCode).catch(() => {});
                        toast.success('Código PIX de doação copiado!');
                      }}
                      className="text-[10px] font-black text-rose-600 uppercase tracking-widest hover:text-rose-800 transition-colors"
                    >
                      Copiar código PIX
                    </button>
                  </div>

                <div className="space-y-3">
                  <button
                    onClick={handleSocialDonation}
                    className="w-full bg-rose-600 text-white font-black py-5 rounded-2xl hover:bg-rose-700 transition-all shadow-lg shadow-rose-500/20 flex items-center justify-center gap-2"
                  >
                    <Heart size={20} />
                    Doar R$ {socialAmount.toFixed(2)}
                  </button>
                  <button
                    onClick={() => setShowPostPayment(false)}
                    className="w-full bg-slate-100 text-slate-500 font-black py-4 rounded-2xl hover:bg-slate-200 transition-all text-sm"
                  >
                    Não quero doar agora
                  </button>
                </div>
              </div>
            )}

            {/* Step 2b: Social Confirmed */}
            {socialConfirmed && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-rose-50 border-2 border-rose-200 rounded-3xl p-6 text-center"
              >
                <Heart size={48} className="text-rose-400 mx-auto mb-3 animate-pulse" />
                <h2 className="font-black text-xl text-rose-700 uppercase tracking-tighter mb-2">Obrigado por Doar!</h2>
                <p className="text-sm text-rose-600 font-medium">
                  Sua doação de <strong>R$ {socialAmount.toFixed(2)}</strong> vai ajudar quem mais precisa!
                </p>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* Horizontal Progress Bar */}
        {order.status !== 'cancelled' && (
          <div className="bg-white rounded-3xl p-6 shadow-xl border border-slate-100">
            {(() => {
              const visibleSteps = steps.filter(s => order.type === 'dine-in' ? s.status !== 'out-for-delivery' : true);
              const maxIdx = visibleSteps.length - 1;
              const pct = maxIdx > 0 ? Math.round((currentStep / maxIdx) * 100) : 0;

              return (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Progresso do Pedido</span>
                    <span className="text-xs font-black text-green-600">{pct}%</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-6">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.8, ease: 'easeOut' }}
                      className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full"
                    />
                  </div>
                  <div className="flex justify-between relative">
                    {visibleSteps.map((step, idx) => {
                      const actualIdx = steps.findIndex(s => s.status === step.status);
                      const isCompleted = actualIdx <= currentStep;
                      const isCurrent = actualIdx === currentStep;

                      return (
                        <div key={step.status} className="flex flex-col items-center flex-1 relative">
                          <motion.div
                            animate={isCurrent ? { scale: [1, 1.2, 1] } : {}}
                            transition={{ repeat: Infinity, duration: 2 }}
                            className={cn(
                              "w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all duration-500 z-10 border-2",
                              isCompleted
                                ? "bg-green-500 text-white border-green-500"
                                : isCurrent
                                  ? "bg-white text-green-500 border-green-400 shadow-lg shadow-green-500/20"
                                  : "bg-white text-slate-300 border-slate-200"
                            )}
                          >
                            {isCompleted ? <CheckCircle2 size={16} /> : step.icon}
                          </motion.div>
                          <span className={cn(
                            "mt-2 text-[8px] font-black uppercase tracking-widest text-center leading-tight",
                            isCompleted ? "text-green-600" : isCurrent ? "text-green-500" : "text-slate-300"
                          )}>
                            {step.label}
                          </span>
                          {step.time && isCompleted && (
                            <span className="text-[8px] font-mono text-slate-400 mt-0.5">
                              {format(new Date(step.time), "HH:mm", { locale: ptBR })}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {order.status !== 'finished' && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="mt-5 flex items-center gap-2 bg-green-50 px-4 py-2.5 rounded-2xl border border-green-100"
                    >
                      <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                      <span className="text-[10px] font-black uppercase text-green-700 tracking-widest">
                        {steps[currentStep]?.description || 'Acompanhamento em tempo real'}
                      </span>
                    </motion.div>
                  )}
                </>
              );
            })()}
          </div>
        )}

        {/* Order Details Card */}
        <div className="bg-white rounded-3xl p-8 shadow-xl border border-slate-100">
          <h2 className="font-black text-xs uppercase tracking-[0.2em] text-slate-400 mb-6">Resumo da Comanda</h2>
          
          <div className="space-y-4">
            {order.items.map((item, i) => (
              <div key={i} className="flex justify-between items-start">
                <div className="flex gap-3">
                  <span className="font-black text-[#FFC928]">x{item.quantity}</span>
                  <div>
                    <p className="font-bold text-sm uppercase tracking-tight">{item.productName}</p>
                    {item.additionals && item.additionals.length > 0 && (
                      <p className="text-[10px] text-slate-400 uppercase">
                        + {item.additionals.map(a => a.name).join(', ')}
                      </p>
                    )}
                  </div>
                </div>
                <span className="font-bold text-sm">R$ {(item.unitPrice * item.quantity).toFixed(2)}</span>
              </div>
            ))}
          </div>

          <div className="mt-8 pt-6 border-t border-dashed border-slate-200">
            <div className="flex justify-between text-xs font-black uppercase tracking-widest text-slate-400 mb-2">
              <span>Subtotal</span>
              <span>R$ {order.total.toFixed(2)}</span>
            </div>
            {order.meuOvoCaixinha ? (
              <div className="flex justify-between text-xs font-black uppercase tracking-widest text-amber-500 mb-2">
                <span>🐣 Caixinha Meu OVO</span>
                <span>R$ {order.meuOvoCaixinha.toFixed(2)}</span>
              </div>
            ) : null}
            {order.donationAmount ? (
              <div className="flex justify-between text-xs font-black uppercase tracking-widest text-rose-500 mb-2">
                <span>❤️ Doação Social</span>
                <span>R$ {order.donationAmount.toFixed(2)}</span>
              </div>
            ) : null}
            <div className="flex justify-between text-lg font-black uppercase italic tracking-tighter">
              <span>Total</span>
              <span>R$ {order.total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Dish Rating Section */}
        {order.status === 'finished' && eligibleItems.length > 0 && !ratingSubmitted && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl p-8 shadow-xl border-2 border-amber-100"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-amber-100 rounded-2xl text-amber-600">
                <Star size={24} />
              </div>
              <div>
                <h2 className="font-black text-xl text-[#111] uppercase tracking-tighter">Avalie os Pratos</h2>
                <p className="text-xs text-slate-500 font-medium">Sua nota ajuda a premiar os melhores pratos da temporada!</p>
              </div>
            </div>

            <div className="space-y-4">
              {eligibleItems.map(item => (
                <div key={item.productId} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                  <p className="font-bold text-sm uppercase tracking-tight">{item.productName}</p>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map(star => (
                      <button
                        key={star}
                        onClick={() => setRatings(prev => ({ ...prev, [item.productId]: star }))}
                        className={`p-1 rounded-lg transition-all hover:scale-110 ${
                          (ratings[item.productId] || 0) >= star
                            ? 'text-amber-400'
                            : 'text-slate-200 hover:text-amber-200'
                        }`}
                      >
                        <Star size={22} className={ratings[item.productId] >= star ? 'fill-amber-400' : ''} />
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={handleRateDish}
              disabled={submittingRating || Object.keys(ratings).length === 0}
              className="mt-6 w-full bg-amber-500 text-white font-black py-5 rounded-2xl hover:bg-amber-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2"
            >
              {submittingRating ? (
                <RefreshCw size={18} className="animate-spin" />
              ) : (
                <Star size={18} />
              )}
              {submittingRating ? 'Enviando...' : 'Enviar Avaliação'}
            </button>
          </motion.div>
        )}

        {ratingSubmitted && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-amber-50 border-2 border-amber-200 rounded-3xl p-6 text-center"
          >
            <Star size={48} className="text-amber-400 mx-auto mb-3" />
            <h2 className="font-black text-xl text-amber-700 uppercase tracking-tighter mb-2">Obrigado pela Avaliação!</h2>
            <p className="text-sm text-amber-600 font-medium">
              Sua nota ajuda a reconhecer e premiar os melhores pratos da temporada!
            </p>
          </motion.div>
        )}

        {/* Reorder */}
        {order.status === 'finished' && (
          <button
            onClick={() => {
              if (!order.items?.length) return toast.error('Nenhum item para reordenar');
              order.items.forEach(item => {
                addItem({
                  product: { id: item.productId, name: item.productName, price: item.price, image: item.image || '', restaurantId: order.restaurantId } as any,
                  quantity: item.quantity,
                  selectedAdditionals: (item.additionals || []).map(a => ({ groupId: '', additionalId: '', name: a.name, price: a.price })),
                  observations: item.observations || '',
                });
              });
              toast.success('Itens copiados para o carrinho!');
              navigate('/carrinho');
            }}
            className="w-full mb-4 bg-[#FFC928] text-black font-black py-4 rounded-2xl text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-yellow-400 transition-all shadow-lg shadow-yellow-500/20 active:scale-[0.98]"
          >
            <RotateCcw size={16} /> Repetir Pedido
          </button>
        )}

        {/* Actions */}
        <div className="grid grid-cols-2 gap-4">
          <button 
            onClick={() => {
              const textMsg = encodeURIComponent(`Olá! Estou acompanhando meu pedido #${order.id} no Meu Ovo e gostaria de falar com o restaurante.`);
              window.open(`https://wa.me/${WA_NUMBER}?text=${textMsg}`, '_blank');
            }}
            className="flex flex-col items-center justify-center p-6 bg-white border border-slate-100 rounded-[2rem] shadow-lg hover:bg-slate-50 transition-all gap-2 focus:outline-none hover:scale-[1.02] active:scale-95"
            id="btn-status-whatsapp"
          >
            <Smartphone size={24} className="text-green-500" />
            <span className="text-[10px] font-black uppercase tracking-widest">Falar c/ Loja</span>
          </button>
          <button 
            onClick={() => {
              const textMsg = encodeURIComponent(`Olá! Preciso de ajuda urgente com o status do meu pedido #${order.id} no Meu Ovo.`);
              window.open(`https://wa.me/${WA_NUMBER}?text=${textMsg}`, '_blank');
            }}
            className="flex flex-col items-center justify-center p-6 bg-white border border-slate-100 rounded-[2rem] shadow-lg hover:bg-slate-50 transition-all gap-2 focus:outline-none hover:scale-[1.02] active:scale-95"
            id="btn-status-ajuda"
          >
            <MapPin size={24} className="text-[#FFC928]" />
            <span className="text-[10px] font-black uppercase tracking-widest">Como Chegar / Ajuda</span>
          </button>
        </div>

        <p className="text-center text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] py-8">
          Feito com ❤️ por MEU OVO
        </p>
      </div>
    </div>
  );
}