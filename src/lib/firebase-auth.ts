import { app } from './firebase-core';
import { getAuth } from 'firebase/auth';

export const auth = getAuth(app);
