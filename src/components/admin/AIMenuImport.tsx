import { useState, useRef, type ChangeEvent } from 'react';
import { Upload, X, Loader2, FileText, Image, Check, AlertCircle, Sparkles } from 'lucide-react';
import { Button } from '../Button';
import { toast } from 'react-hot-toast';
import { db } from '../../lib/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { authedFetch } from '../../lib/api';

interface AIMenuImportProps {
  restaurantId: string;
  onClose: () => void;
  onSuccess: () => void;
}

interface ParsedItem {
  name: string;
  price: number;
  category: string;
}

interface ParsedData {
  categories: string[];
  products: ParsedItem[];
}

export default function AIMenuImport({ restaurantId, onClose, onSuccess }: AIMenuImportProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);
  const [parsed, setParsed] = useState<ParsedData | null>(null);
  const [applying, setApplying] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;

    if (f.size > 10 * 1024 * 1024) {
      toast.error('Arquivo muito grande. Máximo 10MB.');
      return;
    }

    setFile(f);
    setParsed(null);

    if (f.type.startsWith('image/')) {
      const url = URL.createObjectURL(f);
      setPreview(url);
    } else {
      setPreview(null);
    }
  };

  const handleParse = async () => {
    if (!file) return;
    setParsing(true);
    const toastId = toast.loading('A IA está lendo o cardápio...');

    try {
      const reader = new FileReader();
      const result = await new Promise<string>((resolve, reject) => {
        reader.onload = (ev) => resolve(ev.target?.result as string);
        reader.onerror = () => reject(new Error('Falha ao ler arquivo'));
        reader.readAsDataURL(file);
      });

      const commaIndex = result.indexOf(',');
      const base64Data = result.slice(commaIndex + 1);

      const resp = await authedFetch('/api/ai/parse-menu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileData: base64Data,
          mimeType: file.type || 'image/jpeg'
        })
      });

      const data = await resp.json();
      if (!resp.ok || !data.success || !data.data) {
        throw new Error(data.error || 'Falha ao processar com IA');
      }

      setParsed(data.data);
      toast.success('Cardápio importado com sucesso!', { id: toastId });
    } catch (err: unknown) {
      toast.error(`Erro: ${(err as Error).message}`, { id: toastId });
    } finally {
      setParsing(false);
    }
  };

  const handleApply = async () => {
    if (!parsed) return;
    setApplying(true);

    try {
      const catMap: Record<string, string> = {};

      for (const catName of parsed.categories) {
        const catRef = await addDoc(collection(db, 'categories'), {
          restaurantId,
          name: catName,
          order: Object.keys(catMap).length,
          isActive: true
        });
        catMap[catName] = catRef.id;
      }

      for (const prod of parsed.products) {
        const catId = catMap[prod.category] || '';
        await addDoc(collection(db, 'products'), {
          restaurantId,
          categoryId: catId,
          name: prod.name,
          price: prod.price,
          isActive: true,
          isAvailable: true,
          isFeatured: false,
          optionGroups: [],
          createdAt: new Date().toISOString()
        });
      }

      toast.success(`${parsed.products.length} produtos adicionados ao cardápio!`);
      onSuccess();
      onClose();
    } catch (err: unknown) {
      toast.error('Erro ao salvar cardápio: ' + (err as Error).message);
    } finally {
      setApplying(false);
    }
  };

  const allowedTypes = 'image/*,application/pdf,.doc,.docx';

  return (
    <div role="dialog" aria-modal="true" aria-label="Importar cardápio com IA" className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md">
      <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-slate-100 bg-brand-black text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand-egg rounded-xl">
              <Upload className="text-brand-black" size={20} />
            </div>
            <div>
              <h3 className="text-lg font-black uppercase italic tracking-tighter leading-none">Importar Cardápio</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Foto, PDF ou Word</p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Fechar" className="text-slate-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          {!parsed ? (
            <div className="space-y-6">
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 text-center space-y-4">
                <div className="w-16 h-16 mx-auto bg-brand-egg/20 rounded-2xl flex items-center justify-center">
                  {file && preview ? (
                    <img src={preview} alt="Preview" className="w-full h-full object-cover rounded-2xl" />
                  ) : file ? (
                    <FileText size={28} className="text-brand-black" />
                  ) : (
                    <Image size={28} className="text-brand-black" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-black text-slate-700 uppercase">
                    {file ? file.name : 'Selecione uma foto ou documento'}
                  </p>
                  {file && (
                    <p className="text-[10px] text-slate-400 font-bold mt-1">
                      {(file.size / 1024 / 1024).toFixed(1)}MB
                    </p>
                  )}
                </div>
              </div>

              <input
                ref={inputRef}
                type="file"
                accept={allowedTypes}
                onChange={handleFileSelect}
                className="hidden"
              />

              <Button
                variant="outline"
                onClick={() => inputRef.current?.click()}
                className="w-full h-14 rounded-2xl font-black text-xs uppercase tracking-widest border-2 border-dashed"
              >
                <Upload className="mr-2" size={18} />
                {file ? 'TROCAR ARQUIVO' : 'SELECIONAR FOTO / PDF / WORD'}
              </Button>

              {file && (
                <Button
                  onClick={handleParse}
                  disabled={parsing}
                  className="w-full h-14 bg-brand-egg text-brand-black hover:bg-yellow-400 rounded-2xl font-black text-xs uppercase tracking-[0.2em] italic border-b-4 border-yellow-600 shadow-lg shadow-yellow-100 disabled:opacity-50"
                >
                  {parsing ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="animate-spin" size={20} />
                      <span>LENDO CARDÁPIO...</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Sparkles size={20} />
                      <span>LER CARDÁPIO COM IA</span>
                    </div>
                  )}
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-black text-brand-black uppercase italic tracking-tighter">Cardápio Extraído</h4>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                    {parsed.categories.length} categorias · {parsed.products.length} produtos
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => { setParsed(null); setFile(null); setPreview(null); }} className="h-9 px-4 text-[10px] font-black">
                  NOVO ARQUIVO
                </Button>
              </div>

              <div className="space-y-4">
                {parsed.categories.map((cat, idx) => {
                  const items = parsed.products.filter(p => p.category === cat);
                  return (
                    <div key={idx} className="bg-slate-50 rounded-2xl border border-slate-100 overflow-hidden">
                      <div className="bg-slate-200/50 px-5 py-3 border-b border-slate-200">
                        <h5 className="text-[11px] font-black text-brand-black uppercase tracking-wider">{cat}</h5>
                        <span className="text-[9px] font-bold text-slate-400">{items.length} itens</span>
                      </div>
                      <div className="p-4 space-y-3">
                        {items.map((item, iidx) => (
                          <div key={iidx} className="flex justify-between items-center gap-4">
                            <p className="text-sm font-black text-slate-700 uppercase leading-none">{item.name}</p>
                            <p className="text-xs font-black text-orange-600 shrink-0">R$ {item.price.toFixed(2)}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl flex items-start gap-3">
                <AlertCircle size={18} className="text-amber-500 shrink-0 mt-0.5" />
                <p className="text-[10px] font-bold text-amber-700 leading-relaxed uppercase italic">
                  Revise os dados extraídos. Ao aplicar, as categorias e produtos serão adicionados ao seu cardápio atual.
                </p>
              </div>
            </div>
          )}
        </div>

        {parsed && (
          <div className="p-6 border-t border-slate-100 bg-white flex gap-3 shrink-0">
            <Button variant="outline" className="flex-1 h-14 rounded-2xl font-black text-xs uppercase tracking-widest" onClick={onClose} disabled={applying}>
              CANCELAR
            </Button>
            <Button onClick={handleApply} disabled={applying} className="flex-[2] h-14 bg-brand-egg text-brand-black hover:bg-yellow-400 rounded-2xl font-black text-xs uppercase tracking-widest border-b-4 border-yellow-600 shadow-lg shadow-yellow-100 disabled:opacity-50">
              {applying ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="animate-spin" size={18} />
                  <span>APLICANDO...</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Check size={18} strokeWidth={3} />
                  <span>APLICAR ESTE CARDÁPIO</span>
                </div>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
