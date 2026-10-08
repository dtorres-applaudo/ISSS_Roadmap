// modules/seguimiento.js — Portal ISSS-SYDT v3
// Resumen Ejecutivo corregido + Operativo + Observaciones
(function () {

  var cfg = window.PORTAL_CONFIG || {};
  var SH  = (cfg.sheets && cfg.sheets.seguimientoUrl)   || '';
  var OB  = (cfg.sheets && cfg.sheets.observacionesUrl) || '';

  // ── CACHE persistente + revalidación silenciosa ────────────────
  // Cada fuente (sheet de Apps Script o roadmap.json) se guarda en localStorage.
  // La primera vez que se pide una key en esta carga de página, si ya hay algo
  // guardado se devuelve al instante (sin "Cargando…") y, en paralelo, se
  // dispara UNA sola consulta de red en segundo plano para revalidar; si el
  // dato cambió, se avisa a quien esté suscrito (onSheetUpdate) para que se
  // vuelva a pintar solo, sin que el usuario tenga que refrescar. Si falla la
  // revalidación silenciosa, no pasa nada visible — se queda con lo último bueno.
  var LS_PREFIX = 'issssydt_cache_v1::';
  function lsGet(key){
    try { var raw = localStorage.getItem(LS_PREFIX+key); return raw===null ? undefined : JSON.parse(raw); }
    catch(e){ return undefined; }
  }
  function lsSet(key, value){
    try { localStorage.setItem(LS_PREFIX+key, JSON.stringify(value)); } catch(e){}
  }

  var _cache = {};             // key -> último dato bueno conocido (memoria de esta pestaña)
  var _revalidatedOnce = {};   // key -> ya se disparó la revalidación de red de esta carga de página
  var _updateListeners = {};   // key -> [fn(data)] a notificar si la revalidación trae un dato distinto

  function onSheetUpdate(key, fn){ (_updateListeners[key] = _updateListeners[key]||[]).push(fn); }
  function notifyUpdate(key, data){ (_updateListeners[key]||[]).forEach(function(fn){ fn(data); }); }

  function revalidate(key, runNetwork){
    if (_revalidatedOnce[key]) return;
    _revalidatedOnce[key] = true;
    runNetwork(function(err, data){
      if (err) return;
      if (JSON.stringify(data) !== JSON.stringify(_cache[key])) {
        _cache[key] = data; lsSet(key, data);
        notifyUpdate(key, data);
      }
    });
  }

  function fetchSheetNetwork(url, sheetName, cb){
    fetch(url + '?sheet=' + encodeURIComponent(sheetName))
      .then(function(r){ return r.json(); })
      .then(function(d){ if(d.error){cb(d.error,null);return;} cb(null, d.rows||[]); })
      .catch(function(e){ cb('Error de red: '+e.message, null); });
  }

  function fetchSheet(url, sheetName, cb) {
    var key = url + '::' + sheetName;
    if (_cache[key] === undefined) {
      var persisted = lsGet(key);
      if (persisted !== undefined) _cache[key] = persisted;
    }
    if (_cache[key] !== undefined) {
      cb(null, _cache[key]);
      revalidate(key, function(done){ fetchSheetNetwork(url, sheetName, done); });
      return;
    }
    if (!url) { cb('URL no configurada en datos.js', null); return; }
    fetchSheetNetwork(url, sheetName, function(err, data){
      if (!err) { _cache[key] = data; lsSet(key, data); }
      cb(err, data);
    });
  }

  // Fuente de verdad de fechas/avance por paquete: el mismo roadmap.json
  // que usa el módulo Roadmap (sincronizado vía scripts/sync-roadmap-smartsheet.js).
  var ROADMAP_KEY = 'roadmap.json';
  function fetchRoadmapNetwork(cb){
    fetch('/data/roadmap.json?v=' + Date.now())
      .then(function(r){ return r.json(); })
      .then(function(d){ cb(null, d); })
      .catch(function(e){ cb('Error cargando roadmap.json: ' + e.message, null); });
  }
  function fetchRoadmap(cb) {
    if (_cache[ROADMAP_KEY] === undefined) {
      var persisted = lsGet(ROADMAP_KEY);
      if (persisted !== undefined) _cache[ROADMAP_KEY] = persisted;
    }
    if (_cache[ROADMAP_KEY] !== undefined) {
      cb(null, _cache[ROADMAP_KEY]);
      revalidate(ROADMAP_KEY, fetchRoadmapNetwork);
      return;
    }
    fetchRoadmapNetwork(function(err, data){
      if (!err) { _cache[ROADMAP_KEY] = data; lsSet(ROADMAP_KEY, data); }
      cb(err, data);
    });
  }

  // Avance de Producto: modelo de madurez (techos por estado + peso
  // Desarrollo/QA) por trámite/paquete/producto, generado por
  // scripts/sync-avance-producto.js a partir de Avance_tramite/tablas_dinamicas.
  // Nunca se recalcula en el frontend — se muestra tal cual viene del JSON.
  var AVANCE_PRODUCTO_KEY = 'avance_producto.json';
  function fetchAvanceProductoNetwork(cb){
    fetch('/data/avance_producto.json?v=' + Date.now())
      .then(function(r){ return r.json(); })
      .then(function(d){ cb(null, d); })
      .catch(function(e){ cb('Error cargando avance_producto.json: ' + e.message, null); });
  }
  function fetchAvanceProducto(cb) {
    if (_cache[AVANCE_PRODUCTO_KEY] === undefined) {
      var persisted = lsGet(AVANCE_PRODUCTO_KEY);
      if (persisted !== undefined) _cache[AVANCE_PRODUCTO_KEY] = persisted;
    }
    if (_cache[AVANCE_PRODUCTO_KEY] !== undefined) {
      cb(null, _cache[AVANCE_PRODUCTO_KEY]);
      revalidate(AVANCE_PRODUCTO_KEY, fetchAvanceProductoNetwork);
      return;
    }
    fetchAvanceProductoNetwork(function(err, data){
      if (!err) { _cache[AVANCE_PRODUCTO_KEY] = data; lsSet(AVANCE_PRODUCTO_KEY, data); }
      cb(err, data);
    });
  }

  // ── HELPERS ───────────────────────────────────────────────────
  function fmt(v){ return (v===null||v===undefined||v==='') ? '—' : String(v); }
  function fechaDDMMYYYY(iso){
    var m = String(iso||'').match(/^(\d{4})-(\d{2})-(\d{2})/);
    return m ? (m[3]+'/'+m[2]+'/'+m[1]) : fmt(iso);
  }
  function pct(v,dec){ var n=parseFloat(v); if(isNaN(n)) return '—'; return n.toFixed(dec===undefined?1:dec)+'%'; }
  function ragC(p){ var n=parseFloat(p); if(isNaN(n)) return 'rag-gray'; if(n>=90) return 'rag-green'; if(n>=60) return 'rag-amber'; return 'rag-red'; }
  function ragL(p){ var n=parseFloat(p); if(isNaN(n)) return 'Sin datos'; if(n>=90) return 'En meta'; if(n>=60) return 'En riesgo'; return 'Atrasado'; }
  // Color de relleno de barra según semáforo (tokens de chart del design system).
  function pbGrad(rc){ return rc==='rag-green'?'var(--ds-chart-success)':rc==='rag-amber'?'var(--ds-chart-warning)':rc==='rag-gray'?'var(--ds-chart-neutral)':'var(--ds-chart-danger)'; }
  function ragTxt(rc){ return rc==='rag-green'?'rag-txt-green':rc==='rag-amber'?'rag-txt-amber':rc==='rag-red'?'rag-txt-red':''; }
  function diasRestantes(dl){ var h=new Date(); h.setHours(0,0,0,0); return Math.ceil((dl-h)/86400000); }
  function loading(msg){ return '<div class="seg-loading"><div class="seg-spinner"></div>'+(msg||'Cargando…')+'</div>'; }
  function errBlock(msg){ return '<div class="seg-error">'+msg+'</div>'; }
  function severityLabel(score){ var s=parseFloat(score); if(isNaN(s)||s===0) return {l:'Sin score',c:'sev-gray'}; if(s>=20) return {l:'Bloqueante',c:'sev-block'}; if(s>=12) return {l:'Crítico',c:'sev-crit'}; if(s>=6) return {l:'Mayor',c:'sev-major'}; if(s>=3) return {l:'Menor',c:'sev-minor'}; return {l:'Trivial',c:'sev-trivial'}; }
  // Deuda técnica real, derivada de `transiciones` (log de auditoría de
  // cambios de campo por revisión — no un listado directo de deuda).
  // Columnas reales: fecha_snapshot_cst, id, tipo, titulo, sprint, campo,
  // valor_anterior, valor_nuevo, cambiado_por, fecha_cambio_cst, revision,
  // mismo_sprint_abierto_cerrado, arrastrado.
  function esArrastrado(v){
    var s = String(v||'').trim().toLowerCase();
    return s!=='' && s!=='no' && s!=='false' && s!=='0';
  }
  function computeDeudaArrastrada(transiciones, sprintActivo){
    // Solo cambios de Sprint/Iteración marcados como arrastrados (⚠️).
    var cambios = (transiciones||[]).filter(function(r){
      return String(r.campo||'').toLowerCase().indexOf('sprint')!==-1 && esArrastrado(r.arrastrado);
    });
    // Por id, el cambio más reciente hacia cada sprint destino…
    var porIdSprint = {};
    cambios.forEach(function(r){
      var key = r.id+'::'+r.sprint;
      var rev = parseInt(r.revision)||0;
      if(!porIdSprint[key] || rev > (parseInt(porIdSprint[key].revision)||0)) porIdSprint[key]=r;
    });
    // …y de esos, el más reciente en general por id (a qué sprint fue el
    // último movimiento marcado como arrastre).
    var porId = {};
    Object.keys(porIdSprint).forEach(function(k){
      var r = porIdSprint[k];
      var rev = parseInt(r.revision)||0;
      if(!porId[r.id] || rev > (parseInt(porId[r.id].revision)||0)) porId[r.id]=r;
    });
    var enSprint=[], backlog=[];
    Object.keys(porId).forEach(function(id){
      var r = porId[id];
      var destino = String(r.sprint||'').trim();
      if(destino === String(sprintActivo||'').trim()) enSprint.push(r);
      else if(destino === '$Removed' || destino === 'ISSS-SYDT') backlog.push(r);
    });
    return { enSprint: enSprint, backlog: backlog };
  }
  // `transiciones` no trae el estado actual del ítem — se cruza con
  // work_items_detalle (id → estado) para saber si ya se cerró.
  function buildEstadoLookup(detalle){
    var map = {};
    (detalle||[]).forEach(function(r){ if(r.id!==undefined && r.id!==null && r.id!=='') map[r.id]=fmt(r.estado); });
    return map;
  }
  function enrichDeudaRow(r, estadoPorId){
    var estado = estadoPorId[r.id];
    return {
      work_item_id: r.id,
      tipo: r.tipo,
      titulo: r.titulo,
      estado: estado || 'Sin dato',
      sprint_origen: (!r.valor_anterior || r.valor_anterior==='$Removed') ? '—' : r.valor_anterior
    };
  }

  function spiBadge(spi){
    var n=parseFloat(spi);
    if(isNaN(n)) return '<span class="seg-rag rag-gray">SPI —</span>';
    var cls = n>=0.95?'rag-green':n>=0.80?'rag-amber':'rag-red';
    var lbl = n>=1.00?'Adelantado':n>=0.95?'En línea':n>=0.80?'En riesgo':'Atrasado';
    return '<span class="seg-rag '+cls+'">SPI '+n.toFixed(2)+' · '+lbl+'</span>';
  }

  // ── ESTILOS ───────────────────────────────────────────────────
  var CSS = `
/* Todos los valores salen de modules/ds.js (var(--ds-*)). */
.seg-loading{display:flex;align-items:center;gap:var(--ds-space-150);padding:var(--ds-space-400) 0;font:var(--ds-font-body);color:var(--ds-text-subtle);}
.seg-spinner{width:20px;height:20px;flex:none;border-radius:50%;border:2px solid var(--ds-background-neutral-hovered);border-top-color:var(--ds-background-brand-bold);animation:seg-spin .7s linear infinite;}
@keyframes seg-spin{to{transform:rotate(360deg);}}
.seg-error{margin-bottom:var(--ds-space-200);padding:var(--ds-space-200);border-radius:var(--ds-radius-small);background:var(--ds-background-danger);font:var(--ds-font-body);color:var(--ds-text);}
.seg-sh{font:var(--ds-font-heading-small);color:var(--ds-text);margin-bottom:var(--ds-space-200);}
.seg-subh{font:var(--ds-font-heading-xxsmall);color:var(--ds-text-subtle);margin:var(--ds-space-200) 0 var(--ds-space-100);}
.seg-subh:first-of-type{margin-top:0;}
.seg-section{margin-bottom:var(--ds-space-500);}
.seg-ts{margin-top:var(--ds-space-200);font:var(--ds-font-body-small);color:var(--ds-text-subtlest);}
/* Pestañas de sección del Resumen ejecutivo (5c): "Último sync" arriba, siempre visible */
.seg-ts.seg-ts--head{margin:0 0 var(--ds-space-150);}
/* Al generar el PDF se muestran todos los paneles (también en pantalla, mientras dura la impresión) */
.seg-printing .ds-secpanel{display:block;}
.seg-caption{margin-top:var(--ds-space-100);font:var(--ds-font-body-small);color:var(--ds-text-subtlest);}
.mono{font-variant-numeric:tabular-nums;}
.seg-id{font-weight:600;color:var(--ds-text-subtle);font-variant-numeric:tabular-nums;white-space:nowrap;}
.seg-key{font-weight:600;color:var(--ds-link);font-variant-numeric:tabular-nums;white-space:nowrap;}
.seg-muted{color:var(--ds-text-subtlest);}
.seg-state-ok{color:var(--ds-text-success);font-weight:600;}
.seg-state-open{color:var(--ds-text-danger);font-weight:600;}
.seg-state-progress{color:var(--ds-text-warning);font-weight:600;}

/* KPI STRIP → stat cards */
.seg-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:var(--ds-space-150);margin-bottom:var(--ds-space-200);}
.seg-kpi{border:1px solid var(--ds-border);border-radius:var(--ds-radius-large);padding:var(--ds-space-150) var(--ds-space-200);background:var(--ds-surface);}
.seg-kpi.kpi-dark{background:var(--ds-background-selected);border-color:transparent;}
.seg-kpi-lbl{font:var(--ds-font-body-small);color:var(--ds-text-subtlest);margin-bottom:var(--ds-space-050);}
.kpi-dark .seg-kpi-lbl{color:var(--ds-text-selected);}
.seg-kpi-val{font:var(--ds-font-metric-medium);color:var(--ds-text);font-variant-numeric:tabular-nums;}
.kpi-dark .seg-kpi-val{color:var(--ds-text-selected);}
.seg-kpi-sub{font:var(--ds-font-body-small);color:var(--ds-text-subtle);margin-top:var(--ds-space-050);}
.kpi-warn .seg-kpi-val,.seg-kpi-val.kpi-warn{color:var(--ds-text-warning);}

/* PROGRESS BARS */
.seg-prog-section{border:1px solid var(--ds-border);border-radius:var(--ds-radius-large);padding:var(--ds-space-200) var(--ds-space-250);background:var(--ds-surface);}
.seg-prog-row{margin-bottom:var(--ds-space-200);}
.seg-prog-row:last-child{margin-bottom:0;}
.seg-prog-label{display:flex;justify-content:space-between;align-items:baseline;gap:var(--ds-space-100);margin-bottom:var(--ds-space-075);}
.seg-prog-lbl-txt{font:var(--ds-font-body);color:var(--ds-text-subtle);}
.seg-prog-lbl-pct{font:var(--ds-font-heading-xsmall);color:var(--ds-text);font-variant-numeric:tabular-nums;}
.seg-prog-lbl-pct.rag-txt-green{color:var(--ds-text-success);}
.seg-prog-lbl-pct.rag-txt-amber{color:var(--ds-text-warning);}
.seg-prog-lbl-pct.rag-txt-red{color:var(--ds-text-danger);}
.seg-prog-track{height:6px;border-radius:var(--ds-radius-full);background:var(--ds-background-neutral);overflow:hidden;}
.seg-prog-fill{height:100%;border-radius:var(--ds-radius-full);background:var(--ds-background-brand-bold);}
.seg-avance-track{height:12px;border-radius:var(--ds-radius-small);background:var(--ds-background-neutral);overflow:hidden;}
.fill-green{background:var(--ds-chart-success) !important;}
.fill-amber{background:var(--ds-chart-warning) !important;}
.fill-red{background:var(--ds-chart-danger) !important;}
.fill-gray{background:var(--ds-chart-neutral) !important;}
.fill-brand{background:var(--ds-chart-brand) !important;}
.fill-plan{background:var(--ds-background-selected-hovered) !important;}
.fill-dev{background:var(--ds-chart-success) !important;}
.fill-qa{background:var(--ds-chart-information) !important;}

/* CUMPLIMIENTO / DISTRIBUCIÓN — fila etiqueta | barra | números */
.seg-cump-row{display:flex;align-items:center;gap:var(--ds-space-150);margin-bottom:var(--ds-space-150);}
.seg-cump-row:last-child{margin-bottom:0;}
.seg-cump-label{width:72px;flex:none;font:var(--ds-font-heading-xsmall);color:var(--ds-text);}
.seg-cump-nums{width:120px;flex:none;text-align:right;font:var(--ds-font-body);color:var(--ds-text-subtle);font-variant-numeric:tabular-nums;}
.seg-seg{height:100%;}
.seg-legend-swatch{display:inline-block;width:10px;height:10px;border-radius:2px;margin-right:var(--ds-space-050);vertical-align:-1px;}

/* BURNDOWN + DISTRIBUCIÓN — a la par, responsive */
.seg-side-by-side{display:flex;gap:var(--ds-space-250);align-items:stretch;flex-wrap:wrap;}
.seg-col{flex:1 1 380px;min-width:0;display:flex;flex-direction:column;}
.seg-col-dist .seg-op-dist-panel{flex:1;display:flex;flex-direction:column;}
.seg-col-dist .seg-chart-wrap{flex:1;display:flex;flex-direction:column;justify-content:center;}
.seg-chart-wrap{border:1px solid var(--ds-border);border-radius:var(--ds-radius-large);padding:var(--ds-space-250);margin-bottom:var(--ds-space-250);background:var(--ds-surface);}
.seg-chart-legend{display:flex;gap:var(--ds-space-200);flex-wrap:wrap;margin-top:var(--ds-space-150);font:var(--ds-font-body-small);color:var(--ds-text-subtle);}
.seg-chart-legend span{display:flex;align-items:center;gap:var(--ds-space-075);}
.seg-chart-legend i{display:inline-block;width:20px;height:3px;border-radius:2px;}
.i-ideal{background:var(--ds-chart-neutral);}
.i-real{background:var(--ds-chart-brand);}
.i-bar{width:10px !important;height:10px !important;border-radius:2px;background:var(--ds-chart-warning);}
.seg-tooltip{position:absolute;display:none;z-index:50;pointer-events:none;white-space:nowrap;
  padding:var(--ds-space-050) var(--ds-space-100);border-radius:var(--ds-radius-small);
  background:var(--ds-background-neutral-bold);color:var(--ds-text-inverse);font:var(--ds-font-body-small);line-height:1.5;}

/* DEUDA TÉCNICA */
.seg-debt-cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:var(--ds-space-150);margin-bottom:var(--ds-space-150);}
.seg-debt-card{border:1px solid var(--ds-border);border-left:4px solid var(--ds-border-warning);border-radius:var(--ds-radius-large);padding:var(--ds-space-150) var(--ds-space-200);background:var(--ds-surface);}
.seg-debt-card.red{border-left-color:var(--ds-border-danger);}
.seg-debt-card.green{border-left-color:var(--ds-border-success);}
.seg-debt-val{font:var(--ds-font-metric-medium);color:var(--ds-text);font-variant-numeric:tabular-nums;}
.seg-debt-lbl{font:var(--ds-font-body-small);color:var(--ds-text-subtle);margin-top:var(--ds-space-025);}
.seg-success-msg{padding:var(--ds-space-200);border-radius:var(--ds-radius-small);background:var(--ds-background-success);font:var(--ds-font-body);color:var(--ds-text);}

/* PACKAGE CARDS */
.seg-pkg-cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:var(--ds-space-150);margin-bottom:var(--ds-space-250);}
.seg-pkg-card,.seg-pkgfull-card{position:relative;border:1px solid var(--ds-border);border-radius:var(--ds-radius-large);padding:var(--ds-space-200);background:var(--ds-surface);}
.seg-pkgfull-card{margin-bottom:var(--ds-space-250);padding:var(--ds-space-250);}
.seg-pkg-id{display:inline-flex;align-items:center;gap:var(--ds-space-075);font:var(--ds-font-heading-xxsmall);color:var(--ds-text-subtle);margin-bottom:var(--ds-space-050);}
.seg-pkg-id::before{content:"";width:12px;height:12px;border-radius:3px;background:var(--ds-pkg-1);}
.pkg-p2 .seg-pkg-id::before{background:var(--ds-pkg-2);}
.pkg-p3 .seg-pkg-id::before{background:var(--ds-pkg-3);}
.seg-pkg-name{font:var(--ds-font-heading-xsmall);line-height:1.25rem;color:var(--ds-text);margin-bottom:var(--ds-space-150);}
.seg-pkg-deadline{font:var(--ds-font-heading-xsmall);color:var(--ds-text);font-variant-numeric:tabular-nums;margin-bottom:var(--ds-space-050);}
.seg-pkg-days{font:var(--ds-font-body-small);margin-bottom:var(--ds-space-150);}
.seg-pkg-row{display:flex;justify-content:space-between;align-items:baseline;gap:var(--ds-space-100);margin-bottom:var(--ds-space-075);font:var(--ds-font-body-small);color:var(--ds-text-subtle);}
.seg-pkg-big{font:var(--ds-font-metric-medium);color:var(--ds-text);font-variant-numeric:tabular-nums;}
.days-ok{color:var(--ds-text-success);}
.days-warn{color:var(--ds-text-warning);}
.days-crit{color:var(--ds-text-danger);}
.seg-pkgfull-head{display:flex;justify-content:space-between;align-items:flex-start;gap:var(--ds-space-150);flex-wrap:wrap;margin-bottom:var(--ds-space-100);}
.seg-pkgfull-name{font:var(--ds-font-heading-small);color:var(--ds-text);margin-top:var(--ds-space-025);}
.seg-pkgfull-badges{display:flex;gap:var(--ds-space-100);flex-wrap:wrap;align-items:center;}
.seg-list{margin:0;padding-left:var(--ds-space-250);font:var(--ds-font-body);color:var(--ds-text);}
.seg-list li{margin-bottom:var(--ds-space-050);}

/* TABLE (ADS dynamic table) */
.seg-table-wrap{border:1px solid var(--ds-border);border-radius:var(--ds-radius-large);overflow:auto;max-width:100%;background:var(--ds-surface);}
.seg-table{width:100%;border-collapse:collapse;font:var(--ds-font-body);}
.seg-table th{padding:var(--ds-space-100) var(--ds-space-150);text-align:left;white-space:nowrap;
  font:var(--ds-font-heading-xxsmall);color:var(--ds-text-subtle);border-bottom:2px solid var(--ds-border);background:var(--ds-surface);}
.seg-table td{padding:var(--ds-space-100) var(--ds-space-150);border-bottom:1px solid var(--ds-border);color:var(--ds-text);vertical-align:middle;}
.seg-table tr:last-child td{border-bottom:none;}
.seg-table tbody tr:hover td{background:var(--ds-surface-hovered);}
.seg-table tr.is-current td{background:var(--ds-background-selected);}
.seg-table tr.is-current:hover td{background:var(--ds-background-selected-hovered);}
.seg-cell-title{max-width:340px;}
.seg-bar-cell{display:flex;align-items:center;gap:var(--ds-space-100);}
.seg-empty-row{padding:var(--ds-space-300) !important;text-align:center;color:var(--ds-text-subtlest) !important;}

/* TABS (ADS tabs) — también se usan como filtro de paquete en Producto */
.seg-tabs{display:flex;gap:var(--ds-space-050);margin-bottom:var(--ds-space-200);box-shadow:inset 0 -2px 0 var(--ds-border);overflow-x:auto;}
.seg-tab{flex:none;padding:var(--ds-space-100);border:none;border-bottom:2px solid transparent;background:none;cursor:pointer;
  font:500 .875rem/1.25rem var(--ds-font-family-body);color:var(--ds-text-subtle);white-space:nowrap;
  transition:color var(--ds-motion),border-color var(--ds-motion);}
.seg-tab:hover{color:var(--ds-text);border-bottom-color:var(--ds-border-bold);}
.seg-tab.active{color:var(--ds-text-selected);border-bottom-color:var(--ds-border-selected);}

/* LOZENGES: RAG / severidad / tipo */
.seg-rag,.seg-badge{display:inline-flex;align-items:center;height:16px;padding:0 var(--ds-space-050);border-radius:var(--ds-radius-xsmall);
  font:700 .6875rem/16px var(--ds-font-family-body);text-transform:uppercase;white-space:nowrap;vertical-align:middle;background:var(--ds-lz-default-bg);color:var(--ds-lz-default-text);}
.rag-green{background:var(--ds-lz-success-bg);color:var(--ds-lz-success-text);}
.rag-amber{background:var(--ds-lz-moved-bg);color:var(--ds-lz-moved-text);}
.rag-red{background:var(--ds-lz-removed-bg);color:var(--ds-lz-removed-text);}
.rag-gray{background:var(--ds-lz-default-bg);color:var(--ds-lz-default-text);}
.sev-block{background:var(--ds-lz-removed-bold-bg);color:var(--ds-text-inverse);}
.sev-crit{background:var(--ds-lz-removed-bg);color:var(--ds-lz-removed-text);}
.sev-major{background:var(--ds-lz-moved-bg);color:var(--ds-lz-moved-text);}
.sev-minor{background:var(--ds-lz-inprogress-bg);color:var(--ds-lz-inprogress-text);}
.sev-trivial,.sev-gray{background:var(--ds-lz-default-bg);color:var(--ds-lz-default-text);}
.tipo-bug{background:var(--ds-lz-removed-bg);color:var(--ds-lz-removed-text);}
.tipo-issue{background:var(--ds-lz-moved-bg);color:var(--ds-lz-moved-text);}
.tipo-task{background:var(--ds-lz-inprogress-bg);color:var(--ds-lz-inprogress-text);}
.tipo-neutral{background:var(--ds-lz-default-bg);color:var(--ds-lz-default-text);}
.seg-empty{padding:var(--ds-space-500) var(--ds-space-250);text-align:center;font:var(--ds-font-body);color:var(--ds-text-subtlest);}

/* OBSERVACIONES — filtros como botones toggle */
.seg-obs-filters{display:flex;gap:var(--ds-space-075);align-items:center;flex-wrap:wrap;margin-bottom:var(--ds-space-150);}
.seg-obs-filter-lbl{font:var(--ds-font-heading-xxsmall);color:var(--ds-text-subtle);margin-right:var(--ds-space-050);}
.seg-obs-filter{height:28px;padding:0 var(--ds-space-100);border:none;border-radius:var(--ds-radius-small);cursor:pointer;
  background:var(--ds-background-neutral);color:var(--ds-text-subtle);font:500 .8125rem/1 var(--ds-font-family-body);
  transition:background var(--ds-motion),color var(--ds-motion);}
.seg-obs-filter:hover{background:var(--ds-background-neutral-hovered);color:var(--ds-text);}
.seg-obs-filter.active{background:var(--ds-background-selected);color:var(--ds-text-selected);box-shadow:inset 0 0 0 1px var(--ds-border-selected);}

/* EXPANDER (details) */
.seg-collapsible{border:1px solid var(--ds-border);border-radius:var(--ds-radius-large);margin-bottom:var(--ds-space-250);background:var(--ds-surface);}
.seg-collapsible summary{display:flex;align-items:center;gap:var(--ds-space-100);padding:var(--ds-space-150) var(--ds-space-200);
  cursor:pointer;list-style:none;user-select:none;border-radius:var(--ds-radius-large);
  font:var(--ds-font-heading-xsmall);color:var(--ds-text);}
.seg-collapsible summary:hover{background:var(--ds-surface-hovered);}
.seg-collapsible summary::-webkit-details-marker{display:none;}
.seg-collapsible summary::before{content:"";flex:none;width:8px;height:8px;margin:0 4px;border-right:2px solid var(--ds-text-subtle);border-bottom:2px solid var(--ds-text-subtle);
  transform:rotate(-45deg);transition:transform var(--ds-motion);}
.seg-collapsible[open] summary::before{transform:rotate(45deg);}
.seg-collapsible[open] summary{border-radius:var(--ds-radius-large) var(--ds-radius-large) 0 0;}
.seg-collapsible-body{padding:var(--ds-space-100) var(--ds-space-200) var(--ds-space-200);}

/* PROG MINI (tablas) */
.prog-mini-wrap{display:inline-block;width:80px;height:6px;border-radius:var(--ds-radius-full);background:var(--ds-background-neutral);overflow:hidden;}
.prog-mini-fill{height:100%;border-radius:var(--ds-radius-full);}
/* Anchos que antes iban en línea (mismos valores: desktop no cambia); doble clase para ganarle a las reglas base */
.prog-mini-wrap.prog-mini-wrap--wide{width:160px;}
.prog-mini-wrap.prog-mini-wrap--act{width:90px;}
.seg-table td.seg-tr-avance{width:220px;}
.seg-table td.seg-act-avance{width:170px;}
.seg-prog-track.seg-tr-track{width:130px;display:flex;}
/* Solo existen en mobile (ver el bloque ≤767.98px al final) */
.seg-bd-readout{display:none;}
.seg-chart-legend .seg-legend-title{display:none;}

/* REPORTE — botón, modal y opciones */
.seg-page-header-row{display:flex;justify-content:space-between;align-items:flex-start;gap:var(--ds-space-200);flex-wrap:wrap;}
.seg-btn-report,.seg-btn-secondary{display:inline-flex;align-items:center;justify-content:center;height:32px;padding:0 var(--ds-space-150);
  border:none;border-radius:var(--ds-radius-small);cursor:pointer;white-space:nowrap;font:500 .875rem/1 var(--ds-font-family-body);
  transition:background var(--ds-motion);}
.seg-btn-report{background:var(--ds-background-brand-bold);color:var(--ds-text-inverse);}
.seg-btn-report:hover{background:var(--ds-background-brand-bold-hovered);}
.seg-btn-report:disabled{background:var(--ds-background-disabled);color:var(--ds-text-disabled);cursor:not-allowed;}
.seg-btn-secondary{background:var(--ds-background-neutral);color:var(--ds-text-subtle);}
.seg-btn-secondary:hover{background:var(--ds-background-neutral-hovered);color:var(--ds-text);}
.seg-modal-overlay{position:fixed;inset:0;background:var(--ds-blanket);display:none;align-items:center;justify-content:center;z-index:9998;padding:var(--ds-space-200);}
/* Especificidad igual a [hidden] del navegador, pero de autor: gana siempre
   y por eso NO se puede alternar con overlay.hidden — se controla por clase. */
.seg-modal-overlay.seg-modal-open{display:flex;}
.seg-modal{width:min(440px,100%);max-height:88vh;display:flex;flex-direction:column;overflow:hidden;
  background:var(--ds-surface-overlay);border-radius:var(--ds-radius-xlarge);box-shadow:var(--ds-shadow-overlay);}
.seg-modal-head{display:flex;align-items:center;justify-content:space-between;gap:var(--ds-space-200);padding:var(--ds-space-300) var(--ds-space-300) var(--ds-space-100);}
.seg-modal-title{font:var(--ds-font-heading-medium);color:var(--ds-text);}
.seg-modal-close{width:32px;height:32px;display:flex;align-items:center;justify-content:center;border:none;border-radius:var(--ds-radius-small);
  background:none;color:var(--ds-text-subtle);font-size:14px;cursor:pointer;}
.seg-modal-close:hover{background:var(--ds-background-neutral-subtle-hovered);color:var(--ds-text);}
.seg-modal-body{padding:var(--ds-space-100) var(--ds-space-300) var(--ds-space-200);overflow-y:auto;}
.seg-modal-foot{display:flex;justify-content:flex-end;gap:var(--ds-space-100);padding:var(--ds-space-200) var(--ds-space-300) var(--ds-space-300);}
.seg-report-desc{font:var(--ds-font-body);color:var(--ds-text-subtle);margin-bottom:var(--ds-space-200);}
.seg-report-options{display:flex;flex-direction:column;gap:var(--ds-space-100);}
.seg-report-opt{display:flex;align-items:center;gap:var(--ds-space-150);width:100%;padding:var(--ds-space-150) var(--ds-space-200);text-align:left;cursor:pointer;
  border:none;border-radius:var(--ds-radius-large);box-shadow:inset 0 0 0 1px var(--ds-border);background:var(--ds-surface);
  font:var(--ds-font-body);transition:box-shadow var(--ds-motion),background var(--ds-motion);}
.seg-report-opt:hover{background:var(--ds-surface-hovered);}
.seg-report-opt.active{background:var(--ds-background-selected);box-shadow:inset 0 0 0 2px var(--ds-border-selected);}
.seg-report-opt-radio{flex:none;width:16px;height:16px;border-radius:50%;border:2px solid var(--ds-border-input);position:relative;background:var(--ds-surface);}
.seg-report-opt.active .seg-report-opt-radio{border-color:var(--ds-border-selected);}
.seg-report-opt.active .seg-report-opt-radio::after{content:"";position:absolute;inset:2px;border-radius:50%;background:var(--ds-background-selected-bold);}
.seg-report-opt-title{font:var(--ds-font-heading-xsmall);color:var(--ds-text);}
.seg-report-status{display:flex;align-items:center;gap:var(--ds-space-150);padding:var(--ds-space-100) 0;color:var(--ds-text-subtle);}
.seg-report-error{padding:var(--ds-space-200);border-radius:var(--ds-radius-small);background:var(--ds-background-danger);color:var(--ds-text);}
.seg-report-ok{padding:var(--ds-space-200);border-radius:var(--ds-radius-small);background:var(--ds-background-success);color:var(--ds-text);font-weight:600;}

@media print{
  @page{ size:landscape; margin:12mm; }
  #sidebar, .main-topbar, .page-breadcrumb, .seg-btn-report, .seg-modal-overlay, .ds-flags, #mobile-nav, .shell-mfoot{display:none !important;}
  /* El shell de la SPA fija html/body/#app-shell a 100vh con overflow:hidden
     para poder scrollear solo #page-content — eso recorta la impresión a una
     sola pantalla. Hay que liberar TODA la cadena de altura/overflow para
     que el contenido fluya en varias páginas en vez de cortarse. */
  html, body{height:auto !important;overflow:visible !important;background:#fff !important;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
  #app-shell, .app-body{display:block !important;height:auto !important;overflow:visible !important;}
  #main{display:block !important;overflow:visible !important;height:auto !important;}
  #page-content{overflow:visible !important;height:auto !important;padding:0 !important;}
  .page{display:none !important;}
  .page.active{display:block !important;}
  .seg-section, .seg-chart-wrap, .seg-table-wrap, .seg-kpis, .seg-pkg-cards{break-inside:avoid;}
  /* Pestañas vacías (5c): en el PDF no se imprime su aviso, igual que antes de las pestañas */
  #seg-resumen-mount .seg-secpanel-empty{display:none !important;}
}

/* ══ MOBILE (≤767.98px) — F5. Todo acotado a los mounts de Seguimiento: nada cambia en ≥768px ══ */
@media screen and (max-width: 767.98px){
  #seg-resumen-mount .seg-section, #seg-producto-mount .seg-section{margin-bottom:var(--ds-space-400);}

  /* KPIs del sprint: hero a lo ancho + 2 columnas */
  #seg-resumen-mount .seg-kpis--sprint, #seg-producto-mount .seg-kpis--prod{grid-template-columns:repeat(2,minmax(0,1fr));gap:var(--ds-space-100);}
  #seg-resumen-mount .seg-kpis--sprint > .seg-kpi, #seg-producto-mount .seg-kpis--prod > .seg-kpi{padding:var(--ds-space-150);min-width:0;}
  #seg-resumen-mount .seg-kpis--sprint > .seg-kpi:first-child, #seg-producto-mount .seg-kpis--prod > .seg-kpi:first-child{grid-column:1/-1;}
  #seg-resumen-mount .seg-kpis--sprint > .seg-kpi:first-child .seg-kpi-val, #seg-producto-mount .seg-kpis--prod > .seg-kpi:first-child .seg-kpi-val{font:var(--ds-font-metric-large);}

  /* Progreso: el texto envuelve y el % queda fijo a la derecha */
  #seg-resumen-mount .seg-prog-section, #seg-paquetes-mount .seg-prog-section{padding:var(--ds-space-150);}
  #seg-resumen-mount .seg-prog-label, #seg-paquetes-mount .seg-prog-label{align-items:flex-start;}
  #seg-resumen-mount .seg-prog-lbl-pct, #seg-paquetes-mount .seg-prog-lbl-pct{flex:none;}
  #seg-resumen-mount .seg-prog-track, #seg-paquetes-mount .seg-prog-track{height:8px;}

  /* Tira de sprints: sticky de nivel 2 (debajo de las pestañas de sección), full-bleed */
  #seg-resumen-mount #actividad-sprint-tabs{position:sticky;top:var(--ds-tabbar-h);z-index:var(--ds-z-sticky-2);background:var(--ds-surface);
    margin-left:calc(-1 * var(--page-gutter, 16px));margin-right:calc(-1 * var(--page-gutter, 16px));
    padding:0 var(--page-gutter, 16px);scroll-padding-inline:var(--page-gutter, 16px);
    scrollbar-width:none;overscroll-behavior-x:contain;scroll-snap-type:x proximity;}
  /* Modo pila (standalone): no hay tira de secciones encima */
  #seg-resumen-mount.seg-layout-stack #actividad-sprint-tabs{top:0;}
  #seg-resumen-mount #actividad-sprint-tabs::-webkit-scrollbar{display:none;}
  #seg-resumen-mount #actividad-sprint-tabs::after{content:"";position:sticky;right:0;flex:none;width:24px;margin-left:-24px;pointer-events:none;
    background:linear-gradient(90deg, rgba(255,255,255,0), var(--ds-surface));}
  #seg-resumen-mount #actividad-sprint-tabs .seg-tab{min-height:var(--ds-touch-target);padding:0 var(--ds-space-150);scroll-snap-align:start;}

  /* Burndown: alto reservado (sin salto antes del primer dibujo) y readout fijo bajo el gráfico */
  #seg-resumen-mount .seg-side-by-side{gap:0;}
  #seg-resumen-mount .seg-col-dist .seg-chart-wrap{justify-content:flex-start;}
  #seg-resumen-mount .seg-chart-wrap{padding:var(--ds-space-150);margin-bottom:var(--ds-space-200);}
  #seg-resumen-mount #seg-burndown{height:220px;touch-action:pan-y;}
  #seg-resumen-mount .seg-chart-legend{gap:var(--ds-space-100) var(--ds-space-200);}
  #seg-resumen-mount .seg-bd-readout{display:block;min-height:40px;margin-top:var(--ds-space-100);padding:var(--ds-space-100) var(--ds-space-150);
    border-radius:var(--ds-radius-small);background:var(--ds-background-neutral);font:var(--ds-font-body-small);font-size:.8125rem;line-height:1.25rem;color:var(--ds-text);}

  /* Distribución por tipo: etiqueta + números arriba, barra a todo el ancho */
  #seg-resumen-mount .seg-op-dist-panel .seg-cump-row{display:grid;grid-template-columns:minmax(0,1fr) auto;grid-template-areas:"lbl nums" "bar bar";
    row-gap:var(--ds-space-075);column-gap:var(--ds-space-100);}
  #seg-resumen-mount .seg-op-dist-panel .seg-cump-label{grid-area:lbl;width:auto;}
  #seg-resumen-mount .seg-op-dist-panel .seg-cump-nums{grid-area:nums;width:auto;}
  #seg-resumen-mount .seg-op-dist-panel .seg-dist-track{grid-area:bar;}

  /* Evolución diaria: scroll horizontal con la columna "Día" fija */
  #seg-resumen-mount .seg-table-wrap--scroll{overscroll-behavior-x:contain;}
  #seg-resumen-mount .seg-table--diario th, #seg-resumen-mount .seg-table--diario td{white-space:nowrap;}
  #seg-resumen-mount .seg-table--diario th:first-child, #seg-resumen-mount .seg-table--diario td:first-child{position:sticky;left:0;z-index:1;
    background:var(--ds-surface);box-shadow:inset -1px 0 0 var(--ds-border);}
  #seg-resumen-mount .seg-table--diario .prog-mini-wrap{width:64px;}

  /* Tablas → lista de tarjetas (genérico). El thead queda para lectores de pantalla. */
  :is(#seg-resumen-mount,#seg-producto-mount,#seg-paquetes-mount) .seg-table--cards thead{position:absolute;width:1px;height:1px;overflow:hidden;
    clip:rect(0 0 0 0);clip-path:inset(50%);white-space:nowrap;}
  :is(#seg-resumen-mount,#seg-producto-mount,#seg-paquetes-mount) .seg-table--cards,
  :is(#seg-resumen-mount,#seg-producto-mount,#seg-paquetes-mount) .seg-table--cards tbody{display:block;width:100%;}
  :is(#seg-resumen-mount,#seg-producto-mount,#seg-paquetes-mount) .seg-table--cards tr{display:grid;column-gap:var(--ds-space-100);row-gap:var(--ds-space-050);
    align-items:baseline;padding:var(--ds-space-150);border-bottom:1px solid var(--ds-border);}
  :is(#seg-resumen-mount,#seg-producto-mount,#seg-paquetes-mount) .seg-table--cards tr:last-child{border-bottom:0;}
  :is(#seg-resumen-mount,#seg-producto-mount,#seg-paquetes-mount) .seg-table--cards td{display:block;padding:0;border:0;min-width:0;overflow-wrap:anywhere;}
  :is(#seg-resumen-mount,#seg-producto-mount,#seg-paquetes-mount) .seg-table--cards td[data-label]::before{content:attr(data-label) ": ";
    font:var(--ds-font-body-small);color:var(--ds-text-subtlest);}
  :is(#seg-resumen-mount,#seg-producto-mount,#seg-paquetes-mount) .seg-table--cards .seg-cell-title{max-width:none;}
  :is(#seg-resumen-mount,#seg-producto-mount,#seg-paquetes-mount) .seg-table--cards tbody tr:hover td{background:transparent;}
  :is(#seg-resumen-mount,#seg-producto-mount,#seg-paquetes-mount) .seg-table--cards td.seg-empty-row{grid-column:1/-1;}
  :is(#seg-resumen-mount,#seg-producto-mount,#seg-paquetes-mount) .seg-table--cards td.seg-tr-avance,
  :is(#seg-resumen-mount,#seg-producto-mount,#seg-paquetes-mount) .seg-table--cards td.seg-act-avance{width:auto;}
  :is(#seg-resumen-mount,#seg-producto-mount,#seg-paquetes-mount) .seg-table--cards .prog-mini-wrap,
  :is(#seg-resumen-mount,#seg-producto-mount,#seg-paquetes-mount) .seg-table--cards .seg-tr-track{width:auto;flex:1 1 auto;min-width:0;height:8px;}
  /* Detalle de work items */
  #seg-resumen-mount .seg-table--wi tr{grid-template-columns:auto minmax(0,1fr);grid-template-areas:"id est" "tit tit" "asg asg";}
  #seg-resumen-mount .seg-table--wi .seg-id{grid-area:id;}
  #seg-resumen-mount .seg-table--wi .seg-wi-est{grid-area:est;justify-self:end;text-align:right;}
  #seg-resumen-mount .seg-table--wi .seg-cell-title{grid-area:tit;}
  #seg-resumen-mount .seg-table--wi .seg-wi-asg{grid-area:asg;font:var(--ds-font-body-small);color:var(--ds-text-subtle);}
  /* Deuda (x2) */
  #seg-resumen-mount .seg-table--deuda tr{grid-template-columns:auto minmax(0,1fr);grid-template-areas:"id tipo" "tit tit" "est est" "ori ori";}
  #seg-resumen-mount .seg-table--deuda .seg-id{grid-area:id;}
  #seg-resumen-mount .seg-table--deuda .seg-dd-tipo{grid-area:tipo;justify-self:start;}
  #seg-resumen-mount .seg-table--deuda .seg-cell-title{grid-area:tit;}
  #seg-resumen-mount .seg-table--deuda .seg-dd-est{grid-area:est;}
  #seg-resumen-mount .seg-table--deuda .seg-dd-ori{grid-area:ori;}
  /* Cumplimiento: % primero, metadatos con la etiqueta arriba, fila actual resaltada */
  #seg-resumen-mount .seg-table--hist tr{grid-template-columns:repeat(6,minmax(0,1fr));
    grid-template-areas:"spr spr spr spr spr spr" "cum cum cum cum cum cum" "ini ini ini fin fin fin" "cer cer pen pen tot tot";}
  #seg-resumen-mount .seg-table--hist .seg-h-spr{grid-area:spr;}
  #seg-resumen-mount .seg-table--hist .seg-h-cum{grid-area:cum;}
  #seg-resumen-mount .seg-table--hist .seg-h-ini{grid-area:ini;}
  #seg-resumen-mount .seg-table--hist .seg-h-fin{grid-area:fin;}
  #seg-resumen-mount .seg-table--hist .seg-h-cer{grid-area:cer;}
  #seg-resumen-mount .seg-table--hist .seg-h-pen{grid-area:pen;}
  #seg-resumen-mount .seg-table--hist .seg-h-tot{grid-area:tot;}
  #seg-resumen-mount .seg-table--hist td[data-label]::before{content:attr(data-label);display:block;}
  #seg-resumen-mount .seg-table--hist tr.is-current{background:var(--ds-background-selected);box-shadow:inset 4px 0 0 var(--ds-border-selected);}
  #seg-resumen-mount .seg-table--hist tr.is-current td{background:transparent;}
  /* Observaciones */
  #seg-resumen-mount .seg-table--obs tr{grid-template-columns:auto minmax(0,1fr);grid-template-areas:"num fec" "tra tra" "tip sev" "est est";}
  #seg-resumen-mount .seg-table--obs .seg-key{grid-area:num;}
  #seg-resumen-mount .seg-table--obs .seg-o-fec{grid-area:fec;justify-self:end;text-align:right;}
  #seg-resumen-mount .seg-table--obs .seg-cell-title{grid-area:tra;}
  #seg-resumen-mount .seg-table--obs .seg-o-tip{grid-area:tip;}
  #seg-resumen-mount .seg-table--obs .seg-o-sev{grid-area:sev;}
  #seg-resumen-mount .seg-table--obs .seg-o-est{grid-area:est;}

  /* Deuda: 3 cards en fila (el backlog, solo, ocupa todo el ancho por auto-fit) */
  #seg-resumen-mount .seg-debt-cards{grid-template-columns:repeat(auto-fit,minmax(88px,1fr));gap:var(--ds-space-100);}
  #seg-resumen-mount .seg-debt-card{padding:var(--ds-space-100) var(--ds-space-150);min-width:0;}
  #seg-resumen-mount .seg-debt-lbl{overflow-wrap:anywhere;hyphens:auto;}

  /* Colapsables: summary de 44px */
  #seg-resumen-mount .seg-collapsible summary{min-height:var(--ds-touch-target);padding:var(--ds-space-100) var(--ds-space-150);}
  #seg-resumen-mount .seg-collapsible-body{padding:var(--ds-space-100) var(--ds-space-150) var(--ds-space-150);}

  /* Observaciones: pestañas 50/50, filtros con la etiqueta en su línea y chips de 40px, KPIs 2×2 */
  #seg-resumen-mount #obs-main-tabs .seg-tab{flex:1 1 0;min-width:0;min-height:var(--ds-touch-target);white-space:normal;text-align:center;padding:0 var(--ds-space-100);}
  #seg-resumen-mount .seg-obs-filters{gap:var(--ds-space-100);}
  #seg-resumen-mount .seg-obs-filter-lbl{flex-basis:100%;margin:0;}
  #seg-resumen-mount .seg-obs-filter{height:auto;min-height:40px;padding:0 var(--ds-space-150);}
  #seg-resumen-mount #obs-collapsible .seg-kpis{grid-template-columns:repeat(2,minmax(0,1fr));gap:var(--ds-space-100);}
  #seg-resumen-mount #obs-collapsible .seg-kpi{padding:var(--ds-space-100) var(--ds-space-150);min-width:0;}

  /* Lozenges y badges: ≥12px, envuelven en vez de truncar */
  :is(#seg-resumen-mount,#seg-producto-mount,#seg-paquetes-mount) :is(.seg-badge,.seg-rag,.ds-lozenge){font-size:.75rem;line-height:16px;height:auto;min-height:20px;
    padding:2px var(--ds-space-075);white-space:normal;max-width:100%;overflow:visible;text-overflow:clip;overflow-wrap:anywhere;}

  /* Avance de Producto */
  #seg-producto-mount .seg-pkg-cards{gap:var(--ds-space-100);}
  #seg-producto-mount .seg-pkg-card{padding:var(--ds-space-150) var(--ds-space-200);}
  #seg-producto-mount .seg-pkg-card .seg-prog-track{height:8px;}
  #seg-producto-mount .seg-section--tramites{display:flex;flex-direction:column;}
  #seg-producto-mount .seg-section--tramites > .ds-pkgtabs{order:1;position:sticky;top:0;z-index:var(--ds-z-sticky);box-shadow:0 0 0 var(--ds-space-050) var(--ds-surface);}
  #seg-producto-mount .seg-section--tramites > .ds-pkgtabs-caption{order:2;}
  #seg-producto-mount .seg-section--tramites > .seg-chart-legend{order:3;margin:0 0 var(--ds-space-150);}
  #seg-producto-mount .seg-section--tramites > .seg-table-wrap{order:4;}
  #seg-producto-mount .seg-chart-legend .seg-legend-title{display:flex;font-weight:600;color:var(--ds-text);}
  #seg-producto-mount .seg-table--tramites tr{grid-template-columns:auto auto minmax(0,1fr);grid-template-areas:"pkg no name" "av av av";align-items:baseline;}
  #seg-producto-mount .seg-table--tramites .seg-tr-pkg{grid-area:pkg;}
  #seg-producto-mount .seg-table--tramites .seg-tr-no{grid-area:no;}
  #seg-producto-mount .seg-table--tramites .seg-tr-no::before{content:"#";}
  #seg-producto-mount .seg-table--tramites .seg-cell-title{grid-area:name;font:var(--ds-font-heading-xsmall);}
  #seg-producto-mount .seg-table--tramites .seg-tr-avance{grid-area:av;}
  #seg-producto-mount .seg-table--tramites .seg-tr-pct{flex:none;font:var(--ds-font-heading-xsmall);}

  /* Resumen por paquete (página oculta) */
  #seg-paquetes-mount .seg-pkgfull-card{padding:var(--ds-space-200);}
  #seg-paquetes-mount .seg-pkgfull-badges{width:100%;}
  #seg-paquetes-mount .seg-table--act tr{grid-template-columns:minmax(0,1fr);grid-template-areas:"act" "fec" "av";}
  #seg-paquetes-mount .seg-table--act .seg-act-nom{grid-area:act;font-weight:600;}
  #seg-paquetes-mount .seg-table--act .seg-act-fechas{grid-area:fec;white-space:normal !important;}
  #seg-paquetes-mount .seg-table--act .seg-act-avance{grid-area:av;}
}
/* Horizontal (poco alto): la tira de sprints deja de ser sticky */
@media screen and (max-width: 767.98px) and (max-height: 500px){
  #seg-resumen-mount #actividad-sprint-tabs, #seg-resumen-mount.seg-layout-stack #actividad-sprint-tabs{position:static;}
}
@media screen and (max-width: 479.98px){
  #seg-resumen-mount .seg-kpis--sprint > .seg-kpi:not(:first-child) .seg-kpi-val,
  #seg-producto-mount .seg-kpis--prod > .seg-kpi:not(:first-child) .seg-kpi-val{font-size:clamp(1.25rem,6.4vw,1.5rem);}
  #seg-resumen-mount .seg-debt-cards{grid-template-columns:repeat(auto-fit,minmax(80px,1fr));}
}
/* Sin hover real (táctil): el :hover queda "pegado" tras el tap → valores de reposo */
@media screen and (max-width: 767.98px) and (hover: none){
  #seg-resumen-mount .seg-tab:hover:not(.active){color:var(--ds-text-subtle);border-bottom-color:transparent;}
  #seg-resumen-mount .seg-obs-filter:hover:not(.active){background:var(--ds-background-neutral);color:var(--ds-text-subtle);}
  #seg-resumen-mount .seg-collapsible summary:hover{background:transparent;}
  #seg-resumen-mount .seg-table--diario tbody tr:hover td{background:var(--ds-surface);}
}
`;

  function mountStyles(){
    if(document.getElementById('seg-styles-v3')) return;
    var s=document.createElement('style'); s.id='seg-styles-v3'; s.textContent=CSS;
    document.head.appendChild(s);
  }

  // ══════════════════════════════════════════════════════════════
  // RESUMEN EJECUTIVO
  // ══════════════════════════════════════════════════════════════
  // Cálculos puros detrás de las 5 tarjetas KPI del Resumen Ejecutivo,
  // separados de la construcción del HTML para poder reutilizarlos en la
  // generación desatendida del reporte (ver SEG_GENERATE_REPORT_STANDALONE),
  // que solo necesita los números para el cuerpo del correo, no el markup.
  function computeResumenKpis(activo, transiciones, diario, detalle){
    var sa = activo && activo.length ? activo[activo.length-1] : null;
    var avance     = sa ? parseFloat(sa.avance_pct)||0 : 0;
    var cerrado    = sa ? parseInt(sa.closed)||parseInt(sa.closed_items)||0 : 0;
    var total      = sa ? parseInt(sa.total_items)||0 : 0;
    var burnRate   = sa ? parseFloat(sa.burn_rate_items_dia)||0 : 0;
    var sprintNom  = sa ? fmt(sa.sprint) : '—';

    // Tiempo transcurrido — sprint 10 días hábiles
    var diasT = sa ? parseInt(sa.dias_transcurridos)||0 : 0;
    var diasH = sa ? parseInt(sa.dias_habiles_total)||10 : 10;
    var tiempoPct = Math.min(Math.round(diasT/diasH*100), 100);

    // Deuda técnica real (ver computeDeudaArrastrada): ítems marcados como
    // arrastrados en `transiciones`, cruzados con work_items_detalle para
    // saber su estado actual.
    var estadoPorId = buildEstadoLookup(detalle);
    var deudaCalc = computeDeudaArrastrada(transiciones, sprintNom);
    var deudaEnSprint = deudaCalc.enSprint.map(function(r){ return enrichDeudaRow(r, estadoPorId); });
    // Backlog: arrastrados que ya no están en ningún sprint (removidos de
    // iteración) y no se confirma que estén cerrados.
    var deudaBacklog = deudaCalc.backlog
      .map(function(r){ return enrichDeudaRow(r, estadoPorId); })
      .filter(function(r){ return r.estado!=='Closed'; });
    var deudaTotal   = deudaEnSprint.length;
    var deudaAbiertos = deudaEnSprint.filter(function(r){ return r.estado!=='Closed'; }).length;
    var deudaCerrados = deudaTotal - deudaAbiertos;
    var deudaPct     = total>0 ? (deudaTotal/total*100).toFixed(1) : '0.0';

    // Cumplimiento histórico — derivado de sprint_diario_acumulado (sprint_historico
    // llega vacío de la hoja): por cada sprint, tomar el último día registrado.
    // El sprint activo se sobrescribe con sprint_activo (sa), que es más fresco.
    var sprintSummaries = computeSprintSummaries(diario, sa, sprintNom);
    var last5Summaries = sprintSummaries.slice(-5);
    var velSum=0; var velCnt=0;
    last5Summaries.forEach(function(s){ if(!isNaN(s.avance_pct)){velSum+=s.avance_pct;velCnt++;} });
    var velProm = velCnt ? (velSum/velCnt).toFixed(1) : '—';

    return { sa:sa, avance:avance, cerrado:cerrado, total:total, burnRate:burnRate, sprintNom:sprintNom,
      diasT:diasT, diasH:diasH, tiempoPct:tiempoPct,
      deudaEnSprint:deudaEnSprint, deudaBacklog:deudaBacklog, deudaTotal:deudaTotal,
      deudaAbiertos:deudaAbiertos, deudaCerrados:deudaCerrados, deudaPct:deudaPct,
      sprintSummaries:sprintSummaries, last5Summaries:last5Summaries,
      velProm:velProm, velCnt:velCnt };
  }

  // ── Pestañas de sección del Resumen ejecutivo (5c) ──
  var SEG_SECTIONS = [
    { id:'sprint',       label:'Sprint actual' },
    { id:'actividad',    label:'Actividad por sprint' },
    { id:'cumplimiento', label:'Cumplimiento' },
    { id:'deuda',        label:'Deuda técnica' },
    { id:'obs',          label:'Observaciones' }
  ];
  var SEG_SEC_KEY = 'issssydt_seg_section';
  function segSecActive(){
    var v = window.DS ? DS.store.get(SEG_SEC_KEY) : null;
    return SEG_SECTIONS.some(function(sx){ return sx.id===v; }) ? v : 'sprint';
  }
  function segActivateSec(mount, key, fromUser){
    if(!mount.querySelector('.ds-secpanel[data-seg-sec="'+key+'"]')) key = 'sprint';
    var strip = mount.querySelector('.seg-sectabs');
    if(strip) strip.querySelectorAll('.ds-sectab').forEach(function(t){
      var on = t.getAttribute('data-seg-sec')===key;
      t.classList.toggle('is-active', on); t.setAttribute('aria-selected', on); t.tabIndex = on ? 0 : -1;
    });
    var panel = null;
    mount.querySelectorAll(':scope > .ds-secpanel').forEach(function(p){
      var on = p.getAttribute('data-seg-sec')===key;
      p.classList.toggle('is-active', on);
      if(on) panel = p;
    });
    DS.store.set(SEG_SEC_KEY, key);
    // El canvas no se puede dibujar mientras su panel está oculto (mide 0px).
    if(key==='actividad') requestAnimationFrame(function(){
      redrawBurndown();
      if(segIsMobile()) segRevealSprintTab(mount);
    });
    if(strip) DS.tabs.reveal(strip.querySelector('.is-active'));
    if(fromUser) DS.tabs.revealPanel(strip, panel);
  }
  // Delegado sobre el mount (persiste entre re-renders): se registra una sola vez.
  function segWireSecTabs(mount){
    if(mount.__segSecWired) return;
    mount.__segSecWired = true;
    mount.addEventListener('click', function(e){
      var t = e.target.closest('.seg-sectabs .ds-sectab');
      if(t && mount.contains(t)) segActivateSec(mount, t.getAttribute('data-seg-sec'), true);
    });
  }
  function redrawBurndown(){
    if(!_burndownData || !_burndownData.sprint) return;
    var dayRows = diarioDayRows(_burndownData.diario, _burndownData.sprint);
    drawBurndown(dayRows, nDiasHabilesSprint(_burndownData.sprint, _burndownData.sa, dayRows));
  }

  // opts.layout: 'tabs' en el portal mobile (una sección a la vez); por defecto
  // 'stack' (portal desktop, reporte standalone y generación desatendida: todo apilado).
  function buildEjecutivo(mount, activo, transiciones, diario, roadmap, obsGen, obsUx, detalle, opts){
    var tabs = !!(opts && opts.layout === 'tabs');
    var k = computeResumenKpis(activo, transiciones, diario, detalle);
    var sa=k.sa, avance=k.avance, cerrado=k.cerrado, total=k.total, burnRate=k.burnRate, sprintNom=k.sprintNom;
    var diasT=k.diasT, diasH=k.diasH, tiempoPct=k.tiempoPct;
    var deudaEnSprint=k.deudaEnSprint, deudaBacklog=k.deudaBacklog, deudaTotal=k.deudaTotal;
    var deudaAbiertos=k.deudaAbiertos, deudaCerrados=k.deudaCerrados, deudaPct=k.deudaPct;
    var sprintSummaries=k.sprintSummaries, last5Summaries=k.last5Summaries;
    var velProm=k.velProm, velCnt=k.velCnt;
    var ts = sa ? fmt(sa.timestamp) : '—';

    // ── KPIs (5 cards, sin "sin actividad") ──
    var kpisHTML =
      '<div class="seg-kpis seg-kpis--sprint">'
      // 1. Avance sprint
      +'<div class="seg-kpi kpi-dark">'
        +'<div class="seg-kpi-lbl">Avance del sprint</div>'
        +'<div class="seg-kpi-val">'+pct(avance)+'</div>'
        +'<div class="seg-kpi-sub">'+cerrado+' de '+total+' ítems cerrados</div>'
      +'</div>'
      // 2. Tiempo transcurrido
      +'<div class="seg-kpi">'
        +'<div class="seg-kpi-lbl">Tiempo transcurrido</div>'
        +'<div class="seg-kpi-val">'+pct(tiempoPct,0)+'</div>'
        +'<div class="seg-kpi-sub">Día '+diasT+' de '+diasH+' hábiles</div>'
      +'</div>'
      // 3. Burn rate
      +'<div class="seg-kpi">'
        +'<div class="seg-kpi-lbl">Burn rate</div>'
        +'<div class="seg-kpi-val">'+burnRate.toFixed(2)+'</div>'
        +'<div class="seg-kpi-sub">ítems cerrados / día hábil</div>'
      +'</div>'
      // 4. Deuda técnica
      +'<div class="seg-kpi'+(deudaTotal>0?' kpi-warn':'')+'">'
        +'<div class="seg-kpi-lbl">Deuda técnica</div>'
        +'<div class="seg-kpi-val">'+deudaPct+'%</div>'
        +'<div class="seg-kpi-sub">'+deudaTotal+' de '+total+' ítems arrastrados</div>'
      +'</div>'
      // 5. Cumplimiento histórico
      +'<div class="seg-kpi">'
        +'<div class="seg-kpi-lbl">Cumplim. histórico</div>'
        +'<div class="seg-kpi-val">'+(velProm==='—'?'—':velProm+'%')+'</div>'
        +'<div class="seg-kpi-sub">Promedio últimos '+velCnt+' sprints</div>'
      +'</div>'
      +'</div>';

    // ── BARRAS DUALES (estilo reporte HTML) ──
    var avanceRC = ragC(avance);
    var avanceGrad = pbGrad(avanceRC);
    // Color de marca, igual que la tarjeta destacada "Avance del sprint".
    var tiempoGrad = 'var(--ds-chart-brand)';
    // Reglas: <=40% rojo · >40% y <85% naranja · >=85% verde
    var itemsRC    = avance>=85 ? 'rag-green' : avance>40 ? 'rag-amber' : 'rag-red';
    var itemsGrad  = pbGrad(itemsRC);

    var dualesHTML =
      '<div class="seg-section"><div class="seg-sh">Progreso '+sprintNom+'</div>'
      +'<div class="seg-prog-section">'
      // Tiempo transcurrido
      +'<div class="seg-prog-row">'
        +'<div class="seg-prog-label">'
          +'<span class="seg-prog-lbl-txt">Tiempo transcurrido (día '+diasT+' de '+diasH+')</span>'
          +'<span class="seg-prog-lbl-pct">'+pct(tiempoPct,0)+'</span>'
        +'</div>'
        +'<div class="seg-prog-track"><div class="seg-prog-fill" style="width:'+tiempoPct+'%;background:'+tiempoGrad+';"></div></div>'
      +'</div>'
      // Ítems cerrados
      +'<div class="seg-prog-row">'
        +'<div class="seg-prog-label">'
          +'<span class="seg-prog-lbl-txt">Avance de cierre de ítems — '+sprintNom+'</span>'
          +'<span class="seg-prog-lbl-pct '+ragTxt(itemsRC)+'">'+pct(avance)+'</span>'
        +'</div>'
        +'<div class="seg-prog-track"><div class="seg-prog-fill" style="width:'+Math.min(avance,100)+'%;background:'+itemsGrad+';"></div></div>'
      +'</div>'
      +'</div></div>';

    // ── ACTIVIDAD POR SPRINT (Burndown + Distribución por tipo + Evolución
    // diaria + Detalle de work items, un solo set de tabs de sprint controla
    // las cuatro visualizaciones a la vez — ver buildActividadSprintHTML). ──
    var actividad = buildActividadSprintHTML(sa, diario||[], detalle||[], { newestFirst: tabs });

    // ── DEUDA TÉCNICA (se muestra al final de la página, ver mount.innerHTML) ──
    var deudaHTML = buildDeudaEjecutivo(deudaTotal, deudaAbiertos, deudaCerrados, deudaEnSprint, deudaBacklog);

    // ── CUMPLIMIENTO (tabla de todos los sprints; el promedio de últimos 5
    // ya se muestra en el KPI "Cumplim. histórico" arriba) ──
    var histHTML = buildHistoricoTable(sprintSummaries, last5Summaries, sprintNom);

    // ── OBSERVACIONES (colapsable) ──
    var obsHTML = buildObservacionesCollapsible(obsGen||[], obsUx||[], tabs);

    // Hook del modo pila (standalone): la tira de sprints mobile pega en top:0
    // porque no hay pestañas de sección encima. Sin regla base: desktop no cambia.
    mount.classList.toggle('seg-layout-stack', !tabs);

    var sprintHTML = '<div class="seg-section"><div class="seg-sh">Sprint activo — '+sprintNom+'</div>'
      +kpisHTML+'</div>'
      +dualesHTML;

    if(tabs){
      var act = segSecActive();
      var panel = function(key, html, emptyMsg){
        var body = html || '<div class="seg-empty">'+emptyMsg+'</div>';
        return '<div class="ds-secpanel'+(key===act?' is-active':'')+(html?'':' seg-secpanel-empty')+'" id="seg-sec-panel-'+key+'" data-seg-sec="'+key+'"'
          +' role="tabpanel" aria-labelledby="seg-sec-tab-'+key+'">'+body+'</div>';
      };
      mount.innerHTML =
        '<div class="seg-ts seg-ts--head">Último sync: '+ts+'</div>'
        +'<div class="ds-sectabs seg-sectabs" role="tablist" aria-label="Secciones del Resumen ejecutivo">'
          +SEG_SECTIONS.map(function(sx){
            var on = sx.id===act;
            return '<button type="button" role="tab" class="ds-sectab'+(on?' is-active':'')+'" id="seg-sec-tab-'+sx.id+'" data-seg-sec="'+sx.id+'"'
              +' aria-controls="seg-sec-panel-'+sx.id+'" aria-selected="'+on+'" tabindex="'+(on?0:-1)+'">'+sx.label+'</button>';
          }).join('')
        +'</div>'
        +panel('sprint', sprintHTML)
        +panel('actividad', actividad.html, 'Todavía no hay registros diarios de actividad para mostrar.')
        +panel('cumplimiento', histHTML, 'Todavía no hay sprints con datos de cierre.')
        +panel('deuda', deudaHTML, 'Sin deuda técnica registrada.')
        +panel('obs', obsHTML, 'No hay observaciones UAT registradas.');
      segWireSecTabs(mount);
    } else {
      mount.innerHTML =
        sprintHTML
        +actividad.html
        +histHTML
        +deudaHTML
        +obsHTML
        +'<div class="seg-ts">Último sync: '+ts+'</div>';
    }

    // Dibujar canvas del sprint seleccionado por defecto (el más reciente)
    _burndownData = { diario: diario||[], sa: sa, sprint: actividad.lastSp };
    // redrawBurndown dibuja el sprint de _burndownData (= lastSp, igual que antes),
    // pero respeta un sprint restaurado tras una revalidación (ver segRestoreState).
    if(actividad.lastSp) setTimeout(redrawBurndown, 80);
    wireActividadSprintTabs(mount, sa, diario||[]);
    wireObservaciones(mount, obsGen, obsUx);
    if(segIsMobile()) segRevealSprintTab(mount);
  }

  // ── Mobile (F5): helpers. Solo DS.isMobile()/DS.onMobileChange, sin matchMedia propio ──
  function segIsMobile(){ return !!(window.DS && DS.isMobile && DS.isMobile()); }
  // Centra el sprint activo en su tira (no-op si la tira no desborda o está oculta).
  function segRevealSprintTab(mount){
    var act = mount && mount.querySelector('#actividad-sprint-tabs .seg-tab.active');
    if(act && window.DS && DS.tabs) DS.tabs.reveal(act);
  }
  // Estado de la UI que se pierde con el innerHTML de una revalidación silenciosa.
  function segCaptureState(mount){
    var st = { details:{}, obsTab:null, obsFilters:{} };
    var sp = mount.querySelector('#actividad-sprint-tabs .seg-tab.active');
    st.sprint = sp ? sp.getAttribute('data-sp') : null;
    var ot = mount.querySelector('#obs-main-tabs .seg-tab.active');
    st.obsTab = ot ? ot.getAttribute('data-obs-tab') : null;
    ['gen','ux'].forEach(function(p){
      var t = mount.querySelector('#filter-tipo-'+p+' .seg-obs-filter.active');
      var e = mount.querySelector('#filter-estado-'+p+' .seg-obs-filter.active');
      st.obsFilters[p] = { tipo: t ? t.getAttribute('data-tipo') : 'all', estado: e ? e.getAttribute('data-estado') : 'all' };
    });
    // <details> por id si lo tienen; si no, por el texto del summary sin el "(n)" final.
    mount.querySelectorAll('details').forEach(function(d){ st.details[segDetailsKey(d)] = d.open; });
    return st;
  }
  function segDetailsKey(d){
    if(d.id) return '#'+d.id;
    var s = d.querySelector('summary');
    return (s ? s.textContent : '').replace(/\s*\(\d+\)\s*$/, '').trim();
  }
  function segRestoreState(mount, st){
    if(!st) return;
    function click(sel){ var b = mount.querySelector(sel); if(b && !b.classList.contains('active')) b.click(); }
    if(st.sprint) click('#actividad-sprint-tabs .seg-tab[data-sp="'+st.sprint.replace(/"/g,'')+'"]');
    if(st.obsTab) click('#obs-main-tabs .seg-tab[data-obs-tab="'+st.obsTab+'"]');
    Object.keys(st.obsFilters).forEach(function(p){
      var f = st.obsFilters[p];
      if(f.tipo && f.tipo!=='all') click('#filter-tipo-'+p+' [data-tipo="'+f.tipo+'"]');
      if(f.estado && f.estado!=='all') click('#filter-estado-'+p+' [data-estado="'+f.estado.replace(/"/g,'')+'"]');
    });
    mount.querySelectorAll('details').forEach(function(d){
      var k = segDetailsKey(d);
      if(Object.prototype.hasOwnProperty.call(st.details, k)) d.open = st.details[k];
    });
    segRevealSprintTab(mount);
  }

  function computeSprintSummaries(diario, sa, sprintActivo){
    var bySprint = {};
    (diario||[]).forEach(function(r){
      if(!r.sprint) return;
      var day = parseInt(r.dia_sprint)||0;
      var fecha = String(r.fecha_cst||'');
      var s = bySprint[r.sprint];
      if(!s){
        s = bySprint[r.sprint] = {
          sprint: r.sprint,
          closed: 0, total_items: 0, avance_pct: 0,
          fecha_inicio: '', fecha_fin: '',
          _day: -1
        };
      }
      // fecha_inicio/fecha_fin = min/max de todas las filas del sprint (no
      // solo la del último día), así cubren todo el rango aunque el sprint
      // siga en curso.
      if(fecha){
        if(!s.fecha_inicio || fecha < s.fecha_inicio) s.fecha_inicio = fecha;
        if(!s.fecha_fin || fecha > s.fecha_fin) s.fecha_fin = fecha;
      }
      if(day >= s._day){
        s.closed = parseInt(r.closed_items)||0;
        s.total_items = parseInt(r.total_items)||0;
        s.avance_pct = parseFloat(r.avance_pct)||0;
        s._day = day;
      }
    });
    if(sa && sprintActivo){
      var sAct = bySprint[sprintActivo] || (bySprint[sprintActivo] = { sprint: sprintActivo, fecha_inicio:'', fecha_fin:'' });
      sAct.closed = parseInt(sa.closed)||parseInt(sa.closed_items)||0;
      sAct.total_items = parseInt(sa.total_items)||0;
      sAct.avance_pct = parseFloat(sa.avance_pct)||0;
    }
    return Object.keys(bySprint).map(function(k){ return bySprint[k]; }).sort(function(a,b){
      return parseInt(String(a.sprint||'').replace(/\D/g,''))-parseInt(String(b.sprint||'').replace(/\D/g,''));
    });
  }

  function buildBurndownHTML(){
    return '<div class="seg-sh">Burndown del sprint</div>'
      +'<div class="seg-chart-wrap">'
      +'<canvas id="seg-burndown" height="200" style="width:100%;display:block;"></canvas>'
      +'<div class="seg-chart-legend">'
        +'<span><i class="i-ideal"></i>Línea ideal</span>'
        +'<span><i class="i-real"></i>Ítems restantes</span>'
        +'<span><i class="i-bar" style="display:inline-block;"></i>Cerrados por día</span>'
      +'</div>'
      // Readout fijo (solo visible en mobile): reemplaza al tooltip de hover; lo pinta drawBurndown.
      +'<div class="seg-bd-readout" id="seg-bd-readout" aria-live="polite"></div>'
      +'</div>';
  }

  // Agrupa las filas de sprint_diario_acumulado de un sprint por día real
  // (la hoja trae varias corridas/re-syncs por día) y se queda con la última
  // por día — misma fuente para Burndown, Distribución y Evolución diaria,
  // así los tres quedan sincronizados bajo el mismo filtro de sprint.
  function diarioDayRows(diario, sprint){
    var rows = (diario||[]).filter(function(r){ return r.sprint===sprint; });
    var byDay = {};
    rows.forEach(function(r){ byDay[r.dia_sprint] = r; });
    return Object.keys(byDay).map(function(k){ return byDay[k]; }).sort(function(a,b){
      return (parseInt(a.dia_sprint)||0) - (parseInt(b.dia_sprint)||0);
    });
  }

  function ultimaFilaDiario(diario, sprint){
    var rows = diarioDayRows(diario, sprint);
    return rows.length ? rows[rows.length-1] : null;
  }

  // Días hábiles totales del sprint para el eje X: si es el sprint activo,
  // se usa el total declarado en sprint_activo (el diario aún no tiene todos
  // los días); si es un sprint cerrado, el diario ya lo cubre completo.
  function nDiasHabilesSprint(sprint, sa, dayRows){
    if(sa && sprint===sa.sprint){
      var n = parseInt(sa.dias_habiles_total);
      if(!isNaN(n) && n>0) return n;
    }
    var max=0;
    (dayRows||[]).forEach(function(r){ var d=parseInt(r.dia_sprint)||0; if(d>max) max=d; });
    return max||10;
  }

  function drawBurndown(dayRows, nDias){
    var canvas = document.getElementById('seg-burndown');
    if(!canvas) return;
    if(!canvas.getClientRects().length) return; // panel oculto: se dibuja al mostrarse
    var ctx0 = canvas.getContext('2d');
    var dayPoints = (dayRows||[]).map(function(r){
      return { d: parseInt(r.dia_sprint)||0, total: parseInt(r.total_items)||0, closed: parseInt(r.closed_items)||0 };
    });
    if(!dayPoints.length){ ctx0.clearRect(0,0,canvas.width,canvas.height); return; }

    nDias = nDias || 10;
    var scaleMax = Math.max.apply(null, dayPoints.map(function(p){ return p.total; }));
    if(scaleMax===0) return;
    var idealStart = dayPoints[0].total || scaleMax;

    // Restaurar ancho porcentual antes de medir: una vez fijado en px (más abajo),
    // canvas.offsetWidth queda "congelado" en ese valor y ya no refleja el ancho
    // real disponible en redibujos posteriores (resize, colapso de sidebar, etc.)
    // Mobile (F5): más alto, ticks de 12-13px, padding medido y backing store
    // redondeado. En desktop (m=false) las constantes son exactamente las de siempre.
    var m = segIsMobile();
    canvas.style.width='100%';
    var W=canvas.offsetWidth||600; var H= m ? 220 : 200;
    var ctx=canvas.getContext('2d');
    if(m){
      var dpr = window.devicePixelRatio||1;
      canvas.width=Math.round(W*dpr); canvas.height=Math.round(H*dpr);
      canvas.style.width=W+'px'; canvas.style.height=H+'px';
      ctx=canvas.getContext('2d');
      ctx.setTransform(canvas.width/W,0,0,canvas.height/H,0,0);
    } else {
      canvas.width=W*window.devicePixelRatio; canvas.height=H*window.devicePixelRatio;
      canvas.style.width=W+'px'; canvas.style.height=H+'px';
      ctx=canvas.getContext('2d');
      ctx.scale(window.devicePixelRatio,window.devicePixelRatio);
    }
    var fontFamily = DS.token('--ds-font-family-body','sans-serif');
    var fontPx = m ? (W>=260 ? 13 : 12) : 11;
    var pad;
    if(m){
      ctx.font = fontPx+'px '+fontFamily;
      pad={top:12,right:12,bottom:30,left:Math.ceil(ctx.measureText(String(scaleMax)).width)+10};
    } else {
      pad={top:16,right:24,bottom:36,left:48};
    }
    var cW=W-pad.left-pad.right; var cH=H-pad.top-pad.bottom;

    // Data: ítems RESTANTES por día real de sprint (total propio del día - cerrados del día)
    var realPts = dayPoints.map(function(p,i){
      return { x:p.d, y: p.total-p.closed, dayClose: p.closed-(i>0?dayPoints[i-1].closed:0) };
    });
    function xp(d){ return pad.left + (d/nDias)*cW; }
    function yp(v){ return pad.top + cH - (v/scaleMax)*cH; }

    ctx.clearRect(0,0,W,H);

    // Colores y tipografía del design system (el canvas no entiende var()).
    var C = {
      grid:  DS.token('--ds-chart-grid','rgba(11,18,14,.08)'),
      tick:  DS.token('--ds-text-subtlest','#6B6E76'),
      bar:   DS.token('--ds-chart-warning','#F68909'),
      ideal: DS.token('--ds-chart-neutral','#8C8F97'),
      real:  DS.token('--ds-chart-brand','#1E4B7A'),
      font:  fontPx + 'px ' + fontFamily
    };

    // Y ticks
    var yStep = scaleMax<=10?2:scaleMax<=20?5:Math.ceil(scaleMax/5);
    ctx.strokeStyle=C.grid; ctx.lineWidth=1;
    for(var yv=0;yv<=scaleMax;yv+=yStep){
      ctx.beginPath(); ctx.moveTo(pad.left,yp(yv)); ctx.lineTo(pad.left+cW,yp(yv)); ctx.stroke();
      ctx.fillStyle=C.tick; ctx.font=C.font; ctx.textAlign='right';
      ctx.fillText(yv, pad.left-6, yp(yv)+4);
    }

    // X ticks
    ctx.fillStyle=C.tick; ctx.font=C.font; ctx.textAlign='center';
    // Paso del eje X: 2 en desktop; en mobile, el que deje ≥32px entre etiquetas.
    var xStep = m ? Math.max(1, Math.ceil(nDias / Math.max(1, Math.floor(cW/32)))) : 2;
    for(var d=0;d<=nDias;d+=xStep){
      ctx.fillText('D'+d, xp(d), H-pad.bottom+16);
    }

    // Barras de cerrados por día (amarillo/naranja)
    var barW = Math.max(4, (cW/nDias)*0.5);
    realPts.forEach(function(pt){
      if(pt.dayClose>0){
        var bh=(pt.dayClose/scaleMax)*cH;
        ctx.fillStyle=C.bar;
        ctx.fillRect(xp(pt.x)-barW/2, pad.top+cH-bh, barW, bh);
      }
    });

    // Línea ideal (gris) — de idealStart en día 0 a 0 en el último día hábil
    ctx.strokeStyle=C.ideal; ctx.lineWidth=1.5; ctx.setLineDash([4,3]);
    ctx.beginPath(); ctx.moveTo(xp(0),yp(idealStart)); ctx.lineTo(xp(nDias),yp(0)); ctx.stroke();
    ctx.setLineDash([]);

    // Línea real — ítems restantes, un punto por día real de sprint
    if(realPts.length>0){
      ctx.strokeStyle=C.real; ctx.lineWidth=2;
      ctx.beginPath(); ctx.moveTo(xp(0),yp(idealStart));
      realPts.forEach(function(pt){ ctx.lineTo(xp(pt.x),yp(pt.y)); });
      ctx.stroke();
      // Puntos
      ctx.fillStyle=C.real;
      realPts.forEach(function(pt){
        ctx.beginPath(); ctx.arc(xp(pt.x),yp(pt.y),3.5,0,Math.PI*2); ctx.fill();
      });
    }

    // Tooltip
    var wrap = canvas.parentElement;
    if(wrap.style.position !== 'relative') wrap.style.position = 'relative';
    var ttId = 'seg-bd-tt';
    var tt = document.getElementById(ttId);
    if(!tt){
      tt = document.createElement('div');
      tt.id = ttId;
      tt.className = 'seg-tooltip';
      wrap.appendChild(tt);
    }
    // Día más cercano a una coordenada X de pantalla, y los datos de ese día
    // (compartidos por el tooltip de desktop y el readout de mobile).
    function nearestDay(clientX){
      var rect = canvas.getBoundingClientRect();
      var mx = clientX - rect.left;
      var nearDay = 0; var nearDist = Infinity;
      for(var d=0; d<=nDias; d++){
        var dist = Math.abs(xp(d) - mx);
        if(dist < nearDist){ nearDist = dist; nearDay = d; }
      }
      return { day: nearDay, dist: nearDist };
    }
    function infoFor(day){
      var actualPt = null;
      for(var i=0; i<realPts.length; i++){ if(realPts[i].x===day){ actualPt=realPts[i]; break; } }
      return { idealRem: Math.round(idealStart * (1 - day / nDias)), actualPt: actualPt };
    }

    // Readout fijo (solo visible en mobile por CSS): Día · Plan · Real · +cerrados.
    // Handlers como propiedad para no acumular listeners en cada redibujo.
    var ro = document.getElementById('seg-bd-readout');
    if(ro){
      var paintRo = function(day){
        var inf = infoFor(day);
        ro.innerHTML = '<b>Día '+day+'</b> · Plan: <b>'+inf.idealRem+'</b> restantes'
          + (inf.actualPt
              ? ' · Real: <b>'+inf.actualPt.y+'</b> restantes'+(inf.actualPt.dayClose>0 ? ' · +'+inf.actualPt.dayClose+' cerrados ese día' : '')
              : ' · sin dato real');
      };
      paintRo(realPts.length ? realPts[realPts.length-1].x : 0);
      canvas.onpointerdown = canvas.onpointermove = function(e){
        if(!segIsMobile()) return;
        paintRo(nearestDay(e.clientX).day);
      };
    }

    canvas.onmousemove = function(e){
      if(segIsMobile()){ tt.style.display='none'; return; }
      var nd = nearestDay(e.clientX);
      var nearDay = nd.day, nearDist = nd.dist;
      if(nearDist > 28){ tt.style.display='none'; return; }
      var inf = infoFor(nearDay);
      var idealRem = inf.idealRem, actualPt = inf.actualPt;
      var lines = ['<b>Día ' + nearDay + '</b>'];
      lines.push('Plan: <b>' + idealRem + '</b> restantes');
      if(actualPt){
        lines.push('Real: <b>' + actualPt.y + '</b> restantes');
        if(actualPt.dayClose > 0) lines.push('+' + actualPt.dayClose + ' cerrados hoy');
      }
      tt.innerHTML = lines.join('<br>');
      tt.style.display = 'block';
      var tx = xp(nearDay) + 14;
      if(tx + tt.offsetWidth + 10 > W) tx = xp(nearDay) - tt.offsetWidth - 14;
      tt.style.left = tx + 'px';
      tt.style.top = (pad.top + 4) + 'px';
    };
    canvas.onmouseleave = function(){ tt.style.display = 'none'; };
  }

  function buildDistribucion(tc,tt,bc,bt,ic,it,sprint){
    if(tt+bt+it===0) return '';
    // Ancho de la barra basado en CANTIDADES (relativo al total de los 3
    // tipos), no forzado a 100% por fila — así se compara de un vistazo
    // cuánto pesa cada tipo dentro del sprint. Tono oscuro = cerrados,
    // tono claro = abiertos. Color fijo por tipo: Tasks=azul, Bugs=naranja,
    // Issues=gris. Misma fila (etiqueta | barra | cerrados/total (pct%))
    // que "Cumplimiento al cierre" para mantener el mismo alineado.
    var grand = tt + bt + it;
    var COLORES_TIPO = {
      Tasks:  {cerrado:'var(--ds-chart-information)', abierto:'var(--ds-chart-information-subtle)'},
      Bugs:   {cerrado:'var(--ds-chart-warning)',     abierto:'var(--ds-chart-warning-subtle)'},
      Issues: {cerrado:'var(--ds-chart-gray)',        abierto:'var(--ds-chart-gray-subtle)'}
    };
    function fila(label, c, t){
      // El % entre paréntesis es la participación de este tipo sobre el
      // total de ítems del sprint (t/grand) — no el % de cerrados de ese tipo.
      var pTipo = grand>0 ? (t/grand*100) : 0;
      var col = COLORES_TIPO[label];
      var wCerrado = grand>0 ? (c/grand*100) : 0;
      var wAbierto = grand>0 ? ((t-c)/grand*100) : 0;
      return '<div class="seg-cump-row">'
        +'<div class="seg-cump-label">'+label+'</div>'
        +'<div class="seg-avance-track seg-dist-track" style="flex:1;display:flex;">'
          +'<div class="seg-seg" style="background:'+col.cerrado+';width:'+wCerrado.toFixed(1)+'%;"></div>'
          +'<div class="seg-seg" style="background:'+col.abierto+';width:'+wAbierto.toFixed(1)+'%;"></div>'
        +'</div>'
        +'<div class="seg-cump-nums mono">'+c+'/'+t+' <span class="seg-muted">('+Math.round(pTipo)+'%)</span></div>'
        +'</div>';
    }
    return '<div class="seg-sh">Distribución de ítems por tipo — '+sprint+' (cerrados vs. abiertos)</div>'
      +'<div class="seg-chart-wrap">'
      +fila('Tasks', tc, tt)
      +fila('Bugs', bc, bt)
      +fila('Issues', ic, it)
      +'<div class="seg-caption">Tono oscuro = cerrados · tono claro = abiertos · ancho de la barra proporcional a la cantidad de ítems</div>'
      +'</div>';
  }

  function buildDeudaEjecutivo(total, abiertos, cerrados, enSprint, backlog){
    var hayBacklog = backlog && backlog.length > 0;
    if(total === 0 && !hayBacklog){
      return '<div class="seg-section"><div class="seg-sh">Deuda técnica</div>'
        +'<div class="seg-success-msg">✓ No hay deuda técnica en este sprint ni en el backlog.</div></div>';
    }

    function deudaTable(items){
      var t = '<div class="seg-table-wrap"><table class="seg-table seg-table--cards seg-table--deuda">'
        +'<thead><tr><th>ID</th><th>Tipo</th><th>Título</th><th>Estado</th><th>Sprint origen</th></tr></thead><tbody>';
      items.forEach(function(r){
        var estStr = fmt(r.estado);
        var estCls = estStr==='Closed' ? 'seg-state-ok' : estStr==='Sin dato' ? 'seg-muted' : 'seg-state-open';
        var tipoCls = String(r.tipo||r.type||'').toLowerCase().includes('bug')
          ? 'tipo-bug'
          : String(r.tipo||r.type||'').toLowerCase().includes('issue')
            ? 'tipo-issue'
            : 'tipo-task';
        t+='<tr>'
          +'<td class="seg-id">#'+(r.work_item_id||r.id||'—')+'</td>'
          +'<td class="seg-dd-tipo"><span class="seg-badge '+tipoCls+'">'+fmt(r.tipo||r.type)+'</span></td>'
          +'<td class="seg-cell-title">'+fmt(r.titulo||r.title)+'</td>'
          +'<td class="'+estCls+' seg-dd-est" data-label="Estado">'+estStr+'</td>'
          +'<td class="mono seg-muted seg-dd-ori" data-label="Sprint origen">'+fmt(r.sprint_origen||r.sprint_previo)+'</td>'
          +'</tr>';
      });
      return t+'</tbody></table></div>';
    }

    var html = '<div class="seg-section"><div class="seg-sh">Deuda técnica — ítems arrastrados</div>';

    function collapsibleTable(summaryLabel, tableHtml){
      return '<details class="seg-collapsible" style="margin-top:12px;">'
        +'<summary>'+summaryLabel+'</summary>'
        +'<div class="seg-collapsible-body">'+tableHtml+'</div>'
        +'</details>';
    }

    if(total > 0){
      html += '<div class="seg-subh">En el sprint actual</div>'
        +'<div class="seg-debt-cards">'
        +'<div class="seg-debt-card"><div class="seg-debt-val">'+total+'</div><div class="seg-debt-lbl">Total arrastrado</div></div>'
        +'<div class="seg-debt-card red"><div class="seg-debt-val">'+abiertos+'</div><div class="seg-debt-lbl">Aún abiertos</div></div>'
        +'<div class="seg-debt-card green"><div class="seg-debt-val">'+cerrados+'</div><div class="seg-debt-lbl">Cerrados en sprint</div></div>'
        +'</div>'
        +collapsibleTable('Ver listado de ítems arrastrados en el sprint actual ('+total+')', deudaTable(enSprint));
    }

    if(hayBacklog){
      html += '<div class="seg-subh" style="margin-top:var(--ds-space-300);">En el backlog (sin sprint asignado)</div>'
        +'<div class="seg-debt-cards">'
        +'<div class="seg-debt-card red"><div class="seg-debt-val">'+backlog.length+'</div><div class="seg-debt-lbl">Pendientes en backlog</div></div>'
        +'</div>'
        +collapsibleTable('Ver listado de ítems en backlog ('+backlog.length+')', deudaTable(backlog));
    }

    return html + '</div>';
  }

  function buildHistoricoTable(allSnaps, last5, sprintActivo){
    if(!allSnaps||!allSnaps.length) return '';
    var last5Set = {};
    last5.forEach(function(r){ last5Set[r.sprint]=true; });
    var html='<div class="seg-section"><div class="seg-sh">Cumplimiento al cierre — todos los sprints</div>'
      +'<div class="seg-table-wrap"><table class="seg-table seg-table--cards seg-table--hist">'
      +'<thead><tr><th>Sprint</th><th>Inicio</th><th>Fin</th><th>Cerrados</th><th>Pendientes</th><th>Total</th><th>Cumplimiento</th></tr></thead><tbody>';
    allSnaps.forEach(function(r){
      var cp=parseFloat(r.cumplimiento_pct||r.avance_pct);
      var rc=ragC(cp); var bw=Math.min(isNaN(cp)?0:cp,100);
      var esActual = r.sprint===sprintActivo;
      var esLast5 = last5Set[r.sprint] && !esActual;
      var totalN = parseInt(r.total_asof||r.total_items)||0;
      var closedN = parseInt(r.closed_asof||r.closed)||0;
      var pendN = Math.max(totalN-closedN,0);
      html+='<tr'+(esActual?' class="is-current"':'')+'>'
        +'<td class="mono seg-h-spr" style="font-weight:'+(esActual?'600':'400')+';white-space:nowrap;">'
        +fmt(r.sprint)
        +(esActual?' <span class="ds-lozenge ds-lozenge--inprogress">Actual</span>':'')
        +(esLast5?' <span class="seg-muted" title="Incluido en promedio histórico" aria-label="Incluido en promedio histórico">★</span>':'')
        +'</td>'
        +'<td class="mono seg-h-ini" data-label="Inicio">'+(r.fecha_inicio?fechaDDMMYYYY(r.fecha_inicio):'—')+'</td>'
        +'<td class="mono seg-h-fin" data-label="Fin">'+(r.fecha_fin?fechaDDMMYYYY(r.fecha_fin):'—')+'</td>'
        +'<td class="mono seg-h-cer" data-label="Cerrados">'+fmt(r.closed_asof||r.closed||'—')+'</td>'
        +'<td class="mono seg-h-pen" data-label="Pendientes">'+pendN+'</td>'
        +'<td class="mono seg-h-tot" data-label="Total">'+fmt(r.total_asof||r.total_items||'—')+'</td>'
        +'<td class="seg-h-cum" data-label="Cumplimiento"><div style="display:flex;align-items:center;gap:8px;">'
          +'<div class="prog-mini-wrap prog-mini-wrap--wide"><div class="prog-mini-fill" style="width:'+bw+'%;background:'+pbGrad(rc)+';"></div></div>'
          +'<span class="mono">'+pct(cp)+'</span>'
        +'</div></td>'
        +'</tr>';
    });
    html+='</tbody></table></div>'
      +'<div class="seg-caption">★ Incluido en el promedio histórico (últimos 5 sprints)</div>'
      +'</div>';
    return html;
  }

  // ══════════════════════════════════════════════════════════════
  // ACTIVIDAD POR SPRINT — Burndown + Distribución por tipo + Evolución
  // diaria + Detalle de work items, las cuatro bajo el MISMO set de tabs
  // de sprint (todas leen de sprint_diario_acumulado vía diarioDayRows).
  // Seleccionar un sprint pasado cambia las cuatro visualizaciones a la vez.
  // ══════════════════════════════════════════════════════════════
  function buildActividadSprintHTML(sa, diario, detalle, opts){
    var sprintActivo = sa ? sa.sprint : null;

    var sprintMap={};
    (diario||[]).forEach(function(r){ if(r.sprint) sprintMap[r.sprint]=true; });
    var sprints=Object.keys(sprintMap).sort(function(a,b){ return parseInt(a.replace(/\D/g,''))-parseInt(b.replace(/\D/g,'')); });
    if(!sprints.length) return { html:'', lastSp:null };
    var lastSp=sprints[sprints.length-1]||sprintActivo;

    var tabsHTML='<div class="seg-tabs" id="actividad-sprint-tabs">';
    // En mobile el sprint más reciente (activo por defecto) va primero; en desktop
    // y en el standalone, del más antiguo al más reciente.
    (opts && opts.newestFirst ? sprints.slice().reverse() : sprints).forEach(function(sp){ tabsHTML+='<button class="seg-tab'+(sp===lastSp?' active':'')+'" data-sp="'+sp+'">'+sp+'</button>'; });
    tabsHTML+='</div>';

    // Distribución por tipo: un panel pre-renderizado por sprint (mismo
    // patrón que Evolución diaria/Detalle), toggled por las mismas tabs.
    var distPanelsHTML='';
    sprints.forEach(function(sp){
      var last = ultimaFilaDiario(diario, sp);
      var tc=last?parseInt(last.tasks_closed)||0:0, tt=last?parseInt(last.tasks_total)||0:0;
      var bc=last?parseInt(last.bugs_closed)||0:0, bt=last?parseInt(last.bugs_total)||0:0;
      var ic=last?parseInt(last.issues_closed)||0:0, it=last?parseInt(last.issues_total)||0:0;
      distPanelsHTML += '<div class="seg-op-dist-panel" data-sp-dist-panel="'+sp+'" style="'+(sp===lastSp?'':'display:none;')+'">'+buildDistribucion(tc,tt,bc,bt,ic,it,sp)+'</div>';
    });

    function buildDiarioTable(sprint){
      var dayRows = diarioDayRows(diario, sprint);
      if(!dayRows.length) return '<div class="seg-empty">Sin datos para este sprint.</div>';
      var h='<div class="seg-table-wrap seg-table-wrap--scroll" role="region" aria-label="Evolución diaria — '+sprint+'"><table class="seg-table seg-table--diario">'
        +'<thead><tr><th>Día</th><th>Fecha</th><th>Cerrados</th><th>Pendientes</th><th>Total</th><th>Avance</th><th>Burn rate</th></tr></thead><tbody>';
      dayRows.forEach(function(r){
        var cp=parseFloat(r.avance_pct); var rc=ragC(cp); var bw=Math.min(isNaN(cp)?0:cp,100);
        var totalN=parseInt(r.total_items)||0; var closedN=parseInt(r.closed_items)||0;
        var pendN=Math.max(totalN-closedN,0);
        h+='<tr>'
          +'<td class="seg-key">D'+fmt(r.dia_sprint)+'</td>'
          +'<td class="mono">'+fechaDDMMYYYY(r.fecha_cst)+'</td>'
          +'<td class="mono">'+fmt(r.closed_items)+'</td>'
          +'<td class="mono">'+pendN+'</td>'
          +'<td class="mono">'+fmt(r.total_items)+'</td>'
          +'<td><div style="display:flex;align-items:center;gap:8px;">'
            +'<div class="prog-mini-wrap"><div class="prog-mini-fill" style="width:'+bw+'%;background:'+pbGrad(rc)+';"></div></div>'
            +'<span class="mono">'+pct(cp)+'</span>'
          +'</div></td>'
          +'<td class="mono">'+fmt(r.burn_rate_acum)+'</td>'
          +'</tr>';
      });
      return h+'</tbody></table></div>';
    }

    function buildDetalleTable(sprint){
      var rows=(detalle||[]).filter(function(r){ return r.sprint===sprint; });
      if(!rows.length) return '<div class="seg-empty">Sin ítems para este sprint.</div>';
      rows.sort(function(a,b){ return (parseInt(a.id)||0)-(parseInt(b.id)||0); });
      var h='<div class="seg-table-wrap"><table class="seg-table seg-table--cards seg-table--wi">'
        +'<thead><tr><th>ID</th><th>Título</th><th>Estado</th><th>Asignado</th></tr></thead><tbody>';
      rows.forEach(function(r){
        var closed=String(r.estado||'').toLowerCase()==='closed';
        h+='<tr>'
          +'<td class="seg-id">#'+fmt(r.id)+'</td>'
          +'<td class="seg-cell-title">'+fmt(r.titulo)+'</td>'
          +'<td class="'+(closed?'seg-state-ok':'seg-state-open')+' seg-wi-est">'+fmt(r.estado)+'</td>'
          +'<td class="seg-wi-asg" data-label="Asignado">'+fmt(r.asignado)+'</td>'
          +'</tr>';
      });
      return h+'</tbody></table></div>';
    }

    var panelsHTML='';
    sprints.forEach(function(sp){
      panelsHTML+='<div class="seg-op-diario-panel" data-sp-panel="'+sp+'" style="'+(sp===lastSp?'':'display:none;')+'">'+buildDiarioTable(sp)+'</div>';
    });

    var detallePanelsHTML='';
    sprints.forEach(function(sp){
      detallePanelsHTML+='<div class="seg-op-detalle-panel" data-sp-detalle-panel="'+sp+'" style="'+(sp===lastSp?'':'display:none;')+'">'+buildDetalleTable(sp)+'</div>';
    });

    var html = '<div class="seg-section">'
      +'<div class="seg-sh">Actividad por sprint</div>'
      +tabsHTML
      +'<div class="seg-side-by-side" style="margin-top:14px;">'
        +'<div class="seg-col">'+buildBurndownHTML()+'</div>'
        +'<div class="seg-col seg-col-dist">'+distPanelsHTML+'</div>'
      +'</div>'
      +'<div class="seg-sh" style="margin-top:20px;">Evolución diaria — <span id="seg-diario-sp-label">'+fmt(lastSp)+'</span></div>'
      +panelsHTML
      +'<details class="seg-collapsible" id="detalle-wi-collapsible" style="margin-top:16px;">'
        +'<summary>Detalle de work items — '+fmt(lastSp)+'</summary>'
        +'<div class="seg-collapsible-body">'+detallePanelsHTML+'</div>'
      +'</details>'
    +'</div>';

    return { html: html, lastSp: lastSp };
  }

  function wireActividadSprintTabs(mount, sa, diario){
    mount.querySelectorAll('#actividad-sprint-tabs .seg-tab[data-sp]').forEach(function(t){
      t.addEventListener('click',function(){
        mount.querySelectorAll('#actividad-sprint-tabs .seg-tab[data-sp]').forEach(function(x){ x.classList.remove('active'); });
        t.classList.add('active');
        var sp = t.dataset.sp;

        mount.querySelectorAll('.seg-op-dist-panel').forEach(function(p){
          p.style.display = (p.dataset.spDistPanel===sp) ? '' : 'none';
        });
        mount.querySelectorAll('.seg-op-diario-panel').forEach(function(p){
          p.style.display = (p.dataset.spPanel===sp) ? '' : 'none';
        });
        mount.querySelectorAll('.seg-op-detalle-panel').forEach(function(p){
          p.style.display = (p.dataset.spDetallePanel===sp) ? '' : 'none';
        });
        var summ = mount.querySelector('#detalle-wi-collapsible summary');
        if(summ) summ.textContent = 'Detalle de work items — '+sp;
        var lbl = mount.querySelector('#seg-diario-sp-label');
        if(lbl) lbl.textContent = sp;

        if(_burndownData) _burndownData.sprint = sp;
        var dayRows = diarioDayRows(diario, sp);
        drawBurndown(dayRows, nDiasHabilesSprint(sp, sa, dayRows));
        if(segIsMobile()) DS.tabs.reveal(t);
      });
    });
  }

  // ══════════════════════════════════════════════════════════════
  // RESUMEN POR PAQUETE — avance/estado real por P1, P2, P3
  // "Avance de desarrollo" viene de la hoja Resumen_Paquetes (Apps Script
  // Capa 1: cierre de Task/Bug/Issue en Azure DevOps), ya no de roadmap.json.
  // El resto (liberación, SPI, alcance, gantt) sigue viniendo de roadmap.json.
  // ══════════════════════════════════════════════════════════════
  function resumenPorPaqueteMap(rows){
    var map = {};
    (rows||[]).forEach(function(r){ if(r && r.paquete) map[r.paquete] = r; });
    return map;
  }

  function buildAvancePorPaqueteCards(roadmap, resumenDevOps){
    var devopsMap = resumenPorPaqueteMap(resumenDevOps);
    var html = '<div class="seg-section"><div class="seg-sh">Avance por paquete — plan de trabajo</div>'
      +'<div class="seg-pkg-cards">';
    ((roadmap && roadmap.paquetes) || []).forEach(function(p){
      var pkgNum = String(p.id||'').replace(/\D/g,'');
      var deadline = new Date(p.liberacion+'T00:00:00');
      var dr = diasRestantes(deadline);
      var devops = devopsMap[p.id];
      var avanceN = devops ? parseFloat(devops.avance_pct) : NaN;
      var pp = isNaN(avanceN) ? null : Math.round(avanceN);
      var drc = dr>30?'days-ok':dr>10?'days-warn':'days-crit';
      var drTxt = dr<0?'Vencido hace '+Math.abs(dr)+' días':dr+' días restantes';
      var barGrad = pp===null ? 'var(--ds-chart-neutral)' : pbGrad(ragC(pp));
      html+='<div class="seg-pkg-card pkg-p'+pkgNum+'">'
        +'<div class="seg-pkg-id">Paquete '+pkgNum+'</div>'
        +'<div class="seg-pkg-name">'+fmt(p.nombre)+'</div>'
        +'<div class="seg-pkg-deadline">'+deadline.toLocaleDateString('es-SV',{day:'2-digit',month:'short',year:'numeric'})+'</div>'
        +'<div class="seg-pkg-days '+drc+'">'+drTxt+'</div>'
        +'<div class="seg-pkg-row">'
          +'<span>Avance de desarrollo</span><span>'+(pp===null?'—':pp+'%')+'</span>'
        +'</div>'
        +'<div class="seg-prog-track"><div class="seg-prog-fill" style="width:'+(pp||0)+'%;background:'+barGrad+';"></div></div>'
        +(devops?'<div class="seg-caption">'+fmt(devops.hijos_cerrados)+'/'+fmt(devops.hijos_total)+' ítems cerrados (DevOps)</div>':'')
        +'</div>';
    });
    html+='</div></div>';
    return html;
  }

  function buildResumenPorPaquete(mount, roadmap, resumenDevOps){
    var paquetes = (roadmap && roadmap.paquetes) || [];
    if(!paquetes.length){ mount.innerHTML = '<div class="seg-empty">Sin datos de paquetes.</div>'; return; }
    var devopsMap = resumenPorPaqueteMap(resumenDevOps);
    var html = buildAvancePorPaqueteCards(roadmap, resumenDevOps);
    paquetes.forEach(function(p){
      var pkgNum = String(p.id||'').replace(/\D/g,'');
      var deadline = new Date(p.liberacion+'T00:00:00');
      var dr = diasRestantes(deadline);
      var drTxt = dr<0?'Vencido hace '+Math.abs(dr)+' días':dr+' días restantes';
      var drc = dr>30?'days-ok':dr>10?'days-warn':'days-crit';
      var devops = devopsMap[p.id];
      var avanceN = devops ? parseFloat(devops.avance_pct) : NaN;
      var progReal = isNaN(avanceN) ? null : Math.round(avanceN);
      var progPlan = Math.round(p.progreso_planif||0);
      var estadoCls = p.estado==='En desarrollo' ? 'rag-amber' : p.estado==='Planificado' ? 'rag-gray' : 'rag-green';

      var actividades = (p.gantt||[]).filter(function(a){ return a.tipo!=='hito' && typeof a.progreso==='number'; });
      var actRows = actividades.map(function(a){
        var rc = ragC(a.progreso);
        return '<tr>'
          +'<td class="seg-act-nom">'+fmt(a.actividad)+'</td>'
          +'<td class="mono seg-muted seg-act-fechas" data-label="Fechas" style="white-space:nowrap;">'+fmt(a.inicio)+' → '+fmt(a.fin)+'</td>'
          +'<td class="seg-act-avance" data-label="Avance"><div style="display:flex;align-items:center;gap:8px;">'
            +'<div class="prog-mini-wrap prog-mini-wrap--act"><div class="prog-mini-fill" style="width:'+a.progreso+'%;background:'+pbGrad(rc)+';"></div></div>'
            +'<span class="mono">'+a.progreso+'%</span>'
          +'</div></td>'
          +'</tr>';
      }).join('');

      var alcanceHTML = (p.alcance||[]).map(function(s){ return '<li>'+fmt(s)+'</li>'; }).join('');

      html += '<div class="seg-section">'
        +'<div class="seg-pkgfull-card pkg-p'+pkgNum+'">'
          +'<div class="seg-pkgfull-head">'
            +'<div>'
              +'<div class="seg-pkg-id">Paquete '+pkgNum+'</div>'
              +'<div class="seg-pkgfull-name">'+fmt(p.nombre)+'</div>'
            +'</div>'
            +'<div class="seg-pkgfull-badges">'
              +'<span class="seg-rag '+estadoCls+'">'+fmt(p.estado)+'</span>'
              +spiBadge(p.spi)
            +'</div>'
          +'</div>'
          +'<div class="seg-pkg-deadline">Liberación: '+deadline.toLocaleDateString('es-SV',{day:'2-digit',month:'short',year:'numeric'})+'</div>'
          +'<div class="seg-pkg-days '+drc+'">'+drTxt+'</div>'
          +'<div class="seg-prog-section" style="margin-top:14px;">'
            +'<div class="seg-prog-row">'
              +'<div class="seg-prog-label"><span class="seg-prog-lbl-txt">Avance de desarrollo'+(devops?' ('+fmt(devops.hijos_cerrados)+'/'+fmt(devops.hijos_total)+' ítems cerrados)':'')+'</span><span class="seg-prog-lbl-pct">'+(progReal===null?'—':progReal+'%')+'</span></div>'
              +'<div class="seg-prog-track"><div class="seg-prog-fill" style="width:'+(progReal||0)+'%;background:'+(progReal===null?'var(--ds-chart-neutral)':pbGrad(ragC(progReal)))+';"></div></div>'
            +'</div>'
            +'<div class="seg-prog-row">'
              +'<div class="seg-prog-label"><span class="seg-prog-lbl-txt">Avance planificado</span><span class="seg-prog-lbl-pct">'+progPlan+'%</span></div>'
              +'<div class="seg-prog-track"><div class="seg-prog-fill" style="width:'+progPlan+'%;background:var(--ds-background-selected-hovered);"></div></div>'
            +'</div>'
          +'</div>'
          +(actRows?'<div class="seg-table-wrap" style="margin-top:14px;"><table class="seg-table seg-table--cards seg-table--act"><thead><tr><th>Actividad</th><th>Fechas</th><th>Avance</th></tr></thead><tbody>'+actRows+'</tbody></table></div>':'')
          +(alcanceHTML?'<div style="margin-top:var(--ds-space-200);"><div class="seg-subh">Alcance</div><ul class="seg-list">'+alcanceHTML+'</ul></div>':'')
        +'</div>'
      +'</div>';
    });
    mount.innerHTML = html;
  }

  // ══════════════════════════════════════════════════════════════
  // AVANCE DE PRODUCTO — modelo de madurez (techos por estado + peso
  // Desarrollo/QA) por trámite/paquete/producto. Todos los porcentajes vienen
  // ya calculados de scripts/sync-avance-producto.js (avance_producto.json):
  // este módulo solo los pinta, nunca los recalcula. El semáforo (verde/ámbar/
  // rojo) sí se deriva aquí con los mismos umbrales que el resto del portal
  // (ragC/ragL), porque es distinto del "rag" de Resumen_Paquetes (ese es
  // sobre avance de desarrollo puro, no sobre este modelo ponderado).
  // ══════════════════════════════════════════════════════════════
  var _prodFiltro = 'all';
  var _prodData = null;
  function aplicarFiltroProducto(mount, sel, paquetes){
    var bar = mount.querySelector('.ds-pkgtabs[data-pkg-group="producto"]');
    if(!bar) return;
    if(!bar.querySelector('.ds-pkgtab[data-pkg="'+sel+'"]')) sel = 'all';
    var n = 0;
    mount.querySelectorAll('[data-paquete-row]').forEach(function(tr){
      var ver = sel==='all' || tr.dataset.paqueteRow===sel;
      tr.style.display = ver ? '' : 'none';
      if(ver) n++;
    });
    var p = paquetes.filter(function(x){ return fmt(x.paquete)===sel; })[0];
    var caption = sel==='all'
      ? 'Todos los paquetes · '+n+' trámites'
      : 'Paquete '+sel.replace(/\D/g,'')+' · '+fmt(p && p.nombre)+' · '+n+' trámites';
    DS.pkgTabs.setActive(bar, sel, caption);
  }

  function buildAvanceProducto(mount, data){
    var paquetes = (data && data.paquetes) || [];
    var tramites = (data && data.tramites) || [];
    if(!paquetes.length){ mount.innerHTML = '<div class="seg-empty">Sin datos de avance de producto.</div>'; return; }
    var producto = (data && data.producto) || {};
    var param = (data && data.meta && data.meta.parametros) || {};

    var html = '<div class="seg-kpis seg-kpis--prod">'
      +'<div class="seg-kpi kpi-dark"><div class="seg-kpi-lbl">Avance total del producto</div><div class="seg-kpi-val">'+pct(producto.avance_total)+'</div><div class="seg-kpi-sub">Desarrollo + QA, ponderado</div></div>'
      +'<div class="seg-kpi"><div class="seg-kpi-lbl">Aporte Desarrollo</div><div class="seg-kpi-val">'+pct(producto.aporte_desarrollo)+'</div><div class="seg-kpi-sub">de '+pct(param.peso_desarrollo,0)+' del total</div></div>'
      +'<div class="seg-kpi'+((parseFloat(producto.aporte_qa)||0)===0?' kpi-warn':'')+'"><div class="seg-kpi-lbl">Aporte QA</div><div class="seg-kpi-val">'+pct(producto.aporte_qa)+'</div><div class="seg-kpi-sub">de '+pct(param.peso_qa,0)+' del total</div></div>'
      +'</div>';

    html += '<div class="seg-section"><div class="seg-sh">Avance ponderado por paquete</div><div class="seg-pkg-cards">';
    paquetes.forEach(function(p){
      var pkgNum = String(p.paquete||'').replace(/\D/g,'');
      var rc = ragC(p.avance_total);
      html += '<div class="seg-pkg-card pkg-p'+pkgNum+'">'
        +'<div class="seg-pkg-id">'+fmt(p.paquete)+'</div>'
        +'<div class="seg-pkg-name">'+fmt(p.nombre)+'</div>'
        +'<div class="seg-pkg-row">'
          +'<span>Avance ponderado</span>'
          +'<span class="seg-pkg-big">'+pct(p.avance_total)+'</span>'
        +'</div>'
        +'<div class="seg-prog-track"><div class="seg-prog-fill" style="width:'+(p.avance_total||0)+'%;background:'+pbGrad(rc)+';"></div></div>'
        +'<div class="seg-caption">Peso en el producto: '+pct(p.peso,0)+'</div>'
        +'</div>';
    });
    html += '</div></div>';

    var tramitesOrdenados = tramites.slice().sort(function(a,b){ return (parseInt(a.orden,10)||0)-(parseInt(b.orden,10)||0); });

    // Mobile: control segmentado unificado. Desktop: tabs "Todos / Paquete N".
    var mobile = segIsMobile();
    html += '<div class="seg-section seg-section--tramites"><div class="seg-sh">Avance por trámite</div>'
      +(mobile
        ? DS.pkgTabs.html({ group:'producto', mode:'filter', includeAll:true, active:'all',
            items: paquetes.map(function(p){ return { id:fmt(p.paquete), name:fmt(p.nombre) }; }) })
        : '<div class="seg-tabs" id="prod-tramite-filtro">'
            +'<button class="seg-tab active" data-paquete-filtro="all">Todos</button>'
            +paquetes.map(function(p){ return '<button class="seg-tab" data-paquete-filtro="'+fmt(p.paquete)+'">Paquete '+String(p.paquete||'').replace(/\D/g,'')+'</button>'; }).join('')
          +'</div>')
      +'<div class="seg-table-wrap"><table class="seg-table seg-table--cards seg-table--tramites">'
      +'<thead><tr><th>Paquete</th><th>No</th><th>Trámite</th><th>Avance (Desarrollo + QA)</th></tr></thead><tbody>';
    tramitesOrdenados.forEach(function(t){
      // Si el Sheet no trae el desglose Desarrollo/QA por trámite, se pinta
      // una sola barra con el avance_total (mismo color que el resto del
      // portal) en vez de inventar una proporción dev/qa que no se conoce.
      var tieneDesglose = t.aporte_desarrollo !== null && t.aporte_desarrollo !== undefined;
      var barraHTML = tieneDesglose
        ? '<div class="seg-seg fill-dev" style="width:'+(parseFloat(t.aporte_desarrollo)||0)+'%;"></div>'
          +'<div class="seg-seg fill-qa" style="width:'+(parseFloat(t.aporte_qa)||0)+'%;"></div>'
        : '<div class="seg-seg" style="width:'+(parseFloat(t.avance_total)||0)+'%;background:'+pbGrad(ragC(t.avance_total))+';"></div>';
      html += '<tr data-paquete-row="'+fmt(t.paquete)+'">'
        +'<td class="seg-tr-pkg"><span class="ds-lozenge">'+fmt(t.paquete)+'</span></td>'
        +'<td class="mono seg-muted seg-tr-no">'+fmt(t.orden)+'</td>'
        +'<td class="seg-cell-title">'+fmt(t.nombre)+'</td>'
        +'<td class="seg-tr-avance"><div style="display:flex;align-items:center;gap:8px;">'
          +'<div class="seg-prog-track seg-tr-track">'+barraHTML+'</div>'
          +'<span class="mono seg-tr-pct" style="white-space:nowrap;">'+pct(t.avance_total)+'</span>'
        +'</div></td>'
        +'</tr>';
    });
    html += '</tbody></table></div>'
      +'<div class="seg-chart-legend">'
        +'<span class="seg-legend-title">Avance (Desarrollo + QA):</span>'
        +'<span><span class="seg-legend-swatch fill-dev"></span>Desarrollo</span>'
        +'<span><span class="seg-legend-swatch fill-qa"></span>QA</span>'
      +'</div>'
      +'</div>';

    mount.innerHTML = html;
    _prodData = data;

    // Siempre arranca en "Todos"; la elección se conserva en memoria (sobrevive
    // a la revalidación silenciosa). En mobile, si es un paquete, el Roadmap la sigue.
    if(!mobile){
      var tabsBar = mount.querySelector('#prod-tramite-filtro');
      var aplicar = function(sel){
        if(!tabsBar.querySelector('[data-paquete-filtro="'+sel+'"]')) sel = 'all';
        tabsBar.querySelectorAll('[data-paquete-filtro]').forEach(function(x){ x.classList.toggle('active', x.dataset.paqueteFiltro===sel); });
        mount.querySelectorAll('[data-paquete-row]').forEach(function(tr){
          tr.style.display = (sel==='all' || tr.dataset.paqueteRow===sel) ? '' : 'none';
        });
      };
      tabsBar.querySelectorAll('[data-paquete-filtro]').forEach(function(btn){
        btn.addEventListener('click', function(){ _prodFiltro = btn.dataset.paqueteFiltro; aplicar(_prodFiltro); });
      });
      aplicar(_prodFiltro);
      return;
    }
    var filtroBar = mount.querySelector('.ds-pkgtabs[data-pkg-group="producto"]');
    if(filtroBar){
      filtroBar.id = 'prod-tramite-filtro';
      filtroBar.querySelectorAll('.ds-pkgtab').forEach(function(btn){
        btn.addEventListener('click', function(){
          var sel = btn.getAttribute('data-pkg');
          _prodFiltro = sel;
          aplicarFiltroProducto(mount, sel, paquetes);
          if(sel !== 'all') DS.pkg.set(sel, 'producto');
        });
      });
      aplicarFiltroProducto(mount, _prodFiltro, paquetes);
    }
  }

  // ══════════════════════════════════════════════════════════════
  // OBSERVACIONES — listado de tareas de UAT (Generales + Diseño UX),
  // dentro de un contenedor colapsable al final de Resumen ejecutivo.
  // ══════════════════════════════════════════════════════════════
  function getTipo(r){
    return String(r['Tipo \n(Bug / Issue / UX / Nuevo requerimiento)']
      ||r['Tipo \r\n(Bug / Issue / UX / Nuevo requerimiento)']
      ||r.Tipo||'—');
  }

  function buildObsKpis(rows){
    var total=rows.length;
    var pendientes=rows.filter(function(r){ var s=String(r['Estado TCA']||'').trim(); return s!=='Completado'&&s!==''; }).length;
    var bugs=rows.filter(function(r){ return getTipo(r).toLowerCase().includes('bug'); }).length;
    var completados=rows.filter(function(r){ return String(r['Estado TCA']||'').trim()==='Completado'; }).length;
    var pctComp=total>0?Math.round(completados/total*100):0;
    return '<div class="seg-kpis" style="margin-bottom:20px;">'
      +'<div class="seg-kpi kpi-dark"><div class="seg-kpi-lbl">Total obs.</div><div class="seg-kpi-val">'+total+'</div></div>'
      +'<div class="seg-kpi"><div class="seg-kpi-lbl">Pendientes</div><div class="seg-kpi-val'+(pendientes>0?' kpi-warn':'')+'">'+pendientes+'</div></div>'
      +'<div class="seg-kpi"><div class="seg-kpi-lbl">Bugs</div><div class="seg-kpi-val'+(bugs>0?' kpi-warn':'')+'">'+bugs+'</div></div>'
      +'<div class="seg-kpi"><div class="seg-kpi-lbl">% Completado TCA</div><div class="seg-kpi-val">'+pctComp+'%</div>'
        +'<div class="seg-kpi-sub" style="margin-top:6px;"><div class="seg-prog-track"><div class="seg-prog-fill" style="width:'+pctComp+'%;background:'+pbGrad(ragC(pctComp))+';"></div></div></div>'
      +'</div>'
      +'</div>';
  }

  function buildObsTableHTML(rows, activeTipo, activeEstado){
    var filtered=rows.filter(function(r){
      var tipo=getTipo(r).toLowerCase();
      var est=String(r['Estado TCA']||'').trim();
      return (activeTipo==='all'||tipo.includes(activeTipo))
          && (activeEstado==='all'||est===activeEstado);
    });
    var html='<div class="seg-table-wrap"><table class="seg-table seg-table--cards seg-table--obs">'
      +'<thead><tr><th>#</th><th>Fecha</th><th>Trámite</th><th>Tipo</th><th>Severidad</th><th>Estado TCA</th></tr></thead><tbody>';
    if(!filtered.length){
      html+='<tr><td colspan="6" class="seg-empty-row">Sin resultados para los filtros seleccionados.</td></tr>';
    } else {
      filtered.forEach(function(r){
        var sev=severityLabel(r.Score||r.score);
        var est=String(r['Estado TCA']||'—');
        var estCls=est==='Completado'?'seg-state-ok':est.includes('progreso')?'seg-state-progress':'';
        html+='<tr>'
          +'<td class="seg-key">'+fmt(r['#'])+'</td>'
          +'<td class="mono seg-o-fec" data-label="Fecha" style="white-space:nowrap;">'+fmt(r.Fecha)+'</td>'
          +'<td class="seg-cell-title">'+fmt(r['Trámite']||r.Tramite)+'</td>'
          +'<td class="seg-o-tip" data-label="Tipo"><span class="seg-badge tipo-neutral">'+getTipo(r)+'</span></td>'
          +'<td class="seg-o-sev" data-label="Severidad"><span class="seg-badge '+sev.c+'">'+sev.l+'</span></td>'
          +'<td class="'+estCls+' seg-o-est" data-label="Estado TCA">'+est+'</td>'
          +'</tr>';
      });
    }
    return html+'</tbody></table></div>';
  }

  function buildObsPanel(rows, panelId){
    var tipos=['all','bug','issue','error','task'];
    var estados=['all','Completado','En progreso','No iniciado','Pendiente validación UX','Pendiente validación ISSS'];
    var filterBar=
      '<div class="seg-obs-filters" id="filter-tipo-'+panelId+'">'
      +'<span class="seg-obs-filter-lbl">Tipo</span>'
      +tipos.map(function(t){ return '<button class="seg-obs-filter'+(t==='all'?' active':'')+'" data-tipo="'+t+'">'+(t==='all'?'Todos':t.charAt(0).toUpperCase()+t.slice(1))+'</button>'; }).join('')
      +'</div>'
      +'<div class="seg-obs-filters" id="filter-estado-'+panelId+'">'
      +'<span class="seg-obs-filter-lbl">Estado TCA</span>'
      +estados.map(function(s){ return '<button class="seg-obs-filter'+(s==='all'?' active':'')+'" data-estado="'+s+'">'+(s==='all'?'Todos':s)+'</button>'; }).join('')
      +'</div>';
    return buildObsKpis(rows)
      +filterBar
      +'<div id="obs-table-'+panelId+'">'+buildObsTableHTML(rows,'all','all')+'</div>';
  }

  function buildObservacionesCollapsible(gen, ux, abierto){
    if(!gen.length && !ux.length) return '';
    return '<div class="seg-section">'
      +'<details class="seg-collapsible" id="obs-collapsible"'+(abierto?' open':'')+'>'
        +'<summary>Listado de tareas — Observaciones UAT (Generales + Diseño UX)</summary>'
        +'<div class="seg-collapsible-body">'
          +'<div class="seg-tabs" style="margin-bottom:20px;" id="obs-main-tabs" role="tablist" aria-label="Tipo de observaciones">'
          +'<button class="seg-tab active" data-obs-tab="gen" role="tab" aria-selected="true" aria-controls="obs-panel-gen">Generales ('+gen.length+')</button>'
          +'<button class="seg-tab" data-obs-tab="ux" role="tab" aria-selected="false" aria-controls="obs-panel-ux">Diseño UX ('+ux.length+')</button>'
          +'</div>'
          +'<div id="obs-panel-gen" role="tabpanel">'+buildObsPanel(gen,'gen')+'</div>'
          +'<div id="obs-panel-ux" role="tabpanel" style="display:none;">'+buildObsPanel(ux,'ux')+'</div>'
        +'</div>'
      +'</details>'
      +'</div>';
  }

  function wireObservaciones(mount, gen, ux){
    var container = mount.querySelector('#obs-collapsible');
    if(!container || container.dataset.wired) return;
    container.dataset.wired='1';

    container.querySelectorAll('[data-obs-tab]').forEach(function(t){
      t.addEventListener('click',function(){
        container.querySelectorAll('[data-obs-tab]').forEach(function(x){ x.classList.remove('active'); x.setAttribute('aria-selected','false'); });
        t.classList.add('active'); t.setAttribute('aria-selected','true');
        ['gen','ux'].forEach(function(p){
          var el=container.querySelector('#obs-panel-'+p);
          if(el) el.style.display=(p===t.dataset.obsTab?'':'none');
        });
      });
    });

    var rowsByPanel = { gen: gen||[], ux: ux||[] };
    ['gen','ux'].forEach(function(panelId){
      var rows = rowsByPanel[panelId];
      var activeTipo='all'; var activeEstado='all';
      function rerender(){
        var el=container.querySelector('#obs-table-'+panelId);
        if(el) el.innerHTML=buildObsTableHTML(rows,activeTipo,activeEstado);
      }
      var tipoBar=container.querySelector('#filter-tipo-'+panelId);
      var estadoBar=container.querySelector('#filter-estado-'+panelId);
      if(tipoBar) tipoBar.querySelectorAll('[data-tipo]').forEach(function(btn){
        btn.addEventListener('click',function(){
          tipoBar.querySelectorAll('[data-tipo]').forEach(function(x){ x.classList.remove('active'); });
          btn.classList.add('active'); activeTipo=btn.dataset.tipo; rerender();
        });
      });
      if(estadoBar) estadoBar.querySelectorAll('[data-estado]').forEach(function(btn){
        btn.addEventListener('click',function(){
          estadoBar.querySelectorAll('[data-estado]').forEach(function(x){ x.classList.remove('active'); });
          btn.classList.add('active'); activeEstado=btn.dataset.estado; rerender();
        });
      });
    });
  }

  // ══════════════════════════════════════════════════════════════
  // MONTAJE
  // ══════════════════════════════════════════════════════════════
  var _burndownData = null;
  // Último snapshot de datos usado para renderizar Resumen ejecutivo — es lo
  // que alimenta el reporte HTML/PDF (ver construirReporteHTMLStandalone).
  var _lastResumenData = null;

  function injectPages(){
    var pr=document.getElementById('page-seg-resumen');
    if(pr) pr.innerHTML='<div class="page-header seg-page-header-row">'
      +'<div><div class="page-title">Resumen ejecutivo</div><div class="page-desc">Sprint activo, avance por paquete, burndown, desglose operativo y cumplimiento histórico.</div></div>'
      +'<button class="seg-btn-report" id="seg-btn-generar-reporte">Generar reporte</button>'
      +'</div><div id="seg-resumen-mount"></div>';
    var pp=document.getElementById('page-seg-paquetes');
    if(pp) pp.innerHTML='<div class="page-header"><div class="page-title">Resumen por paquete</div><div class="page-desc">Avance real vs. planificado, SPI y actividades por paquete (P1/P2/P3).</div></div><div id="seg-paquetes-mount"></div>';
    var pd=document.getElementById('page-seg-producto');
    if(pd) pd.innerHTML='<div class="page-header"><div class="page-title">Avance de Producto</div><div class="page-desc">Avance real del producto por trámite y paquete, ponderado por Desarrollo y QA.</div></div><div id="seg-producto-mount"></div>';
  }

  // Las mismas 7 fuentes que alimentan el Resumen Ejecutivo, factorizadas
  // aparte para poder llamarlas tanto desde loadResumen() (pintado en la
  // web app) como desde SEG_GENERATE_REPORT_STANDALONE (generación
  // desatendida del reporte, sin UI — ver automatización de envío por correo).
  function fetchResumenSources(cb){
    var results={}; var firstError=null; var pending=7;
    function onDone(key){
      return function(err,data){
        if(err && !firstError) firstError=err;
        results[key]=data;
        if(--pending===0) finish();
      };
    }
    function onDoneLenient(key){
      // Observaciones y Detalle de work items no deben tumbar el resto si falla su fetch.
      return function(err,data){ results[key]=err?[]:data; if(--pending===0) finish(); };
    }
    fetchSheet(SH,'sprint_activo', onDone('activo'));
    fetchSheet(SH,'transiciones', onDone('trans'));
    fetchSheet(SH,'sprint_diario_acumulado', onDone('diario'));
    fetchRoadmap(onDone('roadmap'));
    fetchSheet(OB,'Observaciones Generales', onDoneLenient('obsGen'));
    fetchSheet(OB,'Observaciones UX', onDoneLenient('obsUx'));
    fetchSheet(SH,'work_items_detalle', onDoneLenient('detalle'));

    function finish(){
      if(firstError){ cb(firstError, null); return; }
      cb(null, {
        activo: results.activo||[], trans: results.trans||[], diario: results.diario||[],
        roadmap: results.roadmap||null, obsGen: results.obsGen||[], obsUx: results.obsUx||[],
        detalle: results.detalle||[]
      });
    }
  }

  // loadResumen() hace el fetch+pintado y se puede llamar más de una vez: la
  // primera vez al montar la pestaña, y de nuevo — sola, sin aviso — cada vez
  // que una revalidación en segundo plano trae un dato distinto para alguna
  // de sus 7 fuentes. mountResumen() es el punto de entrada que solo monta
  // (y se suscribe a las actualizaciones) una vez por carga de página.
  function loadResumen(){
    var m=document.getElementById('seg-resumen-mount');
    if(!m) return;
    fetchResumenSources(function(err, data){
      if(err){ if(!m.dataset.rendered) m.innerHTML=errBlock(err); return; }
      // Re-render por revalidación (solo mobile): conserva sprint elegido,
      // pestaña/filtros de Observaciones y <details> abiertos.
      var st = (m.dataset.rendered && segIsMobile()) ? segCaptureState(m) : null;
      m.dataset.rendered='1';
      _lastResumenData = data;
      buildEjecutivo(m,data.activo,data.trans,data.diario,data.roadmap,data.obsGen,data.obsUx,data.detalle,{layout: segIsMobile() ? 'tabs' : 'stack'});
      if(st) segRestoreState(m, st);
    });
  }
  // Las 7 fuentes pueden revalidar casi a la vez: un solo re-render.
  var _loadResumenT = null;
  function loadResumenDebounced(){
    clearTimeout(_loadResumenT);
    _loadResumenT = setTimeout(loadResumen, 250);
  }

  var _resumenSubscribed = false;
  function mountResumen(){
    var m=document.getElementById('seg-resumen-mount');
    if(!m||m.dataset.mounted) return;
    m.dataset.mounted='1';
    m.innerHTML = loading('Cargando datos del sprint…'); // se sobreescribe al toque si ya hay cache
    if(!_resumenSubscribed){
      _resumenSubscribed = true;
      [SH+'::sprint_activo', SH+'::transiciones', SH+'::sprint_diario_acumulado', ROADMAP_KEY,
       OB+'::Observaciones Generales', OB+'::Observaciones UX', SH+'::work_items_detalle']
        .forEach(function(key){ onSheetUpdate(key, loadResumenDebounced); });
    }
    loadResumen();
  }

  // Mismo patrón que loadResumen()/mountResumen() para la pestaña de detalle
  // por paquete: 2 fuentes (roadmap.json + Resumen_Paquetes de DevOps).
  function loadPaquetes(){
    var m=document.getElementById('seg-paquetes-mount');
    if(!m) return;
    var results={}; var firstError=null; var pending=2;
    function onDone(key){
      return function(err,data){
        if(err && !firstError) firstError=err;
        results[key]=data;
        if(--pending===0) finish();
      };
    }
    fetchRoadmap(onDone('roadmap'));
    // Resumen_Paquetes es tolerante a fallo: si el Sheet de DevOps no responde,
    // la página igual muestra liberación/SPI/alcance con "Avance de desarrollo" en "—".
    fetchSheet(SH,'Resumen_Paquetes', function(e,data){ results.resumenDevOps = e ? [] : data; if(--pending===0) finish(); });
    function finish(){
      if(firstError){ if(!m.dataset.rendered) m.innerHTML=errBlock(firstError); return; }
      m.dataset.rendered='1';
      buildResumenPorPaquete(m, results.roadmap, results.resumenDevOps||[]);
    }
  }

  var _paquetesSubscribed = false;
  function mountPaquetes(){
    var m=document.getElementById('seg-paquetes-mount');
    if(!m||m.dataset.mounted) return;
    m.dataset.mounted='1';
    m.innerHTML = loading('Cargando avance por paquete…'); // se sobreescribe al toque si ya hay cache
    if(!_paquetesSubscribed){
      _paquetesSubscribed = true;
      [ROADMAP_KEY, SH+'::Resumen_Paquetes'].forEach(function(key){ onSheetUpdate(key, loadPaquetes); });
    }
    loadPaquetes();
  }

  // Mismo patrón, una sola fuente: avance_producto.json.
  function loadProducto(){
    var m=document.getElementById('seg-producto-mount');
    if(!m) return;
    fetchAvanceProducto(function(err, data){
      if(err){ if(!m.dataset.rendered) m.innerHTML=errBlock(err); return; }
      m.dataset.rendered='1';
      buildAvanceProducto(m, data);
    });
  }

  var _productoSubscribed = false;
  function mountProducto(){
    var m=document.getElementById('seg-producto-mount');
    if(!m||m.dataset.mounted) return;
    m.dataset.mounted='1';
    m.innerHTML = loading('Cargando avance de producto…'); // se sobreescribe al toque si ya hay cache
    if(!_productoSubscribed){
      _productoSubscribed = true;
      onSheetUpdate(AVANCE_PRODUCTO_KEY, loadProducto);
    }
    loadProducto();
  }

  function hookNav(){
    var observer=new MutationObserver(function(muts){
      muts.forEach(function(m){
        if(m.type==='attributes'&&m.attributeName==='class'){
          var el=m.target;
          if(el.classList.contains('active')){
            if(el.id==='page-seg-resumen')  mountResumen();
            if(el.id==='page-seg-paquetes') mountPaquetes();
            if(el.id==='page-seg-producto') mountProducto();
          }
        }
      });
    });
    document.querySelectorAll('.page').forEach(function(p){ observer.observe(p,{attributes:true}); });
    document.querySelectorAll('.sb-subitem[data-page]').forEach(function(el){
      el.addEventListener('click',function(){
        var pg=el.dataset.page;
        if(pg==='seg-resumen')  setTimeout(mountResumen,60);
        if(pg==='seg-paquetes') setTimeout(mountPaquetes,60);
        if(pg==='seg-producto') setTimeout(mountProducto,60);
      });
    });
    var redraw = function(){ redrawBurndown(); };
    window.addEventListener('resize', redraw);
    // El resize de ventana no cubre cambios de ancho por colapso del sidebar u
    // otros reflows del contenedor; ResizeObserver sí los detecta.
    var resumenMount = document.getElementById('seg-resumen-mount');
    if(resumenMount && window.ResizeObserver){
      var ro = new ResizeObserver(function(){ redraw(); });
      ro.observe(resumenMount);
    }
  }

  // ══════════════════════════════════════════════════════════════
  // REPORTE — botón "Generar reporte" → modal (HTML interactivo / PDF)
  // ══════════════════════════════════════════════════════════════

  // Expuesta globalmente: el reporte HTML exportado carga este mismo archivo
  // (modules/seguimiento.js) desde el portal y la usa para renderizarse con
  // los datos embebidos, en vez de volver a pedirlos por red. Así el reporte
  // usa exactamente el mismo código que la web app — cero lógica duplicada.
  window.SEG_RENDER_REPORT_FROM_DATA = function(mount, data){
    data = data || {};
    buildEjecutivo(mount, data.activo||[], data.trans||[], data.diario||[], data.roadmap||null, data.obsGen||[], data.obsUx||[], data.detalle||[]);
  };

  // Fuente de modules/ds.js + este mismo archivo, pedida una sola vez y
  // embebida tal cual en el reporte — igual que el resumen del Roadmap. Antes
  // se referenciaba con <script src="location.origin/...">, que no carga si el
  // HTML descargado se abre como archivo local (file://).
  // Sin caché en memoria: se vuelve a pedir en cada generación, para que una
  // pestaña abierta antes de un deploy no siga exportando el código anterior.
  function fetchSegScriptSource(cb){
    function get(path){
      return fetch(path + '?v=' + Date.now(), { cache:'no-store' })
        .then(function(r){ if(!r.ok) throw new Error('HTTP '+r.status); return r.text(); });
    }
    Promise.all([get('/modules/ds.js'), get('/modules/seguimiento.js')])
      .then(function(srcs){ cb(srcs.join('\n;\n')); })
      .catch(function(){ cb(null); });
  }

  function construirReporteHTMLStandalone(scriptSource){
    if(!_lastResumenData) return null;
    // Escapar "<" evita que un título/observación con literalmente "</script>"
    // cierre el bloque de datos antes de tiempo — JSON.parse lo revierte igual.
    var dataJson = JSON.stringify(_lastResumenData).replace(/</g,'\\u003c');
    var scriptSafe = String(scriptSource||'').replace(/<\/script/gi, '<\\/script');
    var generadoTs = new Date().toLocaleString('es-SV', {dateStyle:'medium', timeStyle:'short'});
    return '<!doctype html>'
      +'<html lang="es"><head><meta charset="utf-8">'
      +'<meta name="viewport" content="width=device-width, initial-scale=1">'
      +'<title>Reporte ejecutivo — ISSS-SYDT</title>'
      +'<style>'
        +'*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}'
        +'body{background:var(--ds-surface-sunken);color:var(--ds-text);font:var(--ds-font-body);-webkit-font-smoothing:antialiased;}'
        +'button{font-family:inherit;}'
        +'.seg-report-wrap{max-width:1180px;margin:32px auto;padding:32px;background:var(--ds-surface);border-radius:var(--ds-radius-large);box-shadow:var(--ds-shadow-raised);}'
        +'.seg-report-head{margin-bottom:var(--ds-space-400);}'
        +'.seg-report-head .seg-report-title{font:var(--ds-font-heading-large);color:var(--ds-text);}'
        +'.seg-report-head .seg-report-sub{font:var(--ds-font-body);color:var(--ds-text-subtle);margin-top:var(--ds-space-050);}'
        +'.seg-report-boot{padding:40px 0;text-align:center;color:#6B6E76;font:14px ui-sans-serif,-apple-system,"Segoe UI",sans-serif;}'
        +'@media print{body{background:#fff;}.seg-report-wrap{margin:0;padding:0;box-shadow:none;}}'
      +'</style>'
      +'</head><body>'
      +'<div class="seg-report-wrap">'
        +'<div class="seg-report-head"><div class="seg-report-title">Resumen ejecutivo — ISSS-SYDT</div><div class="seg-report-sub">Reporte generado el '+generadoTs+'</div></div>'
        +'<div id="seg-resumen-mount"><div class="seg-report-boot">Cargando reporte…</div></div>'
      +'</div>'
      +'<script type="application/json" id="seg-report-data">'+dataJson+'<\/script>'
      +'<script>'+scriptSafe+'<\/script>'
      +'<script>'
        +'document.addEventListener("DOMContentLoaded",function(){'
          +'(function tryRender(){'
            +'if(typeof SEG_RENDER_REPORT_FROM_DATA!=="function"){ setTimeout(tryRender,150); return; }'
            +'var data=JSON.parse(document.getElementById("seg-report-data").textContent);'
            +'SEG_RENDER_REPORT_FROM_DATA(document.getElementById("seg-resumen-mount"), data);'
          +'})();'
        +'});'
      +'<\/script>'
      +'</body></html>';
  }

  // Días del sprint en los que corresponde enviar el correo programado
  // (esquema definido por Darío, 2026-10-01): día 1 = inicio, 3/5/8 =
  // actualizaciones de avance, 10 = cierre. Power Automate dispara estos
  // mismos horarios TODAS las semanas (no sabe en qué día del sprint está
  // el calendario), así que el "gatekeeping" real de si corresponde enviar
  // o no vive acá — en el único lugar que sí conoce el día real del sprint
  // activo — y se expone en kpis.send_today/kpis.motivo para que el flujo
  // de Power Automate solo tenga que leer ese booleano.
  var SEND_DAY_MOTIVOS = {
    1:  'Inicio de sprint',
    3:  'Actualización de avance — día 3',
    5:  'Actualización de avance — día 5',
    8:  'Actualización de avance — día 8',
    10: 'Cierre de sprint — día 10'
  };

  // Cuerpo del correo según el día del sprint (texto definido por Darío,
  // 2026-10-05). Día 10 = cierre: avance final, burn rate, cumplimiento
  // histórico y cuántos ítems quedaron pendientes (sin deuda técnica). Días
  // 1/3/5/8 = avance: porcentaje, burn rate y desglose por tipo de ítem
  // (Task/Issue/Bug) tal como están en sprint_activo al momento de generar.
  // Devuelve el mismo contenido en texto plano (líneas) y en HTML (<p>/<ul>).
  function buildCorreoResumen(k){
    function esc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
    function plural(n, uno, varios){ return n===1 ? uno : varios; }
    var sa = k.sa || {};
    var burn = k.burnRate.toFixed(2);
    var cierre = (k.diasT === 10);
    var lineas, detalle = null;

    if(cierre){
      var pend = Math.max(k.total - k.cerrado, 0);
      var cumpl = (k.velProm==='—' ? '—' : k.velProm+'%');
      var pendTxt = pend === 0
        ? 'No quedaron ítems pendientes en el ' + k.sprintNom + '.'
        : 'Para el ' + k.sprintNom + ' ' + plural(pend,'quedó pendiente ','quedaron pendientes ') + pend + ' '
          + plural(pend,'ítem','ítems') + ', en revisión para definir integración en sprint siguiente.';
      lineas = [
        'Día ' + k.diasT + ' y un avance ' + pct(k.avance) + ' (' + k.cerrado + ' de ' + k.total + ' ítems cerrados).',
        'Burn rate: ' + burn + ' ítems/día hábil.',
        'Cumplimiento histórico (últimos sprints): ' + cumpl + '.',
        pendTxt
      ];
    } else {
      function tipo(nombre, cerr, tot){
        cerr = parseInt(cerr)||0; tot = parseInt(tot)||0;
        return nombre + ': ' + cerr + ' ' + plural(cerr,'cerrado','cerrados') + ' de ' + tot;
      }
      lineas = [
        'Día ' + k.diasT + ' y un avance ' + pct(k.avance) + ' (' + k.cerrado + ' de ' + k.total + ' ítems cerrados).',
        'Burn rate: ' + burn + ' ítems/día hábil.',
        'Detalle de ítems:'
      ];
      detalle = [
        tipo('Task',  sa.tasks_closed,  sa.tasks_total),
        tipo('Issue', sa.issues_closed, sa.issues_total),
        tipo('Bug',   sa.bugs_closed,   sa.bugs_total)
      ];
    }

    var intro = 'Buen día equipo, comparto estatus del ' + k.sprintNom + ',';
    var text = intro + '\n\n' + lineas.join('\n') + (detalle ? '\n' + detalle.map(function(l){ return '* ' + l; }).join('\n') : '');
    var html;
    if(detalle){
      html = '<p>' + esc(intro) + '</p>'
        + '<p>' + lineas.slice(0,2).map(esc).join('<br>') + '<br>' + esc(lineas[2]) + '</p>'
        + '<ul>' + detalle.map(function(l){ return '<li>' + esc(l) + '</li>'; }).join('') + '</ul>';
    } else {
      html = '<p>' + esc(intro) + '</p><p>' + lineas.map(esc).join('<br>') + '</p>';
    }
    return { text: text, html: html };
  }
  window.SEG_BUILD_CORREO_RESUMEN = buildCorreoResumen;

  // Punto de entrada para generación desatendida (envío automático del
  // reporte por correo — ver scripts/generar-reporte-sprint.js). A diferencia
  // del botón "Generar reporte", no depende de que la pestaña esté montada
  // ni de sesión/login: pide las mismas 7 fuentes directamente y arma el
  // HTML standalone + el cuerpo del correo (texto y HTML, distinto según el
  // día del sprint) + los KPIs. cb(err, { html, summaryText, summaryHtml, kpis }).
  window.SEG_GENERATE_REPORT_STANDALONE = function(cb){
    fetchResumenSources(function(err, data){
      if(err){ cb(err); return; }
      _lastResumenData = data;
      var k = computeResumenKpis(data.activo, data.trans, data.diario, data.detalle);
      var correo = buildCorreoResumen(k);
      fetchSegScriptSource(function(src){
        if(!src){ cb(new Error('No se pudo cargar el código fuente (ds.js/seguimiento.js) para el reporte')); return; }
        var html = construirReporteHTMLStandalone(src);
        var motivo = SEND_DAY_MOTIVOS[k.diasT] || null;
        cb(null, { html: html, summaryText: correo.text, summaryHtml: correo.html, kpis: {
          sprint: k.sprintNom, avance_pct: k.avance, cerrados: k.cerrado, total: k.total,
          burn_rate: k.burnRate, dia_sprint: k.diasT, dias_habiles_total: k.diasH,
          deuda_pct: parseFloat(k.deudaPct), deuda_total: k.deudaTotal, cumplimiento_historico_pct: k.velProm,
          send_today: motivo !== null, motivo: motivo
        } });
      });
    });
  };

  function descargarArchivo(nombre, contenido, mime){
    var blob = new Blob([contenido], {type: mime});
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = nombre;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function(){ URL.revokeObjectURL(url); }, 4000);
  }

  // PDF = lo que se ve ahora mismo en pantalla, impreso por el navegador
  // (Guardar como PDF). Se abren los colapsables temporalmente porque el
  // PDF es estático: no hay forma de "expandir" nada después de generado.
  function generarReportePDF(){
    var mount = document.getElementById('seg-resumen-mount');
    if(!mount) return false;
    var reabrir = [];
    mount.querySelectorAll('details:not([open])').forEach(function(d){ d.open=true; reabrir.push(d); });
    // Con pestañas (5c) solo hay un panel visible: el PDF debe traer todas las
    // secciones, y el burndown se dibuja ya visible (si nunca se abrió Actividad
    // el canvas estaría vacío).
    mount.classList.add('seg-printing');
    redrawBurndown();
    var tituloOriginal = document.title;
    document.title = 'Reporte ejecutivo ISSS-SYDT ' + new Date().toISOString().slice(0,10);
    function restaurar(){
      reabrir.forEach(function(d){ d.open=false; });
      document.title = tituloOriginal;
      mount.classList.remove('seg-printing');
      redrawBurndown();
      window.removeEventListener('afterprint', restaurar);
    }
    window.addEventListener('afterprint', restaurar);
    window.print();
    return true;
  }

  function mountReportModal(){
    var btn = document.getElementById('seg-btn-generar-reporte');
    if(!btn || document.getElementById('seg-report-overlay')) return;

    var overlay = document.createElement('div');
    overlay.className = 'seg-modal-overlay';
    overlay.id = 'seg-report-overlay';
    overlay.innerHTML =
      '<div class="seg-modal">'
        +'<div class="seg-modal-head"><div class="seg-modal-title">Generar reporte</div><button class="seg-modal-close" id="seg-report-close" aria-label="Cerrar">✕</button></div>'
        +'<div class="seg-modal-body" id="seg-report-body">'
          +'<div class="seg-report-desc">Elegí el formato del reporte del Resumen ejecutivo.</div>'
          +'<div class="seg-report-options">'
            +'<button type="button" class="seg-report-opt active" data-fmt="html">'
              +'<span class="seg-report-opt-radio"></span>'
              +'<span class="seg-report-opt-title">HTML interactivo</span>'
            +'</button>'
            +'<button type="button" class="seg-report-opt" data-fmt="pdf">'
              +'<span class="seg-report-opt-radio"></span>'
              +'<span class="seg-report-opt-title">PDF</span>'
            +'</button>'
          +'</div>'
        +'</div>'
        +'<div class="seg-modal-foot" id="seg-report-foot">'
          +'<button class="seg-btn-secondary" id="seg-report-cancel">Cancelar</button>'
          +'<button class="seg-btn-report" id="seg-report-generar">Generar</button>'
        +'</div>'
      +'</div>';
    document.body.appendChild(overlay);

    var fmtSeleccionado = 'html';
    var body = overlay.querySelector('#seg-report-body');
    var foot = overlay.querySelector('#seg-report-foot');
    var bodyHTMLOriginal = body.innerHTML;
    var footHTMLOriginal = foot.innerHTML;

    function abrir(){
      body.innerHTML = bodyHTMLOriginal;
      foot.innerHTML = footHTMLOriginal;
      fmtSeleccionado = 'html';
      wireOpciones();
      wireFoot();
      overlay.classList.add('seg-modal-open');
    }
    function cerrar(){ overlay.classList.remove('seg-modal-open'); }

    function wireOpciones(){
      body.querySelectorAll('.seg-report-opt').forEach(function(opt){
        opt.addEventListener('click', function(){
          body.querySelectorAll('.seg-report-opt').forEach(function(o){ o.classList.remove('active'); });
          opt.classList.add('active');
          fmtSeleccionado = opt.dataset.fmt;
        });
      });
    }

    function wireFoot(){
      var cancelBtn = foot.querySelector('#seg-report-cancel');
      var generarBtn = foot.querySelector('#seg-report-generar');
      if(cancelBtn) cancelBtn.addEventListener('click', cerrar);
      if(generarBtn) generarBtn.addEventListener('click', generar);
    }

    function generar(){
      if(!_lastResumenData){
        body.innerHTML = '<div class="seg-report-error">Todavía se está cargando el Resumen ejecutivo. Esperá unos segundos e intentá de nuevo.</div>';
        foot.innerHTML = '<button class="seg-btn-secondary" id="seg-report-cancel">Cerrar</button>';
        wireFoot();
        return;
      }
      body.innerHTML = '<div class="seg-report-status"><div class="seg-spinner"></div>Generando reporte…</div>';
      foot.innerHTML = '';
      // setTimeout deja pintar el spinner antes del trabajo síncrono (armar
      // el HTML embebido, o el print() que bloquea hasta cerrar el diálogo).
      setTimeout(function(){
        if(fmtSeleccionado==='pdf'){
          generarReportePDF();
          cerrar();
          return;
        }
        fetchSegScriptSource(function(src){
          if(!src){
            body.innerHTML = '<div class="seg-report-error">No se pudo generar el reporte. Intentá de nuevo.</div>';
            foot.innerHTML = '<button class="seg-btn-secondary" id="seg-report-cancel">Cerrar</button>';
            wireFoot();
            return;
          }
          var html = construirReporteHTMLStandalone(src);
          var fecha = new Date().toISOString().slice(0,10);
          descargarArchivo('reporte-ejecutivo-isss-sydt-'+fecha+'.html', html, 'text/html;charset=utf-8');
          body.innerHTML = '<div class="seg-report-ok">✓ Reporte descargado.</div>';
          setTimeout(cerrar, 900);
        });
      }, 50);
    }

    btn.addEventListener('click', abrir);
    overlay.querySelector('#seg-report-close').addEventListener('click', cerrar);
    overlay.addEventListener('click', function(e){ if(e.target===overlay) cerrar(); });
  }

  // Cruce de 768px (rotación, ventana): redibuja el burndown con las constantes del
  // nuevo modo, oculta el tooltip y recentra la tira de sprints. Se registra una vez.
  var _segMqWired = false;
  function wireMobileChange(){
    if(_segMqWired || !window.DS || !DS.onMobileChange) return;
    _segMqWired = true;
    DS.onMobileChange(function(mobile){
      var tt = document.getElementById('seg-bd-tt'); if(tt) tt.style.display = 'none';
      // Desktop (apilado) y mobile (pestañas) tienen distribuciones distintas:
      // se repintan Resumen y Producto con los datos ya cargados.
      var rm = document.getElementById('seg-resumen-mount');
      if(rm && rm.dataset.rendered && _lastResumenData){
        var d = _lastResumenData;
        buildEjecutivo(rm,d.activo,d.trans,d.diario,d.roadmap,d.obsGen,d.obsUx,d.detalle,{layout: mobile ? 'tabs' : 'stack'});
      }
      var pm = document.getElementById('seg-producto-mount');
      if(pm && pm.dataset.rendered && _prodData) buildAvanceProducto(pm, _prodData);
      redrawBurndown();
      if(mobile) requestAnimationFrame(function(){ segRevealSprintTab(document.getElementById('seg-resumen-mount')); });
    });
  }

  function init(){
    mountStyles();
    injectPages();
    hookNav();
    wireMobileChange();
    mountReportModal();
    if(document.getElementById('page-seg-resumen')  &&document.getElementById('page-seg-resumen').classList.contains('active'))  mountResumen();
    if(document.getElementById('page-seg-paquetes') &&document.getElementById('page-seg-paquetes').classList.contains('active')) mountPaquetes();
    if(document.getElementById('page-seg-producto') &&document.getElementById('page-seg-producto').classList.contains('active')) mountProducto();
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',init);
  } else {
    init();
  }
})();
