let _db;
function open() {
  if (!_db) _db = new Promise((res, rej) => {
    const r = indexedDB.open('torokaro-db', 1);
    r.onupgradeneeded = () => {
      r.result.createObjectStore('pdfs', { keyPath: 'id' });
      r.result.createObjectStore('kv', { keyPath: 'k' });
    };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
  return _db;
}
async function tx(store, mode, fn) {
  const d = await open();
  return new Promise((res, rej) => {
    const t = d.transaction(store, mode);
    const rq = fn(t.objectStore(store));
    t.oncomplete = () => res(rq && rq.result);
    t.onerror = () => rej(t.error);
  });
}
export const pdfPut = o => tx('pdfs', 'readwrite', s => s.put(o));
export const pdfGet = id => tx('pdfs', 'readonly', s => s.get(id));
export const pdfDel = id => tx('pdfs', 'readwrite', s => s.delete(id));
export const pdfAll = () => tx('pdfs', 'readonly', s => s.getAll());
export const kvGet = async (k, def) => {
  const r = await tx('kv', 'readonly', s => s.get(k));
  return r ? r.v : def;
};
export const kvSet = (k, v) => tx('kv', 'readwrite', s => s.put({ k, v }));
