import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Check, ArrowRight, ArrowLeft, Upload, Plus, Trash2, QrCode, Sparkles, Loader2, Award, Zap, ToggleLeft, ToggleRight } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { cuisineTypes } from '../data/mockData';
import { Logo } from '../components/Logo';
import { useRestaurant } from '../context/RestaurantContext';
import { toast } from 'react-hot-toast';

export default function RestaurantOnboarding() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const { registerRestaurant } = useRestaurant();
  const isDark = theme === 'dark';
  
  const STEPS = [
    t('onboarding.step1'), 
    t('onboarding.step2'), 
    t('onboarding.step3'), 
    t('onboarding.step4'), 
    t('onboarding.step5')
  ];

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [logoBase64, setLogoBase64] = useState<string>('');
  const [isAiParsing, setIsAiParsing] = useState(false);
  
  // Delivery carrier connection plugins
  const [deliveryPlugins, setDeliveryPlugins] = useState([
    {
      id: 'lalamove',
      name: 'Lalamove Delivery',
      logo: '⚡',
      description: 'Entregas ultra-rápidas para motos, utilitários, furgões e carros.',
      connected: false,
      apiKey: '',
      apiSecret: '',
    },
    {
      id: 'loggi',
      name: 'Loggi Pro',
      logo: '📦',
      description: 'A maior malha de motoboys qualificados do Brasil com faturamento corporativo.',
      connected: false,
      apiKey: '',
      apiSecret: '',
    },
    {
      id: 'uberdirect',
      name: 'Uber Direct',
      logo: '🚗',
      description: 'Acione motoristas e motociclistas parceiros da Uber diretamente do seu painel.',
      connected: false,
      apiKey: '',
      apiSecret: '',
    }
  ]);

  const [form, setForm] = useState({
    name: '', responsible: '', whatsapp: '', email: '',
    address: '', neighborhood: '', city: '', cuisineType: 'Pizza',
    hours: '', primaryColor: '#FFC928',
    delivery: true, pickup: true, dineIn: false,
    deliveryFee: '', minOrder: '', estimatedTime: '',
    deliveryRadius: '', deliveryObs: '',
  });
  const [categories, setCategories] = useState<string[]>(['Mais Vendidos', 'Bebidas']);
  const [newCat, setNewCat] = useState('');
  const [products, setProducts] = useState([{ name: '', price: '', category: '', image: '' }]);

  const update = (field: string, value: string | boolean) => setForm(f => ({ ...f, [field]: value }));

  const [deliveryFee, setDeliveryFee] = useState('');
  const [estimatedTime, setEstimatedTime] = useState('');
  const [minOrder, setMinOrder] = useState('');
  const [deliveryRadius, setDeliveryRadius] = useState('');
  const [deliveryObs, setDeliveryObs] = useState('');

  const handleFinish = async () => {
    // Validation
    if (!form.name.trim()) { toast.error('Nome do restaurante é obrigatório'); setLoading(false); return; }
    if (!form.whatsapp.trim()) { toast.error('WhatsApp é obrigatório'); setLoading(false); return; }
    if (!form.responsible.trim()) { toast.error('Nome do responsável é obrigatório'); setLoading(false); return; }
    if (form.whatsapp.replace(/\D/g, '').length < 10) { toast.error('WhatsApp inválido'); setLoading(false); return; }
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) { toast.error('Email inválido'); setLoading(false); return; }

    const validProducts = products.filter(p => p.name.trim() && p.price);
    if (validProducts.length === 0) { toast.error('Adicione pelo menos um produto válido com nome e preço'); setLoading(false); return; }
    if (categories.length === 0) { toast.error('Adicione pelo menos uma categoria'); setLoading(false); return; }

    setLoading(true);
    try {
      const slug = form.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '-').replace(/[^\w-]+/g, '');
      const restaurantId = slug || `rest-${Math.random().toString(36).substr(2, 5)}`;
      const parsedMinOrder = parseFloat(minOrder) || 10;
      const parsedEstimatedTime = parseInt(estimatedTime) || 30;
      
      const restaurantData = {
        id: restaurantId,
        name: form.name,
        slug: restaurantId,
        logo: logoBase64 || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=400&fit=crop',
        coverImage: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&h=400&fit=crop',
        cuisineType: form.cuisineType,
        email: form.email,
        city: form.city,
        description: form.hours ? `${form.cuisineType} • ${form.hours}` : '',
        responsible: form.responsible,
        hours: form.hours,
        rating: 5.0,
        reviewCount: 0,
        priceRange: 'medium',
        estimatedTime: parsedEstimatedTime,
        deliveryFee: parseFloat(deliveryFee) || 0,
        minimumOrder: parsedMinOrder,
        deliveryEnabled: form.delivery,
        pickupEnabled: form.pickup,
        dineInEnabled: form.dineIn,
        address: form.address,
        neighborhood: form.neighborhood,
        whatsapp: form.whatsapp,
        primaryColor: form.primaryColor,
        isOpen: true,
        deliverySettings: {
          fee: parseFloat(deliveryFee) || 0,
          estimatedTime: `${parsedEstimatedTime} min`,
          minOrder: parsedMinOrder,
          feeByNeighborhood: [],
          radiusKm: parseFloat(deliveryRadius) || undefined,
          observation: deliveryObs || undefined,
        },
        orderSettings: {
          autoAccept: true,
          soundAlert: true,
          thermalPrinterEnabled: false,
          whatsappNotificationsEnabled: true,
        },
        loyaltySettings: {
          enabled: false,
          pointsPerReal: 1,
          accumulationType: 'amount',
          redemptionRules: [],
        },
      };

      // Filter out empty products
      const cleanedProducts = validProducts.map(p => ({
        name: p.name,
        price: p.price,
        category: p.category,
        image: p.image || 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400&h=300&fit=crop'
      }));

      await registerRestaurant(restaurantData, categories, cleanedProducts);
      setStep(4);
      toast.success('Restaurante cadastrado com sucesso!');
    } catch (e) {
      console.error(e);
      toast.error('Erro ao cadastrar restaurante');
    } finally {
      setLoading(false);
    }
  };

  const next = () => { 
    if (step === 3) {
      handleFinish();
    } else if (step < 4) {
      setStep(s => s + 1); 
    }
  };
  const prev = () => { if (step > 0) setStep(s => s - 1); };

  const addCategory = () => {
    const trimmed = newCat.trim();
    if (trimmed) {
      if (categories.includes(trimmed)) { toast.error('Categoria já existe'); return; }
      setCategories(c => [...c, trimmed]);
      setNewCat('');
    }
  };

  const addProduct = () => setProducts(p => [...p, { name: '', price: '', category: '', image: '' }]);
  const removeProduct = (i: number) => setProducts(p => p.filter((_, idx) => idx !== i));

  // Logo file upload
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error('Logo muito grande. Máximo 2MB.'); return; }
    if (!file.type.startsWith('image/')) { toast.error('Formato inválido. Use imagem.'); return; }
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64String = event.target?.result as string;
      setLogoBase64(base64String);
      toast.success('Logo do restaurante carregada com sucesso!');
    };
    reader.onerror = () => toast.error('Erro ao carregar a logo');
    reader.readAsDataURL(file);
  };

  // Product profile upload
  const handleProductImageUpload = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error('Imagem muito grande. Máximo 2MB.'); return; }
    if (!file.type.startsWith('image/')) { toast.error('Formato inválido. Use imagem.'); return; }
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64String = event.target?.result as string;
      setProducts(prev => prev.map((p, idx) => idx === index ? { ...p, image: base64String } : p));
      toast.success('Foto do produto adicionada!');
    };
    reader.onerror = () => toast.error('Erro ao carregar a imagem');
    reader.readAsDataURL(file);
  };

  // AI Menu Document Reader
  const handleAiMenuUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Arquivo muito grande. Máximo 10MB.');
      return;
    }

    setIsAiParsing(true);
    const toastId = toast.loading('A IA está lendo o seu cardápio, por favor aguarde...', { duration: Infinity });

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const base64WithHeader = event.target?.result as string;
        if (!base64WithHeader) throw new Error('Falha ao ler o arquivo');
        
        const commaIndex = base64WithHeader.indexOf(',');
        const base64Data = base64WithHeader.slice(commaIndex + 1);

        const response = await fetch('/api/ai/parse-menu', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileData: base64Data,
            mimeType: file.type || 'image/jpeg'
          })
        });

        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.error || 'Erro na extração');
        }

        if (result.success && result.data) {
          const { categories: loadedCategories, products: loadedProducts } = result.data;
          
          if (loadedCategories && loadedCategories.length > 0) {
            setCategories(loadedCategories);
          }
          if (loadedProducts && loadedProducts.length > 0) {
            const formattedProducts = loadedProducts.map((p: any) => ({
              name: p.name || '',
              price: p.price ? String(p.price) : '',
              category: p.category || '',
              image: ''
            }));
            setProducts(formattedProducts);
          }
          
          toast.success('Cardápio importado e estruturado com IA!', { id: toastId });
        } else {
          throw new Error('Falha no formato retornado da IA');
        }
      } catch (err: any) {
        console.error(err);
        toast.error(`Falha ao ler cardápio com IA: ${err.message || err}`, { id: toastId });
      } finally {
        setIsAiParsing(false);
      }
    };
    reader.onerror = () => {
      toast.error('Erro ao ler o arquivo', { id: toastId });
      setIsAiParsing(false);
    };
    reader.readAsDataURL(file);
  };

  // Carrier toggler
  const handleTogglePlugin = (pluginId: string) => {
    setDeliveryPlugins(prev => prev.map(p => {
      if (p.id === pluginId) {
        if (p.connected) {
          toast.success(`${p.name} desconectado.`);
          return { ...p, connected: false, apiKey: '', apiSecret: '' };
        } else {
          toast.success(`${p.name} pré-ativado via plugin corporativo!`);
          return { ...p, connected: true };
        }
      }
      return p;
    }));
  };

  const handlePluginCredChange = (pluginId: string, type: 'apiKey' | 'apiSecret', val: string) => {
    setDeliveryPlugins(prev => prev.map(p => {
      if (p.id === pluginId) {
        return { ...p, [type]: val };
      }
      return p;
    }));
  };

  return (
    <div className={`min-h-screen transition-colors pb-16 ${isDark ? 'bg-[#121212]' : 'bg-[#F9FAFB]'}`}>
      
      {/* Premium Header Art Banner */}
      <div className="bg-[#111111] text-[#F3F4F6] relative overflow-hidden px-6 py-10 md:py-16 border-b border-amber-500/10 shadow-2xl">
        {/* Background ambient glowing elements */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#FFC928]/10 rounded-full blur-3xl opacity-40 translate-x-1/3 -translate-y-1/3" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-amber-550/10 rounded-full blur-2xl opacity-20 -translate-x-1/3 translate-y-1/3" />
        <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-[#FFC928] via-orange-500 to-amber-600" />
        
        <div className="max-w-2xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
          <div className="text-center md:text-left space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#FFC928]/10 border border-[#FFC928]/30 rounded-full mb-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#FFC928] animate-pulse"></span>
              <span className="text-[9px] font-black uppercase tracking-widest text-[#FFC928]">Portal de Onboarding Oficial</span>
            </div>
            <h1 className="font-sans font-black text-3xl md:text-4xl uppercase tracking-tighter italic leading-none text-white">
              Seja Parceiro <span className="text-[#FFC928]">Meu Ovo</span>
            </h1>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-relaxed">
              O ecossistema definitivo de comida de verdade e delivery inteligente.
            </p>
          </div>
          <div className="flex flex-col items-center md:items-end gap-1 flex-shrink-0">
            <Logo size="lg" variant="white" className="mb-2" />
            <span className="text-[9px] font-black uppercase tracking-wider text-[#FFC928] px-3 py-1 bg-white/5 border border-white/10 rounded-lg">
              Registo Grátis e Ilimitado
            </span>
          </div>
        </div>
      </div>

      {/* Step indicators */}
      <div className="bg-white border-b border-gray-100 px-4 py-4 shadow-sm">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between">
            {STEPS.map((s, i) => (
              <div key={i} className="flex items-center flex-1">
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${i < step ? 'bg-green-500 text-white' : i === step ? 'bg-[#FFC928] text-[#111]' : 'bg-gray-200 text-gray-400'}`}>
                    {i < step ? <Check size={16} /> : i + 1}
                  </div>
                  <span className={`text-[10px] uppercase font-bold tracking-wider mt-1 hidden md:block ${i === step ? 'font-black text-[#111]' : 'text-gray-400'}`}>{s}</span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-2 ${i < step ? 'bg-green-500' : 'bg-gray-200'}`} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Step 0: Restaurant data */}
        {step === 0 && (
          <div>
            <h2 className="font-black text-2xl text-[#111] uppercase tracking-tight italic mb-1">{t('onboarding.restaurantData')}</h2>
            <p className="text-gray-500 text-xs uppercase font-black tracking-widest mb-6">{t('onboarding.basicInfo')}</p>

            <div className="bg-white rounded-2xl p-6 space-y-5 border border-gray-100 shadow-md">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-[10px] font-black uppercase tracking-wider text-gray-500 block mb-1">{t('onboarding.restaurantName')} *</label>
                  <input 
                    value={form.name} 
                    onChange={e => update('name', e.target.value)} 
                    placeholder="Ex: Pizzaria do João" 
                    className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder:text-gray-400 font-medium focus:outline-none focus:ring-2 focus:ring-[#FFC928] focus:border-transparent outline-none transition-all" 
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-gray-500 block mb-1">{t('onboarding.responsible')} *</label>
                  <input 
                    value={form.responsible} 
                    onChange={e => update('responsible', e.target.value)} 
                    placeholder="Seu nome" 
                    className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder:text-gray-400 font-medium focus:outline-none focus:ring-2 focus:ring-[#FFC928] focus:border-transparent outline-none transition-all" 
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-gray-500 block mb-1">{t('onboarding.whatsapp')} *</label>
                  <input 
                    value={form.whatsapp} 
                    onChange={e => update('whatsapp', e.target.value)} 
                    placeholder="(11) 99999-9999" 
                    className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder:text-gray-400 font-medium focus:outline-none focus:ring-2 focus:ring-[#FFC928] focus:border-transparent outline-none transition-all" 
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-[10px] font-black uppercase tracking-wider text-gray-500 block mb-1">{t('onboarding.email')}</label>
                  <input 
                    type="email"
                    value={form.email} 
                    onChange={e => update('email', e.target.value)} 
                    placeholder="seu@email.com" 
                    className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder:text-gray-400 font-medium focus:outline-none focus:ring-2 focus:ring-[#FFC928] focus:border-transparent outline-none transition-all" 
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-[10px] font-black uppercase tracking-wider text-gray-500 block mb-1">{t('onboarding.address')}</label>
                  <input 
                    value={form.address} 
                    onChange={e => update('address', e.target.value)} 
                    placeholder="Rua, número" 
                    className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder:text-gray-400 font-medium focus:outline-none focus:ring-2 focus:ring-[#FFC928] focus:border-transparent outline-none transition-all" 
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-gray-500 block mb-1">{t('onboarding.neighborhood')}</label>
                  <input 
                    value={form.neighborhood} 
                    onChange={e => update('neighborhood', e.target.value)} 
                    placeholder="Bairro" 
                    className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder:text-gray-400 font-medium focus:outline-none focus:ring-2 focus:ring-[#FFC928] focus:border-transparent outline-none transition-all" 
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-gray-500 block mb-1">Cidade</label>
                  <input 
                    value={form.city} 
                    onChange={e => update('city', e.target.value)} 
                    placeholder="São Paulo" 
                    className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder:text-gray-400 font-medium focus:outline-none focus:ring-2 focus:ring-[#FFC928] focus:border-transparent outline-none transition-all" 
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-gray-500 block mb-1">Tipo de comida</label>
                  <select 
                    value={form.cuisineType} 
                    onChange={e => update('cuisineType', e.target.value)} 
                    className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-[#FFC928] focus:border-transparent outline-none transition-all"
                  >
                    {cuisineTypes.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-gray-500 block mb-1">Horário</label>
                  <input 
                    value={form.hours} 
                    onChange={e => update('hours', e.target.value)} 
                    placeholder="Ex: Seg-Sex 11h-22h" 
                    className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder:text-gray-400 font-medium focus:outline-none focus:ring-2 focus:ring-[#FFC928] focus:border-transparent outline-none transition-all" 
                  />
                </div>
              </div>

              {/* Logo upload actual handler */}
              <div className="border border-gray-100 rounded-xl p-4 bg-gray-50/50">
                <label className="text-[10px] font-black uppercase tracking-wider text-gray-500 block mb-2">Logo do restaurante</label>
                <div className="relative">
                  {logoBase64 ? (
                    <div className="flex flex-col items-center gap-3">
                      <img 
                        src={logoBase64} 
                        className="w-24 h-24 rounded-2xl object-cover border-2 border-[#FFC928] shadow-md shadow-[#FFC928]/10" 
                        alt="Restaurante" 
                      />
                      <button 
                        type="button"
                        onClick={() => setLogoBase64('')}
                        className="text-xs text-red-500 font-bold uppercase tracking-wider hover:text-red-600 transition-colors flex items-center gap-1"
                      >
                        <Trash2 size={13} /> Remover Logo
                      </button>
                    </div>
                  ) : (
                    <label className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center hover:border-[#FFC928] transition-colors cursor-pointer flex flex-col items-center justify-center bg-white">
                      <Upload size={24} className="text-gray-400 mb-2" />
                      <p className="text-xs font-bold text-gray-600 uppercase tracking-wide text-slate-700">Fazer Upload de Logo</p>
                      <p className="text-[10px] text-gray-450 mt-1">Clique para selecionar imagem</p>
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleLogoUpload} 
                        className="hidden" 
                      />
                    </label>
                  )}
                </div>
              </div>

              {/* Color picker */}
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-gray-500 block mb-2">Cor de Destaque da Marca</label>
                <div className="flex items-center gap-3">
                  <input type="color" value={form.primaryColor} onChange={e => update('primaryColor', e.target.value)} className="w-12 h-12 rounded-xl border border-gray-200 cursor-pointer" />
                  <span className="text-sm font-mono text-gray-700 font-bold">{form.primaryColor}</span>
                </div>
              </div>

              {/* Mode toggles */}
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-gray-500 block mb-3">Modalidades de atendimento</label>
                <div className="space-y-3">
                  {[
                    { key: 'delivery', label: 'Aceita delivery próprio / app' },
                    { key: 'pickup', label: 'Aceita retirada no balcão (Takeaway)' },
                    { key: 'dineIn', label: 'Usa mesas no salão (QR Code)' },
                  ].map(opt => (
                    <label key={opt.key} className="flex items-center justify-between p-3 rounded-xl border border-gray-200 cursor-pointer hover:border-[#FFC928] bg-white">
                      <span className="text-xs font-black text-slate-800 uppercase tracking-tight">{opt.label}</span>
                      <div
                        onClick={() => update(opt.key, !form[opt.key as keyof typeof form])}
                        className={`w-12 h-6 rounded-full transition-colors relative ${form[opt.key as keyof typeof form] ? 'bg-[#FFC928]' : 'bg-gray-200'}`}
                      >
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${form[opt.key as keyof typeof form] ? 'translate-x-7' : 'translate-x-1'}`} />
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 1: Categories */}
        {step === 1 && (
          <div>
            <h2 className="font-black text-2xl text-[#111] uppercase tracking-tight italic mb-1">Categorias do cardápio</h2>
            <p className="text-gray-500 text-xs font-black uppercase tracking-widest mb-6">Organize seus produtos em categorias.</p>

            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-md">
              <div className="flex gap-2 mb-4">
                <input
                  value={newCat}
                  onChange={e => setNewCat(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addCategory()}
                  placeholder="Nome da categoria (ex: Massas)"
                  className="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder:text-gray-400 font-medium focus:outline-none focus:ring-2 focus:ring-[#FFC928] focus:border-transparent outline-none transition-all"
                />
                <button onClick={addCategory} className="bg-[#FFC928] text-[#111] font-black px-5 py-3 rounded-xl hover:bg-[#e6b520] transition-colors flex items-center justify-center">
                  <Plus size={20} />
                </button>
              </div>

              <div className="space-y-2">
                {categories.map((cat, i) => (
                  <div key={i} className="flex items-center justify-between bg-slate-50 border border-slate-100 rounded-xl px-4 py-3">
                    <span className="font-bold text-slate-800 text-xs uppercase tracking-wider">{cat}</span>
                    <button onClick={() => setCategories(c => c.filter((_, idx) => idx !== i))} className="text-gray-400 hover:text-red-500 transition-colors">
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>

              <p className="text-xs text-gray-400 mt-4 leading-relaxed font-bold uppercase tracking-wider">Sugestões: Pratos Executivos, Entradas, Pizzas Clássicas, Burguers, Combos Inteiros, Sobremesas, Bebidas</p>
            </div>
          </div>
        )}

        {/* Step 2: Products */}
        {step === 2 && (
          <div>
            <h2 className="font-black text-2xl text-[#111] uppercase tracking-tight italic mb-1">Cadastrar produtos</h2>
            <p className="text-gray-500 text-xs font-black uppercase tracking-widest mb-4">Adicione os produtos do seu cardápio.</p>

            {/* AI feature active container - Powered by Gemini */}
            <div className="bg-gradient-to-r from-amber-950 to-black rounded-2xl p-6 mb-6 text-left border border-amber-500/20 shadow-xl relative overflow-hidden">
               <div className="absolute right-0 bottom-0 w-32 h-32 bg-amber-500 rounded-full blur-3xl opacity-10" />
               <div className="flex items-start gap-4 z-10 relative">
                 <div className="bg-[#FFC928] p-3 rounded-xl text-black flex-shrink-0 animate-bounce">
                   <Sparkles size={24} />
                 </div>
                 <div className="flex-1 space-y-1">
                   <div className="flex items-center gap-2">
                     <span className="font-black text-[#FFC928] text-[10px] uppercase tracking-widest">Tecnologia Gemini 3.5 Flash</span>
                     <span className="bg-amber-400/20 text-yellow-300 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded border border-amber-400/10">Ativo</span>
                   </div>
                   <h4 className="text-lg font-black text-white leading-tight uppercase tracking-tight italic">Super Leitor de Cardápio por IA</h4>
                   <p className="text-slate-300 text-xs leading-relaxed max-w-md">Faça upload de uma foto nítida e legível ou de um arquivo PDF doc do seu cardápio de uma vez só! Nossa IA inteligente vai estruturar nomes, preços e categorias automaticamente para poupar tempo!</p>
                   
                   <div className="pt-3 flex items-center gap-3">
                     <label className="bg-[#FFC928] hover:bg-amber-400 text-black font-black uppercase tracking-wider text-[10px] px-4 py-2.5 rounded-xl cursor-pointer transition-all flex items-center gap-2 active:scale-95 shadow-lg shadow-amber-400/20">
                       <Upload size={14} />
                       {isAiParsing ? 'Lendo Cardápio...' : 'Selecionar Foto / PDF'}
                       <input
                         type="file"
                         accept="image/*,application/pdf"
                         onChange={handleAiMenuUpload}
                         disabled={isAiParsing}
                         className="hidden"
                       />
                     </label>
                     {isAiParsing && (
                       <span className="text-amber-300 text-xs font-bold animate-pulse flex items-center gap-1.5">
                         <Loader2 size={12} className="animate-spin" /> Carregando e interpretando dados...
                       </span>
                     )}
                   </div>
                 </div>
               </div>
            </div>

            <div className="space-y-4">
              {products.map((p, i) => (
                <div key={i} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-md">
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-black text-slate-800 text-xs uppercase tracking-widest">Produto {i + 1}</span>
                    {products.length > 1 && (
                      <button onClick={() => removeProduct(i)} className="text-gray-400 hover:text-red-500 transition-colors">
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                  <div className="space-y-3">
                    <input
                      value={p.name}
                      onChange={e => setProducts(prev => prev.map((x, idx) => idx === i ? { ...x, name: e.target.value } : x))}
                      placeholder="Nome do produto"
                      className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder:text-gray-400 font-medium focus:outline-none focus:ring-2 focus:ring-[#FFC928] focus:border-transparent outline-none transition-all"
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        value={p.price}
                        onChange={e => setProducts(prev => prev.map((x, idx) => idx === i ? { ...x, price: e.target.value } : x))}
                        placeholder="Preço (R$)"
                        type="number"
                        className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder:text-gray-400 font-medium focus:outline-none focus:ring-2 focus:ring-[#FFC928] focus:border-transparent outline-none transition-all"
                      />
                      <select
                        value={p.category}
                        onChange={e => setProducts(prev => prev.map((x, idx) => idx === i ? { ...x, category: e.target.value } : x))}
                        className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-[#FFC928] focus:border-transparent outline-none transition-all cursor-pointer"
                      >
                        <option value="" className="text-gray-400">Categoria</option>
                        {categories.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>

                    {/* Product picture actual uploader */}
                    <div className="border border-gray-100 rounded-xl p-3 bg-slate-50/50 flex flex-col items-center justify-center">
                      {p.image ? (
                        <div className="flex items-center gap-3">
                          <img src={p.image} className="w-16 h-16 rounded-xl object-cover border border-gray-250 shadow-sm" alt="Produto" />
                          <button 
                            type="button" 
                            onClick={() => setProducts(prev => prev.map((x, idx) => idx === i ? { ...x, image: '' } : x))}
                            className="text-[10px] text-red-500 font-black uppercase tracking-wider flex items-center gap-1 hover:text-red-600 transition-colors"
                          >
                            <Trash2 size={10} /> Remover imagem
                          </button>
                        </div>
                      ) : (
                        <label className="cursor-pointer hover:text-amber-500 transition-colors flex flex-col items-center justify-center py-2">
                          <Upload size={16} className="text-gray-400 mx-auto mb-1" />
                          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wide">Adicionar foto do produto</p>
                          <input 
                            type="file" 
                            accept="image/*" 
                            onChange={(e) => handleProductImageUpload(i, e)} 
                            className="hidden" 
                          />
                        </label>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              <button 
                type="button"
                onClick={addProduct} 
                className="w-full border-2 border-dashed border-[#FFC928] text-slate-800 font-black py-4 rounded-xl hover:bg-[#FFF8E1] transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-wider bg-white"
              >
                <Plus size={16} />
                Adicionar mais um produto
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Delivery */}
        {step === 3 && (
          <div>
            <h2 className="font-black text-2xl text-[#111] uppercase tracking-tight italic mb-1">Configurar delivery</h2>
            <p className="text-gray-500 text-xs font-black uppercase tracking-widest mb-6">Defina as condições da sua entrega.</p>

            <div className="bg-white rounded-2xl p-6 space-y-4 border border-gray-100 shadow-md">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-gray-500 block mb-1">Taxa de entrega (R$)</label>
                  <input 
                    type="number"
                    value={deliveryFee}
                    onChange={e => setDeliveryFee(e.target.value)}
                    placeholder="6.00" 
                    className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder:text-gray-400 font-medium focus:outline-none focus:ring-2 focus:ring-[#FFC928] outline-none" 
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-gray-500 block mb-1">Tempo estimado (minutos)</label>
                  <input 
                    type="number"
                    value={estimatedTime}
                    onChange={e => setEstimatedTime(e.target.value)}
                    placeholder="45" 
                    className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder:text-gray-400 font-medium focus:outline-none focus:ring-2 focus:ring-[#FFC928] outline-none" 
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-gray-500 block mb-1">Pedido mínimo (R$)</label>
                  <input 
                    type="number"
                    value={minOrder}
                    onChange={e => setMinOrder(e.target.value)}
                    placeholder="30.00" 
                    className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder:text-gray-400 font-medium focus:outline-none focus:ring-2 focus:ring-[#FFC928] outline-none" 
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-gray-500 block mb-1">Raio de entrega (km)</label>
                  <input 
                    type="number"
                    value={deliveryRadius}
                    onChange={e => setDeliveryRadius(e.target.value)}
                    placeholder="5" 
                    className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder:text-gray-400 font-medium focus:outline-none focus:ring-2 focus:ring-[#FFC928] outline-none" 
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-[10px] font-black uppercase tracking-wider text-gray-500 block mb-1">Observação sobre entrega</label>
                  <input 
                    type="text"
                    value={deliveryObs}
                    onChange={e => setDeliveryObs(e.target.value)}
                    placeholder="Ex: Entregamos todos os dias das 18h às 23h" 
                    className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder:text-gray-400 font-medium focus:outline-none focus:ring-2 focus:ring-[#FFC928] outline-none" 
                  />
                </div>
              </div>
            </div>

            {/* Carriers plugin integration connection hub */}
            <div className="bg-[#111111] border border-amber-500/10 rounded-2xl p-6 mt-4 shadow-xl text-left">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="bg-amber-400/10 p-2 rounded-xl text-[#FFC928]">
                  <Zap size={20} className="animate-pulse" />
                </div>
                <div>
                  <h3 className="font-black text-white text-base uppercase tracking-tight italic">Hub de Plugins de Entrega</h3>
                  <p className="text-gray-400 text-[10px] uppercase tracking-widest font-bold">Conecte seus provedores para despacho em um clique</p>
                </div>
              </div>
              
              <div className="mt-4 space-y-3">
                {deliveryPlugins.map((plugin) => (
                  <div key={plugin.id} className="bg-white/5 border border-white/10 rounded-xl p-4 transition-all hover:bg-white/[0.07]">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{plugin.logo}</span>
                        <div>
                          <span className="font-extrabold text-white text-xs block">{plugin.name}</span>
                          <span className="text-gray-400 text-[10px] block mt-0.5 max-w-sm">{plugin.description}</span>
                        </div>
                      </div>
                      
                      <button
                        type="button"
                        onClick={() => handleTogglePlugin(plugin.id)}
                        className={`text-[9px] font-black uppercase tracking-wider px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${plugin.connected ? 'bg-green-500/10 text-green-400 border border-green-500/30' : 'bg-[#FFC928] text-black font-black'}`}
                      >
                        {plugin.connected ? (
                          <>
                            <Check size={10} className="stroke-[3]" /> Conectado (Plugin Ativo)
                          </>
                        ) : (
                          'Conectar Plugin'
                        )}
                      </button>
                    </div>
                    
                    {/* Credential configuration fields appearing dynamically under active plugin */}
                    {plugin.connected && (
                      <div className="mt-3.5 pt-3.5 border-t border-white/10 grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[8px] font-black uppercase text-gray-400 tracking-widest block mb-1">API Key / Token</label>
                          <input 
                            type="text" 
                            value={plugin.apiKey}
                            onChange={(e) => handlePluginCredChange(plugin.id, 'apiKey', e.target.value)}
                            placeholder="Insira a chave da prestadora"
                            className="bg-zinc-900 border border-white/10 w-full rounded-lg px-2.5 py-1.5 text-[10px] text-white focus:outline-none focus:border-[#FFC928]"
                          />
                        </div>
                        <div>
                          <label className="text-[8px] font-black uppercase text-gray-400 tracking-widest block mb-1">Merchant ID (Mesa/Identificador)</label>
                          <input 
                            type="text" 
                            value={plugin.apiSecret}
                            onChange={(e) => handlePluginCredChange(plugin.id, 'apiSecret', e.target.value)}
                            placeholder="Insira o ID de loja"
                            className="bg-zinc-900 border border-white/10 w-full rounded-lg px-2.5 py-1.5 text-[10px] text-white focus:outline-none focus:border-[#FFC928]"
                          />
                        </div>
                        <p className="col-span-2 text-[9px] text-[#FFC928] font-bold leading-normal">
                          ✓ Plugin ativado para a região. O envio ao motoboy parceiro será roteado automaticamente sob demanda!
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Done */}
        {step === 4 && (
          <div className="text-center">
            <div className="w-20 h-20 bg-[#FFC928] rounded-full flex items-center justify-center mx-auto mb-6">
              <Check size={40} className="text-[#111]" />
            </div>
            <h2 className="font-black text-3xl text-[#111] mb-2">Tudo pronto!</h2>
            <p className="text-gray-500 mb-8">Seu cardápio digital está configurado e pronto para receber pedidos.</p>

            <div className="bg-white rounded-2xl p-6 mb-6 text-left">
              <h3 className="font-bold text-[#111] mb-4">Seu link de cardápio</h3>
              <div className="bg-[#F5F5F5] rounded-xl p-4 flex items-center justify-between">
                <span className="text-sm font-mono text-[#111]">meuovo.com.br/r/{form.name.toLowerCase().replace(/\s+/g, '-')}</span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/r/${form.name.toLowerCase().replace(/\s+/g, '-')}`);
                    toast.success('Link copiado!');
                  }}
                  className="bg-[#FFC928] text-[#111] font-bold text-xs px-3 py-2 rounded-lg"
                >
                  Copiar
                </button>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 mb-6">
              <div className="flex items-center gap-3 mb-4">
                <QrCode size={24} className="text-[#FFC928]" />
                <h3 className="font-bold text-[#111]">QR Code para o salão</h3>
              </div>
              <div className="w-32 h-32 bg-[#F5F5F5] rounded-xl mx-auto flex items-center justify-center">
                <QrCode size={64} className="text-gray-300" />
              </div>
              <button
                onClick={() => {
                  const canvas = document.createElement('canvas');
                  canvas.width = 200;
                  canvas.height = 200;
                  const ctx = canvas.getContext('2d');
                  if (ctx) {
                    ctx.fillStyle = '#F5F5F5';
                    ctx.fillRect(0, 0, 200, 200);
                    ctx.fillStyle = '#999';
                    ctx.font = '10px monospace';
                    ctx.textAlign = 'center';
                    ctx.fillText('QR Code', 100, 100);
                    ctx.fillText(`${window.location.origin}/r/${form.name.toLowerCase().replace(/\s+/g, '-')}`, 100, 130);
                  }
                  const link = document.createElement('a');
                  link.download = `qrcode-${form.name.toLowerCase().replace(/\s+/g, '-')}.png`;
                  link.href = canvas.toDataURL();
                  link.click();
                  toast.success('QR Code baixado!');
                }}
                className="mt-4 w-full border border-gray-200 text-gray-600 font-bold py-3 rounded-xl hover:bg-gray-50 text-sm"
              >
                Baixar QR Code
              </button>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => navigate('/admin')}
                className="w-full bg-[#FFC928] text-[#111] font-black py-4 rounded-2xl text-lg hover:bg-[#e6b520]"
              >
                Acessar painel do restaurante
              </button>
              <button
                onClick={() => navigate(`/r/${form.name.toLowerCase().replace(/\s+/g, '-')}`)}
                className="w-full border border-gray-200 text-gray-600 font-bold py-4 rounded-2xl hover:bg-gray-50"
              >
                Ver cardápio público
              </button>
            </div>
          </div>
        )}

        {/* Navigation */}
        {step < 4 && (
          <div className="flex items-center justify-between mt-8">
            <button
              onClick={prev}
              className={`flex items-center gap-2 font-bold px-6 py-3 rounded-full transition-colors ${step === 0 ? 'invisible' : 'text-gray-600 hover:bg-gray-200'}`}
            >
              <ArrowLeft size={18} />
              {t('onboarding.back')}
            </button>
            <button
              onClick={next}
              disabled={loading}
              className="bg-[#111111] text-white font-black px-8 py-3 rounded-full hover:bg-[#333] transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <>
                  {step === 3 ? t('onboarding.finish') : t('onboarding.continue')}
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
