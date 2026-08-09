import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { auth } from '../lib/firebase-auth';
import { db } from '../lib/firebase';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut as firebaseSignOut, updateProfile, sendEmailVerification, sendPasswordResetEmail, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { getFCMToken } from '../lib/fcm';

type UserRole = 'customer' | 'restaurant' | 'admin';

interface User {
  id: string;
  email: string;
  full_name?: string;
  role: UserRole;
  profile_image_url?: string;
  photoURL?: string;
  displayName?: string;
  customerRating?: number;
  customerRatingCount?: number;
  pwaInstallPending?: boolean;
  onboardingComplete?: boolean;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string, role: UserRole) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  isAuthenticated: boolean;
  resendVerification: () => Promise<void>;
  emailVerified: boolean;
  refreshUserProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [emailVerified, setEmailVerified] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setEmailVerified(firebaseUser.emailVerified);
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            setUser({
              id: firebaseUser.uid,
              email: firebaseUser.email || '',
              full_name: data?.full_name,
              role: data?.role || 'customer',
              profile_image_url: data?.profile_image_url,
              photoURL: data?.photoURL,
              displayName: data?.displayName,
              customerRating: data?.customerRating,
              customerRatingCount: data?.customerRatingCount,
              pwaInstallPending: data?.pwaInstallPending,
              onboardingComplete: data?.onboardingComplete,
            });
          } else {
            // Firestore doc missing — recreate it to prevent orphaned auth user
            try {
              await setDoc(doc(db, 'users', firebaseUser.uid), {
                full_name: firebaseUser.displayName || '',
                role: 'customer',
                createdAt: new Date().toISOString(),
                pwaInstallPending: true,
                onboardingComplete: false,
                customerRating: 5,
                customerRatingCount: 0,
              }, { merge: true });
            } catch (createErr) {
              console.error("Error recreating missing user profile:", createErr);
            }
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

    const timeout = setTimeout(() => setLoading(false), 5000);

    // Periodically refresh email verification status (every 30s while logged in)
    const verificationInterval = setInterval(async () => {
      if (auth.currentUser) {
        try {
          await auth.currentUser.reload();
          setEmailVerified(auth.currentUser.emailVerified);
        } catch { /* noop */ }
      }
    }, 30000);

    return () => {
      unsub();
      clearTimeout(timeout);
      clearInterval(verificationInterval);
    };
  }, []);

  async function registerFCMAndActivity(uid: string) {
    try {
      const token = await getFCMToken();
      const updates: Record<string, unknown> = { lastActiveAt: new Date().toISOString() };
      if (token) updates.fcmToken = token;
      await updateDoc(doc(db, 'users', uid), updates);
    } catch {
      // Non-critical
    }
  }

  async function signUp(email: string, password: string, fullName: string, role: UserRole) {
    const res = await createUserWithEmailAndPassword(auth, email, password);

    // Only 'customer' can be self-assigned. 'restaurant' is set via registerRestaurant after onboarding.
    // 'admin' is NEVER assignable via signup.
    const safeRole: UserRole = 'customer';

    try {
      await updateProfile(res.user, { displayName: fullName });

      const userData: Record<string, unknown> = {
        full_name: fullName,
        role: safeRole,
        createdAt: new Date().toISOString(),
        pwaInstallPending: true,
        onboardingComplete: false,
      };
      if (safeRole === 'customer') {
        userData.customerRating = 5;
        userData.customerRatingCount = 0;
      }

      await setDoc(doc(db, 'users', res.user.uid), userData, { merge: true });
    } catch (firestoreError) {
      // If Firestore write fails, rollback the auth user to prevent orphaned accounts
      await res.user.delete().catch(() => {});
      console.error('[Auth] signUp failed, auth user rolled back:', firestoreError);
      throw new Error('Falha ao criar perfil. Tente novamente.');
    }

    try {
      await sendEmailVerification(res.user);
    } catch (_e) {
      console.error('[Auth] Failed to send verification email:', _e);
    }

    setUser({
      id: res.user.uid,
      email,
      full_name: fullName,
      role: safeRole,
      createdAt: new Date().toISOString(),
      pwaInstallPending: true,
      onboardingComplete: false,
      customerRating: 5,
      customerRatingCount: 0,
    });

    registerFCMAndActivity(res.user.uid);
  }

  async function signIn(email: string, password: string) {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    if (!cred.user.emailVerified) {
      throw new Error('EMAIL_NOT_VERIFIED');
    }
    registerFCMAndActivity(cred.user.uid);
    await refreshUserProfile();
  }

  async function signInWithGoogleFn() {
    const provider = new GoogleAuthProvider();
    const res = await signInWithPopup(auth, provider);
    const userDoc = await getDoc(doc(db, 'users', res.user.uid));
    if (!userDoc.exists()) {
      await setDoc(doc(db, 'users', res.user.uid), {
        full_name: res.user.displayName || 'Usuário',
        role: 'customer',
        createdAt: new Date().toISOString(),
        pwaInstallPending: true,
        onboardingComplete: false,
        customerRating: 5,
        customerRatingCount: 0,
      }, { merge: true });
    }
    registerFCMAndActivity(res.user.uid);
  }

  async function signOut() {
    await firebaseSignOut(auth);
  }

  async function resendVerification() {
    if (auth.currentUser) {
      await sendEmailVerification(auth.currentUser);
    }
  }

  async function resetPassword(email: string) {
    await sendPasswordResetEmail(auth, email);
  }

  async function refreshUserProfile() {
    if (!auth.currentUser) return;
    try {
      const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        setUser({
          id: auth.currentUser.uid,
          email: auth.currentUser.email || '',
          full_name: data?.full_name,
          role: data?.role || 'customer',
          profile_image_url: data?.profile_image_url,
          photoURL: data?.photoURL,
          displayName: data?.displayName,
          customerRating: data?.customerRating,
          customerRatingCount: data?.customerRatingCount,
          pwaInstallPending: data?.pwaInstallPending,
          onboardingComplete: data?.onboardingComplete,
        });
      }
    } catch (e) {
      console.error("Error refreshing user profile:", e);
    }
  }

  if (loading) {
    return (
      <AuthContext.Provider value={{
        user: null,
        loading: true,
        signUp, signIn, signInWithGoogle: signInWithGoogleFn, signOut, resetPassword,
        isAuthenticated: false,
        resendVerification: async () => {},
        emailVerified: false,
        refreshUserProfile,
      }}>
        <div className="min-h-screen bg-white flex items-center justify-center" role="status" aria-live="polite">
          <div className="text-center">
            <div className="w-10 h-10 border-4 border-[#FFC928] border-t-transparent rounded-full animate-spin mx-auto mb-4" aria-hidden="true" />
            <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Carregando...</p>
          </div>
        </div>
      </AuthContext.Provider>
    );
  }

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      signUp,
      signIn,
      signInWithGoogle: signInWithGoogleFn,
      signOut,
      resetPassword,
      isAuthenticated: !!user,
      resendVerification,
      emailVerified,
      refreshUserProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
