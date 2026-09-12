import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, get } from 'firebase/database';
import firebaseConfig from './firebase-applet-config.json' assert { type: 'json' };

const app = initializeApp({ ...firebaseConfig, databaseURL: `https://${firebaseConfig.projectId}-default-rtdb.firebaseio.com` });
const db = getDatabase(app);

async function test() {
  try {
    const testRef = ref(db, 'test');
    await set(testRef, { time: Date.now() });
    const snap = await get(testRef);
    console.log('RTDB Value:', snap.val());
  } catch (e) {
    console.error('RTDB Error:', e);
  }
}
test();
