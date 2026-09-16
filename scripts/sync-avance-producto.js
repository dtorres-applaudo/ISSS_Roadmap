// scripts/sync-avance-producto.js
//
// Genera public/data/avance_producto.json a partir de las hojas 'avance_tramite'
// y 'datos_hu' del Sheet "Data - Project ISSS" — modelo de complejidad v2
// (ver bloque "Avance por Trámite v2" del Apps Script del Sheet: horas
// esperadas por talla/desglose real, multiplicador por complejidad, techos
// por estado, ponderación Desarrollo 70% + QA 30%).
//
// 'avance_tramite' ya es una hoja plana (1 fila = 1 trámite, 26 filas) con
// TODO lo necesario por trámite: paquete, nombre, % Avance Total, % Peso,
// % Aporte Desarrollo/QA — este script NUNCA recalcula esos porcentajes, los
// toma tal cual vienen del Sheet. Paquete y Producto se obtienen agregando
// esos mismos valores ya calculados (promedio ponderado por "% Peso", la
// misma aritmética que usan las tablas 2/3 de 'tablas_dinamicas' del propio
// Sheet) — no es una fórmula nueva, es la misma que el Sheet ya aplica.
//
// Fuente parametrizada vía variables de entorno (ver google_sheets_token.env
// en la raíz del proyecto — NO commitear ese archivo):
//   GOOGLE_SERVICE_ACCOUNT_EMAIL        client_email de la cuenta de servicio
//   GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY  private_key de la cuenta de servicio (PEM)
//   GOOGLE_SHEET_ID                     opcional — por defecto el ID de "Data - Project ISSS"
//
// Uso:
//   node --env-file=google_sheets_token.env scripts/sync-avance-producto.js          (dry-run, solo imprime)
//   node --env-file=google_sheets_token.env scripts/sync-avance-producto.js --write   (escribe avance_producto.json)

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Tolerante a errores comunes de copiar/pegar la llave en un Secret de
// GitHub Actions o en el .env local: comillas envolventes de más, espacios
// en blanco al inicio/fin, \n literales en vez de saltos de línea reales.
function normalizarPrivateKey(raw) {
  let k = String(raw || '').trim();
  if ((k.startsWith('"') && k.endsWith('"')) || (k.startsWith("'") && k.endsWith("'"))) {
    k = k.slice(1, -1);
  }
  return k.replace(/\\n/g, '\n').trim();
}

const SA_EMAIL = (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || '').trim();
const SA_KEY = normalizarPrivateKey(process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY);
const SHEET_ID = process.env.GOOGLE_SHEET_ID || '1jifTrIT85Lqy_RF1bxhnWAGc8VT44bRENGf3J8yOlzI';
const WRITE = process.argv.includes('--write');

const OUT_PATH = path.join(__dirname, '..', 'public', 'data', 'avance_producto.json');

if (!SA_EMAIL || !SA_KEY) {
  console.error('Faltan GOOGLE_SERVICE_ACCOUNT_EMAIL o GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY en el entorno.');
  console.error('Ejecutar con: node --env-file=google_sheets_token.env scripts/sync-avance-producto.js');
  process.exit(1);
}
if (!SA_KEY.includes('BEGIN PRIVATE KEY') && !SA_KEY.includes('BEGIN RSA PRIVATE KEY')) {
  console.error('GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY no tiene forma de llave PEM (falta "-----BEGIN PRIVATE KEY-----").');
  console.error('Revisar que el Secret/variable tenga SOLO el valor de private_key del JSON de la cuenta de servicio,');
  console.error('sin comillas alrededor ni el nombre de la variable, y con los saltos de línea (\\n) intactos.');
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
// HELPERS
// ---------------------------------------------------------------------------

function norm(s) {
  return String(s == null ? '' : s).trim().toLowerCase();
}

function pctToNumber(v) {
  if (v === undefined || v === null || v === '') return null;
  const n = parseFloat(String(v).replace('%', '').replace(',', '.').trim());
  return Number.isNaN(n) ? null : n;
}

function numOrNull(v) {
  if (v === undefined || v === null || v === '') return null;
  const n = parseFloat(String(v).replace(',', '.').trim());
  return Number.isNaN(n) ? null : n;
}

function isBlankRow(row) {
  return !row || row.every(c => norm(c) === '');
}

// Busca una columna por nombre exacto (insensible a mayúsculas/tildes de caja,
// no a tildes en sí) entre varios candidatos — para tolerar variaciones
// menores de redacción del encabezado real sin adivinar posiciones de fila.
function col(obj, ...candidates) {
  const keys = Object.keys(obj);
  for (const wanted of candidates) {
    const found = keys.find(k => norm(k) === norm(wanted));
    if (found !== undefined) return obj[found];
  }
  return undefined;
}

function rowsToObjects(rawRows) {
  const headers = (rawRows[0] || []).map(h => String(h || '').trim());
  const rows = rawRows.slice(1).filter(r => !isBlankRow(r)).map(r => {
    const obj = {};
    headers.forEach((h, j) => { if (h) obj[h] = r[j]; });
    return obj;
  });
  return { headers, rows };
}

// Nombres de paquete: config estable del proyecto (igual a PAQUETES_CAPA1 en
// apps-script/capa1-ingesta-devops/Codigo.gs) — 'avance_tramite' solo trae el
// código (P1/P2/P3), no el nombre largo del paquete.
const PAQUETE_NOMBRES_FALLBACK = {
  P1: 'Constancias, Certificados e Inscripciones',
  P2: 'Modificaciones, Anulaciones y Devoluciones',
  P3: 'Inspecciones y Prestaciones Económicas'
};

// Parámetros del modelo de madurez confirmados con Darío — se usan solo si no
// se logran leer desde 'datos_hu' (celdas B2:B7). Si el Sheet los trae, esos
// mandan.
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

  // Rango con margen deliberado (Z, no la última columna real) — si se
  // agregan columnas nuevas al Sheet (como pasó con "Grupo" el 2026-09-16,
  // que corrió "% Peso" una columna a la derecha), esto evita que el fetch
  // las corte de nuevo. Las columnas se leen siempre por nombre, no por
  // posición, así que un margen amplio no cambia el resultado.
  const tramiteRaw = await fetchRange(token, 'avance_tramite!A1:Z200');
  const paramRaw = await fetchRange(token, 'datos_hu!A1:B10');

  if (!tramiteRaw.length) throw new Error("'avance_tramite' vino vacío — revisar nombre de la hoja/rango.");

  const { headers, rows } = rowsToObjects(tramiteRaw);
  console.log(`avance_tramite: encabezado -> ${headers.join(' | ')}`);
  console.log(`avance_tramite: ${rows.length} filas de datos.`);

  // ── Parámetros del modelo (techos por estado + pesos Desarrollo/QA) ──────
  // Viven en 'datos_hu'!B2:B7 (etiquetas tipo "Techo — Closed", "Peso QA").
  const parametros = { techos: {}, peso_desarrollo: null, peso_qa: null };
  paramRaw.forEach(row => {
    if (isBlankRow(row)) return;
    const etiqueta = norm(row[0]);
    const valor = pctToNumber(row[1]);
    if (valor === null) return;
    if (etiqueta.includes('techo') && etiqueta.includes('closed')) parametros.techos.closed = valor;
    else if (etiqueta.includes('techo') && etiqueta.includes('resolved')) parametros.techos.resolved = valor;
    else if (etiqueta.includes('techo') && etiqueta.includes('active')) parametros.techos.active = valor;
    else if (etiqueta.includes('techo') && etiqueta.includes('new')) parametros.techos.new = valor;
    else if (etiqueta.includes('peso') && etiqueta.includes('desarrollo')) parametros.peso_desarrollo = valor;
    else if (etiqueta.includes('peso') && etiqueta.includes('qa')) parametros.peso_qa = valor;
  });
  const parametrosCompletos = parametros.techos.closed !== undefined && parametros.techos.resolved !== undefined
    && parametros.techos.active !== undefined && parametros.techos.new !== undefined
    && parametros.peso_desarrollo !== null && parametros.peso_qa !== null;
  if (!parametrosCompletos) {
    console.warn("⚠ No se encontraron los parámetros del modelo en 'datos_hu' — usando los valores por defecto confirmados con Darío.");
  }
  const parametrosFinal = parametrosCompletos ? parametros : PARAMETROS_FALLBACK;
  console.log('Parámetros del modelo:', JSON.stringify(parametrosFinal), parametrosCompletos ? '(del Sheet)' : '(fallback)');

  // ── Trámites (1 fila = 1 trámite, ya viene todo calculado) ───────────────
  // "Grupo" (agregado 2026-09-16): trámites que se desarrollan en paralelo
  // comparten el mismo código de grupo (ej. "T01") — se guarda tal cual, no
  // se usa para recalcular nada; es informativo por ahora.
  const tramites = rows.map(r => ({
    paquete: col(r, 'Paquete'),
    orden: parseInt(col(r, 'No'), 10) || null,
    nombre: col(r, 'Nombre de Trámite'),
    grupo: col(r, 'Grupo') || null,
    hu_count: parseInt(col(r, 'N° HU (grupo)', 'N° HU', 'N HU'), 10) || 0,
    tareas_construccion: parseInt(col(r, 'Tareas Constr.', 'Tareas Construcción'), 10) || 0,
    bugs: parseInt(col(r, 'Bugs'), 10) || 0,
    horas_esperadas: numOrNull(col(r, 'Horas Esperadas')),
    multiplicador: numOrNull(col(r, 'Multiplicador')),
    horas_ponderadas: numOrNull(col(r, 'Horas Ponderadas')),
    avance_desarrollo: pctToNumber(col(r, '% Desarrollo')),
    aprobado_qa: col(r, 'Aprobado por QA') || null,
    aporte_desarrollo: pctToNumber(col(r, '% Aporte Desarrollo')),
    aporte_qa: pctToNumber(col(r, '% Aporte QA')),
    avance_total: pctToNumber(col(r, '% Avance Total')),
    peso: pctToNumber(col(r, '% Peso'))
  })).filter(t => t.nombre);

  const camposClave = ['avance_total', 'peso', 'aporte_desarrollo', 'aporte_qa'];
  camposClave.forEach(campo => {
    const faltantes = tramites.filter(t => t[campo] === null).length;
    if (faltantes) console.warn(`⚠ ${faltantes}/${tramites.length} trámites sin "${campo}" — revisar el encabezado real impreso arriba (los nombres de columna pueden haber cambiado).`);
  });

  // ── Paquetes y Producto: promedio ponderado por "% Peso" de cada trámite —
  // misma aritmética que las tablas 2/3 de 'tablas_dinamicas' del Sheet
  // (SUMPRODUCT(Horas Ponderadas × valor) / SUMA(Horas Ponderadas)), pero
  // usando directamente el "% Peso" ya calculado por trámite en vez de volver
  // a leer Horas Ponderadas — es la misma proporción, un valor menos que
  // depender de parsear. No es una fórmula nueva, es agregar valores que el
  // Sheet ya calculó, tal como se agregan en sus propias tablas dinámicas. ──
  function promedioPonderado(lista, campo) {
    let sumaPeso = 0, sumaPonderada = 0;
    lista.forEach(t => {
      const peso = parseFloat(t.peso) || 0;
      const valor = parseFloat(t[campo]);
      if (!Number.isNaN(valor)) { sumaPonderada += valor * peso; sumaPeso += peso; }
    });
    return sumaPeso > 0 ? Math.round((sumaPonderada / sumaPeso) * 10) / 10 : null;
  }

  const paquetesIds = Array.from(new Set(tramites.map(t => t.paquete).filter(Boolean))).sort();
  const paquetes = paquetesIds.map(id => {
    const grupo = tramites.filter(t => t.paquete === id);
    const pesoGrupo = grupo.reduce((s, t) => s + (parseFloat(t.peso) || 0), 0);
    return {
      paquete: id,
      nombre: PAQUETE_NOMBRES_FALLBACK[id] || null,
      avance_total: promedioPonderado(grupo, 'avance_total'),
      peso: Math.round(pesoGrupo * 10) / 10
    };
  });

  const producto = {
    avance_total: promedioPonderado(tramites, 'avance_total'),
    aporte_desarrollo: promedioPonderado(tramites, 'aporte_desarrollo'),
    aporte_qa: promedioPonderado(tramites, 'aporte_qa')
  };

  console.log(`\n=== RESUMEN ===`);
  console.log(`Paquetes detectados: ${paquetes.length} (esperado: 3)`);
  console.log(`Trámites detectados: ${tramites.length} (esperado: 26)`);
  paquetes.forEach(p => console.log(`  ${p.paquete} — ${p.nombre}: avance ${p.avance_total}%, peso ${p.peso}%`));
  console.log(`  Producto — avance ${producto.avance_total}%, aporte Desarrollo ${producto.aporte_desarrollo}%, aporte QA ${producto.aporte_qa}%`);

  if (paquetes.length !== 3) console.warn('\n⚠ No se detectaron exactamente 3 paquetes — revisar la columna "Paquete" de avance_tramite antes de --write.');
  if (tramites.length === 0) console.warn('\n⚠ No se detectó ningún trámite — revisar el encabezado de avance_tramite antes de --write.');

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
      console.error(`\n✗ No se escribió el JSON: se esperaban 3 paquetes y al menos 1 trámite, se detectaron ${paquetes.length} paquetes y ${tramites.length} trámites. Revisar la estructura de avance_tramite/datos_hu.`);
      process.exit(1);
    }
    fs.writeFileSync(OUT_PATH, JSON.stringify(out, null, 2) + '\n', 'utf8');
    console.log('\nEscrito: ' + OUT_PATH);
  } else {
    console.log('\n(dry-run — nada escrito. Revisar el resumen arriba y correr con --write para guardar.)');
  }
}

main().catch(e => { console.error('Error:', e.message); process.exit(1); });
