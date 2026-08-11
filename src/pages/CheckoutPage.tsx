import React, { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { ArrowLeft, MapPin, UtensilsCrossed, Package, Heart, Check, CreditCard, Banknote, Smartphone, Store, Ticket, Gift, AlertTriangle, Zap } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useCart } from '../context/CartContext';
import { useRestaurant } from '../context/RestaurantContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import SEO from '../components/SEO';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, limit, doc, updateDoc, increment, arrayUnion } from 'firebase/firestore';
import { Order, Coupon, LoyaltyProfile, SavedAddress } from '../types';
import { toast } from 'react-hot-toast';
import { formatCurrency, cn } from '../lib/utils';
import { WA_NUMBER } from '../services/whatsappService';
import { motion, AnimatePresence } from 'motion/react';
import { QRCodeSVG } from 'qrcode.react';
import { generatePixPayload } from '../lib/pix';
import { getCustomerStats, checkCouponTargeting, CustomerStats } from '../services/customerRatingService';
import { updateStreak } from '../services/streakService';
import { awardPlatformPoints } from '../services/platformLoyaltyService';
import { checkAndAwardAchievements, getAllAchievements } from '../services/achievementService';

type OrderType = 'dine-in' | 'delivery' | 'pickup';
type PaymentMethod = 'pix' | 'cash' | 'card-on-delivery' | 'on-site' | 'credit' | 'debit' | 'voucher';

export default function CheckoutPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { items, subtotal, clearCart, tableNumber: cartTableNumber } = useCart();
  const { restaurants, deliverySettings, addOrder } = useRestaurant();
  const { user } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const restaurantId = items[0]?.product.restaurantId;
  const restaurant = restaurants.find(r => r.id === restaurantId);

  const [isExpress, setIsExpress] = useState(false);

  const [name, setName] = useState(() => localStorage.getItem('meuovo_customer_name') || '');
  const [nameError, setNameError] = useState('');
  const [phone, setPhone] = useState(() => {
    const saved = localStorage.getItem('customerPhone');
    if (saved) {
      const digits = saved.replace(/\D/g, '');
      if (digits.length <= 2) return digits;
      if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
      if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
    }
    return '';
  });
  const [phoneError, setPhoneError] = useState('');

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, '');
    const sliced = digits.slice(0, 11);
    if (sliced.length <= 2) return sliced;
    if (sliced.length <= 6) return `(${sliced.slice(0, 2)}) ${sliced.slice(2)}`;
    if (sliced.length <= 10) return `(${sliced.slice(0, 2)}) ${sliced.slice(2, 6)}-${sliced.slice(6)}`;
    return `(${sliced.slice(0, 2)}) ${sliced.slice(2, 7)}-${sliced.slice(7)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value);
    setPhone(formatted);
    const digits = formatted.replace(/\D/g, '');
    if (digits.length > 0 && digits.length < 10) {
      setPhoneError(t('common.error_phone_incomplete') || 'Telefone incompleto');
    } else {
      setPhoneError('');
    }
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setName(value);
    if (value.length > 0 && value.trim().length < 3) {
      setNameError(t('common.error_name_short') || 'Nome muito curto');
    } else {
      setNameError('');
    }
  };

  const isPhoneValid = (phoneStr: string) => {
    const digits = phoneStr.replace(/\D/g, '');
    return digits.length === 10 || digits.length === 11;
  };
  const [orderType, setOrderType] = useState<OrderType>('delivery');
  const [tableNumber, setTableNumber] = useState('');

  // Sync with cartTableNumber
  useEffect(() => {
    if (cartTableNumber) {
      setOrderType('dine-in');
      setTableNumber(cartTableNumber);
    }
  }, [cartTableNumber]);
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [selectedNeighborhood, setSelectedNeighborhood] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix');
  const [changeFor, setChangeFor] = useState('');
  const [observations, setObservations] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [orderId, setOrderId] = useState('');

  // Coupon state
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);

  // Loyalty state
  const [loyaltyProfile, setLoyaltyProfile] = useState<LoyaltyProfile | null>(null);
  const [selectedReward, setSelectedReward] = useState<{ type: string; value: string | number; pointsRequired: number; description: string } | null>(null);
  const [isCheckingLoyalty, setIsCheckingLoyalty] = useState(false);

  // Customer Reputation Stats state
  const [customerStats, setCustomerStats] = useState<CustomerStats | null>(null);
  const [isCheckingReputation, setIsCheckingReputation] = useState(false);

  // Scheduled order state
  const [scheduledAt, setScheduledAt] = useState('');

  // Tip state
  const tipOptions = [0, 5, 10, 15];
  const [tipPercent, setTipPercent] = useState(0);
  const tipAmount = (subtotal * tipPercent) / 100;

  // Caixinha Meu OVO
  const caixinhaOptions = [0, 0.25, 0.50, 1];
  const [caixinhaAmount, setCaixinhaAmount] = useState(0);

  // Social cause donation
  const donationOptions = [0, 1, 2, 5];
  const [donationAmount, setDonationAmount] = useState(0);

  useEffect(() => {
    const checkCustomerReputation = async () => {
      const cleanPhone = phone.replace(/\D/g, '');
      if (!cleanPhone || cleanPhone.length < 10) {
        setCustomerStats(null);
        return;
      }
      setIsCheckingReputation(true);
      try {
        const stats = await getCustomerStats(phone);
        setCustomerStats(stats);
      } catch (err) {
        console.error('Error fetching customer rating details:', err);
      } finally {
        setIsCheckingReputation(false);
      }
    };

    const timer = setTimeout(checkCustomerReputation, 1100);
    return () => clearTimeout(timer);
  }, [phone]);

  useEffect(() => {
    const checkLoyalty = async () => {
      if (!restaurant) return;
      if (!phone || phone.replace(/\D/g, '').length < 10) {
        setLoyaltyProfile(null);
        return;
      }
      setIsCheckingLoyalty(true);
      try {
        const q = query(
          collection(db, 'loyalty_profiles'),
          where('restaurantId', '==', restaurant.id),
          where('customerId', '==', user?.id || ''),
          where('customerPhone', '==', phone)
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
          setLoyaltyProfile({ id: snap.docs[0].id, ...snap.docs[0].data() });
        } else {
          setLoyaltyProfile(null);
        }
      } catch (err) {
        console.error('Error fetching loyalty:', err);
      } finally {
        setIsCheckingLoyalty(false);
      }
    };

    const timer = setTimeout(checkLoyalty, 1000);
    return () => clearTimeout(timer);
  }, [phone, restaurant?.id]);

  useEffect(() => {
    if (!restaurant || items.length === 0) {
      if (!submitted) {
        navigate('/carrinho');
      }
    }
  }, [restaurant, items.length, navigate, submitted]);

  const handleApplyCoupon = async () => {
    if (!couponInput.trim()) return;
    if (!restaurant) return;
    setIsValidatingCoupon(true);

    try {
      const q = query(
        collection(db, 'coupons'),
        where('restaurantId', '==', restaurant.id),
        where('code', '==', couponInput.toUpperCase().trim()),
        where('isActive', '==', true),
        limit(1)
      );

      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        toast.error('Cupom não encontrado ou inválido');
        setAppliedCoupon(null);
        return;
      }

      const coupon = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Coupon;

      // Validation
      const now = new Date();
      if (new Date(coupon.expiryDate) < now) {
        toast.error('Este cupom já expirou');
        setAppliedCoupon(null);
        return;
      }

      if (coupon.usageLimit && (coupon.usageCount || 0) >= coupon.usageLimit) {
        toast.error('Este cupom atingiu o limite de usos');
        setAppliedCoupon(null);
        return;
      }

      if (subtotal < coupon.minOrderValue) {
        toast.error(`Pedido mínimo para este cupom: R$ ${coupon.minOrderValue.toFixed(2)}`);
        setAppliedCoupon(null);
        return;
      }

      // Check customer targeting
      const targeting = await checkCouponTargeting(coupon, phone, restaurant.id);
      if (!targeting.valid) {
        toast.error(targeting.reason || 'Este cupom não é válido para o seu perfil');
        setAppliedCoupon(null);
        return;
      }

      setAppliedCoupon(coupon);
      if (selectedReward) setSelectedReward(null);
      toast.success('Cupom aplicado com sucesso!');
    } catch (error) {
      console.error('Error validating coupon:', error);
      toast.error('Erro ao validar cupom');
    } finally {
      setIsValidatingCoupon(false);
    }
  };

  const getFreeProductValue = () => {
    if (selectedReward?.type !== 'free_product') return 0;
    const item = items.find(i => i.product.id === selectedReward.value);
    if (!item) return 0;
    const price = item.product.onPromotion && item.product.promotionPrice ? item.product.promotionPrice : item.product.price;
    return price; // Value of ONE free product
  };

  const discountValue = appliedCoupon 
    ? (appliedCoupon.type === 'percent' 
        ? (subtotal * appliedCoupon.value) / 100 
        : appliedCoupon.value)
    : (selectedReward?.type === 'discount_percent' 
        ? (subtotal * selectedReward.value) / 100 
        : (selectedReward?.type === 'free_product' ? getFreeProductValue() : 0));

  const getDeliveryFee = (rest: typeof restaurant) => {
    if (orderType !== 'delivery') return 0;
    if (!rest) return 0;
    const neighborhoodFees = rest.deliverySettings?.feeByNeighborhood || [];
    const matched = neighborhoodFees.find(n => n.neighborhood === selectedNeighborhood);
    if (matched) return matched.fee;
    return rest.deliverySettings?.fee ?? deliverySettings?.fee ?? 0;
  };

  const deliveryFee = getDeliveryFee(restaurant);
  const total = Math.max(0, subtotal + deliveryFee + tipAmount + caixinhaAmount + donationAmount - discountValue);

  const handleSubmit = async () => {
    if (submitting) return;
    const isTabletDineIn = orderType === 'dine-in' && tableNumber;
    if (isTabletDineIn) {
      if (!name) setName(`Mesa ${tableNumber}`);
    } else {
      if (!name || !phone) {
        toast.error('Preencha nome e telefone');
        return;
      }
      if (!isPhoneValid(phone)) {
        setPhoneError('Por favor, insira um telefone válido com DDD');
        toast.error('Telefone inválido');
        return;
      }
    }

    // Check stock availability
    for (const item of items) {
      if (!item.product.isAvailable) {
        toast.error(`"${item.product.name}" não está mais disponível`);
        return;
      }
    }

    // Block problematic customers if configured
    if (restaurant.orderSettings?.blockProblematicCustomers) {
      const minRating = restaurant.orderSettings?.minAcceptableRating ?? 3.0;
      try {
        const stats = await getCustomerStats(phone);
        if (stats.totalRatings > 0 && stats.averageRating < minRating) {
          toast.error(`Pedido Negado: Devido ao seu histórico de incidentes em entregas anteriores (Nota: ${stats.averageRating.toFixed(1)}★), este estabelecimento não está aceitando seus pedidos automáticos.`);
          return;
        }
      } catch (err) {
        console.error("Error validating customer reputation inside checkout order placement:", err);
      }
    }

    if (orderType === 'delivery' && (!deliveryAddress || (restaurant.deliverySettings?.feeByNeighborhood?.length ? !selectedNeighborhood : false))) {
      toast.error('Preencha os dados de entrega');
      return;
    }

    if (orderType === 'dine-in' && !tableNumber) {
      toast.error('Informe o número da mesa');
      return;
    }

    setSubmitting(true);
    const id = `ORD${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    
    // If free product reward was selected, we need to mark it in the order items
    const orderItems = items.map(item => {
      let unitPrice = item.product.onPromotion && item.product.promotionPrice ? item.product.promotionPrice : item.product.price;
      
      // If this is the free product from loyalty, set price to 0
      if (selectedReward?.type === 'free_product' && selectedReward.value === item.product.id) {
        unitPrice = 0;
      }

      return {
        productId: item.product.id,
        productName: item.product.name,
        quantity: item.quantity,
        unitPrice,
        additionals: item.selectedAdditionals.map(a => ({ name: a.name, price: a.price })),
        observations: item.observations || undefined,
      };
    });

    const order: Order = {
      id,
      restaurantId: restaurant.id,
      userId: user?.id,
      customerName: name,
      customerPhone: phone.replace(/\D/g, ''),
      type: orderType,
      tableNumber: orderType === 'dine-in' ? tableNumber : undefined,
      deliveryAddress: orderType === 'delivery' ? deliveryAddress : undefined,
      paymentMethod,
      changeFor: paymentMethod === 'cash' && changeFor ? Number(changeFor) : undefined,
      status: 'received',
      items: orderItems,
      subtotal,
      deliveryFee,
      meuOvoCaixinha: caixinhaAmount > 0 ? caixinhaAmount : undefined,
      donationAmount: donationAmount > 0 ? donationAmount : undefined,
      couponCode: appliedCoupon?.code,
      couponDiscount: appliedCoupon ? discountValue : undefined,
      total: total,
      tip: tipAmount > 0 ? tipAmount : undefined,
      tipPercent: tipPercent > 0 ? tipPercent : undefined,
      scheduledAt: scheduledAt || undefined,
      observations: observations || undefined,
      createdAt: new Date().toISOString(),
      origin: 'marketplace',
    };

    try {
      await addOrder(order);
    } catch (err) {
      console.error('[Checkout] Failed to save order:', err);
      toast.error('Erro ao salvar pedido. Seu carrinho foi preservado.');
      setSubmitting(false);
      return;
    }
    setOrderId(id);

    // Increment orderCount for each product (for "Mais pedido" badge)
    try {
      const { writeBatch } = await import('firebase/firestore');
      const batch = writeBatch(db);
      const productCounts = new Map<string, number>();
      orderItems.forEach(item => {
        productCounts.set(item.productId, (productCounts.get(item.productId) || 0) + item.quantity);
      });
      productCounts.forEach((qty, productId) => {
        batch.update(doc(db, 'products', productId), { orderCount: increment(qty) });
      });
      if (restaurantId) {
        batch.update(doc(db, 'restaurants', restaurantId), { orderCount: increment(1) });
      }
      await batch.commit();
    } catch (err) {
      console.error('[Checkout] Failed to increment orderCount:', err);
    }

    // Update loyalty profile if reward was used
    if (selectedReward && loyaltyProfile) {
      try {
        await updateDoc(doc(db, 'loyalty_profiles', loyaltyProfile.id), {
          pointsBalance: increment(-selectedReward.pointsRequired),
          history: arrayUnion({
            type: 'redeem',
            points: selectedReward.pointsRequired,
            description: `Resgate: ${selectedReward.description}`,
            createdAt: new Date().toISOString()
          })
        });
      } catch (err) {
        console.error('Error redeeming points:', err);
        toast.error('Erro ao deduzir pontos de fidelidade. Entre em contato com o suporte.');
      }
    }

    // Mark table as occupied for dine-in orders
    if (orderType === 'dine-in' && tableNumber) {
      try {
        const tablesQuery = query(
          collection(db, 'tables'),
          where('restaurantId', '==', restaurant.id),
          where('number', '==', tableNumber)
        );
        const tablesSnap = await getDocs(tablesQuery);
        if (!tablesSnap.empty) {
          await updateDoc(doc(db, 'tables', tablesSnap.docs[0].id), {
            status: 'occupied',
            currentOrderId: id,
          });
        }
      } catch (err) {
        console.error('[Checkout] Failed to mark table occupied:', err);
      }
    }

    // Increment coupon usage if applied
    if (appliedCoupon) {
      try {
        await updateDoc(doc(db, 'coupons', appliedCoupon.id), {
          usageCount: increment(1)
        });
      } catch (err) {
        console.error('Error incrementing coupon usage:', err);
        toast.error('Erro ao registrar uso do cupom. Entre em contato com o suporte.');
      }
    }

    // Build WhatsApp message
    const typePt = { 'dine-in': 'Salão', 'delivery': 'Delivery', 'pickup': 'Retirada' };
    const payPt: Record<string, string> = { pix: 'PIX', cash: 'Dinheiro', 'card-on-delivery': 'Cartão na entrega', 'on-site': 'Pagamento no local', credit: 'Cartão Crédito Online', debit: 'Cartão Débito Online', voucher: 'Vale-Refeição' };

    const getPaymentLink = () => {
      if (paymentMethod === 'credit') return restaurant?.paymentSettings?.creditCardLink;
      if (paymentMethod === 'debit') return restaurant?.paymentSettings?.debitLink;
      if (paymentMethod === 'voucher') return restaurant?.paymentSettings?.voucherLink;
      return '';
    };
    const paymentLink = getPaymentLink();

    const itemsText = items.map(item => {
      const addText = item.selectedAdditionals.length ? `\n   + ${item.selectedAdditionals.map(a => a.name).join(', ')}` : '';
      const obsText = item.observations ? `\n   Obs: ${item.observations}` : '';
      const price = item.product.onPromotion && item.product.promotionPrice ? item.product.promotionPrice : item.product.price;
      return `${item.quantity}x ${item.product.name} - R$ ${(price * item.quantity).toFixed(2)}${addText}${obsText}`;
    }).join('\n');

    const locationText = orderType === 'dine-in' 
      ? `Mesa: ${tableNumber}` 
      : orderType === 'delivery' 
        ? `Endereço: ${deliveryAddress}${selectedNeighborhood ? ` - Bairro: ${selectedNeighborhood === 'other' ? 'Outro' : selectedNeighborhood}` : ''}` 
        : 'Retirada no balcão';
    const couponText = appliedCoupon ? `\nCupom: ${appliedCoupon.code} (- R$ ${discountValue.toFixed(2)})` : '';
    const changeText = paymentMethod === 'cash' && changeFor ? `\nTroco para: R$ ${changeFor}` : '';
    const tipText = tipAmount > 0 ? `Gorjeta (${tipPercent}%): R$ ${tipAmount.toFixed(2)}` : '';
    const caixinhaText = caixinhaAmount > 0 ? `🐣 Caixinha Meu OVO: R$ ${caixinhaAmount.toFixed(2)}` : '';
    const donationText = donationAmount > 0 ? `❤️ Doação Social: R$ ${donationAmount.toFixed(2)}` : '';
    const extrasText = [tipText, caixinhaText, donationText].filter(Boolean).join('\n');
    const scheduleText = scheduledAt ? `\nAgendado para: ${new Date(scheduledAt).toLocaleString('pt-BR')}` : '';
    const obsText = observations ? `\nObservações gerais: ${observations}` : '';

    const ratingText = customerStats && customerStats.totalRatings > 0
      ? `★ ${customerStats.averageRating.toFixed(1)} (${customerStats.totalRatings} avaliações) • ${customerStats.statusText}`
      : 'Cliente Novo (Sem avaliações)';

    const msg = `*MEU OVO 🥚 - NOVO PEDIDO*\n` +
                `----------------------------------\n` +
                `*ID:* #${id}\n` +
                `*Cliente:* ${name}\n` +
                `*Avaliação do Cliente:* ${ratingText}\n` +
                `*Telefone:* ${phone}\n` +
                `*Tipo:* ${typePt[orderType]}\n` +
                `*${locationText}*\n` +
                `*Pagamento:* ${payPt[paymentMethod]}${changeText}\n` +
                `${paymentLink ? `*Link de Pagamento:* ${paymentLink}\n` : ''}` +
                `${scheduleText}` +
                `----------------------------------\n\n` +
                `*ITENS:*\n${itemsText}\n\n` +
                `${observations ? `*OBSERVAÇÕES:*\n${observations}\n\n` : ''}` +
                `*RESUMO FINANCEIRO:*\n` +
                `Subtotal: R$ ${subtotal.toFixed(2)}\n` +
                `Entrega: R$ ${deliveryFee.toFixed(2)}${couponText}` +
                `${extrasText ? `\n${extrasText}` : ''}\n` +
                `*TOTAL: R$ ${total.toFixed(2)}*\n\n` +
                `*Acompanhe seu pedido:* ${window.location.origin}/pedido/${id}\n\n` +
                `✅ Enviado via *MEU OVO*`;

    const cleanRestaurantPhone = restaurant?.whatsapp || WA_NUMBER;
    // Skip WhatsApp redirect for dine-in tablets — order goes directly to KitchenMode
    if (orderType !== 'dine-in' || !tableNumber) {
      if (cleanRestaurantPhone) {
        const whatsappUrl = `https://wa.me/${cleanRestaurantPhone}?text=${encodeURIComponent(msg)}`;
        window.open(whatsappUrl, '_blank');
      } else {
        toast.error('Restaurante não possui WhatsApp configurado');
      }
    }

    localStorage.setItem('customerPhone', phone);
    localStorage.setItem('meuovo_customer_name', name);
    if (user?.id) {
      updateStreak(user.id).then(result => {
        if (result.milestone) {
          setTimeout(() => toast.success(`🎉 ${result.milestone.label} — ${result.milestone.reward}`), 2000);
        }
      }).catch((err) => console.error('[Checkout] Streak update failed:', err));
      awardPlatformPoints(user.id, total).then(result => {
        if (result) {
          setTimeout(() => toast.success(`🏆 +${result.earned} pontos MEU OVO! Total: ${result.total} pts`), 3000);
        }
      }).catch((err) => console.error('[Checkout] Platform points failed:', err));
      checkAndAwardAchievements(user.id, {
        orderCount: 0,
        streakDays: 0,
        totalDonated: donationAmount,
        totalSpent: total,
        favoriteCount: 0,
        hasPix: paymentMethod === 'pix',
      }).then(newly => {
        if (newly.length > 0) {
          const all = getAllAchievements();
          newly.forEach(id => {
            const ach = all.find(a => a.id === id);
            if (ach) setTimeout(() => toast.success(`🏅 ${ach.icon} ${ach.label}: ${ach.description}`), 4000);
          });
        }
      }).catch((err) => console.error('[Checkout] Achievement check failed:', err));
    }
    clearCart();
    setSubmitted(true);
    setSubmitting(false);
  };

  if (submitted) {
    return (
      <div className={cn('min-h-screen checkout-dark flex items-center justify-center p-4', isDark ? 'bg-dark-bg' : 'bg-[#F5F5F5]')}>
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-2xl relative overflow-hidden"
        >
          <motion.div 
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 relative"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.2, 1] }}
              transition={{ delay: 0.4, duration: 0.5 }}
            >
              <Check size={48} className="text-green-500" />
            </motion.div>
            <motion.div 
              animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="absolute inset-0 bg-green-200 rounded-full -z-10"
            />
          </motion.div>
          <motion.h2 
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="font-black text-3xl text-[#111] mb-2"
          >
            {t('checkout.confirmationTitle')}
          </motion.h2>
          <motion.p 
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="text-gray-500 mb-6"
          >
            {t('checkout.confirmationSubtitle', { id: orderId })}
          </motion.p>
          
          <AnimatePresence>
            {paymentMethod === 'pix' && (
              <motion.div 
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.7 }}
                className="bg-slate-50 border border-slate-100 rounded-[2rem] p-6 mb-8 text-center"
              >
                <div className="flex flex-col items-center gap-4">
                  {restaurant?.pixKey ? (
                    (() => {
                      const pixCode = generatePixPayload({
                        key: restaurant.pixKey!,
                        name: restaurant.name || 'MEU OVO',
                        amount: total,
                        txid: orderId ? orderId.replace(/[^a-zA-Z0-9]/g, 'X').slice(-25).toUpperCase() : '***'
                      });
                      return (
                        <>
      <QRCodeSVG
        value={pixCode}
        size={180}
        level="M"
        className="rounded-2xl border border-slate-100 shadow-sm"
      />
                          <div className="w-full space-y-3">
                            <div className="p-4 bg-white border border-slate-100 rounded-xl font-mono text-[10px] break-all text-slate-500 relative group overflow-hidden">
                              <div className="truncate pr-8">
                                {pixCode}
                              </div>
                              <motion.button
                                whileTap={{ scale: 0.9 }}
                                onClick={() => {
                                  navigator.clipboard.writeText(pixCode).catch(() => {});
                                  toast.success(t('checkout.pixSuccess') || 'PIX copiado!');
                                }}
                                title={t('checkout.pixCopy') || 'Copiar'}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-3 bg-[#FFC928] text-black rounded-lg shadow-sm"
                              >
                                <Ticket size={14} />
                              </motion.button>
                            </div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{t('checkout.pixInstructions')}</p>
                          </div>
                        </>
                      );
                    })()
                  ) : (
                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl text-center">
                      <AlertTriangle size={24} className="mx-auto mb-2 text-yellow-600" />
                      <p className="text-sm font-bold text-yellow-800">Restaurante não configurou chave PIX</p>
                      <p className="text-xs text-yellow-700 mt-1">Selecione outra forma de pagamento ou aguarde a configuração.</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {['credit', 'debit', 'voucher'].includes(paymentMethod) && (
              <motion.div
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.7 }}
                className="bg-slate-50 border border-slate-100 rounded-[2rem] p-6 mb-8 text-center"
              >
                <div className="flex flex-col items-center gap-4">
                  <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-slate-100">
                    <CreditCard size={32} className="text-slate-700" />
                  </div>
                  <div className="space-y-2">
                    <p className="font-black text-sm text-[#111]">
                      {paymentMethod === 'credit' && 'Pagar com Cartão de Crédito'}
                      {paymentMethod === 'debit' && 'Pagar com Cartão de Débito'}
                      {paymentMethod === 'voucher' && 'Pagar com Vale-Refeição'}
                    </p>
                    <p className="text-[10px] text-slate-500 font-bold px-4">
                      Clique no botão abaixo para ser redirecionado ao link de pagamento do restaurante.
                    </p>
                    {(() => {
                      const link = paymentMethod === 'credit' ? restaurant?.paymentSettings?.creditCardLink : paymentMethod === 'debit' ? restaurant?.paymentSettings?.debitLink : restaurant?.paymentSettings?.voucherLink;
                      if (!link) return (
                        <p className="text-[10px] font-black text-red-400 uppercase tracking-widest mt-3">
                          Link de pagamento não configurado pelo restaurante
                        </p>
                      );
                      return (
                        <a href={link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 mt-3 px-8 py-4 bg-[#111] text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-black transition-all shadow-lg">
                          <CreditCard size={18} /> Ir para Pagamento
                        </a>
                      );
                    })()}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-3">
            <button
              onClick={() => navigate(`/pedido/${orderId}`)}
              className="w-full bg-[#FFC928] text-[#111] font-black py-5 rounded-2xl hover:bg-[#e6b520] transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-yellow-500/20"
            >
              Acompanhar pedido em tempo real
            </button>
            <button
              onClick={() => navigate(`/r/${restaurant?.slug || ''}`)}
              className="w-full bg-[#111111] text-white font-black py-5 rounded-2xl hover:bg-[#222] transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-black/10"
            >
              Voltar ao cardápio
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (!restaurant) {
    return <Navigate to="/carrinho" replace />;
  }

  return (
    <div className={cn('min-h-screen checkout-dark', isDark ? 'bg-dark-bg' : 'bg-[#F5F5F5]')}>
      <SEO title="Finalizar Pedido" description="Revise seu carrinho e finalize seu pedido no MEU OVO. Pagamento por PIX, cartão ou dinheiro." url="/checkout" />
      <div className="bg-white border-b border-gray-100 px-4 py-4 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto flex items-center gap-4">
          <button onClick={() => navigate(-1)} aria-label="Voltar" className="p-3 rounded-full hover:bg-gray-100 transition-colors">
            <ArrowLeft size={20} />
          </button>
          <h1 className="font-black text-[#111] text-xl">{t('checkout.title')}</h1>
        </div>
      </div>

      <motion.div 
        initial="hidden"
        animate="show"
        variants={{
          hidden: { opacity: 0 },
          show: {
            opacity: 1,
            transition: {
              staggerChildren: 0.1
            }
          }
        }}
        className="max-w-2xl mx-auto px-4 py-6 space-y-4"
      >
        {/* Express checkout toggle */}
        <motion.div 
          variants={{ hidden: { y: 20, opacity: 0 }, show: { y: 0, opacity: 1 } }}
          className="bg-white rounded-2xl p-3 shadow-sm flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#FFC928] rounded-xl flex items-center justify-center">
              <Zap size={16} className="text-[#111]" />
            </div>
            <div>
              <p className="text-sm font-black text-[#111] uppercase tracking-tight">Checkout Express</p>
              <p className="text-[9px] text-gray-400 font-bold">Apenas o essencial para pedir mais rápido</p>
            </div>
          </div>
          <button
            onClick={() => setIsExpress(!isExpress)}
            className={`relative w-12 h-7 rounded-full transition-colors p-1 ${isExpress ? 'bg-[#FFC928]' : 'bg-gray-200'}`}
          >
            <motion.div 
              animate={{ x: isExpress ? 22 : 0 }}
              className="w-5 h-5 bg-white rounded-full shadow-sm"
            />
          </button>
        </motion.div>

        {/* Personal data */}
        <motion.div 
          variants={{ hidden: { y: 20, opacity: 0 }, show: { y: 0, opacity: 1 } }}
          className="bg-white rounded-2xl p-5 shadow-sm border border-transparent focus-within:border-[#FFC928]/30 transition-colors"
        >
          <h2 className="font-bold text-[#111] mb-4 flex items-center gap-2">
            <div className="w-1.5 h-4 bg-[#FFC928] rounded-full" />
            {t('checkout.personalData')}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('checkout.fullName')} *</label>
              <input
                type="text"
                value={name}
                onChange={handleNameChange}
                placeholder="Ex: João Silva"
                className={cn(
                  "w-full border rounded-xl px-4 py-3 text-sm font-bold focus:outline-none transition-all",
                  nameError ? "border-red-200 bg-red-50/30" : "border-gray-100 focus:border-[#FFC928] bg-slate-50/50"
                )}
              />
              {nameError && <p className="text-red-500 text-[10px] font-black uppercase tracking-widest ml-1">{nameError}</p>}
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('checkout.whatsapp')} *</label>
              <input
                type="tel"
                value={phone}
                onChange={handlePhoneChange}
                placeholder="(11) 99999-9999"
                className={cn(
                  "w-full border rounded-xl px-4 py-3 text-sm font-bold focus:outline-none transition-all",
                  phoneError ? "border-red-200 bg-red-50/30" : "border-gray-100 focus:border-[#FFC928] bg-slate-50/50"
                )}
              />
              {phoneError && <p className="text-red-500 text-[10px] font-black uppercase tracking-widest ml-1">{phoneError}</p>}
            </div>
          </div>

          {isCheckingReputation && (
            <div className="text-[10px] font-black text-slate-400 tracking-widest mt-3 flex items-center gap-1.5 animate-pulse uppercase">
              <div className="w-2.5 h-2.5 rounded-full border-2 border-t-transparent border-red-500 animate-spin" /> Buscando cadastro do cliente...
            </div>
          )}

          {customerStats && customerStats.totalRatings > 0 && (
            <div className={cn(
              "mt-4 p-4 rounded-xl border-2 transition-all duration-300",
              customerStats.isProblematic
                ? "bg-red-50 border-red-200 text-red-700"
                : customerStats.averageRating >= 4.0
                  ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                  : "bg-amber-50 border-amber-200 text-amber-800"
            )}>
              <div className="flex items-center gap-2 mb-1.5 font-sans font-black uppercase text-[10px] tracking-widest">
                <span className="text-xs">★</span>
                <span>REPUTAÇÃO DO CLIENTE: {customerStats.averageRating.toFixed(1)} / 5.0 ({customerStats.totalRatings} avaliações)</span>
              </div>
              <p className="font-sans font-semibold text-xs leading-relaxed">
                {customerStats.isProblematic 
                  ? `Aviso importante: Este número está sinalizado com histórico de incidentes em entregas anteriores (Média: ${customerStats.averageRating.toFixed(1)}★). ${restaurant.orderSettings?.blockProblematicCustomers ? "O estabelecimento possui o bloqueio ativo e não poderá aceitar este pedido." : "Seu pedido ficará sujeito a análise de segurança extra antes do envio."}`
                  : `Seu perfil está classificado como "${customerStats.statusText}". Obrigado por ser um excelente cliente parceiro!`}
              </p>
            </div>
          )}
        </motion.div>

        {/* Order type */}
        <motion.div 
          variants={{ hidden: { y: 20, opacity: 0 }, show: { y: 0, opacity: 1 } }}
          className="bg-white rounded-2xl p-5 shadow-sm"
        >
          <h2 className="font-bold text-[#111] mb-4 flex items-center gap-2">
            <div className="w-1.5 h-4 bg-[#FFC928] rounded-full" />
            {t('checkout.orderType')}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {([
              { value: 'delivery', label: t('checkout.delivery'), icon: <MapPin size={20} />, enabled: restaurant.deliveryEnabled },
              { value: 'pickup', label: t('checkout.pickup'), icon: <Package size={20} />, enabled: restaurant.pickupEnabled },
              { value: 'dine-in', label: t('checkout.dineIn'), icon: <UtensilsCrossed size={20} />, enabled: restaurant.dineInEnabled },
            ] as const).map(opt => (
              <motion.button
                key={opt.value}
                whileHover={opt.enabled ? { y: -2 } : {}}
                whileTap={opt.enabled ? { scale: 0.95 } : {}}
                disabled={!opt.enabled}
                onClick={() => setOrderType(opt.value)}
                className={cn(
                  "flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all relative overflow-hidden",
                  !opt.enabled 
                    ? 'opacity-40 cursor-not-allowed border-gray-50 bg-gray-50/50' 
                    : orderType === opt.value 
                      ? 'border-[#FFC928] bg-[#FFF8E1] shadow-lg shadow-yellow-100/50' 
                      : 'border-gray-50 bg-slate-50/30 hover:border-gray-200'
                )}
              >
                <div className={cn(
                  "p-2 rounded-xl transition-colors",
                  orderType === opt.value ? 'bg-[#FFC928] text-white' : 'bg-white text-gray-400'
                )}>
                  {opt.icon}
                </div>
                <span className={cn(
                  "text-xs font-black uppercase tracking-tight",
                  orderType === opt.value ? 'text-[#111]' : 'text-gray-400'
                )}>
                  {opt.label}
                </span>
                {orderType === opt.value && (
                  <motion.div 
                    layoutId="type-active"
                    className="absolute inset-0 bg-[#FFC928]/5 pointer-events-none"
                  />
                )}
              </motion.button>
            ))}
          </div>

          <AnimatePresence>
            {orderType === 'dine-in' && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="mt-4 overflow-hidden"
              >
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">{t('checkout.tableNumber')} *</label>
                <input
                  type="text"
                  value={tableNumber}
                  onChange={e => setTableNumber(e.target.value)}
                  placeholder="Ex: 5"
                  className="w-full border border-gray-100 bg-slate-50/50 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-[#FFC928] focus:bg-white transition-all"
                />
              </motion.div>
            )}

            {orderType === 'delivery' && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="mt-4 space-y-4 overflow-hidden"
              >
                {restaurant.deliverySettings?.feeByNeighborhood && restaurant.deliverySettings.feeByNeighborhood.length > 0 && (
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 block">Bairro de entrega *</label>
                    <select
                      value={selectedNeighborhood}
                      onChange={e => setSelectedNeighborhood(e.target.value)}
                      className="w-full border border-gray-100 bg-slate-50/50 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-[#FFC928] focus:bg-white transition-all appearance-none cursor-pointer"
                    >
                      <option value="">Selecione seu bairro...</option>
                      {restaurant.deliverySettings.feeByNeighborhood.map(n => (
                        <option key={n.neighborhood} value={n.neighborhood}>
                          {n.neighborhood} (R$ {n.fee.toFixed(2)})
                        </option>
                      ))}
                      <option value="other">Outros bairros (R$ {restaurant.deliverySettings.fee.toFixed(2)})</option>
                    </select>
                  </div>
                )}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 block">Endereço completo *</label>
                  {(() => {
                    try { const saved: SavedAddress[] = JSON.parse(localStorage.getItem('meuovo_addresses') || '[]'); if (saved.length > 0) return saved; return []; } catch { return []; }
                  })().length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2">
                      {(() => { try { return JSON.parse(localStorage.getItem('meuovo_addresses') || '[]') as SavedAddress[]; } catch { return []; } })().map(addr => (
                        <button key={addr.id} type="button"
                          onClick={() => setDeliveryAddress(`${addr.street}, ${addr.number}${addr.complement ? ` - ${addr.complement}` : ''} - ${addr.neighborhood}, ${addr.city}`)}
                          className={`text-[9px] font-black uppercase tracking-widest px-3 py-2.5 rounded-xl border transition-all ${deliveryAddress.includes(addr.street) ? 'bg-[#FFC928] border-[#FFC928] text-black' : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-[#FFC928]'}`}
                        >
                          {addr.label}
                        </button>
                      ))}
                    </div>
                  )}
                  <input
                    type="text"
                    value={deliveryAddress}
                    onChange={e => setDeliveryAddress(e.target.value)}
                    placeholder="Rua, número, complemento"
                    className="w-full border border-gray-100 bg-slate-50/50 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-[#FFC928] focus:bg-white transition-all"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {!isExpress && (
        /* Scheduled order */
        <motion.div 
          variants={{ hidden: { y: 20, opacity: 0 }, show: { y: 0, opacity: 1 } }}
          className="bg-white rounded-2xl p-5 shadow-sm"
        >
          <h2 className="font-bold text-[#111] mb-4 flex items-center gap-2">
            <div className="w-1.5 h-4 bg-[#FFC928] rounded-full" />
            Agendar Pedido
          </h2>
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 block">
              Data e hora (opcional)
            </label>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={e => setScheduledAt(e.target.value)}
              min={(() => { const now = new Date(); return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16); })()}
              className="w-full border border-gray-100 bg-slate-50/50 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-[#FFC928] focus:bg-white transition-all"
            />
            {scheduledAt && (
              <p className="text-[10px] font-black text-brand-egg tracking-widest ml-1">
                Pedido agendado para {new Date(scheduledAt).toLocaleString('pt-BR')}
              </p>
            )}
          </div>
        </motion.div>
        )}

        {/* Payment */}
        <motion.div 
          variants={{ hidden: { y: 20, opacity: 0 }, show: { y: 0, opacity: 1 } }}
          className="bg-white rounded-2xl p-5 shadow-sm"
        >
          <h2 className="font-bold text-[#111] mb-4 flex items-center gap-2">
            <div className="w-1.5 h-4 bg-[#FFC928] rounded-full" />
            {t('checkout.paymentMethod')}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {([
              { value: 'pix', label: 'PIX', icon: <Smartphone size={20} />, disabled: false },
              { value: 'cash', label: 'Dinheiro', icon: <Banknote size={20} />, disabled: false },
              { value: 'card-on-delivery', label: 'Cartão na entrega', icon: <CreditCard size={20} />, disabled: orderType !== 'delivery' },
              { value: 'on-site', label: 'No local', icon: <Store size={20} />, disabled: false },
              ...(restaurant?.paymentSettings?.acceptCreditCard ? [{ value: 'credit' as const, label: 'Cartão Crédito Online', icon: <CreditCard size={20} />, disabled: false }] : []),
              ...(restaurant?.paymentSettings?.acceptDebit ? [{ value: 'debit' as const, label: 'Cartão Débito Online', icon: <CreditCard size={20} />, disabled: false }] : []),
              ...(restaurant?.paymentSettings?.acceptVoucher ? [{ value: 'voucher' as const, label: 'Vale-Refeição', icon: <CreditCard size={20} />, disabled: false }] : []),
            ]).map(opt => (
              <motion.button
                key={opt.value}
                whileHover={!opt.disabled ? { scale: 1.02 } : {}}
                whileTap={!opt.disabled ? { scale: 0.98 } : {}}
                disabled={opt.disabled}
                onClick={() => !opt.disabled && setPaymentMethod(opt.value)}
                className={cn(
                  "flex items-center gap-3 p-4 rounded-2xl border-2 transition-all text-left relative group",
                  opt.disabled 
                    ? 'opacity-30 cursor-not-allowed border-gray-50 bg-gray-50/50' 
                    : paymentMethod === opt.value 
                      ? 'border-[#FFC928] bg-[#FFF8E1] shadow-lg shadow-yellow-100/30' 
                      : 'border-gray-50 bg-slate-50/30 hover:border-gray-200'
                )}
              >
                <div className={cn(
                  "p-2.5 rounded-xl transition-all",
                  paymentMethod === opt.value ? 'bg-[#FFC928] text-white rotate-12' : 'bg-white text-gray-400 group-hover:rotate-6'
                )}>
                  {opt.icon}
                </div>
                <div>
                  <p className="text-sm font-black text-[#111] uppercase tracking-tight">{opt.label}</p>
                  <p className="text-[9px] text-gray-400 uppercase font-black tracking-widest mt-0.5">
                    {opt.value === 'pix' ? 'Rápido e seguro' : 
                     opt.value === 'cash' ? 'Pague ao motoboy' : 
                     opt.value === 'card-on-delivery' ? 'Maquininha' : 
                     opt.value === 'credit' ? 'Link do restaurante' :
                     opt.value === 'debit' ? 'Link do restaurante' :
                     opt.value === 'voucher' ? 'Link do restaurante' : 'No balcão'}
                  </p>
                </div>
                {paymentMethod === opt.value && (
                  <motion.div 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="ml-auto w-6 h-6 bg-[#FFC928] rounded-full flex items-center justify-center border-2 border-white shadow-sm"
                  >
                    <Check size={14} className="text-white" strokeWidth={4} />
                  </motion.div>
                )}
              </motion.button>
            ))}
          </div>
          
          <AnimatePresence>
            {paymentMethod === 'cash' && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="mt-4 p-4 bg-slate-50 border border-slate-100 rounded-2xl overflow-hidden"
              >
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Precisa de troco?</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">R$</span>
                  <input
                    type="number"
                    value={changeFor}
                    onChange={e => setChangeFor(e.target.value)}
                    placeholder="Troco para quanto?"
                    className="w-full border border-gray-200 rounded-xl pl-10 pr-4 py-3 text-sm font-black focus:outline-none focus:border-[#FFC928] focus:bg-white transition-all"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Summary */}
        <motion.div 
          variants={{ hidden: { y: 20, opacity: 0 }, show: { y: 0, opacity: 1 } }}
          className="bg-white rounded-3xl p-6 shadow-xl shadow-black/5 relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-full h-2 bg-[#FFC928]" />
          <h2 className="font-black text-[#111] text-lg uppercase tracking-tight mb-6">{t('checkout.summary')}</h2>
          
          <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-2xl p-4 mb-6 select-none">
            <p className="text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 text-emerald-700">
              🌱 SEM INTERMEDIÁRIOS GULOSOS
            </p>
            <p className="text-xs font-bold text-slate-700 mt-1.5 leading-relaxed">
              Você economizou <span className="bg-emerald-500/15 px-1 py-0.5 rounded text-emerald-800 font-black text-xs">R$ {(subtotal * 0.25).toFixed(2)}</span> em comissões que o restaurante teria pago em outros apps no modelo tradicional!
            </p>
            <p className="text-[9px] font-semibold text-gray-500 mt-2 leading-relaxed">
              Esta compra é 100% direta entre você e o restaurante, livre de intermediários corporativos.
            </p>
          </div>

          {!isExpress && (<>
          {/* Loyalty Progress Bar + Reward Selection */}
          {loyaltyProfile && restaurant?.loyaltySettings?.enabled && (
            <div className="mb-4 p-4 bg-orange-50 rounded-2xl border border-orange-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-black text-orange-700 uppercase tracking-widest flex items-center gap-1.5">
                  <Gift size={14} /> Fidelidade {restaurant.name}
                </span>
                <span className="text-xs font-black text-orange-600">{loyaltyProfile.pointsBalance} pts</span>
              </div>
              {(() => {
                const rules = restaurant.loyaltySettings?.redemptionRules || [];
                const nextReward = rules.filter(r => r.pointsRequired > (loyaltyProfile?.pointsBalance || 0))
                  .sort((a, b) => a.pointsRequired - b.pointsRequired)[0];
                if (!nextReward) return null;
                const progress = Math.min(100, ((loyaltyProfile?.pointsBalance || 0) / nextReward.pointsRequired) * 100);
                return (
                  <div className="mb-3">
                    <div className="w-full h-2 bg-orange-200 rounded-full overflow-hidden">
                      <div className="h-full bg-orange-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
                    </div>
                    <p className="text-[9px] font-bold text-orange-600 mt-1">
                      Faltam {nextReward.pointsRequired - (loyaltyProfile?.pointsBalance || 0)} pts para: {nextReward.description}
                    </p>
                  </div>
                );
              })()}
              {(() => {
                const rules = restaurant.loyaltySettings?.redemptionRules || [];
                const available = rules.filter(r => r.pointsRequired <= (loyaltyProfile?.pointsBalance || 0));
                if (available.length === 0) return null;
                return (
                  <div>
                    <p className="text-[9px] font-bold text-orange-500 uppercase tracking-widest mb-2">
                      Recompensas disponíveis:
                    </p>
                    <div className="flex flex-col gap-1.5">
                      {available.map(rule => {
                        const isSelected = selectedReward?.description === rule.description;
                        return (
                          <button
                            key={rule.id}
                            type="button"
                            onClick={() => {
                              if (isSelected) {
                                setSelectedReward(null);
                              } else {
                                if (appliedCoupon) {
                                  setAppliedCoupon(null);
                                  toast('Cupom removido para usar recompensa de fidelidade', { icon: '🔄' });
                                }
                                setSelectedReward({
                                  type: rule.type,
                                  value: rule.value,
                                  pointsRequired: rule.pointsRequired,
                                  description: rule.description,
                                });
                              }
                            }}
                            className={cn(
                              "text-left px-3 py-2 rounded-xl text-[10px] font-bold transition-all border-2",
                              isSelected
                                ? "border-orange-500 bg-orange-100 text-orange-800"
                                : "border-orange-200 bg-white text-orange-700 hover:border-orange-300"
                            )}
                          >
                            <div className="flex items-center justify-between">
                              <span>{rule.description}</span>
                              <span className="text-orange-500">{rule.pointsRequired} pts</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* Tip */}
          <div className="mb-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 block">
              Gorjeta do entregador
            </label>
            <div className="flex gap-2">
              {tipOptions.map(pct => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => setTipPercent(pct)}
                    className={cn(
                      "flex-1 py-3.5 rounded-xl text-xs font-black uppercase tracking-widest border-2 transition-all",
                      tipPercent === pct
                        ? "border-[#FFC928] bg-[#FFF8E1] text-[#111]"
                        : "border-gray-100 bg-white text-gray-400 hover:border-gray-200"
                    )}
                >
                  {pct === 0 ? 'Sem' : `${pct}%`}
                </button>
              ))}
            </div>
            {tipAmount > 0 && (
              <p className="text-[10px] font-black text-emerald-600 tracking-widest mt-2 ml-1">
                Gorjeta: R$ {tipAmount.toFixed(2)}
              </p>
            )}
          </div>

          {/* Caixinha Meu OVO */}
          <div className="group mb-4 p-4 bg-amber-50 rounded-2xl border border-amber-200">
            <label className="text-[10px] font-black text-amber-700 uppercase tracking-widest mb-3 block flex items-center gap-2">
              🐣 Caixinha Meu OVO
              <span className="relative">
                <span className="text-[9px] text-amber-500 cursor-help border border-amber-300 rounded-full w-3.5 h-3.5 inline-flex items-center justify-center">?</span>
                <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-amber-900 text-white text-[8px] font-bold rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  Fortalece a plataforma e mantém o app gratuito pra todo mundo
                </span>
              </span>
            </label>
            <div className="flex gap-2">
              {caixinhaOptions.map(val => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setCaixinhaAmount(val)}
                  className={cn(
                    "flex-1 py-3.5 rounded-xl text-xs font-black uppercase tracking-widest border-2 transition-all",
                    caixinhaAmount === val
                      ? "border-amber-500 bg-amber-100 text-amber-800"
                      : "border-amber-100 bg-white text-amber-500 hover:border-amber-300"
                  )}
                >
                  {val === 0 ? 'Não' : `R$ ${val.toFixed(2)}`}
                </button>
              ))}
            </div>
          </div>

          {/* Social cause */}
          <div className="group mb-4 p-4 bg-rose-50 rounded-2xl border border-rose-200">
            <label className="text-[10px] font-black text-rose-700 uppercase tracking-widest mb-3 block flex items-center gap-2">
              ❤️ Ajude uma Causa Social
              <span className="relative">
                <span className="text-[9px] text-rose-500 cursor-help border border-rose-300 rounded-full w-3.5 h-3.5 inline-flex items-center justify-center">?</span>
                <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-rose-900 text-white text-[8px] font-bold rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  Doação para projetos sociais de comunidades parceiras
                </span>
              </span>
            </label>
            <div className="flex gap-2">
              {donationOptions.map(val => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setDonationAmount(val)}
                  className={cn(
                    "flex-1 py-3.5 rounded-xl text-xs font-black uppercase tracking-widest border-2 transition-all",
                    donationAmount === val
                      ? "border-rose-500 bg-rose-100 text-rose-800"
                      : "border-rose-100 bg-white text-rose-500 hover:border-rose-300"
                  )}
                >
                  {val === 0 ? 'Não' : `R$ ${val.toFixed(2)}`}
                </button>
              ))}
            </div>
          </div>
          </>)}

          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">Subtotal</span>
              <span className="font-black text-[#111]">R$ {subtotal.toFixed(2)}</span>
            </div>
            
            <AnimatePresence>
              {appliedCoupon && (
                <motion.div 
                  initial={{ x: -10, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  className="flex justify-between text-sm text-green-600 font-black"
                >
                  <span className="uppercase tracking-widest text-[10px]">Cupom ({appliedCoupon.code})</span>
                  <span>- R$ {discountValue.toFixed(2)}</span>
                </motion.div>
              )}
              {selectedReward && (
                <motion.div 
                  initial={{ x: -10, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  className="flex justify-between text-sm text-orange-600 font-black bg-orange-50 p-3 rounded-2xl"
                >
                  <div className="flex items-center gap-2">
                    <Gift size={14} />
                    <span className="uppercase tracking-widest text-[10px]">{selectedReward.description}</span>
                  </div>
                  <span>- R$ {discountValue.toFixed(2)}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex justify-between text-sm">
              <span className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">Taxa de entrega</span>
              <span className="font-black text-[#111]">{deliveryFee === 0 ? 'Grátis' : `R$ ${deliveryFee.toFixed(2)}`}</span>
            </div>


          </div>

          <div className="border-t border-gray-100 mt-6 pt-6 flex justify-between items-end">
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">Valor Final</span>
              <span className="font-display font-black text-[#111] text-4xl leading-none">R$ {total.toFixed(2)}</span>
            </div>
            <div className="text-right">
              <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest italic">{items.length} itens no total</p>
            </div>
          </div>
        </motion.div>

        {/* Disclaimer */}
        <motion.div
          variants={{ hidden: { y: 20, opacity: 0 }, show: { y: 0, opacity: 1 } }}
          className="bg-red-50 border border-red-200 rounded-3xl p-5 text-center"
        >
          <p className="text-[10px] font-black text-red-700 uppercase tracking-wider flex items-center justify-center gap-2 mb-1">
            <AlertTriangle size={14} /> Importante
          </p>
          <p className="text-[11px] font-bold text-red-600 leading-relaxed">
            O <strong>MEU OVO</strong> é apenas a vitrine e o sistema de pedidos. O pagamento é 100% direto entre você e o restaurante. Não processamos pagamentos, não garantimos reembolsos e não nos responsabilizamos por problemas entre as partes.
          </p>
        </motion.div>

        {/* Gratitude block */}
        <motion.div
          variants={{ hidden: { y: 20, opacity: 0 }, show: { y: 0, opacity: 1 } }}
          className="bg-amber-500/5 border border-amber-500/10 rounded-3xl p-5 text-center select-none"
        >
          <span className="text-4xl mb-2 block">🍳❤️</span>
          <h4 className="font-display font-black text-slate-800 uppercase italic text-xs tracking-tight">Muito obrigado por fortalecer o comércio do nosso bairro!</h4>
          <p className="text-[10px] font-semibold text-slate-500 mt-1 lines-relaxed leading-relaxed max-w-sm mx-auto">
            Ao escolher o pedido direto, seu ato ajuda a manter empregos locais e apoia as finanças saudáveis de famílias que amam a culinária da nossa comunidade.
          </p>
        </motion.div>

        <motion.button
          variants={{ hidden: { y: 20, opacity: 0 }, show: { y: 0, opacity: 1 } }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleSubmit}
          disabled={submitting || !name || !phone || (orderType === 'delivery' && (!deliveryAddress || (restaurant.deliverySettings?.feeByNeighborhood?.length ? !selectedNeighborhood : false))) || (orderType === 'dine-in' && !tableNumber) || !!nameError || !!phoneError}
          className="w-full bg-[#111111] text-white font-black py-6 rounded-2xl text-lg hover:bg-[#000] transition-all shadow-2xl shadow-black/20 flex items-center justify-center gap-3 disabled:opacity-40 disabled:cursor-not-allowed group"
        >
          <Smartphone size={24} className="group-hover:rotate-12 transition-transform" />
          <span>{t('checkout.sendWhatsApp')}</span>
        </motion.button>
        <p className="text-center text-[10px] font-black text-gray-400 uppercase tracking-widest pb-8 flex items-center justify-center gap-2">
          <UtensilsCrossed size={12} />
          Seu pedido será confirmado no chat
        </p>
      </motion.div>
    </div>
  );
}
