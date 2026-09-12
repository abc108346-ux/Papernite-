import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { UserProfile } from '../types/game';

let app: any = null;
let auth: any = null;
let db: any = null;
let isFirebaseConfigured = false;

try {
  if (firebaseConfig.apiKey && firebaseConfig.apiKey.length > 5) {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    auth = getAuth(app);
    db = getFirestore(app, firebaseConfig.firestoreDatabaseId || '(default)');
    isFirebaseConfigured = true;
  }
} catch (e) {
  console.warn('Firebase init warning:', e);
  isFirebaseConfigured = false;
}

export { app as firebaseApp, auth, db, isFirebaseConfigured };

const LOCAL_STORAGE_PROFILE_KEY = 'papernite_user_profile';

export class AuthService {
  public static isConfigured(): boolean {
    return isFirebaseConfigured;
  }

  public static getAuth() {
    return auth;
  }

  public static getDb() {
    return db;
  }

  public static getCurrentUser(): User | null {
    return auth ? auth.currentUser : null;
  }

  public static getInitialProfile(): UserProfile {
    const cached = this.getCachedProfile();
    if (cached) return cached;
    return {
      uid: '',
      displayName: 'Soldado de Papel',
      skinId: 'explorer',
      weaponId: 'rifle',
      stats: {
        kills: 0,
        deaths: 0,
        wins: 0,
        matchesPlayed: 0
      },
      friends: []
    };
  }

  public static getCachedProfile(): UserProfile | null {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_PROFILE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.uid && parsed.displayName) {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
    return null;
  }

  public static async fetchProfile(uid: string): Promise<UserProfile | null> {
    if (!db) return this.getCachedProfile();
    try {
      const snap = await getDoc(doc(db, 'users', uid));
      if (snap.exists()) {
        const profile = snap.data() as UserProfile;
        this.saveProfileLocal(profile);
        return profile;
      }
    } catch (err) {
      console.warn('Error fetching user profile from Firestore:', err);
    }
    return this.getCachedProfile();
  }

  public static saveProfileLocal(profile: UserProfile) {
    try {
      localStorage.setItem(LOCAL_STORAGE_PROFILE_KEY, JSON.stringify(profile));
    } catch {
      // ignore
    }
  }

  public static async saveProfile(profile: UserProfile): Promise<void> {
    this.saveProfileLocal(profile);
    if (db && profile.uid) {
      try {
        await setDoc(doc(db, 'users', profile.uid), profile, { merge: true });
      } catch (err) {
        console.warn('Could not sync user profile to firestore:', err);
      }
    }
  }

  public static async isNicknameTaken(nickname: string, currentUid?: string): Promise<boolean> {
    if (!db) return false;
    try {
      const q = query(collection(db, 'users'), where('displayName', '==', nickname));
      const snap = await getDocs(q);
      if (snap.empty) return false;
      if (currentUid && snap.docs.length === 1 && snap.docs[0].id === currentUid) {
        return false;
      }
      return true;
    } catch (e) {
      console.warn('Nickname uniqueness check warning:', e);
      return false;
    }
  }

  public static async loginWithGoogle(): Promise<User> {
    if (!isFirebaseConfigured || !auth) {
      throw new Error('Firebase não configurado');
    }

    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    const result = await signInWithPopup(auth, provider);
    return result.user;
  }

  public static async logout(): Promise<void> {
    try {
      if (auth) {
        await signOut(auth);
      }
    } catch (e) {
      console.warn('Logout error:', e);
    }
    try {
      localStorage.removeItem(LOCAL_STORAGE_PROFILE_KEY);
    } catch {
      // ignore
    }
  }

  public static subscribeAuth(callback: (user: User | null) => void) {
    if (isFirebaseConfigured && auth) {
      return onAuthStateChanged(auth, callback);
    }
    return () => {};
  }
}
