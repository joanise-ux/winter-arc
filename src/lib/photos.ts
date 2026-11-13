import { useEffect, useState } from 'react';

/** Zdjęcia postępów: jedno na tydzień, trzymane w IndexedDB na urządzeniu (za duże na localStorage). */

export interface Photo {
  /** poniedziałek tygodnia, YYYY-MM-DD */
  week: string;
  /** dzień zrobienia */
  date: string;
  blob: Blob;
}

const DB = 'winter-arc';
const STORE = 'photos';
const MAX_SIDE = 1280;

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'week' });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function run<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const req = fn(tx.objectStore(STORE));
      tx.oncomplete = () => resolve(req.result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

const listeners = new Set<() => void>();
const changed = () => listeners.forEach((l) => l());

export const listPhotos = () => run<Photo[]>('readonly', (s) => s.getAll());

export async function putPhoto(photo: Photo) {
  await run('readwrite', (s) => s.put(photo));
  // prośba, żeby przeglądarka nie czyściła zdjęć przy braku miejsca
  navigator.storage?.persist?.().catch(() => {});
  changed();
}

export async function deletePhoto(week: string) {
  await run('readwrite', (s) => s.delete(week));
  changed();
}

export async function clearPhotos() {
  await run('readwrite', (s) => s.clear());
  changed();
}

/** Zmniejsza zdjęcie z aparatu do rozsądnego rozmiaru (JPEG, dłuższy bok do 1280 px). */
export async function compress(file: Blob): Promise<Blob> {
  const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const k = Math.min(1, MAX_SIDE / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bmp.width * k);
  canvas.height = Math.round(bmp.height * k);
  canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  bmp.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Nie udało się zapisać zdjęcia'))), 'image/jpeg', 0.82),
  );
}

export interface PhotoBackup {
  week: string;
  date: string;
  data: string;
}

const toDataUrl = (b: Blob) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(b);
  });

export async function exportPhotos(): Promise<PhotoBackup[]> {
  const photos = await listPhotos();
  return Promise.all(photos.map(async (p) => ({ week: p.week, date: p.date, data: await toDataUrl(p.blob) })));
}

export async function importPhotos(items: unknown) {
  await run('readwrite', (s) => s.clear());
  if (Array.isArray(items)) {
    for (const it of items as PhotoBackup[]) {
      if (typeof it?.week !== 'string' || typeof it?.data !== 'string' || !it.data.startsWith('data:image/')) continue;
      const blob = await (await fetch(it.data)).blob();
      await run('readwrite', (s) => s.put({ week: it.week, date: it.date ?? it.week, blob }));
    }
  }
  changed();
}

export interface PhotoView {
  week: string;
  date: string;
  url: string;
}

/** Lista zdjęć (od najstarszego) z adresami gotowymi do <img>. */
export function usePhotos(): PhotoView[] {
  const [list, setList] = useState<PhotoView[]>([]);
  useEffect(() => {
    let alive = true;
    let urls: string[] = [];
    const load = () =>
      listPhotos()
        .then((photos) => {
          if (!alive) return;
          const old = urls;
          urls = photos.map((p) => URL.createObjectURL(p.blob));
          setList(photos.map((p, i) => ({ week: p.week, date: p.date, url: urls[i] })));
          window.setTimeout(() => old.forEach((u) => URL.revokeObjectURL(u)), 1000);
        })
        .catch(() => {
          /* IndexedDB niedostępne (np. tryb prywatny) — sekcja zdjęć zostaje pusta */
        });
    load();
    listeners.add(load);
    return () => {
      alive = false;
      listeners.delete(load);
      urls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, []);
  return list;
}
