const { getCurrentSeason, isWithinSeason, seasonStartYearFor } = require('../../config/season');

describe('Temporada actual', () => {
  test('24-sep-2026 corresponde a la temporada 2026-2027 (ESPN season=2026)', () => {
    const s = getCurrentSeason(new Date('2026-09-24T12:00:00Z'));
    expect(s.label).toBe('2026-2027');
    expect(s.espnSeason).toBe(2026);
  });

  test('en enero sigue siendo la temporada iniciada el año anterior', () => {
    expect(seasonStartYearFor(new Date('2027-01-15T00:00:00Z'))).toBe(2026);
    expect(seasonStartYearFor(new Date('2027-06-30T23:59:59Z'))).toBe(2026);
    expect(seasonStartYearFor(new Date('2027-07-01T00:00:00Z'))).toBe(2027);
  });

  test('ventana de fechas: excluye partidos de la temporada anterior', () => {
    const s = getCurrentSeason(new Date('2026-09-24T12:00:00Z'));
    expect(isWithinSeason('2026-05-19T15:00:00Z', s)).toBe(false);
    expect(isWithinSeason('2026-08-21T19:00:00Z', s)).toBe(true);
    expect(isWithinSeason('2027-05-23T15:00:00Z', s)).toBe(true);
    expect(isWithinSeason('fecha-invalida', s)).toBe(false);
  });

  test('SEASON_START_YEAR permite fijar la temporada', () => {
    process.env.SEASON_START_YEAR = '2025';
    expect(getCurrentSeason(new Date('2026-09-24T00:00:00Z')).label).toBe('2025-2026');
    delete process.env.SEASON_START_YEAR;
  });
});
