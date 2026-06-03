import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, UtensilsCrossed, Package, Heart, Check, CreditCard, Banknote, Smartphone, Store, Ticket, Gift } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useCart } from '../context/CartContext';
import { useRestaurant } from '../context/RestaurantContext';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, limit, doc, updateDoc, increment, arrayUnion } from 'firebase/firestore';
import { Order, Coupon } from '../types';
import { toast } from 'react-hot-toast';
import { formatCurrency, cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { generatePixPayload } from '../lib/pix';
import { getCustomerStats, checkCouponTargeting } from '../services/customerRatingService';

type OrderType = 'dine-in' | 'delivery' | 'pickup';
type PaymentMethod = 'pix' | 'cash' | 'card-on-delivery' | 'on-site';

export default function CheckoutPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { items, subtotal, clearCart, tableNumber: cartTableNumber } = useCart();
  const { restaurants, deliverySettings, addOrder } = useRestaurant();
  const { user } = useAuth();

  const restaurantId = items[0]?.product.restaurantId;
  const restaurant = restaurants.find(r => r.id === restaurantId);

  const [name, setName] = useState('');
  const [nameError, setNameError] = useState('');
  const [phone, setPhone] = useState('');
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
  const [loyaltyProfile, setLoyaltyProfile] = useState<any | null>(null);
  const [selectedReward, setSelectedReward] = useState<any | null>(null);
  const [isCheckingLoyalty, setIsCheckingLoyalty] = useState(false);

  // Customer Reputation Stats state
  const [customerStats, setCustomerStats] = useState<any | null>(null);
  const [isCheckingReputation, setIsCheckingReputation] = useState(false);

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
      if (!phone || phone.replace(/\D/g, '').length < 10) {
        setLoyaltyProfile(null);
        return;
      }
      setIsCheckingLoyalty(true);
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
      navigate('/carrinho');
    }
  }, [restaurant, items.length, navigate]);

  const handleApplyCoupon = async () => {
    if (!couponInput.trim()) return;
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

  const getDeliveryFee = () => {
    if (orderType !== 'delivery') return 0;
    
    // Check if restaurant has specific fees for neighborhoods
    const neighborhoodFees = restaurant.deliverySettings?.feeByNeighborhood || [];
    const matched = neighborhoodFees.find(n => n.neighborhood === selectedNeighborhood);
    
    if (matched) return matched.fee;
    
    // Fallback to restaurant's default fee or context's deliverySettings
    return restaurant.deliverySettings?.fee ?? deliverySettings.fee ?? 0;
  };

  const deliveryFee = getDeliveryFee();
  const total = Math.max(0, subtotal + deliveryFee - discountValue);

  const handleSubmit = async () => {
    if (submitting) return;
    if (!name || !phone) {
      toast.error('Preencha nome e telefone');
      return;
    }

    if (!isPhoneValid(phone)) {
      setPhoneError('Por favor, insira um telefone válido com DDD');
      toast.error('Telefone inválido');
      return;
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
    const id = `ORD${Date.now().toString().slice(-6)}${Math.random().toString(36).slice(2, 4).toUpperCase()}`;
    
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
      userId: user?.uid,
      customerName: name,
      customerPhone: phone,
      type: orderType,
      tableNumber: orderType === 'dine-in' ? tableNumber : undefined,
      deliveryAddress: orderType === 'delivery' ? deliveryAddress : undefined,
      paymentMethod,
      changeFor: paymentMethod === 'cash' && changeFor ? Number(changeFor) : undefined,
      status: 'received',
      items: orderItems,
      subtotal,
      deliveryFee,
      donationAmount: 0,
      couponCode: appliedCoupon?.code,
      couponDiscount: appliedCoupon ? discountValue : undefined,
      total: total,
      observations: observations || undefined,
      createdAt: new Date().toISOString(),
      origin: 'marketplace',
    };

    await addOrder(order);
    setOrderId(id);

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
      }
    }

    // Build WhatsApp message
    const typePt = { 'dine-in': 'Salão', 'delivery': 'Delivery', 'pickup': 'Retirada' };
    const payPt = { pix: 'PIX', cash: 'Dinheiro', 'card-on-delivery': 'Cartão na entrega', 'on-site': 'Pagamento no local' };

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
                `----------------------------------\n\n` +
                `*ITENS:*\n${itemsText}\n\n` +
                `${observations ? `*OBSERVAÇÕES:*\n${observations}\n\n` : ''}` +
                `*RESUMO FINANCEIRO:*\n` +
                `Subtotal: R$ ${subtotal.toFixed(2)}\n` +
                `Entrega: R$ ${deliveryFee.toFixed(2)}${couponText}\n` +
                `*TOTAL: R$ ${total.toFixed(2)}*\n\n` +
                `*Acompanhe seu pedido:* ${window.location.origin}/pedido/${id}\n\n` +
                `✅ Enviado via *MEU OVO*`;

    const cleanRestaurantPhone = (restaurant.whatsapp || '').replace(/\D/g, '');
    if (cleanRestaurantPhone) {
      const whatsappUrl = `https://wa.me/${cleanRestaurantPhone}?text=${encodeURIComponent(msg)}`;
      window.open(whatsappUrl, '_blank');
    } else {
      toast.error('Restaurante não possui WhatsApp configurado');
    }

    localStorage.setItem('customerPhone', phone);
    clearCart();
    setSubmitted(true);
    setSubmitting(false);
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center p-4">
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
                  <div className="w-48 h-48 bg-white p-3 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-center relative group">
                    {/* Simulated QR Code */}
                    <div className="grid grid-cols-6 grid-rows-6 gap-1 w-full h-full opacity-80">
                      {[
                        [1,1,1,1,1,1],[1,0,0,0,1,1],[1,0,1,0,0,1],[1,1,0,0,0,1],[1,0,0,1,0,1],[1,1,1,1,1,1]
                      ].flat().map((v, i) => (
                        <div key={i} className={v ? 'bg-slate-800' : 'bg-transparent'} />
                      ))}
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center bg-white/40 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-800">QR Code</p>
                    </div>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-lg">
                      <Smartphone size={20} className="text-[#FFC928]" />
                    </div>
                  </div>

                  {(() => {
                    const dynamicPixCode = restaurant?.pixKey 
                      ? generatePixPayload({
                          key: restaurant.pixKey,
                          name: restaurant.name || 'MEU OVO',
                          amount: total,
                          txid: orderId ? orderId.replace(/[^a-zA-Z0-9]/g, 'X').slice(-25).toUpperCase() : '***'
                        })
                      : `00020126580014br.gov.bcb.pix0136${restaurant?.id}-order-${orderId}520400005303986540${total.toFixed(2)}5802BR5913MEU OVO6009SAO PAULO62070503***6304`;

                    return (
                      <div className="w-full space-y-3">
                        <div className="p-4 bg-white border border-slate-100 rounded-xl font-mono text-[10px] break-all text-slate-500 relative group overflow-hidden">
                          <div className="truncate pr-8">
                            {dynamicPixCode}
                          </div>
                          <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={() => {
                              navigator.clipboard.writeText(dynamicPixCode).catch(() => {});
                              toast.success(t('checkout.pixSuccess') || 'PIX copiado!');
                            }}
                            title={t('checkout.pixCopy') || 'Copiar'}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-[#FFC928] text-black rounded-lg shadow-sm"
                          >
                            <Ticket size={14} />
                          </motion.button>
                        </div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{t('checkout.pixInstructions')}</p>
                      </div>
                    );
                  })()}
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
              onClick={() => navigate(`/r/${restaurant.slug}`)}
              className="w-full bg-[#111111] text-white font-black py-5 rounded-2xl hover:bg-[#222] transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-black/10"
            >
              Voltar ao cardápio
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F5F5]">
      <div className="bg-white border-b border-gray-100 px-4 py-4 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-gray-100 transition-colors">
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
          <div className="grid grid-cols-3 gap-3">
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
              { value: 'pix', label: t('checkout.pix'), icon: <Smartphone size={20} />, disabled: false },
              { value: 'cash', label: t('checkout.cash'), icon: <Banknote size={20} />, disabled: false },
              { value: 'card-on-delivery', label: t('checkout.cardOnDelivery'), icon: <CreditCard size={20} />, disabled: orderType !== 'delivery' },
              { value: 'on-site', label: t('checkout.onSite'), icon: <Store size={20} />, disabled: false },
            ] as const).map(opt => (
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
                     opt.value === 'card-on-delivery' ? 'Maquininha' : 'No balcão'}
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
          className="w-full bg-[#111111] text-white font-black py-6 rounded-3xl text-lg hover:bg-[#000] transition-all shadow-2xl shadow-black/20 flex items-center justify-center gap-3 disabled:opacity-40 disabled:cursor-not-allowed group"
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
