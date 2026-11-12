// Browser cache for the solver tables (IndexedDB). Every failure or delay just means "no cache".
import { TABLES_VERSION } from './tables.js';

const DB_NAME = 'nxn-cube-solver';
const STORE = 'tables';
export const CACHE_KEY = `cube3-tables-v${TABLES_VERSION}`;
const TIMEOUT_MS = 3000; // some browsers can hang on indexedDB.open

function withTimeout(promise) {
  return Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error('IndexedDB timeout')), TIMEOUT_MS))]);
}

function openDb() {
  return withTimeout(
    new Promise((resolve, reject) => {
      if (typeof indexedDB === 'undefined') {
        reject(new Error('IndexedDB not available'));
        return;
      }
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => request.result.createObjectStore(STORE);
      request.onsuccess = () => {
        const db = request.result;
        db.onversionchange = () => db.close(); // never block a newer tab
        resolve(db);
      };
      request.onerror = () => reject(request.error);
      request.onblocked = () => reject(new Error('IndexedDB blocked'));
    }),
  );
}

/** Runs one request in a transaction and closes the connection afterwards. */
async function run(mode, action) {
  const db = await openDb();
  try {
    return await withTimeout(
      new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, mode);
        const result = action(tx.objectStore(STORE));
        tx.oncomplete = () => resolve(result.result);
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      }),
    );
  } finally {
    db.close();
  }
}

/** @returns {Promise<Uint8Array|null>} */
export async function loadTables() {
  try {
    const value = await run('readonly', (store) => store.get(CACHE_KEY));
    return value instanceof Uint8Array ? value : null;
  } catch {
    return null;
  }
}

/** Stores the tables under the current key and removes entries of older versions. */
export async function saveTables(bytes) {
  try {
    await run('readwrite', (store) => {
      store.clear();
      return store.put(bytes, CACHE_KEY);
    });
  } catch {
    // quota, private mode, …: the tables are simply rebuilt next time
  }
}

export async function clearTables() {
  try {
    await run('readwrite', (store) => store.clear());
  } catch {
    // nothing to do
  }
}
