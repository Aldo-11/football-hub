const { isStrongPassword, checkPassword } = require('../../domain/passwordPolicy');

describe('Política de contraseñas', () => {
  test.each([
    ['12345678', false],
    ['password', false],
    ['Password1', false],       // sin carácter especial
    ['password1!', false],      // sin mayúscula
    ['PASSWORD1!', false],      // sin minúscula
    ['Password!!', false],      // sin número
    ['Pa1!', false],            // demasiado corta
    ['Password1!', true],
    ['Señal#2026x', true]
  ])('"%s" → %s', (pwd, expected) => {
    expect(isStrongPassword(pwd)).toBe(expected);
  });

  test('indica qué reglas fallan', () => {
    const failed = checkPassword('12345678').filter((r) => !r.ok).map((r) => r.id);
    expect(failed).toEqual(['upper', 'lower', 'special']);
  });

  test('valores no string no son válidos', () => {
    expect(isStrongPassword(undefined)).toBe(false);
    expect(isStrongPassword({})).toBe(false);
  });
});
