import { useState, useEffect, useRef, useMemo } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { useTheme } from '../../context/ThemeContext';
import { Order } from '../../types';
import { ChefHat, Clock, CheckCircle2, Play, AlertCircle, Volume2, VolumeX, Smartphone, MapPin, Store, Maximize2, Minimize2, BookOpen, X } from 'lucide-react';
import BackButton from '../../components/BackButton';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'react-hot-toast';

export default function KitchenMode() {
  const { currentRestaurant, orders, updateOrderStatus, recipeSheets, products } = useRestaurant();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [filter, setFilter] = useState<'all' | 'delivery' | 'dine-in' | 'pickup'>('all');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<{ productName: string; quantity: number; observations?: string } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const prevOrdersCount = useRef(orders.length);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const getRecipeForProduct = (productName: string) => {
    const product = products.find(p => p.name.toLowerCase() === productName.toLowerCase());
    if (!product) return null;
    const sheet = recipeSheets.find(s => s.productId === product.id);
    return sheet ? { recipe: sheet, prepTime: product.estimatedPrepTime } : null;
  };

  const getTimeColor = (minutes: number) => {
    if (minutes < 7) return 'bg-emerald-500 text-white';
    if (minutes < 15) return 'bg-orange-500 text-white';
    return 'bg-red-500 text-white animate-bounce';
  };

  const getTimeBg = (minutes: number) => {
    if (minutes < 7) return 'bg-emerald-500/50 ring-emerald-500/5';
    if (minutes < 15) return 'bg-orange-500/50 ring-orange-500/5';
    return 'bg-red-500/50 ring-red-500/5';
  };

  // Sound alert logic for NEW orders only
  useEffect(() => {
    if (orders.length > prevOrdersCount.current) {
      const hasNew = orders.some(o => o.status === 'received');
      if (hasNew && soundEnabled && audioRef.current) {
        audioRef.current.play().catch(e => console.error('Audio play failed:', e));
        toast('🍳 Novo pedido na cozinha!', {
          style: {
            borderRadius: '1rem',
            background: '#FFC928',
            color: '#111',
            fontWeight: 'black',
            textTransform: 'uppercase',
            fontSize: '10px',
            letterSpacing: '0.1em'
          },
        });
      }
    }
    prevOrdersCount.current = orders.length;
  }, [orders.length, soundEnabled, orders]);

  const activeOrders = orders.filter(o => 
    ['received', 'preparing', 'ready'].includes(o.status) &&
    (filter === 'all' || o.type === filter)
  ).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  const getStatusConfig = (status: Order['status']) => {
    switch (status) {
      case 'received': return { label: 'Novo', color: 'bg-blue-500', icon: <AlertCircle size={14} /> };
      case 'preparing': return { label: 'Preparando', color: 'bg-orange-500', icon: <Play size={14} /> };
      case 'ready': return { label: 'Pronto', color: 'bg-green-500', icon: <CheckCircle2 size={14} /> };
      default: return { label: status, color: 'bg-gray-500', icon: null };
    }
  };

  const getOrderTypeIcon = (type: Order['type']) => {
    switch (type) {
      case 'delivery': return <Smartphone size={16} />;
      case 'dine-in': return <Store size={16} />;
      case 'pickup': return <MapPin size={16} />;
      default: return <Smartphone size={16} />;
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  return (
    <div 
      ref={containerRef}
      className={cn(
        "min-h-screen flex flex-col transition-colors", 
        isDark ? 'bg-[#0a0a0a] text-white' : 'bg-[#F5F5F5] text-[#111]',
        isFullscreen && "p-4"
      )}
    >
      {/* Sound hidden element */}
      <audio ref={audioRef} src="https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3" preload="auto" />

      <div className="px-6 pt-6">
        <BackButton to="/" />
      </div>

      {/* Header */}
      <header className={cn("p-4 flex items-center justify-between border-b sticky top-0 z-10", isDark ? 'bg-[#111] border-white/5' : 'bg-white border-gray-200')}>
          <div className="flex items-center gap-4 min-w-0">
            <div className="p-3 bg-[#FFC928] rounded-2xl text-[#111] shadow-lg shadow-yellow-500/20 shrink-0">
              <ChefHat size={32} strokeWidth={2.5} />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-black uppercase tracking-tighter italic truncate">Cozinha {currentRestaurant?.name || 'MEU OVO'}</h1>
              <p className="text-[10px] font-black opacity-50 uppercase tracking-[0.2em]">KDS - Monitor de Produção</p>
            </div>
          </div>

        <div className="flex items-center gap-3">
          <div className={cn("hidden md:flex rounded-xl p-1", isDark ? 'bg-white/5' : 'bg-gray-100')}>
            {(['all', 'delivery', 'dine-in'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                  filter === f 
                    ? 'bg-[#FFC928] text-[#111]' 
                    : 'opacity-50 hover:opacity-100'
                )}
              >
                {f === 'all' ? 'Tudo' : f === 'delivery' ? 'Delivery' : 'Salão'}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleFullscreen}
              className={cn("p-3 rounded-xl transition-all", isDark ? 'bg-white/5 hover:bg-white/10' : 'bg-gray-100 hover:bg-gray-200')}
              aria-label="Alternar tamanho da tela"
            >
              {isFullscreen ? <Minimize2 size={24} /> : <Maximize2 size={24} />}
            </button>
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={cn(
                "p-3 rounded-xl transition-all",
                soundEnabled ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
              )}
              aria-label="Alternar som"
            >
              {soundEnabled ? <Volume2 size={24} /> : <VolumeX size={24} />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Grid */}
      <main className="flex-1 p-6 overflow-x-auto">
        <div className="flex gap-6 min-h-full">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6 w-full auto-rows-max">
            <AnimatePresence mode="popLayout">
              {activeOrders.map((order, idx) => {
                const config = getStatusConfig(order.status);
                const timeInKitchen = Math.floor((Date.now() - new Date(order.createdAt).getTime()) / 60000);
                
                return (
                  <motion.div
                    key={order.id}
                    layout
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    className={cn(
                      "rounded-3xl flex flex-col shadow-2xl relative border-4 transition-colors",
                      isDark ? 'bg-[#1a1a1a] border-white/5' : 'bg-white border-transparent',
                      order.status === 'received' && 'border-blue-500/50 ring-4 ring-blue-500/5 animate-pulse',
                      order.status === 'preparing' && 'border-orange-500/30 ring-4 ring-orange-500/5'
                    )}
                  >
                    {/* Card Header */}
                    <div className="p-5 border-b border-white/5 flex items-start justify-between bg-black/5 rounded-t-[1.6rem]">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-black opacity-50 uppercase tracking-widest">#{order.id.slice(-4)}</span>
                          <div className={cn("px-2 py-0.5 rounded-full text-[8px] font-black text-white uppercase tracking-tighter flex items-center gap-1", config.color)}>
                            {config.icon}
                            {config.label}
                          </div>
                        </div>
                        <h3 className="font-black text-lg leading-tight truncate">{order.customerName}</h3>
                        <div className="flex items-center gap-2 text-[10px] font-black opacity-50 uppercase tracking-widest mt-1">
                          {getOrderTypeIcon(order.type)}
                          {order.type === 'dine-in' ? `Mesa ${order.tableNumber}` : 'Delivery'}
                        </div>
                      </div>
                      <div className={cn(
                        "p-3 rounded-2xl flex flex-col items-center justify-center min-w-[60px] ml-4 transition-colors ring-4",
                        getTimeBg(timeInKitchen)
                      )}>
                        <Clock size={16} className="mb-0.5" />
                        <span className="text-xs font-black leading-none">{timeInKitchen}'</span>
                      </div>
                    </div>

                    {/* Items List */}
                    <div className="p-5 flex-1 space-y-4">
                      {order.items.map((item, i) => {
                        const itemRecipe = getRecipeForProduct(item.productName);
                        return (
                          <div 
                            key={i} 
                            className={cn(
                              "flex gap-3 rounded-xl p-2 -m-2 transition-all",
                              itemRecipe && "cursor-pointer hover:bg-white/5"
                            )}
                            onClick={() => itemRecipe && setSelectedItem({ productName: item.productName, quantity: item.quantity, observations: item.observations })}
                          >
                            <div className="w-8 h-8 rounded-lg bg-[#FFC928] text-[#111] flex items-center justify-center font-black text-sm shrink-0 shadow-sm">
                              {item.quantity}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="font-black text-sm leading-tight uppercase tracking-tight">{item.productName}</p>
                                {itemRecipe && <BookOpen size={12} className="text-[#FFC928] shrink-0" />}
                              </div>
                              {itemRecipe?.prepTime && (
                                <p className="text-[9px] text-gray-400 font-bold mt-0.5">⏱ ~{itemRecipe.prepTime}min de preparo</p>
                              )}
                              {item.additionals && item.additionals.length > 0 && (
                                <p className="text-[10px] text-orange-500 font-black uppercase mt-0.5 leading-none">
                                  + {item.additionals.map(a => a.name).join(', ')}
                                </p>
                              )}
                              {item.observations && (
                                <div className="mt-2 p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-black uppercase italic leading-tight">
                                  "Obs: {item.observations}"
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Actions */}
                    <div className="p-4 bg-black/5 mt-auto rounded-b-3xl grid grid-cols-2 gap-3">
                      {order.status === 'received' && (
                        <button
                          onClick={() => updateOrderStatus(order.id, 'preparing')}
                          className="col-span-2 w-full py-4 bg-blue-500 text-white font-black rounded-2xl flex items-center justify-center gap-2 hover:bg-blue-600 transition-all uppercase tracking-widest text-xs shadow-lg shadow-blue-500/20"
                        >
                          <Play size={18} fill="currentColor" />
                          Começar Preparo
                        </button>
                      )}
                      {order.status === 'preparing' && (
                        <>
                          <button
                            onClick={() => updateOrderStatus(order.id, 'received')}
                            className="py-4 bg-white/5 text-xs font-black rounded-2xl opacity-50 hover:opacity-100 transition-all border border-white/10 uppercase"
                          >
                            Voltar
                          </button>
                          <button
                            onClick={() => updateOrderStatus(order.id, 'ready')}
                            className="py-4 bg-green-500 text-white font-black rounded-2xl flex items-center justify-center gap-2 hover:bg-green-600 transition-all uppercase tracking-widest text-xs shadow-lg shadow-green-500/20"
                          >
                            <CheckCircle2 size={18} />
                            Pronto
                          </button>
                        </>
                      )}
                      {order.status === 'ready' && (
                        <button
                          onClick={() => updateOrderStatus(order.id, 'out-for-delivery')}
                          className="col-span-2 w-full py-4 bg-[#FFC928] text-[#111] font-black rounded-2xl flex items-center justify-center gap-2 hover:opacity-90 transition-all uppercase tracking-widest text-xs shadow-lg shadow-yellow-500/10"
                        >
                          {order.type === 'delivery' ? 'Enviar p/ Entrega' : 'Chamar Cliente'}
                        </button>
                      )}
                    </div>

                    {/* Progress Bar */}
                    <div className="absolute bottom-0 left-0 w-full h-1 bg-white/5 rounded-b-3xl overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(timeInKitchen * 5, 100)}%` }}
                        className={cn(
                          "h-full transition-colors",
                          timeInKitchen < 5 ? 'bg-green-500' : timeInKitchen < 15 ? 'bg-orange-500' : 'bg-red-500'
                        )}
                      />
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {activeOrders.length === 0 && (
              <div className="col-span-full h-96 flex flex-col items-center justify-center text-center opacity-30 select-none">
                <ChefHat size={120} className="mb-6 animate-bounce text-gray-500" strokeWidth={1} />
                <h2 className="text-4xl font-black italic uppercase tracking-tighter">Cozinha Limpa!</h2>
                <p className="font-black uppercase tracking-widest text-xs mt-2">Nenhum pedido pendente no momento.</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer Info */}
      <footer className={cn("p-3 px-6 flex items-center justify-between text-[10px] font-black uppercase tracking-[0.2em]", isDark ? 'bg-[#111] text-white/50 border-t border-white/5' : 'bg-white text-gray-400 border-t')}>
        <div className="flex gap-4">
          <span>Pedidos Ativos: {activeOrders.length}</span>
          <span>•</span>
          <span>Pátio: {orders.filter(o => o.status === 'received').length}</span>
          <span>•</span>
          <span>Fogo: {orders.filter(o => o.status === 'preparing').length}</span>
        </div>
        <div className="hidden sm:block">
          {format(new Date(), "eeee, d 'de' MMMM • HH:mm", { locale: ptBR })}
        </div>
      </footer>

      {/* Recipe Modal */}
      <AnimatePresence>
        {selectedItem && (() => {
          const itemRecipe = getRecipeForProduct(selectedItem.productName);
          if (!itemRecipe) return null;
          const { recipe, prepTime } = itemRecipe;
          return (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
              onClick={() => setSelectedItem(null)}
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className={cn(
                  "w-full max-w-lg rounded-3xl p-6 max-h-[80vh] overflow-y-auto shadow-2xl border",
                  isDark ? 'bg-[#1a1a1a] border-white/10' : 'bg-white border-gray-200'
                )}
                onClick={e => e.stopPropagation()}
              >
                <div className="flex items-start justify-between mb-5">
                  <div>
                    <h3 className="text-xl font-black uppercase tracking-tight">{selectedItem.productName}</h3>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-[10px] font-black text-[#FFC928] bg-[#FFC928]/10 px-2 py-0.5 rounded-full">
                        Qtd: {selectedItem.quantity}
                      </span>
                      {prepTime && (
                        <span className="text-[10px] font-black text-gray-400">
                          ⏱ ~{prepTime}min
                        </span>
                      )}
                    </div>
                  </div>
                  <button onClick={() => setSelectedItem(null)} className="p-2 rounded-xl hover:bg-white/10 transition-colors">
                    <X size={20} />
                  </button>
                </div>

                {recipe.ingredients.length > 0 && (
                  <div className="mb-5">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">Ingredientes</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {recipe.ingredients.map((ing, i) => (
                        <div key={i} className={cn("flex items-center justify-between p-2.5 rounded-xl text-sm", isDark ? 'bg-white/5' : 'bg-gray-50')}>
                          <span className="font-semibold">{ing.ingredientName || ing.ingredientId}</span>
                          <span className="font-black text-[#FFC928] text-xs">{ing.quantity}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {recipe.preparationMode && (
                  <div>
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">Modo de Preparo</h4>
                    <div className={cn("p-4 rounded-xl text-sm leading-relaxed whitespace-pre-wrap", isDark ? 'bg-white/5 text-gray-300' : 'bg-amber-50 text-gray-700')}>
                      {recipe.preparationMode}
                    </div>
                  </div>
                )}

                {selectedItem.observations && (
                  <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                    <p className="text-[10px] font-black text-red-500 uppercase mb-1">Observação do Cliente</p>
                    <p className="text-sm font-semibold text-red-400">{selectedItem.observations}</p>
                  </div>
                )}

                {!recipe.preparationMode && recipe.ingredients.length === 0 && (
                  <p className="text-center text-gray-400 text-sm py-4">Nenhuma ficha técnica cadastrada para este produto.</p>
                )}
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
}
