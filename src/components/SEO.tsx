import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';

interface FAQItem {
  question: string;
  answer: string;
}

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  url?: string;
  type?: string;
  publishedTime?: string;
  restaurantName?: string;
  noIndex?: boolean;
  faqItems?: FAQItem[];
}

const SEO: React.FC<SEOProps> = ({
  title,
  description,
  keywords,
  image,
  url,
  type = 'website',
  publishedTime,
  restaurantName,
  noIndex,
  faqItems,
}) => {
  const { i18n } = useTranslation();
  const siteName = 'MEU OVO';
  const fullTitle = title ? `${title} | ${siteName}` : siteName;
  const defaultDescription = 'Plataforma que conecta restaurantes locais diretamente com clientes. Peça comida de verdade, sem taxas abusivas. Cadastre seu restaurante grátis.';
  const metaDescription = description || defaultDescription;
  const metaKeywords = keywords || 'delivery, restaurante, cardápio digital, pedir comida, delivery grátis, sem comissão, restaurante local, comida de verdade, MEU OVO';
  const siteUrl = 'https://meu-ovo-pi.vercel.app';
  const metaUrl = url ? `${siteUrl}${url}` : siteUrl;
  const metaImage = image || `${siteUrl}/og-image.svg`;
  const lang = i18n.language || 'pt-BR';

  return (
    <Helmet>
      <html lang={lang} />
      {noIndex && <meta name="robots" content="noindex, nofollow" />}

      <title>{fullTitle}</title>
      <link rel="canonical" href={metaUrl} />
      <meta name="description" content={metaDescription} />
      <meta name="keywords" content={metaKeywords} />

      <meta property="og:type" content={type} />
      <meta property="og:url" content={metaUrl} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={metaDescription} />
      <meta property="og:image" content={metaImage} />
      <meta property="og:site_name" content={siteName} />
      <meta property="og:locale" content={lang.replace('-', '_')} />
      {publishedTime && <meta property="article:published_time" content={publishedTime} />}

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={metaUrl} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={metaDescription} />
      <meta name="twitter:image" content={metaImage} />

      {/* Organization Schema */}
      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          "name": "Meu Ovo",
          "url": siteUrl,
          "logo": `${siteUrl}/pwa-icon.svg`,
          "description": defaultDescription,
          "sameAs": [],
        })}
      </script>

      {/* WebSite Schema with SearchAction */}
      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          "name": siteName,
          "url": siteUrl,
          "potentialAction": {
            "@type": "SearchAction",
            "target": `${siteUrl}/busca?search={search_term_string}`,
            "query-input": "required name=search_term_string",
          },
        })}
      </script>

      {/* Restaurant Schema (per-page) */}
      {restaurantName && type === 'restaurant' && (
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Restaurant",
            "name": restaurantName,
            "description": metaDescription,
            "image": metaImage,
            "url": metaUrl,
          })}
        </script>
      )}

      {/* FAQPage Schema */}
      {faqItems && faqItems.length > 0 && (
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "mainEntity": faqItems.map(item => ({
              "@type": "Question",
              "name": item.question,
              "acceptedAnswer": {
                "@type": "Answer",
                "text": item.answer,
              },
            })),
          })}
        </script>
      )}
    </Helmet>
  );
};

export default SEO;
