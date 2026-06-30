import { useState, useEffect } from 'react';
import { Gift, Plus, Trash2, Save, Power, Percent, Award, Smartphone, TrendingUp, Sparkles, MessageCircle, DollarSign, Calendar, Heart, Clock, MapPin } from 'lucide-react';
import { db } from '../../lib/firebase';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  updateDoc, 
  doc, 
  onSnapshot,
  addDoc
} from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import { useRestaurant } from '../../context/RestaurantContext';
import { WA_NUMBER } from '../../services/whatsappService';
import { Button } from '../../components/Button';
import { toast } from 'react-hot-toast';
import { cn, formatCurrency } from '../../lib/utils';
import { Product } from '../../types';
import AdminLayout from './AdminLayout';
import { useTranslation } from 'react-i18next';

import { Skeleton } from '../../components/Skeleton';

export default function LoyaltyManagement() {
  const { t } = useTranslation();
  const { currentRestaurant: restaurant } = useRestaurant();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  
  const [settings, setSettings] = useState({
    enabled: restaurant?.loyaltySettings?.enabled || false,
    pointsPerReal: restaurant?.loyaltySettings?.pointsPerReal || 1,
    pointsPerOrder: restaurant?.loyaltySettings?.pointsPerOrder || 10,
    accumulationType: restaurant?.loyaltySettings?.accumulationType || 'amount',
    redemptionRules: restaurant?.loyaltySettings?.redemptionRules || [],
  });

  const [activeTab, setActiveTab] = useState<'settings' | 'customers'>('settings');
  const [loyaltyProfiles, setLoyaltyProfiles] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProfileHistory, setSelectedProfileHistory] = useState<any | null>(null);
  const [modalActiveTab, setModalActiveTab] = useState<'info' | 'orders'>('info');
  
  // Custom loyalty actions state
  const [addPointsValue, setAddPointsValue] = useState<string>('50');
  const [couponDiscountValue, setCouponDiscountValue] = useState<string>('15');
  const [generatedCouponCode, setGeneratedCouponCode] = useState<string>('');

  useEffect(() => {
    if (!restaurant) return;
    
    const fetchData = async () => {
      try {
        setInitialLoading(true);
        // Fetch products for free product rewards
        const qProd = query(collection(db, 'products'), where('restaurantId', '==', restaurant.id));
        const snapshot = await getDocs(qProd);
        const prods = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
        setProducts(prods);

        // Fetch loyalty profiles
        const qProfiles = query(collection(db, 'loyalty_profiles'), where('restaurantId', '==', restaurant.id));
        const profilesSnap = await getDocs(qProfiles);
        setLoyaltyProfiles(profilesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

        // Fetch orders for customer frequency analysis
        const qOrders = query(collection(db, 'orders'), where('restaurantId', '==', restaurant.id));
        const ordersSnap = await getDocs(qOrders);
        setOrders(ordersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

        setSettings({
          enabled: restaurant.loyaltySettings?.enabled || false,
          pointsPerReal: restaurant.loyaltySettings?.pointsPerReal || 1,
          pointsPerOrder: restaurant.loyaltySettings?.pointsPerOrder || 10,
          accumulationType: restaurant.loyaltySettings?.accumulationType || 'amount',
          redemptionRules: restaurant.loyaltySettings?.redemptionRules || [],
        });
      } finally {
        setInitialLoading(false);
      }
    };

    fetchData();
  }, [restaurant]);

  const filteredProfiles = loyaltyProfiles.filter(p => 
    p.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.customerPhone?.includes(searchTerm)
  ).sort((a, b) => (b.pointsBalance || 0) - (a.pointsBalance || 0));

  const handleSave = async () => {
    if (!restaurant) return;
    setLoading(true);
    try {
      await updateDoc(doc(db, 'restaurants', restaurant.id), {
        loyaltySettings: settings
      });
      toast.success(t('loyalty.success'));
    } catch (e) {
      toast.error(t('loyalty.error'));
    } finally {
      setLoading(false);
    }
  };

  const addRule = () => {
    const newRule = {
      id: Math.random().toString(36).substr(2, 9),
      type: 'discount_percent',
      value: 10,
      pointsRequired: 100,
      description: `10% ${t('loyalty.discountPercent')}`,
    };
    setSettings(prev => ({
      ...prev,
      redemptionRules: [...prev.redemptionRules, newRule]
    }));
  };

  const removeRule = (id: string) => {
    setSettings(prev => ({
      ...prev,
      redemptionRules: prev.redemptionRules.filter(r => r.id !== id)
    }));
  };

  const updateRule = (id: string, updates: Record<string, unknown>) => {
    setSettings(prev => ({
      ...prev,
      redemptionRules: prev.redemptionRules.map(r => r.id === id ? { ...r, ...updates } : r)
    }));
  };

  const handleManualAddPoints = async () => {
    if (!restaurant || !selectedProfileHistory) return;
    const pointsToAdd = parseInt(addPointsValue, 10);
    if (isNaN(pointsToAdd) || pointsToAdd <= 0) {
      toast.error('Informe um valor de pontos válido.');
      return;
    }

    try {
      const newPointsBalance = (selectedProfileHistory.pointsBalance || 0) + pointsToAdd;
      const newMovement = {
        id: Math.random().toString(36).substr(2, 9),
        type: 'earn',
        points: pointsToAdd,
        description: 'Bônus Especial de Fidelidade (Manual)',
        createdAt: new Date().toISOString()
      };
      const updatedHistory = [...(selectedProfileHistory.history || []), newMovement];

      await updateDoc(doc(db, 'loyalty_profiles', selectedProfileHistory.id), {
        pointsBalance: newPointsBalance,
        history: updatedHistory
      });

      const updatedProfile = {
        ...selectedProfileHistory,
        pointsBalance: newPointsBalance,
        history: updatedHistory
      };
      setSelectedProfileHistory(updatedProfile);

      setLoyaltyProfiles(prevProfiles =>
        prevProfiles.map(p => p.id === selectedProfileHistory.id ? updatedProfile : p)
      );

      toast.success(`Concedido ${pointsToAdd} pontos com sucesso!`);
      setAddPointsValue('50');
    } catch (e) {
      console.error("Erro ao atualizar pontos:", e);
      toast.error('Erro ao salvar os pontos.');
    }
  };

  const handleGenerateVIPCoupon = async () => {
    if (!restaurant || !selectedProfileHistory) return;
    const discount = parseInt(couponDiscountValue, 10);
    if (isNaN(discount) || discount <= 0 || discount > 100) {
      toast.error('Informe um desconto válido (1% a 100%).');
      return;
    }

    try {
      const firstName = selectedProfileHistory.customerName?.split(' ')[0]?.toUpperCase() || 'CLIENTE';
      const safeName = firstName.normalize('NFD').replace(/[\u0300-\u036f]/g, "").replace(/[^A-Z0-9]/g, '');
      const randomNum = Math.floor(100 + Math.random() * 900);
      const finalCode = `VIP-${safeName.slice(0, 6)}-${randomNum}`;

      await addDoc(collection(db, 'coupons'), {
        restaurantId: restaurant.id,
        code: finalCode,
        type: 'percent',
        value: discount,
        minimumOrder: 30,
        isActive: true,
        expiryDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
        description: `Ref: Cliente VIP ${selectedProfileHistory.customerName}`
      });

      setGeneratedCouponCode(finalCode);
      toast.success(`Cupom ${finalCode} criado e ativo com sucesso!`);
    } catch (e) {
      console.error("Erro ao gerar cupom:", e);
      toast.error('Erro ao salvar cupom.');
    }
  };

  if (initialLoading) {
    return (
      <div className="max-w-4xl space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="w-48 h-8" />
            <Skeleton className="w-64 h-3" />
          </div>
          <Skeleton className="w-32 h-10 rounded-lg" />
        </div>
        <Skeleton className="w-full h-48 rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="w-full h-40 rounded-xl" />
          <Skeleton className="w-full h-40 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-4xl space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 uppercase tracking-tight">{t('loyalty.title')}</h2>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t('loyalty.subtitle')}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant={activeTab === 'settings' ? 'default' : 'outline'} 
              size="sm" 
              onClick={() => setActiveTab('settings')}
              className="text-[10px] font-black uppercase tracking-widest px-4"
            >
              {t('loyalty.settings')}
            </Button>
            <Button 
              variant={activeTab === 'customers' ? 'default' : 'outline'} 
              size="sm" 
              onClick={() => setActiveTab('customers')}
              className="text-[10px] font-black uppercase tracking-widest px-4"
            >
              {t('loyalty.customers')} ({loyaltyProfiles.length})
            </Button>
          </div>
          {activeTab === 'settings' && (
            <Button onClick={handleSave} isLoading={loading} className="uppercase tracking-widest font-black text-xs h-10 px-6 ml-auto sm:ml-0">
               <Save size={16} className="mr-2" /> {t('loyalty.saveChanges')}
            </Button>
          )}
        </div>

        {activeTab === 'settings' ? (
          <div className="grid gap-6">
            {/* Main Activation */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
               <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "p-3 rounded-xl transition-colors",
                      settings.enabled ? "bg-orange-100 text-orange-600" : "bg-slate-100 text-slate-400"
                    )}>
                      <Gift size={24} />
                    </div>
                    <div>
                       <h3 className="font-bold text-slate-900">{t('loyalty.activateProgram')}</h3>
                       <p className="text-xs text-slate-400 font-medium">{t('loyalty.activateProgramSubtitle')}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setSettings(prev => ({ ...prev, enabled: !prev.enabled }))}
                    className={cn(
                      "h-6 w-12 rounded-full relative transition-colors duration-200",
                      settings.enabled ? "bg-orange-500" : "bg-slate-300"
                    )}
                  >
                    <div className={cn(
                      "absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-200",
                      settings.enabled ? "left-7" : "left-1"
                    )} />
                  </button>
               </div>

               <div className="space-y-6">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('loyalty.accumulationType')}</label>
                    <div className="grid grid-cols-2 gap-3">
                       <button 
                         onClick={() => setSettings(prev => ({ ...prev, accumulationType: 'amount' }))}
                         className={cn(
                           "p-4 rounded-xl border-2 transition-all text-left",
                           settings.accumulationType === 'amount' ? "border-orange-500 bg-orange-50" : "border-slate-100 bg-white"
                         )}
                       >
                          <p className="text-xs font-black uppercase mb-1">{t('loyalty.byAmount')}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">{t('loyalty.byAmountSubtitle')}</p>
                       </button>
                       <button 
                         onClick={() => setSettings(prev => ({ ...prev, accumulationType: 'order' }))}
                         className={cn(
                           "p-4 rounded-xl border-2 transition-all text-left",
                           settings.accumulationType === 'order' ? "border-orange-500 bg-orange-50" : "border-slate-100 bg-white"
                         )}
                       >
                          <p className="text-xs font-black uppercase mb-1">{t('loyalty.byOrder')}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">{t('loyalty.byOrderSubtitle')}</p>
                       </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">{t('loyalty.scoringRule')}</label>
                    <div className="flex items-center gap-3">
                       {settings.accumulationType === 'amount' ? (
                          <div className="flex-1 flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-md border border-slate-200">
                             <span className="text-sm font-bold text-slate-900">R$ 1.00 gasto =</span>
                             <input 
                               type="number" 
                               min="1"
                               className="w-16 bg-transparent border-none p-0 text-sm font-black text-orange-600 focus:ring-0"
                               value={settings.pointsPerReal}
                               onChange={(e) => setSettings(prev => ({ ...prev, pointsPerReal: parseInt(e.target.value) || 0 }))}
                             />
                             <span className="text-sm font-bold text-slate-900">{t('loyalty.points')}</span>
                          </div>
                       ) : (
                          <div className="flex-1 flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-md border border-slate-200">
                             <span className="text-sm font-bold text-slate-900">1 Pedido =</span>
                             <input 
                               type="number" 
                               min="1"
                               className="w-16 bg-transparent border-none p-0 text-sm font-black text-orange-600 focus:ring-0"
                               value={settings.pointsPerOrder}
                               onChange={(e) => setSettings(prev => ({ ...prev, pointsPerOrder: parseInt(e.target.value) || 0 }))}
                             />
                             <span className="text-sm font-bold text-slate-900">{t('loyalty.points')}</span>
                          </div>
                       )}
                    </div>
                  </div>
               </div>
            </div>

            {/* Redemption Rules */}
            <div className="space-y-4">
               <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">{t('loyalty.rewards')}</h3>
                  <Button variant="outline" size="sm" onClick={addRule} className="text-[10px] font-black tracking-widest uppercase">
                     <Plus size={14} className="mr-1" /> {t('loyalty.addReward')}
                  </Button>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   {settings.redemptionRules.map((rule: { id: string; type: string; value: string | number; pointsRequired: number; description: string }) => (
                    <div key={rule.id} className="bg-white rounded-xl border border-slate-200 p-4 space-y-4 relative group">
                        <button 
                          onClick={() => removeRule(rule.id)}
                          className="absolute top-2 right-2 p-1.5 text-slate-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                          aria-label="Excluir"
                        >
                           <Trash2 size={14} />
                       </button>

                       <div className="space-y-3">
                          <div className="flex gap-2">
                             <div className="flex-1 space-y-1">
                                <label className="text-[9px] font-black text-slate-500 uppercase tracking-tighter">{t('loyalty.type')}</label>
                                <select 
                                  className="w-full text-xs font-bold border border-slate-100 rounded bg-slate-50 p-1.5 focus:ring-1 focus:ring-orange-500 outline-none"
                                  value={rule.type}
                                  onChange={(e) => {
                                    const newType = e.target.value;
                                    const defaultVal = newType === 'free_product' ? '' : 10;
                                    const defaultDesc = newType === 'free_product' ? t('loyalty.freeProduct') : `10% ${t('loyalty.discountPercent')}`;
                                    updateRule(rule.id, { 
                                      type: newType,
                                      value: defaultVal,
                                      description: defaultDesc
                                    });
                                  }}
                                >
                                   <option value="discount_percent">{t('loyalty.discountPercent')}</option>
                                   <option value="free_product">{t('loyalty.freeProduct')}</option>
                                </select>
                             </div>
                             <div className="w-24 space-y-1">
                                <label className="text-[9px] font-black text-slate-500 uppercase tracking-tighter">{t('loyalty.pointsRequired')}</label>
                                <input 
                                  type="number"
                                  className="w-full text-xs font-bold border border-slate-100 rounded bg-slate-50 p-1.5 focus:ring-1 focus:ring-orange-500 outline-none"
                                  value={rule.pointsRequired}
                                  onChange={(e) => updateRule(rule.id, { pointsRequired: parseInt(e.target.value) || 0 })}
                                />
                             </div>
                          </div>

                          {rule.type === 'discount_percent' ? (
                            <div className="space-y-1">
                               <label className="text-[9px] font-black text-slate-500 uppercase tracking-tighter">{t('loyalty.discountLabel')}</label>
                               <input 
                                type="number"
                                className="w-full text-xs font-bold border border-slate-100 rounded bg-slate-50 p-1.5 focus:ring-1 focus:ring-orange-500 outline-none"
                                value={rule.value}
                                onChange={(e) => updateRule(rule.id, { value: parseInt(e.target.value) || 0, description: `${e.target.value}% ${t('loyalty.discountPercent')}` })}
                              />
                            </div>
                          ) : (
                            <div className="space-y-1">
                               <label className="text-[9px] font-black text-slate-500 uppercase tracking-tighter">{t('loyalty.productLabel')}</label>
                               <select 
                                  className="w-full text-xs font-bold border border-slate-100 rounded bg-slate-50 p-1.5 focus:ring-1 focus:ring-orange-500 outline-none"
                                  value={rule.value}
                                  onChange={(e) => {
                                    const prod = products.find(p => p.id === e.target.value);
                                    updateRule(rule.id, { value: e.target.value, description: `${prod?.name || t('loyalty.freeProduct')} ${t('loyalty.freeProduct')}` });
                                  }}
                                >
                                   <option value="">{t('loyalty.selectProduct')}</option>
                                   {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                            </div>
                          )}

                          <div className="pt-2">
                             <div className="bg-orange-50 text-orange-600 rounded p-2 border border-orange-100">
                                <p className="text-[10px] font-black uppercase tracking-tight">{rule.description || t('loyalty.rewards')}</p>
                             </div>
                          </div>
                       </div>
                    </div>
                  ))}
                  
                  {settings.redemptionRules.length === 0 && (
                    <div className="col-span-full py-12 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                       <Gift className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                       <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{t('loyalty.noRules')}</p>
                    </div>
                  )}
               </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
             <div className="relative">
                <input 
                   type="text" 
                   placeholder={t('common.search')}
                   className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-orange-500 outline-none transition-all pl-10"
                   value={searchTerm}
                   onChange={(e) => setSearchTerm(e.target.value)}
                />
                <Gift className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
             </div>

             <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                   <table className="w-full text-left">
                      <thead>
                         <tr className="bg-slate-50 border-b border-slate-200">
                            <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('checkout.name')}</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('order.phone')}</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('loyalty.balance')}</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">{t('common.actions')}</th>
                         </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                         {filteredProfiles.map(profile => (
                           <tr key={profile.id} className="hover:bg-slate-50 transition-colors">
                              <td className="px-6 py-4">
                                 <p className="text-sm font-bold text-slate-900">{profile.customerName || t('checkout.name')}</p>
                              </td>
                              <td className="px-6 py-4 text-xs font-medium text-slate-500">
                                 {profile.customerPhone}
                              </td>
                              <td className="px-6 py-4">
                                 <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center">
                                       <Gift size={14} />
                                    </div>
                                    <span className="text-sm font-black text-slate-900">{profile.pointsBalance || 0} pts</span>
                                 </div>
                              </td>
                              <td className="px-6 py-4 text-right">
                                 <button 
                                   onClick={() => setSelectedProfileHistory(profile)}
                                   className="text-[10px] font-black text-orange-600 uppercase tracking-widest hover:underline"
                                 >
                                   {t('loyalty.history')}
                                 </button>
                              </td>
                           </tr>
                         ))}
                         {filteredProfiles.length === 0 && (
                           <tr>
                              <td colSpan={4} className="px-6 py-12 text-center text-slate-400 text-xs font-bold uppercase tracking-widest">
                                 {t('menu.noProductsFound')}
                              </td>
                           </tr>
                         )}
                      </tbody>
                   </table>
                </div>
             </div>
          </div>
        )}

        {/* History Modal */}
        {selectedProfileHistory && (() => {
          const customerPhoneNormalized = selectedProfileHistory.customerPhone?.replace(/\D/g, '') || '';
          const customerOrders = orders.filter(o => {
            const phone = o.customerPhone?.replace(/\D/g, '') || '';
            return phone && (phone === customerPhoneNormalized || o.customerName?.toLowerCase() === selectedProfileHistory.customerName?.toLowerCase());
          });

          const totalOrders = customerOrders.length;
          const totalSpent = customerOrders.reduce((sum, o) => sum + (o.total || 0), 0);
          const averageTicket = totalOrders > 0 ? totalSpent / totalOrders : 0;

          let clientTier = 'Bronze';
          let tierColor = 'text-amber-700 bg-amber-50 border-amber-200';
          if (totalOrders >= 7) {
            clientTier = 'VIP Diamante 🏆';
            tierColor = 'text-purple-700 bg-purple-50 border-purple-200 animate-pulse';
          } else if (totalOrders >= 4) {
            clientTier = 'Ouro 🌟';
            tierColor = 'text-orange-700 bg-orange-50 border-orange-200';
          } else if (totalOrders >= 2) {
            clientTier = 'Prata';
            tierColor = 'text-slate-700 bg-slate-50 border-slate-200';
          }

          const productCounts: Record<string, { count: number; name: string }> = {};
          customerOrders.forEach(o => {
            if (o.items && Array.isArray(o.items)) {
               o.items.forEach((it: { productId?: string; productName?: string; quantity?: number }) => {
                const key = it.productId || it.productName;
                if (key) {
                  if (!productCounts[key]) {
                    productCounts[key] = { count: 0, name: it.productName };
                  }
                  productCounts[key].count += it.quantity || 1;
                }
              });
            }
          });
          const topProducts = Object.values(productCounts)
            .sort((a, b) => b.count - a.count)
            .slice(0, 3);

          // Calculate Purchase Frequency detail
          let frequencyCategory = 'Cliente Novo / Esporádico';
          let averageDaysValue = 'N/A';
          const sortedOrders = [...customerOrders].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
          
          if (totalOrders > 1) {
            const orderDates = sortedOrders
              .map(o => new Date(o.createdAt).getTime())
              .filter(t => !isNaN(t));
            
            if (orderDates.length > 1) {
              const spanMs = orderDates[orderDates.length - 1] - orderDates[0];
              const spanDays = Math.ceil(spanMs / (1000 * 60 * 60 * 24)) || 1;
              const avgIntervalNum = spanDays / (totalOrders - 1);
              averageDaysValue = `${avgIntervalNum.toFixed(1)} dias`;
              
              if (avgIntervalNum <= 3) {
                frequencyCategory = 'Fidelidade Diária 🔥';
              } else if (avgIntervalNum <= 7) {
                frequencyCategory = 'Frequência Semanal ⚡';
              } else if (avgIntervalNum <= 15) {
                frequencyCategory = 'Frequência Quinzenal 📅';
              } else if (avgIntervalNum <= 30) {
                frequencyCategory = 'Frequência Mensal 🛒';
              } else {
                frequencyCategory = 'Frequência Ocasional ⌛';
              }
            }
          }

          // Orders sorted for the second tab
          const newestOrders = [...customerOrders].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

          const getStatusText = (status: string) => {
            switch (status) {
              case 'received': return 'Recebido';
              case 'preparing': return 'Preparando';
              case 'ready': return 'Pronto';
              case 'out-for-delivery': return 'Em Entrega';
              case 'finished': return 'Finalizado';
              case 'cancelled': return 'Cancelado';
              default: return status;
            }
          };

          const getStatusBadgeClass = (status: string) => {
            switch (status) {
              case 'received': return 'bg-blue-50 text-blue-700 border-blue-200';
              case 'preparing': return 'bg-amber-50 text-amber-700 border-amber-200';
              case 'ready': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
              case 'out-for-delivery': return 'bg-purple-50 text-purple-700 border-purple-200';
              case 'finished': return 'bg-slate-50 text-slate-600 border-slate-200';
              case 'cancelled': return 'bg-rose-50 text-rose-700 border-rose-200';
              default: return 'bg-slate-50 text-slate-600 border-slate-200';
            }
          };

          return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto font-sans" role="dialog" aria-modal="true" aria-label="Perfil do cliente">
              <div className="bg-white w-full max-w-3xl rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between text-left">
                  <div>
                    <h3 className="text-lg font-black text-slate-900 italic uppercase">Ficha & Perfil Completo do Cliente</h3>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none mt-1">{selectedProfileHistory.customerName} &bull; {selectedProfileHistory.customerPhone}</p>
                  </div>
                  <button 
                    onClick={() => {
                      setSelectedProfileHistory(null);
                      setGeneratedCouponCode('');
                    }}
                    className="p-2 hover:bg-slate-50 rounded-full transition-colors border border-slate-100"
                    aria-label="Fechar"
                  >
                    <Plus size={20} className="rotate-45" />
                  </button>
                </div>

                {/* Modal Tabs Navigation */}
                <div className="flex border-b border-slate-100 bg-slate-50/50 px-6">
                  <button
                    onClick={() => setModalActiveTab('info')}
                    className={cn(
                      "px-5 py-3.5 text-xs font-black uppercase tracking-wider border-b-2 transition-all leading-none",
                      modalActiveTab === 'info' 
                        ? "border-orange-500 text-orange-600 font-extrabold" 
                        : "border-transparent text-slate-400 hover:text-slate-600 font-bold"
                    )}
                  >
                    Resumo do Perfil & Ações
                  </button>
                  <button
                    onClick={() => setModalActiveTab('orders')}
                    className={cn(
                      "px-5 py-3.5 text-xs font-black uppercase tracking-wider border-b-2 transition-all leading-none flex items-center gap-1.5",
                      modalActiveTab === 'orders' 
                        ? "border-orange-500 text-orange-600 font-extrabold" 
                        : "border-transparent text-slate-400 hover:text-slate-600 font-bold"
                    )}
                  >
                    Histórico de Pedidos ({totalOrders})
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 text-left">
                  {modalActiveTab === 'info' ? (
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <p className="text-[10px] font-black text-slate-450 uppercase tracking-widest border-b border-slate-100 pb-1">Fidelidade & Histórico de Pontos</p>
                        
                        <div className="bg-orange-50 rounded-2xl p-4 border border-orange-100 flex items-center justify-between">
                          <div>
                            <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest">Saldo Atual</p>
                            <p className="text-2xl font-black text-slate-900 tracking-tighter">{selectedProfileHistory.pointsBalance || 0} pts</p>
                          </div>
                          <Gift className="text-orange-200" size={32} />
                        </div>

                        <div className="space-y-2">
                          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Movimentações Recentes</h4>
                          <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1 no-scrollbar">
                             {selectedProfileHistory.history?.slice().reverse().map((item: { type: string; description: string; createdAt: string; points: number }, i: number) => (
                              <div key={i} className="flex items-center justify-between p-3 rounded-xl border border-slate-50 bg-slate-50/50">
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div className={cn(
                                    "w-7 h-7 rounded-lg flex items-center justify-center shrink-0",
                                    item.type === 'earn' ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
                                  )}>
                                    {item.type === 'earn' ? <Plus size={12} /> : <Trash2 size={12} />}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-xs font-bold text-slate-900 truncate leading-tight">{item.description}</p>
                                    <p className="text-[9px] font-medium text-slate-450">{new Date(item.createdAt).toLocaleDateString()}</p>
                                  </div>
                                </div>
                                <span className={cn(
                                  "text-xs font-black shrink-0",
                                  item.type === 'earn' ? "text-green-600" : "text-red-600"
                                )}>
                                  {item.type === 'earn' ? '+' : ''}{item.points}
                                </span>
                              </div>
                            ))}
                            {(!selectedProfileHistory.history || selectedProfileHistory.history.length === 0) && (
                              <p className="text-center py-8 text-[10px] font-black text-slate-300 uppercase italic">Nenhuma movimentação</p>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-5 border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 md:pl-6">
                        <div>
                          <p className="text-[10px] font-black text-slate-450 uppercase tracking-widest border-b border-slate-100 pb-1 mb-3">Padrão de Compra & Recorrência</p>
                          
                          <div className="grid grid-cols-2 gap-2 mb-3 text-center">
                            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex flex-col justify-center">
                              <p className="text-[8px] font-black text-slate-400 uppercase leading-none mb-1">Nível de Frequência</p>
                              <span className={cn("inline-block text-[9px] font-black px-1.5 py-0.5 rounded border leading-none self-center", tierColor)}>
                                {clientTier}
                              </span>
                            </div>
                            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                              <p className="text-[8px] font-black text-slate-400 uppercase leading-none mb-1">Total Pedidos</p>
                              <p className="text-sm font-black text-slate-800 leading-none mt-1">{totalOrders}x</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2 mb-3 text-center animate-fade-in">
                            <div className="bg-orange-50/30 p-2.5 rounded-xl border border-orange-100 flex flex-col justify-center">
                              <p className="text-[8px] font-black text-orange-600 uppercase leading-none mb-1">Intervalo de Compra</p>
                              <p className="text-xs font-black text-slate-850 mt-1 leading-none">{averageDaysValue === 'N/A' ? 'N/A' : `A cada ${averageDaysValue}`}</p>
                            </div>
                            <div className="bg-orange-50/30 p-2.5 rounded-xl border border-orange-100">
                              <p className="text-[8px] font-black text-orange-600 uppercase leading-none mb-1">Classificação</p>
                              <p className="text-[9px] font-black text-orange-700 leading-none mt-1">{frequencyCategory}</p>
                            </div>
                          </div>

                          <div className="bg-slate-50/50 p-3 rounded-2xl border border-slate-100 text-left">
                            <div className="flex items-center gap-1.5 mb-2 text-[9px] font-black text-slate-500 uppercase tracking-wider">
                              <TrendingUp size={11} className="text-orange-500" />
                              <span>Prato ou Adicional Favorito</span>
                            </div>
                            {topProducts.length > 0 ? (
                              <div className="space-y-2">
                                {topProducts.map((p, index) => (
                                  <div key={index} className="flex items-center justify-between text-xs">
                                    <span className="font-bold text-slate-700 truncate max-w-[170px]">{p.name}</span>
                                    <span className="text-[9px] font-black bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full uppercase shrink-0">
                                      {p.count} Pedidos
                                    </span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-[9px] font-bold text-slate-400 uppercase italic">Dados de recorrência insuficiente</p>
                            )}
                          </div>
                        </div>

                        <div className="space-y-4">
                          <p className="text-[10px] font-black text-slate-450 uppercase tracking-widest border-b border-slate-100 pb-1">Ações de Fidelidade de Lançamento</p>
                          
                          <div className="space-y-1.5">
                            <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider block">Bonificar Pontos Extras (Manual)</label>
                            <div className="flex gap-2">
                              <input 
                                type="number" 
                                min="1"
                                value={addPointsValue}
                                onChange={e => setAddPointsValue(e.target.value)}
                                className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-bold text-slate-800 w-24 outline-none focus:ring-1 focus:ring-orange-500"
                                placeholder="Pontos"
                              />
                              <button
                                onClick={handleManualAddPoints}
                                className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-black uppercase text-[10px] tracking-widest py-2 rounded-lg transition-all"
                              >
                                Premiar Pontos
                              </button>
                            </div>
                          </div>

                          <div className="space-y-2 p-3 bg-orange-50/20 rounded-2xl border border-orange-100/50">
                            <label className="text-[9px] font-black text-orange-600 uppercase tracking-wider block">Cupom Exclusivo de Lançamento</label>
                            
                            <div className="flex gap-2 font-sans">
                              <select
                                value={couponDiscountValue}
                                onChange={e => setCouponDiscountValue(e.target.value)}
                                className="bg-white border border-slate-200 rounded-lg p-2 text-xs font-bold text-slate-805 w-28 outline-none focus:ring-1 focus:ring-orange-500 bg-white"
                              >
                                <option value="10">10% OFF</option>
                                <option value="15">15% OFF</option>
                                <option value="20">20% OFF</option>
                                <option value="25">25% OFF</option>
                                <option value="30">30% OFF</option>
                              </select>
                              <button
                                onClick={handleGenerateVIPCoupon}
                                className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-black uppercase text-[10px] tracking-widest py-2 rounded-lg transition-all shadow-sm"
                              >
                                Criar Cupom
                              </button>
                            </div>

                            {generatedCouponCode && (
                              <div className="mt-3 bg-white p-2.5 rounded-xl border border-orange-150 space-y-2">
                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-wider leading-none">CUPOM ATIVO NO SISTEMA</p>
                                <div className="flex items-center justify-between">
                                  <span className="font-mono text-xs font-black bg-slate-100 px-2 py-1 rounded text-slate-800 uppercase tracking-wider">{generatedCouponCode}</span>
                                  <span className="text-[9px] font-bold text-emerald-600 uppercase">Cupom Ativo!</span>
                                </div>
                                
                                <a
                                  href={`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(
                                    `Olá, ${selectedProfileHistory.customerName?.split(' ')[0]}! Aqui é da equipe do ${restaurant.name} 🍳💛. Notamos que você é um de nossos clientes mais frequentes! Como forma de agradecimento, criamos um cupom de desconto exclusivo de ${couponDiscountValue}% na nossa cozinha feito especialmente para você: *${generatedCouponCode}* (Mínimo R$30, válido por 10 dias). Esperamos seu próximo lanche!`
                                  )}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="w-full flex items-center justify-center gap-1.5 py-1.5 mt-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-100 rounded-lg transition-all text-[9px] font-black uppercase tracking-wider"
                                >
                                  <MessageCircle size={12} />
                                  Enviar no WhatsApp
                                </a>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* PAST ORDERS HISTORIC TAB */
                    <div className="space-y-4 py-2">
                      <p className="text-[10px] font-black text-slate-450 uppercase tracking-widest border-b border-slate-100 pb-1 mb-2">Relatório Completo de Transações</p>
                      
                      <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1 no-scrollbar">
                        {newestOrders.map((order) => (
                          <div key={order.id} className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-all">
                            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2 mb-2">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-black text-slate-900 uppercase">#{order.id.slice(-6).toUpperCase()}</span>
                                <span className={cn("text-[9px] font-black px-2 py-0.5 rounded-full border uppercase tracking-wider", getStatusBadgeClass(order.status))}>
                                  {getStatusText(order.status)}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-bold">
                                <Calendar size={11} />
                                <span>{new Date(order.createdAt).toLocaleString('pt-BR')}</span>
                              </div>
                            </div>

                            {/* Order Details: Channel + Type */}
                            <div className="flex gap-4 mb-2.5 text-[9px] font-bold uppercase tracking-wider text-slate-500">
                              <div className="flex items-center gap-1">
                                <Smartphone size={10} className="text-slate-400" />
                                <span>Canal: <strong className="text-slate-700">{order.origin || 'Link Direto'}</strong></span>
                              </div>
                              <div className="flex items-center gap-1">
                                <MapPin size={10} className="text-slate-400" />
                                <span>Modalidade: <strong className="text-slate-700">{
                                  order.type === 'dine-in' ? 'Mesa / Local' :
                                  order.type === 'pickup' ? 'Retirada para Viagem' : 'Entrega a Domicílio'
                                }</strong></span>
                              </div>
                              <div className="flex items-center gap-1">
                                <DollarSign size={10} className="text-slate-400" />
                                <span>Pagamento: <strong className="text-slate-700">{
                                  order.paymentMethod === 'pix' ? 'PIX' :
                                  order.paymentMethod === 'cash' ? 'Dinheiro' :
                                  order.paymentMethod === 'card-on-delivery' ? 'Cartão na Entrega' : 'Pago no Local'
                                }</strong></span>
                              </div>
                            </div>

                            {/* Ordered Items list */}
                            <div className="space-y-1 bg-white p-2.5 rounded-xl border border-slate-100 mb-2">
                               {order.items?.map((item: { quantity: number; productName: string; additionals?: (string | { name: string })[]; unitPrice?: number }, idx: number) => (
                                <div key={idx} className="flex items-start justify-between text-xs">
                                  <div className="min-w-0">
                                    <p className="font-bold text-slate-800 leading-tight">
                                      <span className="text-orange-500 font-extrabold">{item.quantity}x</span> {item.productName}
                                    </p>
                                    {item.additionals && item.additionals.length > 0 && (
                                      <p className="text-[9px] text-slate-400 font-bold uppercase truncate pl-4">
                                         + {item.additionals.map((add: string | { name: string }) => typeof add === 'string' ? add : add.name).join(', ')}
                                      </p>
                                    )}
                                  </div>
                                  <span className="text-[10px] font-mono font-bold text-slate-500 shrink-0">
                                    {formatCurrency(item.unitPrice || 0)}
                                  </span>
                                </div>
                              ))}
                            </div>

                            {/* Totals Summary */}
                            <div className="flex items-center justify-between mt-2.5 font-sans">
                              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                Valor Total Recebido
                              </div>
                              <div className="text-sm font-black text-slate-850">
                                {formatCurrency(order.total || 0)}
                              </div>
                            </div>
                          </div>
                        ))}

                        {newestOrders.length === 0 && (
                          <div className="text-center py-20 text-slate-350 bg-slate-50 rounded-2xl border border-dashed border-slate-100">
                            <Clock size={32} className="mx-auto mb-2 text-slate-300" />
                            <p className="text-xs font-black uppercase tracking-widest italic text-slate-300">Nenhum Pedido Registrado</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    </AdminLayout>
  );
}
