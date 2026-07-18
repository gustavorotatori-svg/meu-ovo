import React, { useState } from 'react';
import BackButton from '../../components/BackButton';
import { Logo } from '../../components/Logo';
import { ChefHat, Mail, Lock, User, Store, Trophy, Shield } from 'lucide-react';
import { Button } from '../../components/Button';
import { auth } from '../../lib/firebase-auth';
import { db } from '../../lib/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, sendPasswordResetEmail } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import { useNavigate, Link } from 'react-router-dom';

export default function AdminAuth() {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [wantToParticipate, setWantToParticipate] = useState(true);
  const [lgpdConsent, setLgpdConsent] = useState(false);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    restaurantName: '',
    email: '',
    password: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleForgotPassword = async () => {
    if (!formData.email.trim()) { toast.error('Digite seu e-mail primeiro'); return; }
    try {
      await sendPasswordResetEmail(auth, formData.email);
      toast.success('E-mail de recuperação enviado!');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao enviar e-mail de recuperação';
      toast.error(msg);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { user } = await signInWithEmailAndPassword(auth, formData.email, formData.password);
        toast.success('Bem-vindo de volta!');
        navigate('/admin');
      } else {
        if (!lgpdConsent) { toast.error('Você precisa aceitar os termos de privacidade'); setLoading(false); return; }
        if (formData.password.length < 6) { toast.error('A senha deve ter no mínimo 6 caracteres'); setLoading(false); return; }
        if (!/[A-Za-z]/.test(formData.password)) { toast.error('A senha deve conter pelo menos uma letra'); setLoading(false); return; }
        if (!/[0-9]/.test(formData.password)) { toast.error('A senha deve conter pelo menos um número'); setLoading(false); return; }
        if (!formData.email.includes('@')) { toast.error('Digite um e-mail válido'); setLoading(false); return; }
        const { user } = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
        await updateProfile(user, { displayName: formData.name });

        // Create users doc with role 'customer' initially — registerRestaurant upgrades after onboarding
        await setDoc(doc(db, 'users', user.uid), {
          full_name: formData.name,
          role: 'customer',
          createdAt: new Date().toISOString(),
          pwaInstallPending: true,
          onboardingComplete: false,
        });

        toast.success('Conta criada! Agora complete o cadastro do seu restaurante.');
        navigate('/install-app');
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Erro ao autenticar';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 relative overflow-hidden">
      {/* Abstract Background Elements */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-orange-100 rounded-full blur-3xl opacity-30 -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-slate-200 rounded-full blur-3xl opacity-30 translate-x-1/2 translate-y-1/2" />

      <div className="bg-white w-full max-w-md rounded-xl shadow-2xl shadow-slate-200 border border-slate-200 overflow-hidden relative z-10">
        <div className="bg-brand-black px-8 py-10 text-center relative flex flex-col items-center">
          <Logo size="lg" variant="white" className="mb-4" />
          <h2 className="text-xl font-black text-brand-white uppercase tracking-tight italic leading-tight">{isLogin ? 'Painel Administrativo' : 'Crie sua conta Meu Ovo'}</h2>
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-3 italic">Aqui é comida de verdade. Não foodzinho.</p>
          
          <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-brand-egg to-brand-orange" />
        </div>

        <form onSubmit={handleSubmit} className="px-8 py-8 space-y-5">
          {!isLogin && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Seu Nome</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
                  <input
                    type="text"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full pl-9 pr-4 py-2 border border-slate-200 bg-white text-slate-900 rounded-md text-sm focus:ring-1 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all placeholder:text-slate-400"
                    placeholder="João"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Restaurante</label>
                <div className="relative">
                  <Store className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
                  <input
                    type="text"
                    name="restaurantName"
                    required
                    value={formData.restaurantName}
                    onChange={handleChange}
                    className="w-full pl-9 pr-4 py-2 border border-slate-200 bg-white text-slate-900 rounded-md text-sm focus:ring-1 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all placeholder:text-slate-400"
                    placeholder="Nome"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">E-mail Corporativo</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
              <input
                type="email"
                name="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="w-full pl-9 pr-4 py-2 border border-slate-200 bg-white text-slate-900 rounded-md text-sm focus:ring-1 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all placeholder:text-slate-400"
                placeholder="exemplo@email.com"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Senha de Acesso</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
              <input
                type="password"
                name="password"
                required
                value={formData.password}
                onChange={handleChange}
                className="w-full pl-9 pr-4 py-2 border border-slate-200 bg-white text-slate-900 rounded-md text-sm focus:ring-1 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all placeholder:text-slate-400"
                placeholder="••••••••"
              />
            </div>
          </div>

          {/* Golden Ovos de Ouro Preference Box — only on signup */}
          {!isLogin && (
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4 space-y-2.5 text-left">
            <div className="flex items-start gap-2.5">
              <input
                id="participate-ovos-de-ouro"
                type="checkbox"
                checked={wantToParticipate}
                onChange={(e) => setWantToParticipate(e.target.checked)}
                className="mt-1 h-4.5 w-4.5 text-amber-500 border-amber-300 rounded focus:ring-amber-500 focus:ring-offset-0 cursor-pointer accent-amber-550"
              />
              <label htmlFor="participate-ovos-de-ouro" className="flex flex-col cursor-pointer select-none">
                <span className="text-[11px] font-black text-amber-950 uppercase tracking-tight flex items-center gap-1 leading-none">
                  <Trophy size={13} className="text-amber-600 fill-amber-300" />
                  Prêmio Ovos de Ouro {new Date().getFullYear()}
                </span>
                <span className="text-[9px] text-amber-800 font-extrabold mt-0.5">
                  Quero concorrer no campeonato anual oficial!
                </span>
              </label>
            </div>
            
            <p className="text-[9px] text-amber-700 leading-relaxed font-semibold">
              Garantia de Confidencialidade: Suas avaliações individuais acumuladas serão invisíveis para clientes e concorrentes, visíveis somente para o próprio estabelecimento e para a equipe Meu Ovo. Publicaremos apenas os 3 primeiros colocados generais em 15 de Dezembro. Austeridade e imparcialidade total.
            </p>
          </div>
          )}

          {isLogin && (
            <button
              type="button"
              onClick={handleForgotPassword}
              className="text-[10px] font-bold text-slate-400 hover:text-orange-600 transition-colors block"
            >
              Esqueci minha senha
            </button>
          )}

          {!isLogin && (
            <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2 text-left">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={lgpdConsent}
                  onChange={e => setLgpdConsent(e.target.checked)}
                  className="mt-0.5 h-4 w-4 text-amber-500 border-gray-300 rounded focus:ring-amber-500 accent-amber-500"
                />
                <div>
                  <span className="text-[10px] font-black text-slate-700 block leading-tight">
                    Aceito os termos de privacidade
                  </span>
                  <span className="text-[8px] text-slate-500 font-medium mt-0.5 block leading-relaxed">
                    Autorizo o tratamento dos meus dados conforme a LGPD.{' '}
                    <Link to="/privacidade" className="text-orange-600 font-bold underline">Ver Política</Link>
                  </span>
                </div>
              </label>
            </div>
          )}

          <Button type="submit" className="w-full h-11 text-xs font-black uppercase tracking-[0.2em]" isLoading={loading}>
            {isLogin ? 'Entrar no Sistema' : 'Ativar Conta Grátis'}
          </Button>

          <div className="pt-4 border-t border-slate-50 text-center">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-tight">
              {isLogin ? 'Ainda não tem acesso?' : 'Já possui cadastro?'}
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="text-orange-600 font-extrabold ml-1.5 hover:text-orange-700 transition-colors"
              >
                {isLogin ? 'Criar Conta' : 'Fazer Login'}
              </button>
            </p>
          </div>
        </form>
        <div className="px-8 pb-6">
          <BackButton to="/" label="Voltar ao início" />
        </div>
      </div>
    </div>
  );
}
