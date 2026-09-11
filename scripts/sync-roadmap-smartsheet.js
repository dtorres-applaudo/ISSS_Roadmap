// scripts/sync-roadmap-smartsheet.js
//
// Sincroniza public/data/roadmap.json contra el plan de trabajo en Smartsheet
// (reemplaza el flujo anterior basado en el export .xlsx).
//
// Fuente parametrizada vía variables de entorno (ver smartsheet_token.env en la
// raíz del proyecto — NO commitear ese archivo):
//   SMARTSHEET_TOKEN     token de acceso a la API de Smartsheet
//   SMARTSHEET_SHEET_ID  ID de la hoja (funciona el ID tal como aparece en la URL)
//
// Uso:
//   node --env-file=smartsheet_token.env scripts/sync-roadmap-smartsheet.js          (dry-run, solo imprime)
//   node --env-file=smartsheet_token.env scripts/sync-roadmap-smartsheet.js --write  (escribe roadmap.json)
//
// Reglas de negocio (acordadas con Darío, ver memoria del proyecto):
// - SPI / % actual / % planificado global y por paquete: se toman de las filas
//   "Digitalización Trámites ISSS" (raíz) y "Paquete 1/2/3", nunca recalculados.
// - Columna "Roadmap"="x": selecciona qué actividades se muestran en el gantt de
//   cada paquete. Se recorre el subárbol completo de cada fila "Paquete N"
//   (jerarquía real de Smartsheet vía parentId) y se toma CUALQUIER descendiente
//   marcado, sin detener la recursión al encontrar el primero (permite que un
//   nodo padre y su hijo estén ambos marcados y se muestren como filas separadas).
// - La fila "Paquete N" (resumen) y la fila raíz "Desarrollo" nunca se incluyen
//   en el gantt aunque estén marcadas — no son actividades reales.
// - Hito de liberación por paquete (2026-09-10, corregido 2026-09-10): usar la
//   Fecha Fin de la propia fila "Paquete N" como hito fijo — SIEMPRE visible al
//   final del paquete. Reemplaza al viejo "Productivo controlado" curado a mano.
//   OJO: la fila "Entrega Paquete N -GOES" (usada en un intento anterior) es
//   solo la entrega para pruebas, NO la entrega completa del paquete — Darío
//   lo aclaró y ya no se usa como hito fijo; si tiene Roadmap="x" aparece como
//   una actividad normal más, igual que cualquier otra.
// - "GO LIVE" (fila única a nivel de todo el proyecto, fuera de cualquier
//   Paquete N): hito final único del proyecto completo. Se ancla al final del
//   gantt de Paquete 3 (última entrega) porque el render actual solo soporta
//   gantt por paquete, no un timeline transversal — igual que antes.
// - "Soporte Estabilización" (2026-09-10, decisión de Darío): pasó a ser
//   transversal a todo el proyecto (ya no cuelga de Paquete 3 en el sheet). Se
//   sigue mostrando como última fila del gantt de Paquete 3, después de GO LIVE,
//   por la misma razón de render — es el único lugar donde el portal puede
//   mostrar fechas y avance de una actividad post-liberación.
//
// Todo lo demás del JSON (nombre, color_class, alcance, sprints, pie, badge de
// estado salvo la excepción documentada abajo, transversal[]) es contenido
// curado a mano y este script NO lo toca.

const fs = require('fs');
const path = require('path');

const TOKEN = process.env.SMARTSHEET_TOKEN;
const SHEET_ID = process.env.SMARTSHEET_SHEET_ID;
const WRITE = process.argv.includes('--write');

const ROADMAP_JSON_PATH = path.join(__dirname, '..', 'public', 'data', 'roadmap.json');

const MESES_CORTO_CAP = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
// Minúsculas — mismo formato que usa el frontend (roadmap.js → fmtLong) para
// las fechas visibles en el portal, p.ej. "20 jul 2026".
const MESES_CORTO_MIN = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];

if (!TOKEN || !SHEET_ID) {
  console.error('Faltan SMARTSHEET_TOKEN o SMARTSHEET_SHEET_ID en el entorno.');
  console.error('Ejecutar con: node --env-file=smartsheet_token.env scripts/sync-roadmap-smartsheet.js');
  process.exit(1);
}

async function fetchSheet() {
  const res = await fetch(`https://api.smartsheet.com/2.0/sheets/${SHEET_ID}`, {
    headers: { Authorization: `Bearer ${TOKEN}` }
  });
  if (!res.ok) {
    throw new Error(`Smartsheet API respondió ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

function buildRows(sheet) {
  const colById = {};
  sheet.columns.forEach(c => { colById[c.id] = c.title; });

  const KEY_COLS = ['Proyecto', 'SPI', '% Progreso Actual', '% Progreso Planificado', 'Inicio', 'Final', 'Roadmap'];

  const rows = sheet.rows.map(row => {
    const o = { id: row.id, rowNumber: row.rowNumber, parentId: row.parentId || null };
    row.cells.forEach(cell => {
      const title = colById[cell.columnId];
      if (KEY_COLS.includes(title)) {
        o[title] = cell.displayValue !== undefined ? cell.displayValue : cell.value;
      }
    });
    return o;
  });

  const byId = {};
  rows.forEach(r => { byId[r.id] = r; });
  const childrenOf = {};
  rows.forEach(r => { if (r.parentId) (childrenOf[r.parentId] = childrenOf[r.parentId] || []).push(r); });

  return { rows, byId, childrenOf };
}

function isMarked(row) {
  return /^x$/i.test(String(row['Roadmap'] || '').trim());
}

function pctToNumber(v) {
  if (v === undefined || v === null || v === '') return null;
  const n = parseFloat(String(v).replace('%', '').trim());
  return Number.isNaN(n) ? null : Math.round(n);
}

function spiToNumber(v) {
  if (v === undefined || v === null || v === '') return null;
  const s = String(v).trim();
  if (/^n\.?a\.?$/i.test(s)) return null;
  const n = parseFloat(s);
  return Number.isNaN(n) ? null : n;
}

function dateToISO(v) {
  if (!v) return null;
  const m = String(v).match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : null;
}

function fmtHorizonteLabel(isoStart, isoEnd) {
  const s = new Date(isoStart + 'T00:00:00');
  const e = new Date(isoEnd + 'T00:00:00');
  return `${MESES_CORTO_CAP[s.getMonth()]} – ${MESES_CORTO_CAP[e.getMonth()]} ${e.getFullYear()}`;
}

function fmtLongEs(iso) {
  const d = new Date(iso + 'T00:00:00');
  return `${d.getDate()} ${MESES_CORTO_MIN[d.getMonth()]} ${d.getFullYear()}`;
}

// Recorre el subárbol completo (sin detenerse en el primer match) y devuelve
// todas las filas marcadas Roadmap="x", en cualquier nivel de profundidad.
function collectMarkedDescendants(rootRow, childrenOf) {
  const found = [];
  function walk(row) {
    (childrenOf[row.id] || []).forEach(child => {
      if (isMarked(child)) found.push(child);
      walk(child);
    });
  }
  walk(rootRow);
  return found;
}

function rowToGanttActividad(row, tipo) {
  const item = {
    actividad: row['Proyecto'],
    inicio: dateToISO(row['Inicio']),
    fin: dateToISO(row['Final'])
  };
  if (tipo) {
    item.tipo = tipo;
  } else {
    item.progreso = pctToNumber(row['% Progreso Actual']) ?? 0;
  }
  return item;
}

async function main() {
  const sheet = await fetchSheet();
  const { rows, byId, childrenOf } = buildRows(sheet);

  const root = rows.find(r => r.parentId === null);
  const paqueteRows = {
    P1: rows.find(r => r['Proyecto'] === 'Paquete 1'),
    P2: rows.find(r => r['Proyecto'] === 'Paquete 2'),
    P3: rows.find(r => r['Proyecto'] === 'Paquete 3')
  };
  const goLive = rows.find(r => /^GO LIVE$/i.test(r['Proyecto'] || ''));
  const soporte = rows.find(r => /^Soporte Estabilizaci[oó]n$/i.test(r['Proyecto'] || ''));

  if (!paqueteRows.P1 || !paqueteRows.P2 || !paqueteRows.P3) {
    throw new Error('No se encontraron las 3 filas "Paquete N" en el sheet — revisar estructura antes de continuar.');
  }
  if (!goLive) throw new Error('No se encontró la fila "GO LIVE".');
  if (!soporte) throw new Error('No se encontró la fila "Soporte Estabilización".');

  const current = JSON.parse(fs.readFileSync(ROADMAP_JSON_PATH, 'utf8').replace(/^﻿/, ''));

  // ── META global ──────────────────────────────────────────────────────────
  const goLiveISO = dateToISO(goLive['Inicio']);
  const soporteFinISO = dateToISO(soporte['Final']);
  const gantFinDate = new Date(soporteFinISO + 'T00:00:00');
  gantFinDate.setDate(gantFinDate.getDate() + 7);
  const gantFinISO = gantFinDate.toISOString().slice(0, 10);

  const newMeta = {
    ...current.meta,
    spi_global: spiToNumber(root['SPI']),
    progreso_global: pctToNumber(root['% Progreso Actual']),
    progreso_planif: pctToNumber(root['% Progreso Planificado']),
    liberacion_final: goLiveISO,
    gantt_fin: gantFinISO,
    horizonte: fmtHorizonteLabel(current.meta.gantt_inicio, gantFinISO),
    actualizado: new Date().toISOString().slice(0, 10)
  };

  // ── Por paquete ──────────────────────────────────────────────────────────
  const newPaquetes = current.paquetes.map(pkgActual => {
    const id = pkgActual.id;
    const pRow = paqueteRows[id];

    const marcadas = collectMarkedDescendants(pRow, childrenOf);

    // Quitar de la selección la fila resumen "Paquete N" y la fila raíz
    // "Desarrollo" si aparecieran marcadas (nunca son actividades reales).
    // Esto incluye a "Entrega Paquete N -GOES" si viene marcada: ya no se le
    // da trato especial, es una actividad normal más como cualquier otra.
    const filtradas = marcadas.filter(r =>
      !/^Paquete \d/i.test(r['Proyecto'] || '') &&
      r.id !== root.id
    );

    const actividades = filtradas
      .map(r => rowToGanttActividad(r, null))
      .sort((a, b) => (a.inicio || '').localeCompare(b.inicio || ''));

    // Hito fijo de "entrega completa del paquete": la Fecha Fin de la propia
    // fila "Paquete N" (fila #93/196/230), SIEMPRE visible, marcada o no.
    const finPaqueteRow = { 'Proyecto': 'Entrega completa del paquete', 'Inicio': pRow['Final'], 'Final': pRow['Final'] };
    actividades.push(rowToGanttActividad(finPaqueteRow, 'hito'));
    actividades.sort((a, b) => (a.inicio || '').localeCompare(b.inicio || ''));

    if (id === 'P3') {
      actividades.push(rowToGanttActividad(goLive, 'hito_final'));
      actividades.push(rowToGanttActividad(soporte, null));
    }

    const liberacionISO = dateToISO(pRow['Final']);
    const desarrolloEmpezado = new Date(dateToISO(pRow['Inicio']) + 'T00:00:00') <= new Date();
    const estado = desarrolloEmpezado ? 'En desarrollo' : 'Planificado';
    const badge_class = desarrolloEmpezado ? 'badge-prog' : 'badge-plan';

    // El "pie" de la tarjeta ya no es texto curado a mano: se genera siempre
    // a partir de la Fecha Fin de la fila "Paquete N" (entrega completa del
    // paquete, no la entrega de pruebas a GOES — corregido 2026-09-10 a
    // pedido de Darío).
    const pie = `Entrega completa del paquete — ${fmtLongEs(liberacionISO)}`;

    return {
      ...pkgActual,
      estado,
      badge_class,
      liberacion: liberacionISO,
      progreso: pctToNumber(pRow['% Progreso Actual']),
      spi: spiToNumber(pRow['SPI']),
      progreso_planif: pctToNumber(pRow['% Progreso Planificado']),
      gantt: actividades,
      pie
    };
  });

  const nuevo = { ...current, meta: newMeta, paquetes: newPaquetes };

  // ── Reporte para revisión ────────────────────────────────────────────────
  console.log('=== META ===');
  ['spi_global', 'progreso_global', 'progreso_planif', 'liberacion_final', 'gantt_fin', 'horizonte', 'actualizado'].forEach(k => {
    if (current.meta[k] !== newMeta[k]) console.log(`  ${k}: ${JSON.stringify(current.meta[k])} -> ${JSON.stringify(newMeta[k])}`);
  });

  newPaquetes.forEach((p, i) => {
    const antes = current.paquetes[i];
    console.log(`\n=== ${p.id} — ${p.nombre} ===`);
    ['estado', 'liberacion', 'progreso', 'spi', 'progreso_planif', 'pie'].forEach(k => {
      if (antes[k] !== p[k]) console.log(`  ${k}: ${JSON.stringify(antes[k])} -> ${JSON.stringify(p[k])}`);
    });
    console.log('  gantt (' + p.gantt.length + ' filas):');
    p.gantt.forEach(a => {
      const tag = a.tipo ? `  [${a.tipo}]` : `  ${a.progreso}%`;
      console.log(`    - ${a.actividad}  (${a.inicio} -> ${a.fin})${tag}`);
    });
  });

  if (WRITE) {
    fs.writeFileSync(ROADMAP_JSON_PATH, JSON.stringify(nuevo, null, 2) + '\n', 'utf8');
    console.log('\nEscrito: ' + ROADMAP_JSON_PATH);
  } else {
    console.log('\n(dry-run — nada escrito. Correr con --write para guardar.)');
  }
}

main().catch(e => { console.error('Error:', e.message); process.exit(1); });
