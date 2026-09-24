import { describe, expect, test } from 'vitest';
import { formatTime, formatMatchDate, formatShortDate, timeZoneName, formatRelative } from './dates';

// 2026-10-03 23:30 UTC: en Ciudad de México es el MISMO día a las 17:30,
// en Madrid ya es 4 de octubre a la 01:30. La fecha depende de la zona.
const ISO = '2026-10-03T23:30:00.000Z';

describe('fechas y zonas horarias', () => {
  test('convierte UTC a la hora local de cada zona', () => {
    expect(formatTime(ISO, 'America/Mexico_City')).toBe('17:30');
    expect(formatTime(ISO, 'Europe/Madrid')).toBe('01:30');
    expect(formatTime(ISO, 'UTC')).toBe('23:30');
  });

  test('el día mostrado corresponde a la zona del usuario (no se desplaza)', () => {
    expect(formatShortDate(ISO, 'America/Mexico_City')).toMatch(/^03/);
    expect(formatShortDate(ISO, 'Europe/Madrid')).toMatch(/^04/);
    expect(formatMatchDate(ISO, 'America/Mexico_City')).toMatch(/2026/);
  });

  test('indica la zona horaria usada', () => {
    expect(timeZoneName(ISO, 'Europe/Madrid')).toMatch(/CEST|GMT\+2/);
    expect(timeZoneName(ISO, 'UTC')).toMatch(/UTC/);
  });

  test('fechas inválidas no rompen la interfaz', () => {
    expect(formatTime('no-es-fecha')).toBe('—');
    expect(formatRelative(null)).toBeNull();
  });

  test('tiempo relativo para noticias', () => {
    const now = new Date('2026-09-24T12:00:00Z');
    expect(formatRelative('2026-09-24T11:30:00Z', now)).toBe('hace 30 min');
    expect(formatRelative('2026-09-24T09:00:00Z', now)).toBe('hace 3 h');
    expect(formatRelative('2026-09-22T12:00:00Z', now)).toBe('hace 2 d');
  });
});
