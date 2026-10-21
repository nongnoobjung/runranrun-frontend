"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import {
  findInRoster,
  indexRoster,
  offlineVerdict,
  runnerLabel,
  sha256Hex,
  type QueuedPickup,
  type Roster,
  type Runner,
  type ScanResult,
} from "@/lib/checkin-offline";
import { downloadRoster, syncPickups, type SyncResult } from "./actions";
import { loadLastSync, loadQueue, loadRoster, putQueued, removeQueued, saveLastSync, saveRoster } from "./offline-store";

const BATCH = 200;
const RETRY_MS = 30_000;

function subscribe(onChange: () => void) {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

/**
 * Keeps the check-in page working without a network: the roster lives in IndexedDB, lookups fall back to it,
 * and pickups recorded offline wait in a queue that is sent, oldest first, as soon as the API can be reached.
 */
export function useOfflineCheckin(orgId: string, eventId: string) {
  const browserOnline = useSyncExternalStore(subscribe, () => navigator.onLine, () => true);
  // navigator.onLine says nothing about captive Wi-Fi or a dead API; a failed request counts as offline too.
  const [unreachable, setUnreachable] = useState(false);
  const online = browserOnline && !unreachable;
  const [roster, setRoster] = useState<Roster | null>(null);
  const [queue, setQueue] = useState<QueuedPickup[]>([]);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const syncingRef = useRef(false);
  const index = useMemo(() => indexRoster(roster?.items ?? []), [roster]);

  const pending = useMemo(() => queue.filter((q) => !q.conflict), [queue]);
  const conflicts = useMemo(() => queue.filter((q) => q.conflict), [queue]);

  const touched = useCallback(async () => {
    const at = new Date().toISOString();
    setUnreachable(false);
    setLastSyncAt(at);
    await saveLastSync(eventId, at);
  }, [eventId]);

  const refreshRoster = useCallback(async () => {
    let res: Awaited<ReturnType<typeof downloadRoster>>;
    try {
      res = await downloadRoster(orgId, eventId);
    } catch {
      setUnreachable(true);
      return;
    }
    if (!res.ok) {
      setProblem(`ดาวน์โหลดรายชื่อไม่สำเร็จ: ${res.message}`);
      return;
    }
    setProblem(null);
    await saveRoster(eventId, res.roster);
    setRoster(res.roster);
    await touched();
  }, [orgId, eventId, touched]);

  const sync = useCallback(async () => {
    if (syncingRef.current) return;
    syncingRef.current = true;
    const waiting = (await loadQueue(eventId).catch(() => [])).filter((q) => !q.conflict);
    if (!waiting.length) {
      syncingRef.current = false;
      return;
    }
    setSyncing(true);
    let sent = false;
    try {
      for (let i = 0; i < waiting.length; i += BATCH) {
        const chunk = waiting.slice(i, i + BATCH);
        let res: SyncResult;
        try {
          res = await syncPickups(
            orgId,
            eventId,
            chunk.map((q) => ({ code: q.code, clientUuid: q.clientUuid, pickedUpBy: q.pickedUpBy, scannedAt: q.scannedAt })),
          );
        } catch {
          setUnreachable(true);
          return;
        }
        if (!res.ok) {
          if (res.unreachable) setUnreachable(true);
          else setProblem(`ส่งคิวไม่สำเร็จ: ${res.message}`);
          return;
        }
        const at = new Date().toISOString();
        for (const r of res.results) {
          const item = chunk.find((q) => q.clientUuid === r.clientUuid);
          if (!item) continue;
          if (r.ok) await removeQueued(r.clientUuid);
          else await putQueued({ ...item, conflict: { code: r.code, at, pickedUpAt: r.pickedUpAt } });
        }
        sent = true;
        setProblem(null);
        await touched();
      }
    } finally {
      setQueue(await loadQueue(eventId));
      syncingRef.current = false;
      setSyncing(false);
    }
    // Picks up what other tables handed over meanwhile.
    if (sent) await refreshRoster();
  }, [orgId, eventId, touched, refreshRoster]);

  // What this device already has, then whatever the network can add.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [r, q, s] = await Promise.all([loadRoster(eventId), loadQueue(eventId), loadLastSync(eventId)]);
      if (cancelled) return;
      // A download that finished first is newer than what was saved.
      setRoster((current) => current ?? r);
      setQueue(q);
      setLastSyncAt((current) => current ?? s);
    })().catch(() => {
      if (!cancelled) setProblem("เครื่องนี้เก็บข้อมูลไว้ใช้ตอนออฟไลน์ไม่ได้ (เช่น โหมดไม่ระบุตัวตน) ใช้ได้เฉพาะตอนออนไลน์");
    });
    return () => {
      cancelled = true;
    };
  }, [eventId]);

  // Back online (or first load): send the queue, then refresh the roster.
  useEffect(() => {
    if (!browserOnline) return;
    const t = setTimeout(() => {
      setUnreachable(false);
      void sync().then(() => refreshRoster());
    }, 0);
    return () => clearTimeout(t);
  }, [browserOnline, sync, refreshRoster]);

  // The online event can be missed, and a dead API never fires one: keep trying while there is something to send.
  useEffect(() => {
    if (!browserOnline || (!pending.length && !unreachable)) return;
    const t = setInterval(() => void (pending.length ? sync() : refreshRoster()), RETRY_MS);
    return () => clearInterval(t);
  }, [browserOnline, pending.length, unreachable, sync, refreshRoster]);

  // Lets the page itself open with no network, once it has been opened online (production builds only).
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .register("/checkin-sw.js", { scope: "/organizer/" })
      .then(() => navigator.serviceWorker.ready)
      .then((reg) => {
        const assets = performance
          .getEntriesByType("resource")
          .map((e) => e.name)
          .filter((u) => new URL(u).pathname.startsWith("/_next/static/"));
        reg.active?.postMessage({ type: "precache", urls: [location.pathname, ...assets] });
      })
      .catch(() => {});
  }, []);

  const lookupLocal = useCallback(
    async (code: string): Promise<ScanResult> => {
      if (!roster) return { kind: "error", message: "ยังไม่มีรายชื่อในเครื่อง ต่ออินเทอร์เน็ตสักครู่เพื่อดาวน์โหลดก่อน" };
      const entry = findInRoster(index, code, await sha256Hex(code.trim()));
      if (!entry) return { kind: "not_found", code, offline: true };
      return offlineVerdict(entry, pending.find((q) => q.registrationId === entry.id));
    },
    [roster, index, pending],
  );

  /** A pickup recorded on this device that the API has not accepted yet. */
  const queuedFor = useCallback((registrationId: string) => pending.find((q) => q.registrationId === registrationId), [pending]);

  const enqueue = useCallback(
    async (runner: Runner, clientUuid: string, pickedUpBy: string | null): Promise<string> => {
      const scannedAt = new Date().toISOString();
      await putQueued({
        clientUuid, eventId, registrationId: runner.id, code: runner.registrationNo, pickedUpBy, scannedAt, label: runnerLabel(runner), conflict: null,
      });
      setQueue(await loadQueue(eventId));
      return scannedAt;
    },
    [eventId],
  );

  /** Keeps the roster on the device in step with a pickup the API just accepted online. */
  const noteCheckedIn = useCallback(
    async (registrationId: string, at: string | null) => {
      if (!roster) return;
      const next = { ...roster, items: roster.items.map((e) => (e.id === registrationId ? { ...e, kitPickedUpAt: at ?? new Date().toISOString() } : e)) };
      setRoster(next);
      await saveRoster(eventId, next);
    },
    [roster, eventId],
  );

  const dismiss = useCallback(
    async (clientUuid: string) => {
      await removeQueued(clientUuid);
      setQueue(await loadQueue(eventId));
    },
    [eventId],
  );

  return {
    online,
    roster,
    pending: pending.length,
    conflicts,
    lastSyncAt,
    syncing,
    problem,
    sync,
    refreshRoster,
    lookupLocal,
    queuedFor,
    enqueue,
    noteCheckedIn,
    dismiss,
    reachable: () => setUnreachable(false),
    unreachableNow: () => setUnreachable(true),
  };
}

export type OfflineCheckin = ReturnType<typeof useOfflineCheckin>;
