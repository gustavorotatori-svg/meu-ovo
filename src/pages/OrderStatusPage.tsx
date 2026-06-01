import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Order } from '../types';
import { motion } from 'motion/react';
import { ChefHat, CheckCircle2, Clock, MapPin, Smartphone, ArrowLeft, Utensils, Bike } from 'lucide-react';
import { cn } from '../lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function OrderStatusPage() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!id) return;

    const unsub = onSnapshot(doc(db, 'orders', id), (snapshot) => {
      if (snapshot.exists()) {
        setOrder({ id: snapshot.id, ...snapshot.data() } as Order);
      }
      setLoading(false);
    });

    return () => unsub();
  }, [id]);

  const steps = [
    { status: 'received', label: 'Recebido', icon: <Clock size={20} />, description: 'O restaurante recebeu seu pedido' },
    { status: 'preparing', label: 'Preparando', icon: <ChefHat size={20} />, description: 'Seu pedido está sendo preparado' },
    { status: 'ready', label: 'Pronto', icon: <Utensils size={20} />, description: 'Pedido finalizado e pronto!' },
    { status: 'out_for_delivery', label: 'A caminho', icon: <Bike size={20} />, description: 'O entregador já saiu com seu pedido' },
    { status: 'delivered', label: 'Entregue', icon: <CheckCircle2 size={20} />, description: 'Bom apetite!' },
  ];

  const currentStep = steps.findIndex(s => s.status === order?.status);

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
        
        <button onClick={() => navigate(-1)} className="mb-6 opacity-60 hover:opacity-100 transition-opacity">
          <ArrowLeft size={24} />
        </button>

        <h1 className="text-3xl font-black italic uppercase tracking-tighter leading-none mb-2">Acompanhe seu Pedido</h1>
        <p className="text-xs font-black text-[#FFC928] uppercase tracking-[0.2em]">#{order.id.slice(-6)}</p>
      </div>

      <div className="max-w-xl mx-auto px-6 -mt-8 space-y-6">
        {/* Status Stepper */}
        <div className="bg-white rounded-3xl p-8 shadow-xl border border-slate-100">
          <div className="space-y-8">
            {steps.slice(0, order.type === 'dine-in' ? 3 : 5).map((step, idx) => {
              const isCompleted = idx <= currentStep;
              const isCurrent = idx === currentStep;

              return (
                <div key={step.status} className="flex gap-4 relative">
                  {idx < (order.type === 'dine-in' ? 2 : 4) && (
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
                <span className="font-bold text-sm">R$ {(item.price * item.quantity).toFixed(2)}</span>
              </div>
            ))}
          </div>

          <div className="mt-8 pt-6 border-t border-dashed border-slate-200">
            <div className="flex justify-between text-xs font-black uppercase tracking-widest text-slate-400 mb-2">
              <span>Subtotal</span>
              <span>R$ {order.total.toFixed(2)}</span>
            </div>
            {order.donationAmount && (
              <div className="flex justify-between text-xs font-black uppercase tracking-widest text-orange-500 mb-2">
                <span>Doação (Mercado Pago) 🥚</span>
                <span>R$ {order.donationAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-black uppercase italic tracking-tighter">
              <span>Total do pedido</span>
              <span>R$ {order.total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-4">
          <button 
            onClick={() => window.open(`https://wa.me/${order.restaurantId}`, '_blank')}
            className="flex flex-col items-center justify-center p-6 bg-white border border-slate-100 rounded-[2rem] shadow-lg hover:bg-slate-50 transition-all gap-2"
          >
            <Smartphone size={24} className="text-green-500" />
            <span className="text-[10px] font-black uppercase tracking-widest">WhatsApp</span>
          </button>
          <button 
            className="flex flex-col items-center justify-center p-6 bg-white border border-slate-100 rounded-[2rem] shadow-lg hover:bg-slate-50 transition-all gap-2"
          >
            <MapPin size={24} className="text-[#FFC928]" />
            <span className="text-[10px] font-black uppercase tracking-widest">Ajuda</span>
          </button>
        </div>

        <p className="text-center text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] py-8">
          Feito com ❤️ por MEU OVO
        </p>
      </div>
    </div>
  );
}
