import { useState, useMemo } from 'react';
import { ClipboardList, Plus, Trash2, Save, ChefHat, TrendingUp } from 'lucide-react';
import AdminLayout from './AdminLayout';
import { useRestaurant } from '../../context/RestaurantContext';
import { useTheme } from '../../context/ThemeContext';
import { motion } from 'motion/react';
import { toast } from 'react-hot-toast';
import { RecipeSheet } from '../../types';
import { formatCurrency } from '../../lib/utils';

export default function AdminRecipeSheets() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { currentRestaurant: restaurant, products, ingredients, recipeSheets, saveRecipeSheet, deleteRecipeSheet } = useRestaurant();

  const [selectedProductId, setSelectedProductId] = useState('');
  const [rows, setRows] = useState<{ ingredientId: string; quantity: string }[]>([]);

  const selectedProduct = products.find(p => p.id === selectedProductId);
  const existingSheet = useMemo(() => recipeSheets.find(s => s.productId === selectedProductId), [recipeSheets, selectedProductId]);

  const selectProduct = (productId: string) => {
    setSelectedProductId(productId);
    const sheet = recipeSheets.find(s => s.productId === productId);
    if (sheet) {
      setRows(sheet.ingredients.map(ing => ({ ingredientId: ing.ingredientId, quantity: String(ing.quantity) })));
    } else {
      setRows([]);
    }
  };

  const costPerRow = (ingredientId: string, quantity: number) => {
    const ing = ingredients.find(i => i.id === ingredientId);
    if (!ing || isNaN(quantity)) return 0;
    return quantity * (ing.costPerUnit || 0);
  };

  const totalCost = rows.reduce((sum, r) => sum + costPerRow(r.ingredientId, parseFloat(r.quantity) || 0), 0);
  const price = selectedProduct?.price || 0;
  const costPct = price > 0 ? (totalCost / price) * 100 : 0;
  const margin = price - totalCost;

  const addRow = () => setRows(prev => [...prev, { ingredientId: '', quantity: '' }]);
  const updateRow = (index: number, patch: Partial<{ ingredientId: string; quantity: string }>) =>
    setRows(prev => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  const removeRow = (index: number) => setRows(prev => prev.filter((_, i) => i !== index));

  const handleSave = async () => {
    if (!selectedProduct) return toast.error('Selecione um produto');
    const validRows = rows
      .filter(r => r.ingredientId && !isNaN(parseFloat(r.quantity)) && parseFloat(r.quantity) > 0)
      .map(r => {
        const ing = ingredients.find(i => i.id === r.ingredientId);
        return { ingredientId: r.ingredientId, ingredientName: ing?.name || '', quantity: parseFloat(r.quantity) };
      });
    if (validRows.length === 0) return toast.error('Adicione pelo menos um insumo com quantidade');

    const now = new Date().toISOString();
    const sheet: RecipeSheet = {
      id: existingSheet?.id || `sheet-${selectedProduct.id}`,
      restaurantId: restaurant?.id || '',
      productId: selectedProduct.id,
      productName: selectedProduct.name,
      ingredients: validRows,
      createdAt: existingSheet?.createdAt || now,
      updatedAt: now,
    };
    try {
      await saveRecipeSheet(sheet);
      toast.success('Ficha técnica salva!');
    } catch {
      toast.error('Erro ao salvar ficha técnica');
    }
  };

  const handleDelete = async () => {
    if (!existingSheet) return;
    if (!window.confirm('Excluir a ficha técnica deste produto?')) return;
    try {
      await deleteRecipeSheet(existingSheet.id);
      setRows([]);
      toast.success('Ficha técnica excluída');
    } catch {
      toast.error('Erro ao excluir ficha técnica');
    }
  };

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-display font-black italic tracking-tighter uppercase">Ficha Técnica</h1>
        <p className="text-sm text-gray-500 font-semibold">Cadastre os insumos de cada produto para calcular custo, margem e dar baixa automática no estoque.</p>
      </div>

      <div className={`rounded-2xl border p-5 mb-6 ${isDark ? 'bg-zinc-950/60 border-white/5' : 'bg-white border-gray-100'}`}>
        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 block">Produto</label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2">
            <select value={selectedProductId} onChange={e => selectProduct(e.target.value)} data-testid="rs-product" className="w-full px-4 py-2.5 rounded-xl border text-sm font-semibold outline-none bg-transparent focus:border-[#FFC928]">
              <option value="">Selecione um produto...</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} — {formatCurrency(p.price)}{recipeSheets.some(s => s.productId === p.id) ? ' ✓' : ''}
                </option>
              ))}
            </select>
          </div>
          <div className={`rounded-xl border p-3 flex items-center gap-3 ${isDark ? 'border-white/5' : 'border-gray-100'}`}>
            <span className="p-2 rounded-lg bg-[#FFC928]/10 text-[#FFC928]"><TrendingUp size={16} /></span>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Preço do produto</p>
              <p className="font-black">{selectedProduct ? formatCurrency(price) : '—'}</p>
            </div>
          </div>
        </div>
      </div>

      {selectedProduct ? (
        <>
          <div className="space-y-2 mb-4">
            {rows.map((row, index) => {
              const ing = ingredients.find(i => i.id === row.ingredientId);
              const cost = costPerRow(row.ingredientId, parseFloat(row.quantity) || 0);
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`rounded-2xl border p-3 grid grid-cols-[1fr_120px_120px_40px] gap-2 items-center ${isDark ? 'bg-zinc-950/60 border-white/5' : 'bg-white border-gray-100'}`}
                >
                  <select
                    value={row.ingredientId}
                    onChange={e => updateRow(index, { ingredientId: e.target.value })}
                    data-testid="rs-ingredient"
                    className="w-full px-3 py-2 rounded-xl border text-sm font-semibold outline-none bg-transparent focus:border-[#FFC928]"
                  >
                    <option value="">Insumo...</option>
                    {ingredients.map(i => (
                      <option key={i.id} value={i.id}>{i.name} ({formatCurrency(i.costPerUnit)}/{i.unit})</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min="0"
                    step="0.001"
                    value={row.quantity}
                    onChange={e => updateRow(index, { quantity: e.target.value })}
                    placeholder={`qtd ${ing?.unit || ''}`}
                    data-testid="rs-qty"
                    className="w-full px-3 py-2 rounded-xl border text-sm font-semibold outline-none bg-transparent focus:border-[#FFC928]"
                  />
                  <div className="text-right">
                    <p className="text-xs font-black text-[#FFC928]">{formatCurrency(cost)}</p>
                    <p className="text-[9px] text-gray-400 font-semibold">custo</p>
                  </div>
                  <button onClick={() => removeRow(index)} className="p-2 rounded-lg text-gray-400 hover:text-rose-400 hover:bg-white/5 transition-colors">
                    <Trash2 size={15} />
                  </button>
                </motion.div>
              );
            })}

            {rows.length === 0 && (
              <div className={`rounded-2xl border border-dashed p-8 text-center ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
                <ChefHat size={26} className="mx-auto text-gray-400 mb-2" />
                <p className="text-sm font-bold text-gray-400">Nenhum insumo nesta ficha ainda. Adicione os ingredientes do produto.</p>
              </div>
            )}
          </div>

          <button onClick={addRow} data-testid="rs-add-row" className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-sm font-black uppercase tracking-widest transition-colors mb-6">
            <Plus size={16} /> Adicionar insumo
          </button>

          <div className={`rounded-2xl border p-5 mb-6 ${isDark ? 'bg-zinc-950/60 border-white/5' : 'bg-white border-gray-100'}`}>
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">Resumo</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-xl font-black text-[#FFC928]">{formatCurrency(totalCost)}</p>
                <p className="text-[10px] text-gray-400 font-semibold">Custo total</p>
              </div>
              <div>
                <p className="text-xl font-black">{price > 0 ? costPct.toFixed(1) + '%' : '—'}</p>
                <p className="text-[10px] text-gray-400 font-semibold">% custo sobre venda</p>
              </div>
              <div>
                <p className={`text-xl font-black ${margin >= 0 ? 'text-emerald-500' : 'text-rose-400'}`}>{formatCurrency(margin)}</p>
                <p className="text-[10px] text-gray-400 font-semibold">Margem por venda</p>
              </div>
              <div>
                <p className={`text-xl font-black ${margin >= 0 ? '' : 'text-rose-400'}`}>{price > 0 ? Math.max(0, 100 - costPct).toFixed(1) + '%' : '—'}</p>
                <p className="text-[10px] text-gray-400 font-semibold">Margem %</p>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={handleSave} data-testid="rs-save" className="flex items-center gap-2 px-5 py-3 rounded-xl bg-[#FFC928] text-[#111] text-xs font-black uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all">
              <Save size={16} /> Salvar Ficha Técnica
            </button>
            {existingSheet && (
              <button onClick={handleDelete} className="px-5 py-3 rounded-xl bg-rose-500/10 text-rose-400 text-xs font-black uppercase tracking-widest hover:bg-rose-500/20 transition-colors">
                Excluir
              </button>
            )}
          </div>
        </>
      ) : (
        <div className={`rounded-2xl border border-dashed p-12 text-center ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
          <ClipboardList size={32} className="mx-auto text-gray-400 mb-3" />
          <p className="font-bold text-gray-400">Selecione um produto acima para montar sua ficha técnica.</p>
        </div>
      )}
    </AdminLayout>
  );
}
