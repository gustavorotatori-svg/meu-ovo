import { useState, useEffect } from 'react';
import { Gift, Plus, Trash2, Save, Power } from 'lucide-react';
import { db } from '../../lib/firebase';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  updateDoc, 
  doc, 
  onSnapshot 
} from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import { useRestaurant } from '../../context/RestaurantContext';
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
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProfileHistory, setSelectedProfileHistory] = useState<any | null>(null);

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

  const updateRule = (id: string, updates: any) => {
    setSettings(prev => ({
      ...prev,
      redemptionRules: prev.redemptionRules.map(r => r.id === id ? { ...r, ...updates } : r)
    }));
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
                  {settings.redemptionRules.map((rule: any) => (
                    <div key={rule.id} className="bg-white rounded-xl border border-slate-200 p-4 space-y-4 relative group">
                       <button 
                         onClick={() => removeRule(rule.id)}
                         className="absolute top-2 right-2 p-1.5 text-slate-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
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
        {selectedProfileHistory && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
             <div className="bg-white w-full max-w-md rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                   <div>
                      <h3 className="text-lg font-black text-slate-900 italic uppercase">{t('loyalty.history')}</h3>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{selectedProfileHistory.customerName}</p>
                   </div>
                   <button 
                     onClick={() => setSelectedProfileHistory(null)}
                     className="p-2 hover:bg-slate-50 rounded-full transition-colors border border-slate-100"
                   >
                      <Plus size={20} className="rotate-45" />
                   </button>
                </div>
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                   <div className="bg-orange-50 rounded-2xl p-4 border border-orange-100 flex items-center justify-between">
                      <div>
                         <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest">{t('loyalty.totalBalance')}</p>
                         <p className="text-2xl font-black text-slate-900 tracking-tighter">{selectedProfileHistory.pointsBalance} pts</p>
                      </div>
                      <Gift className="text-orange-200" size={32} />
                   </div>

                   <div className="space-y-2">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('loyalty.latestMovements')}</h4>
                      <div className="space-y-2">
                         {selectedProfileHistory.history?.slice().reverse().map((item: any, i: number) => (
                           <div key={i} className="flex items-center justify-between p-3 rounded-xl border border-slate-50 bg-slate-50/50">
                              <div className="flex items-center gap-3">
                                 <div className={cn(
                                   "w-8 h-8 rounded-lg flex items-center justify-center",
                                   item.type === 'earn' ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
                                 )}>
                                    {item.type === 'earn' ? <Plus size={14} /> : <Trash2 size={14} />}
                                 </div>
                                 <div>
                                    <p className="text-xs font-bold text-slate-900">{item.description}</p>
                                    <p className="text-[10px] font-medium text-slate-400">{new Date(item.createdAt).toLocaleDateString()}</p>
                                 </div>
                              </div>
                              <span className={cn(
                                "text-sm font-black",
                                item.type === 'earn' ? "text-green-600" : "text-red-600"
                              )}>
                                 {item.type === 'earn' ? '+' : ''}{item.points}
                              </span>
                           </div>
                         ))}
                         {(!selectedProfileHistory.history || selectedProfileHistory.history.length === 0) && (
                           <p className="text-center py-8 text-[10px] font-black text-slate-300 uppercase italic">{t('loyalty.noMovements')}</p>
                         )}
                      </div>
                   </div>
                </div>
             </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
