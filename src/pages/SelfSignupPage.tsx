import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { createUserWithEmailAndPassword, updateProfile, sendEmailVerification } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth } from '../lib/firebase-auth';
import { db } from '../lib/firebase';
import { toast } from 'react-hot-toast';
import { ArrowRight, Check, Loader2 } from 'lucide-react';
import { Button } from '../components/Button';
import BackButton from '../components/BackButton';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import SEO from '../components/SEO';

export default function SelfSignupPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({ name: '', whatsapp: '', email: '', password: '' });
  const [created, setCreated] = useState(false);
  const [lgpdConsent, setLgpdConsent] = useState(false);
  const mountedRef = useRef(true);
  const submittingRef = useRef(false);

  useEffect(() => {
    if (auth.currentUser) {
      navigate('/busca', { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

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

  const canSubmit = valid.name && valid.whatsapp && valid.email && valid.password && lgpdConsent;

  const handleSubmit = async () => {
    if (!canSubmit || loading || submittingRef.current) return;
    if (auth.currentUser) {
      toast.error('Você já está logado');
      navigate('/busca', { replace: true });
      return;
    }
    submittingRef.current = true;
    setLoading(true);
    try {
      const whatsappClean = form.whatsapp.replace(/\D/g, '');

      const cred = await createUserWithEmailAndPassword(auth, form.email, form.password);
      await updateProfile(cred.user, { displayName: form.name });

      await setDoc(doc(db, 'users', cred.user.uid), {
        full_name: form.name,
        whatsapp: whatsappClean || null,
        role: 'customer',
        createdAt: new Date().toISOString(),
        onboardingComplete: false,
        signupIntent: 'restaurant',
      }, { merge: true });

      try {
        await sendEmailVerification(cred.user);
      } catch (verifyErr) {
        console.error('[Signup] Failed to send verification email:', verifyErr);
      }

      if (!mountedRef.current) return;

      setCreated(true);
      setStep(2);
      toast.success('Conta criada com sucesso!');

      setTimeout(() => {
        if (mountedRef.current) {
          navigate('/cadastro-restaurante');
        }
      }, 1500);
    } catch (err: any) {
      if (!mountedRef.current) return;
      if (err.code === 'auth/email-already-in-use') {
        toast.error('Este email já está cadastrado. Faça login.');
      } else if (err.code === 'auth/weak-password') {
        toast.error('Senha muito fraca. Mínimo 6 caracteres.');
      } else {
        toast.error(err?.message || 'Erro ao criar conta');
      }
    } finally {
      submittingRef.current = false;
      if (mountedRef.current) setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] font-sans">
      <SEO title="Criar Conta Grátis - Meu OVO" description="Crie seu restaurante no Meu OVO grátis. Cardápio digital, pedidos no WhatsApp, zero taxas." />
      <Navbar />

      <div className="px-6 pt-6">
        <BackButton />
      </div>

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

              <form onSubmit={e => { e.preventDefault(); handleSubmit(); }} className="bg-[#111] border border-white/5 rounded-3xl p-6 space-y-5">
                <div>
                  <label htmlFor="signup-name" className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Nome do restaurante</label>
                  <input
                    id="signup-name"
                    autoFocus
                    autoComplete="organization"
                    value={form.name}
                    onChange={e => update('name', e.target.value)}
                    placeholder="Ex: Restaurante Sabor"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm font-bold placeholder:text-gray-600 focus:outline-none focus:border-[#FFC928] transition-colors"
                    aria-required="true"
                    aria-invalid={form.name.length > 0 && !valid.name}
                  />
                  {form.name.length > 0 && !valid.name && (
                    <p className="text-red-400 text-[10px] font-bold mt-1" role="alert">Nome deve ter pelo menos 2 caracteres</p>
                  )}
                </div>
                <div>
                  <label htmlFor="signup-whatsapp" className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">WhatsApp</label>
                  <input
                    id="signup-whatsapp"
                    inputMode="tel"
                    autoComplete="tel"
                    value={form.whatsapp}
                    onChange={e => update('whatsapp', maskPhone(e.target.value))}
                    placeholder="(11) 99999-9999"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm font-bold placeholder:text-gray-600 focus:outline-none focus:border-[#FFC928] transition-colors"
                    aria-required="true"
                    aria-invalid={form.whatsapp.length > 0 && !valid.whatsapp}
                  />
                  {form.whatsapp.length > 0 && !valid.whatsapp && (
                    <p className="text-red-400 text-[10px] font-bold mt-1" role="alert">Informe um número de WhatsApp válido (mínimo 10 dígitos)</p>
                  )}
                </div>
                <div>
                  <label htmlFor="signup-email" className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Email</label>
                  <input
                    id="signup-email"
                    type="email"
                    autoComplete="email"
                    value={form.email}
                    onChange={e => update('email', e.target.value)}
                    placeholder="seu@email.com"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm font-bold placeholder:text-gray-600 focus:outline-none focus:border-[#FFC928] transition-colors"
                    aria-required="true"
                    aria-invalid={form.email.length > 0 && !valid.email}
                  />
                  {form.email.length > 0 && !valid.email && (
                    <p className="text-red-400 text-[10px] font-bold mt-1" role="alert">Informe um email válido</p>
                  )}
                </div>
                <div>
                  <label htmlFor="signup-password" className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Senha</label>
                  <input
                    id="signup-password"
                    type="password"
                    autoComplete="new-password"
                    minLength={6}
                    value={form.password}
                    onChange={e => update('password', e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm font-bold placeholder:text-gray-600 focus:outline-none focus:border-[#FFC928] transition-colors"
                    aria-required="true"
                    aria-invalid={form.password.length > 0 && !valid.password}
                  />
                  {form.password.length > 0 && !valid.password && (
                    <p className="text-red-400 text-[10px] font-bold mt-1" role="alert">Senha deve ter pelo menos 6 caracteres</p>
                  )}
                </div>

                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    id="signup-lgpd"
                    checked={lgpdConsent}
                    onChange={e => setLgpdConsent(e.target.checked)}
                    required
                    className="mt-0.5 w-5 h-5 rounded border-white/20 bg-white/5 text-[#FFC928] accent-[#FFC928] shrink-0"
                    aria-required="true"
                  />
                  <span className="text-[10px] font-bold text-gray-400 leading-relaxed">
                    Aceito os{' '}
                    <Link to="/termos" className="text-[#FFC928] hover:underline">Termos de Uso</Link>
                    {' '}e a{' '}
                    <Link to="/privacidade" className="text-[#FFC928] hover:underline">Política de Privacidade</Link>
                    , e autorizo o tratamento dos meus dados conforme a LGPD.
                  </span>
                </label>

                <Button
                  type="submit"
                  size="lg"
                  disabled={!canSubmit || loading}
                  isLoading={loading}
                  className="w-full"
                >
                  <Check size={16} /> Criar conta grátis
                </Button>

                <p className="text-center text-[10px] text-gray-500 font-bold">
                  Já tem conta?{' '}
                  <Link to="/login" className="text-[#FFC928] hover:underline">Entrar</Link>
                </p>
              </form>

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
            <div className="text-center space-y-6 py-12" role="status" aria-live="polite">
              <Loader2 size={40} className="animate-spin text-[#FFC928] mx-auto" aria-hidden="true" />
              <p className="text-white font-bold text-lg">Criando seu restaurante...</p>
              <p className="text-gray-400 text-sm">Só um instante</p>
            </div>
          )}

          {step === 2 && (
            <div className="text-center space-y-6 py-12" role="alert" aria-live="assertive">
              <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto">
                <Check size={32} className="text-emerald-400" />
              </div>
              <h2 className="text-2xl font-black text-white">Conta criada!</h2>
              <p className="text-gray-400 text-sm">Redirecionando para configuração do restaurante...</p>
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
}
