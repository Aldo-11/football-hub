import { describe, expect, test } from 'vitest';
import { buildLines, parseFormation } from './formation';

const p = (name, position, formationPlace) => ({ id: name, name, position, formationPlace });

describe('distribución de la alineación en el campo', () => {
  const starters = [
    p('ST', 'F'), p('GK', 'G'), p('LB', 'LB'), p('RB', 'RB'), p('CBL', 'CD-L'), p('CBR', 'CD-R'),
    p('DM', 'DM'), p('CML', 'CM-L'), p('CMR', 'CM-R'), p('LW', 'LW'), p('RW', 'RW')
  ];

  test('4-3-3: portero + líneas según la formación, izquierda→derecha', () => {
    const lines = buildLines(starters, '4-3-3');
    expect(lines.map((l) => l.length)).toEqual([1, 4, 3, 3]);
    expect(lines[0][0].name).toBe('GK');
    expect(lines[1].map((x) => x.name)).toEqual(['LB', 'CBL', 'CBR', 'RB']);
    expect(lines[3].map((x) => x.name)).toEqual(['LW', 'ST', 'RW']);
  });

  test('cada jugador aparece exactamente una vez (sin superposición ni pérdidas)', () => {
    const names = buildLines(starters, '4-3-3').flat().map((x) => x.name).sort();
    expect(names).toEqual(starters.map((x) => x.name).sort());
  });

  test('formación ausente o incoherente: agrupa por posición', () => {
    const lines = buildLines(starters, null);
    expect(lines.flat()).toHaveLength(11);
    expect(buildLines(starters, '4-4-2-9').flat()).toHaveLength(11);
    expect(parseFormation('abc')).toBeNull();
  });
});
