import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth } from '../lib/firebase-auth';
import { db } from '../lib/firebase';
import { toast } from 'react-hot-toast';
import { ArrowRight, Check, Loader2 } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import SEO from '../components/SEO';

export default function SelfSignupPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({ name: '', whatsapp: '', email: '', password: '' });
  const [created, setCreated] = useState(false);

  const update = (field: string, value: string) => setForm(f => ({ ...f, [field]: value }));

  const maskPhone = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 2) return `(${digits}`;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  };

  const valid = {
    name: form.name.trim().length >= 2,
    whatsapp: form.whatsapp.replace(/\D/g, '').length >= 10,
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email),
    password: form.password.length >= 6,
  };

  const canSubmit = valid.name && valid.whatsapp && valid.email && valid.password;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setLoading(true);
    try {
      const raw = form.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const slug = raw.replace(/\s+/g, '-').replace(/[^\w-]+/g, '') || `rest-${Date.now()}`;
      const whatsappClean = form.whatsapp.replace(/\D/g, '');

      const cred = await createUserWithEmailAndPassword(auth, form.email, form.password);
      await updateProfile(cred.user, { displayName: form.name });

      await setDoc(doc(db, 'users', cred.user.uid), {
        full_name: form.name,
        role: 'restaurant',
        createdAt: new Date().toISOString(),
        onboardingComplete: true,
        customerRating: 5,
        customerRatingCount: 0,
      });

      await setDoc(doc(db, 'restaurants', slug), {
        id: slug,
        name: form.name,
        slug,
        ownerId: cred.user.uid,
        whatsapp: whatsappClean,
        email: form.email,
        logo: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=400&fit=crop',
        coverImage: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&h=400&fit=crop',
        cuisineType: 'Brasileira',
        priceRange: 'medium',
        isOpen: true,
        deliveryEnabled: true,
        pickupEnabled: true,
        dineInEnabled: false,
        estimatedTime: 30,
        deliveryFee: 0,
        minimumOrder: 10,
        rating: 5.0,
        reviewCount: 0,
        address: '',
        neighborhood: '',
        city: '',
        description: '',
        createdAt: new Date().toISOString(),
        deliverySettings: { fee: 0, estimatedTime: '30 min', minOrder: 10, feeByNeighborhood: [] },
        orderSettings: { autoAccept: true, soundAlert: true, thermalPrinterEnabled: false, whatsappNotificationsEnabled: true },
        loyaltySettings: { enabled: false, pointsPerReal: 1, accumulationType: 'amount', redemptionRules: [] },
      });

      setCreated(true);
      setStep(2);
      toast.success('Restaurante criado com sucesso!');

      setTimeout(() => navigate('/admin'), 1500);
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') {
        toast.error('Este email já está cadastrado. Faça login.');
      } else if (err.code === 'auth/weak-password') {
        toast.error('Senha muito fraca. Mínimo 6 caracteres.');
      } else {
        toast.error(err?.message || 'Erro ao criar conta');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] font-sans">
      <SEO title="Criar Conta Grátis - Meu OVO" description="Crie seu restaurante no Meu OVO grátis. Cardápio digital, pedidos no WhatsApp, zero taxas." />
      <Navbar />

      <div className="flex items-center justify-center px-4 py-24">
        <div className="w-full max-w-md">
          {step === 0 && (
            <div className="space-y-8">
              <div className="text-center space-y-3">
                <h1 className="text-4xl font-black text-white uppercase italic tracking-tighter">
                  Criar <span className="text-[#FFC928]">conta</span>
                </h1>
                <p className="text-gray-400 font-medium text-sm">
                  Grátis. Sem cartão. Sem taxas. Seu restaurante no ar em segundos.
                </p>
              </div>

              <div className="bg-[#111] border border-white/5 rounded-3xl p-6 space-y-5">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Nome do restaurante</label>
                  <input
                    autoFocus
                    value={form.name}
                    onChange={e => update('name', e.target.value)}
                    placeholder="Ex: Restaurante Sabor"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm font-bold placeholder:text-gray-600 focus:outline-none focus:border-[#FFC928] transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">WhatsApp</label>
                  <input
                    value={form.whatsapp}
                    onChange={e => update('whatsapp', maskPhone(e.target.value))}
                    placeholder="(11) 99999-9999"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm font-bold placeholder:text-gray-600 focus:outline-none focus:border-[#FFC928] transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => update('email', e.target.value)}
                    placeholder="seu@email.com"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm font-bold placeholder:text-gray-600 focus:outline-none focus:border-[#FFC928] transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Senha</label>
                  <input
                    type="password"
                    value={form.password}
                    onChange={e => update('password', e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm font-bold placeholder:text-gray-600 focus:outline-none focus:border-[#FFC928] transition-colors"
                  />
                </div>

                <p className="text-[9px] text-gray-500 font-medium text-center leading-relaxed">
                  Ao criar sua conta, você aceita nossos{' '}
                  <Link to="/termos" className="text-[#FFC928] hover:underline">Termos</Link> e{' '}
                  <Link to="/privacidade" className="text-[#FFC928] hover:underline">Política de Privacidade</Link>.
                </p>

                <button
                  onClick={handleSubmit}
                  disabled={!canSubmit || loading}
                  className="w-full bg-[#FFC928] text-black font-black py-4 rounded-2xl text-sm uppercase tracking-widest hover:bg-[#ffe083] transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <><Check size={16} /> Criar conta grátis</>}
                </button>

                <p className="text-center text-[10px] text-gray-500 font-bold">
                  Já tem conta?{' '}
                  <Link to="/login" className="text-[#FFC928] hover:underline">Entrar</Link>
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3 text-center">
                {['Zero taxa', 'Cardápio digital', 'Pedidos WhatsApp'].map((item, i) => (
                  <div key={i} className="bg-white/5 border border-white/5 rounded-2xl p-3">
                    <Check size={14} className="text-emerald-400 mx-auto mb-1" />
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="text-center space-y-6 py-12">
              <Loader2 size={40} className="animate-spin text-[#FFC928] mx-auto" />
              <p className="text-white font-bold text-lg">Criando seu restaurante...</p>
              <p className="text-gray-400 text-sm">Só um instante</p>
            </div>
          )}

          {step === 2 && (
            <div className="text-center space-y-6 py-12">
              <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto">
                <Check size={32} className="text-emerald-400" />
              </div>
              <h2 className="text-2xl font-black text-white">Restaurante criado!</h2>
              <p className="text-gray-400 text-sm">Redirecionando para o painel...</p>
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
}
