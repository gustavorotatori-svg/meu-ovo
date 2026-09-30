import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { db } from '../lib/firebase';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { Order } from '../types';
import { useRestaurant } from '../context/RestaurantContext';
import { WA_NUMBER } from '../services/whatsappService';
import { 
  CheckCircle2, 
  Clock, 
  ChefHat, 
  Bike, 
  Package, 
  MoveLeft,
  MessageCircle,
  Phone,
  AlertCircle,
  Camera,
  X,
  Send,
  AlertTriangle
} from 'lucide-react';
import { cn, formatCurrency, currencyLocale } from '../lib/utils';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'react-hot-toast';

export default function OrderTracking() {
  const { t, i18n } = useTranslation();
  const fmt = (v: number) => formatCurrency(v, currencyLocale(i18n.language));
  const { slug, orderId } = useParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [isProblemModalOpen, setIsProblemModalOpen] = useState(false);
  const [problemType, setProblemType] = useState<Order['problemReport']['type'] | ''>('');
  const [problemDesc, setProblemDesc] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGuest, setIsGuest] = useState(true);

  const { restaurants } = useRestaurant();

  const restaurant = restaurants.find(r => r.slug === slug);

  useEffect(() => {
    const auth = getAuth();
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      setIsGuest(!user);
    });
    return () => unsubAuth();
  }, []);

  useEffect(() => {
    if (!orderId) return;

    if (isGuest) {
      let cancelled = false;
      const loadGuest = async () => {
        try {
          const res = await fetch(`/api/order/${orderId}/status`);
          if (!res.ok) {
            if (!cancelled) setLoading(false);
            return;
          }
          const data = await res.json();
          if (cancelled) return;
          setOrder({
            id: data.id,
            status: data.status,
            createdAt: data.createdAt,
            type: data.type,
            paymentMethod: data.paymentMethod,
            total: data.total,
            items: data.items
          } as Order);
          setLoading(false);
        } catch (e) {
          if (!cancelled) setLoading(false);
        }
      };
      loadGuest();
      const interval = setInterval(loadGuest, 15000);
      return () => {
        cancelled = true;
        clearInterval(interval);
      };
    }

    const unsubscribe = onSnapshot(doc(db, 'orders', orderId), (snapshot) => {
      if (snapshot.exists()) {
        setOrder({ id: snapshot.id, ...snapshot.data() } as Order);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [orderId, isGuest]);

  const handleReportProblem = async () => {
    if (!orderId || !problemType || !problemDesc) {
      toast.error(t('track.fillRequired'));
      return;
    }

    setIsSubmitting(true);
    try {
      await updateDoc(doc(db, 'orders', orderId), {
        problemReport: {
          type: problemType,
          description: problemDesc,
          status: 'pending',
          createdAt: new Date().toISOString()
        }
      });
      toast.success(t('track.reportSent'));
      setIsProblemModalOpen(false);
    } catch (e) {
      toast.error(t('track.reportError'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleWhatsAppUpdate = () => {
    if (!order || !restaurant) return;

    const STATUS_LABEL: Record<string, string> = {
      received: t('orderStatus.stepReceived'),
      preparing: t('orderStatus.stepPreparing'),
      ready: t('orderStatus.stepReady'),
      'out-for-delivery': t('orderStatus.stepOutForDelivery'),
      finished: t('orderStatus.stepFinished'),
      cancelled: t('orderStatus.etaCancelled')
    };

    const msg = t('track.waUpdate', { id: order.id.slice(-6).toUpperCase(), status: STATUS_LABEL[order.status] });
    const url = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="h-12 w-12 border-4 border-[#FFC928] border-t-transparent rounded-full"
        />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center">
        <h1 className="text-2xl font-bold text-zinc-900 mb-2">{t('track.notFoundTitle')}</h1>
        <Link to={`/m/${slug}`}>
          <Button className="mt-4">{t('track.backToMenu')}</Button>
        </Link>
      </div>
    );
  }

  const steps = [
    { id: 'received', label: t('track.stepReceived'), icon: <Clock />, desc: t('track.stepReceivedDesc') },
    { id: 'preparing', label: t('track.stepPreparing'), icon: <ChefHat />, desc: t('track.stepPreparingDesc') },
    { id: 'ready', label: t('track.stepReady'), icon: <Package />, desc: t('track.stepReadyDesc') },
    { id: 'out-for-delivery', label: t('track.stepDelivering'), icon: <Bike />, desc: t('track.stepDeliveringDesc') },
    { id: 'finished', label: t('track.stepFinished'), icon: <CheckCircle2 />, desc: t('track.stepFinishedDesc') },
  ];

  const currentStepIndex = steps.findIndex(s => s.id === order.status);

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-20">
      {/* Header */}
      <div className="bg-slate-900 border-b border-slate-800 px-6 h-14 flex items-center gap-4 sticky top-0 z-50 shadow-lg">
        <Link to={`/m/${slug}`} className="p-2 -ml-2 text-slate-400 hover:text-white transition-colors">
          <MoveLeft size={20} />
        </Link>
        <div className="flex-1">
          <h1 className="font-black text-sm text-brand-white uppercase tracking-tight italic">{t('track.headerTitle')}</h1>
          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none">MEU OVO #{order.id.slice(-6).toUpperCase()}</p>
        </div>
      </div>

      <div className="max-w-md mx-auto p-4 space-y-4">
        {order.problemReport && (
          <div className="bg-red-50 border-2 border-red-100 p-4 rounded-2xl flex items-start gap-3">
             <AlertTriangle className="text-red-500 shrink-0" size={18} />
               <div>
                 <p className="text-[10px] font-black text-red-600 uppercase tracking-widest">{t('track.problemFlagged')}</p>
                 <p className="text-xs text-red-800 font-bold mt-1">{t('track.problemNotified', { type: order.problemReport.type === 'missing_item' ? t('track.problemMissing') : t('track.problemOther') })}</p>
               </div>
          </div>
        )}

        {/* Real-time Status Card */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xl shadow-slate-200 relative group">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-slate-100">
              <motion.div 
                className="h-full bg-brand-egg rounded-r-full shadow-[0_0_10px_#FFC928]" 
                initial={{ width: 0 }}
                animate={{ width: `${((currentStepIndex + 1) / steps.length) * 100}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
              />
           </div>
           
           <div className="p-10 flex flex-col items-center text-center space-y-5">
              <motion.div 
                animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }} 
                transition={{ repeat: Infinity, duration: 3 }}
                className="w-20 h-20 bg-brand-egg text-brand-black rounded-3xl shadow-2xl shadow-yellow-200 border-b-8 border-yellow-600 flex items-center justify-center p-0"
              >
                 <div className="scale-150">
                    {steps[Math.max(0, currentStepIndex)]?.icon}
                 </div>
              </motion.div>
              <div>
                 <h2 className="text-2xl font-black text-brand-black uppercase tracking-tighter italic leading-none">
                   {order.status === 'cancelled' ? t('track.cancelledTitle') : steps[Math.max(0, currentStepIndex)]?.label}
                 </h2>
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-3 px-8 leading-relaxed">
                    {order.status === 'cancelled' ? t('track.cancelledDesc') : steps[Math.max(0, currentStepIndex)]?.desc}
                 </p>
              </div>
           </div>
        </div>

        {/* Delivery Partner - Simulated Integration */}
        {order.status === 'out-for-delivery' && (
          <div className="bg-brand-black p-4 rounded-2xl border-b-4 border-[#FFC928] text-white flex items-center justify-between shadow-xl">
             <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center border border-white/10">
                   <Bike size={20} className="text-[#FFC928]" />
                </div>
                 <div>
                    <p className="text-[10px] font-black uppercase text-slate-400">{t('track.deliveryVia')}</p>
                    <p className="text-sm font-black uppercase italic tracking-tight">{t('track.deliveryPartner')}</p>
                 </div>
             </div>
              <button className="p-3 bg-brand-egg text-brand-black rounded-xl hover:scale-105 active:scale-95 transition-all" aria-label={t('track.callRestaurant')}>
                <Phone size={16} />
             </button>
          </div>
        )}

        {/* Steps History */}
        <div className={cn("bg-white rounded-2xl border border-slate-200 p-8 space-y-0 relative overflow-hidden transition-all", order.status === 'cancelled' && 'opacity-50 grayscale')}>
           <div className="absolute left-[39.5px] top-10 bottom-10 w-px bg-slate-100" />
           {steps.filter(s => order.type === 'delivery' || s.id !== 'out-for-delivery').map((step, index) => {
             const actualIndex = steps.findIndex(s => s.id === step.id);
             const isDone = actualIndex < currentStepIndex;
             const isCurrent = actualIndex === currentStepIndex;
             
             return (
               <div key={step.id} className={cn("flex gap-6 relative transition-all duration-500", !isDone && !isCurrent ? "opacity-30 translate-x-4" : "opacity-100 translate-x-0")}>
                  <div className="flex flex-col items-center py-2 relative z-10">
                     <div className={cn(
                       "h-3 w-3 rounded-full flex items-center justify-center border-2 transition-all duration-700",
                       isDone ? "bg-green-500 border-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" :
                       isCurrent ? "bg-[#FFC928] border-[#FFC928] animate-pulse shadow-xl shadow-yellow-200" : "bg-white border-slate-200"
                     )}>
                     </div>
                  </div>
                  <div className="pb-8">
                     <p className={cn("text-[10px] font-black uppercase tracking-widest flex items-center gap-2", isCurrent ? "text-brand-black" : "text-slate-400")}>
                       {step.label}
                        {isCurrent && <span className="bg-[#FFC928]/20 text-[#FFC928] px-2 py-0.5 rounded text-[8px] animate-pulse">{t('track.currentBadge')}</span>}
                     </p>
                     {isCurrent && <p className="text-xs text-slate-500 font-bold mt-1 leading-normal italic tracking-tight">{step.desc}</p>}
                  </div>
               </div>
             );
           })}
        </div>

        {/* Order Details Accordion-like summary */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
           <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
               <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic">{t('track.ticketTitle')}</span>
               <span className="text-[9px] font-black text-slate-900 bg-brand-egg px-2 py-1 rounded-lg uppercase tracking-tight shadow-sm">{t('track.paidVia', { method: order.paymentMethod.toUpperCase() })}</span>
           </div>
           <div className="p-6 space-y-3">
              {order.items.map((item, i) => (
                <div key={i} className="flex justify-between items-start">
                   <div className="flex gap-3">
                      <span className="text-[10px] font-black text-brand-black bg-brand-egg/30 w-6 h-6 rounded-lg flex items-center justify-center shrink-0">{item.quantity}</span>
                      <div>
                         <p className="text-[12px] text-slate-800 font-black uppercase italic tracking-tight">{item.productName || (item as { name: string }).name}</p>
                        {item.additionals?.length > 0 && (
                          <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">+ {item.additionals.map(a => a.name).join(', ')}</p>
                        )}
                      </div>
                   </div>
                    <p className="text-xs font-black text-slate-500 italic">{fmt(item.unitPrice * item.quantity)}</p>
                </div>
              ))}
              <div className="mt-6 pt-5 border-t border-dashed border-slate-200 flex justify-between items-end">
                 <div>
                     <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em] italic mb-1">{t('track.totalLabel')}</p>
                     <p className="text-3xl font-black text-brand-black leading-none tracking-tighter italic uppercase">{fmt(order.total)}</p>
                 </div>
              </div>
           </div>
        </div>

        {/* MEU OVO DEU RUIM */}
        {!order.problemReport && order.status !== 'received' && (
          <button 
            onClick={() => setIsProblemModalOpen(true)}
             className="w-full h-11 bg-red-50 text-red-500 border-2 border-red-100 rounded-2xl flex items-center justify-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] hover:bg-red-100 transition-all shadow-lg shadow-red-50"
           >
              <AlertCircle size={16} /> {t('track.reportBtn')}
          </button>
        )}

        {/* Support Actions */}
        <div className="grid grid-cols-2 gap-3">
           <a 
            href={`tel:${WA_NUMBER}`}
            className="h-12 bg-white border-2 border-slate-200 rounded-2xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-700 hover:border-slate-400 transition-all shadow-sm"
           >
               <Phone size={16} className="text-slate-400" /> {t('track.supportBtn')}
           </a>
           <button 
            onClick={handleWhatsAppUpdate}
            className="h-12 bg-[#25D366] text-white rounded-2xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest hover:opacity-90 transition-all shadow-xl shadow-green-100"
           >
               <MessageCircle size={18} /> {t('track.whatsappBtn')}
           </button>
        </div>

        <div className="text-center pt-8">
            <Link to="/" className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] hover:text-[#FFC928] transition-colors italic">
               {t('track.brandFooter')}
            </Link>
        </div>
      </div>

      {/* Problem Report Modal */}
      <AnimatePresence>
        {isProblemModalOpen && (
          <div role="dialog" aria-modal="true" aria-label={t('track.ariaReport')} className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
             <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               onClick={() => setIsProblemModalOpen(false)}
               className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm"
             />
             <motion.div 
               initial={{ y: "100%" }}
               animate={{ y: 0 }}
               exit={{ y: "100%" }}
               className="relative bg-white w-full max-w-md rounded-t-[2.5rem] sm:rounded-[2.5rem] p-8 shadow-2xl overflow-hidden"
             >
                <div className="absolute top-0 left-0 right-0 h-2 bg-red-500" />
                <div className="flex justify-between items-start mb-6">
                    <div>
                       <h3 className="text-2xl font-black text-brand-black tracking-tighter uppercase italic leading-none">{t('track.modalTitle')}</h3>
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2 italic">{t('track.modalSub')}</p>
                    </div>
                     <button onClick={() => setIsProblemModalOpen(false)} className="p-2 bg-slate-100 rounded-xl text-slate-400 hover:text-black" aria-label={t('track.closeBtn')}>
                       <X size={20} />
                   </button>
                </div>

                <div className="space-y-6">
                   <div className="space-y-3">
                       <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('track.whatHappened')}</label>
                       <div className="grid grid-cols-1 gap-2">
                          {[
                            { id: 'missing_item', label: t('track.typeMissing'), icon: <Package size={14} /> },
                            { id: 'wrong_item', label: t('track.typeWrong'), icon: <AlertCircle size={14} /> },
                            { id: 'bad_condition', label: t('track.typeKitchen'), icon: <ChefHat size={14} /> },
                            { id: 'other', label: t('track.typeOther'), icon: <AlertTriangle size={14} /> }
                          ].map(type => (
                           <button 
                             key={type.id}
                              onClick={() => setProblemType(type.id as Order['problemReport']['type'])}
                             className={cn(
                               "flex items-center gap-3 p-4 rounded-2xl border-2 font-black text-xs uppercase tracking-tight transition-all text-left",
                               problemType === type.id ? "border-red-500 bg-red-50 text-red-600 shadow-lg shadow-red-100" : "border-slate-100 text-slate-500"
                             )}
                           >
                              <div className={cn("p-2 rounded-lg", problemType === type.id ? "bg-red-500 text-white" : "bg-slate-100")}>
                                {type.icon}
                              </div>
                              {type.label}
                           </button>
                         ))}
                      </div>
                   </div>

                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('track.detailLabel')}</label>
                       <textarea 
                         value={problemDesc}
                         onChange={e => setProblemDesc(e.target.value)}
                         placeholder={t('track.detailPlaceholder')}
                        className="w-full h-24 bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-sm font-medium outline-none focus:border-red-200 transition-all resize-none"
                      />
                   </div>

                   <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center group cursor-pointer hover:bg-white hover:border-red-200 transition-all">
                      <Camera size={24} className="mx-auto text-slate-300 group-hover:text-red-400 transition-colors mb-2" />
                       <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest font-mono">{t('track.attachPhoto')}</span>
                   </div>

                   <button 
                    onClick={handleReportProblem}
                    disabled={isSubmitting || !problemType || !problemDesc}
                    className="w-full h-14 bg-red-600 text-white rounded-3xl font-black uppercase tracking-[0.2em] shadow-xl shadow-red-200 disabled:opacity-50 flex items-center justify-center gap-2 hover:bg-red-700 transition-all hover:scale-[1.02]"
                   >
                       {isSubmitting ? t('track.sending') : (
                         <><Send size={18} /> {t('track.sendReport')}</>
                       )}
                   </button>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Button({ children, className, onClick }: { children: React.ReactNode; className?: string; onClick?: () => void }) {
    return (
      <button onClick={onClick} className={cn("px-6 py-2 bg-[#FFC928] text-black rounded-lg font-black uppercase tracking-tight shadow-lg shadow-yellow-100", className)}>
        {children}
      </button>
    );
}

