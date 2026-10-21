import type { QueuedPickup, Roster } from "@/lib/checkin-offline";

/**
 * IndexedDB on the scanning device: the roster of each event, the queue of pickups waiting to be sent,
 * and when the queue last went through. It survives reloads, a dead battery and a lost connection.
 */
const DB_NAME = "kao-checkin";

type SavedRoster = Roster & { eventId: string; savedAt: string };
type Meta = { eventId: string; lastSyncAt: string | null };

let opening: Promise<IDBDatabase> | null = null;

function db(): Promise<IDBDatabase> {
  opening ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const d = req.result;
      d.createObjectStore("rosters", { keyPath: "eventId" });
      d.createObjectStore("queue", { keyPath: "clientUuid" }).createIndex("eventId", "eventId");
      d.createObjectStore("meta", { keyPath: "eventId" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => {
      opening = null;
      reject(req.error);
    };
  });
  return opening;
}

async function run<T>(store: string, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const tx = (await db()).transaction(store, mode);
  const req = fn(tx.objectStore(store));
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve(req.result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

export async function loadRoster(eventId: string): Promise<SavedRoster | null> {
  return (await run<SavedRoster | undefined>("rosters", "readonly", (s) => s.get(eventId))) ?? null;
}

export async function saveRoster(eventId: string, roster: Roster): Promise<SavedRoster> {
  const saved = { ...roster, eventId, savedAt: new Date().toISOString() };
  await run("rosters", "readwrite", (s) => s.put(saved));
  return saved;
}

/** Oldest scan first, which is the order the API receives them in. */
export async function loadQueue(eventId: string): Promise<QueuedPickup[]> {
  const items = await run<QueuedPickup[]>("queue", "readonly", (s) => s.index("eventId").getAll(eventId));
  return items.sort((a, b) => a.scannedAt.localeCompare(b.scannedAt));
}

export async function putQueued(item: QueuedPickup): Promise<void> {
  await run("queue", "readwrite", (s) => s.put(item));
}

export async function removeQueued(clientUuid: string): Promise<void> {
  await run("queue", "readwrite", (s) => s.delete(clientUuid));
}

export async function loadLastSync(eventId: string): Promise<string | null> {
  return (await run<Meta | undefined>("meta", "readonly", (s) => s.get(eventId)))?.lastSyncAt ?? null;
}

export async function saveLastSync(eventId: string, at: string): Promise<void> {
  await run("meta", "readwrite", (s) => s.put({ eventId, lastSyncAt: at } satisfies Meta));
}
