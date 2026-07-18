import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Printer, Plus, Search, CalendarDays, Barcode, History, Package, QrCode, FileText } from 'lucide-react';
import AdminLayout from './AdminLayout';
import { db } from '../../lib/firebase';
import { collection, query, where, orderBy, limit, onSnapshot, addDoc } from 'firebase/firestore';
import { useRestaurant } from '../../context/RestaurantContext';
import { Product, AllergenKey, LabelRecord } from '../../types';
import { ALLERGENS, ALLERGEN_MAP, STORAGE_OPTIONS } from '../../data/allergens';
import { motion } from 'motion/react';
import { toast } from 'react-hot-toast';

function generateBatch(): string {
  const date = new Date();
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = String(date.getFullYear()).slice(-2);
  const r = Math.floor(Math.random() * 9000) + 1000;
  return `L-${d}${m}${y}-${r}`;
}

function formatDate(d: Date): string {
  return d.toLocaleDateString('pt-BR');
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export default function LabelManagement() {
  const navigate = useNavigate();
  const { currentRestaurant } = useRestaurant();
  const [products, setProducts] = useState<Product[]>([]);
  const [labels, setLabels] = useState<LabelRecord[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [operatorName, setOperatorName] = useState('');
  const [batchNumber, setBatchNumber] = useState(generateBatch());
  const [prepDate, setPrepDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchTerm, setSearchTerm] = useState('');
  const [tab, setTab] = useState<'generate' | 'history'>('generate');
  const [previewLabel, setPreviewLabel] = useState<LabelRecord | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!currentRestaurant) return;
    const qProd = query(collection(db, 'products'), where('restaurantId', '==', currentRestaurant.id));
    const unsubProd = onSnapshot(qProd, snap => setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() } as Product))));
    const qLabels = query(collection(db, 'labels'), where('restaurantId', '==', currentRestaurant.id), orderBy('printedAt', 'desc'), limit(100));
    const unsubLabels = onSnapshot(qLabels, snap => setLabels(snap.docs.map(d => ({ id: d.id, ...d.data() } as LabelRecord))));
    return () => { unsubProd(); unsubLabels(); };
  }, [currentRestaurant]);

  const filteredProducts = products.filter(p =>
    p.isActive && (p.name.toLowerCase().includes(searchTerm.toLowerCase()) || searchTerm === '')
  );

  const selectedProduct = products.find(p => p.id === selectedProductId);
  const labelInfo = selectedProduct?.labelInfo;
  const selectedAllergens: AllergenKey[] = selectedProduct?.selectedAllergens || [];

  const prepDateObj = new Date(prepDate + 'T12:00:00');
  const expiryDate = labelInfo?.shelfLifeDays ? addDays(prepDateObj, labelInfo.shelfLifeDays) : null;
  const expiryDateStr = expiryDate ? formatDate(expiryDate) : '—';

  const canGenerate = selectedProduct && operatorName.trim() && batchNumber.trim() && prepDate;

  const handleGenerate = async () => {
    if (!currentRestaurant || !selectedProduct || !canGenerate) return;
    try {
      const record: Omit<LabelRecord, 'id'> = {
        restaurantId: currentRestaurant.id,
        productId: selectedProduct.id,
        productName: selectedProduct.name,
        batchNumber: batchNumber.trim(),
        prepDate,
        expiryDate: expiryDate?.toISOString() || '',
        storageType: labelInfo?.storageType || 'refrigerated',
        storageInstructions: labelInfo?.storageInstructions || '',
        allergens: selectedAllergens,
        operatorName: operatorName.trim(),
        printedAt: new Date().toISOString(),
        restaurantName: currentRestaurant.name,
        restaurantLogo: currentRestaurant.logo,
      };
      await addDoc(collection(db, 'labels'), record);
      toast.success('Etiqueta gerada com sucesso!');
      setPreviewLabel({ id: 'preview', ...record });
      setBatchNumber(generateBatch());
    } catch {
      toast.error('Erro ao gerar etiqueta');
    }
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank', 'width=400,height=600');
    if (!printWindow || !previewLabel) return;
    printWindow.document.write(printLabelHTML(previewLabel));
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 500);
  };

  const handleRePrint = (label: LabelRecord) => {
    const printWindow = window.open('', '_blank', 'width=400,height=600');
    if (!printWindow) return;
    printWindow.document.write(printLabelHTML(label));
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 500);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tight text-white">Etiquetas</h1>
            <p className="text-sm text-gray-400">Gere e imprima etiquetas padronizadas para seus produtos</p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex gap-1 bg-zinc-900/50 border border-zinc-800 rounded-xl p-1 w-fit">
          {[
            { key: 'generate', label: 'Gerar Etiqueta', icon: <FileText size={14} /> },
            { key: 'history', label: 'Histórico', icon: <History size={14} /> },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key as 'generate' | 'history')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${tab === t.key ? 'bg-[#FFC928] text-black' : 'text-gray-400 hover:text-white'}`}
            >{t.icon} {t.label}</button>
          ))}
        </div>

        {tab === 'generate' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Form */}
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 space-y-5">
              <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                <Package size={14} /> Dados da Etiqueta
              </h3>

              {/* Product search */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-wider">Produto</label>
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input type="text" placeholder="Buscar produto..." value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#FFC928]" />
                </div>
                {searchTerm && (
                  <div className="max-h-40 overflow-y-auto bg-zinc-800 border border-zinc-700 rounded-xl mt-1">
                    {filteredProducts.map(p => (
                      <button key={p.id} onClick={() => { setSelectedProductId(p.id); setSearchTerm(''); }}
                        className={`w-full text-left px-4 py-2.5 text-sm hover:bg-zinc-700 transition-colors ${selectedProductId === p.id ? 'bg-zinc-700 text-[#FFC928]' : 'text-gray-300'}`}
                      >{p.name}</button>
                    ))}
                    {filteredProducts.length === 0 && <p className="px-4 py-3 text-sm text-gray-500">Nenhum produto encontrado</p>}
                  </div>
                )}
                {selectedProduct && (
                  <div className="flex items-center gap-3 mt-2 bg-zinc-800/50 rounded-xl p-3">
                    {selectedProduct.imageUrl && <img src={selectedProduct.imageUrl} alt="" className="w-8 h-8 rounded-lg object-cover" />}
                    <div>
                      <p className="text-sm font-bold text-white">{selectedProduct.name}</p>
                      {labelInfo && <p className="text-[10px] text-gray-400">{labelInfo.shelfLifeDays} dias de validade • {STORAGE_OPTIONS.find(s => s.value === labelInfo.storageType)?.label}</p>}
                      {!labelInfo && <p className="text-[10px] text-[#FFC928]">Configure a validade no cardápio</p>}
                    </div>
                  </div>
                )}
              </div>

              {/* Batch & Operator */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-wider">Lote</label>
                  <div className="relative">
                    <Barcode size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input type="text" value={batchNumber}
                      onChange={e => setBatchNumber(e.target.value)}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-xl pl-9 pr-2 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#FFC928]" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-wider">Operador</label>
                  <div className="relative">
                    <input type="text" placeholder="Nome do operador" value={operatorName}
                      onChange={e => setOperatorName(e.target.value)}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#FFC928]" />
                  </div>
                </div>
              </div>

              {/* Prep Date */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-wider">Data de Preparo</label>
                <div className="relative">
                  <CalendarDays size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input type="date" value={prepDate}
                    onChange={e => setPrepDate(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#FFC928]" />
                </div>
              </div>

              {/* Expiry preview */}
              {selectedProduct && (
                <div className="bg-zinc-800/30 rounded-xl p-4 border border-zinc-700/50">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-wider">Validade Calculada</span>
                    <span className={`text-sm font-black ${expiryDate && expiryDate < new Date() ? 'text-red-400' : 'text-emerald-400'}`}>
                      {expiryDateStr}
                    </span>
                  </div>
                  {expiryDate && (
                    <p className="text-[10px] text-gray-500 mt-1">
                      {labelInfo?.shelfLifeDays ? `${labelInfo.shelfLifeDays} dias a partir do preparo` : 'Sem dados de validade configurados'}
                    </p>
                  )}
                </div>
              )}

              {/* Allergens preview */}
              {selectedAllergens.length > 0 && (
                <div>
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-wider mb-2 block">Alérgenos</label>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedAllergens.map(key => {
                      const a = ALLERGEN_MAP.get(key);
                      return a ? (
                        <span key={key} className="inline-flex items-center gap-1 bg-red-900/20 text-red-400 text-[10px] font-bold px-2 py-0.5 rounded-lg border border-red-800/30">
                          {a.icon} {a.label}
                        </span>
                      ) : null;
                    })}
                  </div>
                </div>
              )}

              <button onClick={handleGenerate} disabled={!canGenerate}
                className="w-full bg-[#FFC928] text-black font-black py-3 rounded-xl text-xs uppercase tracking-widest hover:bg-[#e6b520] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              ><Plus size={16} /> Gerar Etiqueta</button>
            </div>

            {/* Preview */}
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
              <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 flex items-center gap-2 mb-4">
                <QrCode size={14} /> Visualização
              </h3>
              {previewLabel ? (
                <div className="space-y-4">
                  <div ref={printRef} className="bg-white rounded-xl p-4 text-black max-w-xs mx-auto" style={{ fontFamily: 'monospace' }}>
                    <div className="text-center border-b border-dashed border-gray-300 pb-2 mb-2">
                      {currentRestaurant?.logo && <img src={currentRestaurant.logo} alt="" className="h-6 mx-auto mb-1" />}
                      <p className="text-[10px] font-bold uppercase tracking-wider">{currentRestaurant?.name}</p>
                    </div>
                    <p className="text-lg font-black text-center uppercase">{previewLabel.productName}</p>
                    <div className="text-[10px] space-y-1 mt-2 border-t border-dashed border-gray-200 pt-2">
                      <div className="flex justify-between"><span className="text-gray-500">Preparo:</span><span className="font-bold">{formatDate(new Date(previewLabel.prepDate))}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">Validade:</span><span className="font-bold">{previewLabel.expiryDate ? formatDate(new Date(previewLabel.expiryDate)) : '—'}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">Lote:</span><span className="font-bold">{previewLabel.batchNumber}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">Operador:</span><span className="font-bold">{previewLabel.operatorName}</span></div>
                    </div>
                    {previewLabel.allergens.length > 0 && (
                      <div className="mt-2 border-t border-dashed border-gray-200 pt-2">
                        <p className="text-[8px] font-black uppercase text-gray-500 mb-1">Alérgenos</p>
                        <div className="flex flex-wrap gap-1">
                          {previewLabel.allergens.map(key => {
                            const a = ALLERGEN_MAP.get(key);
                            return a ? <span key={key} className="text-[9px]">{a.icon} {a.label}</span> : null;
                          })}
                        </div>
                      </div>
                    )}
                    <div className="mt-2 border-t border-dashed border-gray-200 pt-2 text-[7px] text-gray-400 text-center uppercase tracking-wider">
                      {previewLabel.storageInstructions || STORAGE_OPTIONS.find(s => s.value === previewLabel.storageType)?.label || ''}
                    </div>
                    <div className="mt-2 pt-2 border-t border-dashed border-gray-200 text-center">
                      <span className="text-[7px] text-gray-400">Gerado por Meu OVO • {new Date(previewLabel.printedAt).toLocaleString('pt-BR')}</span>
                    </div>
                  </div>
                  <button onClick={handlePrint}
                    className="w-full bg-white/10 text-white font-black py-3 rounded-xl text-xs uppercase tracking-widest hover:bg-white/20 transition-all flex items-center justify-center gap-2"
                  ><Printer size={16} /> Imprimir Etiqueta</button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-gray-500">
                  <FileText size={48} className="mb-3 opacity-30" />
                  <p className="text-sm font-bold">Nenhuma etiqueta gerada</p>
                  <p className="text-[10px] text-gray-600">Preencha o formulário ao lado e clique em "Gerar Etiqueta"</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* History tab */}
        {tab === 'history' && (
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
            <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 flex items-center gap-2 mb-4">
              <History size={14} /> Últimas Etiquetas
            </h3>
            {labels.length === 0 ? (
              <div className="text-center py-12 text-gray-500 text-sm">Nenhuma etiqueta impressa ainda</div>
            ) : (
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {labels.map(label => (
                  <div key={label.id} className="flex items-center gap-4 bg-zinc-800/30 rounded-xl p-4 hover:bg-zinc-800/50 transition-colors">
                    <div className="w-8 h-8 rounded-lg bg-[#FFC928]/10 flex items-center justify-center shrink-0">
                      <FileText size={14} className="text-[#FFC928]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white truncate">{label.productName}</span>
                        <span className="text-[9px] text-gray-500 font-mono">{label.batchNumber}</span>
                      </div>
                      <div className="flex items-center gap-3 text-[10px] text-gray-500 mt-0.5">
                        <span>Val: {label.expiryDate ? formatDate(new Date(label.expiryDate)) : '—'}</span>
                        <span>•</span>
                        <span>{label.operatorName}</span>
                        <span>•</span>
                        <span>{new Date(label.printedAt).toLocaleDateString('pt-BR')}</span>
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      {label.allergens?.slice(0, 3).map(key => {
                        const a = ALLERGEN_MAP.get(key);
                        return a ? <span key={key} className="text-xs" title={a.label}>{a.icon}</span> : null;
                      })}
                      {label.allergens?.length > 3 && <span className="text-[9px] text-gray-500">+{label.allergens.length - 3}</span>}
                    </div>
                    <button onClick={() => handleRePrint(label)}
                      className="bg-zinc-700 hover:bg-zinc-600 text-white p-2 rounded-lg transition-colors" title="Reimprimir"
                    ><Printer size={14} /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

function printLabelHTML(label: LabelRecord): string {
  const allergensHtml = (label.allergens || [])
    .map(key => {
      const a = ALLERGEN_MAP.get(key);
      return a ? `<span style="font-size:10px;margin-right:4px">${a.icon} ${a.label}</span>` : '';
    })
    .join('');

  const storageLabel = STORAGE_OPTIONS.find(s => s.value === label.storageType)?.label || '';

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Etiqueta</title>
<style>
  @page { margin: 0; size: 100mm 150mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Courier New', monospace; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #fff; padding: 12px; }
  .label { width: 80mm; background: #fff; border: 2px solid #000; border-radius: 8px; padding: 12px; }
  .header { text-align: center; border-bottom: 2px dashed #ccc; padding-bottom: 8px; margin-bottom: 8px; }
  .header img { max-height: 24px; margin-bottom: 4px; }
  .header .restaurant { font-size: 9px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; }
  .product-name { font-size: 18px; font-weight: 900; text-align: center; text-transform: uppercase; margin: 8px 0; }
  .info { font-size: 10px; border-top: 1px dashed #ddd; padding-top: 6px; margin-top: 6px; }
  .info-row { display: flex; justify-content: space-between; padding: 2px 0; }
  .info-label { color: #666; }
  .info-value { font-weight: bold; }
  .allergens { border-top: 1px dashed #ddd; padding-top: 6px; margin-top: 6px; }
  .allergens-title { font-size: 8px; font-weight: 900; text-transform: uppercase; color: #666; margin-bottom: 4px; }
  .allergens-list { font-size: 10px; }
  .footer { border-top: 1px dashed #ddd; padding-top: 6px; margin-top: 6px; font-size: 7px; color: #999; text-align: center; text-transform: uppercase; letter-spacing: 1px; }
  .storage { font-size: 9px; font-weight: bold; text-align: center; margin-top: 6px; padding-top: 6px; border-top: 1px dashed #ddd; }
  @media print { body { padding: 0; } .label { border: none; } }
</style></head><body>
<div class="label">
  <div class="header">
    ${label.restaurantLogo ? `<img src="${label.restaurantLogo}" alt="Logo" />` : ''}
    <div class="restaurant">${label.restaurantName || ''}</div>
  </div>
  <div class="product-name">${label.productName}</div>
  <div class="info">
    <div class="info-row"><span class="info-label">Preparo</span><span class="info-value">${formatDate(new Date(label.prepDate))}</span></div>
    <div class="info-row"><span class="info-label">Validade</span><span class="info-value">${label.expiryDate ? formatDate(new Date(label.expiryDate)) : '—'}</span></div>
    <div class="info-row"><span class="info-label">Lote</span><span class="info-value">${label.batchNumber}</span></div>
    <div class="info-row"><span class="info-label">Operador</span><span class="info-value">${label.operatorName}</span></div>
  </div>
  ${allergensHtml ? `<div class="allergens"><div class="allergens-title">Alérgenos</div><div class="allergens-list">${allergensHtml}</div></div>` : ''}
  <div class="storage">${label.storageInstructions || storageLabel}</div>
  <div class="footer">Gerado por Meu OVO • ${new Date(label.printedAt).toLocaleString('pt-BR')}</div>
</div>
</body></html>`;
}
