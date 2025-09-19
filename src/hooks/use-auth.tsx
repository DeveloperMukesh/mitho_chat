
"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { User as FirebaseAuthUser, onAuthStateChanged, signOut, updateProfile } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, setDoc, getDoc, serverTimestamp, updateDoc } from "firebase/firestore";
import { useRouter } from 'next/navigation';
import { User as AppUser } from '@/lib/data';
import { useTheme } from 'next-themes';

interface AuthContextType {
  user: FirebaseAuthUser | null;
  userProfile: AppUser | null;
  loading: boolean;
  logout: () => void;
  refreshUserProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const generateHandle = (displayName: string | null): string => {
  if (!displayName) return `user_${Date.now()}`;
  return displayName.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '') + `_${String(Date.now()).slice(-4)}`;
}

const getDisplayNameFromEmail = (email: string | null): string => {
  if (!email) return 'New User';
  return email.split('@')[0];
}


export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<FirebaseAuthUser | null>(null);
  const [userProfile, setUserProfile] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { setTheme } = useTheme();

  const fetchUserProfile = useCallback(async (firebaseUser: FirebaseAuthUser): Promise<AppUser | null> => {
    const userRef = doc(db, "users", firebaseUser.uid);
    const docSnap = await getDoc(userRef);
    if (docSnap.exists()) {
      const profileData = { id: docSnap.id, ...docSnap.data() } as AppUser;
      
      // Apply theme from user profile
      if (profileData.theme) {
        setTheme(profileData.theme.mode);
        if (profileData.theme.primaryColor) {
            document.body.style.setProperty('--primary', profileData.theme.primaryColor);
        }
      }
      return profileData;
    }
    return null;
  }, [setTheme]);

  const refreshUserProfile = useCallback(async () => {
      const currentUser = auth.currentUser;
      if (currentUser) {
          // Manually trigger a refresh of the user token to get latest profile info
          await currentUser.reload();
          const freshUser = auth.currentUser; // Get the reloaded user
          if (freshUser) {
             setUser(freshUser);
             const updatedProfile = await fetchUserProfile(freshUser);
             setUserProfile(updatedProfile);
          }
      }
  }, [fetchUserProfile]);


  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setLoading(true);
      if (user) {
        setUser(user);
        const userRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(userRef);

        if (!docSnap.exists()) {
          // New user, create a document in Firestore
          const displayName = user.displayName || getDisplayNameFromEmail(user.email);
          const photoURL = user.photoURL || `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(displayName)}`;
          
          const newUserProfile: AppUser = {
            id: user.uid,
            uid: user.uid,
            displayName: displayName,
            email: user.email || '',
            photoURL: photoURL,
            handle: generateHandle(displayName),
            createdAt: serverTimestamp(),
            theme: {
                mode: 'system',
                primaryColor: '356 79% 56%', // Default primary color
                ringtoneUrl: '/sounds/incoming-call.mp3', // Default ringtone
            }
          };

          await setDoc(userRef, newUserProfile);
          // Sync name and photoURL back to auth if it was generated
          if (user.displayName !== displayName || user.photoURL !== photoURL) {
              await updateProfile(user, {displayName, photoURL});
          }
          setUserProfile(newUserProfile);
          setTheme(newUserProfile.theme.mode);
          document.body.style.setProperty('--primary', newUserProfile.theme.primaryColor);
          
        } else {
            const profileData = await fetchUserProfile(user);
            setUserProfile(profileData);
        }
      } else {
        // User is signed out
        setUser(null);
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [fetchUserProfile, setTheme]);

  const logout = async () => {
    await signOut(auth);
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ user, userProfile, loading, logout, refreshUserProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

    