import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import i18n from './i18n';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function escapeHtml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function formatCurrency(value: number, locale: string = 'pt-BR') {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'BRL',
    currencyDisplay: 'narrowSymbol',
  }).format(value);
}

export function currencyLocale(lang: string): string {
  if (lang.startsWith('en')) return 'en-US';
  if (lang.startsWith('es')) return 'es-ES';
  return 'pt-BR';
}

const FIREBASE_KEY_BY_CODE: Record<string, string> = {
  'auth/email-already-in-use': 'emailInUse',
  'auth/invalid-email': 'invalidEmail',
  'auth/user-disabled': 'userDisabled',
  'auth/user-not-found': 'userNotFound',
  'auth/wrong-password': 'wrongPassword',
  'auth/weak-password': 'weakPassword',
  'auth/too-many-requests': 'tooMany',
  'auth/network-request-failed': 'network',
  'auth/invalid-credential': 'invalidCredential',
  'auth/expired-action-code': 'expiredCode',
  'auth/invalid-action-code': 'invalidCode',
  'auth/missing-email': 'missingEmail',
  'auth/internal-error': 'internal',
};

const FIREBASE_PT_FALLBACK: Record<string, string> = {
  emailInUse: 'Este e-mail já está cadastrado. Faça login ou use outro e-mail.',
  invalidEmail: 'E-mail inválido. Verifique e tente novamente.',
  userDisabled: 'Esta conta foi desativada. Entre em contato com o suporte.',
  userNotFound: 'Usuário não encontrado. Verifique o e-mail ou cadastre-se.',
  wrongPassword: 'Senha incorreta. Verifique e tente novamente.',
  weakPassword: 'Senha muito fraca. Use pelo menos 6 caracteres com letras e números.',
  tooMany: 'Muitas tentativas. Aguarde alguns minutos e tente novamente.',
  network: 'Sem conexão com a internet. Verifique sua rede e tente novamente.',
  invalidCredential: 'E-mail ou senha incorretos.',
  expiredCode: 'Este link expirou. Solicite um novo.',
  invalidCode: 'Link inválido. Verifique ou solicite um novo.',
  missingEmail: 'Digite seu e-mail para continuar.',
  internal: 'Erro interno do servidor. Tente novamente em alguns instantes.',
};

export function translateFirebaseError(code: string): string {
  const key = FIREBASE_KEY_BY_CODE[code];
  if (!key) return i18n.t('err.default', { defaultValue: 'Ocorreu um erro inesperado. Tente novamente.' });
  return i18n.t(`err.${key}`, { defaultValue: FIREBASE_PT_FALLBACK[key] });
}

export function getFirebaseErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    const match = error.message.match(/\(([^)]+)\)/);
    if (match && match[1]) return translateFirebaseError(match[1]);
    if (error.message === 'EMAIL_NOT_VERIFIED' || error.message === 'Falha ao criar perfil. Tente novamente.') return error.message;
    return error.message;
  }
  return i18n.t('err.default', { defaultValue: 'Ocorreu um erro inesperado. Tente novamente.' });
}

const CSV_INJECTION_RE = /^[=+\-@]/;

export function sanitizeCSVCell(value: string): string {
  const escaped = value.replace(/"/g, '""');
  const needsQuotes = escaped.includes(';') || escaped.includes(',') || escaped.includes('"') || escaped.includes('\n') || escaped.includes('\r');
  const final = CSV_INJECTION_RE.test(escaped) ? `'${escaped}` : escaped;
  return needsQuotes ? `"${final}"` : final;
}
