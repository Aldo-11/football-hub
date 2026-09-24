const axios = require('axios');
const logger = require('../config/logger');
const { UpstreamError } = require('../utils/errors');

/**
 * Cliente HTTP para la API pública de ESPN (sin API key).
 *
 * Responsabilidades:
 *  - timeout por petición;
 *  - un reintento ante fallos transitorios (timeout, red, 5xx);
 *  - traducir errores a códigos entendibles (TIMEOUT, RATE_LIMITED, ...);
 *  - rechazar respuestas vacías o con formato inesperado.
 *
 * No transforma datos: eso lo hacen los normalizadores.
 */
const BASE_URLS = {
  site: 'https://site.api.espn.com/apis/site/v2/sports/soccer',
  standings: 'https://site.api.espn.com/apis/v2/sports/soccer'
};

const DEFAULT_TIMEOUT_MS = parseInt(process.env.EXTERNAL_API_TIMEOUT_MS, 10) || 8000;

const http = axios.create({
  timeout: DEFAULT_TIMEOUT_MS,
  headers: { Accept: 'application/json', 'User-Agent': 'FootballHub/1.0 (academic project)' }
});

const isTransient = (error) => {
  if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT' || error.code === 'ECONNRESET') return true;
  const status = error.response?.status;
  return !status || status >= 500;
};

const toUpstreamError = (error, url) => {
  const status = error.response?.status;
  if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
    return new UpstreamError('La fuente de datos tardó demasiado en responder.', 'UPSTREAM_TIMEOUT', { status: 504 });
  }
  if (status === 429) {
    return new UpstreamError('La fuente de datos limitó temporalmente las consultas.', 'UPSTREAM_RATE_LIMITED');
  }
  if (status === 404) {
    return new UpstreamError('La fuente de datos no tiene este recurso.', 'UPSTREAM_NOT_FOUND', { status: 404 });
  }
  logger.warn(`ESPN no disponible (${status || error.code || 'sin respuesta'}) en ${url}`);
  return new UpstreamError('La fuente de datos no está disponible en este momento.', 'UPSTREAM_UNAVAILABLE');
};

/**
 * @param {'site'|'standings'} base
 * @param {string} path  p. ej. '/eng.1/teams/359/schedule'
 * @param {object} params query string
 * @param {(data:any)=>boolean} isValid validación mínima del formato
 */
const getJson = async (base, path, params = {}, isValid = (d) => d && typeof d === 'object') => {
  const url = `${BASE_URLS[base]}${path}`;
  let lastError;

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const { data } = await http.get(url, { params });
      if (!isValid(data)) {
        throw new UpstreamError('La fuente de datos devolvió un formato inesperado.', 'UPSTREAM_BAD_FORMAT', { status: 502 });
      }
      return data;
    } catch (error) {
      if (error instanceof UpstreamError) throw error;
      lastError = error;
      if (attempt === 1 && isTransient(error)) continue;
      break;
    }
  }
  throw toUpstreamError(lastError, url);
};

module.exports = { getJson, http, BASE_URLS };
