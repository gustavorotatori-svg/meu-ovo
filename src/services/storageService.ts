import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getAuth } from 'firebase/auth';
import { app } from '../lib/firebase-core';

const storage = getStorage(app);
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

function ownerSegment(): string {
  const uid = getAuth(app).currentUser?.uid;
  if (!uid) throw new Error('Sessão expirada. Faça login novamente.');
  return uid;
}

function validateFile(file: File): void {
  if (file.size > MAX_FILE_SIZE) {
    throw new Error('Arquivo muito grande. O tamanho máximo é 5MB.');
  }
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    throw new Error('Formato de arquivo não permitido. Use JPEG, PNG, WebP ou GIF.');
  }
}

export async function uploadProductImage(
  restaurantId: string,
  productId: string,
  file: File
): Promise<string> {
  validateFile(file);
  const storageRef = ref(storage, `restaurants/${restaurantId}/${ownerSegment()}/products/${productId}`);
  const snapshot = await uploadBytes(storageRef, file);
  return getDownloadURL(snapshot.ref);
}

export async function uploadCategoryImage(
  restaurantId: string,
  categoryId: string,
  file: File
): Promise<string> {
  validateFile(file);
  const storageRef = ref(storage, `restaurants/${restaurantId}/${ownerSegment()}/categories/${categoryId}`);
  const snapshot = await uploadBytes(storageRef, file);
  return getDownloadURL(snapshot.ref);
}
