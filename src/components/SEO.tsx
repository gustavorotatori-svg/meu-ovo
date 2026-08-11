import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';

interface FAQItem {
  question: string;
  answer: string;
}

interface RestaurantSchemaData {
  name: string;
  image?: string;
  url?: string;
  description?: string;
  cuisine?: string;
  priceRange?: string;
  telephone?: string;
  address?: {
    streetAddress?: string;
    addressLocality?: string;
    addressRegion?: string;
    postalCode?: string;
    addressCountry?: string;
  };
  geo?: { latitude: number; longitude: number };
  openingHours?: string[];
  rating?: number;
  reviewCount?: number;
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
  restaurant?: RestaurantSchemaData;
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
  restaurant,
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
      {(restaurantName || restaurant) && (
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Restaurant",
            "name": restaurant?.name || restaurantName,
            "description": restaurant?.description || metaDescription,
            "image": restaurant?.image || metaImage,
            "url": restaurant?.url || metaUrl,
            ...(restaurant?.cuisine ? { "servesCuisine": restaurant.cuisine } : {}),
            ...(restaurant?.priceRange ? { "priceRange": restaurant.priceRange } : {}),
            ...(restaurant?.telephone ? { "telephone": restaurant.telephone } : {}),
            ...(restaurant?.address ? { "address": { "@type": "PostalAddress", "streetAddress": restaurant.address.streetAddress, "addressLocality": restaurant.address.addressLocality, "addressRegion": restaurant.address.addressRegion, "postalCode": restaurant.address.postalCode, "addressCountry": restaurant.address.addressCountry } } : {}),
            ...(restaurant?.geo ? { "geo": { "@type": "GeoCoordinates", "latitude": restaurant.geo.latitude, "longitude": restaurant.geo.longitude } } : {}),
            ...(restaurant?.openingHours?.length ? { "openingHoursSpecification": restaurant.openingHours.map(h => ({ "@type": "OpeningHoursSpecification", "dayOfWeek": h })) } : {}),
            ...(restaurant?.rating && restaurant.reviewCount ? { "aggregateRating": { "@type": "AggregateRating", "ratingValue": restaurant.rating, "reviewCount": restaurant.reviewCount } } : {}),
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
