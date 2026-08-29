import { getConsentState, hasConsentChoice, isConsentGranted, subscribeConsent } from './consent';

const GA_ID = import.meta.env.VITE_GA_ID as string | undefined;
const FB_PIXEL_ID = import.meta.env.VITE_FB_PIXEL_ID as string | undefined;

declare global {
  interface Window {
    dataLayer?: unknown[];
    fbq?: (...args: unknown[]) => void;
  }
}

function loadAnalyticsScript(src: string): void {
  const existing = document.querySelector(`script[data-consent-analytics="${src}"]`);
  if (existing) return;
  const s = document.createElement('script');
  s.async = true;
  s.src = src;
  s.dataset.consentAnalytics = src;
  document.head.appendChild(s);
}

function loadGoogleAnalytics(): void {
  if (!GA_ID) return;
  loadAnalyticsScript(`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`);
  window.dataLayer = window.dataLayer || [];
  function gtag(...args: unknown[]) {
    (window.dataLayer || []).push(args);
  }
  gtag('js', new Date());
  gtag('config', GA_ID);
}

function loadMetaPixel(): void {
  if (!FB_PIXEL_ID) return;
  loadAnalyticsScript('https://connect.facebook.net/en_US/fbevents.js');
  window.fbq = window.fbq || function (...args: unknown[]) {
    const fn = window.fbq as unknown as { callMethod?: (...a: unknown[]) => void; queue?: unknown[] };
    if (fn.callMethod) fn.callMethod.apply(fn, args as never);
    else (fn.queue = fn.queue || []).push(args);
  };
  window.fbq('init', FB_PIXEL_ID);
  window.fbq('track', 'PageView');
}

export function initAnalytics(): void {
  if (!isConsentGranted()) return;
  loadGoogleAnalytics();
  loadMetaPixel();
}

export function setupAnalyticsConsentListener(): () => void {
  return subscribeConsent((state) => {
    if (state === 'granted') {
      loadGoogleAnalytics();
      loadMetaPixel();
    }
  });
}

export function hasMarketingConsent(): boolean {
  return hasConsentChoice() ? isConsentGranted() : false;
}

export function trackEvent(name: string, params: Record<string, unknown> = {}): void {
  if (!hasMarketingConsent()) return;
  if (window.dataLayer) {
    window.dataLayer.push({ event: name, ...params });
  }
  if (window.fbq) {
    try {
      window.fbq('track', name, params);
    } catch {
      // ignore tracking errors
    }
  }
}

export function trackRouteChange(path: string): void {
  if (!hasMarketingConsent()) return;
  if (window.dataLayer) {
    window.dataLayer.push({ event: 'page_view', page_path: path });
  }
  if (window.fbq) {
    try {
      window.fbq('track', 'PageView');
    } catch {
      // ignore tracking errors
    }
  }
}

export { getConsentState };
