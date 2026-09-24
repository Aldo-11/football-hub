const { CLUBS, LEAGUES, resolveClubId, getClub } = require('../../config/clubs');

describe('Catálogo de clubes', () => {
  test('exactamente 10 clubes, sin duplicados, todos con liga soportada', () => {
    expect(CLUBS).toHaveLength(10);
    expect(new Set(CLUBS.map((c) => c.id)).size).toBe(10);
    expect(new Set(CLUBS.map((c) => c.espnId)).size).toBe(10);
    CLUBS.forEach((c) => expect(LEAGUES[c.league]).toBeDefined());
  });

  test('traduce IDs heredados de football-data.org y rechaza desconocidos', () => {
    expect(resolveClubId('57')).toBe('arsenal');
    expect(resolveClubId('86')).toBe('realmadrid');
    expect(resolveClubId('arsenal')).toBe('arsenal');
    expect(resolveClubId('9999')).toBeNull();
    expect(resolveClubId(null)).toBeNull();
    expect(getClub('<script>')).toBeNull();
  });
});
