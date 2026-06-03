import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, onSnapshot, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Order, Restaurant } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { ChefHat, CheckCircle2, Clock, MapPin, Smartphone, ArrowLeft, Utensils, Bike, CreditCard, Heart, Ticket, Check, XCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useRestaurant } from '../context/RestaurantContext';
import { generatePixPayload } from '../lib/pix';
import { toast } from 'react-hot-toast';

const MEU_OVO_PIX_KEY = 'meuovo@example.com'; // Platform-level PIX key for donations

export default function OrderStatusPage() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [showDonation, setShowDonation] = useState(false);
  const [donationAmount, setDonationAmount] = useState(1);
  const [donationConfirmed, setDonationConfirmed] = useState(false);
  const navigate = useNavigate();
  const { restaurants } = useRestaurant();

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);

  useEffect(() => {
    if (!id) return;

    const unsub = onSnapshot(doc(db, 'orders', id), async (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as Order;
        setOrder({ id: snapshot.id, ...data });
        if (data.paymentStatus === 'paid' && !data.donationAmount) {
          setShowDonation(true);
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

  const handleConfirmPayment = async () => {
    if (!order) return;
    try {
      await updateDoc(doc(db, 'orders', order.id), {
        paymentStatus: 'paid'
      });
      setPaymentConfirmed(true);
      setShowDonation(true);
      toast.success('Pagamento confirmado com sucesso!');
    } catch (err) {
      toast.error('Erro ao confirmar pagamento');
    }
  };

  const handleDonation = async () => {
    if (!order || donationAmount < 1) return;
    try {
      await updateDoc(doc(db, 'orders', order.id), {
        donationAmount: donationAmount,
        donationMethod: 'post-payment'
      });
      setDonationConfirmed(true);
      toast.success(`Doação de R$ ${donationAmount.toFixed(2)} confirmada! Obrigado!`);
    } catch (err) {
      toast.error('Erro ao registrar doação');
    }
  };

  const steps = [
    { status: 'received', label: 'Recebido', icon: <Clock size={20} />, description: 'O restaurante recebeu seu pedido' },
    { status: 'accepted', label: 'Aprovado', icon: <CreditCard size={20} />, description: 'Restaurante aprovou! Aguardando pagamento' },
    { status: 'preparing', label: 'Preparando', icon: <ChefHat size={20} />, description: 'Seu pedido está sendo preparado' },
    { status: 'ready', label: 'Pronto', icon: <Utensils size={20} />, description: 'Pedido finalizado e pronto!' },
    { status: 'out-for-delivery', label: 'A caminho', icon: <Bike size={20} />, description: 'O entregador já saiu com seu pedido' },
    { status: 'finished', label: 'Entregue', icon: <CheckCircle2 size={20} />, description: 'Bom apetite!' },
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

  const donationPixCode = useMemo(() => {
    if (donationAmount < 1) return null;
    return generatePixPayload({
      key: MEU_OVO_PIX_KEY,
      name: 'MEU OVO',
      amount: donationAmount,
      txid: `DOACAO${order?.id?.replace(/[^a-zA-Z0-9]/g, 'X').slice(-19).toUpperCase()}`
    });
  }, [donationAmount, order]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <ChefHat size={48} className="text-[#FFC928] animate-bounce" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
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
    <div className="min-h-screen bg-slate-50 pb-12">
      {/* Header */}
      <div className="bg-[#111111] text-white p-8 rounded-b-[3rem] shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#FFC928] rounded-full blur-[100px] opacity-20 -mr-32 -mt-32" />
        
        <button onClick={() => navigate(-1)} className="mb-4 opacity-60 hover:opacity-100 transition-opacity focus:outline-none" id="btn-status-back">
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

        {/* Payment Section (when accepted and not paid) */}
        {order.status === 'accepted' && order.paymentStatus !== 'paid' && !paymentConfirmed && (
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
                  <div className="grid grid-cols-6 grid-rows-6 gap-1 w-full h-full opacity-80">
                    {Array.from({ length: 36 }).map((_, i) => (
                      <div key={i} className={Math.random() > 0.5 ? 'bg-slate-800' : 'bg-transparent'} />
                    ))}
                  </div>
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-lg">
                    <Smartphone size={20} className="text-[#FFC928]" />
                  </div>
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

            {/* Credit Card Link */}
            {restaurant?.paymentSettings?.acceptCreditCard && restaurant.paymentSettings.creditCardLink && (
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-6 mb-6 text-center">
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

        {/* Donation Section (after payment) */}
        {showDonation && !donationConfirmed && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl p-8 shadow-xl border-2 border-dashed border-red-200 relative overflow-hidden"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-red-50 rounded-2xl text-red-500">
                <Heart size={24} className="animate-pulse" />
              </div>
              <div>
                <h2 className="font-black text-xl text-[#111] uppercase tracking-tighter">Quer Doar para o MEU OVO?</h2>
                <p className="text-xs text-slate-500 font-medium">Sua contribuição ajuda a manter a plataforma e apoiar projetos sociais.</p>
              </div>
            </div>

            <div className="flex gap-2 mb-6">
              {[1, 5, 10].map(v => (
                <motion.button
                  key={v}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setDonationAmount(v)}
                  className={cn(
                    "flex-1 py-4 rounded-2xl border-2 text-sm font-black transition-all",
                    donationAmount === v
                      ? 'border-red-500 bg-red-500 text-white shadow-lg shadow-red-200'
                      : 'border-slate-50 bg-slate-50/50 text-slate-500 hover:border-red-200 hover:text-red-500'
                  )}
                >
                  R$ {v}
                </motion.button>
              ))}
            </div>

            {/* MEU OVO Donation QR Code */}
            <div className="bg-slate-50 border border-slate-100 rounded-[2rem] p-6 mb-6 text-center">
              <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">
                Doe via PIX para o MEU OVO
              </h3>
              <div className="w-48 h-48 bg-white p-3 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-center relative mx-auto mb-4">
                <div className="grid grid-cols-6 grid-rows-6 gap-1 w-full h-full opacity-80">
                  {[
                    [1,1,1,1,1,1],[1,0,0,0,1,1],[1,0,1,0,0,1],[1,1,0,0,0,1],[1,0,0,1,0,1],[1,1,1,1,1,1]
                  ].flat().map((v, i) => (
                    <div key={i} className={v ? 'bg-red-800' : 'bg-transparent'} />
                  ))}
                </div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-lg">
                  <Heart size={20} className="text-red-500" />
                </div>
              </div>

              {donationPixCode && (
                <div className="w-full space-y-3">
                  <div className="p-4 bg-white border border-slate-100 rounded-xl font-mono text-[10px] break-all text-slate-500 relative group overflow-hidden">
                    <div className="truncate pr-8">{donationPixCode}</div>
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={() => {
                        navigator.clipboard.writeText(donationPixCode).catch(() => {});
                        toast.success('Código PIX de doação copiado!');
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-red-500 text-white rounded-lg shadow-sm"
                    >
                      <Ticket size={14} />
                    </motion.button>
                  </div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                    Chave PIX: <strong className="text-red-600">{MEU_OVO_PIX_KEY}</strong>
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <button
                onClick={handleDonation}
                className="w-full bg-red-600 text-white font-black py-5 rounded-2xl hover:bg-red-700 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-red-500/20 flex items-center justify-center gap-2"
              >
                <Heart size={20} />
                Doar R$ {donationAmount.toFixed(2)}
              </button>
              <button
                onClick={() => setShowDonation(false)}
                className="w-full bg-slate-100 text-slate-500 font-black py-4 rounded-2xl hover:bg-slate-200 transition-all text-sm"
              >
                Não quero doar agora
              </button>
            </div>
          </motion.div>
        )}

        {/* Donation Confirmed */}
        {donationConfirmed && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-red-50 border-2 border-red-200 rounded-3xl p-6 text-center"
          >
            <Heart size={48} className="text-red-400 mx-auto mb-3 animate-pulse" />
            <h2 className="font-black text-xl text-red-700 uppercase tracking-tighter mb-2">Obrigado por Doar!</h2>
            <p className="text-sm text-red-600 font-medium">
              Sua doação de <strong>R$ {donationAmount.toFixed(2)}</strong> foi registrada. 
              Você ajuda a fortalecer o MEU OVO e nossos projetos sociais!
            </p>
          </motion.div>
        )}

        {/* Status Stepper */}
        <div className="bg-white rounded-3xl p-8 shadow-xl border border-slate-100">
          <div className="space-y-8">
            {steps.filter(s => order.type === 'dine-in' ? s.status !== 'out-for-delivery' : true).map((step, idx) => {
              const actualIdx = steps.findIndex(s => s.status === step.status);
              const isCompleted = actualIdx <= currentStep;
              const isCurrent = actualIdx === currentStep;
              const maxVisibleIdx = order.type === 'dine-in' ? steps.filter(s => s.status !== 'out-for-delivery').length - 1 : steps.length - 1;

              return (
                <div key={step.status} className="flex gap-4 relative">
                  {actualIdx < (order.type === 'dine-in' ? 4 : 5) && step.status !== 'finished' && (
                    <div className={cn(
                      "absolute left-4 top-10 w-0.5 h-6 -ml-[1px]",
                      idx < currentStep ? "bg-green-500" : "bg-slate-100"
                    )} />
                  )}
                  
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all duration-500 z-10",
                    isCompleted ? "bg-green-500 text-white" : "bg-slate-100 text-slate-300",
                    isCurrent && "ring-4 ring-green-500/20 scale-110"
                  )}>
                    {isCompleted ? <CheckCircle2 size={18} /> : step.icon}
                  </div>

                  <div>
                    <h3 className={cn(
                      "font-black text-sm uppercase tracking-widest",
                      isCompleted ? "text-green-600" : "text-slate-400"
                    )}>
                      {step.label}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">{step.description}</p>
                    {isCurrent && (
                      <motion.div 
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="mt-2 inline-flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100"
                      >
                         <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                         <span className="text-[10px] font-black uppercase text-green-700 tracking-widest">Atualizado agora</span>
                      </motion.div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

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
              <span>R$ {(order.total - (order.donationAmount || 0)).toFixed(2)}</span>
            </div>
            {order.donationAmount ? (
              <div className="flex justify-between text-xs font-black uppercase tracking-widest text-orange-500 mb-2">
                <span>Doação MEU OVO</span>
                <span>R$ {order.donationAmount.toFixed(2)}</span>
              </div>
            ) : null}
            <div className="flex justify-between text-lg font-black uppercase italic tracking-tighter">
              <span>Total</span>
              <span>R$ {(order.total).toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-4">
          <button 
            onClick={() => {
              const phoneNum = restaurant?.whatsapp ? restaurant.whatsapp.replace(/\D/g, '') : '5511999999999';
              const textMsg = encodeURIComponent(`Olá! Estou acompanhando meu pedido #${order.id} no Meu Ovo e gostaria de falar com o restaurante.`);
              window.open(`https://wa.me/${phoneNum}?text=${textMsg}`, '_blank');
            }}
            className="flex flex-col items-center justify-center p-6 bg-white border border-slate-100 rounded-[2rem] shadow-lg hover:bg-slate-50 transition-all gap-2 focus:outline-none hover:scale-[1.02] active:scale-95"
            id="btn-status-whatsapp"
          >
            <Smartphone size={24} className="text-green-500" />
            <span className="text-[10px] font-black uppercase tracking-widest">Falar c/ Loja</span>
          </button>
          <button 
            onClick={() => {
              const phoneNum = restaurant?.whatsapp ? restaurant.whatsapp.replace(/\D/g, '') : '5511999999999';
              const textMsg = encodeURIComponent(`Olá! Preciso de ajuda urgente com o status do meu pedido #${order.id} no Meu Ovo.`);
              window.open(`https://wa.me/${phoneNum}?text=${textMsg}`, '_blank');
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