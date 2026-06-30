import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Minus, Plus, Trash2, ArrowLeft, ShoppingBag, Smartphone } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useRestaurant } from '../context/RestaurantContext';
import { useTheme } from '../context/ThemeContext';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { WA_NUMBER } from '../services/whatsappService';
import SEO from '../components/SEO';
import OptimizedImage from '../components/OptimizedImage';
import { toast } from 'react-hot-toast';

export default function CartPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { items, removeItem, updateQuantity, subtotal, itemCount } = useCart();
  const { restaurants } = useRestaurant();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Mock delivery fee for now
  const deliveryFee = 6.00;
  const deliveryMethod = 'delivery'; 

  const restaurantId = items[0]?.product.restaurantId;
  const restaurant = restaurants.find(r => r.id === restaurantId);

  const handleRemove = (index: number, name: string) => {
    removeItem(index);
    toast.success(`${name} ${t('cart.removedSuccess') || 'removido do carrinho!'}`, {
      icon: '🗑️',
    });
  };

  if (items.length === 0) {
    return (
      <div className={cn("min-h-screen flex items-center justify-center p-4", isDark ? 'bg-[#1a1a1a]' : 'bg-[#F5F5F5]')}>
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center p-8 bg-white dark:bg-[#111] rounded-3xl shadow-xl max-w-sm w-full"
        >
          <motion.div
            initial={{ y: -10 }}
            animate={{ y: [0, -10, 0] }}
            transition={{ repeat: Infinity, duration: 2 }}
          >
            <ShoppingBag size={64} className="text-gray-300 mx-auto mb-4" />
          </motion.div>
          <h2 className={cn("font-black text-2xl mb-2", isDark ? 'text-white' : 'text-[#111]')}>{t('cart.empty')}</h2>
          <p className="text-gray-500 mb-6">{t('cart.emptySubtitle')}</p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/busca')}
            className="bg-[#FFC928] text-[#111] font-black px-8 py-4 rounded-full shadow-lg shadow-yellow-200"
          >
            {t('cart.backToSearch')}
          </motion.button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className={cn("min-h-screen", isDark ? 'bg-[#1a1a1a]' : 'bg-[#F5F5F5]')}>
      <SEO title="Carrinho" description="Revise seu carrinho de compras no MEU OVO antes de finalizar o pedido." url="/carrinho" />
      <div className={cn("bg-white border-b border-gray-100 px-4 py-4 sticky top-0 z-10", isDark ? 'bg-[#111111] border-[#2a2a2a]' : '')}>
        <div className="max-w-2xl mx-auto flex items-center gap-4">
          <motion.button 
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => navigate(-1)} 
            className={cn("p-2 rounded-full transition-colors", isDark ? 'hover:bg-[#2a2a2a]' : 'hover:bg-gray-100')}
          >
            <ArrowLeft size={20} className={isDark ? 'text-white' : ''} />
          </motion.button>
          <div>
            <h1 className={cn("font-black text-xl leading-none", isDark ? 'text-white' : 'text-[#111]')}>{t('cart.title')}</h1>
            {restaurant && <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mt-1">{restaurant.name}</p>}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {/* Items */}
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className={cn("rounded-3xl p-6 shadow-sm overflow-hidden", isDark ? 'bg-[#111111]' : 'bg-white')}
        >
          <h2 className={cn("font-black text-sm uppercase tracking-widest mb-6", isDark ? 'text-white' : 'text-slate-400')}>{t('cart.items')} ({itemCount})</h2>
          <div className="space-y-6">
            <AnimatePresence mode="popLayout">
              {items.map((item, index) => {
                const additionalsTotal = item.selectedAdditionals.reduce((s, a) => s + a.price, 0);
                const basePrice = item.product.onPromotion && item.product.promotionPrice ? item.product.promotionPrice : item.product.price;
                const itemTotal = (basePrice + additionalsTotal) * item.quantity;

                return (
                  <motion.div 
                    key={`${item.product.id}-${index}`}
                    layout
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: 20, opacity: 0 }}
                    className="relative group pb-6 last:pb-0 border-b last:border-b-0 border-gray-50 dark:border-gray-800"
                  >
                    <div className="flex gap-4">
                      <div className="relative">
                        <OptimizedImage
                          src={item.product.imageUrl}
                          alt={item.product.name}
                          width={80}
                          height={80}
                          className="w-20 h-20 rounded-2xl object-cover flex-shrink-0 shadow-sm"
                        />
                        <span className="absolute -top-2 -right-2 bg-[#FFC928] text-[#111] font-black text-[10px] w-6 h-6 rounded-full flex items-center justify-center border-2 border-white dark:border-[#111]">
                          {item.quantity}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className={cn("font-black text-sm pr-6", isDark ? 'text-white' : 'text-[#111]')}>{item.product.name}</h3>
                            {item.selectedAdditionals.length > 0 && (
                              <div className="text-gray-400 text-[10px] mt-1 font-bold uppercase tracking-tight">
                                + {item.selectedAdditionals.map(a => a.name).join(', ')}
                              </div>
                            )}
                            {item.observations && (
                              <p className="text-gray-400 text-[10px] mt-1 italic leading-tight">"{item.observations}"</p>
                            )}
                          </div>
                          <button
                            onClick={() => handleRemove(index, item.product.name)}
                            aria-label={`Remover ${item.product.name}`}
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition-all"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>

                        <div className="flex items-center justify-between mt-3">
                          <div className={cn("flex items-center gap-1 rounded-2xl p-1 bg-slate-100/80 dark:bg-white/5 backdrop-blur-sm shadow-inner", isDark ? '' : '')}>
                            <motion.button
                              whileHover={{ scale: 1.1, backgroundColor: isDark ? '#333' : '#fff' }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => updateQuantity(index, Math.max(0, item.quantity - 1))}
                              className={cn(
                                "w-10 h-10 rounded-xl flex items-center justify-center transition-all shadow-sm border border-transparent",
                                isDark ? "bg-[#2a2a2a] text-white hover:border-white/10" : "bg-white text-[#111] hover:border-gray-200"
                              )}
                            >
                              {item.quantity === 1 ? <Trash2 size={14} className="text-red-500" /> : <Minus size={14} />}
                            </motion.button>
                            
                            <motion.span 
                              key={item.quantity}
                              initial={{ scale: 0.8, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              className={cn("font-black w-8 text-center text-sm", isDark ? 'text-white' : 'text-[#111]')}
                            >
                              {item.quantity}
                            </motion.span>
                            
                            <motion.button
                              whileHover={{ scale: 1.1, backgroundColor: isDark ? '#333' : '#fff' }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => updateQuantity(index, item.quantity + 1)}
                              className={cn(
                                "w-10 h-10 rounded-xl flex items-center justify-center transition-all shadow-sm border border-transparent",
                                isDark ? "bg-[#2a2a2a] text-white hover:border-white/10" : "bg-white text-[#111] hover:border-gray-200"
                              )}
                            >
                              <Plus size={14} />
                            </motion.button>
                          </div>
                          <span className={cn("font-black text-sm", isDark ? 'text-white' : 'text-[#111]')}>R$ {itemTotal.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Summary */}
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className={cn("rounded-3xl p-6 shadow-sm", isDark ? 'bg-[#111111]' : 'bg-white')}
        >
          <h2 className={cn("font-black text-sm uppercase tracking-widest mb-4", isDark ? 'text-white' : 'text-slate-400')}>{t('cart.summary')}</h2>
          <div className="space-y-3">
            <div className={cn("flex justify-between text-xs font-bold uppercase tracking-widest", isDark ? 'text-gray-500' : 'text-gray-400')}>
              <span>{t('cart.subtotal')}</span>
              <span className="text-slate-800 dark:text-slate-200">R$ {subtotal.toFixed(2)}</span>
            </div>
            <div className={cn("flex justify-between text-xs font-bold uppercase tracking-widest", isDark ? 'text-gray-500' : 'text-gray-400')}>
              <span>{t('cart.serviceFee')}</span>
              <span className="text-green-600 font-black">{t('cart.free')}</span>
            </div>
          </div>
          <div className={cn("border-t mt-6 pt-6 flex justify-between items-end", isDark ? 'border-[#2a2a2a]' : 'border-gray-50')}>
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{t('cart.subtotal')}</span>
              <span className="font-display font-black text-3xl leading-none text-[#FFC928]">R$ {subtotal.toFixed(2)}</span>
              <span className="text-[10px] text-gray-400 mt-1">+ frete calculado no checkout</span>
            </div>
            {restaurant && (
              <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest italic text-right px-2 py-1 bg-slate-50 dark:bg-white/5 rounded-lg">
                {t('cart.soldBy')} {restaurant.name}
              </p>
            )}
          </div>
        </motion.div>

        <div className="space-y-3">
          <motion.button
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/checkout')}
            className="w-full font-black py-6 rounded-3xl text-lg flex items-center justify-between px-8 transition-all bg-[#111] text-white hover:bg-black shadow-2xl shadow-black/10 group"
          >
            <div className="flex items-center gap-3">
              <ShoppingBag size={24} className="text-[#FFC928] group-hover:-rotate-12 transition-transform" />
              <span>{t('cart.checkout')}</span>
            </div>
            <span className="text-[#FFC928]">R$ {subtotal.toFixed(2)}</span>
          </motion.button>

          <motion.button
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              if (!restaurant) return;
              const itemsText = items.map(item => `${item.quantity}x ${item.product.name} - R$ ${((item.product.onPromotion && item.product.promotionPrice ? item.product.promotionPrice : item.product.price) * item.quantity).toFixed(2)}`).join('\n');
              const msg = `*MEU OVO 🥚 - NOVO PEDIDO (INICIAL)*\n\n` +
                          `Olá! Gostaria de fazer um pedido:\n\n` +
                          `*ITENS:*\n${itemsText}\n\n` +
                          `*SUBTOTAL: R$ ${subtotal.toFixed(2)}*\n\n` +
                          `Gostaria de combinar a entrega/retirada por aqui!`;
              const url = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(msg)}`;
              window.open(url, '_blank');
            }}
            className="w-full font-black py-4 rounded-2xl text-xs flex items-center justify-center gap-3 transition-all bg-[#25D366] text-white hover:opacity-90 shadow-lg shadow-green-200 uppercase tracking-widest"
          >
            <Smartphone size={18} />
            <span>{t('cart.directWhatsApp')}</span>
          </motion.button>
        </div>
      </div>
    </div>
  );
}
