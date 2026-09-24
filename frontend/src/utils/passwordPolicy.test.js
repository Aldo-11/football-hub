import { describe, expect, test } from 'vitest';
import { isStrongPassword, checkPassword } from './passwordPolicy';

// Mismos casos que backend/tests/unit/passwordPolicy.test.js: ambas capas deben coincidir
describe('política de contraseñas (frontend)', () => {
  test.each([
    ['12345678', false], ['password', false], ['Password1', false], ['password1!', false],
    ['PASSWORD1!', false], ['Password!!', false], ['Pa1!', false], ['Password1!', true], ['Señal#2026x', true]
  ])('"%s" → %s', (pwd, ok) => {
    expect(isStrongPassword(pwd)).toBe(ok);
  });

  test('12345678 falla mayúscula, minúscula y especial', () => {
    expect(checkPassword('12345678').filter((r) => !r.ok).map((r) => r.id)).toEqual(['upper', 'lower', 'special']);
  });
});
