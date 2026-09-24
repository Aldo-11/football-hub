/**
 * Caché en memoria con expiración (TTL) y respaldo "stale-if-error".
 *
 * - Si el dato está fresco se devuelve sin llamar a la API externa.
 * - Si expiró, se vuelve a pedir; si la API falla y existe una copia antigua
 *   (no más vieja que `maxStaleMs`), se devuelve marcada como `stale: true`
 *   para que la interfaz pueda indicarlo.
 * - Peticiones simultáneas a la misma clave comparten una sola llamada.
 */
class TtlCache {
  constructor({ maxEntries = 500, maxStaleMs = 24 * 60 * 60 * 1000, now = () => Date.now() } = {}) {
    this.store = new Map();
    this.inflight = new Map();
    this.maxEntries = maxEntries;
    this.maxStaleMs = maxStaleMs;
    this.now = now;
  }

  set(key, value, ttlMs) {
    if (this.store.size >= this.maxEntries && !this.store.has(key)) {
      // Expulsar la entrada más antigua (Map mantiene orden de inserción)
      this.store.delete(this.store.keys().next().value);
    }
    this.store.delete(key);
    this.store.set(key, { value, storedAt: this.now(), expiresAt: this.now() + ttlMs });
  }

  peek(key) {
    return this.store.get(key) || null;
  }

  async wrap(key, ttlMs, loader) {
    const entry = this.store.get(key);
    if (entry && entry.expiresAt > this.now()) {
      return { data: entry.value, cache: 'hit', fetchedAt: new Date(entry.storedAt).toISOString(), stale: false };
    }

    if (this.inflight.has(key)) return this.inflight.get(key);

    const promise = (async () => {
      try {
        const value = await loader();
        this.set(key, value, ttlMs);
        return { data: value, cache: 'miss', fetchedAt: new Date(this.now()).toISOString(), stale: false };
      } catch (error) {
        if (entry && this.now() - entry.storedAt <= this.maxStaleMs) {
          return { data: entry.value, cache: 'stale', fetchedAt: new Date(entry.storedAt).toISOString(), stale: true, error: error.code || 'UPSTREAM_ERROR' };
        }
        throw error;
      } finally {
        this.inflight.delete(key);
      }
    })();

    this.inflight.set(key, promise);
    return promise;
  }

  clear() {
    this.store.clear();
    this.inflight.clear();
  }

  size() {
    return this.store.size;
  }
}

module.exports = TtlCache;
