import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, Ticket, Check, X, Calendar, DollarSign, Percent, History, User, Clock } from 'lucide-react';
import { db } from '../../lib/firebase';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp,
  getDocs,
  orderBy 
} from 'firebase/firestore';
import { useRestaurant } from '../../context/RestaurantContext';
import { Button } from '../../components/Button';
import { Coupon, Order } from '../../types';
import { toast } from 'react-hot-toast';
import { cn, formatCurrency } from '../../lib/utils';
import { Skeleton } from '../../components/Skeleton';

export default function CouponManagement() {
  const { currentRestaurant: restaurant } = useRestaurant();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modals state
  const [isCouponModalOpen, setIsCouponModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  
  // History state
  const [historyCoupon, setHistoryCoupon] = useState<Coupon | null>(null);
  const [usageHistory, setUsageHistory] = useState<Order[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  
  // Persistent Selected Coupon and History States
  const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null);
  const [selectedUsageHistory, setSelectedUsageHistory] = useState<Order[]>([]);
  const [loadingSelectedHistory, setLoadingSelectedHistory] = useState(false);
  
  const [formData, setFormData] = useState({
    code: '',
    type: 'percent' as 'percent' | 'fixed',
    value: '',
    minOrderValue: '',
    expiryDate: '',
    usageLimit: '',
    isActive: true,
    targetAudience: 'all' as Coupon['targetAudience'],
    targetMinRating: '',
    targetMaxRating: '',
    targetMinOrders: '',
  });

  const [codeError, setCodeError] = useState<string | null>(null);
  const [isValidatingCode, setIsValidatingCode] = useState(false);

  useEffect(() => {
    if (!formData.code) {
      setCodeError(null);
      return;
    }

    const validateCode = () => {
      const code = formData.code.toUpperCase().trim();
      
      if (code.length < 3) {
        setCodeError('O código deve ter pelo menos 3 caracteres');
        return;
      }

      if (!/^[A-Z0-9]+$/.test(code)) {
        setCodeError('Use apenas letras e números');
        return;
      }

      const isDuplicate = coupons.some(c => 
        c.code.toUpperCase() === code && 
        (!editingCoupon || c.id !== editingCoupon.id)
      );

      if (isDuplicate) {
        setCodeError('Este código já está em uso');
        return;
      }

      setCodeError(null);
    };

    validateCode();
  }, [formData.code, coupons, editingCoupon]);

  useEffect(() => {
    if (!restaurant) return;

    const q = query(
      collection(db, 'coupons'), 
      where('restaurantId', '==', restaurant.id)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Coupon));
      setCoupons(docs);
      setLoading(false);
    }, (error) => {
      console.error('Error listening to coupons:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [restaurant]);

  // Auto-select first coupon or update current selection reference on changes
  useEffect(() => {
    if (coupons.length > 0) {
      if (!selectedCoupon) {
        setSelectedCoupon(coupons[0]);
      } else {
        const found = coupons.find(c => c.id === selectedCoupon.id);
        if (found) {
          setSelectedCoupon(found);
        } else {
          setSelectedCoupon(coupons[0]);
        }
      }
    } else {
      setSelectedCoupon(null);
    }
  }, [coupons]);

  // Fetch usage history of selected coupon in background for field display
  useEffect(() => {
    const fetchSelectedHistory = async () => {
      if (!restaurant || !selectedCoupon) {
        setSelectedUsageHistory([]);
        return;
      }
      setLoadingSelectedHistory(true);
      try {
        const q = query(
          collection(db, 'orders'),
          where('restaurantId', '==', restaurant.id),
          where('couponCode', '==', selectedCoupon.code)
        );
        const snapshot = await getDocs(q);
        const historyList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
        // Sort by dates descending to always show latest use first
        historyList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setSelectedUsageHistory(historyList);
      } catch (error) {
        console.error('Error fetching selected coupon usage history:', error);
      } finally {
        setLoadingSelectedHistory(false);
      }
    };

    fetchSelectedHistory();
  }, [selectedCoupon, restaurant]);

  // Toggle activation status directly
  const handleToggleStatus = async (coupon: Coupon) => {
    try {
      await updateDoc(doc(db, 'coupons', coupon.id), {
        isActive: !coupon.isActive,
        updatedAt: serverTimestamp(),
      });
      toast.success(`Cupom ${coupon.code} ${!coupon.isActive ? 'ativado' : 'desativado'} com sucesso!`);
    } catch (error) {
      console.error('Error toggling coupon status:', error);
      toast.error('Erro ao alterar status do cupom');
    }
  };

  const handleOpenModal = (coupon?: Coupon) => {
    if (coupon) {
      setEditingCoupon(coupon);
      setFormData({
        code: coupon.code,
        type: coupon.type,
        value: coupon.value.toString(),
        minOrderValue: coupon.minOrderValue.toString(),
        expiryDate: coupon.expiryDate.split('T')[0],
        usageLimit: coupon.usageLimit?.toString() || '',
        isActive: coupon.isActive,
        targetAudience: coupon.targetAudience || 'all',
        targetMinRating: coupon.targetMinRating?.toString() || '',
        targetMaxRating: coupon.targetMaxRating?.toString() || '',
        targetMinOrders: coupon.targetMinOrders?.toString() || '',
      });
    } else {
      setEditingCoupon(null);
      setFormData({
        code: '',
        type: 'percent',
        value: '',
        minOrderValue: '0',
        expiryDate: '',
        usageLimit: '',
        isActive: true,
        targetAudience: 'all',
        targetMinRating: '',
        targetMaxRating: '',
        targetMinOrders: '',
      });
    }
    setIsCouponModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurant) return;

    if (!formData.code || !formData.value || !formData.expiryDate) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }

    if (codeError) {
      toast.error(codeError);
      return;
    }

    const couponData: Record<string, unknown> = {
      restaurantId: restaurant.id,
      code: formData.code.toUpperCase().trim(),
      type: formData.type,
      value: parseFloat(formData.value),
      minOrderValue: parseFloat(formData.minOrderValue || '0'),
      expiryDate: new Date(formData.expiryDate).toISOString(),
      usageLimit: formData.usageLimit ? parseInt(formData.usageLimit) : null,
      isActive: formData.isActive,
      targetAudience: formData.targetAudience,
      updatedAt: serverTimestamp(),
    };

    if (formData.targetAudience === 'by_rating') {
      couponData.targetMinRating = formData.targetMinRating ? parseFloat(formData.targetMinRating) : null;
      couponData.targetMaxRating = formData.targetMaxRating ? parseFloat(formData.targetMaxRating) : null;
    }
    if (formData.targetAudience === 'returning' || formData.targetAudience === 'by_orders') {
      couponData.targetMinOrders = formData.targetMinOrders ? parseInt(formData.targetMinOrders) : null;
    }

    try {
      if (editingCoupon) {
        await updateDoc(doc(db, 'coupons', editingCoupon.id), couponData);
        toast.success('Cupom atualizado!');
      } else {
        await addDoc(collection(db, 'coupons'), {
          ...couponData,
          usageCount: 0,
          createdAt: serverTimestamp(),
        });
        toast.success('Cupom criado!');
      }
      setIsCouponModalOpen(false);
    } catch (error) {
      console.error('Error saving coupon:', error);
      toast.error('Erro ao salvar cupom');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Deseja realmente excluir este cupom?')) return;
    try {
      await deleteDoc(doc(db, 'coupons', id));
      toast.success('Cupom excluído!');
    } catch (error) {
      toast.error('Erro ao excluir cupom');
    }
  };

  const handleOpenHistory = async (coupon: Coupon) => {
    if (!restaurant) return;
    setLoadingHistory(true);
    setHistoryCoupon(coupon);
    setIsHistoryModalOpen(true);
    
    try {
      const q = query(
        collection(db, 'orders'),
        where('restaurantId', '==', restaurant.id),
        where('couponCode', '==', coupon.code),
        orderBy('createdAt', 'desc')
      );
      
      const snapshot = await getDocs(q);
      const history = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
      setUsageHistory(history);
    } catch (error) {
      console.error('Error fetching coupon history:', error);
      // Fallback: try without orderBy if index is missing
      try {
        const q = query(
          collection(db, 'orders'),
          where('restaurantId', '==', restaurant.id),
          where('couponCode', '==', coupon.code)
        );
        const snapshot = await getDocs(q);
        const history = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() } as Order))
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setUsageHistory(history);
      } catch (err) {
        toast.error('Erro ao carregar histórico de uso');
      }
    } finally {
      setLoadingHistory(false);
    }
  };

  const filteredCoupons = coupons.filter(c => 
    c.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-[#111] italic uppercase tracking-tighter">Cupons de Desconto</h2>
          <p className="text-slate-500 text-sm font-medium">Gerencie suas promoções e códigos de desconto.</p>
        </div>
        <Button onClick={() => handleOpenModal()} className="h-11 px-6 font-black italic uppercase tracking-widest text-xs">
          <Plus size={18} className="mr-2" /> NOVO CUPOM
        </Button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left Column - List of Coupons */}
        <div className="xl:col-span-2 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden animate-in fade-in duration-300">
            <div className="p-4 border-b border-slate-50 bg-slate-50/50">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  placeholder="Buscar por código..."
                  className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-medium"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50/50">
                    <th className="text-left py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Código</th>
                    <th className="text-left py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Desconto</th>
                    <th className="text-left py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Validade</th>
                    <th className="text-left py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Uso</th>
                    <th className="text-left py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                    <th className="py-4 px-6"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {loading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <tr key={i}>
                        <td colSpan={6} className="px-6 py-4"><Skeleton className="h-12 w-full rounded-xl" /></td>
                      </tr>
                    ))
                  ) : filteredCoupons.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <Ticket size={40} className="text-slate-200" />
                          <p className="text-sm font-bold text-slate-400 uppercase italic">Nenhum cupom encontrado</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredCoupons.map((coupon) => {
                      const isSelected = selectedCoupon?.id === coupon.id;
                      return (
                        <tr 
                          key={coupon.id} 
                          onClick={() => setSelectedCoupon(coupon)}
                          className={cn(
                            "hover:bg-slate-50/50 transition-colors cursor-pointer group border-l-4",
                            isSelected 
                              ? "bg-amber-50/20 border-l-[#FFC928]! dark:bg-amber-950/5" 
                              : "border-l-transparent"
                          )}
                        >
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-zinc-805 flex items-center justify-center text-orange-500">
                                <Ticket size={20} />
                              </div>
                              <span className="font-black text-slate-900 tracking-tight">{coupon.code}</span>
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <div className="flex flex-col">
                              <span className="font-bold text-slate-700 text-sm">
                                {coupon.type === 'percent' ? `${coupon.value}%` : formatCurrency(coupon.value)}
                              </span>
                              {coupon.minOrderValue > 0 && (
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">
                                  Mín: {formatCurrency(coupon.minOrderValue)}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-2 text-slate-500 font-medium text-sm">
                              <Calendar size={14} className="text-slate-400" />
                              {new Date(coupon.expiryDate).toLocaleDateString('pt-BR')}
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <div className="flex flex-col">
                              <span className="font-bold text-slate-700 text-sm">
                                {coupon.usageCount} {coupon.usageLimit ? `/ ${coupon.usageLimit}` : 'usos'}
                              </span>
                              <div className="w-20 h-1 bg-slate-100 dark:bg-zinc-800 rounded-full mt-1 overflow-hidden">
                                <div 
                                  className="h-full bg-orange-500 rounded-full" 
                                  style={{ width: `${coupon.usageLimit ? Math.min((coupon.usageCount / coupon.usageLimit) * 100, 100) : 100}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleStatus(coupon);
                              }}
                              className="flex items-center gap-2 focus:outline-none group/toggle text-left"
                              title={coupon.isActive ? "Clique para desativar" : "Clique para ativar"}
                            >
                              <div className={cn(
                                "w-9 h-5 rounded-full transition-all relative",
                                coupon.isActive ? "bg-green-500" : "bg-slate-300 dark:bg-zinc-700"
                              )}>
                                <div className={cn(
                                  "absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all shadow-sm",
                                  coupon.isActive ? "left-4.5" : "left-0.5"
                                )} />
                              </div>
                              <span className={cn(
                                "text-[10px] font-black uppercase tracking-widest transition-colors",
                                coupon.isActive ? "text-green-500" : "text-slate-400"
                              )}>
                                {coupon.isActive ? 'Ativo' : 'Inativo'}
                              </span>
                            </button>
                          </td>
                          <td className="py-4 px-6 text-right">
                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button 
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenHistory(coupon);
                                }}
                                className="p-2 hover:bg-blue-50 dark:hover:bg-blue-950/20 text-slate-400 hover:text-blue-600 rounded-lg transition-colors"
                                title="Ver histórico completo"
                                aria-label="Histórico de uso"
                              >
                                <History size={18} />
                              </button>
                              <button 
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenModal(coupon);
                                }}
                                className="p-2 hover:bg-orange-50 dark:hover:bg-orange-950/20 text-slate-400 hover:text-orange-600 rounded-lg transition-colors"
                                aria-label="Editar"
                              >
                                <Edit2 size={18} />
                              </button>
                              <button 
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(coupon.id);
                                }}
                                className="p-2 hover:bg-red-50 dark:hover:bg-red-950/20 text-slate-400 hover:text-red-600 rounded-lg transition-colors"
                                aria-label="Excluir"
                              >
                                <Trash2 size={18} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column - Coupon History and Stats View */}
        <div className="xl:col-span-1">
          {selectedCoupon ? (
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-6 animate-in fade-in duration-300">
              <div>
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[9px] font-black text-orange-500 uppercase tracking-widest">Painel do Cupom</span>
                    <h3 className="text-xl font-black text-[#111] italic uppercase tracking-tighter mt-1 flex items-center gap-2">
                      <Ticket size={22} className="text-orange-500 animate-pulse" />
                      {selectedCoupon.code}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2 bg-slate-50 dark:bg-zinc-900/40 p-1.5 px-3 rounded-xl border border-slate-100 shadow-sm">
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(selectedCoupon)}
                      className={cn(
                        "w-9 h-5 rounded-full transition-all relative",
                        selectedCoupon.isActive ? "bg-green-500" : "bg-slate-300 dark:bg-zinc-700"
                      )}
                    >
                      <div className={cn(
                        "absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all shadow-sm",
                        selectedCoupon.isActive ? "left-4.5" : "left-0.5"
                      )} />
                    </button>
                    <span className={cn(
                      "text-[9px] font-black uppercase tracking-widest",
                      selectedCoupon.isActive ? "text-green-500" : "text-slate-400"
                    )}>
                      {selectedCoupon.isActive ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Stats detail indicators */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50/50 dark:bg-zinc-900/20 rounded-2xl border border-slate-100">
                <div>
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Desconto</span>
                  <span className="text-base font-black text-slate-800">
                    {selectedCoupon.type === 'percent' ? `${selectedCoupon.value}%` : formatCurrency(selectedCoupon.value)}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Validade</span>
                  <span className="text-sm font-bold text-slate-600">
                    {new Date(selectedCoupon.expiryDate).toLocaleDateString('pt-BR')}
                  </span>
                </div>
                <div className="col-span-2 pt-2 border-t border-slate-100">
                  <div className="flex justify-between text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">
                    <span>Limite de uso</span>
                    <span>{selectedCoupon.usageCount} {selectedCoupon.usageLimit ? `/ ${selectedCoupon.usageLimit} disponíveis` : 'usos'}</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-orange-500 rounded-full transition-all duration-500" 
                      style={{ width: `${selectedCoupon.usageLimit ? Math.min((selectedCoupon.usageCount / selectedCoupon.usageLimit) * 100, 100) : 100}%` }}
                    />
                  </div>
                </div>
                <div className="col-span-2 pt-2 border-t border-slate-100 flex justify-between">
                  <div>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Pedido Mínimo</span>
                    <span className="text-xs font-bold text-slate-600">
                      {selectedCoupon.minOrderValue > 0 ? formatCurrency(selectedCoupon.minOrderValue) : 'Nenhum'}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Economia Total</span>
                    <span className="text-xs font-black text-green-600 block">
                      {formatCurrency(selectedUsageHistory.reduce((acc, order) => acc + (order.couponDiscount || 0), 0))}
                    </span>
                  </div>
                </div>
              </div>

              {/* Usage List view */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 mb-1">
                    <History size={13} className="text-blue-500" />
                    Histórico de Uso
                  </h4>
                  <span className="text-[9px] font-black bg-blue-50 dark:bg-blue-950/20 text-blue-600 px-2.5 py-0.5 rounded-full uppercase tracking-widest">
                    {selectedUsageHistory.length} {selectedUsageHistory.length === 1 ? 'uso' : 'usos'}
                  </span>
                </div>

                <div className="max-h-[320px] overflow-y-auto space-y-2.5 pr-1 no-scrollbar">
                  {loadingSelectedHistory ? (
                    Array.from({ length: 2 }).map((_, i) => (
                      <Skeleton key={i} className="h-14 w-full rounded-xl" />
                    ))
                  ) : selectedUsageHistory.length === 0 ? (
                    <div className="text-center py-10 bg-slate-50/50 dark:bg-zinc-900/10 rounded-2xl border border-slate-100/20 border-dashed">
                      <History size={26} className="text-slate-300 mx-auto mb-2" />
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-tight">Nenhum uso registrado</p>
                      <p className="text-[9px] text-slate-400 mt-1 max-w-[200px] mx-auto leading-relaxed">Pedidos utilizando este cupom serão listados em tempo real.</p>
                    </div>
                  ) : (
                    selectedUsageHistory.map((order) => (
                      <div 
                        key={order.id} 
                        className="p-3 bg-slate-50/60 dark:bg-zinc-900/30 border border-slate-100/40 rounded-xl flex items-center justify-between"
                      >
                        <div>
                          <p className="font-extrabold text-slate-800 text-xs">{order.customerName}</p>
                          <p className="text-[8px] font-black text-slate-400 uppercase tracking-tighter mt-0.5">
                            {new Date(order.createdAt).toLocaleDateString('pt-BR')} às {new Date(order.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-black text-green-600">
                            -{formatCurrency(order.couponDiscount || 0)}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8 text-center flex flex-col items-center justify-center min-h-[350px]">
              <Ticket size={48} className="text-slate-300 mb-4 animate-pulse" />
              <p className="font-bold text-slate-400 uppercase italic text-sm">Nenhum cupom</p>
              <p className="text-xs text-slate-500 mt-2 max-w-[220px] mx-auto leading-relaxed">Crie ou selecione um cupom na lista para visualizar seu histórico e status completos.</p>
            </div>
          )}
        </div>
      </div>

      {/* Coupon Modal */}
      {isCouponModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Gerenciar cupom">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
              <div>
                <h3 className="text-xl font-black text-[#111] italic uppercase tracking-tighter">
                  {editingCoupon ? 'Editar Cupom' : 'Novo Cupom'}
                </h3>
                <p className="text-slate-500 text-xs font-medium">Configure as regras do desconto.</p>
              </div>
              <button 
                onClick={() => setIsCouponModalOpen(false)}
                className="p-3 hover:bg-white text-slate-400 hover:text-slate-600 rounded-2xl transition-all shadow-sm"
                aria-label="Fechar"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-8 space-y-6">
              <div className="space-y-4">
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center px-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Código do Cupom</label>
                      {formData.code && !codeError && (
                        <span className="flex items-center gap-1 text-[9px] font-black text-green-500 uppercase tracking-widest">
                          <Check size={10} /> Disponível
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <Ticket className={cn(
                        "absolute left-4 top-1/2 -translate-y-1/2 transition-colors",
                        codeError ? "text-red-400" : formData.code && !codeError ? "text-green-500" : "text-slate-400"
                      )} size={18} />
                      <input
                        type="text"
                        placeholder="EX: PROMO20"
                        className={cn(
                          "w-full pl-12 pr-4 h-12 bg-slate-50 border rounded-2xl text-sm font-black uppercase tracking-widest focus:bg-white focus:ring-2 transition-all outline-none",
                          codeError 
                            ? "border-red-200 focus:ring-red-500/10 focus:border-red-500" 
                            : formData.code && !codeError
                              ? "border-green-200 focus:ring-green-500/10 focus:border-green-500"
                              : "border-slate-100 focus:ring-orange-500/20 focus:border-orange-500"
                        )}
                        value={formData.code}
                        onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase().replace(/\s/g, '') })}
                      />
                    </div>
                    {codeError && (
                      <p className="text-[9px] font-black text-red-500 uppercase tracking-widest ml-1 mt-0.5 animate-in fade-in slide-in-from-top-1 duration-200">
                        {codeError}
                      </p>
                    )}
                  </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tipo</label>
                    <div className="flex bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, type: 'percent' })}
                        className={cn(
                          "flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                          formData.type === 'percent' ? "bg-white text-orange-600 shadow-sm" : "text-slate-400"
                        )}
                      >
                        <Percent size={14} /> Percentual
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, type: 'fixed' })}
                        className={cn(
                          "flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                          formData.type === 'fixed' ? "bg-white text-orange-600 shadow-sm" : "text-slate-400"
                        )}
                      >
                        <DollarSign size={14} /> Fixo
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Valor</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      className="w-full px-4 h-12 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all outline-none"
                      value={formData.value}
                      onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Pedido Mínimo</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      className="w-full px-4 h-12 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all outline-none"
                      value={formData.minOrderValue}
                      onChange={(e) => setFormData({ ...formData, minOrderValue: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Data de Validade</label>
                    <div className="relative">
                      <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input
                        type="date"
                        className="w-full pl-12 pr-4 h-12 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all outline-none"
                        value={formData.expiryDate}
                        onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Limite de Uso (Opcional)</label>
                    <input
                      type="number"
                      placeholder="Ilimitado"
                      className="w-full px-4 h-12 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all outline-none"
                      value={formData.usageLimit}
                      onChange={(e) => setFormData({ ...formData, usageLimit: e.target.value })}
                    />
                  </div>

                  <div className="flex items-center gap-3 pt-6 px-1">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
                      className={cn(
                        "w-12 h-6 rounded-full transition-all relative",
                        formData.isActive ? "bg-green-500" : "bg-slate-300"
                      )}
                    >
                      <div className={cn(
                        "absolute top-1 w-4 h-4 rounded-full bg-white transition-all",
                        formData.isActive ? "left-7" : "left-1"
                      )} />
                    </button>
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                      Cupom {formData.isActive ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Público-Alvo */}
              <div className="border-t border-slate-100 pt-6 mt-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 block mb-3">
                  <User size={12} className="inline mr-1" />Público-Alvo
                </label>
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {([
                    { value: 'all', label: 'Todos os clientes' },
                    { value: 'new', label: 'Novos clientes' },
                    { value: 'returning', label: 'Clientes recorrentes' },
                    { value: 'by_rating', label: 'Por rating' },
                    { value: 'by_orders', label: 'Por nº de pedidos' },
                  ] as const).map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, targetAudience: opt.value })}
                      className={cn(
                        "py-2.5 px-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all",
                        formData.targetAudience === opt.value
                          ? "bg-orange-50 border-orange-200 text-orange-700"
                          : "bg-slate-50 border-slate-100 text-slate-400 hover:border-slate-200"
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                {formData.targetAudience === 'by_rating' && (
                  <div className="grid grid-cols-2 gap-3 bg-slate-50 rounded-2xl p-4">
                    <div>
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Rating mínimo</label>
                      <input
                        type="number"
                        min="0"
                        max="5"
                        step="0.5"
                        placeholder="4.0"
                        className="w-full px-3 h-10 bg-white border border-slate-100 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                        value={formData.targetMinRating}
                        onChange={(e) => setFormData({ ...formData, targetMinRating: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Rating máximo</label>
                      <input
                        type="number"
                        min="0"
                        max="5"
                        step="0.5"
                        placeholder="5.0"
                        className="w-full px-3 h-10 bg-white border border-slate-100 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                        value={formData.targetMaxRating}
                        onChange={(e) => setFormData({ ...formData, targetMaxRating: e.target.value })}
                      />
                    </div>
                  </div>
                )}

                {(formData.targetAudience === 'returning' || formData.targetAudience === 'by_orders') && (
                  <div className="bg-slate-50 rounded-2xl p-4">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                      {formData.targetAudience === 'returning' ? 'Mínimo de pedidos anteriores' : 'Mínimo de pedidos'}
                    </label>
                    <input
                      type="number"
                      min="1"
                      placeholder="3"
                      className="w-full px-3 h-10 bg-white border border-slate-100 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                      value={formData.targetMinOrders}
                      onChange={(e) => setFormData({ ...formData, targetMinOrders: e.target.value })}
                    />
                  </div>
                )}
              </div>

              <div className="flex gap-4 pt-4">
                <Button 
                  type="button" 
                  variant="ghost" 
                  className="flex-1 h-12 font-black italic uppercase tracking-widest text-xs"
                  onClick={() => setIsCouponModalOpen(false)}
                >
                  CANCELAR
                </Button>
                <Button 
                  type="submit" 
                  className="flex-1 h-12 font-black italic uppercase tracking-widest text-xs"
                >
                  {editingCoupon ? 'ATUALIZAR' : 'CRIAR CUPOM'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* History Modal */}
      {isHistoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Histórico de uso do cupom">
          <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
              <div>
                <h3 className="text-xl font-black text-[#111] italic uppercase tracking-tighter flex items-center gap-2">
                  <History size={24} className="text-blue-500" />
                  Histórico: {historyCoupon?.code}
                </h3>
                <p className="text-slate-500 text-xs font-medium">Veja quem utilizou este cupom e quando.</p>
              </div>
              <button 
                onClick={() => setIsHistoryModalOpen(false)}
                className="p-3 hover:bg-white text-slate-400 hover:text-slate-600 rounded-2xl transition-all shadow-sm"
                aria-label="Fechar"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-8 max-h-[60vh] overflow-y-auto">
              {loadingHistory ? (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => (
                    <Skeleton key={i} className="h-16 w-full rounded-2xl" />
                  ))}
                </div>
              ) : usageHistory.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <History size={32} className="text-slate-200" />
                  </div>
                  <p className="text-slate-400 font-bold uppercase italic text-sm">Nenhum uso registrado ainda</p>
                  <p className="text-xs text-slate-400 mt-2">Apenas pedidos feitos a partir de agora terão histórico detalhado.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {usageHistory.map((order) => (
                    <div 
                      key={order.id} 
                      className="p-4 bg-slate-50/50 border border-slate-100 rounded-2xl flex items-center justify-between group hover:bg-white hover:shadow-md transition-all"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm text-slate-400">
                          <User size={18} />
                        </div>
                        <div>
                          <p className="font-black text-slate-900 text-sm">{order.customerName}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{order.customerPhone}</p>
                        </div>
                       </div>

                       <div className="text-right flex items-center gap-6">
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center justify-end gap-1">
                            <Clock size={10} /> Data e Hora
                          </p>
                          <p className="text-sm font-bold text-slate-600">
                            {new Date(order.createdAt).toLocaleString('pt-BR', {
                              day: '2-digit',
                              month: '2-digit',
                              year: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                        <div className="w-24 text-right">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Desconto</p>
                          <p className="text-sm font-black text-green-600">
                            -{formatCurrency(order.couponDiscount || 0)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="p-8 border-t border-slate-50 bg-slate-50/30">
              <Button 
                onClick={() => setIsHistoryModalOpen(false)} 
                className="w-full h-12 font-black italic uppercase tracking-widest text-xs"
              >
                FECHAR
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
