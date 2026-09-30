import React, { useState } from 'react';
import { Wallet, LogIn, LogOut, TrendingUp, TrendingDown, History, Plus, Minus, DollarSign, Calculator, FileText } from 'lucide-react';
import AdminLayout from './AdminLayout';
import { useRestaurant } from '../../context/RestaurantContext';
import { useTheme } from '../../context/ThemeContext';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { formatCurrency, currencyLocale } from '../../lib/utils';

export default function AdminCashier() {
  const { t, i18n } = useTranslation();
  const fmt = (v: number) => formatCurrency(v, currencyLocale(i18n.language));
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { activeSession, cashierSessions, openCashier, closeCashier, addCashierMovement, orders } = useRestaurant();

  const [showOpenModal, setShowOpenModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [showMovementModal, setShowMovementModal] = useState<{ type: 'withdrawal' | 'addition' } | null>(null);
  
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');

  const handleOpen = async () => {
    if (!amount) return toast.error(t('admCashier.openAmountRequired'));
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount < 0) return toast.error(t('admCashier.invalidAmount'));
    try {
      await openCashier(parsedAmount, 'Admin');
      setAmount('');
      setShowOpenModal(false);
      toast.success(t('admCashier.openOk'));
    } catch (err) {
      console.error('[Cashier] Error opening cashier:', err);
      toast.error(t('admCashier.openError'));
    }
  };

  const handleClose = async () => {
    if (!amount) return toast.error(t('admCashier.closeAmountRequired'));
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount < 0) return toast.error(t('admCashier.invalidAmount'));
    try {
      await closeCashier(parsedAmount);
      setAmount('');
      setShowCloseModal(false);
      toast.success(t('admCashier.closeOk'));
    } catch (err) {
      console.error('[Cashier] Error closing cashier:', err);
      toast.error(t('admCashier.closeError'));
    }
  };

  const handleMovement = async () => {
    if (!amount || !reason || !showMovementModal) return toast.error(t('admCashier.movementRequired'));
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) return toast.error(t('admCashier.invalidAmount'));
    try {
      await addCashierMovement(showMovementModal.type, parsedAmount, reason);
      setAmount('');
      setReason('');
      setShowMovementModal(null);
      toast.success(t('admCashier.movementOk'));
    } catch (err) {
      console.error('[Cashier] Error recording movement:', err);
      toast.error(t('admCashier.movementError'));
    }
  };

  const calculateTotalSales = () => {
    if (!activeSession) return 0;
    const sessionStart = new Date(activeSession.openedAt).getTime();
    return orders
      .filter(o => o.status === 'finished')
      .filter(o => {
        const orderTime = o.updatedAt ? new Date(o.updatedAt).getTime() : new Date(o.createdAt).getTime();
        return orderTime >= sessionStart;
      })
      .reduce((acc, current) => acc + (current.total || 0), 0);
  };

  const currentSales = calculateTotalSales();
  const balance = activeSession 
    ? activeSession.openingAmount + 
      currentSales + 
      activeSession.additions.reduce((acc, cur) => acc + cur.amount, 0) - 
      activeSession.withdrawals.reduce((acc, cur) => acc + cur.amount, 0)
    : 0;

  return (
    <AdminLayout>
      <div className="mb-8">
        <h2 className={`font-black text-4xl italic tracking-tighter uppercase ${isDark ? 'text-[#FFC928]' : 'text-[#111]'}`}>{t('admCashier.title')}</h2>
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1 italic">
          {t('admCashier.subtitle')}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Control */}
        <div className="lg:col-span-2 space-y-8">
          {!activeSession ? (
            <div className={`rounded-[2.5rem] p-6 sm:p-12 text-center border-4 border-dashed ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-gray-100'}`}>
              <div className="w-20 h-20 bg-[#FFC928]/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <Wallet className="text-[#FFC928]" size={40} />
              </div>
              <h3 className={`text-2xl font-black italic tracking-tighter mb-2 ${isDark ? 'text-white' : 'text-[#111]'}`}>{t('admCashier.closedTitle')}</h3>
              <p className="text-gray-500 mb-8 max-w-xs mx-auto">{t('admCashier.closedDesc')}</p>
              <button 
                onClick={() => setShowOpenModal(true)}
                className="bg-[#FFC928] text-black font-black px-6 sm:px-10 py-4 sm:py-5 rounded-3xl uppercase tracking-tighter hover:scale-105 active:scale-95 transition-all shadow-xl shadow-[#FFC928]/20"
              >
                {t('admCashier.openNow')}
              </button>
            </div>
          ) : (
            <>
              {/* Active Session Info */}
              <div className={`rounded-[2.5rem] p-8 border-4 ${isDark ? 'bg-[#111] border-[#FFC928]' : 'bg-white border-[#FFC928] shadow-2xl'}`}>
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#FFC928]">{t('admCashier.openBadge')}</span>
                    <h3 className={`text-2xl font-black italic tracking-tighter ${isDark ? 'text-white' : 'text-[#111]'}`}>{t('admCashier.openedBy', { name: activeSession.openedBy })}</h3>
                    <p className="text-gray-500 text-[10px] font-bold">{t('admCashier.sinceAt', { d: new Date(activeSession.openedAt).toLocaleString(currencyLocale(i18n.language)) })}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest">{t('admCashier.balanceNow')}</p>
                    <p className={`text-4xl font-black italic ${isDark ? 'text-white' : 'text-[#111]'}`}>{fmt(balance)}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className={`p-4 rounded-3xl ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
                    <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-1">{t('admCashier.openingLbl')}</p>
                    <p className={`text-lg font-black italic ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{fmt(activeSession.openingAmount)}</p>
                  </div>
                  <div className={`p-4 rounded-3xl ${isDark ? 'bg-green-500/10' : 'bg-green-50'}`}>
                    <p className="text-green-500 text-[10px] font-black uppercase tracking-widest mb-1">{t('admCashier.salesLbl')}</p>
                    <p className="text-lg font-black italic text-green-600">{fmt(currentSales)}</p>
                  </div>
                  <div className={`p-4 rounded-3xl ${isDark ? 'bg-blue-500/10' : 'bg-blue-50'}`}>
                    <p className="text-blue-500 text-[10px] font-black uppercase tracking-widest mb-1">{t('admCashier.inLbl')}</p>
                    <p className="text-lg font-black italic text-blue-600">{fmt(activeSession.additions.reduce((acc, cur) => acc + cur.amount, 0))}</p>
                  </div>
                  <div className={`p-4 rounded-3xl ${isDark ? 'bg-red-500/10' : 'bg-red-50'}`}>
                    <p className="text-red-500 text-[10px] font-black uppercase tracking-widest mb-1">{t('admCashier.outLbl')}</p>
                    <p className="text-lg font-black italic text-red-600">{fmt(activeSession.withdrawals.reduce((acc, cur) => acc + cur.amount, 0))}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-8">
                  <button 
                    onClick={() => setShowMovementModal({ type: 'addition' })}
                    className={`flex items-center justify-center gap-2 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${isDark ? 'bg-white/5 text-white hover:bg-white/10' : 'bg-gray-100 text-[#111] hover:bg-gray-200'}`}
                  >
                    <TrendingUp size={16} /> {t('admCashier.additionBtn')}
                  </button>
                  <button 
                    onClick={() => setShowMovementModal({ type: 'withdrawal' })}
                    className={`flex items-center justify-center gap-2 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${isDark ? 'bg-white/5 text-white hover:bg-white/10' : 'bg-gray-100 text-[#111] hover:bg-gray-200'}`}
                  >
                    <TrendingDown size={16} /> {t('admCashier.withdrawalBtn')}
                  </button>
                </div>

                <button 
                  onClick={() => setShowCloseModal(true)}
                  className="w-full mt-4 bg-black text-white font-black py-6 rounded-3xl uppercase tracking-tighter flex items-center justify-center gap-3 hover:bg-zinc-900 transition-all"
                >
                   <LogOut size={20} /> {t('admCashier.closeBtn')}
                </button>
              </div>

              {/* Recent Movements */}
              <div className="space-y-4">
                <h4 className={`text-lg font-black italic uppercase tracking-tight ${isDark ? 'text-white' : 'text-[#111]'}`}>{t('admCashier.movementsTitle')}</h4>
                <div className="space-y-3">
                  {[...activeSession.additions.map(a => ({ ...a, type: 'addition' })), ...activeSession.withdrawals.map(w => ({ ...w, type: 'withdrawal' }))]
                    .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
                    .map((mov, i) => (
                      <div key={i} className={`p-4 rounded-2xl flex items-center justify-between ${isDark ? 'bg-white/5' : 'bg-white shadow-sm border border-gray-100'}`}>
                        <div className="flex items-center gap-4">
                          <div className={`p-2 rounded-xl ${mov.type === 'addition' ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
                            {mov.type === 'addition' ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                          </div>
                          <div>
                            <p className={`font-bold text-sm ${isDark ? 'text-white' : 'text-[#111]'}`}>{mov.reason}</p>
                            <p className="text-[10px] text-gray-500 font-bold">{new Date(mov.time).toLocaleTimeString(currencyLocale(i18n.language))}</p>
                          </div>
                        </div>
                        <p className={`font-black italic ${mov.type === 'addition' ? 'text-green-500' : 'text-red-500'}`}>
                          {mov.type === 'addition' ? '+' : '-'} {fmt(mov.amount)}
                        </p>
                      </div>
                    ))}
                  {activeSession.additions.length === 0 && activeSession.withdrawals.length === 0 && (
                    <p className="text-gray-500 text-center py-10 font-bold border-2 border-dashed border-gray-100 rounded-2xl">{t('admCashier.noMovements')}</p>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Sales History Summary */}
        <div className="space-y-8">
          <div className={`rounded-[2rem] p-8 border-2 ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-gray-100 shadow-xl'}`}>
            <div className="flex items-center gap-3 mb-6">
              <History className="text-[#FFC928]" size={20} />
               <h4 className={`font-black italic uppercase tracking-tight ${isDark ? 'text-white' : 'text-[#111]'}`}>{t('admCashier.historyTitle')}</h4>
            </div>
            
            <div className="space-y-4">
              {cashierSessions.filter(s => s.status === 'closed').map(session => (
                <div key={session.id} className={`p-4 rounded-2xl border-2 transition-all ${isDark ? 'border-white/5 hover:border-white/10' : 'border-gray-50 hover:border-gray-100'}`}>
                  <div className="flex items-center justify-between mb-2">
                     <span className="text-[9px] font-black uppercase text-gray-500">{new Date(session.openedAt).toLocaleDateString(currencyLocale(i18n.language))}</span>
                     <span className="text-[9px] font-black uppercase bg-gray-100 px-2 py-0.5 rounded text-gray-400">{t('admCashier.closedBadge')}</span>
                  </div>
                  <div className="flex justify-between items-end">
                    <div>
                       <p className={`text-xs font-bold ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{t('admCashier.byWhom', { name: session.openedBy })}</p>
                       <p className="text-[10px] text-gray-500">{t('admCashier.balanceLbl')}: {fmt(session.closingAmount ?? 0)}</p>
                     </div>
                     <p className={`font-black italic text-sm ${isDark ? 'text-white' : 'text-[#111]'}`}>{fmt(session.totalSales)} {t('admCashier.salesSuffix')}</p>
                  </div>
                </div>
              ))}
              {cashierSessions.filter(s => s.status === 'closed').length === 0 && (
                <p className="text-gray-500 text-center py-6 text-xs font-bold">{t('admCashier.noHistory')}</p>
              )}
            </div>
          </div>

          {/* Quick Stats Placeholder */}
          <div className={`rounded-[2rem] p-8 bg-black text-white`}>
             <div className="flex items-center gap-3 mb-6 text-[#FFC928]">
                <FileText size={20} />
                 <h4 className="font-black italic uppercase tracking-tight">{t('admCashier.fiscalTitle')}</h4>
             </div>
              <p className="text-xs text-gray-400 mb-6">{t('admCashier.fiscalDesc')}</p>
              <button className="w-full py-4 border-2 border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white/5 transition-all">
                 {t('admCashier.fiscalCta')}
              </button>
          </div>
        </div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {(showOpenModal || showCloseModal || showMovementModal) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={t('admCashier.dialogAria')}>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setShowOpenModal(false); setShowCloseModal(false); setShowMovementModal(null); }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className={`relative w-full max-w-md p-8 rounded-[2.5rem] shadow-2xl ${isDark ? 'bg-[#111] border-2 border-white/10' : 'bg-white'}`}
            >
                <h3 className={`text-2xl font-black italic tracking-tighter uppercase mb-6 ${isDark ? 'text-white' : 'text-[#111]'}`}>
                  {showOpenModal ? t('admCashier.openTitle') : showCloseModal ? t('admCashier.closeTitle') : showMovementModal?.type === 'withdrawal' ? t('admCashier.withdrawalTitle') : t('admCashier.additionTitle')}
                </h3>

              {(showMovementModal) && (
                <div className="mb-4">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 block">{t('admCashier.reasonLabel')}</label>
                  <input 
                    type="text"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder={t('admCashier.reasonPh')}
                    className={`w-full px-5 py-4 rounded-2xl font-bold bg-gray-50 border-2 border-transparent focus:border-[#FFC928] outline-none transition-all ${isDark ? 'bg-white/5 text-white' : 'bg-gray-50'}`}
                  />
                </div>
              )}

              <div className="mb-8">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 block">
                  {showOpenModal ? t('admCashier.amountOpen') : showCloseModal ? t('admCashier.amountClose') : t('admCashier.amountMove')}
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-5 top-1/2 -translate-y-1/2 text-[#FFC928]" size={20} />
                  <input 
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className={`w-full pl-12 pr-5 py-6 rounded-2xl text-2xl font-black bg-gray-50 border-2 border-transparent focus:border-[#FFC928] outline-none transition-all ${isDark ? 'bg-white/5 text-white' : 'bg-gray-50'}`}
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="flex gap-4">
                <button 
                  onClick={() => { setShowOpenModal(false); setShowCloseModal(false); setShowMovementModal(null); }}
                  className={`flex-1 py-4 rounded-2xl font-black text-xs h-[60px] ${isDark ? 'bg-white/5 text-gray-500' : 'bg-gray-100 text-gray-500'}`}
                >
                  {t('common.cancel').toUpperCase()}
                </button>
                <button 
                  onClick={showOpenModal ? handleOpen : showCloseModal ? handleClose : handleMovement}
                  className="flex-2 bg-[#FFC928] text-black font-black py-4 px-8 rounded-2xl text-xs uppercase tracking-widest h-[60px]"
                >
                  {t('common.confirm').toUpperCase()}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </AdminLayout>
  );
}
