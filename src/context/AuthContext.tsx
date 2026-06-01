import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { auth, db } from '../lib/firebase';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut as firebaseSignOut, updateProfile } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

type UserRole = 'customer' | 'restaurant' | 'admin';

interface User {
  id: string;
  email: string;
  full_name?: string;
  role: UserRole;
  profile_image_url?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string, role: UserRole) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Try to get additional profile info from Firestore
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            setUser({
              id: firebaseUser.uid,
              email: firebaseUser.email || '',
              ...userDoc.data() as any
            });
          } else {
            // Fallback for users without a profile doc yet
            setUser({
              id: firebaseUser.uid,
              email: firebaseUser.email || '',
              role: 'customer'
            });
          }
        } catch (e) {
          console.error("Error fetching user profile:", e);
          setUser({
            id: firebaseUser.uid,
            email: firebaseUser.email || '',
            role: 'customer'
          });
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return unsub;
  }, []);

  async function signUp(email: string, password: string, fullName: string, role: UserRole) {
    const res = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(res.user, { displayName: fullName });
    
    const userData = {
      full_name: fullName,
      role: role,
      createdAt: new Date().toISOString()
    };
    
    await setDoc(doc(db, 'users', res.user.uid), userData);
    
    setUser({
      id: res.user.uid,
      email,
      ...userData
    });
  }

  async function signIn(email: string, password: string) {
    await signInWithEmailAndPassword(auth, email, password);
  }

  async function signOut() {
    await firebaseSignOut(auth);
  }

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      signUp,
      signIn,
      signOut,
      isAuthenticated: !!user,
    }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
