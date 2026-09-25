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

describe('Diagnóstico de conexión a MongoDB (sin datos internos)', () => {
  const { classifyError } = require('../../config/db');
  test.each([
    ['MONGO_URI no está configurada en las variables de entorno.', 'Falta la variable MONGO_URI'],
    ['bad auth : Authentication failed.', 'Usuario o contraseña de MongoDB incorrectos'],
    ['querySrv ENOTFOUND _mongodb._tcp.cluster0.xxx.mongodb.net', 'No se alcanza el servidor de MongoDB (revisa la URI y Network Access en Atlas)'],
    ['algo raro', 'Error de conexión con MongoDB (ver logs)']
  ])('%s → %s', (msg, expected) => {
    expect(classifyError(msg)).toBe(expected);
  });
});

describe('Limpieza de variables de entorno pegadas en el hosting', () => {
  const { clean, cleanUrl } = require('../../config/env');
  test('quita comillas y espacios sobrantes', () => {
    expect(clean('mongodb+srv://u:p@c.mongodb.net/db?w=majority"')).toBe('mongodb+srv://u:p@c.mongodb.net/db?w=majority');
    expect(clean('  "production" ')).toBe('production');
    expect(clean(undefined)).toBeUndefined();
  });
  test('quita la barra final de las URLs', () => {
    expect(cleanUrl('https://red-moose.hostingersite.com/')).toBe('https://red-moose.hostingersite.com');
    expect(cleanUrl(undefined)).toBeUndefined();
  });
});
