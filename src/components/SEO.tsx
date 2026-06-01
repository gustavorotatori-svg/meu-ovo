import React from 'react';
import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  url?: string;
  type?: string;
  restaurantName?: string;
}

const SEO: React.FC<SEOProps> = ({
  title,
  description,
  keywords,
  image,
  url,
  type = 'website',
  restaurantName,
}) => {
  const siteName = 'MEU OVO';
  const fullTitle = title ? `${title} | ${siteName}` : siteName;
  const defaultDescription = 'Plataforma inovadora para pedidos em restaurantes, delivery e gestão de mesas.';
  const metaDescription = description || defaultDescription;
  const metaKeywords = keywords || 'restaurante, pedidos, delivery, cardápio digital, gestão de mesas';
  const siteUrl = window.location.origin;
  const metaUrl = url ? `${siteUrl}${url}` : window.location.href;
  const metaImage = image || `${siteUrl}/og-image.jpg`;

  return (
    <Helmet>
      {/* Standard metadata tags */}
      <title>{fullTitle}</title>
      <meta name="description" content={metaDescription} />
      <meta name="keywords" content={metaKeywords} />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={metaUrl} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={metaDescription} />
      <meta property="og:image" content={metaImage} />
      <meta property="og:site_name" content={siteName} />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={metaUrl} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={metaDescription} />
      <meta name="twitter:image" content={metaImage} />

      {/* Schema.org for Google */}
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
    </Helmet>
  );
};

export default SEO;
