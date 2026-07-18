import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { Plus, Trash2, RefreshCw, Clock, Zap } from 'lucide-react';
import { useRestaurant } from '../../context/RestaurantContext';
import BackButton from '../../components/BackButton';
import { db } from '../../lib/firebase';
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import type { FlashDeal, Product } from '../../types';
import { motion, AnimatePresence } from 'motion/react';
import { formatCurrency } from '../../lib/utils';

export default function FlashDealManagement() {
  const { products, currentRestaurant } = useRestaurant();
  const [deals, setDeals] = useState<FlashDeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [discount, setDiscount] = useState(20);
  const [maxUnits, setMaxUnits] = useState(50);
  const [durationHours, setDurationHours] = useState(24);

  const loadDeals = useCallback(async () => {
    if (!currentRestaurant) return;
    setLoading(true);
    try {
      const q = query(collection(db, 'flash_deals'), where('restaurantId', '==', currentRestaurant.id));
      const snap = await getDocs(q);
      setDeals(snap.docs.map(d => ({ id: d.id, ...d.data() } as FlashDeal)));
    } catch {
      toast.error('Erro ao carregar ofertas relâmpago');
    } finally {
      setLoading(false);
    }
  }, [currentRestaurant]);

  useEffect(() => { loadDeals(); }, [loadDeals]);

  const handleCreate = async () => {
    if (!currentRestaurant || !selectedProduct) return;
    const product = products.find(p => p.id === selectedProduct);
    if (!product) return;

    const dealPrice = product.price - (product.price * discount) / 100;
    const now = new Date();
    const endsAt = new Date(now.getTime() + durationHours * 3600000);

    try {
      await addDoc(collection(db, 'flash_deals'), {
        restaurantId: currentRestaurant.id,
        productId: product.id,
        productName: product.name,
        discountPercentage: discount,
        originalPrice: product.price,
        dealPrice: Math.round(dealPrice * 100) / 100,
        startsAt: now.toISOString(),
        endsAt: endsAt.toISOString(),
        maxUnits,
        soldUnits: 0,
        isActive: true,
        createdAt: now.toISOString(),
      });
      toast.success('Oferta relâmpago criada!');
      setShowForm(false);
      setSelectedProduct('');
      loadDeals();
    } catch {
      toast.error('Erro ao criar oferta');
    }
  };

  const handleToggle = async (deal: FlashDeal) => {
    try {
      await updateDoc(doc(db, 'flash_deals', deal.id), { isActive: !deal.isActive });
      loadDeals();
    } catch {
      toast.error('Erro ao atualizar');
    }
  };

  const handleDelete = async (deal: FlashDeal) => {
    try {
      await deleteDoc(doc(db, 'flash_deals', deal.id));
      toast.success('Oferta removida');
      loadDeals();
    } catch {
      toast.error('Erro ao remover');
    }
  };

  const availableProducts = products.filter(p => p.isAvailable && p.stock !== 0);

  return (
    <div className="space-y-6">
      <div className="px-6 pt-6">
        <BackButton to="/" />
      </div>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <Zap size={22} className="text-[#FFC928]" /> Ofertas Relâmpago
          </h2>
          <p className="text-gray-400 text-sm mt-1">Crie promoções com tempo limitado para seus produtos</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={loadDeals} className="p-2 rounded-xl bg-[#1a1a1a] text-gray-400 hover:text-white transition-colors" aria-label="Atualizar">
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-[#FFC928] text-[#111] font-black px-4 py-3 rounded-xl text-sm hover:bg-[#e6b520] transition-all"
          >
            <Plus size={18} /> Nova Oferta
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-[#1a1a1a] rounded-2xl p-6 border border-[#2a2a2a] space-y-4"
          >
            <h3 className="text-white font-black text-sm uppercase tracking-widest">Nova Oferta Relâmpago</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Produto *</label>
                <select
                  value={selectedProduct}
                  onChange={e => setSelectedProduct(e.target.value)}
                  className="w-full bg-[#111] border border-[#2a2a2a] rounded-xl px-4 py-3 text-sm text-white font-bold focus:outline-none focus:border-[#FFC928]"
                >
                  <option value="">Selecione um produto...</option>
                  {availableProducts.map(p => (
                    <option key={p.id} value={p.id}>{p.name} - R$ {p.price.toFixed(2)}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Desconto (%) *</label>
                <input
                  type="number"
                  value={discount}
                  min={1}
                  max={99}
                  onChange={e => setDiscount(Number(e.target.value))}
                  className="w-full bg-[#111] border border-[#2a2a2a] rounded-xl px-4 py-3 text-sm text-white font-bold focus:outline-none focus:border-[#FFC928]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Unidades disponíveis *</label>
                <input
                  type="number"
                  value={maxUnits}
                  min={1}
                  onChange={e => setMaxUnits(Number(e.target.value))}
                  className="w-full bg-[#111] border border-[#2a2a2a] rounded-xl px-4 py-3 text-sm text-white font-bold focus:outline-none focus:border-[#FFC928]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Duração (horas) *</label>
                <input
                  type="number"
                  value={durationHours}
                  min={1}
                  max={168}
                  onChange={e => setDurationHours(Number(e.target.value))}
                  className="w-full bg-[#111] border border-[#2a2a2a] rounded-xl px-4 py-3 text-sm text-white font-bold focus:outline-none focus:border-[#FFC928]"
                />
              </div>
            </div>

            {selectedProduct && (() => {
              const p = products.find(pr => pr.id === selectedProduct);
              if (!p) return null;
              const dealPrice = p.price - (p.price * discount) / 100;
              return (
                <div className="bg-[#111] rounded-xl p-4 flex items-center gap-4">
                  {p.imageUrl && <img src={p.imageUrl} alt={p.name} className="w-14 h-14 rounded-xl object-cover" />}
                  <div className="flex-1">
                    <p className="text-white font-bold text-sm">{p.name}</p>
                    <p className="text-gray-400 text-xs">Preço original: {formatCurrency(p.price)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-black text-red-400">{formatCurrency(Math.round(dealPrice * 100) / 100)}</p>
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{discount}% OFF</p>
                  </div>
                </div>
              );
            })()}

            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowForm(false)} className="px-6 py-3 rounded-xl text-sm font-bold text-gray-400 hover:text-white transition-colors">
                Cancelar
              </button>
              <button
                onClick={handleCreate}
                disabled={!selectedProduct}
                className="px-6 py-3 rounded-xl text-sm font-black bg-[#FFC928] text-[#111] disabled:opacity-40 hover:bg-[#e6b520] transition-all"
              >
                Criar Oferta
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="text-center py-12">
          <div className="w-6 h-6 border-2 border-[#FFC928] border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      ) : deals.length === 0 ? (
        <div className="text-center py-12 bg-[#1a1a1a] rounded-2xl border border-[#2a2a2a]">
          <Zap size={40} className="mx-auto text-gray-600 mb-3" />
          <p className="text-gray-400 font-bold">Nenhuma oferta relâmpago ativa</p>
          <p className="text-gray-600 text-sm mt-1">Crie sua primeira oferta para destacar produtos no cardápio</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {deals.map(deal => {
            const isExpired = new Date(deal.endsAt) < new Date();
            return (
              <motion.div
                key={deal.id}
                layout
                className="bg-[#1a1a1a] rounded-2xl p-5 border border-[#2a2a2a] flex items-center gap-4"
              >
                <div className={`w-2 h-10 rounded-full ${deal.isActive && !isExpired ? 'bg-green-500' : 'bg-gray-600'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-white font-bold truncate">{deal.productName}</p>
                  <div className="flex items-center gap-3 mt-1 text-sm">
                    <span className="text-gray-400 line-through">{formatCurrency(deal.originalPrice)}</span>
                    <span className="text-red-400 font-black">{formatCurrency(deal.dealPrice)}</span>
                    <span className="text-[#FFC928] font-black">-{deal.discountPercentage}%</span>
                  </div>
                  <div className="flex items-center gap-4 mt-1.5 text-[10px] font-black text-gray-500 uppercase tracking-widest">
                    <span className="flex items-center gap-1"><Clock size={10} />{new Date(deal.endsAt).toLocaleString('pt-BR')}</span>
                    <span>Vendidos: {deal.soldUnits}/{deal.maxUnits}</span>
                    {isExpired && <span className="text-red-500">Expirada</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggle(deal)}
                    className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                      deal.isActive && !isExpired
                        ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    }`}
                  >
                    {deal.isActive && !isExpired ? 'Ativa' : 'Inativa'}
                  </button>
                  <button onClick={() => handleDelete(deal)} className="p-2 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all" aria-label="Excluir">
                    <Trash2 size={16} />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
