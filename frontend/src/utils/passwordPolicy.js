/**
 * Reglas de contraseña (espejo de backend/domain/passwordPolicy.js).
 * Solo sirven para dar retroalimentación inmediata: el backend vuelve a
 * validar y es quien decide.
 */
export const PASSWORD_RULES = [
  { id: 'length', label: 'Mínimo 8 caracteres', test: (p) => p.length >= 8 },
  { id: 'upper', label: 'Una letra mayúscula', test: (p) => /[A-ZÁÉÍÓÚÑ]/.test(p) },
  { id: 'lower', label: 'Una letra minúscula', test: (p) => /[a-záéíóúñ]/.test(p) },
  { id: 'number', label: 'Un número', test: (p) => /\d/.test(p) },
  { id: 'special', label: 'Un carácter especial (! @ # $ % …)', test: (p) => /[^A-Za-z0-9ÁÉÍÓÚÑáéíóúñ\s]/.test(p) }
];

export const checkPassword = (password = '') =>
  PASSWORD_RULES.map((r) => ({ id: r.id, label: r.label, ok: r.test(password) }));

export const isStrongPassword = (password) => checkPassword(password).every((r) => r.ok);
