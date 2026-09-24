const TtlCache = require('../../utils/ttlCache');

describe('TtlCache', () => {
  test('devuelve datos frescos sin volver a llamar', async () => {
    let now = 0;
    const cache = new TtlCache({ now: () => now });
    const loader = jest.fn().mockResolvedValue('A');
    await cache.wrap('k', 1000, loader);
    const second = await cache.wrap('k', 1000, loader);
    expect(loader).toHaveBeenCalledTimes(1);
    expect(second.cache).toBe('hit');
  });

  test('si la fuente falla usa la copia antigua marcada como stale', async () => {
    let now = 0;
    const cache = new TtlCache({ now: () => now, maxStaleMs: 10000 });
    await cache.wrap('k', 1000, async () => 'viejo');
    now = 2000;
    const res = await cache.wrap('k', 1000, async () => { const e = new Error('caída'); e.code = 'UPSTREAM_UNAVAILABLE'; throw e; });
    expect(res).toMatchObject({ data: 'viejo', stale: true, error: 'UPSTREAM_UNAVAILABLE' });
  });

  test('sin copia antigua el error se propaga', async () => {
    const cache = new TtlCache();
    await expect(cache.wrap('k', 1000, async () => { throw new Error('x'); })).rejects.toThrow('x');
  });

  test('peticiones simultáneas comparten una sola llamada', async () => {
    const cache = new TtlCache();
    const loader = jest.fn(() => new Promise((r) => setTimeout(() => r(1), 10)));
    await Promise.all([cache.wrap('k', 1000, loader), cache.wrap('k', 1000, loader)]);
    expect(loader).toHaveBeenCalledTimes(1);
  });
});
