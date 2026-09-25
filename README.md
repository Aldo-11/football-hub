# Football Hub

Repositorio: https://github.com/Aldo-11/football-hub

Aplicación web para aficionados que siguen a uno de **10 clubes europeos**. Toma datos deportivos de una fuente externa (ESPN) y los **procesa con lógica propia**: clasifica partidos, calcula un índice de rendimiento, detecta puntos clave (alertas), pronostica partidos con un modelo de Poisson, simula el resto de la temporada con Monte Carlo y compara clubes.

> **¿Qué hace la API y qué hace Football Hub?**
> ESPN solo entrega datos crudos: clasificación, calendario, resultados, alineaciones, plantilla y noticias.
> Todo lo demás lo calcula Football Hub en `backend/domain/`: el índice de rendimiento, los puntos clave (alertas), las probabilidades de Poisson, la simulación Monte Carlo, los indicadores H2H, la separación entre partidos pasados y futuros, las validaciones de temporada y la puntuación de la liga de pronósticos.

---

## 1. Problema, usuario y alcance

**Problema.** Las webs deportivas muestran datos, pero no los interpretan: el aficionado ve una tabla y resultados, pero no sabe si su equipo está en racha, si ataca o defiende mejor que su liga, qué probabilidad tiene el próximo partido o cómo podría terminar la temporada.

**Usuario.** Aficionado de uno de los clubes soportados que quiere seguir a su equipo con información procesada y explicada en lenguaje sencillo.

**Objetivo.** Reunir en una sola aplicación los datos de la temporada en curso del club y convertirlos en conclusiones verificables: cómo rinde el equipo, qué destaca, qué probabilidad tiene su próximo partido y cómo podría terminar la temporada.

**Beneficio.** Sin la app, el aficionado tendría que consultar varias webs y calcular a mano medias, rachas y comparaciones con su liga, y aun así no podría estimar probabilidades. Football Hub automatiza ese proceso: con elegir el club obtiene el índice de rendimiento, los puntos clave detectados por reglas, el pronóstico de Poisson y miles de simulaciones de la temporada, cada uno con su fórmula visible.

**Incluye**

| Módulo | Qué muestra |
|---|---|
| Matchday | Próximo partido, pronóstico de Poisson, clasificación completa de la liga, partidos jugados/próximos, noticias |
| Detalle de partido | Alineaciones, formación, cambios, estadísticas e incidencias **reales** (si la fuente las publica) |
| Análisis del equipo | Índice de Rendimiento del Equipo, forma, local/visitante, consistencia, progresión y «Puntos clave del equipo» |
| Simulación | Monte Carlo del resto de la temporada de la liga del club |
| H2H | Comparativa de dos clubes con 4 indicadores 0-100 |
| Club | Historia breve y plantilla de la temporada |
| Pronósticos | Liga entre usuarios; los puntos se asignan solos al terminar el partido |
| Cuenta | Registro, inicio de sesión, sesión renovable y 2FA opcional (TOTP) |

**Clubes soportados** (`backend/config/clubs.js`): Arsenal, Manchester City, Liverpool, Chelsea, Manchester United (Premier League) · Real Madrid, FC Barcelona, Atlético de Madrid (LaLiga) · Bayern Múnich, Borussia Dortmund (Bundesliga).
Las clasificaciones y simulaciones incluyen **todos** los equipos de la liga del club.

**No incluye:** otras competiciones (Champions, copas), apuestas, valor de mercado (ver Limitaciones), datos de temporadas anteriores.

### 1.1 Decisiones y cambios de alcance (justificación)

| Cambio | Motivo |
|---|---|
| Fuente de datos: de TheSportsDB + datos escritos a mano → **API pública de ESPN** | La versión anterior mostraba clasificaciones, calendarios y estadísticas escritas a mano o inventadas (p. ej. xG y goleadores ficticios) y descartaba la respuesta real de la API. ESPN ofrece clasificación completa por temporada, calendario, alineaciones, estadísticas, plantillas y noticias sin API key. |
| Catálogo reducido a **10 clubes** (antes 37 seleccionables) | Acota el alcance a clubes con cobertura completa de datos; las tablas y simulaciones siguen incluyendo toda su liga. |
| Se eliminaron los datos y noticias "de respaldo" inventados | Mostrar información no verificable como real es incorrecto; ahora se indica "no disponible" o se usan datos en caché marcados como guardados. |
| **Valor de mercado** fuera de alcance | Transfermarkt no tiene API pública y extraer sus datos incumple sus condiciones de uso. |
| "IRC" → **Índice de Rendimiento del Equipo**; "Alertas automáticas" → **Puntos clave del equipo** | Nombres más comprensibles para el usuario; la lógica es la misma. |
| Se añadieron Análisis del equipo, Monte Carlo, H2H y Club | Aportan lógica propia demostrable (cálculos, reglas y simulación) en lugar de solo mostrar datos de la API. |
| Contraseña robusta obligatoria (antes solo 8 caracteres) | Requisito de seguridad; se valida en el backend aunque se manipule el frontend. |

---

## 2. Arquitectura

```
frontend (React + Vite + Tailwind)
   │  /api  (JWT en cabecera Authorization; refresh token en cookie httpOnly)
   ▼
backend (Node.js + Express) ── BFF
   ├── routes/ + validation/schemas.js   → validación zod de toda entrada
   ├── controllers/                      → HTTP fino, sin lógica de negocio
   ├── services/
   │     ├── espnClient.js               → HTTP: timeout, reintento, errores tipados
   │     ├── espnNormalizers.js          → ESPN → modelo interno (funciones puras)
   │     ├── footballService.js          → caché + temporada + normalización
   │     └── analysisService.js          → une datos y lógica propia
   ├── domain/   ← LÓGICA PROPIA (pura, sin red; ~97 % de líneas cubiertas por pruebas)
   │     ├── matches.js      partidos pasados / próximos / siguiente
   │     ├── poisson.js      modelo de Poisson
   │     ├── teamAnalysis.js índice de rendimiento, forma, progresión
   │     ├── alerts.js       reglas de alertas
   │     ├── monteCarlo.js   simulación de temporada
   │     ├── h2h.js          comparativa de clubes
   │     └── passwordPolicy.js
   ├── jobs/resolvePredictions.js        → cron: puntúa pronósticos con el resultado final
   └── models/  (MongoDB/Mongoose)       → User, Prediction, PredictionLeagueScore
```

**Tecnologías:** Node.js 22, Express 4, Mongoose 8, zod, bcrypt, jsonwebtoken, helmet, express-rate-limit, node-cron, speakeasy (2FA) · React 18, Vite 6, Tailwind 3, lucide-react · Jest, Supertest, Vitest, ESLint · GitHub Actions, Jenkins, gitleaks, Semgrep, npm audit, OWASP ZAP, Dependabot.

---

## 3. Fuente de datos y temporada

**Fuente principal: API pública de ESPN** (sin API key).

| Dato | Endpoint (ESPN) |
|---|---|
| Clasificación | `apis/v2/sports/soccer/{liga}/standings?season=2026` |
| Calendario y resultados del club | `.../{liga}/teams/{id}/schedule?season=2026` y `&fixture=true` |
| Calendario de la liga (Monte Carlo) | `.../{liga}/scoreboard?dates=20260701-20270630` (si llega incompleto se reconstruye con el calendario de cada equipo) |
| Detalle de partido | `.../{liga}/summary?event={id}` |
| Plantilla | `.../{liga}/teams/{id}/roster?season=2026` |
| Noticias | `.../{liga}/news?team={id}` |

**Temporada 2026-2027.** `backend/config/season.js` la calcula con la fecha (de julio a junio), no está escrita a mano. Todas las consultas envían `season=2026` explícitamente. Además, como defensa:

- una clasificación o plantilla de otra temporada se **rechaza** (error `SEASON_MISMATCH`), no se muestra;
- los partidos fuera de la ventana 1-jul-2026 → 30-jun-2027 o con `season.year ≠ 2026` se descartan;
- los partidos se deduplican por ID.

**Integridad.** Nunca se rellenan datos: si ESPN no publica alineaciones, estadísticas o noticias, la interfaz dice "no disponible". Un partido solo cuenta como jugado si la fuente lo marca como terminado; no se fuerza un número fijo de partidos.

**Fallos de la fuente.** Timeout de 8 s, un reintento ante errores transitorios, mensajes claros para 429/404/5xx/formato inesperado, y caché en memoria con TTL (15 min clasificación, 10 min calendario, 6 h plantilla…). Si ESPN cae y hay una copia previa, se sirve marcada como **datos guardados** (`stale`).

**Fechas.** El backend entrega siempre ISO 8601 en UTC. El frontend las convierte a la zona horaria del navegador en un solo módulo (`frontend/src/utils/dates.js`) e indica la zona (p. ej. "GMT-6").

---

## 4. Lógica propia: fórmulas

### 4.1 Partidos (`domain/matches.js`)
- **Pasados:** estado `FINISHED` según la fuente, del más reciente al más antiguo.
- **Próximos:** estado `SCHEDULED` **y** fecha posterior a ahora, en orden cronológico. **Siguiente** = el primero.
- Aplazados y cancelados se separan y no cuentan como jugados.

### 4.2 Índice de Rendimiento del Equipo (`domain/teamAnalysis.js`)
μ = media de goles por equipo y partido en la liga (Σ GF / Σ PJ de la clasificación real).

| Componente | Peso | Fórmula (0-100) |
|---|---|---|
| Puntos | 35 % | PPG / 3 × 100 |
| Ataque | 25 % | min(100, 50 × GF por partido / μ) — 50 = media de la liga |
| Defensa | 25 % | max(0, 100 − 50 × GC por partido / μ) — 50 = media |
| Forma | 15 % | puntos en los últimos 5 / puntos posibles × 100 |

**Índice = 0.35·Puntos + 0.25·Ataque + 0.25·Defensa + 0.15·Forma.** Lectura: 0-39 bajo, 40-69 medio, 70-100 alto.
Además: rendimiento local/visitante, **consistencia** = 100 × (1 − σ(puntos por partido)/1.5) y **proyección lineal** = PPG × partidos totales (se presenta como proyección, no como meta).

### 4.3 Puntos clave del equipo (`domain/alerts.js`)
En la interfaz se llaman **«Puntos clave del equipo»**: avisos que se generan solos cuando los números del equipo cumplen una regla. Verde = positivo, rojo = a vigilar, gris = informativo.

| Alerta | Regla |
|---|---|
| Mala racha | ≥ 3 partidos seguidos sin ganar |
| Racha de victorias | ≥ 3 victorias seguidas |
| Caída / mejora de rendimiento | PPG últimos 3 ≤ / ≥ PPG temporada ∓ 0.75 (con ≥ 6 partidos) |
| Fortaleza ofensiva / ataque poco productivo | GF/partido ≥ 1.4·μ / ≤ 0.7·μ |
| Vulnerabilidad / solidez defensiva | GC/partido ≥ 1.3·μ / ≤ 0.6·μ |
| Diferencia local-visitante | \|PPG local − PPG visitante\| ≥ 1.0 (≥ 2 partidos de cada tipo) |
| Muestra pequeña | menos de 5 partidos |

Cada punto clave muestra la regla que lo activó («Se activa cuando: …»). El bloque «En resumen» se deriva de los puntos activos.

### 4.4 Modelo de Poisson (`domain/poisson.js`)
1. Fuerza con suavizado (K = 3 partidos "promedio" ficticios para no exagerar con pocos datos):
   `ataque = ((GF + K·μ)/(PJ + K))/μ`, `defensa = ((GC + K·μ)/(PJ + K))/μ` (1 = media; en defensa, menor es mejor).
2. Goles esperados: `λ_local = ataque_local · defensa_visit · μ · h`, `λ_visit = ataque_visit · defensa_local · μ / h`, con ventaja de local **h = 1.12** (h² ≈ 1.25, cociente histórico típico goles local/visitante; es un parámetro del modelo, configurable).
3. Matriz de marcadores 0-10 × 0-10 con P(i,j) = Poisson(i; λ_local)·Poisson(j; λ_visit), normalizada a 1.
4. 1X2, Under/Over 2.5 (P(total ≤ 2)), ambos marcan y marcador más probable se obtienen sumando celdas. Los porcentajes se redondean con el método del mayor resto para sumar exactamente 100.
5. **Conclusión:** diferencia entre el resultado más probable y el segundo: ≥ 25 pts → favorito claro; 10-25 → ligera ventaja; < 10 → equilibrado. Under/Over se destaca si supera el 55 %. Con menos de 5 partidos se avisa de baja fiabilidad.

Los tests verifican el cálculo contra resultados analíticos (p. ej. Under 2.5 = P(Poisson(λ_local+λ_visit) ≤ 2)).

### 4.5 Monte Carlo (`domain/monteCarlo.js`)
- Parte de la clasificación **real** y juega los partidos **pendientes reales** de la liga completa.
- En cada simulación, la fuerza de cada equipo se multiplica por `exp(N(0, σ_i))`, con `σ_i = 0.2·√(K/(PJ_i+K))`: más incertidumbre con menos partidos jugados. Así hay variabilidad real entre simulaciones.
- Cada partido: goles ~ Poisson(λ) del modelo anterior. Orden final: puntos, diferencia, goles a favor, sorteo.
- Resultado por equipo: puntos esperados, rango del 80 %, posición media, P(campeón), P(top 4), P(descenso), distribución de posiciones.
- Configurable: 100-20 000 simulaciones (5 000 por defecto). **Reproducible**: generador con semilla (mulberry32).
- Valida que el número de partidos pendientes coincida con el de una liga a doble vuelta y avisa si no.

### 4.6 H2H (`domain/h2h.js`)
Relativos a la media de la liga de cada club (permite comparar ligas distintas):
- **Peligrosidad goleadora** = min(100, 50·GF_pp/μ)
- **Solidez defensiva** = max(0, 100 − 50·GC_pp/μ)
- **Forma reciente** = % de puntos en los últimos 5
- **Dominio y calidad** = 0.5·(PPG/3·100) + 0.5·clamp(50 + 25·DG_pp)

Muestra también los enfrentamientos directos de la temporada.

### 4.7 Liga de pronósticos
Validado en el servidor: el partido debe ser un partido próximo real del club y no haber empezado; un pronóstico resuelto no se puede cambiar. Un cron (cada 30 min) consulta el resultado final y asigna **3 puntos** (marcador exacto), **1 punto** (signo 1X2) o 0, con actualización condicional para no sumar dos veces.

---

## 5. Autenticación y seguridad

| Control | Implementación |
|---|---|
| Contraseñas | Mín. 8 caracteres con mayúscula, minúscula, número y carácter especial. Validado en **backend** (zod + `domain/passwordPolicy.js`) aunque se manipule el frontend; el frontend repite la regla solo para feedback. `12345678` es rechazada. Máx. 72 (límite de bcrypt). |
| Hash | bcrypt, coste 12 |
| Sesión | Access token JWT HS256 (15 min) en memoria; refresh token (7 días) en cookie `httpOnly`, `SameSite=Strict`, `Secure` en producción, limitada a `/api/auth`. En BD solo se guarda su hash SHA-256; se rota en cada uso y su reutilización invalida la sesión. |
| Secretos | Sin valores por defecto en el código. En producción los secretos JWT son obligatorios (≥ 32 caracteres) o el servidor no arranca. `.env` está en `.gitignore`. |
| Enumeración | Mismo mensaje y tiempo de respuesta para usuario inexistente o contraseña incorrecta. |
| 2FA | TOTP opcional; no se puede reconfigurar si ya está activo. |
| Validación | zod en todos los body/params/query (`.strict()` bloquea campos extra); IDs de club y liga contra el catálogo. |
| Autorización | Todas las rutas de datos requieren token. |
| Errores | El manejador global nunca devuelve stack ni mensajes internos. |
| Cabeceras | helmet: CSP sin comodines ni `unsafe-inline` (imágenes solo del propio sitio y de `*.espncdn.com`; fuentes servidas localmente), HSTS, nosniff, frame-ancestors none, COEP `credentialless` y `Permissions-Policy` que desactiva cámara, micrófono, ubicación, pagos y USB. Sin `X-Powered-By`. |
| CORS | Solo el origen del frontend. |
| Rate limiting | 10 intentos de auth / 15 min por IP; 120 peticiones/min en la API. |
| XSS | React escapa el contenido; no se usa `dangerouslySetInnerHTML` (regla ESLint); enlaces externos solo `https` con `rel="noopener noreferrer"`. |
| Privacidad | Correos enmascarados en el ranking. |

---

## 6. Pruebas

```bash
npm run test          # backend (Jest) + frontend (Vitest)
npm run test:e2e      # flujo completo contra MongoDB real (requiere MONGO_URI)
npm run test:coverage --prefix backend
```

- **Backend: 116 pruebas** unitarias y de API (Supertest). Las de API usan ESPN y MongoDB simulados, por lo que corren sin red. Cobertura ≈ 88 % de líneas.
  - Lógica propia: Poisson (contra fórmulas analíticas), índice, alertas, Monte Carlo (reproducibilidad, probabilidades que suman 100 %, rangos), H2H, clasificación de partidos.
  - Integridad: rechazo de otra temporada, descarte de partidos de 2025-26, duplicados, datos faltantes.
  - Seguridad: contraseñas débiles rechazadas por el backend, bcrypt, cookies, rotación y reutilización de refresh token, token manipulado, JSON mal formado, mass assignment, cabeceras.
  - Errores: API caída (503 sin detalles internos), respaldo con caché antigua.
- **E2E (CI):** registro → refresh → club → pronóstico → resolución → ranking con MongoDB real.
- **Frontend: 18 pruebas** (Vitest): conversión de zonas horarias (un partido 23:30 UTC es otro día en Madrid y el mismo en CDMX), política de contraseñas y distribución de la alineación.

---

## 7. DevSecOps / CI

`.github/workflows/ci.yml` se ejecuta en cada push y pull request:

| Job | Herramienta | Falla si… |
|---|---|---|
| Secret scan | gitleaks (todo el historial) | hay secretos versionados |
| Backend | ESLint + Jest con cobertura | error de lint o prueba |
| Backend e2e | Jest + servicio `mongo:7` | falla el flujo completo |
| Frontend | ESLint + Vitest + build de Vite | error de lint, prueba o compilación |
| Dependency audit (SCA) | `npm audit --audit-level=high` (raíz, backend, frontend) | vulnerabilidad alta o crítica |
| SAST | Semgrep (javascript, nodejs, react, OWASP Top 10) | hallazgo de seguridad |
| DAST | OWASP ZAP baseline contra la app en modo producción | alerta de nivel FAIL (reporte como artefacto) |

Además: **Dependabot** (`.github/dependabot.yml`) propone actualizaciones semanales y `Jenkinsfile` reproduce el mismo pipeline en Jenkins (`docker-compose.jenkins.yml`).

### 7.1 Hallazgos atendidos

| Herramienta | Hallazgo | Acción |
|---|---|---|
| npm audit | 1 crítica + 2 altas: `tar` (vía bcrypt 5) y `uuid` (vía node-cron 3) | Actualizados a bcrypt 6 y node-cron 4 → 0 vulnerabilidades |
| npm audit | Advertencia moderada en `@vitest/mocker` | Actualizado Vitest |
| Revisión de código | Secretos JWT con valor por defecto en el código | Eliminados; obligatorios en producción |
| Revisión de código | Errores internos (`error.message`) devueltos al cliente | Manejador global sin detalles internos |
| Revisión de código | Validación de contraseña solo por longitud | Política completa en backend y frontend |
| Semgrep (primer run de CI) | 19 hallazgos: acciones de GitHub con etiqueta mutable y Dependabot sin periodo de espera | Acciones fijadas a SHA y `cooldown` de 7 días |
| Dependabot | Actualizaciones de acciones (p. ej. `upload-artifact`) | PRs revisados y fusionados con CI en verde |
| Despliegue | Detrás de un proxy, el rate limit usaba la IP del proxy para todos | `trust proxy` configurable (1 por defecto en producción) |
| OWASP ZAP (DAST) | 3 medias: CSP con comodín en `img-src` y `style-src 'unsafe-inline'`; hoja de Google Fonts sin Subresource Integrity | CSP restringida a `'self'` + `*.espncdn.com`, sin `unsafe-inline`; fuentes servidas desde el propio sitio (`@fontsource`), sin recursos de terceros |
| OWASP ZAP (DAST) | 2 bajas: faltaban `Cross-Origin-Embedder-Policy` y `Permissions-Policy` | COEP `credentialless` (no rompe las imágenes de ESPN) y `Permissions-Policy` restrictiva |
| GitHub Actions | Aviso: acciones sobre Node.js 20 (obsoleto) | `checkout` v6, `setup-node` v6 y `download-artifact` v7, fijadas a SHA |

---

## 8. Ejecución local

Requisitos: Node.js ≥ 20 y MongoDB (local o Atlas). Acceso a internet para ESPN.

```bash
cp .env.example .env        # completar MONGO_URI y secretos JWT
npm run install:all
npm run dev                 # backend :3000 + frontend :5173
```

Producción: `npm run build` y `NODE_ENV=production node backend/server.js` (el backend sirve también el frontend compilado).

Comandos útiles: `npm run lint`, `npm run test`, `npm run audit`.

---

## 8.1 Despliegue en producción (Hostinger, aplicación Node.js)

Se eligió **Hostinger (aplicación Node.js)** frente a Vercel (plan gratuito) porque la app necesita un **proceso Node.js persistente**: la tarea programada que puntúa pronósticos (node-cron), la caché en memoria de ESPN y la simulación Monte Carlo. En Vercel el backend se ejecutaría como funciones serverless que se apagan entre peticiones: el cron no corre, la caché se pierde y las simulaciones grandes pueden superar el tiempo máximo de ejecución.

La app se despliega como **una sola aplicación Node.js**: en producción el backend sirve también el frontend compilado.

| Paso | Valor |
|---|---|
| Versión de Node.js | 20 o superior (recomendado 22) |
| Comando de build | `npm run build:prod` (instala las herramientas de compilación del frontend aunque el hosting defina `NODE_ENV=production`) |
| Comando de inicio / archivo de entrada | `npm start` o el archivo `server.js` de la raíz |
| Base de datos | MongoDB Atlas (plan gratuito M0); el hosting compartido no incluye MongoDB |

Variables de entorno obligatorias: `NODE_ENV=production`, `MONGO_URI`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` (≥ 32 caracteres), `FRONTEND_URL=https://tu-dominio`. Opcional: `TRUST_PROXY` (por defecto 1 en producción, necesario detrás del proxy del hosting para que el límite de peticiones sea por usuario). `PORT` normalmente lo asigna el hosting.

En Atlas hay que permitir la IP del servidor en *Network Access*. Sin HTTPS la cookie de sesión (`Secure`) no se envía: el dominio debe tener SSL activo.

**Diagnóstico.** El servidor arranca aunque MongoDB falle (reintenta cada 15 s). `GET /api/health` responde `200` si todo está bien o `503` con `database.problem` indicando la causa (falta `MONGO_URI`, usuario/contraseña incorrectos o IP no permitida en Atlas). Si el sitio muestra "503 Service Unavailable" del propio hosting, el proceso no llegó a arrancar: revisa los logs de la aplicación (p. ej. faltan `JWT_ACCESS_SECRET`/`JWT_REFRESH_SECRET`, obligatorios en producción).

## 9. Limitaciones

- **Fuente no oficial:** la API de ESPN es pública pero no documentada; puede cambiar su formato. Los normalizadores validan el formato y la app degrada con mensajes claros.
- **Valor de mercado:** no se muestra. Transfermarkt no ofrece API pública y extraer sus datos incumple sus condiciones de uso; se prefirió no mostrar valores sin verificar.
- **Historia de los clubes:** datos de referencia estáticos con fecha de corte (temporada 2024-25) indicada en pantalla.
- **Modelos:** Poisson asume goles independientes y no considera lesiones, rotaciones ni otras competiciones; al inicio de temporada la muestra es pequeña (se avisa en la interfaz).
- **Plazas europeas:** se usa la regla base de cada liga (top 4); no se contemplan plazas extra por coeficiente UEFA.
- **Caché en memoria:** se pierde al reiniciar el servidor y no se comparte entre instancias.

## 10. Mejoras futuras

- Caché compartida (Redis) y trabajos de precarga.
- Incluir Champions League y copas nacionales.
- Corrección de Dixon-Coles para marcadores bajos y calibración del modelo con temporadas anteriores (backtesting).
- Notificaciones push cuando se active una alerta.
- Pruebas end-to-end de interfaz con Playwright en CI.
