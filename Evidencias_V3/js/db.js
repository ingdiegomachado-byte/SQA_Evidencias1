/**
 * Evidencias SQA — db.js
 * Capa de persistencia en IndexedDB.
 */

export function openDB(callback) {
    const req = indexedDB.open('SQAEvidence', 2);
    req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('captures')) {
            db.createObjectStore('captures', { keyPath: 'id', autoIncrement: true });
        }
    };
    req.onsuccess = (e) => callback(e.target.result);
    req.onerror = (e) => console.error("IndexedDB error:", e.target.error);
}

export function getAllFromIndexedDB() {
    return new Promise((resolve) => {
        openDB(db => {
            const tx = db.transaction(['captures'], 'readonly');
            const store = tx.objectStore('captures');
            const all = store.getAll();
            all.onsuccess = () => resolve(all.result);
        });
    });
}

export function deleteFromIndexedDB(id) {
    return new Promise((resolve) => {
        openDB(db => {
            const tx = db.transaction(['captures'], 'readwrite');
            tx.objectStore('captures').delete(id);
            tx.oncomplete = () => resolve();
        });
    });
}

export function clearAllFromIndexedDB() {
    return new Promise((resolve) => {
        openDB(db => {
            const tx = db.transaction(['captures'], 'readwrite');
            tx.objectStore('captures').clear();
            tx.oncomplete = () => resolve();
        });
    });
}

export function saveCaptureToDB(record, existingId = null) {
    return new Promise((resolve) => {
        openDB(db => {
            const tx = db.transaction(['captures'], 'readwrite');
            const store = tx.objectStore('captures');
            let request;
            
            if (existingId !== null) {
                record.id = existingId;
                request = store.put(record);
            } else {
                request = store.add(record);
            }

            request.onsuccess = (e) => {
                const id = e.target.result;
                resolve(id);
            };
            tx.onerror = (e) => {
                console.error("Error saving to DB:", e.target.error);
                resolve(null);
            };
        });
    });
}
