import { useState } from 'react';
import { Boxes, Plus, Search, Edit2, Trash2, AlertTriangle, PackagePlus, ArrowDownCircle, ArrowUpCircle, Scale, Wallet } from 'lucide-react';
import AdminLayout from './AdminLayout';
import { useRestaurant } from '../../context/RestaurantContext';
import { useTheme } from '../../context/ThemeContext';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'react-hot-toast';
import { Ingredient, IngredientMovement } from '../../types';
import { formatCurrency } from '../../lib/utils';

const UNITS = ['un', 'g', 'kg', 'ml', 'L', 'cx', 'pct', 'und', 'fatia', 'porção'];

const MOVEMENT_LABEL: Record<IngredientMovement['type'], string> = {
  purchase: 'Entrada (compra)',
  sale: 'Baixa (venda)',
  adjustment: 'Ajuste',
  waste: 'Perda',
};

const EMPTY_INGREDIENT: Omit<Ingredient, 'id' | 'createdAt'> = {
  restaurantId: '',
  name: '',
  unit: 'un',
  costPerUnit: 0,
  stock: 0,
  minStock: 0,
};

export default function AdminInventory() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { currentRestaurant: restaurant, ingredients, ingredientMovements, addIngredient, updateIngredient, deleteIngredient, recordIngredientMovement } = useRestaurant();

  const [tab, setTab] = useState<'ingredients' | 'movements'>('ingredients');
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draftId, setDraftId] = useState('');
  const [editing, setEditing] = useState<Ingredient | null>(null);
  const [form, setForm] = useState<Omit<Ingredient, 'id' | 'createdAt'>>(EMPTY_INGREDIENT);
  const [showMovementModal, setShowMovementModal] = useState(false);
  const [savingMovement, setSavingMovement] = useState(false);
  const [movementDraftId, setMovementDraftId] = useState('');
  const [movementForm, setMovementForm] = useState({ ingredientId: '', type: 'purchase' as IngredientMovement['type'], quantity: '', unitCost: '', reason: '' });

  const filtered = ingredients.filter(i => i.name.toLowerCase().includes(search.toLowerCase()));
  const lowStock = ingredients.filter(i => i.minStock > 0 && i.stock <= i.minStock);
  const totalValue = ingredients.reduce((sum, i) => sum + (i.stock || 0) * (i.costPerUnit || 0), 0);

  const openCreate = () => {
    setEditing(null);
    setDraftId(Math.random().toString(36).substr(2, 9));
    setForm({ ...EMPTY_INGREDIENT, restaurantId: restaurant?.id || '' });
    setShowModal(true);
  };

  const openEdit = (ing: Ingredient) => {
    setEditing(ing);
    setDraftId(ing.id);
    setForm({ restaurantId: ing.restaurantId, name: ing.name, unit: ing.unit, costPerUnit: ing.costPerUnit, stock: ing.stock, minStock: ing.minStock });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return toast.error('Informe o nome do insumo');
    if (isNaN(form.costPerUnit) || form.costPerUnit < 0) return toast.error('Custo inválido');
    if (isNaN(form.stock) || form.stock < 0) return toast.error('Estoque inválido');
    if (saving) return;
    setSaving(true);
    try {
      if (editing) {
        await updateIngredient({ ...editing, ...form });
        toast.success('Insumo atualizado!');
      } else {
        await addIngredient({ id: draftId, ...form, createdAt: new Date().toISOString() });
        toast.success('Insumo criado!');
      }
      setShowModal(false);
    } catch {
      toast.error('Erro ao salvar insumo');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (ing: Ingredient) => {
    if (!window.confirm(`Excluir o insumo "${ing.name}"? O estoque registrado será perdido.`)) return;
    try {
      await deleteIngredient(ing.id);
      toast.success('Insumo excluído');
    } catch {
      toast.error('Erro ao excluir insumo');
    }
  };

  const openMovementModal = () => {
    setMovementDraftId(Math.random().toString(36).substr(2, 9));
    setShowMovementModal(true);
  };

  const handleMovementSave = async () => {
    if (!movementForm.ingredientId) return toast.error('Selecione o insumo');
    const qty = parseFloat(movementForm.quantity);
    if (isNaN(qty) || qty <= 0) return toast.error('Quantidade inválida');
    const ing = ingredients.find(i => i.id === movementForm.ingredientId);
    if (!ing) return toast.error('Insumo não encontrado');
    if (savingMovement) return;
    setSavingMovement(true);
    try {
      const unitCost = movementForm.unitCost ? parseFloat(movementForm.unitCost) : undefined;
      const isOutflow = movementForm.type !== 'purchase';
      const signed = isOutflow ? -qty : qty;
      await recordIngredientMovement(
        { id: movementDraftId, restaurantId: restaurant?.id || '', ingredientId: ing.id, ingredientName: ing.name, type: movementForm.type, quantity: signed, unitCost, reason: movementForm.reason || MOVEMENT_LABEL[movementForm.type] },
        true
      );
      toast.success('Movimentação registrada!');
      setShowMovementModal(false);
      setMovementForm({ ingredientId: '', type: 'purchase', quantity: '', unitCost: '', reason: '' });
    } catch {
      toast.error('Erro ao registrar movimentação');
    } finally {
      setSavingMovement(false);
    }
  };

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-display font-black italic tracking-tighter uppercase">Estoque & Insumos</h1>
        <p className="text-sm text-gray-500 font-semibold">Controle de insumos, reposição e movimentações.</p>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className={`rounded-2xl border p-4 ${isDark ? 'bg-zinc-950/60 border-white/5' : 'bg-white border-gray-100'}`}>
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-xl bg-[#FFC928]/10 text-[#FFC928]"><Boxes size={18} /></span>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Insumos cadastrados</p>
              <p className="text-xl font-black">{ingredients.length}</p>
            </div>
          </div>
        </div>
        <div className={`rounded-2xl border p-4 ${isDark ? 'bg-zinc-950/60 border-white/5' : 'bg-white border-gray-100'}`}>
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-xl bg-[#FFC928]/10 text-[#FFC928]"><Wallet size={18} /></span>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Valor em estoque</p>
              <p className="text-xl font-black">{formatCurrency(totalValue)}</p>
            </div>
          </div>
        </div>
        <div className={`rounded-2xl border p-4 ${isDark ? 'bg-zinc-950/60 border-white/5' : 'bg-white border-gray-100'}`}>
          <div className="flex items-center gap-3">
            <span className={`p-2.5 rounded-xl ${lowStock.length > 0 ? 'bg-rose-500/10 text-rose-400' : 'bg-emerald-500/10 text-emerald-500'}`}><AlertTriangle size={18} /></span>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Estoque baixo</p>
              <p className={`text-xl font-black ${lowStock.length > 0 ? 'text-rose-400' : ''}`}>{lowStock.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 mb-6">
        <button
          onClick={() => setTab('ingredients')}
          className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${tab === 'ingredients' ? 'bg-[#FFC928] text-[#111]' : `${isDark ? 'bg-white/5 text-gray-400' : 'bg-gray-100 text-gray-500'} hover:opacity-80`}`}
        >
          Insumos
        </button>
        <button
          onClick={() => setTab('movements')}
          className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${tab === 'movements' ? 'bg-[#FFC928] text-[#111]' : `${isDark ? 'bg-white/5 text-gray-400' : 'bg-gray-100 text-gray-500'} hover:opacity-80`}`}
        >
          Movimentações
        </button>
        <div className="flex-1" />
        <button
          onClick={() => (tab === 'ingredients' ? openCreate() : openMovementModal())}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#FFC928] text-[#111] text-xs font-black uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all"
        >
          <Plus size={16} />
          {tab === 'ingredients' ? 'Novo Insumo' : 'Registrar'}
        </button>
      </div>

      {tab === 'ingredients' ? (
        <>
          <div className="relative mb-4">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar insumo..."
              className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm font-semibold outline-none ${isDark ? 'bg-zinc-950/60 border-white/5 text-white' : 'bg-white border-gray-100 text-[#111]'}`}
            />
          </div>

          <div className="space-y-2">
            {filtered.map(ing => {
              const isLow = ing.minStock > 0 && ing.stock <= ing.minStock;
              return (
                <motion.div
                  key={ing.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`rounded-2xl border p-4 ${isDark ? 'bg-zinc-950/60 border-white/5' : 'bg-white border-gray-100'}`}
                >
                  <div className="flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="font-black truncate">{ing.name}</p>
                      <p className="text-xs text-gray-400 font-semibold">{ing.unit} • {formatCurrency(ing.costPerUnit)}/{ing.unit}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-black">{ing.stock} <span className="text-xs text-gray-400 font-bold">{ing.unit}</span></p>
                      <span className={`inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${isLow ? 'bg-rose-500/10 text-rose-400' : 'bg-emerald-500/10 text-emerald-500'}`}>
                        <AlertTriangle size={10} /> {isLow ? `Baixo (mín ${ing.minStock})` : 'OK'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEdit(ing)} className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-[#FFC928] transition-colors" title="Editar">
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => handleDelete(ing)} className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-rose-400 transition-colors" title="Excluir">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
            {filtered.length === 0 && (
              <div className={`rounded-2xl border border-dashed p-10 text-center ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
                <PackagePlus size={28} className="mx-auto text-gray-400 mb-3" />
                <p className="text-sm font-bold text-gray-400">Nenhum insumo cadastrado ainda. Crie insumos e depois monte as fichas técnicas dos produtos.</p>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="space-y-2">
          {ingredientMovements.map(mv => (
            <div key={mv.id} className={`rounded-2xl border p-4 ${isDark ? 'bg-zinc-950/60 border-white/5' : 'bg-white border-gray-100'}`}>
              <div className="flex items-center gap-3">
                {mv.type === 'purchase'
                  ? <ArrowDownCircle size={18} className="text-emerald-500 shrink-0" />
                  : mv.type === 'sale'
                    ? <ArrowUpCircle size={18} className="text-[#FFC928] shrink-0" />
                    : <Scale size={18} className="text-amber-400 shrink-0" />}
                <div className="flex-1 min-w-0">
                  <p className="font-black text-sm truncate">{mv.ingredientName}</p>
                  <p className="text-xs text-gray-400 font-semibold truncate">{mv.reason || MOVEMENT_LABEL[mv.type]}</p>
                </div>
                <div className="text-right">
                  <p className={`font-black ${mv.quantity >= 0 ? 'text-emerald-500' : 'text-rose-400'}`}>
                    {mv.quantity >= 0 ? '+' : ''}{mv.quantity}
                  </p>
                  <p className="text-[10px] text-gray-400 font-semibold">{new Date(mv.createdAt).toLocaleString('pt-BR')}</p>
                </div>
              </div>
            </div>
          ))}
          {ingredientMovements.length === 0 && (
            <div className={`rounded-2xl border border-dashed p-10 text-center ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
              <p className="text-sm font-bold text-gray-400">Nenhuma movimentação registrada. As vendas com ficha técnica dão baixa automaticamente.</p>
            </div>
          )}
        </div>
      )}

      {/* Modal Insumo */}
      <AnimatePresence>
        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-6">
            <motion.div
              initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
              className={`w-full max-w-lg rounded-t-3xl sm:rounded-3xl border p-6 ${isDark ? 'bg-zinc-900 border-white/10' : 'bg-white border-gray-100'}`}
            >
              <h3 className="text-lg font-black italic tracking-tighter uppercase mb-1">{editing ? 'Editar Insumo' : 'Novo Insumo'}</h3>
              <p className="text-xs text-gray-400 font-semibold mb-5">O custo por unidade alimenta o cálculo da ficha técnica.</p>
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Nome</label>
                  <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ex: Queijo Mussarela" data-testid="ing-name" className="mt-1 w-full px-4 py-2.5 rounded-xl border text-sm font-semibold outline-none bg-transparent focus:border-[#FFC928]" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Unidade</label>
                    <select value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} className="mt-1 w-full px-4 py-2.5 rounded-xl border text-sm font-semibold outline-none bg-transparent focus:border-[#FFC928]">
                      {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Custo por {form.unit}</label>
                    <input type="number" min="0" step="0.01" value={form.costPerUnit || ''} onChange={e => setForm({ ...form, costPerUnit: parseFloat(e.target.value) || 0 })} placeholder="0.00" data-testid="ing-cost" className="mt-1 w-full px-4 py-2.5 rounded-xl border text-sm font-semibold outline-none bg-transparent focus:border-[#FFC928]" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Estoque atual</label>
                    <input type="number" min="0" step="0.001" value={form.stock || ''} onChange={e => setForm({ ...form, stock: parseFloat(e.target.value) || 0 })} placeholder="0" data-testid="ing-stock" className="mt-1 w-full px-4 py-2.5 rounded-xl border text-sm font-semibold outline-none bg-transparent focus:border-[#FFC928]" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Estoque mínimo</label>
                    <input type="number" min="0" step="0.001" value={form.minStock || ''} onChange={e => setForm({ ...form, minStock: parseFloat(e.target.value) || 0 })} placeholder="0" className="mt-1 w-full px-4 py-2.5 rounded-xl border text-sm font-semibold outline-none bg-transparent focus:border-[#FFC928]" />
                  </div>
                </div>
              </div>
              <div className="flex gap-2 mt-6">
                <button onClick={() => setShowModal(false)} className="flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest bg-white/5 hover:bg-white/10 transition-colors">Cancelar</button>
                <button onClick={handleSave} disabled={saving} data-testid="ing-save" className="flex-1 py-3 rounded-xl bg-[#FFC928] text-[#111] text-xs font-black uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed">Salvar</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal Movimentação */}
      <AnimatePresence>
        {showMovementModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-6">
            <motion.div
              initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
              className={`w-full max-w-lg rounded-t-3xl sm:rounded-3xl border p-6 ${isDark ? 'bg-zinc-900 border-white/10' : 'bg-white border-gray-100'}`}
            >
              <h3 className="text-lg font-black italic tracking-tighter uppercase mb-5">Registrar Movimentação</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Insumo</label>
                  <select value={movementForm.ingredientId} onChange={e => setMovementForm({ ...movementForm, ingredientId: e.target.value })} data-testid="mov-ingredient" className="mt-1 w-full px-4 py-2.5 rounded-xl border text-sm font-semibold outline-none bg-transparent focus:border-[#FFC928]">
                    <option value="">Selecione...</option>
                    {ingredients.map(i => <option key={i.id} value={i.id}>{i.name} (estoque: {i.stock} {i.unit})</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Tipo</label>
                  <select value={movementForm.type} onChange={e => setMovementForm({ ...movementForm, type: e.target.value as IngredientMovement['type'] })} className="mt-1 w-full px-4 py-2.5 rounded-xl border text-sm font-semibold outline-none bg-transparent focus:border-[#FFC928]">
                    <option value="purchase">Entrada (compra)</option>
                    <option value="waste">Perda</option>
                    <option value="adjustment">Ajuste</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Quantidade</label>
                    <input type="number" min="0" step="0.001" value={movementForm.quantity} onChange={e => setMovementForm({ ...movementForm, quantity: e.target.value })} placeholder="0" data-testid="mov-qty" className="mt-1 w-full px-4 py-2.5 rounded-xl border text-sm font-semibold outline-none bg-transparent focus:border-[#FFC928]" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Custo unitário (opcional)</label>
                    <input type="number" min="0" step="0.01" value={movementForm.unitCost} onChange={e => setMovementForm({ ...movementForm, unitCost: e.target.value })} placeholder="0.00" className="mt-1 w-full px-4 py-2.5 rounded-xl border text-sm font-semibold outline-none bg-transparent focus:border-[#FFC928]" />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Motivo</label>
                  <input value={movementForm.reason} onChange={e => setMovementForm({ ...movementForm, reason: e.target.value })} placeholder="Ex: Compra no atacadista" className="mt-1 w-full px-4 py-2.5 rounded-xl border text-sm font-semibold outline-none bg-transparent focus:border-[#FFC928]" />
                </div>
              </div>
              <div className="flex gap-2 mt-6">
                <button onClick={() => setShowMovementModal(false)} className="flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest bg-white/5 hover:bg-white/10 transition-colors">Cancelar</button>
                <button onClick={handleMovementSave} disabled={savingMovement} data-testid="mov-save" className="flex-1 py-3 rounded-xl bg-[#FFC928] text-[#111] text-xs font-black uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed">Registrar</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AdminLayout>
  );
}
