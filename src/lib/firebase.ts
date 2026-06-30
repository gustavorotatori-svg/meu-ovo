import { app } from './firebase-core';
import { initializeFirestore } from 'firebase/firestore';
import { toast } from 'react-hot-toast';

const firestoreDatabaseId = "ai-studio-83caa59a-5170-443b-82b8-5354c3a71e8b";

export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
}, firestoreDatabaseId);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const msg = error instanceof Error ? error.message : String(error);
  console.error(`Firestore Error [${operationType}]${path ? ' on ' + path : ''}: ${msg}`);
  toast.error('Erro ao acessar dados. Tente novamente.');
}


