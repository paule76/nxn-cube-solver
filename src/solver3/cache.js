// Browser cache for the solver tables (IndexedDB). Every failure just means "no cache".
import { TABLES_VERSION } from './tables.js';

const DB_NAME = 'cube-solver';
const STORE = 'tables';
export const CACHE_KEY = `cube3-tables-v${TABLES_VERSION}`;

function openDb() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB not available'));
      return;
    }
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/** @returns {Promise<Uint8Array|null>} */
export async function loadTables() {
  try {
    const db = await openDb();
    return await new Promise((resolve) => {
      const get = db.transaction(STORE, 'readonly').objectStore(STORE).get(CACHE_KEY);
      get.onsuccess = () => resolve(get.result instanceof Uint8Array ? get.result : null);
      get.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

/** @param {Uint8Array} bytes */
export async function saveTables(bytes) {
  try {
    const db = await openDb();
    await new Promise((resolve) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(bytes, CACHE_KEY);
      tx.oncomplete = resolve;
      tx.onerror = resolve;
      tx.onabort = resolve;
    });
  } catch {
    // quota, private mode, …: the tables are simply rebuilt next time
  }
}
