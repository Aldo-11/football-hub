/**
 * Esquemas de validación de entrada compartidos por las rutas.
 */
const { z } = require('zod');
const { CLUB_IDS, LEAGUE_CODES } = require('../config/clubs');
const { PASSWORD_POLICY_MESSAGE, isStrongPassword } = require('../domain/passwordPolicy');

const clubId = z.enum(CLUB_IDS, { errorMap: () => ({ message: 'Club no soportado' }) });
const leagueCode = z.string().transform((v) => v.toUpperCase()).pipe(
  z.enum(LEAGUE_CODES, { errorMap: () => ({ message: 'Liga no soportada' }) })
);
const fixtureId = z.string().regex(/^\d{1,12}$/, 'Identificador de partido inválido');

const email = z.string().trim().toLowerCase().email('Correo electrónico inválido').max(254);

module.exports = {
  clubParams: z.object({ clubId }),
  leagueParams: z.object({ code: leagueCode }),
  matchParams: z.object({ code: leagueCode, fixtureId }),
  predictionQuery: z.object({ fixtureId: fixtureId.optional() }),
  simulationQuery: z.object({
    simulations: z.coerce.number().int().min(100).max(20000).optional(),
    seed: z.coerce.number().int().min(0).max(2 ** 31 - 1).optional()
  }),
  compareQuery: z.object({ a: clubId, b: clubId }).refine((q) => q.a !== q.b, { message: 'Elige dos clubes distintos', path: ['b'] }),
  favoriteBody: z.object({ clubId }).strict(),
  registerBody: z.object({
    email,
    password: z.string().max(72, 'La contraseña no puede superar 72 caracteres')
      .refine(isStrongPassword, PASSWORD_POLICY_MESSAGE)
  }).strict(),
  loginBody: z.object({
    email,
    password: z.string().min(1, 'La contraseña es requerida').max(72),
    totpCode: z.string().regex(/^\d{6}$/, 'El código 2FA debe tener 6 dígitos').optional()
  }).strict(),
  verify2FABody: z.object({ token: z.string().regex(/^\d{6}$/, 'El código 2FA debe tener 6 dígitos') }).strict(),
  predictionBody: z.object({
    clubId,
    fixtureId,
    predictedHome: z.number().int().min(0).max(20),
    predictedAway: z.number().int().min(0).max(20)
  }).strict()
};
