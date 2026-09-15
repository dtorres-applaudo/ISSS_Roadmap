// scripts/sync-avance-producto.js
//
// Genera public/data/avance_producto.json a partir de las hojas Avance_tramite
// y tablas_dinamicas del Sheet "Data - Project ISSS" (el mismo que ya alimenta
// HU_Base/Resumen_Paquetes vía apps-script/capa1-ingesta-devops/Codigo.gs).
//
// A diferencia de Resumen_Paquetes (% de ítems de desarrollo cerrados),
// tablas_dinamicas calcula el avance real del producto con un modelo de
// madurez: aplica un "techo" de avance según el estado de cada ítem
// (Closed/Resolved/Active/New) y pondera Desarrollo (70%) + QA (30%). Este
// script NUNCA recalcula esos porcentajes — los toma tal cual vienen del
// Sheet, igual filosofía que scripts/sync-roadmap-smartsheet.js con el SPI.
//
// Fuente parametrizada vía variables de entorno (ver google_sheets_token.env
// en la raíz del proyecto — NO commitear ese archivo):
//   GOOGLE_SERVICE_ACCOUNT_EMAIL        client_email de la cuenta de servicio
//   GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY  private_key de la cuenta de servicio (PEM)
//   GOOGLE_SHEET_ID                     opcional — por defecto el ID de "Data - Project ISSS"
//
// Setup (una sola vez):
//   1. Crear una cuenta de servicio en Google Cloud (o reutilizar una),
//      habilitar la Google Sheets API, descargar el JSON de credenciales.
//   2. Compartir "Data - Project ISSS" con el client_email de esa cuenta
//      (permiso de solo lectura basta).
//   3. Copiar client_email y private_key al google_sheets_token.env.
//
// Uso:
//   node --env-file=google_sheets_token.env scripts/sync-avance-producto.js          (dry-run, solo imprime)
//   node --env-file=google_sheets_token.env scripts/sync-avance-producto.js --write   (escribe avance_producto.json)
//
// IMPORTANTE — primera corrida: no se pudieron confirmar los nombres exactos
// de columna carácter-por-carácter de tablas_dinamicas (el análisis previo se
// hizo sobre un export aplanado sin encabezados de hoja). Este script imprime
// en dry-run cada bloque que detectó (por firma de encabezado, no por número
// de fila fijo) para que Darío confirme que los 3 paquetes y 26 trámites
// salieron completos antes de aprobar el --write.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const SA_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const SA_KEY = (process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || '').replace(/\\n/g, '\n');
const SHEET_ID = process.env.GOOGLE_SHEET_ID || '1jifTrIT85Lqy_RF1bxhnWAGc8VT44bRENGf3J8yOlzI';
const WRITE = process.argv.includes('--write');

const OUT_PATH = path.join(__dirname, '..', 'public', 'data', 'avance_producto.json');

if (!SA_EMAIL || !SA_KEY) {
  console.error('Faltan GOOGLE_SERVICE_ACCOUNT_EMAIL o GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY en el entorno.');
  console.error('Ejecutar con: node --env-file=google_sheets_token.env scripts/sync-avance-producto.js');
  process.exit(1);
}

// ---------------------------------------------------------------------------
// AUTH — JWT de cuenta de servicio, sin librerías externas (crypto nativo)
// ---------------------------------------------------------------------------

function base64url(input) {
  return Buffer.from(input).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function getAccessToken() {
  const header = { alg: 'RS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const claims = {
    iss: SA_EMAIL,
    scope: 'https://www.googleapis.com/auth/spreadsheets.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600
  };
  const unsigned = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(claims))}`;
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(unsigned);
  sign.end();
  const signature = sign.sign(SA_KEY).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const jwt = `${unsigned}.${signature}`;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt
    })
  });
  if (!res.ok) throw new Error(`OAuth token respondió ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.access_token;
}

async function fetchRange(token, range) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(range)}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`Sheets API respondió ${res.status} para "${range}": ${await res.text()}`);
  const data = await res.json();
  return data.values || [];
}

// ---------------------------------------------------------------------------
// HELPERS de parseo — nunca por número de fila fijo, siempre por firma de
// encabezado (mismo criterio que sync-roadmap-smartsheet.js con parentId).
// ---------------------------------------------------------------------------

function norm(s) {
  return String(s == null ? '' : s).trim().toLowerCase();
}

function pctToNumber(v) {
  if (v === undefined || v === null || v === '') return null;
  const n = parseFloat(String(v).replace('%', '').replace(',', '.').trim());
  return Number.isNaN(n) ? null : n;
}

function isBlankRow(row) {
  return !row || row.every(c => norm(c) === '');
}

// Encuentra la primera fila que contenga TODOS los textos dados (substring,
// insensible a mayúsculas) en alguna de sus celdas — esa fila se asume el
// encabezado de un bloque de tabla dinámica.
function findHeaderRow(rows, mustContain) {
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (isBlankRow(row)) continue;
    const joined = row.map(norm).join(' | ');
    if (mustContain.every(txt => joined.includes(norm(txt)))) return i;
  }
  return -1;
}

// Lee un bloque de tabla dinámica a partir de su fila de encabezado (índice
// headerIdx), zipeando cada fila siguiente contra el texto de encabezado real
// de cada columna, hasta la primera fila en blanco o el fin del rango.
function readBlock(rows, headerIdx) {
  if (headerIdx < 0) return { headers: [], rows: [] };
  const headers = rows[headerIdx].map(h => String(h || '').trim());
  const out = [];
  for (let i = headerIdx + 1; i < rows.length; i++) {
    if (isBlankRow(rows[i])) break;
    const obj = {};
    headers.forEach((h, j) => { if (h) obj[h] = rows[i][j]; });
    out.push(obj);
  }
  return { headers, rows: out };
}

function col(obj, ...candidates) {
  const keys = Object.keys(obj);
  for (const wanted of candidates) {
    const found = keys.find(k => norm(k) === norm(wanted));
    if (found !== undefined) return obj[found];
  }
  return undefined;
}

// Nombres de paquete: son config estable del proyecto (iguales a
// PAQUETES_CAPA1 en apps-script/capa1-ingesta-devops/Codigo.gs), no cambian
// entre corridas. Se usan solo si no se logra leer el catálogo del Sheet.
const PAQUETE_NOMBRES_FALLBACK = {
  P1: 'Constancias, Certificados e Inscripciones',
  P2: 'Modificaciones, Anulaciones y Devoluciones',
  P3: 'Inspecciones y Prestaciones Económicas'
};

// Parámetros del modelo de madurez confirmados con Darío (ver plan de la
// pestaña Avance de Producto). Se usan solo si no se logran leer desde
// tablas_dinamicas — si el Sheet los trae, esos mandan.
const PARAMETROS_FALLBACK = {
  techos: { closed: 100, resolved: 95, active: 85, new: 60 },
  peso_desarrollo: 70,
  peso_qa: 30
};

// ---------------------------------------------------------------------------
// MAIN
// ---------------------------------------------------------------------------

async function main() {
  const token = await getAccessToken();

  const tramiteRows = await fetchRange(token, 'Avance_tramite!A1:R300');
  const pivotRows = await fetchRange(token, 'tablas_dinamicas!A1:Z300');

  if (!tramiteRows.length) throw new Error('Avance_tramite vino vacío — revisar nombre de la hoja/rango.');
  if (!pivotRows.length) throw new Error('tablas_dinamicas vino vacío — revisar nombre de la hoja/rango.');

  // Diagnóstico: Avance_tramite tiene el mismo número de filas que trámites
  // (26), no de HUs — imprimir su encabezado real y una fila de ejemplo para
  // poder mapear sus columnas correctamente (no asumir nombres a ciegas).
  console.log(`Avance_tramite: encabezado -> ${(tramiteRows[0] || []).join(' | ')}`);
  console.log(`Avance_tramite: ${tramiteRows.length - 1} filas de datos. Fila 1 de ejemplo:`, JSON.stringify(tramiteRows[1] || []));
  console.log(`tablas_dinamicas: ${pivotRows.length} filas crudas leídas — detectando bloques…\n`);

  const tramiteSheetHeaders = (tramiteRows[0] || []).map(h => String(h || '').trim());
  const tramiteSheetRows = tramiteRows.slice(1).filter(r => !isBlankRow(r)).map(r => {
    const obj = {};
    tramiteSheetHeaders.forEach((h, j) => { if (h) obj[h] = r[j]; });
    return obj;
  });
  const tramiteSheetByNombre = {};
  tramiteSheetRows.forEach(r => {
    const nombre = col(r, 'Nombre de Trámite', 'Trámite', 'Nombre');
    if (nombre) tramiteSheetByNombre[norm(nombre)] = r;
  });

  // ── Parámetros del modelo (techos por estado + pesos Desarrollo/QA) ──────
  // Si el Sheet no los trae en un formato reconocible, se usan los valores
  // confirmados con Darío (PARAMETROS_FALLBACK) — nunca se inventan.
  const parametros = { techos: {}, peso_desarrollo: null, peso_qa: null };
  pivotRows.forEach(row => {
    if (isBlankRow(row)) return;
    const etiqueta = norm(row[0]);
    const valor = pctToNumber(row[1]);
    if (valor === null) return;
    if (etiqueta.includes('techo closed')) parametros.techos.closed = valor;
    else if (etiqueta.includes('techo resolved')) parametros.techos.resolved = valor;
    else if (etiqueta.includes('techo active')) parametros.techos.active = valor;
    else if (etiqueta.includes('techo new')) parametros.techos.new = valor;
    else if (etiqueta.includes('peso desarrollo')) parametros.peso_desarrollo = valor;
    else if (etiqueta.includes('peso qa')) parametros.peso_qa = valor;
  });
  const parametrosCompletos = parametros.techos.closed !== undefined && parametros.techos.resolved !== undefined
    && parametros.techos.active !== undefined && parametros.techos.new !== undefined
    && parametros.peso_desarrollo !== null && parametros.peso_qa !== null;
  if (!parametrosCompletos) {
    console.warn('⚠ No se encontraron los parámetros del modelo en tablas_dinamicas — usando los valores por defecto confirmados con Darío.');
  }
  const parametrosFinal = parametrosCompletos ? parametros : PARAMETROS_FALLBACK;
  console.log('Parámetros del modelo:', JSON.stringify(parametrosFinal), parametrosCompletos ? '(del Sheet)' : '(fallback)');

  // ── Bloque "Resumen por Trámite" (26 filas) ──────────────────────────────
  const tramiteHeaderIdx = findHeaderRow(pivotRows, ['Nombre de Trámite', '% Peso']);
  const tramiteBlock = readBlock(pivotRows, tramiteHeaderIdx);
  console.log(`\nBloque "Resumen por Trámite" — encabezado en fila ${tramiteHeaderIdx + 1}, ${tramiteBlock.rows.length} trámites:`);
  console.log('  columnas:', tramiteBlock.headers.filter(Boolean).join(' | '));

  // aporte_desarrollo/aporte_qa/hu_count/hijos_total no vienen en este bloque
  // reducido de tablas_dinamicas — si existen en Avance_tramite (mismo
  // trámite, por nombre), se completan desde ahí; si no, quedan null/0 y se
  // ve reflejado en el dry-run para decidir cómo ajustarlo.
  const tramites = tramiteBlock.rows.map(r => {
    const nombre = col(r, 'Nombre de Trámite');
    const extra = tramiteSheetByNombre[norm(nombre)] || {};
    return {
      paquete: col(r, 'Paquete'),
      orden: parseInt(col(r, 'No'), 10) || null,
      nombre: nombre,
      hu_count: parseInt(col(extra, 'N° HU Asociadas', 'N HU Asociadas', 'HU Asociadas'), 10) || 0,
      hijos_total: parseInt(col(extra, 'Ítems Hijos (Tot.)', 'Items Hijos (Tot.)', 'Hijos Total', 'hijos_total'), 10) || 0,
      avance_total: pctToNumber(col(r, '% Avance Total')),
      aporte_desarrollo: pctToNumber(col(extra, '% Aporte Desarrollo', 'Aporte Desarrollo')),
      aporte_qa: pctToNumber(col(extra, '% Aporte QA', 'Aporte QA')),
      peso: pctToNumber(col(r, '% Peso'))
    };
  }).filter(t => t.nombre);

  // ── Bloque "Porcentaje de Avance por Paquete" (3 filas: P1/P2/P3) ────────
  const paqueteHeaderIdx = findHeaderRow(pivotRows, ['Paquete', '% Peso']);
  // Puede coincidir con el mismo encabezado del bloque de trámites si comparten
  // texto — buscar el siguiente que NO tenga "Nombre de Trámite".
  let pIdx = paqueteHeaderIdx;
  while (pIdx >= 0 && pivotRows[pIdx].some(c => norm(c).includes('nombre de trámite'))) {
    pIdx = findHeaderRow(pivotRows.slice(pIdx + 1), ['Paquete', '% Peso']);
    if (pIdx >= 0) pIdx += paqueteHeaderIdx + 1;
  }
  const paqueteBlock = readBlock(pivotRows, pIdx);
  console.log(`\nBloque "Avance por Paquete" — encabezado en fila ${pIdx + 1}, ${paqueteBlock.rows.length} paquetes:`);
  console.log('  columnas:', paqueteBlock.headers.filter(Boolean).join(' | '));

  // ── Catálogo de paquetes (solo para el nombre — el "rag" de Resumen_Paquetes
  // es del avance de desarrollo puro, no del modelo ponderado de esta pestaña,
  // así que NO se mezcla aquí; el semáforo se calcula en el frontend a partir
  // de avance_total, igual que el resto del portal). El nombre exige encabezado
  // "paquete" en su PRIMERA celda (no basta con contenerlo) para no confundirse
  // con el bloque de paquetes, cuyo tercer encabezado incluye la palabra
  // "producto" dentro de una frase larga. Si no se encuentra, se usa
  // PAQUETE_NOMBRES_FALLBACK (son config estable, ver Codigo.gs). ──────────
  const nombreHeaderIdx = pivotRows.findIndex(row =>
    !isBlankRow(row) && norm(row[0]) === 'paquete' && row.some(c => norm(c).includes('fecha_entrega') || norm(c) === 'nombre')
  );
  const nombreBlock = readBlock(pivotRows, nombreHeaderIdx);
  const nombreByPaquete = {};
  nombreBlock.rows.forEach(r => { nombreByPaquete[col(r, 'paquete')] = col(r, 'nombre'); });

  const paquetes = paqueteBlock.rows.map(r => {
    const id = col(r, 'Paquete');
    return {
      paquete: id,
      nombre: nombreByPaquete[id] || PAQUETE_NOMBRES_FALLBACK[id] || null,
      avance_total: pctToNumber(col(r, '% Avance Total (ponderado por N° HU)', '% Avance Total')),
      peso: pctToNumber(col(r, '% Peso (participación en el producto)', '% Peso'))
    };
  }).filter(p => p.paquete);

  // ── Bloque "Avance por Producto (Total)" (1 fila) ────────────────────────
  // El primer celda de esta fila debe ser literalmente "Producto" (no basta
  // con que la palabra aparezca en otra columna, como pasaba con "% Peso
  // (participación en el producto)" del bloque de paquetes, que producía un
  // falso positivo). Si no existe esta fila en el Sheet, se calcula como
  // promedio ponderado de los paquetes ya obtenidos (misma aritmética que
  // "ponderado por N° HU/peso" que ya trae el propio Sheet, no es una fórmula
  // nueva) — el aporte Desarrollo/QA del producto sí queda null si no viene
  // del Sheet, porque esa curva no se puede derivar solo del avance_total.
  const productoHeaderIdx = pivotRows.findIndex(row => !isBlankRow(row) && norm(row[0]) === 'producto');
  const productoBlock = readBlock(pivotRows, productoHeaderIdx);
  const productoRow = productoBlock.rows[0] || {};
  let producto = {
    avance_total: pctToNumber(col(productoRow, '% Avance Total (ponderado)', '% Avance Total')),
    aporte_desarrollo: pctToNumber(col(productoRow, '% Aporte Desarrollo (de 70%)', '% Aporte Desarrollo')),
    aporte_qa: pctToNumber(col(productoRow, '% Aporte QA (de 30%)', '% Aporte QA'))
  };
  if (producto.avance_total === null && paquetes.length) {
    const pesoTotal = paquetes.reduce((s, p) => s + (parseFloat(p.peso) || 0), 0) || 100;
    const avancePonderado = paquetes.reduce((s, p) => s + (parseFloat(p.avance_total) || 0) * (parseFloat(p.peso) || 0), 0) / pesoTotal;
    producto = { ...producto, avance_total: Math.round(avancePonderado * 10) / 10 };
    console.warn('⚠ No se encontró la fila "Producto (Total)" en tablas_dinamicas — avance_total del producto se calculó como promedio ponderado por peso de los 3 paquetes (aporte_desarrollo/aporte_qa quedan null).');
  }
  console.log(`\nBloque "Avance por Producto" — encabezado en fila ${productoHeaderIdx + 1}:`, JSON.stringify(producto));

  console.log(`\n=== RESUMEN ===`);
  console.log(`Paquetes detectados: ${paquetes.length} (esperado: 3)`);
  console.log(`Trámites detectados: ${tramites.length} (esperado: 26)`);
  paquetes.forEach(p => console.log(`  ${p.paquete} — ${p.nombre}: avance ${p.avance_total}%, peso ${p.peso}%`));
  const tramitesSinAporte = tramites.filter(t => t.aporte_desarrollo === null).length;
  if (tramitesSinAporte) console.warn(`⚠ ${tramitesSinAporte}/${tramites.length} trámites sin aporte_desarrollo/aporte_qa (no se encontró esa columna ni en tablas_dinamicas ni en Avance_tramite por nombre de trámite) — revisar el encabezado real de Avance_tramite impreso arriba.`);

  if (paquetes.length !== 3) console.warn('\n⚠ No se detectaron exactamente 3 paquetes — revisar encabezados de tablas_dinamicas antes de --write.');
  if (tramites.length === 0) console.warn('\n⚠ No se detectó ningún trámite — revisar encabezados de tablas_dinamicas antes de --write.');

  const out = {
    meta: {
      actualizado: new Date().toISOString().slice(0, 10),
      parametros: parametrosFinal
    },
    producto,
    paquetes,
    tramites
  };

  if (WRITE) {
    // Guarda de seguridad para la corrida diaria desatendida (Programador de
    // tareas de Windows, sin revisión humana): si el Sheet cambió de forma
    // que ya no detectamos los 3 paquetes o ningún trámite, es preferible
    // dejar el JSON anterior intacto (con datos de ayer) a sobrescribirlo con
    // algo incompleto. El log queda en scripts/sync-avance-producto.log para
    // que Darío lo revise cuando quiera.
    if (paquetes.length !== 3 || tramites.length === 0) {
      console.error(`\n✗ No se escribió el JSON: se esperaban 3 paquetes y al menos 1 trámite, se detectaron ${paquetes.length} paquetes y ${tramites.length} trámites. Revisar la estructura de tablas_dinamicas/Avance_tramite.`);
      process.exit(1);
    }
    fs.writeFileSync(OUT_PATH, JSON.stringify(out, null, 2) + '\n', 'utf8');
    console.log('\nEscrito: ' + OUT_PATH);
  } else {
    console.log('\n(dry-run — nada escrito. Revisar el resumen arriba y correr con --write para guardar.)');
  }
}

main().catch(e => { console.error('Error:', e.message); process.exit(1); });
