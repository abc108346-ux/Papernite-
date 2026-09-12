import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { UserProfile } from '../types/game';

let app: any = null;
let auth: any = null;
let db: any = null;
let isFirebaseConfigured = false;

try {
  // Check if real apiKey is provided
  if (firebaseConfig.apiKey && firebaseConfig.apiKey.length > 5) {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    auth = getAuth(app);
    db = getFirestore(app, firebaseConfig.firestoreDatabaseId || '(default)');
    isFirebaseConfigured = true;
  }
} catch (e) {
  console.warn('Firebase init deferred (placeholder config):', e);
  isFirebaseConfigured = false;
}

export { app as firebaseApp, auth };

const LOCAL_STORAGE_PROFILE_KEY = 'papernite_user_profile';

const DEFAULT_PROFILE: UserProfile = {
  uid: `guest_${Math.random().toString(36).substring(2, 8)}`,
  displayName: 'Dobrei_Ganhei',
  photoURL: '',
  skinId: 'explorer',
  weaponId: 'rifle',
  stats: {
    kills: 14,
    deaths: 6,
    wins: 3,
    matchesPlayed: 4
  },
  friends: ['Origami_Master', 'Papel_Dobrado', 'Craft_Pro']
};

export class AuthService {
  public static isConfigured(): boolean {
    return isFirebaseConfigured;
  }
  
  public static getCurrentUser(): User | null {
    return auth ? auth.currentUser : null;
  }

  public static getInitialProfile(): UserProfile {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_PROFILE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // ignore
    }
    return DEFAULT_PROFILE;
  }

  public static saveProfile(profile: UserProfile) {
    try {
      localStorage.setItem(LOCAL_STORAGE_PROFILE_KEY, JSON.stringify(profile));
      if (isFirebaseConfigured && db && profile.uid && !profile.uid.startsWith('guest_')) {
        setDoc(doc(db, 'users', profile.uid), profile, { merge: true }).catch(err => {
          console.warn('Could not sync to firestore:', err);
        });
      }
    } catch (e) {
      console.warn('Failed saving profile:', e);
    }
  }

  public static async loginWithGoogle(): Promise<UserProfile | null> {
    if (!isFirebaseConfigured || !auth) {
      throw new Error('CONFIG_REQUIRED');
    }

    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    const user: User = result.user;

    const current = this.getInitialProfile();
    const updated: UserProfile = {
      ...current,
      uid: user.uid,
      displayName: user.displayName || user.email?.split('@')[0] || 'Guerreiro de Papel',
      photoURL: user.photoURL || undefined
    };

    // Check if firestore has existing profile
    if (db) {
      try {
        const snap = await getDoc(doc(db, 'users', user.uid));
        if (snap.exists()) {
          const remote = snap.data() as UserProfile;
          this.saveProfile(remote);
          return remote;
        }
      } catch (err) {
        console.warn('Firestore fetch error:', err);
      }
    }

    this.saveProfile(updated);
    return updated;
  }

  public static async logout(): Promise<void> {
    if (isFirebaseConfigured && auth) {
      await signOut(auth);
    }
    const guest: UserProfile = {
      ...DEFAULT_PROFILE,
      uid: `guest_${Math.random().toString(36).substring(2, 8)}`
    };
    this.saveProfile(guest);
  }

  public static subscribeAuth(callback: (user: User | null) => void) {
    if (isFirebaseConfigured && auth) {
      return onAuthStateChanged(auth, callback);
    }
    return () => {};
  }
}
