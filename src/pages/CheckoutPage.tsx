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
import { generatePixPayload } from '../lib/pix';
import { createDonationPix } from '../lib/donationService';
import QRCode from 'react-qr-code';
import { motion, AnimatePresence } from 'motion/react';

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
  const [donationAmount, setDonationAmount] = useState(1);
  const [donating, setDonating] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [orderId, setOrderId] = useState('');
  const [donationPix, setDonationPix] = useState<{ qrCode: string; ticketUrl: string } | null>(null);

  // Coupon state
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);

  // Loyalty state
  const [loyaltyProfile, setLoyaltyProfile] = useState<any | null>(null);
  const [selectedReward, setSelectedReward] = useState<any | null>(null);
  const [isCheckingLoyalty, setIsCheckingLoyalty] = useState(false);

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
  }, [phone, restaurant.id]);

  useEffect(() => {
    if (!restaurant || items.length === 0) {
      navigate('/carrinho');
    }
  }, [restaurant, items.length, navigate]);

  if (!restaurant || items.length === 0) return null;

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
        return;
      }

      if (coupon.usageLimit && (coupon.usageCount || 0) >= coupon.usageLimit) {
        toast.error('Este cupom atingiu o limite de usos');
        return;
      }

      if (subtotal < coupon.minOrderValue) {
        toast.error(`Pedido mínimo para este cupom: R$ ${coupon.minOrderValue.toFixed(2)}`);
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
    return restaurant.deliverySettings?.fee ?? deliverySettings.fixedFee;
  };

  const deliveryFee = getDeliveryFee();
  const total = subtotal + deliveryFee - discountValue;

  const handleSubmit = async () => {
    if (!name || !phone) {
      toast.error('Preencha nome e telefone');
      return;
    }

    if (!isPhoneValid(phone)) {
      setPhoneError('Por favor, insira um telefone válido com DDD');
      toast.error('Telefone inválido');
      return;
    }

    if (orderType === 'delivery' && (!deliveryAddress || (restaurant.deliverySettings?.feeByNeighborhood?.length ? !selectedNeighborhood : false))) {
      toast.error('Preencha os dados de entrega');
      return;
    }

    if (orderType === 'dine-in' && !tableNumber) {
      toast.error('Informe o número da mesa');
      return;
    }

    const id = `ORD${Date.now().toString().slice(-6)}`;
    
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
      donationAmount: donating ? donationAmount : 0,
      couponCode: appliedCoupon?.code,
      couponDiscount: appliedCoupon ? discountValue : undefined,
      total: total,
      observations: observations || undefined,
      createdAt: new Date().toISOString(),
      origin: 'marketplace',
    };

    addOrder(order);
    setOrderId(id);

    // Generate Mercado Pago PIX for donation (separate from order)
    if (donating && donationAmount > 0) {
      createDonationPix({
        amount: donationAmount,
        customerName: name,
        customerEmail: '',
        orderId: id,
      }).then(setDonationPix).catch((err) => {
        console.error('Donation PIX error:', err);
        toast.error('Erro ao gerar PIX de doação. Sua doação não foi processada.');
      });
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
      }
    }

    // Increment coupon usage if applied
    if (appliedCoupon) {
      try {
        updateDoc(doc(db, 'coupons', appliedCoupon.id), {
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
    const donationText = donating ? `\nDoação social (via Mercado Pago): R$ ${donationAmount.toFixed(2)}` : '';
    const couponText = appliedCoupon ? `\nCupom: ${appliedCoupon.code} (- R$ ${discountValue.toFixed(2)})` : '';
    const changeText = paymentMethod === 'cash' && changeFor ? `\nTroco para: R$ ${changeFor}` : '';
    const obsText = observations ? `\nObservações gerais: ${observations}` : '';

    const msg = `*MEU OVO 🥚 - NOVO PEDIDO*\n` +
                `----------------------------------\n` +
                `*ID:* #${id}\n` +
                `*Cliente:* ${name}\n` +
                `*Telefone:* ${phone}\n` +
                `*Tipo:* ${typePt[orderType]}\n` +
                `*${locationText}*\n` +
                `*Pagamento:* ${payPt[paymentMethod]}${changeText}\n` +
                `----------------------------------\n\n` +
                `*ITENS:*\n${itemsText}\n\n` +
                `${observations ? `*OBSERVAÇÕES:*\n${observations}\n\n` : ''}` +
                `*RESUMO FINANCEIRO:*\n` +
                `Subtotal: R$ ${subtotal.toFixed(2)}\n` +
                `Entrega: R$ ${deliveryFee.toFixed(2)}` +
                `${donationText}${couponText}\n` +
                `*TOTAL: R$ ${total.toFixed(2)}*\n\n` +
                `*Acompanhe seu pedido:* ${window.location.origin}/pedido/${id}\n\n` +
                `✅ Enviado via *MEU OVO*`;

    const cleanRestaurantPhone = restaurant.whatsapp.replace(/\D/g, '');
    const whatsappUrl = `https://wa.me/${cleanRestaurantPhone}?text=${encodeURIComponent(msg)}`;
    window.open(whatsappUrl, '_blank');

    localStorage.setItem('customerPhone', phone);
    clearCart();
    setSubmitted(true);
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
                    {restaurant.pixKey ? (
                      <QRCode
                        value={generatePixPayload({
                          key: restaurant.pixKey,
                          name: restaurant.name,
                          amount: total,
                          txid: orderId,
                        })}
                        size={160}
                        style={{ height: 'auto', maxWidth: '100%', width: '100%' }}
                      />
                    ) : (
                      <p className="text-xs text-gray-400 text-center px-4">
                        Restaurante ainda não configurou chave PIX
                      </p>
                    )}
                  </div>

                  <div className="w-full space-y-3">
                    {restaurant.pixKey && (() => {
                      const payload = generatePixPayload({
                        key: restaurant.pixKey,
                        name: restaurant.name,
                        amount: total,
                        txid: orderId,
                      });
                      return (
                        <div className="p-4 bg-white border border-slate-100 rounded-xl font-mono text-[10px] break-all text-slate-500 relative group overflow-hidden">
                          <div className="truncate pr-8">{payload}</div>
                          <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={() => {
                              navigator.clipboard.writeText(payload);
                              toast.success(t('checkout.pixSuccess') || 'PIX copiado!');
                            }}
                            title={t('checkout.pixCopy') || 'Copiar'}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-[#FFC928] text-black rounded-lg shadow-sm"
                          >
                            <Ticket size={14} />
                          </motion.button>
                        </div>
                      );
                    })()}
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{t('checkout.pixInstructions')}</p>
                  </div>
                </div>
              </motion.div>
            )}

            {donating && donationPix && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                className="bg-red-50 rounded-2xl p-4 mb-8 border border-red-100 overflow-hidden"
              >
                <Heart size={24} className="text-red-500 mx-auto mb-2" />
                <p className="text-red-600 text-sm font-black uppercase tracking-tight text-center mb-4">
                  {t('checkout.thanksDonation')}<br />
                  <span className="text-xs opacity-80">{t('checkout.differenceDonation')}</span>
                </p>
                <div className="bg-white rounded-xl p-4 flex flex-col items-center gap-3">
                  {donationPix.qrCode && (
                    <QRCode value={donationPix.qrCode} size={140} style={{ height: 'auto', maxWidth: '100%', width: '100%' }} />
                  )}
                  {donationPix.qrCode && (
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(donationPix.qrCode);
                        toast.success('Código PIX da doação copiado!');
                      }}
                      className="text-xs font-bold text-red-600 underline"
                    >
                      Copiar código PIX da doação
                    </button>
                  )}
                  {donationPix.ticketUrl && (
                    <a
                      href={donationPix.ticketUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full bg-red-600 text-white font-bold py-3 rounded-xl text-sm text-center hover:bg-red-700 transition-colors"
                    >
                      Pagar doação via Mercado Pago
                    </a>
                  )}
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

        {/* Donation */}
        <motion.div 
          variants={{ hidden: { y: 20, opacity: 0 }, show: { y: 0, opacity: 1 } }}
          className="bg-white rounded-2xl p-6 border-2 border-dashed border-red-200 shadow-sm relative overflow-hidden"
        >
          {donating && (
            <motion.div 
              layoutId="donation-pulse"
              className="absolute inset-0 bg-red-50/50 -z-10" 
            />
          )}
          <div className="flex items-start gap-3 mb-5">
            <div className="p-3 bg-red-50 rounded-2xl text-red-500">
              <Heart size={24} fill={donating ? "currentColor" : "none"} className={donating ? "animate-pulse" : ""} />
            </div>
            <div>
              <h2 className="font-display font-black text-[#111] text-lg uppercase tracking-tight">{t('checkout.donationTitle')}</h2>
              <p className="text-gray-500 text-xs mt-1 leading-relaxed">
                {t('checkout.donationSubtitle')}
              </p>
            </div>
          </div>

          <div className="flex gap-2 mb-4">
            {[1, 2, 3].map(v => (
              <motion.button
                key={v}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => { setDonating(true); setDonationAmount(v); }}
                className={cn(
                  "flex-1 py-3 rounded-2xl border-2 text-sm font-black transition-all",
                  donating && donationAmount === v 
                    ? 'border-red-500 bg-red-500 text-white shadow-lg shadow-red-200' 
                    : 'border-slate-50 bg-slate-50/50 text-slate-500 hover:border-red-200 hover:text-red-500'
                )}
              >
                R$ {v}
              </motion.button>
            ))}
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setDonating(true)}
              className={cn(
                "flex-1 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all",
                donating ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-400'
              )}
            >
              {donating ? `${t('checkout.donate')} (R$ ${donationAmount})` : t('checkout.donate')}
            </button>
            {!donating && (
              <button
                onClick={() => setDonating(false)}
                className="flex-1 py-4 rounded-2xl font-black text-xs uppercase tracking-widest bg-white border-2 border-slate-50 text-slate-300 hover:border-slate-200"
              >
                {t('checkout.notThisTime')}
              </button>
            )}
          </div>
        </motion.div>

        {/* Summary */}
        <motion.div 
          variants={{ hidden: { y: 20, opacity: 0 }, show: { y: 0, opacity: 1 } }}
          className="bg-white rounded-3xl p-6 shadow-xl shadow-black/5 relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-full h-2 bg-[#FFC928]" />
          <h2 className="font-black text-[#111] text-lg uppercase tracking-tight mb-6">{t('checkout.summary')}</h2>
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

            <AnimatePresence>
              {donating && (
                <motion.div 
                  initial={{ x: -10, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  className="flex justify-between text-sm text-red-500 font-black"
                >
                  <span className="uppercase tracking-widest text-[10px]">Doação Social (Mercado Pago)</span>
                  <span>R$ {donationAmount.toFixed(2)}</span>
                </motion.div>
              )}
            </AnimatePresence>
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

        <motion.button
          variants={{ hidden: { y: 20, opacity: 0 }, show: { y: 0, opacity: 1 } }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleSubmit}
          disabled={!name || !phone || (orderType === 'delivery' && (!deliveryAddress || (restaurant.deliverySettings?.feeByNeighborhood?.length ? !selectedNeighborhood : false))) || (orderType === 'dine-in' && !tableNumber) || !!nameError || !!phoneError}
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
