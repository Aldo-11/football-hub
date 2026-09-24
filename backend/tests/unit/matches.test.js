const { splitMatches, resultFor, clubPerspective } = require('../../domain/matches');

const m = (id, date, status, home, away, sh = null, sa = null) => ({
  fixtureId: String(id), utcDate: date, status,
  homeTeam: { espnId: home, name: home }, awayTeam: { espnId: away, name: away },
  score: { home: sh, away: sa }
});

describe('splitMatches', () => {
  const now = new Date('2026-09-24T12:00:00Z');
  const list = [
    m(1, '2026-08-22T14:00:00Z', 'FINISHED', 'A', 'B', 2, 0),
    m(2, '2026-09-20T14:00:00Z', 'FINISHED', 'C', 'A', 1, 1),
    m(3, '2026-09-27T14:00:00Z', 'SCHEDULED', 'A', 'D'),
    m(4, '2026-10-04T14:00:00Z', 'SCHEDULED', 'E', 'A'),
    m(5, '2026-09-24T10:00:00Z', 'SCHEDULED', 'A', 'F'), // ya debió empezar: no es "futuro"
    m(6, '2026-09-13T14:00:00Z', 'POSTPONED', 'A', 'G'),
    m(3, '2026-09-27T14:00:00Z', 'SCHEDULED', 'A', 'D')  // duplicado
  ];

  test('pasados solo terminados (más reciente primero); futuros en orden; sin duplicados', () => {
    const r = splitMatches(list, now);
    expect(r.past.map((x) => x.fixtureId)).toEqual(['2', '1']);
    expect(r.upcoming.map((x) => x.fixtureId)).toEqual(['3', '4']);
    expect(r.next.fixtureId).toBe('3');
    expect(r.postponed.map((x) => x.fixtureId)).toEqual(['6']);
  });

  test('no fuerza cantidades: si solo hay 2 jugados devuelve 2', () => {
    expect(splitMatches(list, now).past).toHaveLength(2);
  });

  test('sin partidos devuelve listas vacías y next null', () => {
    expect(splitMatches([], now)).toMatchObject({ past: [], upcoming: [], next: null });
  });
});

describe('perspectiva del club', () => {
  test('resultado y puntos desde el punto de vista del club', () => {
    expect(resultFor(m(1, 'x', 'FINISHED', 'A', 'B', 2, 0), 'A')).toBe('W');
    expect(resultFor(m(1, 'x', 'FINISHED', 'A', 'B', 2, 0), 'B')).toBe('L');
    expect(resultFor(m(1, 'x', 'FINISHED', 'A', 'B', 1, 1), 'B')).toBe('D');
    expect(resultFor(m(1, 'x', 'SCHEDULED', 'A', 'B'), 'A')).toBeNull();
    const games = clubPerspective([m(2, '2026-09-20T00:00:00Z', 'FINISHED', 'C', 'A', 1, 3), m(1, '2026-08-20T00:00:00Z', 'FINISHED', 'A', 'B', 0, 0)], 'A');
    expect(games.map((g) => [g.result, g.points, g.isHome, g.goalsFor])).toEqual([['D', 1, true, 0], ['W', 3, false, 3]]);
  });
});
