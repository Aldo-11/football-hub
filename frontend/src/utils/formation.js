/**
 * Distribuye a los titulares en líneas (portero → defensa → medio → ataque)
 * a partir de la formación y la posición de cada jugador. El resultado se
 * dibuja con filas flexibles, por lo que los jugadores no pueden superponerse.
 */
const lineRank = (pos = '') => {
  const p = pos.toUpperCase();
  if (p === 'G' || p === 'GK') return 0;
  if (p.startsWith('DM')) return 2;
  if (/^(CD|CB|LB|RB|LWB|RWB|SW)/.test(p) || p === 'D') return 1;
  if (p.startsWith('AM')) return 4;
  if (/^(CM|LM|RM|M)/.test(p)) return 3;
  if (/^(F|CF|ST|LW|RW|SS)/.test(p)) return 5;
  return 3;
};

// Banda izq. (0) → interior izq. (1) → centro (2) → interior der. (3) → banda der. (4),
// visto hacia la portería rival. Laterales y extremos quedan por fuera.
const sideRank = (pos = '') => {
  const p = pos.toUpperCase();
  if (/^L/.test(p)) return 0;
  if (/-L$/.test(p)) return 1;
  if (/-R$/.test(p)) return 3;
  if (/^R/.test(p)) return 4;
  return 2;
};

const byLineThenSide = (a, b) =>
  lineRank(a.position) - lineRank(b.position) ||
  sideRank(a.position) - sideRank(b.position) ||
  (a.formationPlace ?? 99) - (b.formationPlace ?? 99);

export const parseFormation = (formation) => {
  if (!formation || !/^\d(-\d){2,4}$/.test(formation)) return null;
  return formation.split('-').map(Number);
};

/** @returns {Array<Array<player>>} líneas desde el portero hacia el ataque */
export const buildLines = (starters, formation) => {
  const sorted = [...starters].sort(byLineThenSide);
  const gkIndex = sorted.findIndex((p) => lineRank(p.position) === 0);
  const goalkeeper = gkIndex >= 0 ? sorted.splice(gkIndex, 1) : [];
  const counts = parseFormation(formation);

  let lines;
  if (counts && counts.reduce((a, b) => a + b, 0) === sorted.length) {
    let i = 0;
    lines = counts.map((c) => { const line = sorted.slice(i, i + c); i += c; return line; });
  } else {
    // Sin formación fiable: agrupar por tipo de posición
    const groups = new Map();
    sorted.forEach((p) => {
      const r = lineRank(p.position);
      const key = r <= 1 ? 1 : r >= 5 ? 3 : 2; // defensa · medio · ataque
      groups.set(key, [...(groups.get(key) || []), p]);
    });
    lines = [...groups.keys()].sort((a, b) => a - b).map((k) => groups.get(k));
  }
  return [goalkeeper, ...lines].filter((l) => l.length > 0)
    .map((line) => [...line].sort((a, b) => sideRank(a.position) - sideRank(b.position)));
};
