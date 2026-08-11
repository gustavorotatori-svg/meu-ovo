const CONSENT_KEY = '@meuovo:cookie-consent';

export type ConsentState = 'granted' | 'denied' | null;

export function getConsentState(): ConsentState {
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.accepted === true ? 'granted' : 'denied';
  } catch {
    return null;
  }
}

export function isConsentGranted(): boolean {
  return getConsentState() === 'granted';
}

export function hasConsentChoice(): boolean {
  return getConsentState() !== null;
}

export function setConsent(accepted: boolean): void {
  localStorage.setItem(CONSENT_KEY, JSON.stringify({ accepted, at: new Date().toISOString() }));
  window.dispatchEvent(new CustomEvent('meuovo:consent-change', { detail: { accepted } }));
}

export function openConsentSettings(): void {
  window.dispatchEvent(new CustomEvent('meuovo:open-consent'));
}

export function subscribeConsent(cb: (state: ConsentState) => void): () => void {
  const handler = () => cb(getConsentState());
  window.addEventListener('meuovo:consent-change', handler);
  return () => window.removeEventListener('meuovo:consent-change', handler);
}
