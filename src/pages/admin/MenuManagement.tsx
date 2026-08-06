import { useState, useEffect, useRef, type DragEvent, SVGProps } from 'react';
import { Plus, Search,  Edit2, Trash2, GripVertical, Check, X, Trash, Clock, Sparkles, Eye, EyeOff, Upload } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { db } from '../../lib/firebase';
import { uploadProductImage } from '../../services/storageService';
import { processImageFile } from '../../lib/imageProcessor';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  setDoc,
  updateDoc, 
  deleteDoc, 
  doc, 
  orderBy,
  onSnapshot 
} from 'firebase/firestore';
import { useRestaurant } from '../../context/RestaurantContext';
import { useLocation } from 'react-router-dom';
import { Button } from '../../components/Button';

import { Category, Product, AllergenKey, LabelInfo, StorageType } from '../../types';
import { ALLERGENS, STORAGE_OPTIONS } from '../../data/allergens';
import { toast } from 'react-hot-toast';
import { cn, formatCurrency } from '../../lib/utils';
import { Skeleton } from '../../components/Skeleton';
import { Reorder, motion, AnimatePresence } from 'motion/react';
import AIMenuGenerator from '../../components/admin/AIMenuGenerator';
import AIProductGenerator from '../../components/admin/AIProductGenerator';
import AIMenuImport from '../../components/admin/AIMenuImport';

interface Option {
  id: string;
  name: string;
  price: number;
}

interface OptionGroup {
  id: string;
  name: string;
  minSelection: number;
  maxSelection: number;
  options: Option[];
}

export default function MenuManagement() {
  const { t } = useTranslation();
  const { currentRestaurant: restaurant } = useRestaurant();
  const location = useLocation();
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'products' | 'categories'>('products');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set());
  
  // Modals state
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [isAIImportOpen, setIsAIImportOpen] = useState(false);
  const [isAIProductModalOpen, setIsAIProductModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  
  const [newCatName, setNewCatName] = useState('');
  const [newProd, setNewProd] = useState({
    name: '',
    description: '',
    price: '',
    categoryId: '',
    imageUrl: '',
    isActive: true,
    isAvailable: true,
    estimatedPrepTime: '',
    notes: '',
    ingredients: '',
    allergens: '',
    selectedAllergens: [] as AllergenKey[],
    shelfLifeDays: '',
    storageType: 'refrigerated' as StorageType,
    storageInstructions: '',
    optionGroups: [] as OptionGroup[],
    stock: '',
    minStockAlert: '',
  });
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [processingImage, setProcessingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Listen to restaurants and data
  useEffect(() => {
    if (!restaurant) return;

    // Listen to categories
    const qCat = query(collection(db, 'categories'), where('restaurantId', '==', restaurant.id), orderBy('order', 'asc'));
    const unsubscribeCat = onSnapshot(qCat, (snapshot) => {
      const cats = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));
      setCategories(prev => {
        const serverIds = new Set(cats.map(c => c.id));
        const localIds = new Set(prev.map(c => c.id));
        if (serverIds.size !== localIds.size) return cats;
        for (const id of serverIds) { if (!localIds.has(id)) return cats; }
        return prev;
      });
    }, (error) => {
      console.error('Error listening to categories:', error);
    });

    // Listen to products
    const qProd = query(collection(db, 'products'), where('restaurantId', '==', restaurant.id));
    const unsubscribeProd = onSnapshot(qProd, (snapshot) => {
      const prods = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
      setProducts(prods);
    });

    return () => {
      unsubscribeCat();
      unsubscribeProd();
    };
  }, [restaurant]);

  // Check for AI trigger from URL
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('generate') === 'true') {
      setIsAIModalOpen(true);
      // Clean up URL
      window.history.replaceState({}, '', location.pathname);
    }
    if (params.get('add_product') === 'true') {
      setIsProductModalOpen(true);
      // Clean up URL
      window.history.replaceState({}, '', location.pathname);
    }
  }, [location]);

  // Handle initial category selection (only once)
  useEffect(() => {
    if (categories.length > 0 && !selectedCategory) {
      setSelectedCategory(categories[0].id);
      setSelectedProductIds(new Set());
      setLoading(false);
    } else if (categories.length === 0 && !loading) {
      // Already finished loading but no cats
    } else if (loading && categories.length > 0) {
      setLoading(false);
    }
  }, [categories, selectedCategory, loading]);

  const handleReorderCategories = async (newCategories: Category[]) => {
    setCategories(newCategories);
    try {
      const promises = newCategories.map((cat, index) => 
        updateDoc(doc(db, 'categories', cat.id), { order: index })
      );
      await Promise.all(promises);
    } catch (e) {
      toast.error(t('menu.saveOrderError'));
    }
  };

  const handleCreateCategory = async () => {
    if (!restaurant) return;
    if (!newCatName.trim()) {
      setErrors({ categoryName: 'Nome da categoria é obrigatório' });
      return;
    }
    try {
      if (editingCategory) {
        await updateDoc(doc(db, 'categories', editingCategory.id), {
          name: newCatName,
        });
        toast.success(t('menu.categoryUpdated'));
      } else {
        await addDoc(collection(db, 'categories'), {
          restaurantId: restaurant.id,
          name: newCatName,
          order: categories.length,
          isActive: true,
        });
        toast.success(t('menu.categoryCreated'));
      }
      setNewCatName('');
      setEditingCategory(null);
      setIsCategoryModalOpen(false);
    } catch (e) {
      toast.error(t('common.error'));
    }
  };

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category);
    setNewCatName(category.name);
    setIsCategoryModalOpen(true);
  };

  const handleDeleteCategory = async () => {
    if (!categoryToDelete) return;
    // Check if category has products
    const hasProducts = products.some(p => p.categoryId === categoryToDelete.id);
    if (hasProducts) {
      toast.error(t('menu.categoryHasProductsError'));
      setCategoryToDelete(null);
      return;
    }

    try {
      await deleteDoc(doc(db, 'categories', categoryToDelete.id));
      toast.success(t('menu.categoryDeleted'));
      setCategoryToDelete(null);
    } catch (e) {
      toast.error(t('menu.categoryDeleteError'));
    }
  };

  const validateProduct = () => {
    const newErrors: Record<string, string> = {};
    if (!newProd.name.trim()) newErrors.name = 'Nome do produto é obrigatório';
    else if (newProd.name.trim().length < 3) newErrors.name = 'Nome deve ter pelo menos 3 caracteres';

    const priceNum = parseFloat(newProd.price);
    if (!newProd.price) newErrors.price = 'Preço é obrigatório';
    else if (isNaN(priceNum) || priceNum <= 0) newErrors.price = 'Preço deve ser maior que zero';

    if (!newProd.categoryId) newErrors.categoryId = 'Selecione uma categoria';

    if (newProd.description && newProd.description.length > 500) {
      newErrors.description = 'Descrição muito longa (máx 500 caracteres)';
    }

    if (newProd.estimatedPrepTime) {
      const prepTimeNum = parseInt(newProd.estimatedPrepTime);
      if (isNaN(prepTimeNum) || prepTimeNum < 0) newErrors.estimatedPrepTime = 'Tempo inválido';
    }

    if (newProd.imageUrl && !newProd.imageUrl.startsWith('http') && !newProd.imageUrl.startsWith('data:image')) {
      newErrors.imageUrl = 'URL ou formato de imagem inválido';
    }

    // Validate Option Groups
    if (newProd.optionGroups && newProd.optionGroups.length > 0) {
      newProd.optionGroups.forEach((group: OptionGroup, gIdx: number) => {
        if (!group.name.trim()) {
          newErrors[`group_${group.id}`] = 'Nome do grupo é obrigatório';
        }
        if (group.options.length === 0) {
          newErrors[`group_options_${group.id}`] = 'Adicione pelo menos uma opção';
        } else {
          group.options.forEach((opt: Option) => {
            if (!opt.name.trim()) {
              newErrors[`opt_${opt.id}`] = 'Nome obrigatório';
            }
          });
        }
      });
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleImageFile = async (file: File) => {
    if (processingImage) return;
    if (!file) return;
    try {
      setProcessingImage(true);
      const processed = await processImageFile(file);
      setImageFile(processed);
      const objectUrl = URL.createObjectURL(processed);
      setNewProd((prev) => {
        if (prev.imageUrl.startsWith('blob:')) URL.revokeObjectURL(prev.imageUrl);
        return { ...prev, imageUrl: objectUrl };
      });
      if (errors.imageUrl) setErrors(prev => { const n = { ...prev }; delete n.imageUrl; return n; });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao processar a imagem');
    } finally {
      setProcessingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleImageDrop = (e: DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleImageFile(file);
  };

  const handleCreateProduct = async () => {
    if (!validateProduct()) return;
    if (!restaurant) return;

    const priceNum = parseFloat(newProd.price);
    const prepTimeNum = newProd.estimatedPrepTime ? parseInt(newProd.estimatedPrepTime) : null;
    const stockNum = newProd.stock !== '' ? parseInt(newProd.stock) : undefined;
    const minStockNum = newProd.minStockAlert !== '' ? parseInt(newProd.minStockAlert) : undefined;
    const shelfLifeNum = newProd.shelfLifeDays !== '' ? parseInt(newProd.shelfLifeDays) : undefined;
    const labelInfo: LabelInfo | undefined = shelfLifeNum ? {
      shelfLifeDays: shelfLifeNum,
      storageType: newProd.storageType,
      storageInstructions: newProd.storageInstructions,
    } : undefined;

    try {
      const productId = editingProduct?.id || crypto.randomUUID();
      let finalImageUrl = newProd.imageUrl;

      // Upload image first (if any) so Firestore write is final
      if (imageFile) {
        setUploadingImage(true);
        if (fileInputRef.current) fileInputRef.current.value = '';
        finalImageUrl = await uploadProductImage(restaurant.id, productId, imageFile);
        setImageFile(null);
        setUploadingImage(false);
      }

      await setDoc(doc(db, 'products', productId), {
        restaurantId: restaurant.id,
        categoryId: newProd.categoryId,
        name: newProd.name,
        description: newProd.description,
        price: priceNum,
        imageUrl: finalImageUrl,
        estimatedPrepTime: prepTimeNum,
        notes: newProd.notes,
        ingredients: newProd.ingredients || '',
        allergens: newProd.allergens || '',
        selectedAllergens: newProd.selectedAllergens,
        labelInfo,
        isActive: newProd.isActive,
        isAvailable: newProd.isAvailable,
        isFeatured: false,
        optionGroups: newProd.optionGroups,
        stock: stockNum,
        minStockAlert: minStockNum,
        orderCount: editingProduct ? undefined : 0,
      });

      toast.success(editingProduct ? t('menu.productUpdated') : t('menu.productCreated'));
      
      setNewProd({ name: '', description: '', price: '', categoryId: '', imageUrl: '', isActive: true, isAvailable: true, estimatedPrepTime: '', notes: '', ingredients: '', allergens: '', selectedAllergens: [], shelfLifeDays: '', storageType: 'refrigerated', storageInstructions: '', optionGroups: [], stock: '', minStockAlert: '' });
      setEditingProduct(null);
      setIsProductModalOpen(false);
    } catch (e) {
      setUploadingImage(false);
      toast.error(t('common.error'));
    }
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setImageFile(null);
    setNewProd({
      name: product.name,
      description: product.description,
      price: product.price.toString(),
      categoryId: product.categoryId,
      imageUrl: product.imageUrl || '',
      isActive: product.isActive,
      isAvailable: product.isAvailable !== undefined ? product.isAvailable : true,
      estimatedPrepTime: product.estimatedPrepTime?.toString() || '',
      notes: product.notes || '',
      ingredients: product.ingredients || '',
      allergens: product.allergens || '',
      selectedAllergens: product.selectedAllergens || [],
      shelfLifeDays: product.labelInfo?.shelfLifeDays?.toString() || '',
      storageType: product.labelInfo?.storageType || 'refrigerated',
      storageInstructions: product.labelInfo?.storageInstructions || '',
      optionGroups: product.optionGroups || [],
      stock: product.stock !== undefined ? product.stock.toString() : '',
      minStockAlert: product.minStockAlert !== undefined ? product.minStockAlert.toString() : '',
    });
    setIsProductModalOpen(true);
  };

  const confirmDeleteProduct = (product: Product) => {
    setProductToDelete(product);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteProduct = async () => {
    if (!productToDelete) return;
    try {
      await deleteDoc(doc(db, 'products', productToDelete.id));
      toast.success(t('menu.productDeleted'));
      setIsDeleteModalOpen(false);
      setProductToDelete(null);
    } catch (e) {
      toast.error(t('common.error'));
    }
  };

  const addOptionGroup = () => {
    setNewProd(prev => ({
      ...prev,
      optionGroups: [
        ...prev.optionGroups,
        {
          id: Math.random().toString(36).substr(2, 9),
          name: '',
          minSelection: 0,
          maxSelection: 1,
          options: []
        }
      ]
    }));
  };

  const removeOptionGroup = (groupId: string) => {
    setNewProd(prev => ({
      ...prev,
      optionGroups: prev.optionGroups.filter(g => g.id !== groupId)
    }));
  };

  const addOptionToGroup = (groupId: string) => {
    setNewProd(prev => ({
      ...prev,
      optionGroups: prev.optionGroups.map(g => {
        if (g.id === groupId) {
          return {
            ...g,
            options: [
              ...g.options,
              {
                id: Math.random().toString(36).substr(2, 9),
                name: '',
                price: 0
              }
            ]
          };
        }
        return g;
      })
    }));
  };

  const removeOptionFromGroup = (groupId: string, optionId: string) => {
    setNewProd(prev => ({
      ...prev,
      optionGroups: prev.optionGroups.map(g => {
        if (g.id === groupId) {
          return {
            ...g,
            options: g.options.filter((o: Option) => o.id !== optionId)
          };
        }
        return g;
      })
    }));
  };

  const updateOptionGroup = (groupId: string, data: Partial<OptionGroup>) => {
    setNewProd(prev => ({
      ...prev,
      optionGroups: prev.optionGroups.map(g => g.id === groupId ? { ...g, ...data } : g)
    }));
  };

  const updateOptionInGroup = (groupId: string, optionId: string, data: Partial<Option>) => {
    setNewProd(prev => ({
      ...prev,
      optionGroups: prev.optionGroups.map(g => {
        if (g.id === groupId) {
          return {
            ...g,
            options: g.options.map((o: Option) => o.id === optionId ? { ...o, ...data } : o)
          };
        }
        return g;
      })
    }));
  };

  const toggleProductStatus = async (product: Product) => {
    try {
      await updateDoc(doc(db, 'products', product.id), {
        isActive: !product.isActive
      });
    } catch (e) {
      toast.error('Erro ao atualizar produto');
    }
  };

  const toggleProductAvailability = async (product: Product) => {
    try {
      const newAvailability = product.isAvailable === undefined ? false : !product.isAvailable;
      await updateDoc(doc(db, 'products', product.id), {
        isAvailable: newAvailability
      });
    } catch (e) {
      toast.error('Erro ao atualizar disponibilidade');
    }
  };

  const toggleProductSelection = (productId: string) => {
    const newSelected = new Set(selectedProductIds);
    if (newSelected.has(productId)) {
      newSelected.delete(productId);
    } else {
      newSelected.add(productId);
    }
    setSelectedProductIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedProductIds.size === filteredProducts.length) {
      setSelectedProductIds(new Set());
    } else {
      setSelectedProductIds(new Set(filteredProducts.map(p => p.id)));
    }
  };

  const handleBatchAction = async (action: 'activate' | 'deactivate' | 'available' | 'unavailable' | 'delete') => {
    if (selectedProductIds.size === 0) return;

    const count = selectedProductIds.size;
    const confirmMsg = action === 'delete' 
      ? t('menu.batchActions.confirmDelete', { count }) 
      : t('menu.batchActions.confirmApply', { count });

    if (action === 'delete' && !window.confirm(confirmMsg)) return;

    try {
      const promises = Array.from(selectedProductIds).map((id: string) => {
        const productRef = doc(db, 'products', id);
        switch (action) {
          case 'activate': return updateDoc(productRef, { isActive: true });
          case 'deactivate': return updateDoc(productRef, { isActive: false });
          case 'available': return updateDoc(productRef, { isAvailable: true });
          case 'unavailable': return updateDoc(productRef, { isAvailable: false });
          case 'delete': return deleteDoc(productRef);
          default: return Promise.resolve();
        }
      });

      await Promise.all(promises);
      toast.success(t('menu.batchActions.success', { count }));
      setSelectedProductIds(new Set());
    } catch (e) {
      console.error('Batch action error:', e);
      toast.error(t('menu.batchActions.error'));
    }
  };

  const filteredProducts = products.filter(p => {
    const matchesCategory = !selectedCategory || p.categoryId === selectedCategory;
    const matchesSearch = !searchTerm || 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (p.description && p.description.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="w-48 h-8" />
            <Skeleton className="w-32 h-3" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="w-24 h-10" />
            <Skeleton className="w-32 h-10" />
          </div>
        </div>
        <div className="flex gap-2 pb-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="w-24 h-8 shrink-0" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="w-full h-64 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  useEffect(() => {
    (window as unknown as { handleImageUpload: (event: Event) => void }).handleImageUpload = (event: Event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
          window.dispatchEvent(new CustomEvent('imageProcessed', { detail: reader.result }));
        };
        reader.readAsDataURL(file);
      }
    };
  }, []);

  return (    <div className="space-y-6">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 w-full lg:w-auto">
            <div>
              <h2 className="text-2xl font-black text-brand-black uppercase tracking-tight italic leading-none">{t('menu.title')}</h2>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{t('menu.subtitle')}</p>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            <Button variant="outline" size="sm" onClick={() => setIsAIModalOpen(true)} className="h-10 px-4 font-black tracking-widest text-[10px] italic border-2 border-brand-black/10 hover:bg-slate-50 transition-colors">
              <Sparkles className="mr-2 h-3.5 w-3.5 text-orange-500" /> GERAR MENU
            </Button>
            <Button variant="outline" size="sm" onClick={() => setIsAIImportOpen(true)} className="h-10 px-4 font-black tracking-widest text-[10px] italic border-2 border-brand-black/10 hover:bg-slate-50 transition-colors">
              <Upload className="mr-2 h-3.5 w-3.5 text-brand-egg" /> IMPORTAR
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                setEditingCategory(null);
                setNewCatName('');
                setIsCategoryModalOpen(true);
              }} 
              className="h-10 px-6 font-black tracking-widest text-[10px] italic border-2"
            >
              <Plus className="mr-2 h-3.5 w-3.5" /> CATEGORIA
            </Button>
            <Button size="sm" onClick={() => {
              setEditingProduct(null);
              setImageFile(null);
              setNewProd({ name: '', description: '', price: '', categoryId: selectedCategory || '', imageUrl: '', isActive: true, isAvailable: true, estimatedPrepTime: '', notes: '', ingredients: '', allergens: '', optionGroups: [] });
              setIsProductModalOpen(true);
            }} className="h-10 px-6 font-black tracking-widest text-[10px] italic bg-brand-egg text-brand-black border-b-4 border-yellow-600 shadow-md">
              <Plus className="mr-2 h-3.5 w-3.5" /> PRODUTO
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200">
          <button
            onClick={() => setActiveTab('products')}
            className={cn(
              "px-6 py-3 text-xs font-black uppercase tracking-widest transition-all relative",
              activeTab === 'products' ? "text-brand-black" : "text-slate-400 hover:text-slate-600"
            )}
          >
            {t('menu.products')}
            {activeTab === 'products' && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-brand-egg" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('categories')}
            className={cn(
              "px-6 py-3 text-xs font-black uppercase tracking-widest transition-all relative",
              activeTab === 'categories' ? "text-brand-black" : "text-slate-400 hover:text-slate-600"
            )}
          >
            {t('menu.categories')}
            {activeTab === 'categories' && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-brand-egg" />
            )}
          </button>
        </div>
      </div>

      {activeTab === 'products' ? (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input 
                type="text"
                placeholder={t('menu.searchProduct')}
                className="w-full bg-slate-100 border-none rounded-xl pl-9 pr-4 py-2.5 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-brand-egg/30 transition-all placeholder:text-slate-400"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  aria-label="Remover filtro"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-2 w-full sm:w-auto">
              {selectedProductIds.size > 0 && (
                <div className="flex items-center gap-2 pr-2 border-r border-slate-200 mr-2">
                  <span className="text-[10px] font-black text-brand-black uppercase tracking-widest">{selectedProductIds.size} {t('menu.batchActions.selected')}</span>
                  <button 
                    onClick={() => setSelectedProductIds(new Set())}
                    className="text-[10px] font-bold text-slate-400 hover:text-red-500 uppercase tracking-widest"
                  >
                    {t('menu.batchActions.clear')}
                  </button>
                </div>
              )}
              <Button variant="outline" size="sm" onClick={() => setIsAIProductModalOpen(true)} className="h-10 px-4 font-black tracking-widest text-[10px] italic border-2 border-orange-500/10 hover:bg-orange-50/50 transition-colors">
                <Sparkles className="mr-2 h-3.5 w-3.5 text-orange-500" /> GERAR COM IA
              </Button>
            </div>
          </div>

          {/* Batch Actions Toolbar */}
          <AnimatePresence>
            {selectedProductIds.size > 0 && (
              <motion.div 
                initial={{ opacity: 0, y: -20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.95 }}
                className="bg-brand-black text-white p-4 rounded-2xl flex flex-wrap items-center justify-between gap-4 sticky top-4 z-50 shadow-2xl border border-white/10"
              >
                <div className="flex items-center gap-4">
                  <button 
                    onClick={toggleSelectAll}
                    className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest hover:text-brand-egg transition-colors"
                  >
                    <div className={cn(
                      "w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all",
                      selectedProductIds.size === filteredProducts.length ? "bg-brand-egg border-brand-egg text-brand-black" : "border-white/20"
                    )}>
                      {selectedProductIds.size === filteredProducts.length && <Check size={12} strokeWidth={3} />}
                    </div>
                    {selectedProductIds.size === filteredProducts.length ? t('menu.batchActions.deselectAll') : t('menu.batchActions.selectAll')}
                  </button>
                  <div className="h-6 w-px bg-white/10" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-brand-egg">{selectedProductIds.size} {t('menu.batchActions.selected')}</span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => handleBatchAction('activate')}
                    className="h-9 px-4 text-[10px] font-black text-white hover:bg-white/10 uppercase tracking-widest"
                  >
                    {t('menu.batchActions.activate')}
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => handleBatchAction('deactivate')}
                    className="h-9 px-4 text-[10px] font-black text-white hover:bg-white/10 uppercase tracking-widest"
                  >
                    {t('menu.batchActions.deactivate')}
                  </Button>
                  <div className="w-px h-4 bg-white/10 mx-1" />
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => handleBatchAction('available')}
                    className="h-9 px-4 text-[10px] font-black text-orange-400 hover:bg-white/10 uppercase tracking-widest"
                  >
                    {t('menu.batchActions.available')}
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => handleBatchAction('unavailable')}
                    className="h-9 px-4 text-[10px] font-black text-red-400 hover:bg-white/10 uppercase tracking-widest"
                  >
                    {t('menu.batchActions.unavailable')}
                  </Button>
                  <div className="w-px h-4 bg-white/10 mx-1" />
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => handleBatchAction('delete')}
                    className="h-9 px-4 text-[10px] font-black text-red-500 hover:bg-red-500/10 uppercase tracking-widest"
                  >
                    <Trash2 size={14} className="mr-2" /> {t('common.delete')}
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Categories Filter Row */}
          <div className="flex items-center gap-2 overflow-x-auto pb-4 -mx-2 px-2 no-scrollbar">
            <button
              onClick={() => setSelectedCategory(null)}
              className={cn(
                "px-4 py-2 rounded-xl whitespace-nowrap text-[12px] font-black uppercase tracking-wider border transition-all duration-200 select-none active:scale-95",
                selectedCategory === null 
                  ? "bg-brand-black border-brand-black text-brand-white shadow-lg" 
                  : "bg-slate-50 border-slate-200 text-slate-400 hover:border-slate-300 hover:text-slate-700"
              )}
            >
              {t('menu.all')}
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={cn(
                  "px-4 py-2 rounded-xl whitespace-nowrap text-[12px] font-black uppercase tracking-wider border transition-all duration-200 select-none active:scale-95",
                  selectedCategory === cat.id 
                    ? "bg-brand-black border-brand-black text-brand-white shadow-lg" 
                    : "bg-slate-50 border-slate-200 text-slate-400 hover:border-slate-300 hover:text-slate-700"
                )}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Products Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            <AnimatePresence mode="popLayout">
              {filteredProducts.map((product, index) => (
                <motion.div 
                  key={product.id} 
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: index * 0.03 }}
                  className={cn(
                    "bg-white rounded-xl border-2 overflow-hidden flex flex-col group transition-all duration-200 shadow-sm hover:shadow-md relative",
                    selectedProductIds.has(product.id) ? "border-brand-egg ring-2 ring-brand-egg/20" : "border-slate-200 hover:border-slate-300"
                  )}
                >
                {/* Selection Overlay */}
                <div 
                  onClick={() => toggleProductSelection(product.id)}
                  className="absolute top-2 left-2 z-10 cursor-pointer"
                >
                  <div className={cn(
                    "w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all duration-200 shadow-sm",
                    selectedProductIds.has(product.id) 
                      ? "bg-brand-egg border-brand-egg text-brand-black" 
                      : "bg-white/90 border-white opacity-0 group-hover:opacity-100"
                  )}>
                    {selectedProductIds.has(product.id) && <Check size={14} strokeWidth={3} />}
                  </div>
                </div>

                <div 
                  className="aspect-[4/3] bg-slate-50 flex items-center justify-center relative overflow-hidden cursor-pointer"
                  onClick={() => toggleProductSelection(product.id)}
                >
                  {product.imageUrl ? (
                    <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="bg-slate-100 w-full h-full flex items-center justify-center">
                      <UtensilsCrossed className="text-slate-200 h-12 w-12" />
                    </div>
                  )}
                  <div className="absolute top-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditProduct(product);
                        }}
                        className="p-2 bg-white/95 backdrop-blur rounded-xl shadow-lg text-slate-600 hover:text-brand-black transition-colors"
                        aria-label="Editar"
                      >
                         <Edit2 size={13} />
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          confirmDeleteProduct(product);
                        }}
                        className="p-2 bg-white/95 backdrop-blur rounded-xl shadow-lg text-slate-600 hover:text-red-600 transition-colors"
                        aria-label="Excluir"
                      >
                         <Trash2 size={13} />
                      </button>
                  </div>
                  {!product.isActive && (
                    <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] flex items-center justify-center">
                        <span className="bg-slate-900 text-white text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded">{t('menu.paused')}</span>
                    </div>
                  )}
                </div>
                <div className="p-4 space-y-4">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-extrabold text-slate-900 text-sm tracking-tight leading-tight truncate">{product.name}</h3>
                      <p className="font-black text-brand-black text-xs tracking-tighter shrink-0">{formatCurrency(product.price)}</p>
                    </div>
                    {product.estimatedPrepTime && (
                      <div className="flex items-center gap-1 mt-1">
                        <Clock size={10} className="text-slate-400" />
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{product.estimatedPrepTime} min</span>
                      </div>
                    )}
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {(product.selectedAllergens || []).slice(0, 4).map(key => {
                        const a = ALLERGENS.find(aa => aa.key === key);
                        return a ? <span key={key} className="text-[9px] opacity-70" title={a.label}>{a.icon}</span> : null;
                      })}
                      {product.labelInfo && (
                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider ml-1">
                          {product.labelInfo.shelfLifeDays}d
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-2 line-clamp-2 font-medium leading-relaxed">{product.description}</p>
                  </div>
                  
                  <div className="pt-4 border-t border-slate-50 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                         {product.isActive ? (
                           <Eye size={13} className="text-green-600 animate-pulse" />
                         ) : (
                           <EyeOff size={13} className="text-slate-400" />
                         )}
                         <span className={cn(
                           "text-[9px] font-black uppercase tracking-widest",
                           product.isActive ? "text-green-600" : "text-slate-400"
                         )}>
                           {product.isActive ? "Visível no Cardápio" : "Oculto no Cardápio"}
                         </span>
                      </div>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleProductStatus(product);
                        }}
                        className={cn(
                          "h-5 w-10 rounded-full relative transition-all duration-300 shadow-inner",
                          product.isActive ? "bg-brand-black" : "bg-slate-200"
                        )}
                        title={product.isActive ? "Ocultar do Cardápio" : "Exibir no Cardápio"}
                      >
                        <div className={cn(
                          "absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all duration-300 shadow flex items-center justify-center",
                          product.isActive ? "left-5.5" : "left-0.5"
                        )}>
                          {product.isActive ? <Check size={8} className="text-brand-black" /> : <X size={8} className="text-slate-400" />}
                        </div>
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                         <div className={cn("w-2 h-2 rounded-full", (product.isAvailable ?? true) ? "bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.5)]" : "bg-red-500")} />
                         <span className={cn(
                           "text-[9px] font-black uppercase tracking-widest",
                           (product.isAvailable ?? true) ? "text-orange-600" : "text-red-600"
                         )}>
                           {(product.isAvailable ?? true) ? t('menu.inStock') : t('menu.outOfStock')}
                         </span>
                      </div>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleProductAvailability(product);
                        }}
                        className={cn(
                          "h-5 w-10 rounded-full relative transition-all duration-300 shadow-inner",
                          (product.isAvailable ?? true) ? "bg-orange-500" : "bg-slate-200"
                        )}
                      >
                        <div className={cn(
                          "absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all duration-300 shadow flex items-center justify-center",
                          (product.isAvailable ?? true) ? "left-5.5" : "left-0.5"
                        )}>
                           {(product.isAvailable ?? true) ? <Check size={8} className="text-orange-600" /> : <X size={8} className="text-slate-400" />}
                        </div>
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
            </AnimatePresence>
            
            {filteredProducts.length === 0 && (
              <div className="col-span-full py-20 text-center space-y-4">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-300">
                  <Search size={32} />
                </div>
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">{t('menu.noProductsFound')}</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="p-4 bg-slate-50 border-b border-slate-200">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">{t('menu.reorderCategories')}</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">{t('menu.reorderCategoriesSubtitle')}</p>
            </div>
            
            <Reorder.Group 
              axis="y" 
              values={categories} 
              onReorder={handleReorderCategories}
              className="divide-y divide-slate-100"
            >
              {categories.map((cat) => (
                <Reorder.Item
                  key={cat.id}
                  value={cat}
                  className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors group cursor-grab active:cursor-grabbing"
                >
                  <div className="flex items-center gap-4">
                    <GripVertical size={16} className="text-slate-300 group-hover:text-slate-400" />
                    <div>
                      <p className="text-sm font-black text-brand-black uppercase italic tracking-tight">{cat.name}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                        {t('menu.categoriesCount', { count: products.filter(p => p.categoryId === cat.id).length })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditCategory(cat);
                      }}
                      className="p-2 text-slate-400 hover:text-brand-black hover:bg-slate-100 rounded-lg transition-all"
                      aria-label="Editar"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setCategoryToDelete(cat);
                      }}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                      aria-label="Excluir"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </Reorder.Item>
              ))}
            </Reorder.Group>

            {categories.length === 0 && (
              <div className="p-12 text-center space-y-4">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-300">
                  <Plus size={32} />
                </div>
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">{t('menu.noProductsCategory')}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Category Modal */}
      {isCategoryModalOpen && (
        <div role="dialog" aria-modal="true" aria-label="Gerenciar categoria" className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-xl w-full max-w-sm overflow-hidden shadow-2xl border border-slate-200">
            <div className="p-5 border-b border-slate-50 bg-slate-50/30 flex items-center justify-between">
               <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">
                 {editingCategory ? 'Editar Categoria' : 'Nova Categoria'}
               </h3>
               <button onClick={() => {
                 setIsCategoryModalOpen(false);
                 setEditingCategory(null);
                 setNewCatName('');
               }} className="text-slate-400 hover:text-slate-600 transition-colors" aria-label="Fechar">
                  <X size={18} />
               </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Título da Categoria</label>
                <input 
                  type="text" 
                  className={cn(
                    "w-full border-2 border-slate-100 rounded-xl p-3 text-sm outline-none focus:border-brand-egg focus:bg-white transition-all font-bold text-brand-black",
                    errors.categoryName && "border-red-500"
                  )}
                  placeholder="Ex: Hambúrgueres Artesanais"
                  value={newCatName}
                  onChange={(e) => {
                    setNewCatName(e.target.value);
                    if (errors.categoryName) setErrors({});
                  }}
                />
                {errors.categoryName && <p className="text-red-500 text-[9px] font-black uppercase tracking-widest mt-1">{errors.categoryName}</p>}
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <Button variant="ghost" size="sm" className="text-[10px] uppercase font-black tracking-widest" onClick={() => {
                  setIsCategoryModalOpen(false);
                  setEditingCategory(null);
                  setNewCatName('');
                }}>DESCARTAR</Button>
                <Button size="sm" className="text-[10px] uppercase font-black tracking-widest bg-brand-black text-white hover:bg-slate-800" onClick={handleCreateCategory}>
                  {editingCategory ? 'ATUALIZAR' : 'SALVAR'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Product Modal */}
      {isProductModalOpen && (
        <div role="dialog" aria-modal="true" aria-label="Gerenciar produto" className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-xl w-full max-w-lg overflow-hidden shadow-2xl border border-slate-200 max-h-[90vh] flex flex-col">
            <div className="p-5 border-b border-slate-50 bg-slate-50/30 flex items-center justify-between">
               <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">
                 {editingProduct ? 'Editar Item' : 'Novo Item do Cardápio'}
               </h3>
                <button onClick={() => {
                  setIsProductModalOpen(false);
                  setEditingProduct(null);
                  setImageFile(null);
                  setNewProd({ name: '', description: '', price: '', categoryId: '', imageUrl: '', isActive: true, isAvailable: true, estimatedPrepTime: '', notes: '', ingredients: '', allergens: '', selectedAllergens: [], shelfLifeDays: '', storageType: 'refrigerated', storageInstructions: '', optionGroups: [], stock: '', minStockAlert: '' });
                }} className="text-slate-400 hover:text-slate-600 transition-colors" aria-label="Fechar">
                  <X size={18} />
               </button>
            </div>
            <div className="p-5 space-y-5 overflow-y-auto custom-scrollbar">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Imagem do Produto (URL ou Upload)</label>
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        className={cn(
                          "flex-1 border border-slate-200 rounded-md p-2 text-sm font-semibold focus:ring-1 focus:ring-orange-500 outline-none",
                          errors.imageUrl && "border-red-500"
                        )}
                        placeholder="https://exemplo.com/imagem.png"
                        value={newProd.imageUrl}
                        onChange={(e) => {
                          setNewProd({...newProd, imageUrl: e.target.value});
                          if (errors.imageUrl) setErrors(prev => { const n = {...prev}; delete n.imageUrl; return n; });
                        }}
                      />
                      <label
                        className={cn(
                          "bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-2 rounded-md text-xs font-bold cursor-pointer transition-colors flex items-center justify-center shrink-0 border border-slate-200 select-none",
                          processingImage && "opacity-60 pointer-events-none"
                        )}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={handleImageDrop}
                        title="Clique ou arraste uma imagem aqui"
                      >
                        {processingImage ? 'PROCESSANDO...' : uploadingImage ? 'ENVIANDO...' : 'UPLOAD'}
                        <input 
                          type="file" 
                          ref={fileInputRef}
                          className="hidden" 
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleImageFile(file);
                          }}
                        />
                      </label>
                    </div>
                    {errors.imageUrl && <p className="text-red-500 text-[9px] font-black uppercase tracking-widest">{errors.imageUrl}</p>}
                    {newProd.imageUrl && (
                      <div className="relative w-24 h-24 rounded-lg overflow-hidden border border-slate-200 group">
                        <img src={newProd.imageUrl} className="w-full h-full object-cover" alt="Preview" />
                        <button 
                          onClick={() => {
                            if (imageFile) URL.revokeObjectURL(newProd.imageUrl);
                            setImageFile(null);
                            setNewProd({...newProd, imageUrl: ''});
                          }}
                          className="absolute inset-0 bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                          aria-label="Remover imagem"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Nome do Produto</label>
                  <input 
                    type="text" 
                    className={cn(
                      "w-full border border-slate-200 rounded-md p-2 text-sm font-semibold focus:ring-1 focus:ring-orange-500 outline-none",
                      errors.name && "border-red-500"
                    )}
                    placeholder="X-Bacon Supremo"
                    value={newProd.name}
                    onChange={(e) => {
                      setNewProd({...newProd, name: e.target.value});
                      if (errors.name) setErrors(prev => { const n = {...prev}; delete n.name; return n; });
                    }}
                  />
                  {errors.name && <p className="text-red-500 text-[9px] font-black uppercase tracking-widest">{errors.name}</p>}
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Valor de Venda (R$)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    min="0"
                    className={cn(
                      "w-full border border-slate-200 rounded-md p-2 text-sm font-semibold focus:ring-1 focus:ring-orange-500 outline-none",
                      errors.price && "border-red-500"
                    )}
                    placeholder="0.00"
                    value={newProd.price}
                    onChange={(e) => {
                      setNewProd({...newProd, price: e.target.value});
                      if (errors.price) setErrors(prev => { const n = {...prev}; delete n.price; return n; });
                    }}
                  />
                  {errors.price && <p className="text-red-500 text-[9px] font-black uppercase tracking-widest">{errors.price}</p>}
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Tempo de Preparo (min)</label>
                  <div className="relative">
                    <Clock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                      type="number" 
                      min="0"
                      className={cn(
                        "w-full border border-slate-200 rounded-md py-2 pl-9 pr-3 text-sm font-semibold focus:ring-1 focus:ring-orange-500 outline-none",
                        errors.estimatedPrepTime && "border-red-500"
                      )}
                      placeholder="Ex: 20"
                      value={newProd.estimatedPrepTime}
                      onChange={(e) => {
                        setNewProd({...newProd, estimatedPrepTime: e.target.value});
                        if (errors.estimatedPrepTime) setErrors(prev => { const n = {...prev}; delete n.estimatedPrepTime; return n; });
                      }}
                    />
                  </div>
                  {errors.estimatedPrepTime && <p className="text-red-500 text-[9px] font-black uppercase tracking-widest">{errors.estimatedPrepTime}</p>}
                </div>
              </div>
              
              <div className="space-y-1.5">
                 <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Categoria de Exibição</label>
                 <select 
                  className={cn(
                    "w-full border border-slate-200 rounded-md p-2 text-sm font-semibold bg-white outline-none focus:ring-1 focus:ring-orange-500",
                    errors.categoryId && "border-red-500"
                  )}
                  value={newProd.categoryId}
                  onChange={(e) => {
                    setNewProd({...newProd, categoryId: e.target.value});
                    if (errors.categoryId) setErrors(prev => { const n = {...prev}; delete n.categoryId; return n; });
                  }}
                 >
                    <option value="">Selecione...</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                 </select>
                 {errors.categoryId && <p className="text-red-500 text-[9px] font-black uppercase tracking-widest">{errors.categoryId}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5 font-sans">
                   <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Estoque Atual</label>
                   <input 
                     type="number" 
                     min="0"
                     className="w-full border border-slate-200 rounded-md p-2 text-sm font-semibold focus:ring-1 focus:ring-orange-500 outline-none"
                     placeholder="Ex: 50 (Vazio = Ilimitado)"
                     value={newProd.stock}
                     onChange={(e) => setNewProd({...newProd, stock: e.target.value})}
                   />
                </div>
                <div className="space-y-1.5 font-sans">
                   <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Limite de Alerta</label>
                   <input 
                     type="number" 
                     min="0"
                     className="w-full border border-slate-200 rounded-md p-2 text-sm font-semibold focus:ring-1 focus:ring-orange-500 outline-none"
                     placeholder="Ex: 5"
                     value={newProd.minStockAlert}
                     onChange={(e) => setNewProd({...newProd, minStockAlert: e.target.value})}
                   />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Composição / Detalhes</label>
                <textarea 
                  className={cn(
                    "w-full border border-slate-200 rounded-md p-2 text-sm font-medium h-20 resize-none outline-none focus:ring-1 focus:ring-orange-500",
                    errors.description && "border-red-500"
                  )}
                  placeholder="Descreva os ingredientes..."
                  value={newProd.description}
                  onChange={(e) => {
                    setNewProd({...newProd, description: e.target.value});
                    if (errors.description) setErrors(prev => { const n = {...prev}; delete n.description; return n; });
                  }}
                />
                {errors.description && <p className="text-red-500 text-[9px] font-black uppercase tracking-widest leading-none">{errors.description}</p>}
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Observações (Visível para o cliente)</label>
                <textarea 
                  className="w-full border border-slate-200 rounded-md p-2 text-sm font-medium h-20 resize-none outline-none focus:ring-1 focus:ring-orange-500"
                  placeholder="Ex: Contém glúten, Prato apimentado, Serve 2 pessoas..."
                  value={newProd.notes}
                  onChange={(e) => setNewProd({...newProd, notes: e.target.value})}
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Ingredientes</label>
                  <textarea 
                    className="w-full border border-slate-200 rounded-md p-2 text-sm font-medium h-20 resize-none outline-none focus:ring-1 focus:ring-orange-500"
                    placeholder="Lista de ingredientes..."
                    value={newProd.ingredients}
                    onChange={(e) => setNewProd({...newProd, ingredients: e.target.value})}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Alergênicos</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {ALLERGENS.map(a => {
                      const isSelected = newProd.selectedAllergens.includes(a.key);
                      return (
                        <label key={a.key} className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border cursor-pointer transition-colors text-[11px] ${isSelected ? 'bg-red-50 border-red-200 text-red-700 font-bold' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'}`}>
                          <input type="checkbox" checked={isSelected}
                            onChange={() => {
                              const next = isSelected
                                ? newProd.selectedAllergens.filter(k => k !== a.key)
                                : [...newProd.selectedAllergens, a.key];
                              setNewProd({...newProd, selectedAllergens: next, allergens: next.map(k => ALLERGENS.find(aa => aa.key === k)?.label).join(', ') });
                            }}
                            className="sr-only" />
                          <span>{a.icon}</span>
                          <span>{a.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Label Info Section */}
              <div className="pt-4 border-t border-slate-100 space-y-4">
                <div>
                  <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-tight">Informações de Validade</h4>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Configure para gerar etiquetas automaticamente</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Validade (dias)</label>
                    <input type="number" min="0"
                      className="w-full border border-slate-200 rounded-md p-2 text-sm font-semibold focus:ring-1 focus:ring-orange-500 outline-none"
                      placeholder="Ex: 7"
                      value={newProd.shelfLifeDays}
                      onChange={(e) => setNewProd({...newProd, shelfLifeDays: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Armazenamento</label>
                    <select value={newProd.storageType}
                      onChange={(e) => setNewProd({...newProd, storageType: e.target.value as StorageType})}
                      className="w-full border border-slate-200 rounded-md p-2 text-sm font-semibold focus:ring-1 focus:ring-orange-500 outline-none bg-white"
                    >
                      {STORAGE_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Instruções de Armazenamento (opcional)</label>
                  <input type="text"
                    className="w-full border border-slate-200 rounded-md p-2 text-sm font-semibold focus:ring-1 focus:ring-orange-500 outline-none"
                    placeholder="Ex: Manter refrigerado entre 2°C e 8°C"
                    value={newProd.storageInstructions}
                    onChange={(e) => setNewProd({...newProd, storageInstructions: e.target.value})}
                  />
                </div>
              </div>

               <div className="grid sm:grid-cols-2 gap-3">
                 <div className="flex items-center gap-3 py-3 px-4 bg-slate-50 rounded-lg border border-slate-100">
                    <button
                      type="button"
                      onClick={() => setNewProd({...newProd, isActive: !newProd.isActive})}
                      className={cn(
                        "h-5 w-10 rounded-full relative transition-colors duration-200 focus:outline-none",
                        newProd.isActive ? "bg-brand-black" : "bg-slate-300"
                      )}
                    >
                      <div className={cn(
                        "absolute top-1 w-3 h-3 bg-white rounded-full transition-all duration-200",
                        newProd.isActive ? "left-6" : "left-1"
                      )} />
                    </button>
                    <div>
                       <p className="text-[11px] font-black text-slate-700 uppercase tracking-tight">Visível no Cardápio</p>
                       <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">Mostrar ou ocultar este produto para os clientes no cardápio</p>
                     </div>
                  </div>

                  <div className="flex items-center gap-3 py-3 px-4 bg-slate-50 rounded-lg border border-slate-100">
                    <button
                      type="button"
                      onClick={() => setNewProd({...newProd, isAvailable: !newProd.isAvailable})}
                      className={cn(
                        "h-5 w-10 rounded-full relative transition-colors duration-200 focus:outline-none",
                        newProd.isAvailable ? "bg-orange-500" : "bg-slate-300"
                      )}
                    >
                      <div className={cn(
                        "absolute top-1 w-3 h-3 bg-white rounded-full transition-all duration-200",
                        newProd.isAvailable ? "left-6" : "left-1"
                      )} />
                    </button>
                    <div>
                       <p className="text-[11px] font-black text-slate-700 uppercase tracking-tight">Disponível</p>
                       <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">Estoque para venda</p>
                     </div>
                  </div>
               </div>

               {/* Product Options Section */}
               <div className="pt-4 border-t border-slate-100 space-y-4">
                  <div className="flex items-center justify-between">
                     <div>
                        <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-tight">Opções do Produto</h4>
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Adicione tamanhos, adicionais ou complementos</p>
                     </div>
                     <Button type="button" variant="outline" size="sm" onClick={addOptionGroup} className="h-7 text-[9px] font-black px-3 border-slate-200">
                        + GRUPO
                     </Button>
                  </div>

                  <div className="space-y-4">
                      {newProd.optionGroups.map((group: OptionGroup) => (
                        <div key={group.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
                           <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 space-y-3">
                                 <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                       <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Nome do Grupo</label>
                                       <input 
                                          type="text"
                                          placeholder="Ex: Tamanho, Adicionais"
                                          className={cn(
                                            "w-full text-xs font-bold bg-white border rounded p-1.5 outline-none focus:ring-1 focus:ring-orange-500",
                                            errors[`group_${group.id}`] ? "border-red-500" : "border-slate-200"
                                          )}
                                          value={group.name}
                                          onChange={(e) => {
                                            updateOptionGroup(group.id, { name: e.target.value });
                                            if (errors[`group_${group.id}`]) setErrors(prev => { const n = {...prev}; delete n[`group_${group.id}`]; return n; });
                                          }}
                                       />
                                       {errors[`group_${group.id}`] && <p className="text-red-500 text-[8px] font-black mt-0.5">{errors[`group_${group.id}`]}</p>}
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                       <div className="space-y-1">
                                          <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Min</label>
                                          <input 
                                             type="number"
                                             className="w-full text-xs font-bold bg-white border border-slate-200 rounded p-1.5 outline-none"
                                             value={group.minSelection}
                                             onChange={(e) => updateOptionGroup(group.id, { minSelection: parseInt(e.target.value) })}
                                          />
                                       </div>
                                       <div className="space-y-1">
                                          <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Max</label>
                                          <input 
                                             type="number"
                                             className="w-full text-xs font-bold bg-white border border-slate-200 rounded p-1.5 outline-none"
                                             value={group.maxSelection}
                                             onChange={(e) => updateOptionGroup(group.id, { maxSelection: parseInt(e.target.value) })}
                                          />
                                       </div>
                                    </div>
                                 </div>
                              </div>
                              <button onClick={() => removeOptionGroup(group.id)} className="text-slate-400 hover:text-red-500 transition-colors pt-5" aria-label="Excluir">
                                 <Trash size={14} />
                              </button>
                           </div>

                           <div className="space-y-2">
                              <div className="flex items-center justify-between px-1">
                                 <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Opções</span>
                                 <button onClick={() => {
                                   addOptionToGroup(group.id);
                                   if (errors[`group_options_${group.id}`]) setErrors(prev => { const n = {...prev}; delete n[`group_options_${group.id}`]; return n; });
                                 }} className="text-[9px] font-black text-orange-600 uppercase tracking-widest hover:underline">
                                    + ADICIONAR OPÇÃO
                                 </button>
                              </div>
                              {errors[`group_options_${group.id}`] && <p className="text-red-500 text-[8px] font-black px-1">{errors[`group_options_${group.id}`]}</p>}
                              
                              <div className="space-y-1.5">
                                  {group.options.map((opt: Option) => (
                                    <div key={opt.id} className={cn(
                                      "flex items-center gap-2 bg-white p-1.5 rounded border shadow-sm",
                                      errors[`opt_${opt.id}`] ? "border-red-500" : "border-slate-100"
                                    )}>
                                       <div className="flex-1 space-y-0.5">
                                         <input 
                                            type="text"
                                            placeholder="Nome da opção"
                                            className="w-full text-[10px] font-bold p-1 border-none outline-none"
                                            value={opt.name}
                                            onChange={(e) => {
                                              updateOptionInGroup(group.id, opt.id, { name: e.target.value });
                                              if (errors[`opt_${opt.id}`]) setErrors(prev => { const n = {...prev}; delete n[`opt_${opt.id}`]; return n; });
                                            }}
                                         />
                                         {errors[`opt_${opt.id}`] && <p className="text-red-500 text-[7px] font-black px-1">{errors[`opt_${opt.id}`]}</p>}
                                       </div>
                                       <div className="flex items-center gap-1.5 bg-slate-50 px-2 rounded border border-slate-100">
                                          <span className="text-[9px] font-bold text-slate-400">R$</span>
                                          <input 
                                             type="number"
                                             step="0.01"
                                             className="w-16 text-[10px] font-bold bg-transparent p-1 border-none outline-none"
                                             value={opt.price}
                                             onChange={(e) => updateOptionInGroup(group.id, opt.id, { price: parseFloat(e.target.value) })}
                                          />
                                       </div>
                                       <button onClick={() => removeOptionFromGroup(group.id, opt.id)} className="text-slate-300 hover:text-red-500 p-1" aria-label="Excluir">
                                          <Trash size={12} />
                                       </button>
                                    </div>
                                 ))}
                                 {group.options.length === 0 && (
                                    <p className="text-[8px] text-slate-400 text-center py-2 italic font-medium uppercase tracking-wider">Nenhuma opção adicionada</p>
                                 )}
                              </div>
                           </div>
                        </div>
                     ))}
                     {newProd.optionGroups.length === 0 && (
                        <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl p-6 text-center">
                           <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Sem variações ou opcionais</p>
                        </div>
                     )}
                  </div>
               </div>
            </div>
            
            <div className="p-5 border-t border-slate-50 bg-slate-50/30 flex gap-2 justify-end">
              <Button variant="ghost" size="sm" className="text-[10px] uppercase font-black tracking-widest" onClick={() => {
                setIsProductModalOpen(false);
                setEditingProduct(null);
                setImageFile(null);
                setNewProd({ name: '', description: '', price: '', categoryId: '', imageUrl: '', isActive: true, isAvailable: true, estimatedPrepTime: '', notes: '', ingredients: '', allergens: '', selectedAllergens: [], shelfLifeDays: '', storageType: 'refrigerated', storageInstructions: '', optionGroups: [], stock: '', minStockAlert: '' });
              }}>DESCARTAR</Button>
              <Button size="sm" className="text-[10px] uppercase font-black tracking-widest" onClick={handleCreateProduct} disabled={uploadingImage || processingImage}>
                {uploadingImage || processingImage ? 'ENVIANDO FOTO...' : (editingProduct ? 'ATUALIZAR PRODUTO' : 'CRIAR PRODUTO')}
              </Button>
            </div>
          </div>
        </div>
      )}
      {/* AI Menu Import Modal */}
      {isAIImportOpen && restaurant && (
        <AIMenuImport
          restaurantId={restaurant.id}
          onClose={() => setIsAIImportOpen(false)}
          onSuccess={() => {}}
        />
      )}
      {/* AI Menu Generator Modal */}
      {isAIModalOpen && restaurant && (
        <AIMenuGenerator 
          restaurantId={restaurant.id}
          onClose={() => setIsAIModalOpen(false)}
          onSuccess={() => {
            // Data will be updated via onSnapshot
          }}
        />
      )}
      {/* AI Product Generator Modal */}
      {isAIProductModalOpen && restaurant && selectedCategory && (
        <AIProductGenerator 
          restaurantId={restaurant.id}
          categoryId={selectedCategory}
          categoryName={categories.find(c => c.id === selectedCategory)?.name || ''}
          onClose={() => setIsAIProductModalOpen(false)}
          onSuccess={() => {
            // Data will be updated via onSnapshot
          }}
        />
      )}
      {/* Delete Confirmation Modal (Product) */}
      {isDeleteModalOpen && productToDelete && (
        <div role="dialog" aria-modal="true" aria-label="Confirmar exclusão de produto" className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-[2rem] w-full max-w-sm overflow-hidden shadow-2xl border border-slate-200">
            <div className="p-8 text-center space-y-4">
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto text-red-600">
                <Trash2 size={24} />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-black text-slate-800 uppercase italic tracking-tight">Excluir Produto?</h3>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
                  Você tem certeza que deseja excluir <span className="text-slate-900">"{productToDelete.name}"</span>? Esta ação não pode ser desfeita.
                </p>
              </div>
            </div>
            <div className="p-6 bg-slate-50 flex gap-3">
              <Button 
                variant="outline" 
                className="flex-1 h-12 rounded-2xl font-black text-[10px] uppercase tracking-widest border-2"
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setProductToDelete(null);
                }}
              >
                CANCELAR
              </Button>
              <Button 
                className="flex-1 h-12 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest border-b-4 border-red-800 active:border-b-0 active:translate-y-1 transition-all"
                onClick={handleDeleteProduct}
              >
                EXCLUIR
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal (Category) */}
      {categoryToDelete && (
        <div role="dialog" aria-modal="true" aria-label="Confirmar exclusão de categoria" className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-[2rem] w-full max-w-sm overflow-hidden shadow-2xl border border-slate-200">
            <div className="p-8 text-center space-y-4">
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto text-red-600">
                <Trash2 size={24} />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-black text-slate-800 uppercase italic tracking-tight">Excluir Categoria?</h3>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
                  Você tem certeza que deseja excluir <span className="text-slate-900">"{categoryToDelete.name}"</span>?
                </p>
              </div>
            </div>
            <div className="p-6 bg-slate-50 flex gap-3">
              <Button 
                variant="outline" 
                className="flex-1 h-12 rounded-2xl font-black text-[10px] uppercase tracking-widest border-2"
                onClick={() => setCategoryToDelete(null)}
              >
                CANCELAR
              </Button>
              <Button 
                className="flex-1 h-12 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest border-b-4 border-red-800 active:border-b-0 active:translate-y-1 transition-all"
                onClick={handleDeleteCategory}
              >
                EXCLUIR
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function UtensilsCrossed(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m16 2-2.3 2.3a3 3 0 0 0 0 4.2l1.8 1.8a3 3 0 0 0 4.2 0L22 8" />
      <path d="M15 15 3.3 3.3a4.2 4.2 0 0 0 0 6l7.3 7.3c.7.7 2 .7 2.8 0L15 15Z" />
      <path d="m8 16-1.5 1.5" />
      <path d="m17 18-5 5h-2l-5-5V16l5-5" />
    </svg>
  );
}
