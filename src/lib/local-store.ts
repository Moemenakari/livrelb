// Tiny localStorage-backed store for useSyncExternalStore. Values are cached
// so snapshots stay referentially stable between renders. Storage can be
// unavailable (private mode, blocked cookies): everything falls back to
// memory.

export function createLocalStore<T>(key: string, fallback: T) {
  let cache: T | undefined;
  const listeners = new Set<() => void>();

  function read(): T {
    if (cache !== undefined) return cache;
    try {
      const raw = window.localStorage.getItem(key);
      cache = raw ? (JSON.parse(raw) as T) : fallback;
    } catch {
      cache = fallback;
    }
    return cache;
  }

  function write(value: T) {
    cache = value;
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Memory only.
    }
    listeners.forEach((l) => l());
  }

  function subscribe(listener: () => void) {
    listeners.add(listener);
    const onStorage = (e: StorageEvent) => {
      if (e.key !== key) return;
      cache = undefined;
      listener();
    };
    window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(listener);
      window.removeEventListener("storage", onStorage);
    };
  }

  return { read, write, subscribe, serverSnapshot: () => fallback };
}
