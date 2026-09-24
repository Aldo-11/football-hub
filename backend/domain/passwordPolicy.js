/**
 * Política de contraseñas (la misma regla se aplica en el frontend para dar
 * retroalimentación inmediata, pero la decisión final es SIEMPRE del backend).
 */
const PASSWORD_RULES = [
  { id: 'length', label: 'Mínimo 8 caracteres', test: (p) => p.length >= 8 },
  { id: 'upper', label: 'Una letra mayúscula', test: (p) => /[A-ZÁÉÍÓÚÑ]/.test(p) },
  { id: 'lower', label: 'Una letra minúscula', test: (p) => /[a-záéíóúñ]/.test(p) },
  { id: 'number', label: 'Un número', test: (p) => /\d/.test(p) },
  { id: 'special', label: 'Un carácter especial (p. ej. ! @ # $ %)', test: (p) => /[^A-Za-z0-9ÁÉÍÓÚÑáéíóúñ\s]/.test(p) }
];

const PASSWORD_POLICY_MESSAGE =
  'La contraseña debe tener mínimo 8 caracteres e incluir mayúscula, minúscula, número y carácter especial.';

const checkPassword = (password) => {
  const p = typeof password === 'string' ? password : '';
  return PASSWORD_RULES.map((r) => ({ id: r.id, label: r.label, ok: r.test(p) }));
};

const isStrongPassword = (password) => checkPassword(password).every((r) => r.ok);

module.exports = { PASSWORD_RULES, PASSWORD_POLICY_MESSAGE, checkPassword, isStrongPassword };
