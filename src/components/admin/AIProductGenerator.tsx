import { useState } from 'react';
import { Sparkles, X, Loader2, Wand2, Check, Utensils, DollarSign, Clock, Image as ImageIcon } from 'lucide-react';
import { Button } from '../Button';
import { toast } from 'react-hot-toast';
import { db } from '../../lib/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { cn } from '../../lib/utils';
import { authedFetch } from '../../lib/api';

interface AIProductGeneratorProps {
  restaurantId: string;
  categoryId: string;
  categoryName: string;
  onClose: () => void;
  onSuccess: () => void;
}

interface GeneratedProduct {
  name: string;
  description: string;
  price: number;
  estimatedPrepTime: number;
  imageUrl: string;
}

interface ValidationErrors {
  name?: string;
  description?: string;
  price?: string;
  estimatedPrepTime?: string;
  imageUrl?: string;
}

const PRESET_IMAGES = [
  { label: 'Burguer', url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=300&fit=crop' },
  { label: 'Pizza', url: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400&h=300&fit=crop' },
  { label: 'Massa', url: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=400&h=300&fit=crop' },
  { label: 'Salada', url: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&h=300&fit=crop' },
  { label: 'Sushi', url: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=400&h=300&fit=crop' },
  { label: 'Sobremesa', url: 'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=400&h=300&fit=crop' },
  { label: 'Bebida', url: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=400&h=300&fit=crop' }
];

const getFallbackImageUrl = (name: string, category: string): string => {
  const n = name.toLowerCase();
  const c = category.toLowerCase();
  if (n.includes('hamburguer') || n.includes('burger') || n.includes('burguer') || c.includes('lanche')) {
    return 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=300&fit=crop';
  }
  if (n.includes('pizza') || n.includes('calzone') || c.includes('pizza')) {
    return 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400&h=300&fit=crop';
  }
  if (n.includes('doce') || n.includes('sobremesa') || n.includes('bolo') || n.includes('chocolate') || c.includes('sobremesa') || c.includes('doce')) {
    return 'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=400&h=300&fit=crop';
  }
  if (n.includes('bebida') || n.includes('suco') || n.includes('refrigerante') || n.includes('coca') || n.includes('cerveja') || c.includes('bebida')) {
    return 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=400&h=300&fit=crop';
  }
  if (n.includes('salada') || n.includes('fit') || c.includes('fit') || c.includes('salada')) {
    return 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&h=300&fit=crop';
  }
  if (n.includes('sushi') || n.includes('temaki') || n.includes('peixe') || c.includes('japonesa') || c.includes('peixe')) {
    return 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=400&h=300&fit=crop';
  }
  if (n.includes('massa') || n.includes('macarrao') || n.includes('lasanha') || c.includes('italiana') || c.includes('massa')) {
    return 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=400&h=300&fit=crop';
  }
  return 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop';
};

export default function AIProductGenerator({ 
  restaurantId, 
  categoryId, 
  categoryName,
  onClose, 
  onSuccess 
}: AIProductGeneratorProps) {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [generatedProduct, setGeneratedProduct] = useState<GeneratedProduct | null>(null);
  const [applying, setApplying] = useState(false);

  // States for live Editing
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editPrepTime, setEditPrepTime] = useState('');
  const [editImageUrl, setEditImageUrl] = useState('');
  const [errors, setErrors] = useState<ValidationErrors>({});

  const validateInputs = (): boolean => {
    const newErrors: ValidationErrors = {};

    // Name Validation
    if (!editName.trim()) {
      newErrors.name = 'O nome do produto é obrigatório';
    } else if (editName.trim().length < 3) {
      newErrors.name = 'O nome deve ter no mínimo 3 caracteres';
    }

    // Description Validation
    if (!editDescription.trim()) {
      newErrors.description = 'A descrição é obrigatória';
    }

    // Price Validation
    const numPrice = parseFloat(editPrice);
    if (!editPrice.trim() || isNaN(numPrice)) {
      newErrors.price = 'Digite um valor de preço válido';
    } else if (numPrice <= 0) {
      newErrors.price = 'O preço deve ser superior a R$ 0,00';
    } else if (numPrice > 9999.99) {
      newErrors.price = 'O preço deve ser de no máximo R$ 9.999,99';
    } else if (!/^\d+(\.\d{1,2})?$/.test(editPrice)) {
      newErrors.price = 'O preço deve ter no máximo 2 casas decimais';
    }

    // Preparation Time Validation
    const numPrepTime = parseInt(editPrepTime, 10);
    if (!editPrepTime.trim() || isNaN(numPrepTime)) {
      newErrors.estimatedPrepTime = 'Digite um tempo de preparo válido';
    } else if (numPrepTime < 1) {
      newErrors.estimatedPrepTime = 'O tempo de preparo deve ser de pelo menos 1 minuto';
    } else if (numPrepTime > 180) {
      newErrors.estimatedPrepTime = 'O tempo máximo permitido é de 180 minutos';
    } else if (numPrepTime !== parseFloat(editPrepTime)) {
      newErrors.estimatedPrepTime = 'O tempo de preparo deve ser um número inteiro';
    }

    // Image URL Validation
    const trimmedUrl = editImageUrl.trim();
    if (!trimmedUrl) {
      newErrors.imageUrl = 'A URL da imagem é obrigatória';
    } else {
      try {
        const url = new URL(trimmedUrl);
        if (url.protocol !== 'http:' && url.protocol !== 'https:') {
          newErrors.imageUrl = 'A URL da imagem deve começar com http:// ou https://';
        }
      } catch {
        newErrors.imageUrl = 'URL de imagem inválida ou em formato incorreto';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const generateProduct = async () => {
    setLoading(true);
    setErrors({});
    try {
      const resp = await authedFetch('/api/ai/generate-product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categoryName, prompt: prompt || undefined })
      });
      if (!resp.ok) {
        const errData = await resp.json();
        throw new Error(errData.error || 'Erro na geração');
      }
      const respData = await resp.json();
      const result = respData.data;

      let imageSrc = result.imageUrl || '';
      if (!imageSrc || (!imageSrc.startsWith('http://') && !imageSrc.startsWith('https://'))) {
        imageSrc = getFallbackImageUrl(result.name || '', categoryName);
      }

      const generated: GeneratedProduct = {
        name: result.name || '',
        description: result.description || '',
        price: Number(result.price) || 29.90,
        estimatedPrepTime: Number(result.estimatedPrepTime) || 20,
        imageUrl: imageSrc
      };

      setGeneratedProduct(generated);
      setEditName(generated.name);
      setEditDescription(generated.description);
      setEditPrice(generated.price.toFixed(2));
      setEditPrepTime(generated.estimatedPrepTime.toString());
      setEditImageUrl(generated.imageUrl);
      
      toast.success('Produto especial sugerido pela IA!');
    } catch (error) {
      console.error('Erro ao gerar produto:', error);
      toast.error('Erro ao gerar sugestão de item. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const applyProduct = async () => {
    if (!generatedProduct) return;

    // Check robust validations
    const isValid = validateInputs();
    if (!isValid) {
      toast.error('Por favor, corrija as informações do produto antes de publicar.');
      return;
    }

    setApplying(true);
    try {
      await addDoc(collection(db, 'products'), {
        restaurantId,
        categoryId,
        name: editName.trim(),
        description: editDescription.trim(),
        price: parseFloat(editPrice),
        estimatedPrepTime: parseInt(editPrepTime, 10),
        imageUrl: editImageUrl.trim(),
        isActive: true,
        isAvailable: true,
        isFeatured: false,
        optionGroups: [],
        createdAt: new Date().toISOString()
      });

      toast.success('Produto publicado com sucesso!');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Erro ao salvar produto:', error);
      toast.error('Erro ao salvar o produto no banco.');
    } finally {
      setApplying(false);
    }
  };

  return (
    <div role="dialog" aria-modal="true" aria-label="Gerar produto com IA" className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
      <div className="bg-white rounded-[2rem] w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-100 bg-brand-black text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
             <div className="p-2.5 bg-orange-500 rounded-2xl shadow-lg shadow-orange-500/20">
              <Sparkles className="text-white" size={20} />
             </div>
             <div>
              <h3 className="text-lg font-black uppercase italic tracking-tight leading-none">Criador de Produto IA</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Criação automatizada para {categoryName}</p>
             </div>
          </div>
          <button onClick={onClose} aria-label="Fechar" className="p-1.5 hover:bg-white/10 rounded-xl transition-all text-slate-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
          {!generatedProduct ? (
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">O que você tem em mente para o prato? (Opcional)</label>
                <textarea 
                  placeholder="Ex: Um risoto cremoso de limão siciliano com camarões grelhados no azeite de ervas..."
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 font-bold text-slate-700 h-28 resize-none focus:border-orange-500 focus:bg-white transition-all outline-none leading-relaxed text-sm"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                />
              </div>

              <Button 
                onClick={generateProduct} 
                disabled={loading}
                className="w-full h-16 bg-orange-600 text-white hover:bg-orange-700 rounded-2xl font-black text-sm uppercase tracking-[0.2em] italic shadow-xl shadow-orange-500/10 disabled:opacity-50"
              >
                {loading ? (
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="animate-spin" size={20} />
                    <span>CHEF IA ELABORANDO...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    <Wand2 size={20} />
                    <span>GERAR COM IA</span>
                  </div>
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
               
               {/* Live Card Preview */}
               <div className="bg-slate-50 rounded-2xl border-2 border-orange-100 overflow-hidden">
                  <div className="bg-orange-50 px-5 py-2.5 border-b border-orange-100 flex items-center justify-between">
                    <h4 className="text-[10px] font-black text-orange-850 uppercase tracking-widest flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-ping" />
                      Visualização em Tempo Real
                    </h4>
                    <Utensils size={14} className="text-orange-500" />
                  </div>
                  <div className="p-5 flex gap-4 items-center">
                    <div className="w-20 h-20 rounded-2xl overflow-hidden bg-slate-200 flex-shrink-0 relative border border-slate-100/50 shadow-inner">
                      <img 
                        src={editImageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop'} 
                        alt={editName || 'Produto'}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop';
                        }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-black text-slate-800 text-sm truncate uppercase leading-tight italic">{editName || 'Aguardando nome...'}</p>
                        <p className="font-mono text-sm font-black text-orange-600 shrink-0">
                          R$ {isNaN(parseFloat(editPrice)) ? '0.00' : parseFloat(editPrice).toFixed(2)}
                        </p>
                      </div>
                      <p className="text-xs text-slate-500 line-clamp-2 mt-1 leading-relaxed">{editDescription || 'O chef IA está definindo a descrição ideal.'}</p>
                      <div className="flex items-center gap-1.5 mt-2.5">
                        <span className="text-[9px] bg-slate-200 px-2 py-0.5 rounded-lg font-black uppercase text-slate-600 tracking-wider">
                          {editPrepTime || '0'} MIN PREPARO
                        </span>
                      </div>
                    </div>
                  </div>
               </div>

               {/* Editor Form for robust validations & edits */}
               <div className="space-y-4">
                 
                 {/* Product Name */}
                 <div className="space-y-1">
                   <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Nome do Item</label>
                   <input 
                     type="text"
                     value={editName}
                     onChange={(e) => {
                       setEditName(e.target.value);
                       if (errors.name) setErrors(prev => ({ ...prev, name: undefined }));
                     }}
                     className={cn(
                       "w-full bg-slate-50 border-2 rounded-xl px-4 py-2.5 font-bold text-slate-700 text-sm focus:bg-white transition-all outline-none",
                       errors.name ? "border-red-500 focus:border-red-500" : "border-slate-100 focus:border-orange-500"
                     )}
                   />
                   {errors.name && <p className="text-red-500 text-[10px] font-black uppercase tracking-wider mt-0.5">{errors.name}</p>}
                 </div>

                 {/* Description */}
                 <div className="space-y-1">
                   <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Descrição (Apetitosa e Completa)</label>
                   <textarea 
                     value={editDescription}
                     onChange={(e) => {
                       setEditDescription(e.target.value);
                       if (errors.description) setErrors(prev => ({ ...prev, description: undefined }));
                     }}
                     className={cn(
                       "w-full bg-slate-50 border-2 rounded-xl px-4 py-2 font-bold text-slate-700 text-sm h-16 resize-none focus:bg-white transition-all outline-none leading-relaxed",
                       errors.description ? "border-red-500 focus:border-red-500" : "border-slate-100 focus:border-orange-500"
                     )}
                   />
                   {errors.description && <p className="text-red-500 text-[10px] font-black uppercase tracking-wider mt-0.5">{errors.description}</p>}
                 </div>

                 {/* Price & Prep Time Grid */}
                 <div className="grid grid-cols-2 gap-4">
                   
                   {/* Price Field */}
                   <div className="space-y-1">
                     <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1">
                       <DollarSign size={10} className="text-slate-400" />
                       Preço (R$)
                     </label>
                     <input 
                       type="text"
                       placeholder="Ex: 39.90"
                       value={editPrice}
                       onChange={(e) => {
                         // Only allow numbers & dot
                         const val = e.target.value.replace(/[^0-9.]/g, '');
                         setEditPrice(val);
                         if (errors.price) setErrors(prev => ({ ...prev, price: undefined }));
                       }}
                       className={cn(
                         "w-full bg-slate-50 border-2 rounded-xl px-4 py-2.5 font-bold text-slate-700 text-sm focus:bg-white transition-all outline-none",
                         errors.price ? "border-red-500 focus:border-red-500" : "border-slate-100 focus:border-orange-500"
                       )}
                     />
                     {errors.price && <p className="text-red-500 text-[9px] font-black uppercase tracking-wider leading-relaxed mt-0.5">{errors.price}</p>}
                   </div>

                   {/* Prep Time Field */}
                   <div className="space-y-1">
                     <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1">
                       <Clock size={10} className="text-slate-400" />
                       Preparo (Minutos)
                     </label>
                     <input 
                       type="text"
                       placeholder="Ex: 15"
                       value={editPrepTime}
                       onChange={(e) => {
                         // Only allow numbers
                         const val = e.target.value.replace(/[^0-9]/g, '');
                         setEditPrepTime(val);
                         if (errors.estimatedPrepTime) setErrors(prev => ({ ...prev, estimatedPrepTime: undefined }));
                       }}
                       className={cn(
                         "w-full bg-slate-50 border-2 rounded-xl px-4 py-2.5 font-bold text-slate-700 text-sm focus:bg-white transition-all outline-none",
                         errors.estimatedPrepTime ? "border-red-500 focus:border-red-500" : "border-slate-100 focus:border-orange-500"
                       )}
                     />
                     {errors.estimatedPrepTime && <p className="text-red-500 text-[9px] font-black uppercase tracking-wider leading-relaxed mt-0.5">{errors.estimatedPrepTime}</p>}
                   </div>

                 </div>

                 {/* Image URL with validation */}
                 <div className="space-y-1.5">
                   <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1">
                     <ImageIcon size={10} className="text-slate-400" />
                     URL da Imagem
                   </label>
                   <input 
                     type="text"
                     placeholder="https://images.unsplash.com/..."
                     value={editImageUrl}
                     onChange={(e) => {
                       setEditImageUrl(e.target.value);
                       if (errors.imageUrl) setErrors(prev => ({ ...prev, imageUrl: undefined }));
                     }}
                     className={cn(
                       "w-full bg-slate-50 border-2 rounded-xl px-4 py-2.5 font-bold text-slate-700 text-xs focus:bg-white transition-all outline-none",
                       errors.imageUrl ? "border-red-500 focus:border-red-500" : "border-slate-100 focus:border-orange-500"
                     )}
                   />
                   {errors.imageUrl && <p className="text-red-500 text-[9px] font-black uppercase tracking-wider leading-relaxed mt-0.5">{errors.imageUrl}</p>}
                   
                   {/* Fast Stock Image Picker helper */}
                   <div className="mt-2.5">
                     <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider mb-1.5">Fotos Recomendadas do Unsplash (1-Clique)</p>
                     <div className="flex flex-wrap gap-1.5">
                       {PRESET_IMAGES.map((img) => (
                         <button
                           key={img.label}
                           type="button"
                           onClick={() => {
                             setEditImageUrl(img.url);
                             if (errors.imageUrl) setErrors(prev => ({ ...prev, imageUrl: undefined }));
                           }}
                           className={cn(
                             "px-2 px-[7px] py-[4px] rounded-lg border text-[9px] font-bold uppercase transition-all",
                             editImageUrl === img.url
                               ? "bg-orange-550 border-orange-500 bg-orange-500 text-white shadow-sm"
                               : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:border-slate-300"
                           )}
                         >
                           {img.label}
                         </button>
                       ))}
                     </div>
                   </div>
                 </div>

               </div>

               {/* Action Buttons */}
               <div className="flex gap-3 pt-3">
                  <Button 
                    variant="outline" 
                    className="flex-1 h-12 rounded-xl font-black text-[10px] uppercase tracking-widest text-[#111] hover:bg-gray-100"
                    onClick={() => {
                      setGeneratedProduct(null);
                      setErrors({});
                    }}
                    disabled={applying}
                  >
                    TENTAR OUTRO
                  </Button>
                  <Button 
                    className="flex-1 h-12 bg-brand-black text-white hover:bg-slate-800 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-black/5"
                    onClick={applyProduct}
                    disabled={applying}
                  >
                    {applying ? (
                      <div className="flex items-center gap-1.5 justify-center">
                        <Loader2 className="animate-spin" size={14} />
                        <span>PUBLICANDO...</span>
                      </div>
                    ) : (
                      <span>PUBLICAR PRATO</span>
                    )}
                  </Button>
               </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
