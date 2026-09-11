/**
 * ISSS-SYDT · Capa 1 — Ingesta y clasificación de HUs
 * Consulta Azure DevOps, clasifica las User Story por paquete (P1/P2/P3) usando
 * la tabla de mapeo de este archivo (NUNCA los tags de DevOps) y escribe el
 * resultado en las hojas HU_Base, Resumen_Paquetes y Alertas de este Sheet.
 *
 * Setup (una sola vez):
 * 1. Extensiones → Apps Script en este Sheet, pegar este archivo como Codigo.gs.
 * 2. Configuración del proyecto → Propiedades del script → agregar AZDO_PAT
 *    (Personal Access Token de Azure DevOps, scope "Work Items (Read)").
 * 3. Configuración del proyecto → Zona horaria del proyecto → America/El_Salvador.
 * 4. Ejecutar crearTriggerDiario() una vez (o Ejecutar → esa función) para
 *    programar la corrida diaria a las 06:00 hora El Salvador.
 * 5. Recargar el Sheet: aparece el menú "ISSS-SYDT → Actualizar backlog".
 */

// ---------------------------------------------------------------------------
// CONFIGURACIÓN
// ---------------------------------------------------------------------------

var CONFIG = {
  SPREADSHEET_ID: '1jifTrIT85Lqy_RF1bxhnWAGc8VT44bRENGf3J8yOlzI',
  ORG_URL: 'https://dev.azure.com/TCASoftwareSolutions/ISSS-SYDT/_apis',
  PROJECT: 'ISSS-SYDT',
  // Único filtro de ruido del universo de HUs. Si el equipo crea HUs fuera de
  // esta área, el script no las verá (V1 no las reportará: nunca entran al universo).
  AREA_PATH: 'ISSS-SYDT\\Epics\\Features\\User Stories',
  TZ: 'America/El_Salvador',
  SHEETS: {
    HU_BASE: 'HU_Base',
    RESUMEN: 'Resumen_Paquetes',
    ALERTAS: 'Alertas',
    ENTREGAS: 'Entregas_Paquetes'
  },
  // Valor esperado de control para la alerta V9 (sección 6.6 de la especificación):
  // si alguien edita Entregas_Paquetes con una fecha distinta a esta, se alerta.
  // Tomado del xlsx "entregas_por_paquetes" (mismas fechas que ya usa el portal hoy).
  FECHAS_ESPERADAS: { P1: '2026-09-16', P2: '2026-10-19', P3: '2026-11-16' }
};

// Nota: se llama PAQUETES_CAPA1 (no PAQUETES) porque este proyecto de Apps
// Script ya tiene un identificador global `PAQUETES` con otro propósito
// (mapeo HU→paquete usado en la pestaña "config" del script existente).
var PAQUETES_CAPA1 = {
  P1: { nombre: 'Constancias, Certificados e Inscripciones' },
  P2: { nombre: 'Modificaciones, Anulaciones y Devoluciones' },
  P3: { nombre: 'Inspecciones y Prestaciones Económicas' }
};

var TRAMITES = [
  // ---------- Paquete 1 (13 HUs) ----------
  { t: 'T01',   paquete: 'P1', pr: 'PR01',   nombre: 'Inscripción de patronos',
    hus: ['HU-005', 'HU-005.1'] },
  { t: 'T04',   paquete: 'P1', pr: 'PR01',   nombre: 'Inscripción de trabajadores',
    hus: ['HU-006', 'HU-006.1', 'HU-006.2', 'HU-006.3'] },
  { t: 'T06',   paquete: 'P1', pr: 'PR01',   nombre: 'Inscripción de beneficiario esposo/a o compañero/a de vida',
    hus: ['HU-007'] },
  { t: 'T07',   paquete: 'P1', pr: 'PR01',   nombre: 'Inscripción de beneficiario hijo/a de 0 a 18 años',
    hus: ['HU-008'] },
  { t: 'T11',   paquete: 'P1', pr: 'PR04',   nombre: 'Constancias a trabajadores no inscritos en el ISSS',
    hus: ['HU-014'] },
  { t: 'T11.1', paquete: 'P1', pr: 'PR04',   nombre: 'Constancias a trabajadores no inscritos apostillado (modalidad de T11)',
    hus: ['HU-014.1'] },
  { t: 'T17',   paquete: 'P1', pr: 'PR04',   nombre: 'Historial de cuenta individual',
    hus: ['HU-015'] },
  { t: 'T26',   paquete: 'P1', pr: 'PR04',   nombre: 'Emisión de constancias de no cotizantes',
    hus: ['HU-018'] },
  { t: 'T18.1', paquete: 'P1', pr: 'PR04',   nombre: 'Emisión de constancias de no cotizantes salvadoreños exterior (modalidad de T26)',
    hus: ['HU-018.1'] },

  // ---------- Paquete 2 (18 HUs) ----------
  { t: 'T02',   paquete: 'P2', pr: 'PR02',   nombre: 'Modificación en la inscripción de patronos',
    hus: ['HU-009', 'HU-009.1'] },
  { t: 'T03',   paquete: 'P2', pr: 'PR03',   nombre: 'Registro de pasividad o de reanudación de labores del patrono',
    hus: ['HU-013', 'HU-013.1', 'HU-013.2'] },
  { t: 'T05',   paquete: 'P2', pr: 'PR02',   nombre: 'Modificación de información del derechohabiente',
    hus: ['HU-010'] },
  { t: 'T09',   paquete: 'P2', pr: 'PR02',   nombre: 'Renovación de tarjetas (patrono, niños, trabajador extranjero)',
    hus: ['HU-011'] },
  { t: 'T12',   paquete: 'P2', pr: 'PR02.1', nombre: 'Anulación de inscripciones',
    hus: ['HU-012', 'HU-012.1'] },
  { t: 'T18',   paquete: 'P2', pr: 'PR04.2', nombre: 'Certificado Único de Cesantía',
    hus: ['HU-016', 'HU-016.1'],
    pendiente: 'HU-016.1 "Administrador de documentos" podría ser transversal a toda la emisión de documentos (tiene el bug 8147 sobre emisión de no inscritos, que es T11). Confirmar.' },
  { t: 'T24',   paquete: 'P2', pr: 'PR06',   nombre: 'Solicitud de devolución de cotizaciones pagadas en exceso',
    hus: ['HU-022', 'HU-022.1', 'HU-022.2', 'HU-023'] },
  { t: 'T25',   paquete: 'P2', pr: 'PR04.1', nombre: 'Solicitud de información de instituciones públicas',
    hus: ['HU-017', 'HU-017.1', 'HU-017.2'] },
  { t: 'T23',   paquete: 'P2', pr: 'PR06',   nombre: 'Solicitud notas de abono patronal',
    hus: [],
    pendiente: 'Sin HU asignada. Definir si es alcance de HU-022 o requiere HU propia.' },

  // ---------- Paquete 3 (18 HUs con trámite + 2 transversales) ----------
  { t: 'T08',   paquete: 'P3', pr: 'PR01',   nombre: 'Modificación o cambio de estatus de trabajador activo a pensionado por invalidez o vejez, pensionado por anualidad y de beneficiario a pensionado por viudez',
    hus: [],
    pendiente: 'entregas_por_paquetes asigna HU-033, que NO existe en DevOps. Crear HU o reasignar.' },
  { t: 'T10',   paquete: 'P3', pr: 'PR02',   nombre: 'Modificación de estatus que optan a la devolución o asignación por invalidez, viudez o vejez en seis anualidades (decreto 787)',
    hus: [],
    pendiente: 'Sin HU asignada. Definir HU nueva o mapeo explícito.' },
  { t: 'T13',   paquete: 'P3', pr: 'PR09',   nombre: 'Trámite y pago de subsidio',
    hus: ['HU-027', 'HU-027.1'] },
  { t: 'T14',   paquete: 'P3', pr: 'PR09',   nombre: 'Trámite y pago de auxilio de sepelio',
    hus: ['HU-028', 'HU-028.1'] },
  { t: 'T15',   paquete: 'P3', pr: 'PR10',   nombre: 'Pago por pensión por invalidez por riesgo profesional',
    hus: ['HU-029', 'HU-029.1', 'HU-029.2'] },
  { t: 'T16',   paquete: 'P3', pr: 'PR10',   nombre: 'Pensión por muerte por riesgo profesional',
    hus: ['HU-030', 'HU-030.1'] },
  { t: 'T19',   paquete: 'P3', pr: 'PR05',   nombre: 'Solicitud de pago de mora con dispensa de multas y recargos',
    hus: ['HU-019'] },
  { t: 'T20',   paquete: 'P3', pr: 'PR05',   nombre: 'Solicitud de pago de mora sin dispensa de multas y recargos',
    hus: ['HU-020'] },
  { t: 'T21',   paquete: 'P3', pr: 'PR05',   nombre: 'Emisión de mandamiento de pago de cuotas de convenios por mora de cotizaciones',
    hus: ['HU-021'] },
  { t: 'T22',   paquete: 'P3', pr: 'PR07',   nombre: 'Solicitud de inspección por denuncia',
    hus: ['HU-024'] },
  { t: 'T22.1', paquete: 'P3', pr: 'PR07.1', nombre: 'Inspecciones de oficio',
    hus: ['HU-025', 'HU-025.1', 'HU-025.2', 'HU-026', 'HU-026.1'] }
];

var TRANSVERSALES = [
  { t: 'TRV-ADM', paquete: 'P3', nombre: 'Administración de usuarios',
    hus: ['HU-031'],
    pendiente: 'Confirmar si entra al seguimiento de P3 o se reporta aparte.' },
  { t: 'TRV-RPT', paquete: 'P3', nombre: 'Reportes',
    hus: ['HU-032'],
    pendiente: 'Alcance sin definir. Confirmar si entra al seguimiento de P3 o se reporta aparte.' },
  { t: 'TRV-UX',  paquete: null, nombre: 'Rediseño UI/UX',
    hus: [], devopsIds: [6178],
    pendiente: 'No tiene clave HU parseable ni tag de paquete. Se clasifica por ID explícito.' }
];

var RE_CLAVE_HU = /^\s*(HU-\d{3}(?:\.\d+)?)/;
var ESTADOS_CERRADOS = { Closed: true, Done: true, Resolved: true };
var SEVERIDAD_ORDEN = { alta: 0, media: 1, baja: 2 };

// ---------------------------------------------------------------------------
// PUNTOS DE ENTRADA
// ---------------------------------------------------------------------------

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('ISSS-SYDT')
    .addItem('Actualizar backlog', 'main')
    .addToUi();
}

/** Invocable manualmente (menú o Ejecutar). Muestra un resumen en un alert(). */
function main() {
  return ejecutar_(true);
}

/** Usada por el trigger diario. Sin UI. */
function ejecutarProgramado_() {
  return ejecutar_(false);
}

/** Ejecutar una sola vez para programar la corrida diaria a las 06:00 (hora El Salvador). */
function crearTriggerDiario() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'ejecutarProgramado_') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('ejecutarProgramado_').timeBased().atHour(6).everyDays(1).create();
}

function ejecutar_(esManual) {
  var resultado = correrPipeline_();
  if (esManual) {
    try {
      var resumenTxt = resultado.resumen.map(function (r) {
        return r.paquete + ': ' + (r.avance_pct === '' ? 'sin datos' : r.avance_pct + '%') +
          ' (' + r.hijos_cerrados + '/' + r.hijos_total + ' ítems cerrados)';
      }).join('\n');
      var altas = resultado.alertas.filter(function (a) { return a.severidad === 'alta'; }).length;
      SpreadsheetApp.getUi().alert(
        'Backlog ISSS-SYDT actualizado\n\n' + resumenTxt +
        '\n\nAlertas: ' + altas + ' altas de ' + resultado.alertas.length + ' totales.'
      );
    } catch (e) {
      // Sin UI disponible (ejecución programada o sin contexto de hoja) — no bloquea la corrida.
    }
  }
  return resultado;
}

// ---------------------------------------------------------------------------
// PIPELINE PRINCIPAL
// ---------------------------------------------------------------------------

function correrPipeline_() {
  var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  var idx = construirIndices_();
  var alertas = [];

  // Paso 1-2: universo de User Story + materialización de campos
  var huIds = consultarIdsUserStories_();
  if (huIds.length >= 2000) {
    alertas.push(alerta_('V_TOP_LIMIT', 'alta', null, null, null,
      'La consulta WIQL de HUs alcanzó el tope de 2000 resultados; puede haber truncamiento.'));
  }
  var huFields = ['System.Id', 'System.Title', 'System.State', 'System.Tags',
    'System.Parent', 'System.WorkItemType', 'System.IterationPath', 'System.ChangedDate'];
  var husRaw = obtenerCamposEnLotes_(huIds, huFields);

  // Fechas de entrega (fuente: hoja Entregas_Paquetes, nunca hardcodeadas)
  var entregas = leerOCrearEntregas_(ss);
  chequearFechasEsperadas_(entregas, alertas);

  // Paso 3: clasificar cada HU
  var hus = husRaw.map(function (wi) { return clasificarHU_(wi, idx, entregas, alertas); });

  // V3_HU_FANTASMA: claves de la tabla que no aparecen en DevOps
  var clavesPresentes = {};
  hus.forEach(function (h) { if (h.clave_hu) clavesPresentes[h.clave_hu] = true; });
  idx.todasLasEntradas.forEach(function (e) {
    (e.hus || []).forEach(function (hu) {
      if (!clavesPresentes[hu]) {
        alertas.push(alerta_('V3_HU_FANTASMA', 'alta', null, hu, e.t || null,
          'Clave declarada en la tabla de mapeo pero no encontrada en DevOps.'));
      }
    });
  });

  // V5_TRAMITE_SIN_HU
  TRAMITES.forEach(function (t) {
    if (!t.hus || t.hus.length === 0) {
      alertas.push(alerta_('V5_TRAMITE_SIN_HU', 'alta', null, null, t.t,
        'Trámite sin HU asignada en la tabla de mapeo.' + (t.pendiente ? ' ' + t.pendiente : '')));
    }
  });

  // Paso 4: descendencia por parentesco
  var huIdsList = hus.map(function (h) { return h.devops_id; });
  var childIds = consultarIdsHijos_(huIdsList);
  var childFields = ['System.Id', 'System.Title', 'System.State', 'System.Tags', 'System.Parent',
    'System.WorkItemType', 'System.IterationPath', 'System.AssignedTo', 'System.ChangedDate'];
  var hijosRaw = obtenerCamposEnLotes_(childIds, childFields);

  var hijosPorPadre = {};
  hijosRaw.forEach(function (wi) {
    var padre = wi.fields['System.Parent'];
    if (!hijosPorPadre[padre]) hijosPorPadre[padre] = [];
    hijosPorPadre[padre].push(wi);
  });

  // Paso 5: métricas + V6/V7
  hus.forEach(function (h) {
    var hijos = hijosPorPadre[h.devops_id] || [];
    h.hijos_total = hijos.length;
    h.hijos_cerrados = hijos.filter(function (c) { return !!ESTADOS_CERRADOS[c.fields['System.State']]; }).length;
    h.avance_pct = h.hijos_total > 0 ? Math.round((h.hijos_cerrados / h.hijos_total) * 1000) / 10 : '';

    if (h.hijos_total === 0) {
      alertas.push(alerta_('V7_HU_SIN_HIJOS', 'baja', h.devops_id, h.clave_hu, h.codigo_t,
        'HU sin ítems hijo; avance indefinido.'));
    }

    var paqueteNumHU = numeroDePaquete_(h.paquete);
    hijos.forEach(function (c) {
      var tagNum = numeroPaqueteLegacy_(c.fields['System.Tags']);
      if (tagNum !== null && paqueteNumHU !== null && tagNum !== paqueteNumHU) {
        alertas.push(alerta_('V6_TAGS_HIJO_CONTAMINADOS', 'baja', c.id, h.clave_hu, h.codigo_t,
          'Tag legacy del hijo (Paquete ' + tagNum + ') difiere del paquete de su HU padre (' + h.paquete + ').'));
      }
    });
  });

  var resumen = calcularResumenPaquetes_(hus, entregas);
  var alertasOrdenadas = ordenarAlertas_(alertas);

  escribirHUBase_(ss, hus);
  escribirResumenPaquetes_(ss, resumen);
  escribirAlertas_(ss, alertasOrdenadas);
  escribirTimestamp_(ss);

  return { hus: hus, resumen: resumen, alertas: alertasOrdenadas };
}

// ---------------------------------------------------------------------------
// CLASIFICACIÓN
// ---------------------------------------------------------------------------

function construirIndices_() {
  var claveIndex = {};
  var devopsIndex = {};
  var todasLasEntradas = TRAMITES.concat(TRANSVERSALES);
  todasLasEntradas.forEach(function (e) {
    (e.hus || []).forEach(function (hu) { claveIndex[hu] = e; });
    (e.devopsIds || []).forEach(function (id) { devopsIndex[id] = e; });
  });
  return { claveIndex: claveIndex, devopsIndex: devopsIndex, todasLasEntradas: todasLasEntradas };
}

function claveHU_(titulo) {
  var m = RE_CLAVE_HU.exec(titulo || '');
  return m ? m[1] : null;
}

function numeroPaqueteLegacy_(tagsStr) {
  if (!tagsStr) return null;
  var tags = tagsStr.split(';').map(function (t) { return t.trim(); });
  for (var i = 0; i < tags.length; i++) {
    var m = /^Paquete\s*(\d+)$/i.exec(tags[i]);
    if (m) return parseInt(m[1], 10);
  }
  return null;
}

function numeroDePaquete_(paquete) {
  var m = /^P(\d+)$/.exec(paquete || '');
  return m ? parseInt(m[1], 10) : null;
}

function clasificarHU_(wi, idx, entregas, alertas) {
  var f = wi.fields;
  var id = wi.id;
  var titulo = f['System.Title'] || '';
  var clave = claveHU_(titulo);
  var entry = null;

  // Cascada: 1) clave_hu → 2) devops_id explícito → 3) sin clasificar (nunca se adivina)
  if (clave && idx.claveIndex[clave]) {
    entry = idx.claveIndex[clave];
  } else if (idx.devopsIndex[id]) {
    entry = idx.devopsIndex[id];
  }

  if (!clave && !idx.devopsIndex[id]) {
    alertas.push(alerta_('V2_TITULO_SIN_CLAVE', 'media', id, null, null,
      'El título "' + titulo + '" no arranca con HU-XXX y no tiene ID explícito en la tabla.'));
  }
  if (!entry) {
    alertas.push(alerta_('V1_HU_SIN_CLASIFICAR', 'alta', id, clave, null,
      'No se encontró clasificación para esta HU. Revisar y actualizar la tabla de mapeo.'));
  }

  var paquete = entry ? entry.paquete : null;
  if (entry && !paquete) {
    alertas.push(alerta_('V8_SIN_PAQUETE', 'media', id, clave, entry.t || null,
      'HU clasificada pero su trámite no tiene paquete asignado.'));
  }

  var tagLegacy = f['System.Tags'] || '';
  if (entry && paquete) {
    var tagNum = numeroPaqueteLegacy_(tagLegacy);
    var paqueteNum = numeroDePaquete_(paquete);
    if (tagNum !== null && tagNum !== paqueteNum) {
      alertas.push(alerta_('V4_DISCREPANCIA_TAG', 'media', id, clave, entry.t || null,
        'El paquete derivado (' + paquete + ') difiere del tag legacy (Paquete ' + tagNum + ').'));
    }
  }

  var paqueteInfo = paquete ? PAQUETES_CAPA1[paquete] : null;
  var entrega = paquete ? entregas[paquete] : null;

  return {
    devops_id: id,
    clave_hu: clave,
    titulo: titulo,
    codigo_t: entry ? (entry.t || '') : '',
    tramite_nombre: entry ? (entry.nombre || '') : '',
    pr: entry ? (entry.pr || '') : '',
    paquete: paquete || '',
    paquete_nombre: paqueteInfo ? paqueteInfo.nombre : '',
    fecha_entrega: entrega ? entrega.fecha_entrega : '',
    state: f['System.State'] || '',
    parent_feature: f['System.Parent'] || '',
    iteration: f['System.IterationPath'] || '',
    hijos_total: 0,
    hijos_cerrados: 0,
    avance_pct: '',
    tag_paquete_legacy: tagLegacy,
    clasificada: !!entry,
    changed_date: f['System.ChangedDate'] || ''
  };
}

function alerta_(codigo, severidad, devopsId, claveHu, codigoT, detalle) {
  return { codigo: codigo, severidad: severidad, devops_id: devopsId || '', clave_hu: claveHu || '', codigo_t: codigoT || '', detalle: detalle };
}

function ordenarAlertas_(alertas) {
  return alertas.slice().sort(function (a, b) {
    var oa = SEVERIDAD_ORDEN[a.severidad] != null ? SEVERIDAD_ORDEN[a.severidad] : 9;
    var ob = SEVERIDAD_ORDEN[b.severidad] != null ? SEVERIDAD_ORDEN[b.severidad] : 9;
    return oa - ob;
  });
}

// ---------------------------------------------------------------------------
// AZURE DEVOPS
// ---------------------------------------------------------------------------

function cabecerasAuth_() {
  var pat = PropertiesService.getScriptProperties().getProperty('AZDO_PAT');
  if (!pat) throw new Error('Falta la propiedad de script AZDO_PAT (Configuración del proyecto → Propiedades del script).');
  return { Authorization: 'Basic ' + Utilities.base64Encode(':' + pat) };
}

function azdoPost_(ruta, payload) {
  var options = {
    method: 'post',
    contentType: 'application/json',
    headers: cabecerasAuth_(),
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };
  var resp = UrlFetchApp.fetch(CONFIG.ORG_URL + ruta, options);
  var code = resp.getResponseCode();
  if (code === 401) throw new Error('AZDO_PAT inválido o expirado (401) al llamar ' + ruta);
  if (code === 203) throw new Error('AZDO_PAT sin permiso de lectura sobre Work Items (203: redirigido a login) al llamar ' + ruta);
  if (code < 200 || code >= 300) throw new Error('Azure DevOps devolvió ' + code + ' en ' + ruta + ': ' + resp.getContentText().slice(0, 500));
  return JSON.parse(resp.getContentText());
}

function consultarIdsUserStories_() {
  var wiql = "SELECT [System.Id] FROM WorkItems" +
    " WHERE [System.TeamProject] = '" + CONFIG.PROJECT + "'" +
    " AND [System.WorkItemType] = 'User Story'" +
    " AND [System.AreaPath] UNDER '" + CONFIG.AREA_PATH + "'" +
    " ORDER BY [System.Id]";
  var res = azdoPost_('/wit/wiql?api-version=7.1&$top=2000', { query: wiql });
  return (res.workItems || []).map(function (w) { return w.id; });
}

function consultarIdsHijos_(parentIds) {
  var ids = [];
  for (var i = 0; i < parentIds.length; i += 100) {
    var lote = parentIds.slice(i, i + 100);
    var wiql = "SELECT [System.Id] FROM WorkItems" +
      " WHERE [System.TeamProject] = '" + CONFIG.PROJECT + "'" +
      " AND [System.WorkItemType] IN ('Task','Bug','Issue')" +
      " AND [System.Parent] IN (" + lote.join(',') + ")";
    var res = azdoPost_('/wit/wiql?api-version=7.1&$top=2000', { query: wiql });
    ids = ids.concat((res.workItems || []).map(function (w) { return w.id; }));
  }
  return ids;
}

function obtenerCamposEnLotes_(ids, campos) {
  var out = [];
  for (var i = 0; i < ids.length; i += 200) {
    var lote = ids.slice(i, i + 200);
    if (!lote.length) continue;
    var res = azdoPost_('/wit/workitemsbatch?api-version=7.1', { ids: lote, fields: campos });
    out = out.concat(res.value || []);
  }
  return out;
}

// ---------------------------------------------------------------------------
// FECHAS DE ENTREGA
// ---------------------------------------------------------------------------

function leerOCrearEntregas_(ss) {
  var sh = ss.getSheetByName(CONFIG.SHEETS.ENTREGAS);
  if (!sh) {
    sh = ss.insertSheet(CONFIG.SHEETS.ENTREGAS);
    sh.getRange(1, 1, 1, 3).setValues([['paquete', 'nombre', 'fecha_entrega']]);
    var filas = Object.keys(PAQUETES_CAPA1).map(function (p) {
      return [p, PAQUETES_CAPA1[p].nombre, CONFIG.FECHAS_ESPERADAS[p]];
    });
    sh.getRange(2, 1, filas.length, 3).setValues(filas);
  }
  var data = sh.getDataRange().getValues();
  var out = {};
  for (var i = 1; i < data.length; i++) {
    var paquete = data[i][0];
    if (!paquete) continue;
    var fechaRaw = data[i][2];
    out[paquete] = {
      nombre: data[i][1],
      fecha_entrega: fechaRaw instanceof Date ? fechaRaw : (fechaRaw ? new Date(fechaRaw) : null)
    };
  }
  return out;
}

function chequearFechasEsperadas_(entregas, alertas) {
  Object.keys(CONFIG.FECHAS_ESPERADAS).forEach(function (p) {
    var esperada = CONFIG.FECHAS_ESPERADAS[p];
    var actual = entregas[p] && entregas[p].fecha_entrega;
    var actualStr = actual ? Utilities.formatDate(actual, CONFIG.TZ, 'yyyy-MM-dd') : null;
    if (actualStr && actualStr !== esperada) {
      alertas.push(alerta_('V9_FECHA_ENTREGA_DESVIADA', 'media', null, null, p,
        'La hoja Entregas_Paquetes indica ' + actualStr + ' para ' + p +
        ', pero el valor esperado configurado en el script (CONFIG.FECHAS_ESPERADAS) es ' + esperada + '. Confirmar cuál es correcto.'));
    }
  });
}

// ---------------------------------------------------------------------------
// AGREGACIÓN
// ---------------------------------------------------------------------------

function calcularResumenPaquetes_(hus, entregas) {
  var acc = {};
  Object.keys(PAQUETES_CAPA1).forEach(function (p) {
    acc[p] = {
      paquete: p, nombre: PAQUETES_CAPA1[p].nombre,
      fecha_entrega: entregas[p] ? entregas[p].fecha_entrega : null,
      hus_total: 0, hijos_total: 0, hijos_cerrados: 0
    };
  });
  hus.forEach(function (h) {
    if (!h.paquete || !acc[h.paquete]) return;
    acc[h.paquete].hus_total++;
    acc[h.paquete].hijos_total += h.hijos_total;
    acc[h.paquete].hijos_cerrados += h.hijos_cerrados;
  });
  var hoy = new Date();
  return Object.keys(acc).map(function (p) {
    var a = acc[p];
    var avance = a.hijos_total > 0 ? Math.round((a.hijos_cerrados / a.hijos_total) * 1000) / 10 : '';
    var dias = a.fecha_entrega ? Math.round((a.fecha_entrega - hoy) / 86400000) : '';
    // Rango medio (30–90) sin definir en la especificación; se resuelve como Ámbar continuo.
    var rag = avance === '' ? '' : (avance < 30 ? 'Rojo' : (avance < 90 ? 'Ámbar' : 'Verde'));
    return {
      paquete: a.paquete, nombre: a.nombre, fecha_entrega: a.fecha_entrega,
      hus_total: a.hus_total, hijos_total: a.hijos_total, hijos_cerrados: a.hijos_cerrados,
      avance_pct: avance, dias_restantes: dias, rag: rag
    };
  });
}

function ordenarHUBase_(hus) {
  return hus.slice().sort(function (a, b) {
    var pa = a.paquete || 'ZZZ', pb = b.paquete || 'ZZZ';
    if (pa !== pb) return pa < pb ? -1 : 1;
    var ta = a.codigo_t || 'ZZZ', tb = b.codigo_t || 'ZZZ';
    if (ta !== tb) return ta < tb ? -1 : 1;
    var ca = a.clave_hu || 'ZZZ', cb = b.clave_hu || 'ZZZ';
    return ca < cb ? -1 : (ca > cb ? 1 : 0);
  });
}

// ---------------------------------------------------------------------------
// ESCRITURA DE HOJAS
// ---------------------------------------------------------------------------

function escribirHUBase_(ss, hus) {
  var sh = ss.getSheetByName(CONFIG.SHEETS.HU_BASE) || ss.insertSheet(CONFIG.SHEETS.HU_BASE);
  sh.clear();
  var headers = ['devops_id', 'clave_hu', 'titulo', 'codigo_t', 'tramite_nombre', 'pr', 'paquete',
    'paquete_nombre', 'fecha_entrega', 'state', 'parent_feature', 'iteration', 'hijos_total',
    'hijos_cerrados', 'avance_pct', 'tag_paquete_legacy', 'clasificada', 'changed_date'];
  var ordenados = ordenarHUBase_(hus);
  var rows = ordenados.map(function (h) {
    return [h.devops_id, h.clave_hu || '', h.titulo, h.codigo_t, h.tramite_nombre, h.pr,
      h.paquete, h.paquete_nombre, h.fecha_entrega || '', h.state, h.parent_feature, h.iteration,
      h.hijos_total, h.hijos_cerrados, h.avance_pct, h.tag_paquete_legacy, h.clasificada,
      h.changed_date ? new Date(h.changed_date) : ''];
  });
  sh.getRange(1, 1, 1, headers.length).setValues([headers]);
  if (rows.length) sh.getRange(2, 1, rows.length, headers.length).setValues(rows);
}

function escribirResumenPaquetes_(ss, resumen) {
  var sh = ss.getSheetByName(CONFIG.SHEETS.RESUMEN) || ss.insertSheet(CONFIG.SHEETS.RESUMEN);
  sh.clear();
  var headers = ['paquete', 'nombre', 'fecha_entrega', 'hus_total', 'hijos_total', 'hijos_cerrados', 'avance_pct', 'dias_restantes', 'rag'];
  var rows = resumen.map(function (r) {
    return [r.paquete, r.nombre, r.fecha_entrega || '', r.hus_total, r.hijos_total, r.hijos_cerrados, r.avance_pct, r.dias_restantes, r.rag];
  });
  sh.getRange(1, 1, 1, headers.length).setValues([headers]);
  if (rows.length) sh.getRange(2, 1, rows.length, headers.length).setValues(rows);
}

function escribirAlertas_(ss, alertasOrdenadas) {
  var sh = ss.getSheetByName(CONFIG.SHEETS.ALERTAS) || ss.insertSheet(CONFIG.SHEETS.ALERTAS);
  sh.clear();
  var headers = ['codigo', 'severidad', 'devops_id', 'clave_hu', 'codigo_t', 'detalle'];
  var rows = alertasOrdenadas.map(function (a) {
    return [a.codigo, a.severidad, a.devops_id, a.clave_hu, a.codigo_t, a.detalle];
  });
  sh.getRange(1, 1, 1, headers.length).setValues([headers]);
  if (rows.length) sh.getRange(2, 1, rows.length, headers.length).setValues(rows);
}

function escribirTimestamp_(ss) {
  var sh = ss.getSheetByName(CONFIG.SHEETS.HU_BASE);
  var ts = Utilities.formatDate(new Date(), CONFIG.TZ, "yyyy-MM-dd HH:mm:ss 'UTC-6'");
  sh.getRange('T1').setValue('Última corrida: ' + ts);
}
