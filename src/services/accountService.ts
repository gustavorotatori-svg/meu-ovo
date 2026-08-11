import { authedFetch } from '../lib/api';
import { auth } from '../lib/firebase-auth';
import { deleteUser } from 'firebase/auth';
import { db } from '../lib/firebase';
import { doc, deleteDoc } from 'firebase/firestore';

export async function exportUserData(): Promise<{ filename: string; blob: Blob }> {
  const resp = await authedFetch('/api/account/export', { method: 'GET' });
  if (!resp.ok) {
    const err = await resp.json().catch(() => null);
    throw new Error(err?.error || 'Falha ao exportar seus dados.');
  }
  const blob = await resp.blob();
  const filename = resp.headers.get('Content-Disposition')?.match(/filename="([^"]+)"/)?.[1] || 'meu-ovo-dados.json';
  return { filename, blob };
}

export async function deleteAccountData(): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('Usuário não autenticado.');

  const token = await user.getIdToken(true);
  const resp = await fetch('/api/account/data', {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => null);
    throw new Error(err?.error || 'Falha ao excluir sua conta. Tente novamente.');
  }

  try {
    const uid = user.uid;
    const extraRefs = ['streaks', 'achievements', 'platform_loyalty'].map((col) => doc(db, col, uid));
    await Promise.all(extraRefs.map((ref) => deleteDoc(ref).catch(() => {})));
  } catch {
    // Non-critical cleanup
  }

  try {
    await deleteUser(user);
  } catch {
    // Server already removed the auth account; ignore local failure
  }
}
