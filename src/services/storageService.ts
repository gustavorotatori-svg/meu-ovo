import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { app } from '../lib/firebase-core';

const storage = getStorage(app);

export async function uploadProductImage(
  restaurantId: string,
  productId: string,
  file: File
): Promise<string> {
  const storageRef = ref(storage, `restaurants/${restaurantId}/products/${productId}`);
  const snapshot = await uploadBytes(storageRef, file);
  return getDownloadURL(snapshot.ref);
}

export async function uploadCategoryImage(
  restaurantId: string,
  categoryId: string,
  file: File
): Promise<string> {
  const storageRef = ref(storage, `restaurants/${restaurantId}/categories/${categoryId}`);
  const snapshot = await uploadBytes(storageRef, file);
  return getDownloadURL(snapshot.ref);
}
