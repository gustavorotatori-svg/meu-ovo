import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { Plus, CreditCard as Edit2, Trash2, ToggleLeft, ToggleRight, X, Check, Search, GripVertical, Upload, ImageOff } from 'lucide-react';
import AdminLayout from './AdminLayout';
import { useRestaurant } from '../../context/RestaurantContext';
import { Product, Category } from '../../types';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const EMPTY_PRODUCT: Omit<Product, 'id' | 'restaurantId' | 'createdAt' | 'isActive'> = {
  name: '',
  description: '',
  price: 0,
  categoryId: '',
  imageUrl: '',
  isAvailable: true,
  isFeatured: false,
  bestSeller: false,
  onPromotion: false,
  promotionPrice: undefined,
  ingredients: '',
  allergens: '',
  additionalGroups: [],
  order: 0,
};

export default function AdminMenu() {
  const { products, categories, currentRestaurant, addProduct, updateProduct, deleteProduct, addCategory, deleteCategory, reorderProducts, reorderCategories } = useRestaurant();
  const restaurantProducts = products.filter(p => p.restaurantId === currentRestaurant?.id).sort((a, b) => a.order - b.order);
  const restaurantCategories = categories.filter(c => c.restaurantId === currentRestaurant?.id).sort((a, b) => a.order - b.order);

  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [form, setForm] = useState(EMPTY_PRODUCT);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const filteredProducts = restaurantProducts.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDragEnd = (event: DragEndEvent, catId: string) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const catProducts = restaurantProducts.filter(p => p.categoryId === catId);
      const oldIndex = catProducts.findIndex(p => p.id === active.id);
      const newIndex = catProducts.findIndex(p => p.id === over.id);

      const reorderedCatProducts = arrayMove(catProducts, oldIndex, newIndex);
      
      // Update the order property for the affected items
      const updatedProducts = products.map((p: Product) => {
        if (p.restaurantId !== currentRestaurant?.id || p.categoryId !== catId) return p;
        const newCatIndex = reorderedCatProducts.findIndex((rp: Product) => rp.id === p.id);
        if (newCatIndex !== -1) {
          return { ...p, order: newCatIndex };
        }
        return p;
      });

      reorderProducts(updatedProducts);
    }
  };

  const handleCategoryDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = restaurantCategories.findIndex(c => c.id === active.id);
      const newIndex = restaurantCategories.findIndex(c => c.id === over.id);

      const reorderedCategories = arrayMove(restaurantCategories, oldIndex, newIndex);
      
      const updatedCategories = categories.map((c: Category) => {
        if (c.restaurantId !== currentRestaurant?.id) return c;
        const newCatIndex = reorderedCategories.findIndex((rc: Category) => rc.id === c.id);
        if (newCatIndex !== -1) {
          return { ...c, order: newCatIndex };
        }
        return c;
      });

      reorderCategories(updatedCategories);
    }
  };

  const openNew = () => {
    const defaultCat = restaurantCategories[0]?.id || '';
    const catProducts = restaurantProducts.filter(p => p.categoryId === defaultCat);
    setForm({ ...EMPTY_PRODUCT, categoryId: defaultCat, order: catProducts.length });
    setIsNew(true);
    setEditingProduct(null);
    setErrors({});
  };

  const openEdit = (p: Product) => {
    setForm({ ...p });
    setEditingProduct(p);
    setIsNew(false);
    setErrors({});
  };

  const closeModal = () => {
    setEditingProduct(null);
    setIsNew(false);
    setErrors({});
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!form.name.trim()) newErrors.name = 'Nome é obrigatório';
    else if (form.name.trim().length < 3) newErrors.name = 'Nome deve ter pelo menos 3 caracteres';
    
    if (form.price <= 0) newErrors.price = 'Preço deve ser maior que zero';
    
    if (!form.categoryId) newErrors.categoryId = 'Selecione uma categoria';
    
    if (form.onPromotion) {
      if (!form.promotionPrice || form.promotionPrice <= 0) {
        newErrors.promotionPrice = 'Preço promocional inválido';
      } else if (form.promotionPrice >= form.price) {
        newErrors.promotionPrice = 'Deve ser menor que o preço original';
      }
    }
    
    if (form.imageUrl && !form.imageUrl.startsWith('http') && !form.imageUrl.startsWith('data:image/')) {
      newErrors.imageUrl = 'URL da imagem deve começar com http/https';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error('Imagem muito grande. Máximo 2MB.'); return; }
    if (!file.type.startsWith('image/')) { toast.error('Formato inválido. Use imagem.'); return; }
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64String = event.target?.result as string;
      setForm(f => ({ ...f, imageUrl: base64String }));
      setErrors(prev => {
        const next = { ...prev };
        delete next.imageUrl;
        return next;
      });
      toast.success('Foto do produto adicionada!');
    };
    reader.onerror = () => toast.error('Erro ao carregar a imagem');
    reader.readAsDataURL(file);
  };

  const save = () => {
    if (!validate()) return;
    if (isNew) {
      addProduct({
        ...form,
        id: `p${Date.now()}`,
        restaurantId: currentRestaurant!.id,
        createdAt: new Date().toISOString(),
        price: Number(form.price),
        isActive: true,
      } as Product);
    } else if (editingProduct) {
      updateProduct({ ...editingProduct, ...form, price: Number(form.price) } as Product);
    }
    closeModal();
  };

  const toggleAvailable = (p: Product) => updateProduct({ ...p, isAvailable: !p.isAvailable });

  const addCat = () => {
    if (!newCatName.trim() || !currentRestaurant) return;
    addCategory({
      id: `cat${Date.now()}`,
      restaurantId: currentRestaurant.id,
      name: newCatName.trim(),
      order: restaurantCategories.length,
    });
    setNewCatName('');
  };

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-black text-2xl text-[#111]">Cardápio</h2>
        <button
          onClick={openNew}
          className="bg-[#FFC928] text-[#111] font-black px-5 py-3 rounded-xl hover:bg-[#e6b520] transition-colors flex items-center gap-2"
        >
          <Plus size={20} />
          Novo produto
        </button>
      </div>

      {/* Categories management */}
      <div className="bg-white rounded-2xl p-5 mb-6">
        <h3 className="font-bold text-[#111] mb-3">Categorias (Arraste para reordenar)</h3>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleCategoryDragEnd}
        >
          <SortableContext
            items={restaurantCategories.map(c => c.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="flex gap-2 flex-wrap mb-3">
              {restaurantCategories.map(cat => (
                <SortableCategoryItem key={cat.id} cat={cat} onDelete={() => deleteCategory(cat.id)} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
        <div className="flex gap-2">
          <input
            value={newCatName}
            onChange={e => setNewCatName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addCat()}
            placeholder="Nova categoria..."
            className="flex-1 border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-[#FFC928]"
          />
          <button onClick={addCat} aria-label="Adicionar" className="bg-[#FFC928] text-[#111] font-bold px-4 py-2 rounded-xl hover:bg-[#e6b520]">
            <Plus size={18} />
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
        <input
          type="text"
          placeholder="Buscar produtos pelo nome ou descrição..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-white border border-gray-200 rounded-2xl py-4 pl-12 pr-4 text-sm focus:outline-none focus:border-[#FFC928] shadow-sm transition-all"
        />
      </div>

      {/* Products by category */}
      {restaurantCategories.map(cat => {
        const catProducts = filteredProducts.filter(p => p.categoryId === cat.id);
        if (!catProducts.length) return null;
        return (
          <div key={cat.id} className="mb-6">
            <h3 className="font-black text-[#111] text-lg mb-3">{cat.name}</h3>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={(e) => handleDragEnd(e, cat.id)}
            >
              <SortableContext
                items={catProducts.map(p => p.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-3">
                  {catProducts.map(p => (
                    <SortableProductItem 
                      key={p.id} 
                      product={p} 
                      onToggleAvailable={() => toggleAvailable(p)}
                      onEdit={() => openEdit(p)}
                      onDelete={() => deleteProduct(p.id)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>
        );
      })}

      {/* Product modal */}
      {(isNew || editingProduct) && (
        <div role="dialog" aria-modal="true" aria-label="Gerenciar item do cardápio" className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
          <div role="presentation" className="absolute inset-0 bg-black/60" onClick={closeModal} />
          <div className="relative bg-white rounded-t-3xl md:rounded-3xl w-full md:max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-3xl">
              <h3 className="font-black text-[#111] text-lg">{isNew ? 'Novo produto' : 'Editar produto'}</h3>
              <button onClick={closeModal} aria-label="Fechar" className="p-2 hover:bg-gray-100 rounded-full"><X size={20} /></button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-600 block mb-1">Nome *</label>
                <input 
                  value={form.name} 
                  onChange={e => {
                    setForm(f => ({ ...f, name: e.target.value }));
                    if (errors.name) setErrors(prev => {
                      const next = { ...prev };
                      delete next.name;
                      return next;
                    });
                  }} 
                  className={`w-full border ${errors.name ? 'border-red-500' : 'border-gray-200'} rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#FFC928]`} 
                />
                {errors.name && <p className="text-red-500 text-[10px] mt-1 font-bold">{errors.name}</p>}
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600 block mb-1">Descrição</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm h-20 resize-none focus:outline-none focus:border-[#FFC928]" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-600 block mb-1">Preço (R$) *</label>
                  <input 
                    type="number" 
                    value={form.price} 
                    onChange={e => {
                      setForm(f => ({ ...f, price: Number(e.target.value) }));
                      if (errors.price) setErrors(prev => {
                        const next = { ...prev };
                        delete next.price;
                        return next;
                      });
                    }} 
                    className={`w-full border ${errors.price ? 'border-red-500' : 'border-gray-200'} rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#FFC928]`} 
                  />
                  {errors.price && <p className="text-red-500 text-[10px] mt-1 font-bold">{errors.price}</p>}
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600 block mb-1">Categoria</label>
                  <select 
                    value={form.categoryId} 
                    onChange={e => {
                      setForm(f => ({ ...f, categoryId: e.target.value }));
                      if (errors.categoryId) setErrors(prev => {
                        const next = { ...prev };
                        delete next.categoryId;
                        return next;
                      });
                    }} 
                    className={`w-full border ${errors.categoryId ? 'border-red-500' : 'border-gray-200'} rounded-xl px-4 py-3 text-sm bg-white focus:outline-none focus:border-[#FFC928]`}
                  >
                    <option value="">Sem categoria</option>
                    {restaurantCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  {errors.categoryId && <p className="text-red-500 text-[10px] mt-1 font-bold">{errors.categoryId}</p>}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600 block mb-1">Foto do produto</label>
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 rounded-xl border border-gray-200 overflow-hidden flex-shrink-0 bg-gray-50 flex items-center justify-center">
                    {form.imageUrl ? (
                      <img src={form.imageUrl} alt={form.name || 'Foto do produto'} className="w-full h-full object-cover" />
                    ) : (
                      <ImageOff size={20} className="text-gray-300" />
                    )}
                  </div>
                  <label className="flex items-center gap-2 bg-[#111] text-white text-xs font-black px-4 py-2.5 rounded-xl cursor-pointer hover:bg-gray-800 transition-colors">
                    <Upload size={14} />
                    Enviar foto
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                  </label>
                </div>
                <div className="mt-3">
                  <label className="text-xs font-medium text-gray-500 block mb-1">Ou cole uma URL da foto (opcional)</label>
                  <input 
                    value={form.imageUrl.startsWith('data:') ? '' : form.imageUrl} 
                    onChange={e => {
                      setForm(f => ({ ...f, imageUrl: e.target.value }));
                      if (errors.imageUrl) setErrors(prev => {
                        const next = { ...prev };
                        delete next.imageUrl;
                        return next;
                      });
                    }} 
                    placeholder="https://..." 
                    className={`w-full border ${errors.imageUrl ? 'border-red-500' : 'border-gray-200'} rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#FFC928]`} 
                  />
                </div>
                {errors.imageUrl && <p className="text-red-500 text-[10px] mt-1 font-bold">{errors.imageUrl}</p>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-600 block mb-1">Ingredientes</label>
                  <textarea 
                    value={form.ingredients} 
                    onChange={e => setForm(f => ({ ...f, ingredients: e.target.value }))} 
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm h-20 resize-none focus:outline-none focus:border-[#FFC928]" 
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600 block mb-1">Alergênicos</label>
                  <textarea 
                    value={form.allergens} 
                    onChange={e => setForm(f => ({ ...f, allergens: e.target.value }))} 
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm h-20 resize-none focus:outline-none focus:border-[#FFC928]" 
                  />
                </div>
              </div>

              {form.onPromotion && (
                <div>
                  <label className="text-sm font-medium text-gray-600 block mb-1">Preço promocional (R$)</label>
                  <input 
                    type="number" 
                    value={form.promotionPrice || ''} 
                    onChange={e => {
                      setForm(f => ({ ...f, promotionPrice: Number(e.target.value) }));
                      if (errors.promotionPrice) setErrors(prev => {
                        const next = { ...prev };
                        delete next.promotionPrice;
                        return next;
                      });
                    }} 
                    className={`w-full border ${errors.promotionPrice ? 'border-red-500' : 'border-gray-200'} rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#FFC928]`} 
                  />
                  {errors.promotionPrice && <p className="text-red-500 text-[10px] mt-1 font-bold">{errors.promotionPrice}</p>}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: 'isAvailable', label: 'Disponível' },
                  { key: 'isFeatured', label: 'Destaque' },
                  { key: 'bestSeller', label: 'Mais vendido' },
                  { key: 'onPromotion', label: 'Promoção' },
                ].map(opt => (
                  <label key={opt.key} className={`flex items-center justify-between p-3 rounded-xl border-2 cursor-pointer transition-all ${form[opt.key as keyof typeof form] ? 'border-[#FFC928] bg-[#FFF8E1]' : 'border-gray-200'}`}>
                    <span className="text-sm font-medium text-[#111]">{opt.label}</span>
                    <div
                      onClick={() => setForm(f => ({ ...f, [opt.key]: !f[opt.key as keyof typeof f] }))}
                      className={`w-10 h-5 rounded-full transition-colors relative ${form[opt.key as keyof typeof form] ? 'bg-[#FFC928]' : 'bg-gray-200'}`}
                    >
                      <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form[opt.key as keyof typeof form] ? 'translate-x-5' : 'translate-x-0.5'}`} />
                    </div>
                  </label>
                ))}
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={closeModal} className="flex-1 border border-gray-200 text-gray-600 font-bold py-3 rounded-xl hover:bg-gray-50">
                  Cancelar
                </button>
                <button onClick={save} className="flex-1 bg-[#FFC928] text-[#111] font-black py-3 rounded-xl hover:bg-[#e6b520]">
                  {isNew ? 'Criar produto' : 'Salvar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

const SortableCategoryItem: React.FC<{ cat: Category; onDelete: () => void }> = ({ cat, onDelete }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: cat.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style}
      className={`flex items-center gap-1 bg-[#F5F5F5] rounded-full px-3 py-1.5 border ${isDragging ? 'border-[#FFC928]' : 'border-transparent'}`}
    >
      <button {...attributes} {...listeners} aria-label="Reordenar" className="text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing">
        <GripVertical size={14} />
      </button>
      <span className="text-sm font-medium text-[#111]">{cat.name}</span>
      <button onClick={onDelete} aria-label="Remover" className="text-gray-400 hover:text-red-500 ml-1">
        <X size={14} />
      </button>
    </div>
  );
};

const SortableProductItem: React.FC<{
  product: Product;
  onToggleAvailable: () => void;
  onEdit: () => void;
  onDelete: () => void;
}> = ({ product, onToggleAvailable, onEdit, onDelete }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: product.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 2 : 1,
    boxShadow: isDragging ? "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)" : undefined,
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style}
      className={`bg-white rounded-2xl p-4 flex gap-4 border-2 transition-colors ${isDragging ? 'border-[#FFC928] ring-4 ring-[#FFC928]/10' : !product.isAvailable ? 'border-gray-200 opacity-60' : 'border-transparent'}`}
    >
      <button {...attributes} {...listeners} aria-label="Reordenar" className="text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing px-1">
        <GripVertical size={20} />
      </button>

      <img src={product.imageUrl} alt={product.name} className="w-16 h-16 rounded-xl object-cover flex-shrink-0" />
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h4 className="font-bold text-[#111] text-sm">{product.name}</h4>
          {product.bestSeller && <span className="bg-[#FFC928] text-[#111] text-xs font-bold px-1.5 py-0.5 rounded-full">Top</span>}
          {product.onPromotion && <span className="bg-red-100 text-red-600 text-xs font-bold px-1.5 py-0.5 rounded-full">Promo</span>}
        </div>
        <p className="text-gray-500 text-xs line-clamp-1 mb-2">{product.description}</p>
        <span className="font-black text-[#111]">R$ {product.price.toFixed(2)}</span>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <button onClick={onToggleAvailable} aria-label="Alternar disponibilidade" className={product.isAvailable ? 'text-green-500' : 'text-gray-400'}>
          {product.isAvailable ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
        </button>
        <button onClick={onEdit} aria-label="Editar" className="p-2 text-gray-400 hover:text-[#111] hover:bg-gray-100 rounded-lg transition-colors">
          <Edit2 size={16} />
        </button>
        <button onClick={onDelete} aria-label="Excluir" className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
};
