import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { ShoppingBag, Star, Clock, Truck, ChevronRight, Plus, Minus, X, Check, ArrowLeft, Globe, MessageCircle, Share2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useCart } from '../context/CartContext';
import { useRestaurant } from '../context/RestaurantContext';
import { Product, CartItem } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import OptimizedImage from '../components/OptimizedImage';
import LanguageSwitcher from '../components/LanguageSwitcher';
import ShareModal from '../components/ShareModal';
import SEO from '../components/SEO';
import { rankProducts } from '../lib/recommendations';
import { cn } from '../lib/utils';

export default function RestaurantMenuPage() {
  const { t } = useTranslation();
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const tableNumber = searchParams.get('mesa');
  const navigate = useNavigate();
  const { restaurants, products, categories, orders } = useRestaurant();
  const { addItem, itemCount, total, setTableNumber } = useCart();
  
  useEffect(() => {
    if (tableNumber) {
      setTableNumber(tableNumber);
    }
  }, [tableNumber, setTableNumber]);

  const restaurant = restaurants.find(r => r.slug === slug);
  
  const restaurantProducts = useMemo(() => {
    const unfiltered = products.filter(p => 
      p.restaurantId === restaurant?.id && (p.isActive !== false)
    ).sort((a, b) => (a.order || 0) - (b.order || 0));
    return unfiltered;
  }, [products, restaurant?.id]);

  const restaurantCategories = useMemo(() => {
    return categories
      .filter(c => c.restaurantId === restaurant?.id)
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [categories, restaurant?.id]);

  const [activeCategory, setActiveCategory] = useState(restaurantCategories[0]?.id || '');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [shareData, setShareData] = useState<{ isOpen: boolean; url: string; title: string }>({
    isOpen: false,
    url: '',
    title: ''
  });
  const categoryRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const handleShare = () => {
    const url = window.location.href;
    setShareData({
      isOpen: true,
      url,
      title: `Confira o cardápio de ${restaurant?.name} no MEU OVO!`
    });
  };

  const scrollToCategory = (catId: string) => {
    setActiveCategory(catId);
    categoryRefs.current[catId]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            setActiveCategory(entry.target.id.replace('cat-', ''));
          }
        });
      },
      { threshold: 0.3, rootMargin: '-100px 0px -60% 0px' }
    );
    Object.values(categoryRefs.current).forEach((el: any) => el && observer.observe(el));
    return () => observer.disconnect();
  }, [restaurantCategories]);

  if (!restaurant) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F5F5]">
        <div className="text-center">
          <div className="text-6xl mb-4">🍳</div>
          <h2 className="font-black text-2xl text-[#111] mb-2">{t('restaurant.notFound')}</h2>
          <button onClick={() => navigate('/busca')} className="bg-[#FFC928] text-[#111] font-bold px-6 py-3 rounded-full mt-4">
            {t('restaurant.goBack')}
          </button>
        </div>
      </div>
    );
  }

  const getCategoryProducts = (catId: string) => restaurantProducts.filter(p => p.categoryId === catId);

  return (
    <div className="min-h-screen bg-[#F5F5F5]">
      <SEO 
        title={`Cardápio Digital - ${restaurant.name}`}
        description={`Confira o cardápio completo de ${restaurant.name} em ${restaurant.neighborhood}. Peça delivery ou mesa sem taxas extras.`}
        restaurantName={restaurant.name}
        type="restaurant"
        image={restaurant.coverImage}
      />
      {/* Header */}
      <div className="relative h-48 md:h-64 overflow-hidden">
        <OptimizedImage 
          src={restaurant.coverImage} 
          alt={restaurant.name} 
          width={800} 
          height={400} 
          priority
          className="w-full h-full object-cover" 
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
        <div className="absolute top-4 left-4 flex gap-2">
          <button
            onClick={() => navigate(-1)}
            className="bg-white/20 backdrop-blur-sm text-white p-2 rounded-full hover:bg-white/40 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <button
            onClick={handleShare}
            className="bg-white/20 backdrop-blur-sm text-white p-2 rounded-full hover:bg-white/40 transition-colors"
          >
            <Share2 size={20} />
          </button>
          <LanguageSwitcher />
        </div>
        <div className="absolute bottom-4 left-4 right-4 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="flex items-end gap-4">
            <OptimizedImage 
              src={restaurant.logo} 
              alt={restaurant.name} 
              width={64} 
              height={64} 
              className="w-16 h-16 rounded-2xl object-cover border-2 border-white" 
            />
            <div className="flex-1">
              <h1 className="text-white font-display font-black text-2xl md:text-4xl leading-tight">{restaurant.name}</h1>
              <div className="flex items-center gap-2.5 text-gray-300 text-[9px] md:text-[10px] font-black uppercase tracking-widest mt-1">
                <span>{restaurant.cuisineType}</span>
                <div className="w-1 h-1 rounded-full bg-white/30" />
                <span>{restaurant.neighborhood}</span>
                <div className="w-1 h-1 rounded-full bg-white/30" />
                <span className={`font-black ${restaurant.isOpen ? 'text-green-400' : 'text-red-400'}`}>
                  {restaurant.isOpen ? t('restaurant.open') : t('restaurant.closed')}
                </span>
              </div>
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleShare}
            className="flex items-center gap-2 bg-white/20 backdrop-blur-md text-white border border-white/20 px-5 py-2.5 rounded-full font-black text-[10px] uppercase tracking-wider hover:bg-white/35 transition-all self-start sm:self-auto shadow-xl shadow-black/15 group"
          >
            <Share2 size={13} className="text-[#FFC928] group-hover:scale-110 transition-transform duration-300" />
            <span>Compartilhar</span>
          </motion.button>
        </div>
      </div>

      {/* Info bar */}
      <div className="bg-white border-b border-gray-100 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center gap-6 text-sm text-gray-600 overflow-x-auto">
          <div className="flex items-center gap-1 flex-shrink-0">
            <Star size={14} className="text-[#FFC928] fill-[#FFC928]" />
            <span className="font-bold text-[#111]">{restaurant.rating}</span>
            <span className="text-gray-400">({restaurant.reviewCount})</span>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <Clock size={14} className="text-gray-400" />
            <span>{restaurant.estimatedTime} min</span>
          </div>
          {restaurant.deliveryEnabled && (
            <div className="flex items-center gap-1 flex-shrink-0 border-r border-gray-100 pr-3 mr-1">
              <Truck size={14} className="text-gray-400" />
              <span>{restaurant.deliveryFee === 0 ? t('restaurant.free') : `R$ ${restaurant.deliveryFee.toFixed(2)}`}</span>
            </div>
          )}
          <a
            href={`https://wa.me/${restaurant.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(`Olá! Estou vendo seu cardápio no Meu Ovo e gostaria de tirar uma dúvida.`)}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 flex-shrink-0 bg-green-50 text-green-600 px-2 py-1 rounded-lg font-bold border border-green-100 hover:bg-green-100 transition-all ml-auto"
          >
            <MessageCircle size={14} />
            <span className="text-[10px] uppercase">Dúvidas? WhatsApp</span>
          </a>
          {restaurant.minimumOrder > 0 && (
            <span className="flex-shrink-0 text-gray-400">{t('restaurant.minOrder')} R$ {restaurant.minimumOrder.toFixed(2)}</span>
          )}
          {tableNumber && (
            <span className="bg-[#FFC928] text-[#111] font-bold px-3 py-1 rounded-full text-xs flex-shrink-0">
              {t('restaurant.table')} {tableNumber}
            </span>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4">
        {/* Category nav */}
        <div className="sticky top-20 z-10 bg-[#F5F5F5] pt-2 pb-3">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
            {restaurantCategories.map(cat => (
              <button
                key={cat.id}
                onClick={() => scrollToCategory(cat.id)}
                className={`px-4 py-2 rounded-full text-sm font-bold flex-shrink-0 transition-all ${activeCategory === cat.id ? 'bg-[#111111] text-white' : 'bg-white text-gray-600 hover:bg-gray-100'}`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Products by category */}
        <div className="pb-32">
          {restaurantCategories.map(cat => {
            const catProducts = getCategoryProducts(cat.id);
            if (!catProducts.length) return null;
            return (
              <motion.div
                key={cat.id}
                id={`cat-${cat.id}`}
                ref={el => { categoryRefs.current[cat.id] = el; }}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, margin: "-100px" }}
                variants={{
                  hidden: { opacity: 0 },
                  show: {
                    opacity: 1,
                    transition: {
                      staggerChildren: 0.1
                    }
                  }
                }}
                className="mb-8"
              >
                <h2 className="font-display font-black text-[#111] text-2xl mb-6 tracking-tight">{cat.name}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {catProducts.map(product => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      onSelect={() => setSelectedProduct(product)}
                    />
                  ))}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Floating cart button */}
      <AnimatePresence>
        {itemCount > 0 && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-6 left-4 right-4 z-20 max-w-lg mx-auto"
          >
            <motion.button
              key={itemCount}
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 0.2 }}
              onClick={() => navigate('/carrinho')}
              className="w-full bg-[#111111] text-white font-black py-4 px-6 rounded-2xl flex items-center justify-between shadow-2xl hover:bg-[#222] transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="bg-[#FFC928] text-[#111] font-black w-8 h-8 rounded-full flex items-center justify-center text-sm">
                  {itemCount}
                </span>
                <span>{t('restaurant.viewCart')}</span>
              </div>
              <span className="text-[#FFC928]">R$ {total.toFixed(2)}</span>
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Product modal */}
      {selectedProduct && (
        <ProductModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onAdd={(item) => {
            addItem(item);
            setSelectedProduct(null);
          }}
        />
      )}

      {/* Share Modal */}
      <ShareModal 
        isOpen={shareData.isOpen}
        onClose={() => setShareData(prev => ({ ...prev, isOpen: false }))}
        url={shareData.url}
        title={shareData.title}
      />
    </div>
  );
}

const ProductCard: React.FC<{ product: Product; onSelect: () => void }> = ({ product, onSelect }) => {
  return (
    <motion.button
      onClick={onSelect}
      disabled={product.isAvailable === false}
      variants={{
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0 }
      }}
      whileHover={{ 
        y: -4, 
        transition: { type: "spring", stiffness: 400, damping: 10 }
      }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        "w-full bg-white rounded-[2rem] p-5 flex gap-4 text-left transition-all relative overflow-hidden group/card",
        product.isAvailable === false ? 'opacity-50' : 'hover:shadow-2xl hover:shadow-black/5 hover:-translate-y-1'
      )}
    >
      <div className="flex-1 relative z-10">
        {product.bestSeller && (
          <div className="absolute top-0 right-0 z-20">
            <div className="bg-[#FFC928] text-[#111] text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-bl-2xl shadow-lg flex items-center gap-1.5">
              <Star size={10} className="fill-[#111]" />
              Mais pedido
            </div>
          </div>
        )}
        {product.onPromotion && (
          <div className="absolute top-0 left-0 z-20">
            <div className="bg-red-500 text-white text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-br-2xl shadow-lg shadow-red-500/20">
              Oferta
            </div>
          </div>
        )}
        <h3 className="font-display font-black text-[#111] text-lg leading-tight mb-1">{product.name}</h3>
        <p className="text-gray-500 text-sm line-clamp-2 leading-relaxed">{product.description}</p>
        {product.notes && (
          <p className="text-orange-600 text-[10px] font-bold mt-1 bg-orange-50 px-2 py-1 rounded-lg inline-block italic">
            {product.notes}
          </p>
        )}
        {product.estimatedPrepTime && (
          <div className="flex items-center gap-1 mt-1">
            <Clock size={10} className="text-gray-400" />
            <span className="text-[10px] text-gray-400 font-bold">{product.estimatedPrepTime} min</span>
          </div>
        )}
        <div className="flex items-center gap-3 mt-4">
          {product.onPromotion && product.promotionPrice ? (
            <>
              <span className="font-display font-black text-[#111] text-xl leading-none">R$ {product.promotionPrice.toFixed(2)}</span>
              <span className="text-gray-400 text-sm line-through decoration-red-500/20">R$ {product.price.toFixed(2)}</span>
            </>
          ) : (
            <span className="font-display font-black text-[#111] text-xl leading-none">R$ {product.price.toFixed(2)}</span>
          )}
        </div>
      </div>
      <div className="relative flex-shrink-0">
        <div className="w-28 h-28 md:w-32 md:h-32 rounded-3xl overflow-hidden border-2 border-slate-100 shadow-inner group-hover/card:border-[#FFC928]/50 transition-all duration-500 bg-slate-50">
          <OptimizedImage
            src={product.imageUrl}
            alt={product.name}
            width={128}
            height={128}
            className="w-full h-full object-cover group-hover/card:scale-110 transition-transform duration-700"
          />
        </div>
        {product.isAvailable !== false && (
          <motion.div 
            whileHover={{ scale: 1.1, rotate: 90 }}
            className="absolute -bottom-2 -right-2 bg-[#FFC928] rounded-2xl w-10 h-10 flex items-center justify-center shadow-xl shadow-[#FFC928]/20 border-4 border-white"
          >
            <Plus size={18} className="text-[#111]" strokeWidth={4} />
          </motion.div>
        )}
      </div>
    </motion.button>
  );
}

const ProductModal: React.FC<{
  product: Product;
  onClose: () => void;
  onAdd: (item: CartItem) => void;
}> = ({ product, onClose, onAdd }) => {
  const [quantity, setQuantity] = useState(1);
  const [observations, setObservations] = useState('');
  const [selectedAdditionals, setSelectedAdditionals] = useState<{ groupId: string; additionalId: string; name: string; price: number }[]>([]);

  const toggleAdditional = (groupId: string, additionalId: string, name: string, price: number, isSingle: boolean) => {
    setSelectedAdditionals(prev => {
      if (isSingle) {
        const without = prev.filter(a => a.groupId !== groupId);
        const existing = prev.find(a => a.groupId === groupId && a.additionalId === additionalId);
        return existing ? without : [...without, { groupId, additionalId, name, price }];
      }
      const existing = prev.find(a => a.additionalId === additionalId);
      return existing ? prev.filter(a => a.additionalId !== additionalId) : [...prev, { groupId, additionalId, name, price }];
    });
  };

  const additionalsTotal = selectedAdditionals.reduce((s, a) => s + a.price, 0);
  const basePrice = product.onPromotion && product.promotionPrice ? product.promotionPrice : product.price;
  const itemTotal = (basePrice + additionalsTotal) * quantity;

  const handleAdd = () => {
    onAdd({ product, quantity, selectedAdditionals, observations });
    toast.success(`${product.name} adicionado!`, {
      icon: '🍳',
      style: {
        borderRadius: '1rem',
        background: '#111',
        color: '#fff',
        fontWeight: 'bold',
        fontSize: '14px',
        border: '2px solid #FFC928'
      },
    });
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
          onClick={onClose} 
        />
        <motion.div 
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="relative bg-white rounded-t-3xl md:rounded-3xl w-full md:max-w-lg max-h-[90vh] overflow-y-auto"
        >
          <div className="relative h-64 overflow-hidden group/modal">
            <OptimizedImage 
              src={product.imageUrl} 
              alt={product.name} 
              width={512} 
              height={400} 
              className="w-full h-full object-cover transition-transform duration-1000 group-hover/modal:scale-110" 
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover/modal:opacity-100 transition-opacity duration-500" />
            <button
              onClick={onClose}
              className="absolute top-4 right-4 bg-white/80 backdrop-blur-sm p-2 rounded-full hover:bg-white transition-colors z-10"
            >
              <X size={20} />
            </button>
          </div>

        <div className="p-6">
          <div className="flex gap-2 mb-3">
            {product.bestSeller && (
              <span className="bg-[#FFC928] text-[#111] text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-lg flex items-center gap-1.5 shadow-sm shadow-[#FFC928]/20">
                <Star size={10} className="fill-[#111]" />
                Mais pedido
              </span>
            )}
            {product.onPromotion && (
              <span className="bg-red-500 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-lg shadow-sm shadow-red-500/20">
                Promoção
              </span>
            )}
          </div>
          <h2 className="font-black text-[#111] text-2xl mb-2">{product.name}</h2>
          <p className="text-gray-500 mb-2">{product.description}</p>
          {product.notes && (
            <div className="bg-orange-50 border border-orange-100 p-3 rounded-xl mb-4">
              <p className="text-orange-600 text-[11px] font-bold italic leading-relaxed">
                Nota: {product.notes}
              </p>
            </div>
          )}
          {product.estimatedPrepTime && (
            <div className="flex items-center gap-2 mb-4 bg-gray-50 px-3 py-2 rounded-xl border border-gray-100 w-fit">
              <Clock size={14} className="text-gray-400" />
              <span className="text-xs font-bold text-gray-500">Pronto em aprox. {product.estimatedPrepTime} minutos</span>
            </div>
          )}

          {product.onPromotion && product.promotionPrice ? (
            <div className="flex items-center gap-3 mb-6">
              <span className="font-black text-[#111] text-2xl">R$ {product.promotionPrice.toFixed(2)}</span>
              <span className="text-gray-400 text-sm line-through">R$ {product.price.toFixed(2)}</span>
            </div>
          ) : (
            <p className="font-black text-[#111] text-2xl mb-6">R$ {product.price.toFixed(2)}</p>
          )}

          {/* Additionals */}
          {(product.additionalGroups || product.optionGroups) && 
            (product.additionalGroups || product.optionGroups).map((group: any) => (
            <div key={group.id} className="mb-6">
              <div className="bg-[#F5F5F5] rounded-xl p-3 mb-3">
                <h3 className="font-bold text-[#111]">{group.name}</h3>
                <p className="text-xs text-gray-500">{group.type === 'single' || group.maxSelection === 1 ? 'Escolha 1 opção' : 'Escolha quantas quiser'}</p>
              </div>
              <div className="space-y-2">
                {(group.items || group.options).map((item: any) => {
                  const selected = selectedAdditionals.some(a => a.additionalId === item.id);
                  return (
                    <button
                      key={item.id}
                      onClick={() => toggleAdditional(group.id, item.id, item.name, item.price, group.type === 'single' || group.maxSelection === 1)}
                      className={`w-full flex items-center justify-between p-3 rounded-xl border-2 transition-all ${selected ? 'border-[#FFC928] bg-[#FFF8E1]' : 'border-gray-100 hover:border-gray-200'}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${selected ? 'bg-[#FFC928] border-[#FFC928]' : 'border-gray-300'}`}>
                          {selected && <Check size={12} className="text-[#111]" strokeWidth={3} />}
                        </div>
                        <span className="text-sm text-[#111]">{item.name}</span>
                      </div>
                      <span className="text-sm font-bold text-gray-500">
                        {item.price > 0 ? `+ R$ ${item.price.toFixed(2)}` : item.price < 0 ? `- R$ ${Math.abs(item.price).toFixed(2)}` : 'Grátis'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Ingredients & Allergens */}
          {(product.ingredients || product.allergens) && (
            <div className="mb-6 grid grid-cols-1 gap-3">
              {product.ingredients && (
                <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Ingredientes</p>
                  <p className="text-xs text-slate-600 leading-relaxed font-medium">{product.ingredients}</p>
                </div>
              )}
              {product.allergens && (
                <div className="bg-red-50 border border-red-100 p-3 rounded-xl">
                  <p className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-1">Alerta Alergênicos</p>
                  <p className="text-xs text-red-600 leading-relaxed font-bold italic">{product.allergens}</p>
                </div>
              )}
            </div>
          )}

          {/* Special Instructions */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <div>
                <label className="block font-black text-[#111] text-xs uppercase tracking-widest">Instruções Especiais</label>
                <p className="text-[10px] text-gray-400 font-bold mt-1 uppercase tracking-tighter">Algum comentário ou restrição alimentar?</p>
              </div>
              <span className="text-[9px] font-black text-slate-300 border border-slate-200 px-2 py-0.5 rounded-md uppercase tracking-widest">Opcional</span>
            </div>
            <textarea
              value={observations}
              onChange={e => setObservations(e.target.value)}
              placeholder="Ex: Alergia a amendoim, sem cebola, sem pimenta, ponto da carne..."
              className="w-full border-2 border-slate-100 rounded-3xl p-5 text-sm resize-none h-28 focus:outline-none focus:border-[#FFC928] focus:bg-white bg-slate-50/50 transition-all font-medium placeholder:text-slate-300 placeholder:italic"
            />
          </div>

          {/* Quantity + Add */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 bg-[#F5F5F5] rounded-xl p-1">
              <button
                onClick={() => setQuantity(q => Math.max(1, q - 1))}
                className="w-10 h-10 rounded-lg bg-white flex items-center justify-center hover:bg-gray-100 transition-colors shadow-sm active:scale-90"
              >
                <Minus size={16} />
              </button>
              <span className="font-black text-[#111] w-6 text-center">{quantity}</span>
              <button
                onClick={() => setQuantity(q => q + 1)}
                className="w-10 h-10 rounded-lg bg-white flex items-center justify-center hover:bg-gray-100 transition-colors shadow-sm active:scale-95"
              >
                <Plus size={16} />
              </button>
            </div>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleAdd}
              className="flex-1 bg-[#111111] text-white font-black py-4 rounded-xl hover:bg-[#222] transition-all flex items-center justify-between px-4 shadow-xl shadow-black/10 active:shadow-none"
            >
              <span>Adicionar</span>
              <span className="text-[#FFC928]">R$ {itemTotal.toFixed(2)}</span>
            </motion.button>
          </div>
        </div>
      </motion.div>
    </div>
  </AnimatePresence>
  );
}
