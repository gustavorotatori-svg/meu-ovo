import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, doc, onSnapshot, orderBy, limit, addDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { Restaurant, Category, Product, OrderItem, Coupon, LoyaltyProfile, Additional } from '../types';
import { Logo } from '../components/Logo';
import { WA_NUMBER } from '../services/whatsappService';
import { 
  ShoppingBag, 
  ChevronRight, 
  Plus, 
  Minus, 
  Info, 
  Clock, 
  Truck, 
  MapPin, 
  X,
  CreditCard,
  Banknote,
  Search,
  ShoppingCart,
  Smartphone,
  ChefHat,
  Gift,
  History,
  Star,
  Heart,
  MessageCircle,
  Ticket,
  Trash2
} from 'lucide-react';
import { cn, formatCurrency } from '../lib/utils';
import { Button } from '../components/Button';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'motion/react';
import { Skeleton } from '../components/Skeleton';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
  }
}

interface SelectedOption {
  groupId: string;
  groupName: string;
  optionId: string;
  optionName: string;
  price: number;
}

interface RewardRule {
  id: string;
  type: 'discount_percent' | 'free_product';
  value: string | number;
  pointsRequired: number;
  description: string;
}

interface CustomizerGroup {
  id: string;
  name: string;
  type: string;
  minSelection?: number;
  maxSelection?: number;
  options?: Additional[];
  items?: Additional[];
}

export default function MenuDisplay() {
  const { slug } = useParams();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [donationAmount, setDonationAmount] = useState<number>(0);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isLoyaltyOpen, setIsLoyaltyOpen] = useState(false);
  const [loyaltyProfile, setLoyaltyProfile] = useState<LoyaltyProfile | null>(null);
  const [isIdentifying, setIsIdentifying] = useState(false);
  const [customizingProduct, setCustomizingProduct] = useState<Product | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<SelectedOption[]>([]);
  const [menuSearch, setMenuSearch] = useState('');

  const handleFirestoreError = (error: unknown, operationType: OperationType, path: string | null) => {
    const errInfo: FirestoreErrorInfo = {
      error: error instanceof Error ? error.message : String(error),
      authInfo: {
        userId: null,
        email: null,
        emailVerified: null,
      },
      operationType,
      path
    };
    console.error('Firestore Error: ', JSON.stringify(errInfo));
    throw new Error(JSON.stringify(errInfo));
  };

  // Form state
  const [orderType, setOrderType] = useState<'delivery' | 'table'>('delivery');
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    neighborhood: '',
    tableNumber: '',
    paymentMethod: 'pix'
  });

  const fetchLoyaltyProfile = async (phone: string) => {
    if (!restaurant || !phone) return;
    try {
      const q = query(
        collection(db, 'loyalty_profiles'), 
        where('restaurantId', '==', restaurant.id),
        where('customerPhone', '==', phone)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        setLoyaltyProfile({ id: snap.docs[0].id, ...snap.docs[0].data() });
      } else {
        setLoyaltyProfile(null);
      }
    } catch (e) {
      console.error('Error fetching loyalty profile:', e);
    }
  };

  // Redemption state
  const [appliedReward, setAppliedReward] = useState<RewardRule | null>(null);

  // Coupon state
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);

  const applyCoupon = async () => {
    if (!couponCode) return;
    if (!restaurant) return;
    
    try {
      const q = query(
        collection(db, 'coupons'),
        where('restaurantId', '==', restaurant.id),
        where('code', '==', couponCode.toUpperCase().trim()),
        where('isActive', '==', true)
      );
      
      const snap = await getDocs(q);
      if (snap.empty) {
        toast.error('Cupom inválido');
        return;
      }

      const coupon = { id: snap.docs[0].id, ...snap.docs[0].data() } as Coupon;
      
      // Check expiry
      if (new Date(coupon.expiryDate) < new Date()) {
        toast.error('Cupom expirado');
        return;
      }

      // Check usage limit
      if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
        toast.error('Cupom esgotado');
        return;
      }

      // Check minimum order
      if (cartTotal < coupon.minOrderValue) {
        toast.error(`Pedido mínimo para este cupom: ${formatCurrency(coupon.minOrderValue)}`);
        return;
      }

      setAppliedCoupon(coupon);
      toast.success('Cupom aplicado!');
      setCouponCode('');
    } catch (e) {
      toast.error('Erro ao aplicar cupom');
    }
  };

  useEffect(() => {
    if (formData.phone.length >= 10) {
      const timer = setTimeout(() => fetchLoyaltyProfile(formData.phone), 1000);
      return () => clearTimeout(timer);
    }
  }, [formData.phone]);

  useEffect(() => {
    if (!slug) return;

    // Fetch restaurant by slug
    const fetchRestaurant = async () => {
      const q = query(collection(db, 'restaurants'), where('slug', '==', slug), limit(1));
      const snap = await getDocs(q);
      if (snap.empty) {
        setLoading(false);
        return;
      }
      const data = { id: snap.docs[0].id, ...snap.docs[0].data() } as Restaurant;
      setRestaurant(data);

      // Set default order type based on enabled services
      if (!data.deliveryEnabled && data.dineInEnabled) {
        setOrderType('table');
      } else if (data.deliveryEnabled) {
        setOrderType('delivery');
      }

      // Fetch Categories
      const qCat = query(collection(db, 'categories'), where('restaurantId', '==', data.id), orderBy('order', 'asc'));
      const catSnap = await getDocs(qCat);
      const cats = catSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));
      setCategories(cats);
      if (cats.length > 0) setSelectedCategory(cats[0].id);

      // Fetch Products
      const qProd = query(collection(db, 'products'), where('restaurantId', '==', data.id), where('isActive', '==', true));
      const prodSnap = await getDocs(qProd);
      setProducts(prodSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)));
      
      setLoading(false);
    };

    fetchRestaurant();
  }, [slug]);

  const addToCart = (product: Product, options: SelectedOption[] = []) => {
    // If product has options and no options provided, open customizer
    const productGroups = product.optionGroups || product.additionalGroups;
    if (productGroups && productGroups.length > 0 && options.length === 0) {
      setCustomizingProduct(product);
      setSelectedOptions([]);
      return;
    }

    const baseProdPrice = product.onPromotion && product.promotionPrice ? product.promotionPrice : product.price;
    const optionsPrice = options.reduce((acc, opt) => acc + opt.price, 0);
    const itemTotalPrice = baseProdPrice + optionsPrice;
    
    // For products with options, every unique combination is a different line item
    const optionsKey = options.sort((a, b) => a.optionId.localeCompare(b.optionId)).map(o => o.optionId).join('-');
    const cartItemId = options.length > 0 ? `${product.id}-${optionsKey}` : product.id;

    setCart(prev => {
      const existing = prev.find(item => {
        const itemOptionsKey = (item.selectedOptions || [])
          .sort((a, b) => a.optionId.localeCompare(b.optionId))
          .map(o => o.optionId).join('-');
        
        return item.productId === product.id && itemOptionsKey === optionsKey;
      });

      if (existing) {
        return prev.map(item => {
          const itemOptionsKey = (item.selectedOptions || [])
            .sort((a, b) => a.optionId.localeCompare(b.optionId))
            .map(o => o.optionId).join('-');

          return (item.productId === product.id && itemOptionsKey === optionsKey)
            ? { ...item, quantity: item.quantity + 1 } 
            : item;
        });
      }

      return [...prev, { 
        productId: product.id, 
        name: product.name, 
        price: itemTotalPrice, 
        basePrice: baseProdPrice,
        quantity: 1,
        selectedOptions: options.length > 0 ? options : undefined
      }];
    });
    
    setCustomizingProduct(null);
    setSelectedOptions([]);
    toast.success(`${product.name} adicionado!`, { icon: '🛒', position: 'bottom-center' });
  };

  const removeFromCart = (index: number) => {
    setCart(prev => {
      const newCart = [...prev];
      if (newCart[index].quantity > 1) {
        newCart[index] = { ...newCart[index], quantity: newCart[index].quantity - 1 };
        return newCart;
      }
      return prev.filter((_, i) => i !== index);
    });
  };

  const cartTotal = cart.reduce((acc, curr) => acc + (curr.price * curr.quantity), 0);
  
  // Re-validate coupon if cart total changes
  useEffect(() => {
    if (appliedCoupon && cartTotal < appliedCoupon.minOrderValue) {
      setAppliedCoupon(null);
      toast.error('Pedido mínimo do cupom não atingido. Cupom removido.');
    }
  }, [cartTotal, appliedCoupon]);
  
  // Calculate reward discount
  let rewardDiscount = 0;
  if (appliedReward) {
    if (appliedReward.type === 'discount_percent') {
      rewardDiscount = (cartTotal * appliedReward.value) / 100;
    }
    if (appliedReward.type === 'free_product') {
       const product = products.find(p => p.id === appliedReward.value);
       if (product) rewardDiscount = product.price;
    }
  }

  // Calculate coupon discount
  let couponDiscount = 0;
  if (appliedCoupon) {
    if (appliedCoupon.type === 'percent') {
      couponDiscount = (cartTotal * appliedCoupon.value) / 100;
    } else {
      couponDiscount = appliedCoupon.value;
    }
  }

  const deliveryFee = orderType === 'delivery' 
    ? (restaurant?.deliverySettings?.feeByNeighborhood?.find(n => n.neighborhood === formData.neighborhood)?.fee ?? (restaurant?.deliverySettings?.fee || 0))
    : 0;

  const finalTotal = Math.max(0, cartTotal - rewardDiscount - couponDiscount) + deliveryFee + donationAmount;

  const handleCheckout = async () => {
    if (!formData.name || !formData.phone || (orderType === 'delivery' && (!formData.address || (restaurant?.deliverySettings?.feeByNeighborhood?.length ? !formData.neighborhood : false))) || (orderType === 'table' && !formData.tableNumber)) {
      toast.error('Preencha as informações obrigatórias');
      return;
    }

    try {
      const orderData = {
        restaurantId: restaurant?.id,
        type: orderType,
        customerName: formData.name,
        customerPhone: formData.phone,
        address: orderType === 'delivery' ? formData.address : null,
        neighborhood: orderType === 'delivery' ? formData.neighborhood : null,
        tableNumber: orderType === 'table' ? formData.tableNumber : null,
        items: cart,
        total: finalTotal,
        deliveryFee,
        rewardDiscount,
        couponDiscount,
        discountAmount: rewardDiscount + couponDiscount, // for backward compatibility
        donationAmount,
        status: 'received',
        paymentMethod: formData.paymentMethod,
        appliedReward: appliedReward ? { id: appliedReward.id, pointsRequired: appliedReward.pointsRequired } : null,
        appliedCoupon: appliedCoupon ? { id: appliedCoupon.id, code: appliedCoupon.code, discount: couponDiscount } : null,
        createdAt: new Date().toISOString(),
      };

      const docRef = await addDoc(collection(db, 'orders'), orderData).catch(e => handleFirestoreError(e, OperationType.CREATE, 'orders'));

      // If coupon used, increment usage count
      if (appliedCoupon) {
        await updateDoc(doc(db, 'coupons', appliedCoupon.id), {
          usageCount: (appliedCoupon.usageCount || 0) + 1
        });
      }

      // Loyalty Point Redemption (handled here, accumulation moved to AdminOrders)
      if (restaurant?.loyaltySettings?.enabled && (appliedReward || loyaltyProfile)) {
        const ptsRef = collection(db, 'loyalty_profiles');
        
        if (loyaltyProfile) {
          // Update existing profile (only redemption here)
          if (appliedReward) {
            const newPoints = loyaltyProfile.pointsBalance - appliedReward.pointsRequired;
            await updateDoc(doc(db, 'loyalty_profiles', loyaltyProfile.id), {
              pointsBalance: newPoints,
              customerName: formData.name,
              history: arrayUnion({ 
                type: 'redeem', 
                points: appliedReward.pointsRequired, 
                description: `Resgate: ${appliedReward.description}`, 
                orderId: docRef.id, 
                createdAt: new Date().toISOString() 
              })
            }).catch(e => handleFirestoreError(e, OperationType.UPDATE, `loyalty_profiles/${loyaltyProfile.id}`));
          } else {
            // Just update name if needed
            await updateDoc(doc(db, 'loyalty_profiles', loyaltyProfile.id), {
              customerName: formData.name
            });
          }
        } else if (!loyaltyProfile) {
          // Create empty profile just to have it ready for points accumulation later
          // if it doesn't exist yet (by phone)
          const q = query(ptsRef, where('restaurantId', '==', restaurant.id), where('customerPhone', '==', formData.phone));
          const snapshot = await getDocs(q);
          if (snapshot.empty) {
            await addDoc(ptsRef, {
              restaurantId: restaurant.id,
              customerPhone: formData.phone,
              customerName: formData.name,
              pointsBalance: 0,
              history: []
            });
          }
        }
      }

      toast.success('Pedido enviado com sucesso!');
      
      // Build WhatsApp Message
      const message = `Pedido pelo Meu Ovo 🥚\n\nCliente: ${formData.name}\nTipo: ${orderType === 'delivery' ? 'Delivery' : 'Mesa ' + formData.tableNumber}\n${orderType === 'delivery' ? 'Endereço: ' + formData.address + (formData.neighborhood ? ' - ' + formData.neighborhood : '') + '\n' : ''}Pagamento: ${formData.paymentMethod.toUpperCase()}\n\nItens:\n${cart.map(i => {
        const itemOptions = i.selectedOptions && i.selectedOptions.length > 0 
          ? `\n   - ${i.selectedOptions.map(o => o.optionName).join(', ')}` 
          : '';
        return `${i.quantity}x ${i.name} - ${formatCurrency(i.price * i.quantity)}${itemOptions}`;
      }).join('\n')}\n\nSubtotal: ${formatCurrency(cartTotal)}\n${orderType === 'delivery' ? 'Entrega: ' + formatCurrency(deliveryFee) + '\n' : ''}${donationAmount > 0 ? 'Doação social: ' + formatCurrency(donationAmount) + '\n' : ''}Total: ${formatCurrency(finalTotal)}`;
      
      const encodedMsg = encodeURIComponent(message);
      const whatsappUrl = `https://api.whatsapp.com/send?phone=${WA_NUMBER}&text=${encodedMsg}`;
      
      setCart([]);
      setIsCartOpen(false);
      setIsCheckoutOpen(false);
      
      // Delay to show toast before redirect
      setTimeout(() => {
        window.open(whatsappUrl, '_blank');
        window.location.href = `/m/${slug}/order/${docRef.id}`;
      }, 1500);
    } catch (e) {
      toast.error('Erro ao enviar pedido');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 pb-32">
        <div className="bg-slate-900 pt-8 pb-32 px-6 relative overflow-hidden">
          <div className="max-w-2xl mx-auto flex flex-col items-center text-center space-y-4">
            <Skeleton className="w-20 h-20 rounded-2xl bg-slate-800" />
            <Skeleton className="w-48 h-8 bg-slate-800" />
            <div className="flex gap-4">
              <Skeleton className="w-24 h-6 rounded-full bg-slate-800" />
              <Skeleton className="w-32 h-6 rounded-full bg-slate-800" />
            </div>
          </div>
        </div>
        <div className="max-w-2xl mx-auto px-4 -mt-20 relative z-20 space-y-8">
          <div className="bg-white rounded-xl shadow-xl shadow-slate-200/50 p-2 flex gap-2 overflow-x-hidden">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="w-24 h-8 rounded-lg shrink-0" />
            ))}
          </div>
          <div className="space-y-10">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="space-y-4">
                 <div className="flex items-center gap-3">
                   <div className="h-px bg-slate-200 flex-1" />
                   <Skeleton className="w-32 h-4" />
                   <div className="h-px bg-slate-200 flex-1" />
                 </div>
                 <div className="grid gap-3">
                    {[...Array(2)].map((_, j) => (
                      <div key={j} className="bg-white rounded-xl p-4 border border-slate-100 flex gap-4">
                        <div className="flex-1 space-y-2">
                           <Skeleton className="w-3/4 h-4" />
                           <Skeleton className="w-full h-3" />
                           <Skeleton className="w-1/2 h-3" />
                           <div className="pt-2 flex justify-between">
                              <Skeleton className="w-16 h-4" />
                              <Skeleton className="w-8 h-8 rounded-lg" />
                           </div>
                        </div>
                        <Skeleton className="w-24 h-24 rounded-lg shrink-0" />
                      </div>
                    ))}
                 </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center">
        <h1 className="text-2xl font-bold text-zinc-900 mb-2">Restaurante não encontrado</h1>
        <p className="text-zinc-500">O link que você acessou pode estar incorreto ou o cardápio está temporariamente desativado.</p>
        <Button className="mt-4" onClick={() => window.location.href = '/'}>Voltar ao Início</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-32">
      {/* Dynamic Header */}
      <div className="bg-slate-900 pt-8 pb-32 px-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500 rounded-full blur-[100px] opacity-20 translate-x-1/2 -translate-y-1/2" />
        
        {/* Header Actions */}
        <div className="absolute top-6 right-6 z-30 flex items-center gap-2">
          {restaurant.loyaltySettings?.enabled && (
            <button 
              onClick={() => setIsLoyaltyOpen(true)}
              className="bg-white/10 backdrop-blur-md border border-white/20 p-2.5 rounded-xl text-white hover:bg-white/20 transition-all flex items-center gap-2"
            >
              <Gift size={20} className="text-orange-500" />
              <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">PONTOS</span>
            </button>
          )}
          <a 
            href={`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent('Olá! Gostaria de fazer um novo pedido.')}`}
            target="_blank"
            rel="noreferrer"
            className="bg-white/10 backdrop-blur-md border border-white/20 p-2.5 rounded-xl text-white hover:bg-white/20 transition-all flex items-center gap-2"
          >
            <Smartphone size={20} className="text-[#FFC928]" />
            <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline text-white">PEDIR VIA WHATSAPP</span>
          </a>
          <a 
            href={`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent('Olá! Gostaria de falar com o restaurante.')}`}
            target="_blank"
            rel="noreferrer"
            className="bg-white/10 backdrop-blur-md border border-white/20 p-2.5 rounded-xl text-white hover:bg-white/20 transition-all flex items-center gap-2"
          >
            <MessageCircle size={20} className="text-[#25D366]" />
            <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline text-white">SUPORTE</span>
          </a>
        </div>

        <div className="relative z-10 max-w-2xl mx-auto flex flex-col items-center text-center">
           <Logo size="xl" variant="white" className="mb-6 drop-shadow-2xl" />
           <h1 className="text-2xl font-black text-white uppercase tracking-tight mb-2 italic">{restaurant.name}</h1>
           <div className="flex flex-wrap justify-center gap-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              <div className="flex items-center gap-1.5 bg-white/5 px-3 py-1.5 rounded-full border border-white/10">
                <Clock size={12} className="text-orange-500" />
                <span>30-45 min</span>
              </div>
              <div className="flex items-center gap-1.5 bg-white/5 px-3 py-1.5 rounded-full border border-white/10">
                <Truck size={12} className="text-orange-500" />
                <span>Envio R$ {restaurant.deliverySettings?.fee.toFixed(2)}</span>
              </div>
           </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-2xl mx-auto px-4 -mt-20 relative z-20 space-y-8">
        {/* Loyalty Program Banner */}
        {restaurant.loyaltySettings?.enabled && (
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-2xl p-6 text-white shadow-xl shadow-orange-200/50 relative overflow-hidden group cursor-pointer"
            onClick={() => setIsLoyaltyOpen(true)}
          >
            <div className="relative z-10 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-100">Fidelidade Meu Ovo</p>
                <h3 className="text-xl font-black italic uppercase tracking-tighter leading-tight">Clube de Vantagens</h3>
                <p className="text-[10px] font-bold text-orange-100 uppercase tracking-widest mt-1">
                  {restaurant.loyaltySettings?.accumulationType === 'order'
                    ? `Ganhe ${restaurant.loyaltySettings?.pointsPerOrder} pontos por pedido`
                    : `Ganhe ${restaurant.loyaltySettings?.pointsPerReal} ponto por cada R$ 1,00`}
                </p>
                {loyaltyProfile && (
                  <div className="mt-3 inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full border border-white/20">
                    <Star size={12} className="fill-current" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Saldo: {loyaltyProfile.pointsBalance} pts</span>
                  </div>
                )}
              </div>
              <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center rotate-6 group-hover:rotate-0 transition-transform">
                <Gift className="text-white h-8 w-8" />
              </div>
            </div>
            <Gift className="absolute -right-8 -bottom-8 text-white/10 rotate-12 group-hover:rotate-0 transition-transform duration-700" size={140} />
          </motion.div>
        )}

        {/* Category Navigation */}
        <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-lg shadow-slate-100/50 p-2.5 border border-slate-100 flex gap-2 overflow-x-auto no-scrollbar sticky top-2 z-40 transition-all">
           {categories.map((cat) => (
             <button
               key={cat.id}
               onClick={() => setSelectedCategory(cat.id)}
               className={cn(
                 "px-4 py-2 rounded-lg whitespace-nowrap text-[10px] font-black uppercase tracking-widest transition-all duration-200",
                 selectedCategory === cat.id 
                  ? "bg-slate-900 text-white shadow-lg shadow-slate-300" 
                  : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
               )}
             >
               {cat.name}
             </button>
           ))}
        </div>

        {/* Search within menu */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            value={menuSearch}
            onChange={e => setMenuSearch(e.target.value)}
            placeholder="Buscar no cardápio..."
            className="w-full h-12 pl-12 pr-4 rounded-2xl bg-white border border-slate-200 text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-brand-egg/30 focus:border-brand-egg transition-all placeholder:text-slate-300"
          />
          {menuSearch && (
            <button
              onClick={() => setMenuSearch('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              aria-label="Limpar busca"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Product List */}
        {(() => {
          if (menuSearch) {
            const searchResults = products.filter(p =>
              p.name.toLowerCase().includes(menuSearch.toLowerCase()) ||
              (p.description || '').toLowerCase().includes(menuSearch.toLowerCase())
            );
            if (searchResults.length === 0) {
              return (
                <div className="text-center py-16">
                  <Search size={40} className="mx-auto text-slate-300 mb-4" />
                  <p className="font-black text-slate-400 text-sm uppercase tracking-widest">Nenhum produto encontrado</p>
                  <p className="text-xs text-slate-300 mt-1">Tente buscar por outro termo</p>
                </div>
              );
            }
            return (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-px bg-slate-200 flex-1" />
                  <h2 className="text-xs font-black text-slate-800 uppercase tracking-[0.2em]">Resultados ({searchResults.length})</h2>
                  <div className="h-px bg-slate-200 flex-1" />
                </div>
                <div className="grid gap-3">
                  {searchResults.map(product => (
                    <div 
                      key={product.id} 
                      onClick={() => { setSelectedOptions([]); setCustomizingProduct(product); }}
                      className="bg-white rounded-xl p-3 border border-slate-100 flex gap-4 hover:border-slate-200 transition-all group hover:shadow-md cursor-pointer text-left"
                    >
                      <div className="flex-1 space-y-1">
                        <h3 className="font-extrabold text-slate-900 text-sm tracking-tight">{product.name}</h3>
                        {product.description && <p className="text-[11px] text-slate-500 leading-relaxed">{product.description}</p>}
                        {product.estimatedPrepTime && (
                          <p className="text-[10px] text-slate-400 font-bold flex items-center gap-1"><Clock size={12} /> {product.estimatedPrepTime} min</p>
                        )}
                        <div className="flex items-center justify-between mt-2">
                          <span className="font-black text-slate-900 text-sm">
                            {product.onPromotion && product.promotionPrice && product.price > product.promotionPrice ? (
                              <>{formatCurrency(product.promotionPrice)} <span className="line-through text-slate-300 text-[10px]">{formatCurrency(product.price)}</span></>
                            ) : formatCurrency(product.price)}
                          </span>
                          <span className="text-[10px] font-black text-brand-egg uppercase tracking-widest">Adicionar +</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          }
          return null;
        })()}

        {!menuSearch && (
        <div className="space-y-10">
          {categories.map(category => {
            const catProducts = products.filter(p => p.categoryId === category.id);
            if (catProducts.length === 0) return null;

            return (
              <div key={category.id} className="space-y-4">
                <div className="flex items-center gap-3">
                   <div className="h-px bg-slate-200 flex-1" />
                   <h2 className="text-xs font-black text-slate-800 uppercase tracking-[0.2em]">{category.name}</h2>
                   <div className="h-px bg-slate-200 flex-1" />
                </div>
                
                <div className="grid gap-3">
                  {catProducts.map(product => (
                    <div 
                      key={product.id} 
                      onClick={() => {
                        setSelectedOptions([]);
                        setCustomizingProduct(product);
                      }}
                      className="bg-white rounded-xl p-3 border border-slate-100 flex gap-4 hover:border-slate-200 transition-all group hover:shadow-md cursor-pointer text-left"
                    >
                      <div className="flex-1 space-y-1">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-extrabold text-slate-900 text-sm tracking-tight">{product.name}</h3>
                          {product.onPromotion && product.promotionPrice && product.price > product.promotionPrice && (
                            <span className="bg-red-50 text-red-600 border border-red-100 px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider shrink-0 shadow-sm flex items-center gap-1">
                              <span className="w-1 h-1 bg-red-500 rounded-full animate-pulse" />
                              {Math.round(((product.price - product.promotionPrice) / product.price) * 100)}% OFF
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 font-medium leading-relaxed line-clamp-2">{product.description}</p>
                        {product.notes && (
                          <div className="flex items-start gap-1.5 mt-1">
                             <div className="bg-orange-500/10 text-orange-600 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter shrink-0 border border-orange-500/10 flex items-center gap-1">
                                <Info size={8} /> OBS
                             </div>
                             <p className="text-[9px] font-bold text-slate-500 leading-tight italic">{product.notes}</p>
                          </div>
                        )}
                        {product.ingredients && (
                          <div className="flex items-start gap-1.5 mt-1">
                             <div className="bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter shrink-0 border border-slate-200">
                                COMPOSIÇÃO
                             </div>
                             <p className="text-[9px] font-medium text-slate-500 leading-tight">{product.ingredients}</p>
                          </div>
                        )}
                        {product.allergens && (
                          <div className="flex items-start gap-1.5 mt-1">
                             <div className="bg-red-50 text-red-600 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter shrink-0 border border-red-100 italic flex items-center gap-1">
                                <X size={8} /> ALERGÊNICOS
                             </div>
                             <p className="text-[9px] font-bold text-red-600/70 leading-tight uppercase tracking-tighter italic">{product.allergens}</p>
                          </div>
                        )}
                        {product.estimatedPrepTime && (
                          <div className="flex items-center gap-1 mt-1">
                             <Clock size={10} className="text-slate-400 shrink-0" />
                             <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{product.estimatedPrepTime} min</p>
                          </div>
                        )}
                        <div className="pt-2 flex items-center justify-between">
                           <div className="flex items-center gap-2">
                             {product.onPromotion && product.promotionPrice ? (
                               <>
                                 <span className="font-black text-orange-600 text-sm tracking-tight">
                                   {formatCurrency(product.promotionPrice)}
                                 </span>
                                 <span className="text-slate-400 text-[10px] line-through font-normal">
                                   {formatCurrency(product.price)}
                                 </span>
                               </>
                             ) : (
                               <span className="font-black text-orange-600 text-sm tracking-tight">
                                 {formatCurrency(product.price)}
                               </span>
                             )}
                           </div>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                addToCart(product);
                              }}
                              className="bg-slate-50 hover:bg-orange-500 hover:text-white text-slate-400 p-2 rounded-lg transition-all shadow-sm"
                              aria-label="Adicionar"
                            >
                               <Plus size={16} />
                            </button>
                         </div>
                       </div>
                       {product.imageUrl && (
                         <div className="w-24 h-24 rounded-lg overflow-hidden shrink-0 border border-slate-50 relative">
                            {product.onPromotion && product.promotionPrice && product.price > product.promotionPrice && (
                              <div className="absolute top-1 left-1 bg-red-500 text-white text-[8px] font-black px-1 py-0.5 rounded uppercase tracking-wider z-10 shadow-sm">
                                -{Math.round(((product.price - product.promotionPrice) / product.price) * 100)}%
                              </div>
                            )}
                            <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                         </div>
                       )}
                     </div>
                   ))}
                 </div>
               </div>
             );
           })}
          </div>
        )}
       </div>

        {/* Floating WhatsApp Support Button */}
       {!isCartOpen && !isCheckoutOpen && !isLoyaltyOpen && (
         <motion.a
           initial={{ scale: 0, opacity: 0 }}
           animate={{ scale: 1, opacity: 1 }}
           href={`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent('Olá! Gostaria de tirar uma dúvida sobre o cardápio.')}`}
           target="_blank"
           rel="noreferrer"
           className="fixed bottom-6 left-6 z-50 bg-[#25D366] text-white p-3.5 rounded-2xl shadow-xl hover:scale-110 active:scale-95 transition-all"
         >
           <MessageCircle size={24} />
         </motion.a>
       )}

       {/* Floating Cart Button */}
       {cart.length > 0 && !isCartOpen && (
         <motion.div 
           initial={{ y: 100, opacity: 0 }}
           animate={{ y: 0, opacity: 1 }}
           className="fixed bottom-6 left-0 right-0 px-6 z-50 pointer-events-none"
         >
           <button 
             onClick={() => setIsCartOpen(true)}
             className="w-full max-w-md mx-auto h-14 bg-slate-900 rounded-2xl shadow-2xl flex items-center justify-between px-6 text-white pointer-events-auto hover:bg-slate-800 transition-all active:scale-95 border-t-2 border-slate-700/50"
           >
             <div className="flex items-center gap-3">
                <div className="relative">
                   <ShoppingBag size={20} className="text-orange-500" />
                   <span className="absolute -top-1.5 -right-1.5 bg-orange-500 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center border-2 border-slate-900">
                     {cart.reduce((acc, c) => acc + c.quantity, 0)}
                   </span>
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest">Ver Carrinho</span>
             </div>
             <span className="font-black text-sm tracking-tight">{formatCurrency(cartTotal)}</span>
           </button>
         </motion.div>
       )}

       {/* Cart Modal */}
       <AnimatePresence>
         {isCartOpen && (
           <motion.div 
             initial={{ opacity: 0, y: 100 }}
             animate={{ opacity: 1, y: 0 }}
             exit={{ opacity: 0, y: 100 }}
             className="fixed inset-0 z-[60] bg-zinc-50 flex flex-col sm:max-w-md sm:mx-auto"
           >
             <div className="p-6 border-b border-zinc-200 flex items-center justify-between bg-white">
                <h2 className="text-xl font-black">Seu pedido</h2>
                <button onClick={() => setIsCartOpen(false)} className="p-2 hover:bg-zinc-100 rounded-full" aria-label="Fechar">
                   <X />
                </button>
             </div>

             <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {cart.length === 0 ? (
                  <div className="text-center py-20">
                     <ShoppingCart className="mx-auto h-16 w-16 text-zinc-100 mb-4" />
                     <p className="text-zinc-500 font-medium">Seu carrinho está vazio</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                     {cart.map((item, index) => (
                       <div key={`${item.productId}-${index}`} className="flex items-center justify-between bg-white p-4 rounded-2xl border border-zinc-100">
                          <div className="flex-1">
                             <p className="font-bold text-zinc-900">{item.name}</p>
                             <p className="text-sm text-orange-600 font-bold">{formatCurrency(item.price)}</p>
                          </div>
                          <div className="flex items-center gap-3 bg-zinc-100 rounded-lg p-1">
                             <button 
                               onClick={() => removeFromCart(index)}
                               className="p-1.5 hover:bg-white rounded-md transition-colors"
                               aria-label="Diminuir"
                             >
                                <Minus size={16} />
                             </button>
                             <span className="font-black w-4 text-center">{item.quantity}</span>
                             <button 
                               onClick={() => {
                                 const prod = products.find(p => p.id === item.productId);
                                 if (prod) addToCart(prod, item.selectedOptions || []);
                               }}
                               className="p-1.5 hover:bg-white rounded-md transition-colors text-orange-500"
                               aria-label="Adicionar"
                             >
                                <Plus size={16} />
                             </button>
                         </div>
                      </div>
                    ))}
                    
                    {/* Coupon Input */}
                    <div className="pt-4 border-t border-zinc-100 space-y-3">
                      {restaurant.loyaltySettings?.enabled && (
                        <button 
                          onClick={() => setIsLoyaltyOpen(true)}
                          className="w-full flex items-center justify-between p-3 bg-orange-50 rounded-xl border border-orange-100 text-orange-600 hover:bg-orange-100 transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <Gift size={20} className="animate-pulse" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Resgatar Pontos</span>
                          </div>
                          {loyaltyProfile && (
                            <span className="text-xs font-black">{loyaltyProfile.pointsBalance} pts</span>
                          )}
                          <ChevronRight size={16} />
                        </button>
                      )}

                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          placeholder="Código do cupom"
                          className="flex-1 px-4 h-11 bg-zinc-100 rounded-xl text-xs font-black uppercase tracking-widest outline-none focus:ring-1 focus:ring-orange-500"
                          value={couponCode}
                          onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                        />
                        <Button 
                          onClick={applyCoupon} 
                          className="h-11 px-4 text-[10px] font-black uppercase tracking-widest"
                          variant="outline"
                        >
                          Aplicar
                        </Button>
                      </div>
                      {appliedCoupon && (
                        <div className="mt-2 flex items-center justify-between bg-orange-50 p-2 rounded-xl border border-orange-100">
                          <div className="flex items-center gap-2">
                            <Ticket size={14} className="text-orange-500" />
                            <span className="text-[10px] font-black uppercase text-orange-600">{appliedCoupon.code} aplicado!</span>
                          </div>
                          <button onClick={() => setAppliedCoupon(null)} className="text-orange-400 hover:text-orange-600" aria-label="Fechar">
                            <X size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                 </div>
               )}

               {/* Order Type */}
               <div className={cn("grid gap-2", restaurant.deliveryEnabled && restaurant.dineInEnabled ? "grid-cols-2" : "grid-cols-1")}>
                  {restaurant.deliveryEnabled && (
                    <button 
                      onClick={() => setOrderType('delivery')}
                      className={cn(
                        "p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2",
                        orderType === 'delivery' ? "border-orange-500 bg-orange-50 text-orange-600" : "border-zinc-200 bg-white text-zinc-500"
                      )}
                    >
                       <Truck size={24} />
                       <span className="font-bold text-sm">Delivery</span>
                    </button>
                  )}
                  {restaurant.dineInEnabled && (
                    <button 
                      onClick={() => setOrderType('table')}
                      className={cn(
                        "p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2",
                        orderType === 'table' ? "border-orange-500 bg-orange-50 text-orange-600" : "border-zinc-200 bg-white text-zinc-500"
                      )}
                    >
                       <ShoppingBag size={24} />
                       <span className="font-bold text-sm">Na Mesa</span>
                    </button>
                  )}
                  {!restaurant.deliveryEnabled && !restaurant.dineInEnabled && (
                    <div className="p-4 bg-red-50 text-red-600 rounded-xl text-center text-xs font-bold border border-red-100">
                      Pedidos online estão temporariamente desativados.
                    </div>
                  )}
               </div>
            </div>

            <div className="p-6 bg-white border-t border-zinc-200 space-y-4">
                <div className="flex justify-between items-center text-sm">
                   <span className="text-zinc-500">Subtotal</span>
                   <span className="font-bold">{formatCurrency(cartTotal)}</span>
                </div>
                {rewardDiscount > 0 && (
                  <div className="flex justify-between items-center text-sm text-green-600">
                   <span className="font-medium">Resgate Fidelidade</span>
                   <span className="font-bold">-{formatCurrency(rewardDiscount)}</span>
                  </div>
                )}
                {couponDiscount > 0 && (
                  <div className="flex justify-between items-center text-sm text-green-600">
                   <span className="font-medium">Cupom ({appliedCoupon?.code})</span>
                   <span className="font-bold">-{formatCurrency(couponDiscount)}</span>
                  </div>
                )}
                {orderType === 'delivery' && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-zinc-500">Taxa de Entrega</span>
                    <span className="font-bold text-green-600">{formatCurrency(deliveryFee)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center text-lg font-black pt-2 border-t border-zinc-100">
                   <span>Total</span>
                   <span className="text-orange-600">{formatCurrency(finalTotal)}</span>
                </div>
                <Button 
                  className="w-full h-14 text-lg" 
                  disabled={cart.length === 0}
                  onClick={() => setIsCheckoutOpen(true)}
                >
                   Continuar pedido
                </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Checkout Modal */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-[70] bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-6 overflow-hidden">
           <motion.div 
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-8 space-y-6 max-h-[95vh] overflow-y-auto no-scrollbar"
           >
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-black tracking-tighter uppercase italic">Dados do Pedido</h3>
                <button onClick={() => setIsCheckoutOpen(false)} className="p-2 border border-slate-100 rounded-full hover:bg-slate-50" aria-label="Fechar"><X size={20} /></button>
              </div>

              {/* Donation Section Requested */}
              <div className="bg-brand-gray p-5 rounded-2xl border-2 border-brand-egg/20 space-y-3">
                 <div className="flex items-center gap-2">
                    <Heart size={16} className="text-red-500 fill-current" />
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-brand-black">Doe uma refeição</h4>
                 </div>
                 <p className="text-[10px] font-bold text-slate-500 leading-relaxed uppercase tracking-tight">Ajude uma pessoa em situação de vulnerabilidade na sua cidade. 100% da sua doação vai para quem precisa.</p>
                 <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {[0, 5, 10, 15].map(amt => (
                      <button 
                        key={amt}
                        onClick={() => setDonationAmount(amt)}
                        className={cn(
                          "h-10 rounded-lg font-black text-xs transition-all",
                          donationAmount === amt ? "bg-brand-black text-brand-white" : "bg-white text-slate-400 border border-slate-100"
                        )}
                      >
                        {amt === 0 ? 'Não' : `R$ ${amt}`}
                      </button>
                    ))}
                 </div>
                 <p className="text-[8px] font-bold text-slate-400 uppercase italic">O pedido do restaurante continua 100% dele.</p>
              </div>

              <div className="space-y-4">
                 <div className="space-y-1">
                    <label className="text-xs font-black uppercase text-zinc-400">Nome do Cliente</label>
                    <input 
                      type="text" 
                      placeholder="Como podemos te chamar?"
                      className="w-full p-3 bg-zinc-50 border-none rounded-xl outline-none ring-1 ring-zinc-200 focus:ring-2 focus:ring-orange-500"
                      value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                    />
                 </div>
                 <div className="space-y-1">
                    <label className="text-xs font-black uppercase text-zinc-400">Telefone do Cliente</label>
                    <input 
                      type="tel" 
                      placeholder="(00) 00000-0000"
                      className="w-full p-3 bg-zinc-50 border-none rounded-xl outline-none ring-1 ring-zinc-200 focus:ring-2 focus:ring-orange-500"
                      value={formData.phone}
                      onChange={e => setFormData({...formData, phone: e.target.value})}
                    />
                 </div>
                 
                 {orderType === 'delivery' ? (
                   <>
                    {restaurant.deliverySettings?.feeByNeighborhood && restaurant.deliverySettings.feeByNeighborhood.length > 0 && (
                      <div className="space-y-1">
                        <label className="text-xs font-black uppercase text-zinc-400">Bairro</label>
                        <select 
                          className="w-full p-3 bg-zinc-50 border-none rounded-xl outline-none ring-1 ring-zinc-200 focus:ring-2 focus:ring-orange-500 appearance-none"
                          value={formData.neighborhood}
                          onChange={e => setFormData({...formData, neighborhood: e.target.value})}
                        >
                          <option value="">Selecione seu bairro</option>
                          {restaurant.deliverySettings.feeByNeighborhood.map((n, i) => (
                            <option key={i} value={n.neighborhood}>{n.neighborhood} ({formatCurrency(n.fee)})</option>
                          ))}
                          <option value="outro">Outro bairro ({formatCurrency(restaurant.deliverySettings.fee)})</option>
                        </select>
                      </div>
                    )}
                    <div className="space-y-1">
                        <label className="text-xs font-black uppercase text-zinc-400">Endereço Completo</label>
                        <textarea 
                          placeholder="Rua, número, bairro e complemento"
                          className="w-full p-3 bg-zinc-50 border-none rounded-xl outline-none ring-1 ring-zinc-200 focus:ring-2 focus:ring-orange-500 h-24"
                          value={formData.address}
                          onChange={e => setFormData({...formData, address: e.target.value})}
                        />
                    </div>
                   </>
                 ) : (
                   <div className="space-y-1">
                      <label className="text-xs font-black uppercase text-zinc-400">Número da Mesa</label>
                      <input 
                        type="number" 
                        placeholder="Ex: 05"
                        className="w-full p-3 bg-zinc-50 border-none rounded-xl outline-none ring-1 ring-zinc-200 focus:ring-2 focus:ring-orange-500"
                        value={formData.tableNumber}
                        onChange={e => setFormData({...formData, tableNumber: e.target.value})}
                      />
                   </div>
                 )}

                 <div className="space-y-1">
                    <label className="text-xs font-black uppercase text-zinc-400">Forma de Pagamento</label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                       {[{id:'pix', icon:<Smartphone size={16}/>, label:'PIX'}, {id:'cartao', icon:<CreditCard size={16}/>, label:'Cartão'}, {id:'dinheiro', icon:<Banknote size={16}/>, label:'Dinheiro'}].map(p => (
                         <button
                          key={p.id}
                          onClick={() => setFormData({...formData, paymentMethod: p.id})}
                          className={cn(
                            "flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all",
                            formData.paymentMethod === p.id ? "border-orange-500 bg-orange-50 text-orange-600" : "border-zinc-100 text-zinc-500"
                          )}
                         >
                           {p.icon}
                           <span className="text-[10px] font-bold">{p.label}</span>
                         </button>
                       ))}
                    </div>
                 </div>
              </div>

              <div className="pt-4 border-t border-zinc-100">
                 <Button className="w-full h-14 text-lg" onClick={handleCheckout}>
                    Finalizar Pedido • {formatCurrency(finalTotal)}
                 </Button>
              </div>
           </motion.div>
        </div>
      )}
      {/* Loyalty Modal */}
      <AnimatePresence>
        {isLoyaltyOpen && (
          <div role="dialog" aria-modal="true" aria-label="Fidelidade" className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
             <motion.div 
               initial={{ scale: 0.9, opacity: 0 }}
               animate={{ scale: 1, opacity: 1 }}
               exit={{ scale: 0.9, opacity: 0 }}
               className="bg-white w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]"
             >
                <div className="bg-slate-900 p-8 text-center relative overflow-hidden">
                   <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500 rounded-full blur-3xl opacity-20 translate-x-1/2 -translate-y-1/2" />
                   <div className="relative z-10">
                      <div className="bg-white/10 backdrop-blur-md border border-white/20 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <Gift className="text-orange-500 h-8 w-8" />
                      </div>
                      <h2 className="text-xl font-black text-white uppercase tracking-tight">Clube de Fidelidade</h2>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Acumule pontos em cada pedido</p>
                   </div>
                    <button 
                      onClick={() => setIsLoyaltyOpen(false)}
                      className="absolute top-4 right-4 text-slate-500 hover:text-white"
                      aria-label="Fechar"
                    >
                       <X size={20} />
                   </button>
                </div>

                <div className="p-6 flex-1 overflow-y-auto space-y-6">
                   {!loyaltyProfile && !isIdentifying ? (
                     <div className="text-center py-6 space-y-4">
                        <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto">
                           <Smartphone size={24} className="text-slate-300" />
                        </div>
                        <p className="text-xs font-bold text-slate-500 leading-relaxed">Insira seu WhatsApp para ver seus pontos e resgatar prêmios</p>
                        <input 
                          type="tel"
                          placeholder="(00) 00000-0000"
                          className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-center font-black text-slate-900 outline-none focus:ring-2 focus:ring-orange-500 h-12"
                          value={formData.phone}
                          onChange={(e) => setFormData({...formData, phone: e.target.value})}
                        />
                        <p className="text-[9px] text-slate-400 font-bold uppercase">
                          {restaurant.loyaltySettings?.accumulationType === 'order' 
                            ? `Ganha ${restaurant.loyaltySettings?.pointsPerOrder} pontos por pedido`
                            : `Ganha ${restaurant.loyaltySettings?.pointsPerReal} ponto por cada R$ 1,00 gasto`}
                        </p>
                     </div>
                   ) : loyaltyProfile ? (
                     <div className="space-y-6">
                        <div className="bg-orange-50 rounded-2xl p-6 border border-orange-100 text-center">
                           <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest mb-1">Seu Saldo Atual</p>
                           <p className="text-5xl font-black text-slate-900 tracking-tighter">{loyaltyProfile.pointsBalance}</p>
                           <p className="text-[10px] font-black text-slate-400 uppercase mt-1">Pontos Disponíveis</p>
                        </div>

                        {/* History Section for Customer */}
                        <div className="space-y-3">
                           <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Histórico Recente</h3>
                           <div className="space-y-2">
                              {loyaltyProfile.history?.slice().reverse().slice(0, 5).map((item, i: number) => (
                                <div key={i} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50/50 border border-slate-100">
                                   <div className="flex items-center gap-2.5">
                                      <div className={cn(
                                        "w-7 h-7 rounded-lg flex items-center justify-center",
                                        item.type === 'earn' ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
                                      )}>
                                         {item.type === 'earn' ? <Plus size={12} /> : <Trash2 size={12} />}
                                      </div>
                                      <div>
                                         <p className="text-[10px] font-bold text-slate-900 leading-none">{item.description}</p>
                                         <p className="text-[8px] font-medium text-slate-400 mt-1">{new Date(item.createdAt).toLocaleDateString('pt-BR')}</p>
                                      </div>
                                   </div>
                                   <span className={cn(
                                     "text-[10px] font-black",
                                     item.type === 'earn' ? "text-green-600" : "text-red-600"
                                   )}>
                                      {item.type === 'earn' ? '+' : ''}{item.points}
                                   </span>
                                </div>
                              ))}
                              {(!loyaltyProfile.history || loyaltyProfile.history.length === 0) && (
                                <p className="text-center py-4 text-[9px] font-black text-slate-300 uppercase italic tracking-widest">Sem histórico</p>
                              )}
                           </div>
                        </div>

                        <div className="space-y-3">
                           <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Resgatar Prêmios</h3>
                           <div className="grid gap-2">
                              {restaurant.loyaltySettings?.redemptionRules?.map((rule: RewardRule) => {
                                const canRedeem = loyaltyProfile.pointsBalance >= rule.pointsRequired;
                                const isApplied = appliedReward?.id === rule.id;
                                
                                return (
                                  <button 
                                    key={rule.id}
                                    disabled={!canRedeem}
                                    onClick={() => {
                                      setAppliedReward(isApplied ? null : rule);
                                      setIsLoyaltyOpen(false);
                                      if (!isApplied) toast.success(`Recompensa aplicada!`, { position: 'bottom-center' });
                                    }}
                                    className={cn(
                                      "w-full flex items-center justify-between p-3 rounded-xl border-2 transition-all text-left",
                                      isApplied ? "border-green-500 bg-green-50" :
                                      canRedeem ? "border-slate-100 bg-white hover:border-orange-200" : "border-slate-50 bg-slate-50 opacity-60"
                                    )}
                                  >
                                    <div className="flex items-center gap-3">
                                       <div className={cn(
                                         "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                                         isApplied ? "bg-green-500 text-white" : canRedeem ? "bg-orange-500 text-white" : "bg-slate-200 text-slate-400"
                                       )}>
                                          <Star size={18} fill={canRedeem ? "currentColor" : "none"} />
                                       </div>
                                       <div>
                                          <p className="text-xs font-black text-slate-900 uppercase tracking-tight leading-none">{rule.description}</p>
                                          <p className={cn("text-[9px] font-bold uppercase tracking-widest mt-1", canRedeem ? "text-orange-500" : "text-slate-400")}>
                                            {rule.pointsRequired} PONTOS
                                          </p>
                                       </div>
                                    </div>
                                    {isApplied && <div className="bg-green-500 text-white p-1 rounded-full"><Plus size={12} className="rotate-45" /></div>}
                                  </button>
                                );
                              })}
                           </div>
                        </div>

                        <div className="pt-4 border-t border-slate-50">
                           <button 
                             onClick={() => setLoyaltyProfile(null)}
                             className="text-[9px] font-black text-slate-400 uppercase tracking-widest hover:text-orange-600 w-full"
                           >
                              Trocar de conta
                           </button>
                        </div>
                     </div>
                   ) : (
                     <div className="text-center py-12">
                        <Star size={32} className="mx-auto text-slate-200 mb-4 animate-pulse" />
                        <p className="text-xs font-bold text-slate-500">Você ainda não tem pontos neste restaurante.</p>
                        <p className="text-[10px] text-slate-400 mt-2">Comece a comprar para ganhar!</p>
                     </div>
                   )}
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Product Customizer Modal */}
      <AnimatePresence>
        {customizingProduct && (
          <div role="dialog" aria-modal="true" aria-label="Personalizar produto" className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-0 sm:p-6 bg-slate-900/60 backdrop-blur-sm overflow-hidden">
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl flex flex-col max-h-[90vh] shadow-2xl"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-black">{customizingProduct.name}</h3>
                  {customizingProduct.onPromotion && customizingProduct.promotionPrice ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-orange-600 font-extrabold">{formatCurrency(customizingProduct.promotionPrice)}</span>
                      <span className="text-[10px] text-slate-400 font-bold line-through">{formatCurrency(customizingProduct.price)}</span>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">{formatCurrency(customizingProduct.price)}</p>
                  )}
                </div>
                <button onClick={() => setCustomizingProduct(null)} className="p-2 hover:bg-slate-50 rounded-full transition-colors border border-slate-100" aria-label="Fechar">
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-8">
                {customizingProduct.notes && (
                  <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl flex items-start gap-3">
                    <Info size={16} className="text-slate-400 shrink-0 mt-0.5" />
                    <p className="text-[11px] font-bold text-slate-500 leading-relaxed uppercase tracking-tight italic">
                      OBS: {customizingProduct.notes}
                    </p>
                  </div>
                )}
                {customizingProduct.ingredients && (
                  <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl flex items-start gap-3">
                    <ChefHat size={16} className="text-slate-400 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ingredientes / Composição</p>
                      <p className="text-[11px] font-medium text-slate-600 leading-relaxed">
                        {customizingProduct.ingredients}
                      </p>
                    </div>
                  </div>
                )}
                {customizingProduct.allergens && (
                  <div className="bg-red-50 border border-red-100 p-4 rounded-2xl flex items-start gap-3">
                    <X size={16} className="text-red-500 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-red-600/60 uppercase tracking-widest">Atenção: Alergênicos</p>
                      <p className="text-[11px] font-bold text-red-600 leading-relaxed italic">
                        {customizingProduct.allergens}
                      </p>
                    </div>
                  </div>
                )}
                {(customizingProduct.optionGroups || customizingProduct.additionalGroups)?.map((group: CustomizerGroup) => (
                  <div key={group.id} className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight">{group.name}</h4>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                          {(group.minSelection > 0 || group.type === 'single')
                            ? `Obrigatório • Selecione ${(group.minSelection === group.maxSelection && group.minSelection > 0) ? group.minSelection : (group.type === 'single' ? 1 : `de ${group.minSelection} a ${group.maxSelection}`)}`
                            : `Opcional • Selecione até ${group.maxSelection || 99}`
                          }
                        </p>
                      </div>
                      {selectedOptions.filter(o => o.groupId === group.id).length >= (group.minSelection || (group.type === 'single' ? 1 : 0)) && (
                        <div className="bg-green-500/10 text-green-600 p-1 rounded-full"><Plus size={12} className="rotate-45" /></div>
                      )}
                    </div>

                    <div className="grid gap-2">
                      {(group.options || group.items)?.map((option: Additional) => {
                        const isSelected = selectedOptions.some(o => o.optionId === option.id);
                        const groupSelections = selectedOptions.filter(o => o.groupId === group.id);
                        const maxSelection = group.maxSelection || (group.type === 'single' ? 1 : 99);
                        const canSelect = groupSelections.length < maxSelection || isSelected;

                        return (
                          <button
                            key={option.id}
                            disabled={!canSelect && !isSelected}
                            onClick={() => {
                              if (isSelected) {
                                setSelectedOptions(prev => prev.filter(o => o.optionId !== option.id));
                              } else if (canSelect) {
                                if (maxSelection === 1) {
                                  // Replace existing selection for single choice groups
                                  setSelectedOptions(prev => [
                                    ...prev.filter(o => o.groupId !== group.id),
                                    {
                                      groupId: group.id,
                                      groupName: group.name,
                                      optionId: option.id,
                                      optionName: option.name,
                                      price: option.price
                                    }
                                  ]);
                                } else {
                                  setSelectedOptions(prev => [
                                    ...prev,
                                    {
                                      groupId: group.id,
                                      groupName: group.name,
                                      optionId: option.id,
                                      optionName: option.name,
                                      price: option.price
                                    }
                                  ]);
                                }
                              }
                            }}
                            className={cn(
                              "flex items-center justify-between p-4 rounded-xl border-2 transition-all text-left",
                              isSelected 
                                ? "border-orange-500 bg-orange-50" 
                                : "border-slate-100 bg-white hover:border-slate-200"
                            )}
                          >
                            <div className="flex items-center gap-3">
                              <div className={cn(
                                "w-5 h-5 rounded-md border-2 transition-all flex items-center justify-center",
                                isSelected ? "border-orange-500 bg-orange-500 text-white" : "border-slate-200"
                              )}>
                                {isSelected && <Plus size={14} className="rotate-45" />}
                              </div>
                              <span className="text-sm font-bold text-slate-700">{option.name}</span>
                            </div>
                            {option.price !== 0 && (
                              <span className={cn("text-xs font-black", option.price > 0 ? "text-orange-600" : "text-slate-400")}>
                                {option.price > 0 ? `+${formatCurrency(option.price)}` : `-${formatCurrency(Math.abs(option.price))}`}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-6 border-t border-slate-100 bg-slate-50/50">
                <Button 
                  className="w-full h-14 text-sm font-black uppercase tracking-widest"
                  disabled={
                    (customizingProduct.optionGroups || customizingProduct.additionalGroups)?.some((group: CustomizerGroup) => {
                      const count = selectedOptions.filter(o => o.groupId === group.id).length;
                      const min = group.minSelection || (group.type === 'single' ? 1 : 0);
                      return count < min;
                    })
                  }
                  onClick={() => addToCart(customizingProduct, selectedOptions)}
                >
                  Adicionar • {formatCurrency((customizingProduct.onPromotion && customizingProduct.promotionPrice ? customizingProduct.promotionPrice : customizingProduct.price) + selectedOptions.reduce((acc, o) => acc + o.price, 0))}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
