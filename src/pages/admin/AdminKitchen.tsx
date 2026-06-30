import React, { useState, useEffect, useRef } from 'react';
import { Clock, ChefHat, Check, AlertCircle, Maximize2, Bell } from 'lucide-react';
import AdminLayout from './AdminLayout';
import { useRestaurant } from '../../context/RestaurantContext';
import { Order } from '../../types';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';

export default function AdminKitchen() {
  const { orders, updateOrderStatus, currentRestaurant } = useRestaurant();
  const preparingOrders = orders.filter(o => ['received', 'preparing'].includes(o.status));
  const previousOrdersCount = useRef(preparingOrders.length);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [time, setTime] = useState(new Date());
  const [soundPulse, setSoundPulse] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const playManualAlert = () => {
    if (audioRef.current) {
      setSoundPulse(true);
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(e => console.log('Audio playback failed:', e));
      setTimeout(() => setSoundPulse(false), 2000);
    }
  };

  useEffect(() => {
    if (preparingOrders.length > previousOrdersCount.current) {
      // New order arrived - trigger pulse and play sound
      setSoundPulse(true);
      if (audioRef.current) {
        audioRef.current.play().catch(e => console.log('Audio playback failed:', e));
      }
      setTimeout(() => setSoundPulse(false), 2000);
    }
    previousOrdersCount.current = preparingOrders.length;
  }, [preparingOrders.length]);

  return (
    <div className="min-h-screen bg-[#000] text-white flex flex-col font-sans">
      <audio 
        ref={audioRef} 
        src="https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3" 
        preload="auto" 
      />
      {/* KDS Header */}
      <header className="p-4 bg-[#0a0a0a] border-b-4 border-[#111] flex items-center justify-between shadow-2xl relative">
        <div className="flex items-center gap-6">
          <div className="bg-[#FFC928] p-3 rounded-2xl rotate-3 shadow-lg shadow-[#FFC928]/20">
            <ChefHat size={32} className="text-black" />
          </div>
          <div>
            <h1 className="font-black text-3xl italic tracking-tighter uppercase leading-none">MODO COZINHA</h1>
            <p className="text-[#FFC928] text-xs font-black uppercase tracking-widest mt-1">
              {currentRestaurant?.name} • <span className="text-white">{preparingOrders.length} PEDIDOS</span>
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-8">
          <button 
            onClick={playManualAlert}
            className={`flex items-center gap-2 bg-white/5 hover:bg-white/10 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest border border-white/5 relative transition-all active:scale-95 ${soundPulse ? 'ring-2 ring-[#FFC928] border-transparent' : ''}`}
          >
            {soundPulse && (
              <span className="absolute -inset-1 rounded-xl bg-[#FFC928]/20 animate-ping pointer-events-none" />
            )}
            <Bell size={14} className={`text-[#FFC928] ${soundPulse ? 'animate-bounce' : ''}`} />
            <span>Testar Alerta Sonoro</span>
          </button>
          
          <div className="text-right border-r-2 border-white/10 pr-8">
            <p className="text-2xl font-black italic">{time.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</p>
            <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest">{time.toLocaleDateString('pt-BR', { weekday: 'long' })}</p>
          </div>
          <button onClick={() => window.history.back()} className="bg-white/5 hover:bg-white/10 p-4 rounded-2xl border-2 border-white/5 transition-all active:scale-95" aria-label="Expandir tela">
            <Maximize2 size={24} className="text-gray-400" />
          </button>
        </div>
      </header>

      {/* Orders grid */}
      <main className="flex-1 p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6 overflow-auto bg-[#050505]">
        {preparingOrders.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center py-40 opacity-20">
            <ChefHat size={120} className="mb-8" />
            <h2 className="text-4xl font-black italic tracking-tight uppercase">Cozinha Limpa!</h2>
            <p className="text-lg font-bold">Nenhum pedido na chapa por enquanto.</p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {preparingOrders.map(order => (
              <motion.div
                key={order.id}
                initial={{ scale: 0.8, opacity: 0, y: 50 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.8, opacity: 0, x: 100 }}
                layout
              >
                <KitchenTicket
                  order={order}
                  currentTime={time}
                  onReady={() => updateOrderStatus(order.id, 'ready')}
                  onPrepare={() => updateOrderStatus(order.id, 'preparing')}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </main>

      {/* Footer / Legend */}
      <footer className="p-4 bg-[#0a0a0a] border-t-2 border-white/5 flex items-center justify-between px-10">
        <div className="flex gap-10 text-[10px] font-black uppercase tracking-widest">
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 bg-white/10 border-2 border-white/20 rounded-md" /> 
            <span className="text-gray-500">Aguardando</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 bg-[#FFC928] rounded-md shadow-lg shadow-[#FFC928]/20" /> 
            <span className="text-[#FFC928]">Em preparo</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 bg-red-650 rounded-md animate-pulse shadow-lg shadow-red-650/20" /> 
            <span className="text-red-500">Atrasado (&gt; limite)</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 rounded-md bg-white animate-pulse shadow-lg shadow-white/50" /> 
            <span className="text-white">Novo (Alerta)</span>
          </div>
        </div>
        
        <div className="text-gray-600 font-bold text-[10px]">
          MEU OVO KDS v1.0 • SISTEMA DE GESTÃO EM TEMPO REAL
        </div>
      </footer>
    </div>
  );
}

const KitchenTicket: React.FC<{ order: Order; currentTime: Date; onReady: () => void; onPrepare: () => void }> = ({ order, currentTime, onReady, onPrepare }) => {
  const targetMinutes = order.type === 'delivery' ? 25 : 15;
  const createdAtTime = new Date(order.createdAt).getTime();
  const deadlineTime = createdAtTime + targetMinutes * 60 * 1000;
  const msLeft = deadlineTime - currentTime.getTime();

  const isDelayed = msLeft <= 0;
  const absMs = Math.abs(msLeft);
  const leftMin = Math.floor(absMs / 60000);
  const leftSec = Math.floor((absMs % 60000) / 1000);
  const timerString = `${isDelayed ? '-' : ''}${leftMin}:${leftSec.toString().padStart(2, '0')}`;

  const elapsedMinutes = Math.floor((currentTime.getTime() - createdAtTime) / 60000);
  const isVeryNew = elapsedMinutes < 1;

  const typeLabel = { 'dine-in': `MESA ${order.tableNumber}`, 'delivery': 'DELIVERY', 'pickup': 'RETIRADA' };
  const typeColor = { 
    'dine-in': 'bg-purple-600 border-purple-500', 
    'delivery': 'bg-blue-600 border-blue-500', 
    'pickup': 'bg-green-600 border-green-500' 
  };

  return (
    <div className={`bg-[#111] rounded-[2rem] flex flex-col border-4 overflow-hidden shadow-2xl transition-all relative ${
      isVeryNew ? 'border-white animate-pulse' : 
      isDelayed ? 'border-red-650 ring-4 ring-red-600/10' :
      order.status === 'preparing' ? 'border-[#FFC928]' : 'border-white/10'
    }`}>
      {isVeryNew ? (
        <div className="absolute top-0 right-0 bg-white text-black font-black text-[10px] px-4 py-1 rounded-bl-xl uppercase tracking-widest z-10 animate-bounce">
          Novo Pedido
        </div>
      ) : isDelayed ? (
        <div className="absolute top-0 right-0 bg-red-600 text-white font-black text-[9px] px-3.5 py-1 rounded-bl-xl uppercase tracking-widest z-10 flex items-center gap-1 border-l border-b border-red-500 animate-pulse">
          <AlertCircle size={10} className="text-white shrink-0" />
          <span>Atrasado {leftMin}m</span>
        </div>
      ) : null}

      <div className={`${typeColor[order.type]} border-b-4 p-4 flex items-center justify-between`}>
        <span className="font-black text-xs tracking-widest leading-none text-white">{typeLabel[order.type]}</span>
        <div className={cn(
          "flex items-center gap-1.5 px-3 py-1 rounded-full font-black text-xs shadow-inner",
          isDelayed 
            ? "bg-red-800/80 text-white animate-pulse" 
            : leftMin < 5 
              ? "bg-orange-600/80 text-white" 
              : "bg-black/30 text-emerald-400"
        )}>
          <Clock size={13} strokeWidth={3} className={isDelayed ? "animate-spin" : ""} />
          <span className="font-mono tracking-wider">{timerString}</span>
        </div>
      </div>

      <div className="p-6 flex-1 text-left">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/5">
          <span className="font-black text-3xl italic tracking-tighter">#{order.id.slice(-4)}</span>
          <div className="text-right">
            <p className="text-white/40 text-[10px] font-black uppercase tracking-widest">Recebido</p>
            <p className="text-white font-bold text-sm tracking-tight">{new Date(order.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
          </div>
        </div>

        <div className="space-y-6">
          {order.items.map((item, i) => (
            <div key={i} className="flex items-start gap-4">
              <div className="bg-white text-black w-10 h-10 rounded-xl flex items-center justify-center font-black text-xl flex-shrink-0 shadow-lg mt-1">
                {item.quantity}
              </div>
              <div className="flex-1">
                <p className="font-black text-xl leading-tight uppercase tracking-tight">{item.productName}</p>
                {item.additionals.length > 0 && (
                   <div className="flex flex-wrap gap-1 mt-2">
                     {item.additionals.map((a, idx) => (
                       <span key={idx} className="bg-white/5 text-white/50 text-[10px] font-black px-2 py-1 rounded uppercase tracking-tighter">
                         + {a.name}
                       </span>
                     ))}
                   </div>
                )}
                {item.observations && (
                  <div className="bg-red-950/50 text-red-400 p-3 rounded-xl mt-3 text-xs font-black border border-red-500/20 flex items-center gap-3">
                    <AlertCircle size={16} className="flex-shrink-0" />
                    <span className="leading-tight uppercase italic">{item.observations}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {order.observations && (
          <div className="mt-8 pt-4 border-t-2 border-dashed border-white/5 text-[10px] text-[#FFC928] font-black uppercase italic leading-relaxed">
            <span className="text-white/30 block mb-1">Observação do pedido:</span>
            {order.observations}
          </div>
        )}
      </div>

      <div className="p-4 bg-[#0a0a0a] flex gap-3">
        {order.status === 'received' ? (
          <button
            onClick={onPrepare}
            className="flex-1 bg-white text-black font-black py-4 rounded-2xl text-sm hover:bg-[#FFC928] transition-all active:scale-95 shadow-xl uppercase italic tracking-tighter"
          >
            INICIAR PREPARO
          </button>
        ) : (
          <button
            onClick={onReady}
            className="flex-1 bg-[#FFC928] text-black font-black py-4 rounded-2xl text-sm hover:bg-[#e6b520] transition-all active:scale-95 flex items-center justify-center gap-2 shadow-xl shadow-[#FFC928]/10 uppercase italic tracking-tighter"
          >
            <Check size={24} strokeWidth={4} />
            PRONTO
          </button>
        )}
      </div>
    </div>
  );
};
