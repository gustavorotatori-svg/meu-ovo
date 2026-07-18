import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function translateFirebaseError(code: string): string {
  const map: Record<string, string> = {
    'auth/email-already-in-use': 'Este e-mail já está cadastrado. Faça login ou use outro e-mail.',
    'auth/invalid-email': 'E-mail inválido. Verifique e tente novamente.',
    'auth/user-disabled': 'Esta conta foi desativada. Entre em contato com o suporte.',
    'auth/user-not-found': 'Usuário não encontrado. Verifique o e-mail ou cadastre-se.',
    'auth/wrong-password': 'Senha incorreta. Verifique e tente novamente.',
    'auth/weak-password': 'Senha muito fraca. Use pelo menos 6 caracteres com letras e números.',
    'auth/too-many-requests': 'Muitas tentativas. Aguarde alguns minutos e tente novamente.',
    'auth/network-request-failed': 'Sem conexão com a internet. Verifique sua rede e tente novamente.',
    'auth/invalid-credential': 'E-mail ou senha incorretos.',
    'auth/expired-action-code': 'Este link expirou. Solicite um novo.',
    'auth/invalid-action-code': 'Link inválido. Verifique ou solicite um novo.',
    'auth/missing-email': 'Digite seu e-mail para continuar.',
    'auth/internal-error': 'Erro interno do servidor. Tente novamente em alguns instantes.',
  };
  return map[code] || 'Ocorreu um erro inesperado. Tente novamente.';
}

export function getFirebaseErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    const match = error.message.match(/\(([^)]+)\)/);
    if (match && match[1]) return translateFirebaseError(match[1]);
    return error.message;
  }
  return 'Ocorreu um erro inesperado. Tente novamente.';
}

const CSV_INJECTION_RE = /^[=+\-@]/;

export function sanitizeCSVCell(value: string): string {
  const escaped = value.replace(/"/g, '""');
  const needsQuotes = escaped.includes(';') || escaped.includes(',') || escaped.includes('"') || escaped.includes('\n') || escaped.includes('\r');
  const final = CSV_INJECTION_RE.test(escaped) ? `'${escaped}` : escaped;
  return needsQuotes ? `"${final}"` : final;
}
