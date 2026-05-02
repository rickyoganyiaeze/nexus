import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { auth, db, onAuthStateChanged, doc, getDoc, setDoc, serverTimestamp, updateDoc } from '@/lib/firebase';
import type { User } from '@/types';

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType>({ currentUser: null, loading: true, isAdmin: false });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        let userData: User = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
        };

        if (userDoc.exists()) {
          const data = userDoc.data();
          userData = {
            ...userData,
            username: data.username,
            bio: data.bio,
            status: data.status || 'online',
            lastSeen: data.lastSeen?.toDate(),
            phoneNumber: data.phoneNumber,
            isAdmin: data.isAdmin || false,
            blockedUsers: data.blockedUsers || [],
            contacts: data.contacts || [],
            createdAt: data.createdAt?.toDate(),
          };
          setIsAdmin(data.isAdmin || false);
          await updateDoc(doc(db, 'users', firebaseUser.uid), {
            status: 'online',
            lastSeen: serverTimestamp(),
          });
        } else {
          await setDoc(doc(db, 'users', firebaseUser.uid), {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL,
            username: firebaseUser.email?.split('@')[0] || 'user',
            bio: '',
            status: 'online',
            lastSeen: serverTimestamp(),
            blockedUsers: [],
            contacts: [],
            createdAt: serverTimestamp(),
            isAdmin: firebaseUser.email === 'ojd12dx@gmail.com',
          });
          if (firebaseUser.email === 'ojd12dx@gmail.com') {
            setIsAdmin(true);
            userData.isAdmin = true;
          }
        }
        setCurrentUser(userData);
      } else {
        setCurrentUser(null);
        setIsAdmin(false);
      }
      setLoading(false);
    });

    return () => unsub();
  }, []);

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (auth.currentUser) {
        updateDoc(doc(db, 'users', auth.currentUser.uid), {
          status: 'offline',
          lastSeen: serverTimestamp(),
        });
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  return (
    <AuthContext.Provider value={{ currentUser, loading, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
