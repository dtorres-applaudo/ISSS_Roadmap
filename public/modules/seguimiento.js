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

  // ── HELPERS ───────────────────────────────────────────────────
  function fmt(v){ return (v===null||v===undefined||v==='') ? '—' : String(v); }
  function fechaDDMMYYYY(iso){
    var m = String(iso||'').match(/^(\d{4})-(\d{2})-(\d{2})/);
    return m ? (m[3]+'/'+m[2]+'/'+m[1]) : fmt(iso);
  }
  function pct(v,dec){ var n=parseFloat(v); if(isNaN(n)) return '—'; return n.toFixed(dec||1)+'%'; }
  function ragC(p){ var n=parseFloat(p); if(isNaN(n)) return 'rag-gray'; if(n>=90) return 'rag-green'; if(n>=60) return 'rag-amber'; return 'rag-red'; }
  function ragL(p){ var n=parseFloat(p); if(isNaN(n)) return 'Sin datos'; if(n>=90) return 'En meta'; if(n>=60) return 'En riesgo'; return 'Atrasado'; }
  function pbGrad(rc){ return rc==='rag-green'?'linear-gradient(90deg,#22C55E,#16A34A)':rc==='rag-amber'?'linear-gradient(90deg,#F59E0B,#D97706)':'linear-gradient(90deg,#EF4444,#DC2626)'; }
  function diasRestantes(dl){ var h=new Date(); h.setHours(0,0,0,0); return Math.ceil((dl-h)/86400000); }
  function loading(msg){ return '<div class="seg-loading"><div class="seg-spinner"></div>'+(msg||'Cargando…')+'</div>'; }
  function errBlock(msg){ return '<div class="seg-error">⚠ '+msg+'</div>'; }
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
:root{
  --sb:#0B1F3A;--sb2:#102A4C;--sb3:#16385F;--sb4:#1E4B7A;--sb5:#2C6196;--sb15:#E7EEF6;
  --sg9:#14181F;--sg7:#33404F;--sg55:#5A6877;--sg45:#7C8896;--sg35:#AFB8C2;
  --sg15:#EEF1F4;--sg1:#F4F6F8;--sg05:#FAFBFC;--w:#FFFFFF;
  --em7:#0F7A52;--em1:#E6F4EE;--am7:#9A6A00;--am1:#FBF3DF;
  --re7:#B42318;--re1:#FEE4E2;
}
.seg-loading{display:flex;align-items:center;gap:10px;color:var(--sg55);font-size:13px;padding:32px 0;}
.seg-spinner{width:18px;height:18px;border-radius:50%;border:2px solid var(--sg35);border-top-color:var(--sb4);animation:seg-spin .7s linear infinite;}
@keyframes seg-spin{to{transform:rotate(360deg);}}
.seg-error{background:var(--re1);border:1px solid #FECDCA;border-radius:10px;color:var(--re7);font-size:13px;padding:14px 18px;margin-bottom:16px;}
.seg-sh{font-size:11px;font-family:'Geist Mono',monospace;letter-spacing:.16em;text-transform:uppercase;color:var(--sb4);margin-bottom:14px;display:flex;align-items:center;gap:10px;}
.seg-sh::after{content:"";flex:1;height:1px;background:var(--sg15);}
.seg-section{margin-bottom:28px;}
.seg-ts{font-family:'Geist Mono',monospace;font-size:11px;color:var(--sg45);margin-top:14px;}
.mono{font-family:'Geist Mono',monospace;font-size:12px;}

/* KPI STRIP */
.seg-kpis{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:20px;}
.seg-kpi{flex:1;min-width:120px;background:var(--w);border:1px solid var(--sg15);border-radius:12px;padding:14px 18px;}
.seg-kpi.kpi-dark{background:var(--sb);border-color:var(--sb);}
.seg-kpi-lbl{font-size:10px;font-family:'Geist Mono',monospace;letter-spacing:.12em;text-transform:uppercase;color:var(--sg55);margin-bottom:5px;}
.kpi-dark .seg-kpi-lbl{color:rgba(255,255,255,.45);}
.seg-kpi-val{font-size:22px;font-weight:700;color:var(--sg9);letter-spacing:-.02em;line-height:1;}
.kpi-dark .seg-kpi-val{color:#fff;}
.seg-kpi-sub{font-size:11px;color:var(--sg55);margin-top:4px;}
.kpi-dark .seg-kpi-sub{color:rgba(255,255,255,.45);}
.kpi-warn .seg-kpi-val{color:var(--am7);}
.kpi-danger .seg-kpi-val{color:var(--re7);}

/* DUAL PROGRESS BARS */
.seg-prog-section{background:var(--w);border:1px solid var(--sg15);border-radius:14px;padding:18px 20px;margin-bottom:20px;}
.seg-prog-row{margin-bottom:12px;}
.seg-prog-row:last-child{margin-bottom:0;}
.seg-prog-label{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;}
.seg-prog-lbl-txt{font-size:12px;color:var(--sg55);}
.seg-prog-lbl-pct{font-size:13px;font-weight:700;color:var(--sg9);font-family:'Geist Mono',monospace;}
.seg-prog-track{height:8px;border-radius:999px;background:#EBEBEB;overflow:hidden;}
.seg-prog-fill{height:8px;border-radius:999px;}

/* AVANCE BARRA GLOBAL */
.seg-avance-bar-wrap{margin-bottom:24px;}
.seg-avance-bar-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;}
.seg-avance-bar-title{font-size:12px;color:var(--sg55);}
.seg-avance-bar-pct{font-size:15px;font-weight:700;color:var(--sg9);font-family:'Geist Mono',monospace;}
.seg-avance-track{height:12px;border-radius:999px;background:#EBEBEB;overflow:hidden;}
.seg-avance-fill{height:12px;border-radius:999px;}

/* CUMPLIMIENTO — comparativo últimos sprints */
.seg-cump-row{display:flex;align-items:center;gap:12px;margin-bottom:14px;}
.seg-cump-row:last-child{margin-bottom:0;}
.seg-cump-label{width:84px;flex:none;font-size:12px;font-weight:600;color:var(--sg9);}
.seg-cump-nums{width:120px;flex:none;text-align:right;font-size:12px;color:var(--sg7);}

/* BURNDOWN + DISTRIBUCIÓN — a la par, responsive */
.seg-side-by-side{display:flex;gap:20px;align-items:stretch;flex-wrap:wrap;}
.seg-col{flex:1 1 380px;min-width:0;display:flex;flex-direction:column;}
.seg-col-dist .seg-op-dist-panel{flex:1;display:flex;flex-direction:column;}
.seg-col-dist .seg-chart-wrap{flex:1;display:flex;flex-direction:column;justify-content:center;box-sizing:border-box;}

/* BURNDOWN */
.seg-chart-wrap{background:var(--w);border:1px solid var(--sg15);border-radius:14px;padding:20px;margin-bottom:20px;}
.seg-chart-legend{display:flex;gap:16px;font-size:11px;color:var(--sg55);margin-top:10px;flex-wrap:wrap;}
.seg-chart-legend span{display:flex;align-items:center;gap:5px;}
.seg-chart-legend i{width:24px;height:3px;border-radius:2px;display:inline-block;}
.i-ideal{background:#AFB8C2;}
.i-real{background:#1E4B7A;}
.i-bar{width:10px;height:10px;border-radius:2px;background:#F59E0B;}

/* DEUDA TÉCNICA */
.seg-debt-cards{display:flex;gap:10px;margin-bottom:16px;flex-wrap:wrap;}
.seg-debt-card{flex:1;min-width:140px;background:#FFF7ED;border-radius:10px;padding:12px 16px;text-align:center;}
.seg-debt-card.red{background:#FEF2F2;}
.seg-debt-card.green{background:var(--em1);}
.seg-debt-val{font-size:20px;font-weight:700;color:#92400E;line-height:1;}
.seg-debt-card.red .seg-debt-val{color:var(--re7);}
.seg-debt-card.green .seg-debt-val{color:var(--em7);}
.seg-debt-lbl{font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;color:#92400E;margin-top:4px;}
.seg-debt-card.red .seg-debt-lbl{color:var(--re7);}
.seg-debt-card.green .seg-debt-lbl{color:var(--em7);}

/* PACKAGE CARDS */
.seg-pkg-cards{display:flex;gap:12px;margin-bottom:20px;flex-wrap:wrap;}
.seg-pkg-card{flex:1;min-width:220px;border:1px solid var(--sg15);border-radius:14px;padding:18px 20px;background:var(--w);position:relative;overflow:hidden;}
.seg-pkg-card::before{content:"";position:absolute;left:0;top:0;bottom:0;width:3px;}
.pkg-p1::before{background:var(--sb4);}
.pkg-p2::before{background:var(--sg55);}
.pkg-p3::before{background:var(--sb5);}
.seg-pkg-id{font-family:'Geist Mono',monospace;font-size:11px;font-weight:600;color:var(--sb4);letter-spacing:.1em;margin-bottom:4px;}
.seg-pkg-name{font-size:12px;color:var(--sg55);margin-bottom:12px;line-height:1.3;}
.seg-pkg-deadline{font-family:'Geist Mono',monospace;font-size:14px;font-weight:600;color:var(--sg9);margin-bottom:6px;}
.seg-pkg-days{font-size:11px;margin-bottom:10px;}
.days-ok{color:var(--em7);}
.days-warn{color:var(--am7);}
.days-crit{color:var(--re7);}

/* PACKAGE FULL CARD (Resumen por paquete) */
.seg-pkgfull-card{border:1px solid var(--sg15);border-radius:14px;padding:20px 22px;background:var(--w);position:relative;overflow:hidden;margin-bottom:20px;}
.seg-pkgfull-card::before{content:"";position:absolute;left:0;top:0;bottom:0;width:3px;}
.seg-pkgfull-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap;margin-bottom:8px;}
.seg-pkgfull-name{font-size:15px;font-weight:600;color:var(--sg9);margin-top:2px;}

/* TABLE */
.seg-table-wrap{border:1px solid var(--sg15);border-radius:14px;overflow:auto;max-width:100%;background:var(--sg1);}
.seg-table{width:100%;border-collapse:collapse;font-size:13px;}
.seg-table th{font-family:'Geist Mono',monospace;font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:var(--sg55);background:var(--sg05);padding:9px 14px;text-align:left;border-bottom:1px solid var(--sg15);font-weight:500;}
.seg-table td{padding:9px 14px;border-bottom:1px solid var(--sg15);color:var(--sg7);vertical-align:middle;}
.seg-table tr:last-child td{border-bottom:none;}
.seg-table tr:hover td{background:var(--sg15);}

/* TABS */
.seg-tabs{display:flex;gap:8px;margin-bottom:16px;}
.seg-tab{flex:none;padding:8px 16px;border-radius:9px;cursor:pointer;font-size:13px;font-weight:500;font-family:'Geist',sans-serif;border:1px solid var(--sg15);background:var(--sg05);color:var(--sg55);transition:all .15s;}
.seg-tab:hover{border-color:var(--sb4);}
.seg-tab.active{background:var(--sb15);border-color:var(--sb4);color:var(--sg9);font-weight:600;}

/* DEUDA TÉCNICA PANEL (operativo) */
.seg-deuda-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;}
.seg-deuda-pill{font-size:11px;font-weight:600;padding:3px 10px;border-radius:20px;}
.dp-cerrado{background:var(--em1);color:var(--em7);}
.dp-abierto{background:var(--re1);color:var(--re7);}

/* RAG */
.rag-green{color:var(--em7);background:var(--em1);}
.rag-amber{color:var(--am7);background:var(--am1);}
.rag-red{color:var(--re7);background:var(--re1);}
.rag-gray{color:var(--sg55);background:var(--sg15);}
.seg-rag{display:inline-block;font-size:11px;font-weight:600;padding:3px 9px;border-radius:20px;}

.seg-badge{display:inline-block;font-size:10px;font-weight:600;padding:2px 8px;border-radius:20px;letter-spacing:.02em;}
.seg-empty{text-align:center;padding:40px 20px;color:var(--sg45);font-size:13px;}

/* OBSERVACIONES */
.seg-obs-filters{display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap;}
.seg-obs-filter{font-size:12px;padding:5px 12px;border-radius:8px;border:1px solid var(--sg15);background:var(--sg05);cursor:pointer;font-family:'Geist',sans-serif;color:var(--sg7);transition:all .15s;}
.seg-obs-filter:hover{border-color:var(--sb4);}
.seg-obs-filter.active{background:var(--sb15);border-color:var(--sb4);color:var(--sg9);font-weight:600;}
.sev-block{background:#1A0A00;color:#FF9966;}
.sev-crit{background:var(--re1);color:var(--re7);}
.sev-major{background:var(--am1);color:var(--am7);}
.sev-minor{background:var(--sb15);color:var(--sb4);}
.sev-trivial{background:var(--sg15);color:var(--sg55);}
.sev-gray{background:var(--sg15);color:var(--sg45);}

/* COLAPSABLE */
.seg-collapsible{border:1px solid var(--sg15);border-radius:14px;padding:16px 20px;margin-bottom:20px;background:var(--w);}
.seg-collapsible summary{cursor:pointer;list-style:none;display:flex;align-items:center;gap:10px;font-size:11px;font-family:'Geist Mono',monospace;letter-spacing:.16em;text-transform:uppercase;color:var(--sb4);user-select:none;}
.seg-collapsible summary::-webkit-details-marker{display:none;}
.seg-collapsible summary::before{content:"▸";font-size:10px;flex:none;transition:transform .15s;}
.seg-collapsible[open] summary::before{transform:rotate(90deg);}
.seg-collapsible summary::after{content:"";flex:1;height:1px;background:var(--sg15);}
.seg-collapsible-body{margin-top:16px;}

/* PROG MINI (tabla histórico) */
.prog-mini-wrap{width:80px;height:6px;border-radius:999px;background:#EBEBEB;overflow:hidden;display:inline-block;}
.prog-mini-fill{height:6px;border-radius:999px;}

/* REPORTE — botón, modal y vista de impresión */
.seg-page-header-row{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;flex-wrap:wrap;}
.seg-btn-report{
  flex:none;background:var(--sb);color:#fff;border:none;border-radius:10px;
  padding:10px 18px;font-size:13px;font-weight:600;font-family:'Geist',sans-serif;
  cursor:pointer;transition:background .15s;white-space:nowrap;
}
.seg-btn-report:hover{background:var(--sb2);}
.seg-btn-report:disabled{background:var(--sg35);cursor:not-allowed;}
.seg-btn-secondary{
  background:var(--w);color:var(--sg7);border:1px solid var(--sg15);border-radius:10px;
  padding:10px 18px;font-size:13px;font-weight:600;font-family:'Geist',sans-serif;cursor:pointer;
}
.seg-btn-secondary:hover{border-color:var(--sg35);}

.seg-modal-overlay{
  position:fixed;inset:0;background:rgba(11,31,58,.45);display:none;align-items:center;justify-content:center;
  z-index:200;padding:20px;
}
/* Especificidad igual a [hidden] del navegador, pero de autor: gana siempre
   y por eso NO se puede alternar con overlay.hidden — se controla por clase. */
.seg-modal-overlay.seg-modal-open{display:flex;}
.seg-modal{
  background:var(--w);border-radius:16px;max-width:440px;width:100%;
  box-shadow:0 20px 50px rgba(0,0,0,.25);overflow:hidden;
}
.seg-modal-head{display:flex;align-items:center;justify-content:space-between;padding:18px 22px;border-bottom:1px solid var(--sg15);}
.seg-modal-title{font-size:15px;font-weight:700;color:var(--sg9);}
.seg-modal-close{background:none;border:none;font-size:16px;color:var(--sg45);cursor:pointer;line-height:1;padding:4px;}
.seg-modal-close:hover{color:var(--sg9);}
.seg-modal-body{padding:20px 22px;}
.seg-modal-foot{display:flex;justify-content:flex-end;gap:10px;padding:16px 22px;border-top:1px solid var(--sg15);}

.seg-report-desc{font-size:13px;color:var(--sg55);margin-bottom:16px;}
.seg-report-options{display:flex;flex-direction:column;gap:10px;}
.seg-report-opt{
  display:flex;align-items:center;gap:12px;text-align:left;width:100%;
  border:1.5px solid var(--sg15);border-radius:12px;padding:12px 14px;background:var(--w);
  cursor:pointer;transition:all .15s;font-family:'Geist',sans-serif;
}
.seg-report-opt:hover{border-color:var(--sb5);}
.seg-report-opt.active{border-color:var(--sb4);background:var(--sb15);}
.seg-report-opt-radio{
  flex:none;width:16px;height:16px;border-radius:50%;border:1.5px solid var(--sg35);position:relative;
}
.seg-report-opt.active .seg-report-opt-radio{border-color:var(--sb4);}
.seg-report-opt.active .seg-report-opt-radio::after{
  content:"";position:absolute;inset:3px;border-radius:50%;background:var(--sb4);
}
.seg-report-opt-title{font-size:13px;font-weight:600;color:var(--sg9);}
.seg-report-opt-sub{font-size:11px;color:var(--sg55);margin-top:2px;}
.seg-report-status{display:flex;align-items:center;gap:10px;color:var(--sg55);font-size:13px;padding:8px 0;}
.seg-report-error{background:var(--re1);border:1px solid #FECDCA;border-radius:10px;color:var(--re7);font-size:13px;padding:12px 16px;}
.seg-report-ok{color:#16A34A;font-size:13px;font-weight:600;padding:8px 0;}

@media print{
  @page{ size:landscape; margin:12mm; }
  #sidebar, .main-topbar, .seg-btn-report, .seg-modal-overlay{display:none !important;}
  /* El shell de la SPA fija html/body/#app-shell a 100vh con overflow:hidden
     para poder scrollear solo #page-content — eso recorta la impresión a una
     sola pantalla. Hay que liberar TODA la cadena de altura/overflow para
     que el contenido fluya en varias páginas en vez de cortarse. */
  html, body{height:auto !important;overflow:visible !important;background:#fff !important;}
  #app-shell{display:block !important;height:auto !important;overflow:visible !important;}
  #main{display:block !important;overflow:visible !important;height:auto !important;}
  #page-content{overflow:visible !important;height:auto !important;padding:0 !important;}
  .page{display:none !important;}
  .page.active{display:block !important;}
  .seg-section, .seg-chart-wrap, .seg-table-wrap, .seg-kpis, .seg-pkg-cards{break-inside:avoid;}
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
  function buildEjecutivo(mount, activo, transiciones, diario, roadmap, obsGen, obsUx, detalle){
    var sa = activo && activo.length ? activo[activo.length-1] : null;
    var ts = sa ? fmt(sa.timestamp) : '—';
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

    // ── KPIs (5 cards, sin "sin actividad") ──
    var kpisHTML =
      '<div class="seg-kpis">'
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
    // Mismo azul de la tarjeta "Avance del sprint" (kpi-dark → var(--sb)).
    var tiempoGrad = 'linear-gradient(90deg,var(--sb),var(--sb5))';
    // Reglas: <=40% rojo · >40% y <85% naranja · >=85% verde
    var itemsGrad  = avance>=85 ? 'linear-gradient(90deg,#22C55E,#16A34A)' : avance>40 ? 'linear-gradient(90deg,#F59E0B,#D97706)' : 'linear-gradient(90deg,#EF4444,#DC2626)';
    var itemsPctColor = avance>=85 ? '#16A34A' : avance>40 ? '#D97706' : '#DC2626';

    var dualesHTML =
      '<div class="seg-section"><div class="seg-sh">Progreso '+sprintNom+'</div>'
      +'<div class="seg-prog-section">'
      // Tiempo transcurrido
      +'<div class="seg-prog-row">'
        +'<div class="seg-prog-label">'
          +'<span class="seg-prog-lbl-txt">Tiempo transcurrido (día '+diasT+' de '+diasH+')</span>'
          +'<span class="seg-prog-lbl-pct">'+pct(tiempoPct,0)+'</span>'
        +'</div>'
        +'<div class="seg-prog-track"><div class="seg-prog-fill" style="width:'+tiempoPct+'%;background:'+tiempoGrad+';border-radius:999px;"></div></div>'
      +'</div>'
      // Ítems cerrados
      +'<div class="seg-prog-row">'
        +'<div class="seg-prog-label">'
          +'<span class="seg-prog-lbl-txt">Avance de cierre de ítems — '+sprintNom+'</span>'
          +'<span class="seg-prog-lbl-pct" style="color:'+itemsPctColor+';">'+pct(avance)+'</span>'
        +'</div>'
        +'<div class="seg-prog-track"><div class="seg-prog-fill" style="width:'+Math.min(avance,100)+'%;background:'+itemsGrad+';border-radius:999px;"></div></div>'
      +'</div>'
      +'</div></div>';

    // ── ACTIVIDAD POR SPRINT (Burndown + Distribución por tipo + Evolución
    // diaria + Detalle de work items, un solo set de tabs de sprint controla
    // las cuatro visualizaciones a la vez — ver buildActividadSprintHTML). ──
    var actividad = buildActividadSprintHTML(sa, diario||[], detalle||[]);

    // ── DEUDA TÉCNICA (se muestra al final de la página, ver mount.innerHTML) ──
    var deudaHTML = buildDeudaEjecutivo(deudaTotal, deudaAbiertos, deudaCerrados, deudaEnSprint, deudaBacklog);

    // ── CUMPLIMIENTO (tabla de todos los sprints; el promedio de últimos 5
    // ya se muestra en el KPI "Cumplim. histórico" arriba) ──
    var histHTML = buildHistoricoTable(sprintSummaries, last5Summaries, sprintNom);

    // ── OBSERVACIONES (colapsable) ──
    var obsHTML = buildObservacionesCollapsible(obsGen||[], obsUx||[]);

    mount.innerHTML =
      '<div class="seg-section"><div class="seg-sh">Sprint activo — '+sprintNom+'</div>'
      +kpisHTML+'</div>'
      +dualesHTML
      +actividad.html
      +histHTML
      +deudaHTML
      +obsHTML
      +'<div class="seg-ts">Último sync: '+ts+'</div>';

    // Dibujar canvas del sprint seleccionado por defecto (el más reciente)
    _burndownData = { diario: diario||[], sa: sa, sprint: actividad.lastSp };
    if(actividad.lastSp){
      var dayRows0 = diarioDayRows(diario||[], actividad.lastSp);
      setTimeout(function(){ drawBurndown(dayRows0, nDiasHabilesSprint(actividad.lastSp, sa, dayRows0)); }, 80);
    }
    wireActividadSprintTabs(mount, sa, diario||[]);
    wireObservaciones(mount, obsGen, obsUx);
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
    canvas.style.width='100%';
    var W=canvas.offsetWidth||600; var H=200;
    canvas.width=W*window.devicePixelRatio; canvas.height=H*window.devicePixelRatio;
    canvas.style.width=W+'px'; canvas.style.height=H+'px';
    var ctx=canvas.getContext('2d');
    ctx.scale(window.devicePixelRatio,window.devicePixelRatio);
    var pad={top:16,right:24,bottom:36,left:48};
    var cW=W-pad.left-pad.right; var cH=H-pad.top-pad.bottom;

    // Data: ítems RESTANTES por día real de sprint (total propio del día - cerrados del día)
    var realPts = dayPoints.map(function(p,i){
      return { x:p.d, y: p.total-p.closed, dayClose: p.closed-(i>0?dayPoints[i-1].closed:0) };
    });
    function xp(d){ return pad.left + (d/nDias)*cW; }
    function yp(v){ return pad.top + cH - (v/scaleMax)*cH; }

    ctx.clearRect(0,0,W,H);

    // Y ticks
    var yStep = scaleMax<=10?2:scaleMax<=20?5:Math.ceil(scaleMax/5);
    ctx.strokeStyle='#EEF1F4'; ctx.lineWidth=1;
    for(var yv=0;yv<=scaleMax;yv+=yStep){
      ctx.beginPath(); ctx.moveTo(pad.left,yp(yv)); ctx.lineTo(pad.left+cW,yp(yv)); ctx.stroke();
      ctx.fillStyle='#7C8896'; ctx.font='10px Geist Mono,monospace'; ctx.textAlign='right';
      ctx.fillText(yv, pad.left-6, yp(yv)+4);
    }

    // X ticks
    ctx.fillStyle='#7C8896'; ctx.font='10px Geist Mono,monospace'; ctx.textAlign='center';
    for(var d=0;d<=nDias;d+=2){
      ctx.fillText('D'+d, xp(d), H-pad.bottom+16);
    }

    // Barras de cerrados por día (amarillo/naranja)
    var barW = Math.max(4, (cW/nDias)*0.5);
    realPts.forEach(function(pt){
      if(pt.dayClose>0){
        var bh=(pt.dayClose/scaleMax)*cH;
        ctx.fillStyle='#F59E0B';
        ctx.fillRect(xp(pt.x)-barW/2, pad.top+cH-bh, barW, bh);
      }
    });

    // Línea ideal (gris) — de idealStart en día 0 a 0 en el último día hábil
    ctx.strokeStyle='#AFB8C2'; ctx.lineWidth=1.5; ctx.setLineDash([4,3]);
    ctx.beginPath(); ctx.moveTo(xp(0),yp(idealStart)); ctx.lineTo(xp(nDias),yp(0)); ctx.stroke();
    ctx.setLineDash([]);

    // Línea real — ítems restantes, un punto por día real de sprint
    if(realPts.length>0){
      ctx.strokeStyle='#1E4B7A'; ctx.lineWidth=2.5;
      ctx.beginPath(); ctx.moveTo(xp(0),yp(idealStart));
      realPts.forEach(function(pt){ ctx.lineTo(xp(pt.x),yp(pt.y)); });
      ctx.stroke();
      // Puntos
      ctx.fillStyle='#1E4B7A';
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
      tt.style.cssText = 'position:absolute;background:#0B1F3A;color:#fff;font-size:11px;font-family:Geist Mono,monospace;line-height:1.7;padding:7px 12px;border-radius:9px;pointer-events:none;display:none;z-index:50;white-space:nowrap;box-shadow:0 4px 12px rgba(0,0,0,.25);';
      wrap.appendChild(tt);
    }
    canvas.onmousemove = function(e){
      var rect = canvas.getBoundingClientRect();
      var mx = e.clientX - rect.left;
      var nearDay = 0; var nearDist = Infinity;
      for(var d=0; d<=nDias; d++){
        var dist = Math.abs(xp(d) - mx);
        if(dist < nearDist){ nearDist = dist; nearDay = d; }
      }
      if(nearDist > 28){ tt.style.display='none'; return; }
      var idealRem = Math.round(idealStart * (1 - nearDay / nDias));
      var actualPt = null;
      for(var i=0; i<realPts.length; i++){ if(realPts[i].x===nearDay){ actualPt=realPts[i]; break; } }
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
      Tasks:  {cerrado:'#3B82F6', abierto:'#93C5FD'},
      Bugs:   {cerrado:'#F59E0B', abierto:'#FCD34D'},
      Issues: {cerrado:'#6B7280', abierto:'#D1D5DB'}
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
        +'<div class="seg-avance-track" style="flex:1;display:flex;">'
          +'<div style="height:12px;background:'+col.cerrado+';width:'+wCerrado.toFixed(1)+'%;"></div>'
          +'<div style="height:12px;background:'+col.abierto+';width:'+wAbierto.toFixed(1)+'%;"></div>'
        +'</div>'
        +'<div class="seg-cump-nums mono">'+c+'/'+t+' <span style="color:var(--sg45);">('+Math.round(pTipo)+'%)</span></div>'
        +'</div>';
    }
    return '<div class="seg-sh">Distribución de ítems por tipo — '+sprint+' (cerrados vs. abiertos)</div>'
      +'<div class="seg-chart-wrap">'
      +fila('Tasks', tc, tt)
      +fila('Bugs', bc, bt)
      +fila('Issues', ic, it)
      +'<div style="font-size:11px;color:var(--sg45);margin-top:4px;">Tono oscuro = cerrados · tono claro = abiertos · ancho de la barra proporcional a la cantidad de ítems</div>'
      +'</div>';
  }

  function buildDeudaEjecutivo(total, abiertos, cerrados, enSprint, backlog){
    var hayBacklog = backlog && backlog.length > 0;
    if(total === 0 && !hayBacklog){
      return '<div class="seg-section"><div class="seg-sh">Deuda técnica</div>'
        +'<div style="padding:14px 18px;background:var(--em1);border-radius:10px;color:var(--em7);font-size:13px;">✓ No hay deuda técnica en este sprint ni en el backlog.</div></div>';
    }

    function deudaTable(items){
      var t = '<div class="seg-table-wrap"><table class="seg-table">'
        +'<thead><tr><th>ID</th><th>Tipo</th><th>Título</th><th>Estado</th><th>Sprint origen</th></tr></thead><tbody>';
      items.forEach(function(r){
        var estStr = fmt(r.estado);
        var estColor = estStr==='Closed' ? 'color:#16A34A;' : estStr==='Sin dato' ? 'color:var(--sg45);' : 'color:#DC2626;';
        var tipoCls = String(r.tipo||r.type||'').toLowerCase().includes('bug')
          ? 'background:#FEF2F2;color:#DC2626;'
          : String(r.tipo||r.type||'').toLowerCase().includes('issue')
            ? 'background:#FFFBEB;color:#D97706;'
            : 'background:#EFF6FF;color:#1D4ED8;';
        t+='<tr>'
          +'<td class="mono" style="color:var(--sg55);font-weight:700;">#'+(r.work_item_id||r.id||'—')+'</td>'
          +'<td><span class="seg-badge" style="'+tipoCls+'">'+fmt(r.tipo||r.type)+'</span></td>'
          +'<td style="max-width:300px;font-size:12px;">'+fmt(r.titulo||r.title)+'</td>'
          +'<td style="font-weight:700;'+estColor+'">'+estStr+'</td>'
          +'<td class="mono" style="color:#9E9E9E;">'+fmt(r.sprint_origen||r.sprint_previo)+'</td>'
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
      html += '<div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.08em;color:var(--sg55);margin-bottom:8px;">En el sprint actual</div>'
        +'<div class="seg-debt-cards">'
        +'<div class="seg-debt-card"><div class="seg-debt-val">'+total+'</div><div class="seg-debt-lbl">Total arrastrado</div></div>'
        +'<div class="seg-debt-card red"><div class="seg-debt-val">'+abiertos+'</div><div class="seg-debt-lbl">Aún abiertos</div></div>'
        +'<div class="seg-debt-card green"><div class="seg-debt-val">'+cerrados+'</div><div class="seg-debt-lbl">Cerrados en sprint</div></div>'
        +'</div>'
        +collapsibleTable('Ver listado de ítems arrastrados en el sprint actual ('+total+')', deudaTable(enSprint));
    }

    if(hayBacklog){
      html += '<div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.08em;color:var(--sg55);margin-top:20px;margin-bottom:8px;">En el backlog (sin sprint asignado)</div>'
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
      +'<div class="seg-table-wrap"><table class="seg-table">'
      +'<thead><tr><th>Sprint</th><th>Inicio</th><th>Fin</th><th>Cerrados</th><th>Pendientes</th><th>Total</th><th>Cumplimiento</th></tr></thead><tbody>';
    allSnaps.forEach(function(r){
      var cp=parseFloat(r.cumplimiento_pct||r.avance_pct);
      var rc=ragC(cp); var bw=Math.min(isNaN(cp)?0:cp,100);
      var esActual = r.sprint===sprintActivo;
      var esLast5 = last5Set[r.sprint] && !esActual;
      var totalN = parseInt(r.total_asof||r.total_items)||0;
      var closedN = parseInt(r.closed_asof||r.closed)||0;
      var pendN = Math.max(totalN-closedN,0);
      html+='<tr'+(esActual?' style="background:var(--sb15);"':'')+'>  '
        +'<td class="mono" style="font-weight:'+(esActual?'700':'400')+';">'
        +fmt(r.sprint)
        +(esActual?' <span style="font-size:10px;color:var(--sb4);">(actual)</span>':'')
        +(esLast5?' <span style="font-size:10px;color:var(--sg45);" title="Incluido en promedio histórico">★</span>':'')
        +'</td>'
        +'<td class="mono">'+(r.fecha_inicio?fechaDDMMYYYY(r.fecha_inicio):'—')+'</td>'
        +'<td class="mono">'+(r.fecha_fin?fechaDDMMYYYY(r.fecha_fin):'—')+'</td>'
        +'<td class="mono">'+fmt(r.closed_asof||r.closed||'—')+'</td>'
        +'<td class="mono">'+pendN+'</td>'
        +'<td class="mono">'+fmt(r.total_asof||r.total_items||'—')+'</td>'
        +'<td><div style="display:flex;align-items:center;gap:8px;">'
          +'<div class="prog-mini-wrap" style="width:160px;"><div class="prog-mini-fill" style="width:'+bw+'%;background:'+pbGrad(rc)+';border-radius:999px;"></div></div>'
          +'<span class="mono">'+pct(cp)+'</span>'
        +'</div></td>'
        +'</tr>';
    });
    html+='</tbody></table></div>'
      +'<div style="font-size:11px;color:var(--sg45);margin-top:8px;">★ Incluido en el promedio histórico (últimos 5 sprints)</div>'
      +'</div>';
    return html;
  }

  // ══════════════════════════════════════════════════════════════
  // ACTIVIDAD POR SPRINT — Burndown + Distribución por tipo + Evolución
  // diaria + Detalle de work items, las cuatro bajo el MISMO set de tabs
  // de sprint (todas leen de sprint_diario_acumulado vía diarioDayRows).
  // Seleccionar un sprint pasado cambia las cuatro visualizaciones a la vez.
  // ══════════════════════════════════════════════════════════════
  function buildActividadSprintHTML(sa, diario, detalle){
    var sprintActivo = sa ? sa.sprint : null;

    var sprintMap={};
    (diario||[]).forEach(function(r){ if(r.sprint) sprintMap[r.sprint]=true; });
    var sprints=Object.keys(sprintMap).sort(function(a,b){ return parseInt(a.replace(/\D/g,''))-parseInt(b.replace(/\D/g,'')); });
    if(!sprints.length) return { html:'', lastSp:null };
    var lastSp=sprints[sprints.length-1]||sprintActivo;

    var tabsHTML='<div class="seg-tabs" id="actividad-sprint-tabs">';
    sprints.forEach(function(sp){ tabsHTML+='<button class="seg-tab'+(sp===lastSp?' active':'')+'" data-sp="'+sp+'">'+sp+'</button>'; });
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
      var h='<div class="seg-table-wrap"><table class="seg-table">'
        +'<thead><tr><th>Día</th><th>Fecha</th><th>Cerrados</th><th>Pendientes</th><th>Total</th><th>Avance</th><th>Burn rate</th></tr></thead><tbody>';
      dayRows.forEach(function(r){
        var cp=parseFloat(r.avance_pct); var rc=ragC(cp); var bw=Math.min(isNaN(cp)?0:cp,100);
        var totalN=parseInt(r.total_items)||0; var closedN=parseInt(r.closed_items)||0;
        var pendN=Math.max(totalN-closedN,0);
        h+='<tr>'
          +'<td class="mono" style="color:var(--sb4);font-weight:600;">D'+fmt(r.dia_sprint)+'</td>'
          +'<td class="mono">'+fechaDDMMYYYY(r.fecha_cst)+'</td>'
          +'<td class="mono">'+fmt(r.closed_items)+'</td>'
          +'<td class="mono">'+pendN+'</td>'
          +'<td class="mono">'+fmt(r.total_items)+'</td>'
          +'<td><div style="display:flex;align-items:center;gap:8px;">'
            +'<div class="prog-mini-wrap"><div class="prog-mini-fill" style="width:'+bw+'%;background:'+pbGrad(rc)+';border-radius:999px;"></div></div>'
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
      var h='<div class="seg-table-wrap"><table class="seg-table">'
        +'<thead><tr><th>ID</th><th>Título</th><th>Estado</th><th>Asignado</th></tr></thead><tbody>';
      rows.forEach(function(r){
        var closed=String(r.estado||'').toLowerCase()==='closed';
        h+='<tr>'
          +'<td class="mono" style="color:var(--sg55);font-weight:700;">#'+fmt(r.id)+'</td>'
          +'<td style="max-width:340px;font-size:12px;">'+fmt(r.titulo)+'</td>'
          +'<td style="font-weight:700;'+(closed?'color:#16A34A;':'color:#DC2626;')+'">'+fmt(r.estado)+'</td>'
          +'<td style="font-size:12px;color:var(--sg7);">'+fmt(r.asignado)+'</td>'
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

        var dayRows = diarioDayRows(diario, sp);
        drawBurndown(dayRows, nDiasHabilesSprint(sp, sa, dayRows));
        if(_burndownData) _burndownData.sprint = sp;
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
      var barGrad = pp===null ? 'linear-gradient(90deg,#AFB8C2,#8B95A1)' : pbGrad(ragC(pp));
      html+='<div class="seg-pkg-card pkg-p'+pkgNum+'">'
        +'<div class="seg-pkg-id">Paquete '+pkgNum+'</div>'
        +'<div class="seg-pkg-name">'+fmt(p.nombre)+'</div>'
        +'<div class="seg-pkg-deadline">'+deadline.toLocaleDateString('es-SV',{day:'2-digit',month:'short',year:'numeric'})+'</div>'
        +'<div class="seg-pkg-days '+drc+'">'+drTxt+'</div>'
        +'<div style="display:flex;justify-content:space-between;font-size:11px;color:var(--sg55);margin-bottom:4px;">'
          +'<span>Avance de desarrollo</span><span>'+(pp===null?'—':pp+'%')+'</span>'
        +'</div>'
        +'<div class="seg-prog-track"><div class="seg-prog-fill" style="width:'+(pp||0)+'%;background:'+barGrad+';border-radius:999px;"></div></div>'
        +(devops?'<div style="font-size:10px;color:var(--sg45);margin-top:4px;">'+fmt(devops.hijos_cerrados)+'/'+fmt(devops.hijos_total)+' ítems cerrados (DevOps)</div>':'')
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
          +'<td style="font-size:12px;">'+fmt(a.actividad)+'</td>'
          +'<td class="mono" style="color:var(--sg45);white-space:nowrap;font-size:11px;">'+fmt(a.inicio)+' → '+fmt(a.fin)+'</td>'
          +'<td style="width:170px;"><div style="display:flex;align-items:center;gap:8px;">'
            +'<div class="prog-mini-wrap" style="width:90px;"><div class="prog-mini-fill" style="width:'+a.progreso+'%;background:'+pbGrad(rc)+';border-radius:999px;"></div></div>'
            +'<span class="mono" style="font-size:11px;">'+a.progreso+'%</span>'
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
            +'<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">'
              +'<span class="seg-rag '+estadoCls+'">'+fmt(p.estado)+'</span>'
              +spiBadge(p.spi)
            +'</div>'
          +'</div>'
          +'<div class="seg-pkg-deadline">Liberación: '+deadline.toLocaleDateString('es-SV',{day:'2-digit',month:'short',year:'numeric'})+'</div>'
          +'<div class="seg-pkg-days '+drc+'">'+drTxt+'</div>'
          +'<div class="seg-prog-section" style="margin-top:14px;">'
            +'<div class="seg-prog-row">'
              +'<div class="seg-prog-label"><span class="seg-prog-lbl-txt">Avance de desarrollo'+(devops?' ('+fmt(devops.hijos_cerrados)+'/'+fmt(devops.hijos_total)+' ítems cerrados)':'')+'</span><span class="seg-prog-lbl-pct">'+(progReal===null?'—':progReal+'%')+'</span></div>'
              +'<div class="seg-prog-track"><div class="seg-prog-fill" style="width:'+(progReal||0)+'%;background:'+(progReal===null?'linear-gradient(90deg,#AFB8C2,#8B95A1)':pbGrad(ragC(progReal)))+';border-radius:999px;"></div></div>'
            +'</div>'
            +'<div class="seg-prog-row">'
              +'<div class="seg-prog-label"><span class="seg-prog-lbl-txt">Avance planificado</span><span class="seg-prog-lbl-pct">'+progPlan+'%</span></div>'
              +'<div class="seg-prog-track"><div class="seg-prog-fill" style="width:'+progPlan+'%;background:#AFB8C2;border-radius:999px;"></div></div>'
            +'</div>'
          +'</div>'
          +(actRows?'<div class="seg-table-wrap" style="margin-top:14px;"><table class="seg-table"><thead><tr><th>Actividad</th><th>Fechas</th><th>Avance</th></tr></thead><tbody>'+actRows+'</tbody></table></div>':'')
          +(alcanceHTML?'<div style="margin-top:14px;"><div class="seg-sh" style="margin-bottom:8px;">Alcance</div><ul style="margin:0;padding-left:18px;font-size:12px;color:var(--sg7);line-height:1.7;">'+alcanceHTML+'</ul></div>':'')
        +'</div>'
      +'</div>';
    });
    mount.innerHTML = html;
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
        +'<div class="seg-kpi-sub" style="margin-top:6px;"><div class="seg-prog-track"><div class="seg-prog-fill" style="width:'+pctComp+'%;background:'+(pctComp>=90?'linear-gradient(90deg,#22C55E,#16A34A)':pctComp>=60?'linear-gradient(90deg,#F59E0B,#D97706)':'linear-gradient(90deg,#EF4444,#DC2626)')+';border-radius:999px;"></div></div></div>'
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
    var html='<div class="seg-table-wrap"><table class="seg-table">'
      +'<thead><tr><th>#</th><th>Fecha</th><th>Trámite</th><th>Tipo</th><th>Severidad</th><th>Estado TCA</th></tr></thead><tbody>';
    if(!filtered.length){
      html+='<tr><td colspan="6" style="text-align:center;color:var(--sg45);padding:24px;">Sin resultados para los filtros seleccionados.</td></tr>';
    } else {
      filtered.forEach(function(r){
        var sev=severityLabel(r.Score||r.score);
        var est=String(r['Estado TCA']||'—');
        var estColor=est==='Completado'?'color:var(--em7);font-weight:600;':est.includes('progreso')?'color:var(--am7);':'';
        html+='<tr>'
          +'<td class="mono" style="color:var(--sb4);font-weight:600;">'+fmt(r['#'])+'</td>'
          +'<td class="mono" style="white-space:nowrap;">'+fmt(r.Fecha)+'</td>'
          +'<td style="max-width:260px;font-size:12px;">'+fmt(r['Trámite']||r.Tramite)+'</td>'
          +'<td><span class="seg-badge" style="background:var(--sg15);color:var(--sg7);">'+getTipo(r)+'</span></td>'
          +'<td><span class="seg-badge '+sev.c+'">'+sev.l+'</span></td>'
          +'<td style="font-size:12px;'+estColor+'">'+est+'</td>'
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
      +'<span style="font-size:11px;color:var(--sg55);align-self:center;">Tipo:</span>'
      +tipos.map(function(t){ return '<button class="seg-obs-filter'+(t==='all'?' active':'')+'" data-tipo="'+t+'">'+(t==='all'?'Todos':t.charAt(0).toUpperCase()+t.slice(1))+'</button>'; }).join('')
      +'</div>'
      +'<div class="seg-obs-filters" id="filter-estado-'+panelId+'">'
      +'<span style="font-size:11px;color:var(--sg55);align-self:center;">Estado TCA:</span>'
      +estados.map(function(s){ return '<button class="seg-obs-filter'+(s==='all'?' active':'')+'" data-estado="'+s+'">'+(s==='all'?'Todos':s)+'</button>'; }).join('')
      +'</div>';
    return buildObsKpis(rows)
      +filterBar
      +'<div id="obs-table-'+panelId+'">'+buildObsTableHTML(rows,'all','all')+'</div>';
  }

  function buildObservacionesCollapsible(gen, ux){
    if(!gen.length && !ux.length) return '';
    return '<div class="seg-section">'
      +'<details class="seg-collapsible" id="obs-collapsible">'
        +'<summary>Listado de tareas — Observaciones UAT (Generales + Diseño UX)</summary>'
        +'<div class="seg-collapsible-body">'
          +'<div class="seg-tabs" style="margin-bottom:20px;" id="obs-main-tabs">'
          +'<button class="seg-tab active" data-obs-tab="gen">Generales ('+gen.length+')</button>'
          +'<button class="seg-tab" data-obs-tab="ux">Diseño UX ('+ux.length+')</button>'
          +'</div>'
          +'<div id="obs-panel-gen">'+buildObsPanel(gen,'gen')+'</div>'
          +'<div id="obs-panel-ux" style="display:none;">'+buildObsPanel(ux,'ux')+'</div>'
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
        container.querySelectorAll('[data-obs-tab]').forEach(function(x){ x.classList.remove('active'); });
        t.classList.add('active');
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
  }

  // loadResumen() hace el fetch+pintado y se puede llamar más de una vez: la
  // primera vez al montar la pestaña, y de nuevo — sola, sin aviso — cada vez
  // que una revalidación en segundo plano trae un dato distinto para alguna
  // de sus 7 fuentes. mountResumen() es el punto de entrada que solo monta
  // (y se suscribe a las actualizaciones) una vez por carga de página.
  function loadResumen(){
    var m=document.getElementById('seg-resumen-mount');
    if(!m) return;
    var results={}; var firstError=null; var pending=7;
    function onDone(key){
      return function(err,data){
        if(err && !firstError) firstError=err;
        results[key]=data;
        if(--pending===0) finish();
      };
    }
    function onDoneLenient(key){
      // Observaciones y Detalle de work items no deben tumbar el resto de la página si falla su fetch.
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
      if(firstError){ if(!m.dataset.rendered) m.innerHTML=errBlock(firstError); return; }
      m.dataset.rendered='1';
      var activo=results.activo||[];
      _lastResumenData = {
        activo: activo, trans: results.trans||[], diario: results.diario||[],
        roadmap: results.roadmap||null, obsGen: results.obsGen||[], obsUx: results.obsUx||[],
        detalle: results.detalle||[]
      };
      buildEjecutivo(m,activo,results.trans||[],results.diario||[],results.roadmap,results.obsGen||[],results.obsUx||[],results.detalle||[]);
    }
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
        .forEach(function(key){ onSheetUpdate(key, loadResumen); });
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

  function hookNav(){
    var observer=new MutationObserver(function(muts){
      muts.forEach(function(m){
        if(m.type==='attributes'&&m.attributeName==='class'){
          var el=m.target;
          if(el.classList.contains('active')){
            if(el.id==='page-seg-resumen')  mountResumen();
            if(el.id==='page-seg-paquetes') mountPaquetes();
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
      });
    });
    var redraw = function(){
      if(!_burndownData || !_burndownData.sprint) return;
      var dayRows = diarioDayRows(_burndownData.diario, _burndownData.sprint);
      drawBurndown(dayRows, nDiasHabilesSprint(_burndownData.sprint, _burndownData.sa, dayRows));
    };
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

  function construirReporteHTMLStandalone(){
    if(!_lastResumenData) return null;
    var scriptUrl = location.origin + '/modules/seguimiento.js';
    // Escapar "<" evita que un título/observación con literalmente "</script>"
    // cierre el bloque de datos antes de tiempo — JSON.parse lo revierte igual.
    var dataJson = JSON.stringify(_lastResumenData).replace(/</g,'\\u003c');
    var generadoTs = new Date().toLocaleString('es-SV', {dateStyle:'medium', timeStyle:'short'});
    return '<!doctype html>'
      +'<html lang="es"><head><meta charset="utf-8">'
      +'<meta name="viewport" content="width=device-width, initial-scale=1">'
      +'<title>Reporte ejecutivo — ISSS-SYDT</title>'
      +'<style>'
        +'body{margin:0;background:#E4E8EC;font-family:Geist,Arial,sans-serif;}'
        +'.seg-report-wrap{max-width:1180px;margin:0 auto;padding:28px;box-sizing:border-box;}'
        +'.seg-report-head{margin-bottom:24px;}'
        +'.seg-report-head .seg-report-title{font-size:24px;font-weight:700;letter-spacing:-.02em;color:#14181F;}'
        +'.seg-report-head .seg-report-sub{font-size:13px;color:#5A6877;margin-top:4px;}'
      +'</style>'
      +'</head><body>'
      +'<div class="seg-report-wrap">'
        +'<div class="seg-report-head"><div class="seg-report-title">Resumen ejecutivo — ISSS-SYDT</div><div class="seg-report-sub">Reporte generado el '+generadoTs+'</div></div>'
        +'<div id="seg-resumen-mount"><div style="padding:40px 0;text-align:center;color:#5A6877;font-size:13px;">Cargando reporte…</div></div>'
      +'</div>'
      +'<script type="application/json" id="seg-report-data">'+dataJson+'<\/script>'
      +'<script src="'+scriptUrl+'"><\/script>'
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
    var tituloOriginal = document.title;
    document.title = 'Reporte ejecutivo ISSS-SYDT ' + new Date().toISOString().slice(0,10);
    function restaurar(){
      reabrir.forEach(function(d){ d.open=false; });
      document.title = tituloOriginal;
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
              +'<span><span class="seg-report-opt-title">HTML interactivo</span><br><span class="seg-report-opt-sub">Con filtro de sprint y contenedores colapsables, igual que en la web app.</span></span>'
            +'</button>'
            +'<button type="button" class="seg-report-opt" data-fmt="pdf">'
              +'<span class="seg-report-opt-radio"></span>'
              +'<span><span class="seg-report-opt-title">PDF</span><br><span class="seg-report-opt-sub">Vista estática del sprint que estás viendo ahora.</span></span>'
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
        var html = construirReporteHTMLStandalone();
        var fecha = new Date().toISOString().slice(0,10);
        descargarArchivo('reporte-ejecutivo-isss-sydt-'+fecha+'.html', html, 'text/html;charset=utf-8');
        body.innerHTML = '<div class="seg-report-ok">✓ Reporte descargado.</div>';
        setTimeout(cerrar, 900);
      }, 50);
    }

    btn.addEventListener('click', abrir);
    overlay.querySelector('#seg-report-close').addEventListener('click', cerrar);
    overlay.addEventListener('click', function(e){ if(e.target===overlay) cerrar(); });
  }

  function init(){
    mountStyles();
    injectPages();
    hookNav();
    mountReportModal();
    if(document.getElementById('page-seg-resumen')  &&document.getElementById('page-seg-resumen').classList.contains('active'))  mountResumen();
    if(document.getElementById('page-seg-paquetes') &&document.getElementById('page-seg-paquetes').classList.contains('active')) mountPaquetes();
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',init);
  } else {
    init();
  }
})();
