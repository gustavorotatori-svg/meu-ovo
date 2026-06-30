import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function Breadcrumbs() {
  const { pathname } = useLocation();
  const { t } = useTranslation();

  const pathnames = pathname.split('/').filter((x) => x);

  // Map path segments to readable labels
  const pathMap: Record<string, string> = {
    admin: t('nav.dashboard'),
    caixa: 'Caixa',
    pedidos: t('nav.orders'),
    cardapio: t('nav.menu'),
    cupons: 'Cupons',
    fidelidade: 'Fidelidade',
    mesas: 'Mesas & QR Codes',
    garcom: t('nav.waiter'),
    cozinha: t('nav.kitchen'),
    delivery: 'Delivery',
    relatorios: t('nav.reports'),
    configuracoes: t('nav.settings'),
    'impacto-social': 'Impacto Social',
    'para-restaurantes': 'Para Restaurantes',
    plataforma: 'Plataforma Master',
    restaurantes: 'Restaurantes',
    inteligencia: 'Inteligência',
    parceiros: 'Parceiros Sociais',
    doacoes: 'Gestão de Doações',
  };

  if (pathnames.length <= 1 && (pathnames[0] === 'admin' || pathnames[0] === 'plataforma')) return null;

  const isPlatform = pathnames[0] === 'plataforma';
  const rootLabel = isPlatform ? 'Plataforma' : 'Painel';
  const rootTo = isPlatform ? '/plataforma' : '/admin';

  return (
    <nav className="flex items-center gap-2 mb-6 overflow-x-auto whitespace-nowrap pb-2 lg:pb-0 scrollbar-hide">
      <Link
        to={rootTo}
        className="flex items-center gap-1.5 text-gray-500 hover:text-[#111] transition-colors"
      >
        <Home size={14} />
        <span className="text-[10px] font-black uppercase tracking-widest">{rootLabel}</span>
      </Link>

      {pathnames.map((name, index) => {
        const routeTo = `/${pathnames.slice(0, index + 1).join('/')}`;
        const isLast = index === pathnames.length - 1;
        
        let label = pathMap[name] || name;
        if (isPlatform && name === 'relatorios') {
          label = 'Relatórios do Mercado';
        }

        // Skip the root segment if it's the first one as we already have the root link
        if ((name === 'admin' || name === 'plataforma') && index === 0) return null;

        return (
          <React.Fragment key={name}>
            <ChevronRight size={12} className="text-gray-300 shrink-0" />
            {isLast ? (
              <span className="text-[10px] font-black text-[#FFC928] uppercase tracking-widest bg-[#FFC928]/10 px-2 py-0.5 rounded-lg border border-[#FFC928]/20">
                {label}
              </span>
            ) : (
              <Link
                to={routeTo}
                className="text-[10px] font-black text-gray-400 hover:text-[#111] uppercase tracking-widest transition-colors"
              >
                {label}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
