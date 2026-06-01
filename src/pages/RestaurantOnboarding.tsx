import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Check, ArrowRight, ArrowLeft, Upload, Plus, Trash2, QrCode, Sparkles, Loader2, Copy, Download } from 'lucide-react';
import { QRCode } from 'react-qr-code';
import { useTheme } from '../context/ThemeContext';
import { cuisineTypes } from '../data/mockData';
import { Logo } from '../components/Logo';
import { useRestaurant } from '../context/RestaurantContext';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';

export default function RestaurantOnboarding() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const { registerRestaurant } = useRestaurant();
  const { signUp, user } = useAuth();
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
  const [form, setForm] = useState({
    name: '', responsible: '', whatsapp: '', email: '', password: '', pixKey: '',
    address: '', neighborhood: '', city: '', cuisineType: 'Pizza',
    hours: '', primaryColor: '#FFC928',
    delivery: true, pickup: true, dineIn: false,
    deliveryFee: '', estimatedTime: '', minOrder: '', deliveryRadius: '', deliveryNotes: '',
  });
  const [categories, setCategories] = useState<string[]>(['Mais Vendidos', 'Bebidas']);
  const [newCat, setNewCat] = useState('');
  const [products, setProducts] = useState([{ name: '', price: '', category: '' }]);

  const update = (field: string, value: string | boolean) => setForm(f => ({ ...f, [field]: value }));

  const parsePrice = (v: string) => parseFloat(v.replace(',', '.'));

  const requiredFields: [string, string][] = [
    ['name', 'Nome do restaurante'],
    ['responsible', 'Nome do responsável'],
    ['whatsapp', 'Whatsapp'],
    ['password', 'Senha de acesso'],
  ];

  const validateStep = (s: number): boolean => {
    if (s === 0) {
      const empty = requiredFields.find(([k]) => !form[k as keyof typeof form]);
      if (empty) { toast.error(`Preencha o campo "${empty[1]}"`); return false; }
    }
    if (s === 1 && categories.length === 0) {
      toast.error('Adicione pelo menos uma categoria'); return false;
    }
    if (s === 2) {
      const invalid = products.find(p => !p.name || !p.price || !p.category);
      if (invalid) { toast.error('Preencha nome, preço e categoria de todos os produtos'); return false; }
    }
    return true;
  };

  const handleFinish = async () => {
    setLoading(true);
    try {
      // Create auth account first (if not already logged in)
      if (!user) {
        if (!form.password) {
          toast.error('Crie uma senha para acessar o painel administrativo');
          setLoading(false);
          return;
        }
        await signUp(form.email, form.password, form.responsible, 'restaurant');
      }

      const slug = form.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '-').replace(/[^\w-]+/g, '');
      const restaurantId = slug || `rest-${Math.random().toString(36).substr(2, 5)}`;
      
      const restaurantData = {
        id: restaurantId,
        name: form.name,
        slug: restaurantId,
        pixKey: form.pixKey,
        logo: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=400&fit=crop',
        cover: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&h=400&fit=crop',
        cuisineType: form.cuisineType,
        rating: 5.0,
        deliveryTime: form.estimatedTime || '30-45',
        minOrder: parsePrice(form.minOrder) || 10,
        address: form.address,
        neighborhood: form.neighborhood,
        whatsapp: form.whatsapp,
        primaryColor: form.primaryColor,
        isSocialImpactPartner: true,
        isOpen: true,
        hours: form.hours,
        deliveryEnabled: form.delivery,
        pickupEnabled: form.pickup,
        dineInEnabled: form.dineIn,
        deliveryFee: form.deliveryFee ? parsePrice(form.deliveryFee) : 0,
        estimatedTime: parseInt(form.estimatedTime) || 45,
        minimumOrder: form.minOrder ? parsePrice(form.minOrder) : 10,
        deliveryRadius: form.deliveryRadius ? parseInt(form.deliveryRadius) : 5,
        deliveryNotes: form.deliveryNotes || '',
      } as any;

      await registerRestaurant(restaurantData, categories, products);
      setStep(4);
      toast.success('Restaurante cadastrado com sucesso!');
    } catch (e) {
      console.error(e);
      toast.error('Erro ao cadastrar restaurante');
    } finally {
      setLoading(false);
    }
  };

  const slug = form.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '-').replace(/[^\w-]+/g, '') || 'meu-restaurante';
  const publicLink = `meuovo.com.br/r/${slug}`;

  const copyLink = () => {
    navigator.clipboard.writeText(publicLink);
    toast.success('Link copiado!');
  };

  const next = () => { 
    if (!validateStep(step)) return;
    if (step === 3) {
      handleFinish();
    } else if (step < 4) {
      setStep(s => s + 1); 
    }
  };
  const prev = () => { if (step > 0) setStep(s => s - 1); };

  const addCategory = () => {
    const cat = newCat.trim();
    if (!cat) return;
    if (categories.some(c => c.toLowerCase() === cat.toLowerCase())) {
      toast.error('Categoria já existe'); return;
    }
    setCategories(c => [...c, cat]); setNewCat('');
  };

  const addProduct = () => setProducts(p => [...p, { name: '', price: '', category: '' }]);
  const removeProduct = (i: number) => setProducts(p => p.filter((_, idx) => idx !== i));

  return (
    <div className={`min-h-screen transition-colors ${isDark ? 'bg-[#1a1a1a]' : 'bg-[#F5F5F5]'}`}>
      {/* Header */}
      <div className={`transition-colors ${isDark ? 'bg-[#111111]' : 'bg-white'} px-4 py-4 border-b ${isDark ? 'border-[#2a2a2a]' : 'border-gray-100'}`}>
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <Logo size="lg" />
          <span className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{t('onboarding.freeRegistration')}</span>
        </div>
      </div>

      {/* Step indicators */}
      <div className="bg-white border-b border-gray-100 px-4 py-4">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between">
            {STEPS.map((s, i) => (
              <div key={i} className="flex items-center flex-1">
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${i < step ? 'bg-green-500 text-white' : i === step ? 'bg-[#FFC928] text-[#111]' : 'bg-gray-200 text-gray-400'}`}>
                    {i < step ? <Check size={16} /> : i + 1}
                  </div>
                  <span className={`text-xs mt-1 hidden md:block ${i === step ? 'font-bold text-[#111]' : 'text-gray-400'}`}>{s}</span>
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
            <h2 className="font-black text-2xl text-[#111] mb-2">{t('onboarding.restaurantData')}</h2>
            <p className="text-gray-500 mb-6">{t('onboarding.basicInfo')}</p>

            <div className="bg-white rounded-2xl p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-sm font-medium text-gray-600 block mb-1">{t('onboarding.restaurantName')} *</label>
                  <input value={form.name} onChange={e => update('name', e.target.value)} placeholder="Ex: Pizzaria do João" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#FFC928]" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600 block mb-1">{t('onboarding.responsible')} *</label>
                  <input value={form.responsible} onChange={e => update('responsible', e.target.value)} placeholder="Seu nome" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#FFC928]" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600 block mb-1">{t('onboarding.whatsapp')} *</label>
                  <input value={form.whatsapp} onChange={e => update('whatsapp', e.target.value)} placeholder="(11) 99999-9999" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#FFC928]" />
                </div>
                <div className="col-span-2">
                  <label className="text-sm font-medium text-gray-600 block mb-1">Chave PIX (CPF, CNPJ, e-mail ou telefone)</label>
                  <input value={form.pixKey} onChange={e => update('pixKey', e.target.value)} placeholder="Ex: 11999999999 ou pix@restaurante.com" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#FFC928]" />
                  <p className="text-xs text-gray-400 mt-1">Sua chave PIX para receber pagamentos dos pedidos</p>
                </div>
                <div className="col-span-2">
                  <label className="text-sm font-medium text-gray-600 block mb-1">{t('onboarding.email')}</label>
                  <input value={form.email} onChange={e => update('email', e.target.value)} placeholder="seu@email.com" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#FFC928]" />
                </div>
                <div className="col-span-2">
                  <label className="text-sm font-medium text-gray-600 block mb-1">Senha de acesso *</label>
                  <input type="password" value={form.password} onChange={e => update('password', e.target.value)} placeholder="Crie uma senha para acessar o painel" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#FFC928]" />
                  <p className="text-xs text-gray-400 mt-1">Usada para acessar o painel administrativo do seu restaurante</p>
                </div>
                <div className="col-span-2">
                  <label className="text-sm font-medium text-gray-600 block mb-1">{t('onboarding.address')}</label>
                  <input value={form.address} onChange={e => update('address', e.target.value)} placeholder="Rua, número" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#FFC928]" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600 block mb-1">{t('onboarding.neighborhood')}</label>
                  <input value={form.neighborhood} onChange={e => update('neighborhood', e.target.value)} placeholder="Bairro" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#FFC928]" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600 block mb-1">Cidade</label>
                  <input value={form.city} onChange={e => update('city', e.target.value)} placeholder="São Paulo" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#FFC928]" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600 block mb-1">Tipo de comida</label>
                  <select value={form.cuisineType} onChange={e => update('cuisineType', e.target.value)} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#FFC928] bg-white">
                    {cuisineTypes.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600 block mb-1">Horário</label>
                  <input value={form.hours} onChange={e => update('hours', e.target.value)} placeholder="Ex: Seg-Sex 11h-22h" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#FFC928]" />
                </div>
              </div>

              {/* Logo upload placeholder */}
              <div>
                <label className="text-sm font-medium text-gray-600 block mb-2">Logo do restaurante</label>
                <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center hover:border-[#FFC928] transition-colors cursor-pointer">
                  <Upload size={24} className="text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">Clique para fazer upload da logo</p>
                  <p className="text-xs text-gray-400">PNG, JPG até 5MB</p>
                </div>
              </div>

              {/* Color picker */}
              <div>
                <label className="text-sm font-medium text-gray-600 block mb-2">Cor principal</label>
                <div className="flex items-center gap-3">
                  <input type="color" value={form.primaryColor} onChange={e => update('primaryColor', e.target.value)} className="w-12 h-12 rounded-xl border border-gray-200 cursor-pointer" />
                  <span className="text-sm text-gray-600">{form.primaryColor}</span>
                </div>
              </div>

              {/* Mode toggles */}
              <div>
                <label className="text-sm font-medium text-gray-600 block mb-3">Modalidades de atendimento</label>
                <div className="space-y-3">
                  {[
                    { key: 'delivery', label: 'Aceita delivery' },
                    { key: 'pickup', label: 'Aceita retirada no balcão' },
                    { key: 'dineIn', label: 'Usa mesas no salão (QR Code)' },
                  ].map(opt => (
                    <label key={opt.key} className="flex items-center justify-between p-3 rounded-xl border border-gray-200 cursor-pointer hover:border-[#FFC928]">
                      <span className="text-sm text-[#111]">{opt.label}</span>
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
            <h2 className="font-black text-2xl text-[#111] mb-2">Categorias do cardápio</h2>
            <p className="text-gray-500 mb-6">Organize seus produtos em categorias.</p>

            <div className="bg-white rounded-2xl p-6">
              <div className="flex gap-2 mb-4">
                <input
                  value={newCat}
                  onChange={e => setNewCat(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addCategory()}
                  placeholder="Nome da categoria..."
                  className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#FFC928]"
                />
                <button onClick={addCategory} className="bg-[#FFC928] text-[#111] font-bold px-4 py-3 rounded-xl hover:bg-[#e6b520] transition-colors">
                  <Plus size={20} />
                </button>
              </div>

              <div className="space-y-2">
                {categories.map((cat, i) => (
                  <div key={i} className="flex items-center justify-between bg-[#F5F5F5] rounded-xl px-4 py-3">
                    <span className="font-medium text-[#111]">{cat}</span>
                    <button onClick={() => setCategories(c => c.filter((_, idx) => idx !== i))} className="text-gray-400 hover:text-red-500 transition-colors">
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>

              <p className="text-xs text-gray-400 mt-4">Sugestões: Promoções, Entradas, Pratos Principais, Lanches, Combos, Bebidas, Sobremesas</p>
            </div>
          </div>
        )}

        {/* Step 2: Products */}
        {step === 2 && (
          <div>
            <h2 className="font-black text-2xl text-[#111] mb-2">Cadastrar produtos</h2>
            <p className="text-gray-500 mb-4">Adicione os produtos do seu cardápio.</p>

            {/* AI feature teaser */}
            <div className="bg-[#111111] rounded-2xl p-4 mb-6 flex items-start gap-3">
              <Sparkles size={24} className="text-[#FFC928] flex-shrink-0" />
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold text-white text-sm">Importar cardápio com IA</span>
                  <span className="bg-[#FFC928] text-[#111] text-xs font-bold px-2 py-0.5 rounded-full">Em breve</span>
                </div>
                <p className="text-gray-400 text-xs">Faça upload de uma foto do seu cardápio e a IA vai ler os itens, preços e categorias automaticamente.</p>
                <button disabled className="mt-2 border border-gray-600 text-gray-500 text-xs font-bold px-3 py-1 rounded-full cursor-not-allowed">
                  Upload da foto do cardápio
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {products.map((p, i) => (
                <div key={i} className="bg-white rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-bold text-[#111]">Produto {i + 1}</span>
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
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#FFC928]"
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        value={p.price}
                        onChange={e => setProducts(prev => prev.map((x, idx) => idx === i ? { ...x, price: e.target.value.replace(',', '.') } : x))}
                        placeholder="Preço (R$)"
                        type="text"
                        inputMode="decimal"
                        className="border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#FFC928]"
                      />
                      <select
                        value={p.category}
                        onChange={e => setProducts(prev => prev.map((x, idx) => idx === i ? { ...x, category: e.target.value } : x))}
                        className="border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#FFC928] bg-white"
                      >
                        <option value="">Categoria</option>
                        {categories.map(c => <option key={c}>{c}</option>)}
                      </select>
                    </div>
                    <div className="border-2 border-dashed border-gray-200 rounded-xl p-3 text-center cursor-pointer hover:border-[#FFC928]">
                      <Upload size={16} className="text-gray-400 mx-auto mb-1" />
                      <p className="text-xs text-gray-400">Adicionar foto</p>
                    </div>
                  </div>
                </div>
              ))}

              <button onClick={addProduct} className="w-full border-2 border-dashed border-[#FFC928] text-[#111] font-bold py-4 rounded-2xl hover:bg-[#FFF8E1] transition-colors flex items-center justify-center gap-2">
                <Plus size={20} />
                Adicionar produto
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Delivery */}
        {step === 3 && (
          <div>
            <h2 className="font-black text-2xl text-[#111] mb-2">Configurar delivery</h2>
            <p className="text-gray-500 mb-6">Defina as condições da sua entrega.</p>

            <div className="bg-white rounded-2xl p-6 space-y-4">
              {([
                { key: 'deliveryFee', label: 'Taxa de entrega (R$)', placeholder: '6.00', type: 'text', inputMode: 'decimal' },
                { key: 'estimatedTime', label: 'Tempo estimado (minutos)', placeholder: '45', type: 'number', inputMode: undefined },
                { key: 'minOrder', label: 'Pedido mínimo (R$)', placeholder: '30.00', type: 'text', inputMode: 'decimal' },
                { key: 'deliveryRadius', label: 'Raio de entrega (km)', placeholder: '5', type: 'number', inputMode: undefined },
                { key: 'deliveryNotes', label: 'Observação sobre entrega', placeholder: 'Ex: Entregamos todos os dias das 18h às 23h', type: 'text', inputMode: undefined },
              ] as const).map(f => (
                <div key={f.key}>
                  <label className="text-sm font-medium text-gray-600 block mb-1">{f.label}</label>
                  <input value={form[f.key as keyof typeof form] as string} onChange={e => update(f.key, e.target.value)} placeholder={f.placeholder} type={f.type} inputMode={f.inputMode as 'decimal' | undefined} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#FFC928]" />
                </div>
              ))}
            </div>

            <div className="bg-[#111111] rounded-2xl p-5 mt-4">
              <h3 className="font-bold text-white mb-3">Integração com entregadores</h3>
              <p className="text-gray-400 text-sm mb-3">Integração direta com Loggi, Lalamove, Uber Direct e outros.</p>
              <span className="bg-[#FFC928] text-[#111] text-xs font-bold px-3 py-1 rounded-full">Em breve</span>
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
                  <span className="text-sm font-mono text-[#111]">{publicLink}</span>
                  <button onClick={copyLink} className="bg-[#FFC928] text-[#111] font-bold text-xs px-3 py-2 rounded-lg flex items-center gap-1 hover:bg-[#e6b520]">
                    <Copy size={14} /> Copiar
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-6 mb-6">
                <div className="flex items-center gap-3 mb-4">
                  <QrCode size={24} className="text-[#FFC928]" />
                  <h3 className="font-bold text-[#111]">QR Code para o salão</h3>
                </div>
                <div className="flex justify-center">
                  <QRCode value={`https://${publicLink}`} size={160} />
                </div>
              </div>

            <div className="space-y-3">
              <button
                onClick={() => navigate('/admin')}
                className="w-full bg-[#FFC928] text-[#111] font-black py-4 rounded-2xl text-lg hover:bg-[#e6b520]"
              >
                Acessar painel do restaurante
              </button>
              <button
                onClick={() => navigate(`/r/${slug}`)}
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
