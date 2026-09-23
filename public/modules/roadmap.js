// modules/roadmap.js — Portal ISSS-SYDT · data-driven desde /data/roadmap.json
//
// Nota: este archivo se carga también, tal cual, desde el resumen HTML
// standalone que genera el botón "Generar resumen" (ver sección REPORTE al
// final) — esa página no tiene #roadmap-mount, así que el bloque de
// fetch+render automático de abajo queda condicionado a que exista, pero el
// resto del módulo (CSS, funciones de render, RM_RENDER_REPORT_FROM_DATA)
// se define siempre, sin depender de #roadmap-mount.
(function(){
  var mount = document.getElementById('roadmap-mount');

  // Mismo endpoint de Apps Script que ya usa Seguimiento — hoja nueva
  // "avances_actividades" (lectura vía ?sheet=, escritura vía doPost).
  var SH = (window.PORTAL_CONFIG && window.PORTAL_CONFIG.sheets && window.PORTAL_CONFIG.sheets.seguimientoUrl) || '';

  // ── CSS ──────────────────────────────────────────────────────────────────────
  var style = document.createElement('style');
  style.textContent = `:root{
  --goes-blue-900:#0B1F3A; --goes-blue-800:#102A4C; --goes-blue-700:#16385F;
  --goes-blue-600:#1E4B7A; --goes-blue-500:#2C6196; --goes-blue-150:#E7EEF6;
  --goes-gray-900:#14181F; --goes-gray-700:#33404F; --goes-gray-550:#5A6877;
  --goes-gray-450:#7C8896; --goes-gray-350:#AFB8C2; --goes-gray-150:#EEF1F4;
  --goes-gray-100:#F4F6F8; --goes-gray-50:#FAFBFC; --white:#FFFFFF;
  --beige-300:#E9E0CF; --beige-50:#FBF8F2;
  --emerald-700:#0F7A52; --emerald-50:#E6F4EE;
  --amber-700:#9A6A00; --amber-50:#FBF3DF;
  --violet-700:#5B3FB0; --violet-50:#EFEAFB;
  --blue-700:#1D4ED8;
}
.hero{background:linear-gradient(135deg,var(--goes-blue-900) 0%,var(--goes-blue-700) 60%,var(--goes-blue-600) 100%);color:var(--white);padding:48px 56px 40px;position:relative;overflow:hidden;}
.hero::after{content:"";position:absolute;right:-80px;top:-80px;width:320px;height:320px;border-radius:50%;background:rgba(255,255,255,.05);}
.hero-kicker{font-family:'Geist Mono',monospace;font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:var(--goes-gray-350);margin-bottom:18px;}
.hero h1{font-size:38px;font-weight:700;letter-spacing:-.02em;line-height:1.1;margin-bottom:10px;}
.hero .sub{font-size:16px;font-weight:400;color:#D7E2EF;max-width:620px;}
.hero-strip{display:flex;gap:0;margin-top:34px;border-top:1px solid rgba(255,255,255,.15);padding-top:22px;}
.hs-item{flex:1;}
.hs-item .k{font-family:'Geist Mono',monospace;font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:var(--goes-gray-350);margin-bottom:4px;}
.hs-item .v{font-size:15px;font-weight:600;color:var(--white);}
.hs-item .v small{font-weight:400;color:#C7D4E3;}
.section{padding:38px 56px;}
.section-h{font-size:11px;font-family:'Geist Mono',monospace;letter-spacing:.16em;text-transform:uppercase;color:var(--goes-blue-600);margin-bottom:18px;display:flex;align-items:center;gap:10px;}
.section-h::after{content:"";flex:1;height:1px;background:var(--goes-gray-150);}
.summary{display:flex;gap:16px;}
.sum-card{flex:1;border:1px solid var(--goes-gray-150);border-radius:14px;padding:20px;background:var(--goes-gray-50);position:relative;}
.sum-card::before{content:"";position:absolute;left:0;top:18px;bottom:18px;width:3px;border-radius:0 3px 3px 0;background:var(--goes-blue-600);}
.sum-id{font-family:'Geist Mono',monospace;font-size:11px;font-weight:500;color:var(--goes-blue-600);letter-spacing:.1em;margin-bottom:8px;}
.sum-title{font-size:14px;font-weight:600;color:var(--goes-gray-900);line-height:1.3;min-height:54px;}
.sum-rel{margin-top:14px;padding-top:12px;border-top:1px solid var(--goes-gray-150);display:flex;justify-content:space-between;align-items:baseline;}
.sum-rel span{font-size:11px;color:var(--goes-gray-450);}
.sum-rel strong{font-size:14px;font-weight:600;color:var(--goes-gray-900);font-family:'Geist Mono',monospace;}
.sum-prog-bar{height:4px;border-radius:99px;background:#EBEBEB;margin-top:8px;overflow:hidden;}
.sum-prog-fill{height:4px;border-radius:99px;background:linear-gradient(90deg,#22C55E,#16A34A);}
.sum-pct-wrap{position:absolute;top:14px;right:14px;display:flex;flex-direction:column;align-items:flex-end;gap:4px;}
.sum-pct-badge{font-family:'Geist Mono',monospace;font-size:13px;font-weight:700;padding:4px 10px;border-radius:8px;line-height:1;display:flex;align-items:center;gap:5px;}
.sum-pct-badge.pct-actual{background:var(--emerald-50);color:var(--emerald-700);}
.sum-pct-badge.pct-actual-zero{background:var(--goes-gray-150);color:var(--goes-gray-450);}
.sum-pct-badge.pct-planif{background:var(--goes-blue-150);color:var(--goes-blue-700);font-size:11px;font-weight:500;}
.sum-pct-label{font-size:9px;font-weight:500;text-transform:uppercase;letter-spacing:.07em;opacity:.75;}
.sum-prog-bar{height:6px;border-radius:99px;background:#EBEBEB;margin-top:10px;overflow:visible;position:relative;}
.sum-prog-fill-planif{position:absolute;top:0;left:0;height:6px;border-radius:99px;background:var(--goes-blue-150);border:1.5px solid var(--goes-blue-500);}
.sum-prog-fill-actual{position:absolute;top:0;left:0;height:6px;border-radius:99px;background:linear-gradient(90deg,#22C55E,#16A34A);}
.pkg{border:1px solid var(--goes-gray-150);border-radius:16px;overflow:hidden;margin-bottom:24px;background:var(--white);}
.pkg-head{display:flex;align-items:center;gap:18px;padding:20px 24px;background:var(--goes-blue-150);border-bottom:1px solid var(--goes-gray-150);}
.pkg-id{width:46px;height:46px;flex:none;border-radius:11px;background:var(--goes-blue-700);color:var(--white);font-family:'Geist Mono',monospace;font-weight:500;font-size:16px;display:flex;align-items:center;justify-content:center;}
.pkg-titles{flex:1;}
.pkg-name{font-size:16px;font-weight:600;color:var(--goes-gray-900);}
.pkg-sub{font-weight:400;color:var(--goes-gray-550);}
.pkg-meta{margin-top:6px;display:flex;align-items:center;gap:10px;}
.pkg-range{font-family:'Geist Mono',monospace;font-size:11px;color:var(--goes-gray-550);}
.pkg-release{text-align:right;flex:none;}
.rel-label{font-size:10px;text-transform:uppercase;letter-spacing:.1em;color:var(--goes-gray-450);}
.rel-date{font-family:'Geist Mono',monospace;font-size:18px;font-weight:500;color:var(--goes-blue-700);}
.badge{display:inline-block;font-size:10px;font-weight:600;padding:3px 9px;border-radius:20px;letter-spacing:.02em;}
.badge-prog{background:var(--amber-50);color:var(--amber-700);}
.badge-plan{background:var(--goes-gray-150);color:var(--goes-gray-550);}
.badge-hito{background:var(--emerald-50);color:var(--emerald-700);}
.pkg-body{display:flex !important;flex-direction:row !important;}
.col{padding:22px 24px;}
.col-scope{width:42%;flex:none !important;border-right:1px solid var(--goes-gray-150);background:var(--goes-gray-50);}
.col-track{width:58%;flex:1 !important;background:var(--white);}
.col-h{font-size:11px;font-family:'Geist Mono',monospace;letter-spacing:.1em;text-transform:uppercase;color:var(--goes-blue-600);margin-bottom:12px;}
.col-h-sp{margin-top:20px;}
.mod-list{list-style:none;}
.mod-list li{position:relative;padding-left:16px;margin-bottom:7px;font-size:12.5px;color:var(--goes-gray-700);line-height:1.4;}
.mod-list li::before{content:"";position:absolute;left:0;top:7px;width:5px;height:5px;border-radius:50%;background:var(--goes-blue-500);}
.sp-block{display:flex;flex-direction:column;gap:7px;}
.sp-row{display:flex;align-items:center;gap:10px;background:var(--white);border:1px solid var(--goes-gray-150);border-radius:9px;padding:8px 11px;}
.sp-tag{font-family:'Geist Mono',monospace;font-size:11px;font-weight:500;color:var(--goes-blue-700);background:var(--goes-blue-150);padding:2px 7px;border-radius:5px;flex:none;min-width:62px;text-align:center;}
.sp-f{font-family:'Geist Mono',monospace;font-size:11px;color:var(--goes-gray-550);flex:none;min-width:96px;}
.sp-d{font-size:12px;color:var(--goes-gray-700);}
.track{position:relative;padding-left:6px;}
.hito{position:relative;display:flex;align-items:baseline;gap:12px;padding:0 0 16px 22px;border-left:2px solid var(--goes-gray-150);}
.hito:last-child{border-left-color:transparent;padding-bottom:0;}
.hito-dot{position:absolute;left:-7px;top:3px;width:12px;height:12px;border-radius:50%;background:var(--white);border:2.5px solid var(--goes-gray-350);}
.hito-dev .hito-dot{border-color:var(--goes-gray-450);}
.hito-entrega .hito-dot{border-color:var(--violet-700);}
.hito-uat .hito-dot{border-color:var(--blue-700);}
.hito-ciber .hito-dot{border-color:var(--amber-700);}
.hito-lib .hito-dot{border-color:var(--emerald-700);background:var(--emerald-700);}
.hito-f{font-family:'Geist Mono',monospace;font-size:11px;font-weight:500;color:var(--goes-gray-900);flex:none;min-width:88px;}
.hito-t{font-size:12.5px;color:var(--goes-gray-700);flex:1;}
.hito-cat{font-size:9.5px;font-weight:600;padding:2px 8px;border-radius:20px;letter-spacing:.03em;flex:none;text-transform:uppercase;}
.cat-dev{background:var(--goes-gray-150);color:var(--goes-gray-550);}
.cat-entrega{background:var(--violet-50);color:var(--violet-700);}
.cat-uat{background:var(--goes-blue-150);color:var(--blue-700);}
.cat-ciber{background:var(--amber-50);color:var(--amber-700);}
.cat-lib{background:var(--emerald-50);color:var(--emerald-700);}
.pkg-foot{display:flex;align-items:center;gap:9px;padding:14px 24px;background:var(--goes-blue-900);color:var(--white);font-size:12.5px;font-weight:500;}
.foot-dot{width:8px;height:8px;border-radius:50%;background:var(--emerald-700);box-shadow:0 0 0 3px rgba(15,122,82,.3);}
.trans{border:1px solid var(--goes-gray-150);border-radius:14px;overflow:hidden;}
.tr-row{display:flex;align-items:center;gap:14px;padding:13px 20px;border-bottom:1px solid var(--goes-gray-150);}
.tr-row:last-child{border-bottom:none;}
.tr-row:nth-child(odd){background:var(--goes-gray-50);}
.tr-name{flex:1;font-size:13px;color:var(--goes-gray-700);}
.tr-range{font-family:'Geist Mono',monospace;font-size:11px;color:var(--goes-gray-550);min-width:130px;}
.legend{display:flex;gap:18px;flex-wrap:wrap;margin-top:6px;}
.lg{display:flex;align-items:center;gap:7px;font-size:11px;color:var(--goes-gray-550);}
.lg .d{width:11px;height:11px;border-radius:50%;border:2.5px solid;}
.lg-dev .d{border-color:var(--goes-gray-450);}
.lg-entrega .d{border-color:var(--violet-700);}
.lg-uat .d{border-color:var(--blue-700);}
.lg-ciber .d{border-color:var(--amber-700);}
.lg-lib .d{border-color:var(--emerald-700);background:var(--emerald-700);}
.docfoot{padding:24px 56px 40px;border-top:1px solid var(--goes-gray-150);display:flex;justify-content:space-between;align-items:center;color:var(--goes-gray-450);font-size:11px;}
.docfoot .mono{font-family:'Geist Mono',monospace;}
.note{font-size:11px;color:var(--goes-gray-450);margin-top:14px;line-height:1.5;}
/* GANTT */
.g-tabs{display:flex;gap:10px;margin-bottom:16px;}
.g-tab{flex:none;min-width:90px;text-align:center;cursor:pointer;font-family:'Geist',sans-serif;font-size:14px;font-weight:600;color:var(--goes-gray-550);background:var(--goes-gray-50);border:1px solid var(--goes-gray-150);border-radius:10px;padding:10px 18px;transition:all .15s;}
.g-tab:hover{border-color:var(--goes-blue-500);}
.g-tab.is-active{background:var(--goes-blue-150);border-color:var(--goes-blue-600);color:var(--goes-gray-900);}
.gantt{border:1px solid var(--goes-gray-150);border-radius:14px;overflow:hidden;}
.g-head{display:flex;background:var(--goes-blue-900);}
.g-head-spacer{width:220px;flex:none;background:var(--goes-blue-900);}
.g-head-scroll{flex:1;overflow:hidden;position:relative;}
.g-head-months{position:relative;height:38px;}
.g-month{position:absolute;top:0;height:38px;display:flex;align-items:center;justify-content:center;color:var(--white);font-size:13px;font-weight:600;border-left:1px solid rgba(255,255,255,.12);white-space:nowrap;padding:0 6px;}
.g-panel{display:none;}
.g-panel.is-active{display:block;}
.g-body{background:var(--white);display:flex;}
.g-modal-body{background:var(--white);}
.g-task-col{width:220px;flex:none;border-right:1px solid var(--goes-gray-150);}
.g-task-row{height:32px;display:flex;align-items:center;justify-content:flex-end;text-align:right;padding-right:14px;font-size:11.5px;color:var(--goes-gray-700);line-height:1.15;}
.g-lanes-scroll{flex:1;min-width:0;overflow-x:auto;overflow-y:hidden;}
.g-lanes-scroll::-webkit-scrollbar{height:9px;}
.g-lanes-scroll::-webkit-scrollbar-track{background:var(--goes-gray-100);}
.g-lanes-scroll::-webkit-scrollbar-thumb{background:var(--goes-gray-350);border-radius:99px;}
.g-lanes-inner{position:relative;}
.g-gridlines{position:absolute;left:0;right:0;top:0;bottom:0;pointer-events:none;}
.g-grid{position:absolute;top:0;bottom:0;width:1px;background:var(--goes-gray-150);}
.g-lane-row{position:relative;height:32px;}
.g-bar{position:absolute;top:50%;transform:translateY(-50%);height:14px;border-radius:10px;}
.g-bar-inner{position:absolute;inset:0;border-radius:10px;overflow:hidden;}
.g-bar-track{position:absolute;inset:0;border-radius:10px;opacity:.25;}
.g-bar-track.g1{background:var(--goes-blue-700);}
.g-bar-track.g2{background:var(--goes-gray-550);}
.g-bar-track.g3{background:var(--goes-blue-500);}
.g-bar-fill{position:absolute;top:0;left:0;height:100%;border-radius:10px 0 0 10px;background:linear-gradient(90deg,#22C55E,#16A34A);}
.g-bar-pct{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);font-family:'Geist Mono',monospace;font-size:8px;font-weight:700;color:var(--goes-gray-900);background:rgba(255,255,255,.88);padding:0 4px;border-radius:20px;white-space:nowrap;line-height:1.6;pointer-events:none;}
.g-d{position:absolute;top:50%;transform:translateY(-50%);font-family:'Geist Mono',monospace;font-size:9px;color:var(--goes-gray-550);white-space:nowrap;}
.g-d-ini{right:calc(100% + 4px);}
.g-d-fin{left:calc(100% + 4px);}
.g-task-row.mile,.g-lane-row.mile{height:38px;}
.g-task-row.mile{font-weight:600;color:var(--goes-gray-900) !important;}
.g-task-row.final{color:#B0322B !important;font-weight:700;}
.g-milestone{position:absolute;top:50%;transform:translate(-50%,-50%);display:flex;align-items:center;gap:7px;}
.g-mile-dot{width:13px;height:13px;border-radius:50%;flex:none;}
.g-milestone.g1 .g-mile-dot{background:var(--goes-blue-700);}
.g-milestone.g2 .g-mile-dot{background:var(--goes-gray-550);}
.g-milestone.g3 .g-mile-dot{background:var(--goes-blue-500);}
.g-mile-final .g-mile-dot{background:#B0322B;width:15px;height:15px;box-shadow:0 0 0 4px rgba(176,50,43,.14);}
.g-mile-date{font-family:'Geist Mono',monospace;font-size:12px;font-weight:600;color:var(--goes-gray-900);white-space:nowrap;}
.g-mile-final .g-mile-date{color:#B0322B;}
/* TABS pkg */
.pkg-tabs{display:flex;gap:10px;margin-bottom:20px;}
.pkg-tab{flex:1;display:flex;align-items:center;gap:11px;text-align:left;cursor:pointer;background:var(--goes-gray-50);border:1px solid var(--goes-gray-150);border-radius:12px;padding:13px 16px;font-family:'Geist',sans-serif;transition:all .15s ease;}
.pkg-tab .tab-id{width:34px;height:34px;flex:none;border-radius:9px;background:var(--white);border:1px solid var(--goes-gray-150);color:var(--goes-gray-550);font-family:'Geist Mono',monospace;font-weight:500;font-size:13px;display:flex;align-items:center;justify-content:center;}
.pkg-tab .tab-title{font-size:12.5px;font-weight:500;color:var(--goes-gray-550);line-height:1.25;}
.pkg-tab:hover{border-color:var(--goes-blue-500);}
.pkg-tab.is-active{background:var(--goes-blue-150);border-color:var(--goes-blue-600);}
.pkg-tab.is-active .tab-id{background:var(--goes-blue-700);border-color:var(--goes-blue-700);color:var(--white);}
.pkg-tab.is-active .tab-title{color:var(--goes-gray-900);font-weight:600;}
.pkg-panel{display:none;}
.pkg-panel.is-active{display:block;}
.pkg-panel.pkg{margin-bottom:0;}
/* Meta bar */
.roadmap-meta-bar{display:flex;gap:0;background:var(--goes-blue-900);border-radius:12px;margin-bottom:20px;padding:18px 24px;}
.rmb-item{flex:1;}
.rmb-k{display:block;font-family:'Geist Mono',monospace;font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:rgba(255,255,255,.45);margin-bottom:4px;}
.rmb-v{display:block;font-size:15px;font-weight:600;color:#fff;}
/* Portal overrides */
#roadmap-mount .section{padding:24px 0 !important;}
#roadmap-mount .section:first-child{padding-top:0 !important;}
#roadmap-mount .section-h::after{display:none !important;}
#roadmap-mount .gantt{overflow:hidden;border-radius:12px;}
/* Today line */
.g-today-line-v{position:absolute;top:0;bottom:0;width:0;border-left:1.5px dashed rgba(176,50,43,.65);pointer-events:none;z-index:20;}
.g-today-label-date{position:absolute;bottom:2px;transform:translateX(-50%);font-family:'Geist Mono',monospace;font-size:9px;font-weight:600;color:rgba(176,50,43,.9);background:rgba(255,255,255,.85);padding:0 3px;border-radius:3px;white-space:nowrap;pointer-events:none;z-index:25;line-height:1.4;}
/* Gantt full btn */
.gantt-full-btn-wrap{display:flex;justify-content:flex-end;padding:14px 0 4px;}
.gantt-full-btn{font-family:'Geist',sans-serif;font-size:12px;font-weight:500;color:var(--goes-gray-50);background:var(--goes-gray-550);border:none;border-radius:8px;padding:8px 16px;cursor:pointer;transition:background .15s;}
.gantt-full-btn:hover{background:var(--goes-blue-800);}
/* Modal */
.gantt-modal-overlay{position:fixed;inset:0;background:rgba(14,48,90,.6);backdrop-filter:blur(3px);z-index:9998;display:flex;align-items:center;justify-content:center;opacity:0;pointer-events:none;transition:opacity .2s;}
.gantt-modal-overlay.open{opacity:1;pointer-events:auto;}
.gantt-modal{background:var(--white);border-radius:14px;width:min(1200px,96vw);max-height:88vh;display:flex;flex-direction:column;box-shadow:0 24px 64px rgba(0,0,0,.25);overflow:hidden;}
.gantt-modal-head{display:flex;align-items:center;justify-content:space-between;padding:16px 22px;border-bottom:1px solid var(--goes-gray-150);background:var(--goes-blue-900);flex:none;}
.gantt-modal-title{font-size:14px;font-weight:600;color:#fff;font-family:'Geist',sans-serif;}
.gantt-modal-close{width:30px;height:30px;border-radius:7px;font-size:14px;color:rgba(255,255,255,.7);background:rgba(255,255,255,.12);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background .15s;font-family:'Geist',sans-serif;}
.gantt-modal-close:hover{background:rgba(255,255,255,.22);color:#fff;}
.gantt-modal-body{overflow-y:auto;padding:20px;flex:1;}
.gantt-modal-footer{display:flex;align-items:center;justify-content:flex-end;gap:22px;padding:14px 22px;border-top:1px solid var(--goes-gray-150);background:var(--goes-gray-50);flex:none;}
.gmf-format{display:flex;align-items:center;gap:16px;}
.gmf-radio{display:flex;align-items:center;gap:6px;font-family:'Geist',sans-serif;font-size:12.5px;color:var(--goes-gray-700);cursor:pointer;user-select:none;}
.gmf-radio input{accent-color:var(--goes-blue-700);width:14px;height:14px;cursor:pointer;margin:0;}
.gmf-save-btn{font-family:'Geist',sans-serif;font-size:12.5px;font-weight:600;color:#fff;background:var(--goes-blue-700);border:none;border-radius:8px;padding:9px 20px;cursor:pointer;transition:background .15s;display:flex;align-items:center;gap:7px;white-space:nowrap;}
.gmf-save-btn:hover{background:var(--goes-blue-800);}
.gmf-save-btn:disabled{opacity:.6;cursor:not-allowed;}
.gantt-in-modal{border-radius:10px;overflow:hidden;}
.gantt-in-modal .g-tabs{display:none !important;}
.gantt-in-modal .g-panel{display:block !important;}
.modal-pkg-block{display:flex;position:relative;border-top:1px solid var(--goes-gray-150);}
.modal-pkg-block:first-of-type{border-top:none;}
.modal-pkg-tag{width:52px;flex:none;display:flex;align-items:center;justify-content:center;font-family:'Geist',sans-serif;font-size:12px;font-weight:700;color:var(--goes-gray-900);background:var(--goes-gray-50);border-right:1px solid var(--goes-gray-150);writing-mode:vertical-rl;transform:rotate(180deg);letter-spacing:.06em;padding:12px 0;}
.gantt-in-modal .g-head-spacer{width:272px;}
.modal-tag-pp1{color:var(--goes-blue-700);}
.modal-tag-pp2{color:var(--goes-gray-550);}
.modal-tag-pp3{color:var(--goes-blue-500);}
.gantt-in-modal .g-task-row,.gantt-in-modal .g-lane-row{height:24px !important;}
.gantt-in-modal .g-task-row.mile,.gantt-in-modal .g-lane-row.mile{height:28px !important;}
.gantt-in-modal .g-task-row{font-size:13px !important;}
.gantt-in-modal .g-d{font-size:11px !important;}
.gantt-in-modal .g-mile-date{font-size:13px !important;}
/* En el modal, la barra de scroll visible y la etiqueta de fecha sólo se muestran
   en el último carril (paquete inferior); los demás quedan sincronizados igual. */
.gantt-in-modal .modal-pkg-block:not(:last-child) .g-lanes-scroll{scrollbar-width:none;-ms-overflow-style:none;}
.gantt-in-modal .modal-pkg-block:not(:last-child) .g-lanes-scroll::-webkit-scrollbar{display:none;}
.rm-stamp{font-size:10px;font-family:'Geist Mono',monospace;color:var(--goes-gray-350);margin-top:8px;text-align:right;}
@media print{.g-tabs{display:none !important;}.g-panel{display:block !important;}.pkg-tabs{display:none !important;}.pkg-panel{display:block !important;margin-bottom:24px !important;}}
/* AVANCES DE ACTIVIDADES */
.avances-wrap{border:1px solid var(--goes-gray-150);border-radius:14px;overflow:hidden;background:var(--white);}
.avances-table{width:100%;border-collapse:collapse;font-size:13px;}
.avances-table th{font-family:'Geist Mono',monospace;font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:var(--goes-gray-550);background:var(--goes-gray-50);padding:10px 16px;text-align:left;border-bottom:1px solid var(--goes-gray-150);font-weight:500;}
.avances-table td{padding:10px 16px;border-bottom:1px solid var(--goes-gray-150);color:var(--goes-gray-700);vertical-align:middle;}
.avances-table tr:last-child td{border-bottom:none;}
.avances-table tr:hover td{background:var(--goes-gray-50);}
.avances-pct{font-family:'Geist Mono',monospace;font-weight:600;}
.avances-del-col{width:66px;text-align:center !important;white-space:nowrap;}
.avances-del-btn{width:26px;height:26px;border-radius:7px;border:none;background:var(--goes-gray-100);color:var(--goes-gray-550);cursor:pointer;font-size:13px;display:inline-flex;align-items:center;justify-content:center;transition:background .15s,color .15s;}
.avances-edit-btn{width:26px;height:26px;border-radius:7px;border:none;background:var(--goes-gray-100);color:var(--goes-gray-550);cursor:pointer;font-size:12px;display:inline-flex;align-items:center;justify-content:center;transition:background .15s,color .15s;margin-right:4px;}
.avances-edit-btn:hover{background:var(--goes-blue-150);color:var(--goes-blue-700);}
.avances-edit-btn:disabled{opacity:.5;cursor:not-allowed;}
.avances-save-btn{background:var(--emerald-50);color:var(--emerald-700);}
.avances-save-btn:hover{background:var(--emerald-50);color:var(--emerald-700);}
.avance-inline-input{width:100%;font-family:'Geist',sans-serif;font-size:12.5px;padding:5px 7px;border:1px solid var(--goes-blue-500);border-radius:6px;color:var(--goes-gray-900);box-sizing:border-box;background:var(--white);}
.avance-inline-pct{width:64px;}
.avances-del-btn:hover{background:#FEE4E2;color:#B42318;}
.avances-reorder-col{width:52px;text-align:center !important;white-space:nowrap;}
.avances-move-btn{width:22px;height:22px;border-radius:6px;border:none;background:var(--goes-gray-100);color:var(--goes-gray-550);cursor:pointer;font-size:10px;display:inline-flex;align-items:center;justify-content:center;transition:background .15s,color .15s;}
.avances-move-btn:hover:not(:disabled){background:var(--goes-blue-150);color:var(--goes-blue-700);}
.avances-move-btn:disabled{opacity:.3;cursor:not-allowed;}
.avances-empty{padding:24px;text-align:center;color:var(--goes-gray-450);font-size:13px;}
.avances-foot{display:flex;justify-content:flex-start;gap:10px;padding:14px 16px;background:var(--goes-gray-50);border-top:1px solid var(--goes-gray-150);}
.avances-add-btn{font-family:'Geist',sans-serif;font-size:12.5px;font-weight:600;color:#fff;background:var(--goes-blue-700);border:none;border-radius:8px;padding:9px 18px;cursor:pointer;transition:background .15s;display:flex;align-items:center;gap:6px;}
.avances-add-btn:hover{background:var(--goes-blue-800);}
.avances-preview-btn{background:var(--goes-gray-550);}
.avances-preview-btn:hover{background:var(--goes-gray-700);}
.est-badge{display:inline-block;font-size:10px;font-weight:600;padding:3px 10px;border-radius:20px;letter-spacing:.02em;}
.est-pendiente{background:var(--goes-gray-150);color:var(--goes-gray-550);}
.est-proceso{background:var(--amber-50);color:var(--amber-700);}
.est-finalizado{background:var(--emerald-50);color:var(--emerald-700);}
.est-replanificado{background:var(--goes-gray-150);color:var(--goes-gray-450);}
.est-atrasado{background:#FEE4E2;color:#B42318;}
.est-na{background:var(--goes-gray-150);color:var(--goes-gray-450);}
.prio-baja{background:var(--goes-gray-150);color:var(--goes-gray-550);}
.prio-media{background:var(--goes-blue-150);color:var(--goes-blue-700);}
.prio-alta{background:var(--amber-50);color:var(--amber-700);}
.prio-critica{background:#FEE4E2;color:#B42318;}
/* Catálogo de trámites por paquete (colapsable) */
.rm-collapsible{border:1px solid var(--goes-gray-150);border-radius:14px;padding:16px 20px;background:var(--white);}
.rm-collapsible summary{cursor:pointer;list-style:none;display:flex;align-items:center;gap:10px;font-size:11px;font-family:'Geist Mono',monospace;letter-spacing:.16em;text-transform:uppercase;color:var(--goes-blue-600);user-select:none;}
.rm-collapsible summary::-webkit-details-marker{display:none;}
.rm-collapsible summary::before{content:"▼";font-size:15px;line-height:1;flex:none;}
.rm-collapsible[open] summary::before{content:"▲";}
.rm-collapsible summary::after{content:"";flex:1;height:1px;background:var(--goes-gray-150);}
.rm-collapsible-body{margin-top:16px;}
.tram-total-row{display:flex;justify-content:center;margin-bottom:16px;}
.tram-total-row .tram-count-card{flex:none;width:min(320px,100%);text-align:center;}
.tram-count-cards{display:flex;gap:12px;margin-bottom:20px;flex-wrap:wrap;}
.tram-count-card{flex:1;min-width:140px;border:1px solid var(--goes-gray-150);border-radius:10px;padding:12px 16px;background:var(--goes-gray-50);}
.tram-count-total{background:var(--goes-blue-150);border-color:var(--goes-blue-150);}
.tram-count-val{font-size:22px;font-weight:700;color:var(--goes-blue-700);}
.tram-count-lbl{font-size:11px;color:var(--goes-gray-550);margin-top:2px;}
.pkg-id-chip{font-family:'Geist Mono',monospace;font-size:10px;font-weight:600;padding:2px 8px;border-radius:6px;background:var(--goes-blue-150);color:var(--goes-blue-700);}
.tram-pkg-cards{display:flex;gap:12px;align-items:flex-start;flex-wrap:wrap;}
.tram-pkg-card{flex:1;min-width:240px;border:1px solid var(--goes-gray-150);border-radius:10px;background:var(--white);overflow:hidden;}
.tram-pkg-card-head{display:flex;align-items:center;gap:8px;padding:10px 14px;background:var(--goes-gray-50);border-bottom:1px solid var(--goes-gray-150);font-size:12.5px;font-weight:600;color:var(--goes-gray-700);}
.tram-pkg-table{width:100%;border-collapse:collapse;font-size:12.5px;}
.tram-pkg-table th{font-family:'Geist Mono',monospace;font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:var(--goes-gray-550);background:var(--goes-gray-50);padding:8px 14px;text-align:left;border-bottom:1px solid var(--goes-gray-150);font-weight:500;}
.tram-pkg-table td{padding:8px 14px;border-bottom:1px solid var(--goes-gray-150);color:var(--goes-gray-700);vertical-align:top;}
.tram-pkg-table tr:last-child td{border-bottom:none;}
.tram-pkg-no{font-family:'Geist Mono',monospace;color:var(--goes-gray-550);width:32px;}
.avances-origen-col{width:34px;text-align:center;}
.origen-badge{display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;line-height:1;border-radius:6px;font-size:11px;flex:none;overflow:hidden;}
.origen-plan{background:var(--goes-gray-150);color:var(--goes-gray-550);}
.origen-adicional{background:var(--amber-50);color:var(--amber-700);}
/* Modal agregar actividad */
.avance-field-hint{font-size:11px;color:var(--goes-gray-450);margin:-4px 0 8px;}
.avance-modal-overlay{position:fixed;inset:0;background:rgba(14,48,90,.6);backdrop-filter:blur(3px);z-index:9998;display:flex;align-items:center;justify-content:center;opacity:0;pointer-events:none;transition:opacity .2s;}
.avance-modal-overlay.open{opacity:1;pointer-events:auto;}
.avance-modal{background:var(--white);border-radius:14px;width:min(560px,92vw);max-height:88vh;display:flex;flex-direction:column;box-shadow:0 24px 64px rgba(0,0,0,.25);overflow:hidden;}
.avance-modal-head{display:flex;align-items:center;justify-content:space-between;padding:16px 22px;border-bottom:1px solid var(--goes-gray-150);background:var(--goes-blue-900);flex:none;}
.avance-modal-title{font-size:14px;font-weight:600;color:#fff;font-family:'Geist',sans-serif;}
.avance-modal-close{width:30px;height:30px;border-radius:7px;font-size:14px;color:rgba(255,255,255,.7);background:rgba(255,255,255,.12);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;font-family:'Geist',sans-serif;}
.avance-modal-close:hover{background:rgba(255,255,255,.22);color:#fff;}
.avance-modal-body{overflow-y:auto;padding:20px 22px;flex:1;}
.avance-field{margin-bottom:16px;}
.avance-field label{display:block;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:var(--goes-gray-550);margin-bottom:6px;}
.avance-field input[type=text],.avance-field input[type=date],.avance-field input[type=number],.avance-field select{width:100%;font-family:'Geist',sans-serif;font-size:13px;padding:9px 12px;border:1px solid var(--goes-gray-150);border-radius:8px;color:var(--goes-gray-900);box-sizing:border-box;}
.avance-picker-search{width:100%;font-family:'Geist',sans-serif;font-size:13px;padding:9px 12px;border:1px solid var(--goes-gray-150);border-radius:8px;box-sizing:border-box;margin-bottom:8px;}
.avance-picker-list{max-height:220px;overflow-y:auto;border:1px solid var(--goes-gray-150);border-radius:8px;}
.avance-picker-group{font-family:'Geist Mono',monospace;font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:var(--goes-gray-450);background:var(--goes-gray-50);padding:6px 12px;position:sticky;top:0;}
.avance-picker-item{padding:8px 12px;font-size:12.5px;color:var(--goes-gray-700);cursor:pointer;}
.avance-picker-item:hover{background:var(--goes-blue-150);}
.avance-picker-item.is-selected{background:var(--goes-blue-700);color:#fff;}
.avance-picker-freetext{border-top:1px solid var(--goes-gray-150);font-style:italic;color:var(--goes-blue-700);}
.avance-picker-freetext.is-selected{color:#fff;}
.avance-picker-empty{padding:14px;text-align:center;color:var(--goes-gray-450);font-size:12px;}
.avance-selected-chip{display:flex;align-items:center;gap:8px;background:var(--goes-blue-150);border-radius:8px;padding:8px 12px;font-size:12.5px;color:var(--goes-gray-900);margin-bottom:8px;}
.avance-selected-chip span:not(.origen-badge){flex:1;}
.avance-selected-chip button{border:none;background:none;color:var(--goes-blue-700);font-size:11px;font-weight:600;cursor:pointer;font-family:'Geist',sans-serif;}
.avance-modal-footer{display:flex;align-items:center;justify-content:flex-end;gap:10px;padding:14px 22px;border-top:1px solid var(--goes-gray-150);background:var(--goes-gray-50);flex:none;}
.avance-btn-cancel{font-family:'Geist',sans-serif;font-size:12.5px;font-weight:500;color:var(--goes-gray-550);background:none;border:1px solid var(--goes-gray-150);border-radius:8px;padding:9px 16px;cursor:pointer;}
.avance-btn-save{font-family:'Geist',sans-serif;font-size:12.5px;font-weight:600;color:#fff;background:var(--goes-blue-700);border:none;border-radius:8px;padding:9px 18px;cursor:pointer;}
.avance-btn-save:disabled{opacity:.5;cursor:not-allowed;}
.avance-err{color:#B42318;font-size:12px;margin-top:8px;}

/* ── Botón "Generar resumen" + modal (HTML interactivo / PDF) ────────────────── */
.roadmap-topbar{display:flex;justify-content:flex-end;margin-bottom:14px;}
.rm-btn-report{flex:none;background:var(--goes-blue-700);color:#fff;border:none;border-radius:10px;padding:10px 18px;font-size:13px;font-weight:600;font-family:'Geist',sans-serif;cursor:pointer;transition:background .15s;white-space:nowrap;}
.rm-btn-report:hover{background:var(--goes-blue-800);}
.rm-btn-secondary{background:var(--white);color:var(--goes-gray-700);border:1px solid var(--goes-gray-150);border-radius:10px;padding:10px 18px;font-size:13px;font-weight:600;font-family:'Geist',sans-serif;cursor:pointer;}
.rm-btn-secondary:hover{border-color:var(--goes-gray-350);}
.rm-modal-overlay{position:fixed;inset:0;background:rgba(11,31,58,.45);display:none;align-items:center;justify-content:center;z-index:200;padding:20px;}
.rm-modal-overlay.rm-modal-open{display:flex;}
.rm-modal{background:var(--white);border-radius:16px;max-width:440px;width:100%;box-shadow:0 20px 50px rgba(0,0,0,.25);overflow:hidden;}
.rm-modal-head{display:flex;align-items:center;justify-content:space-between;padding:18px 22px;border-bottom:1px solid var(--goes-gray-150);}
.rm-modal-title{font-size:15px;font-weight:700;color:var(--goes-gray-900);}
.rm-modal-close{background:none;border:none;font-size:16px;color:var(--goes-gray-450);cursor:pointer;line-height:1;padding:4px;}
.rm-modal-close:hover{color:var(--goes-gray-900);}
.rm-modal-body{padding:20px 22px;}
.rm-modal-foot{display:flex;justify-content:flex-end;gap:10px;padding:16px 22px;border-top:1px solid var(--goes-gray-150);}
.rm-report-options{display:flex;flex-direction:column;gap:10px;}
.rm-report-opt{display:flex;align-items:center;gap:12px;text-align:left;width:100%;border:1.5px solid var(--goes-gray-150);border-radius:12px;padding:12px 14px;background:var(--white);cursor:pointer;transition:all .15s;font-family:'Geist',sans-serif;}
.rm-report-opt:hover{border-color:var(--goes-blue-500);}
.rm-report-opt.active{border-color:var(--goes-blue-700);background:var(--goes-blue-150);}
.rm-report-opt-radio{flex:none;width:16px;height:16px;border-radius:50%;border:1.5px solid var(--goes-gray-350);position:relative;}
.rm-report-opt.active .rm-report-opt-radio{border-color:var(--goes-blue-700);}
.rm-report-opt.active .rm-report-opt-radio::after{content:"";position:absolute;inset:3px;border-radius:50%;background:var(--goes-blue-700);}
.rm-report-opt-title{font-size:13px;font-weight:600;color:var(--goes-gray-900);}
.rm-report-status{display:flex;align-items:center;gap:10px;color:var(--goes-gray-550);font-size:13px;padding:8px 0;}
.rm-spinner{width:18px;height:18px;border-radius:50%;border:2px solid var(--goes-gray-350);border-top-color:var(--goes-blue-700);animation:rm-spin .7s linear infinite;}
@keyframes rm-spin{to{transform:rotate(360deg);}}
.rm-report-error{background:#FEF2F2;border:1px solid #FECDCA;border-radius:10px;color:#B42318;font-size:13px;padding:12px 16px;}
.rm-report-ok{color:#16A34A;font-size:13px;font-weight:600;padding:8px 0;}

/* ── Carrusel del resumen (HTML interactivo exportado) ─────────────────────────
   #E4E8EC es el mismo gris de fondo de página que usa el resto del portal
   (--bg / --gg-150 en index.html, que roadmap.js no puede referenciar porque
   el resumen standalone no carga index.html) — así las tarjetas (blancas o
   var(--goes-gray-50), más claras) contrastan contra el fondo en vez de
   fundirse con él (a pedido de Darío, 2026-09-22). Toda la tipografía del
   resumen se fuerza a Nunito (cargada por Google Fonts en el <head> del HTML
   exportado) para que sea consistente en las 3 slides, incluidas las
   etiquetas que en la web app usan Geist Mono. */
.rm-report-carousel, .rm-report-carousel *,
#rm-report-print-root, #rm-report-print-root *{font-family:'Nunito',sans-serif !important;}
.rm-report-carousel{position:relative;height:100vh;background:#E4E8EC;overflow:hidden;}
.rm-slide{display:none;height:100%;}
.rm-slide.active{display:block;}
.rm-slide-inner{height:100%;box-sizing:border-box;padding:60px 28px 64px;overflow-y:auto;display:flex;align-items:flex-start;justify-content:center;}
.rm-slide-fit{width:100%;max-width:1180px;transform-origin:top center;}
/* Red de seguridad: en pantallas muy angostas, si aun así la tabla de
   avances no entra ni escalada, que sea desplazable en vez de recortarse
   sin poder verse (la tabla editable del roadmap en vivo no se toca, esto
   solo aplica dentro del resumen). Un padding de celda más chico reduce
   el ancho mínimo que la tabla necesita, así hace falta escalar menos. */
.rm-slide-fit .avances-wrap{overflow-x:auto;}
.rm-slide-fit .avances-table td, .rm-slide-fit .avances-table th{padding:8px 10px;}
.rm-slide-counter{position:fixed;top:18px;left:50%;transform:translateX(-50%);font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--goes-gray-550);background:var(--white);border:1px solid var(--goes-gray-150);border-radius:999px;padding:6px 16px;z-index:20;box-shadow:0 2px 8px rgba(0,0,0,.06);white-space:nowrap;}
.rm-slide-nav{position:fixed;top:50%;transform:translateY(-50%);width:44px;height:44px;border-radius:50%;background:var(--white);border:1px solid var(--goes-gray-150);box-shadow:0 4px 14px rgba(0,0,0,.1);cursor:pointer;font-size:20px;color:var(--goes-blue-700);display:flex;align-items:center;justify-content:center;z-index:20;}
.rm-slide-nav:hover{background:var(--goes-gray-50);}
.rm-slide-nav:disabled{opacity:.3;cursor:not-allowed;}
.rm-slide-prev{left:20px;}
.rm-slide-next{right:20px;}
.rm-slide-dots{position:fixed;bottom:20px;left:50%;transform:translateX(-50%);display:flex;gap:8px;z-index:20;}
.rm-dot{width:8px;height:8px;padding:0;border-radius:999px;background:var(--goes-gray-350);border:none;cursor:pointer;transition:width .15s,background .15s;}
.rm-dot.active{background:var(--goes-blue-700);width:22px;}

/* ── Reporte PDF: 3 slides apiladas, una por página ───────────────────────────── */
#rm-report-print-root{display:none;}
@media print{
  body > *:not(#rm-report-print-root){display:none !important;}
  html, body{height:auto !important;overflow:visible !important;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
  #rm-report-print-root{display:block !important;}
  .rm-print-slide{page-break-after:always;min-height:100vh;box-sizing:border-box;background:#E4E8EC;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
  .rm-print-slide:last-child{page-break-after:auto;}
  .rm-print-slide-label{font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:var(--goes-gray-450);padding:0 24px;margin-top:16px;}
  .rm-print-slide-inner{padding:16px 24px 24px;box-sizing:border-box;}
  @page{ size:landscape; margin:12mm; }
}
`;
  document.head.appendChild(style);

  // ── Cache persistente + revalidación silenciosa ────────────────────────────────
  // En cada carga se pinta de inmediato con el último dato bueno guardado en
  // localStorage (sin "Cargando…", sin parpadeo) y en paralelo se vuelve a
  // consultar /data/roadmap.json en segundo plano; si cambió, se re-pinta solo
  // (sin aviso). Si no hay nada guardado (primera visita / caché borrado), se
  // muestra el loading normal mientras llega la primera respuesta.
  var ROADMAP_CACHE_KEY = 'issssydt_cache_v1::roadmap.json';
  function lsGetRoadmap(){
    try { var raw = localStorage.getItem(ROADMAP_CACHE_KEY); return raw ? JSON.parse(raw) : null; }
    catch(e){ return null; }
  }
  function lsSetRoadmap(data){
    try { localStorage.setItem(ROADMAP_CACHE_KEY, JSON.stringify(data)); } catch(e){}
  }
  function fetchRoadmapNetwork(cb){
    fetch('/data/roadmap.json?v=' + Date.now())
      .then(function(r){ if(!r.ok) throw new Error('HTTP '+r.status); return r.json(); })
      .then(function(data){ cb(null, data); })
      .catch(function(e){ cb(e, null); });
  }

  // ── Fetch JSON ────────────────────────────────────────────────────────────────
  // Guardado con "if(mount)": en el resumen HTML standalone (ver RM_RENDER_
  // REPORT_FROM_DATA al final) no existe #roadmap-mount, y ese fetch+render
  // automático no debe correr ahí — el resumen se pinta con los datos ya
  // embebidos, no volviendo a pedirlos por red.
  if (mount) {
    var cachedRoadmap = lsGetRoadmap();
    if (cachedRoadmap) {
      // Diferido un tick: acá arriba todavía no corrieron los "var" de más abajo
      // (MESES_CORTO, etc.) — llamar render() en el mismo turno síncrono revienta
      // por hoisting. Un microtask alcanza y sigue siendo imperceptible.
      Promise.resolve().then(function(){ render(cachedRoadmap); });
      fetchRoadmapNetwork(function(err, fresh){
        if (err) return; // revalidación silenciosa: si falla, se queda con lo último bueno
        if (JSON.stringify(fresh) !== JSON.stringify(cachedRoadmap)) {
          lsSetRoadmap(fresh);
          render(fresh);
        }
      });
    } else {
      mount.innerHTML = '<div style="padding:32px;text-align:center;color:#7C8896;font-size:13px;font-family:Geist,sans-serif;">Cargando datos del roadmap…</div>';
      fetchRoadmapNetwork(function(err, data){
        if (err) { mount.innerHTML = '<div style="padding:24px;color:#DC2626;font-size:13px;">Error al cargar datos del roadmap: '+err.message+'</div>'; return; }
        lsSetRoadmap(data);
        render(data);
      });
    }
  }

  // ── Helpers de fecha y gantt ──────────────────────────────────────────────────
  var MESES_CORTO = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  var MESES_LARGO = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

  function parseDate(s){
    // Solo toma los primeros AAAA-MM-DD — así ignora cualquier hora/zona
    // que Google Sheets pueda agregar si reconvierte el valor a tipo Fecha
    // (p.ej. "2026-03-20T06:00:00.000Z"), y no rompe con valores vacíos.
    var m = String(s||'').match(/^(\d{4})-(\d{2})-(\d{2})/);
    return m ? new Date(+m[1], +m[2]-1, +m[3]) : null;
  }
  // Igual que parseDate pero devuelve el string AAAA-MM-DD limpio — hace
  // falta para el value= de un <input type="date">, que rechaza en
  // silencio (queda vacío) cualquier valor que no sea exactamente ese
  // formato, como pasa si Sheets guardó la fecha con hora incluida.
  function isoDateOnly(s){
    var m = String(s||'').match(/^(\d{4}-\d{2}-\d{2})/);
    return m ? m[1] : '';
  }
  function fmtShort(s){ var d=parseDate(s); return d ? (d.getDate()+' '+MESES_CORTO[d.getMonth()]) : '—'; }
  function fmtLong(s){ var d=parseDate(s); return d ? (d.getDate()+' '+MESES_CORTO[d.getMonth()]+' '+d.getFullYear()) : '—'; }

  function toPct(s, axisStart, totalDays){
    var d=parseDate(s);
    var elapsed=(d-axisStart)/86400000;
    return Math.max(0,Math.min(100,elapsed/totalDays*100));
  }

  function barStyle(ini, fin, axisStart, totalDays){
    var l=toPct(ini,axisStart,totalDays);
    var w=toPct(fin,axisStart,totalDays)-l;
    return 'left:'+l.toFixed(3)+'%;width:'+Math.max(w,0.4).toFixed(3)+'%;';
  }

  function spiColor(spi){ if(spi===null) return '#7C8896'; if(spi>=1) return '#16A34A'; if(spi>=0.80) return '#D97706'; return '#DC2626'; }

  // ── Render encabezado de meses ────────────────────────────────────────────────
  function renderMonthHead(axisStart, totalDays){
    var html='';
    // Genera etiquetas para todos los meses dentro del eje
    var d = new Date(axisStart.getFullYear(), axisStart.getMonth(), 1);
    while(true){
      var monthStart = new Date(d.getFullYear(), d.getMonth(), 1);
      var monthEnd   = new Date(d.getFullYear(), d.getMonth()+1, 0);
      var msPct = toPct(monthStart.getFullYear()+'-'+String(monthStart.getMonth()+1).padStart(2,'0')+'-01', axisStart, totalDays);
      var mePct = Math.min(100, toPct(monthEnd.getFullYear()+'-'+String(monthEnd.getMonth()+1).padStart(2,'0')+'-'+String(monthEnd.getDate()).padStart(2,'0'), axisStart, totalDays));
      if(msPct >= 100) break;
      var w = mePct - msPct;
      html += '<div class="g-month" style="left:'+msPct.toFixed(3)+'%;width:'+w.toFixed(3)+'%;">'+MESES_LARGO[d.getMonth()]+'</div>';
      d = new Date(d.getFullYear(), d.getMonth()+1, 1);
      if(d.getFullYear() > axisStart.getFullYear()+2) break;
    }
    return html;
  }

  // ── Render gridlines ──────────────────────────────────────────────────────────
  function renderGridlines(axisStart, totalDays){
    var html='<div class="g-gridlines">';
    var d = new Date(axisStart.getFullYear(), axisStart.getMonth()+1, 1);
    while(true){
      var s=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-01';
      var pct=toPct(s,axisStart,totalDays);
      if(pct>=100) break;
      html+='<div class="g-grid" style="left:'+pct.toFixed(3)+'%;"></div>';
      d=new Date(d.getFullYear(),d.getMonth()+1,1);
      if(d.getFullYear()>axisStart.getFullYear()+2) break;
    }
    return html+'</div>';
  }

  // ── Render filas de gantt ─────────────────────────────────────────────────────
  // Devuelve dos listas paralelas (misma cantidad de filas, mismas alturas):
  // "labels" (columna de tareas, fija) y "lanes" (franja de fechas, con scroll).
  function renderGanttRows(actividades, colorClass, axisStart, totalDays, progreso){
    var labels = '', lanes = '';
    actividades.forEach(function(act){
      var tipo = act.tipo||'';
      if(tipo==='hito'||tipo==='hito_final'){
        var isFinal = tipo==='hito_final';
        var pct = toPct(act.inicio, axisStart, totalDays);
        labels += '<div class="g-task-row mile'+(isFinal?' final':'')+'">'+act.actividad+'</div>';
        lanes  += '<div class="g-lane-row mile">'
          +'<div class="g-milestone '+(isFinal?'g-mile-final':colorClass)+'" style="left:'+pct.toFixed(3)+'%;">'
            +'<span class="g-mile-dot"></span>'
            +'<span class="g-mile-date">'+fmtShort(act.inicio)+'</span>'
          +'</div>'
        +'</div>';
        return;
      }
      labels += '<div class="g-task-row">'+act.actividad+'</div>';
      var st = barStyle(act.inicio, act.fin, axisStart, totalDays);
      // Cada actividad muestra su propio % de avance (columna "% Progreso Actual"):
      // franja tenue = duración planificada completa, relleno verde = avance real.
      var rawProgreso = act.progreso;
      var pctProgreso = (rawProgreso===undefined || rawProgreso===null) ? 0 : Math.max(0, Math.min(100, rawProgreso));
      var barHtml = '<div class="g-bar" style="'+st+'">'
        +'<div class="g-bar-inner">'
          +'<div class="g-bar-track '+colorClass+'"></div>'
          +'<div class="g-bar-fill" style="width:'+pctProgreso+'%;"></div>'
          +'<span class="g-bar-pct">'+pctProgreso+'%</span>'
        +'</div>'
        +'<span class="g-d g-d-ini">'+fmtShort(act.inicio)+'</span>'
        +'<span class="g-d g-d-fin">'+fmtShort(act.fin)+'</span>'
      +'</div>';
      lanes += '<div class="g-lane-row">'+barHtml+'</div>';
    });
    return { labels: labels, lanes: lanes };
  }

  // ── Render panel de gantt (un paquete) ────────────────────────────────────────
  function renderGanttPanel(pkg, axisStart, totalDays, isActive, inModal){
    var pid = 'PP'+pkg.id.replace('P','');
    var rows = renderGanttRows(pkg.gantt, pkg.color_class, axisStart, totalDays, pkg.progreso);
    return '<div class="g-panel'+(isActive?' is-active':'')+'" data-gpkg="'+pid+'">'
      +'<div class="g-body">'
        +'<div class="g-task-col">'+rows.labels+'</div>'
        +'<div class="g-lanes-scroll"><div class="g-lanes-inner">'
          +renderGridlines(axisStart, totalDays)
          +rows.lanes
        +'</div></div>'
      +'</div>'
    +'</div>';
  }

  // ── Render sección gantt completo ─────────────────────────────────────────────
  function renderGanttSection(meta, paquetes, axisStart, totalDays){
    var monthHead = renderMonthHead(axisStart, totalDays);

    var tabsHtml = paquetes.map(function(p,i){
      return '<button class="g-tab'+(i===0?' is-active':'')+'" data-gtarget="PP'+p.id.replace('P','')+'" type="button">Paquete '+p.id.replace('P','')+'</button>';
    }).join('');

    var panelsHtml = paquetes.map(function(p,i){ return renderGanttPanel(p, axisStart, totalDays, i===0, false); }).join('');

    // Modal: todos los paquetes juntos
    var modalPkgsHtml = paquetes.map(function(p,i){
      var tagClass = 'modal-tag-pp'+p.id.toLowerCase();
      var rows = renderGanttRows(p.gantt, p.color_class, axisStart, totalDays, p.progreso);
      return (i>0?'<div class="modal-pkg-separator" style="height:1px;background:var(--goes-gray-150);"></div>':'')+
        '<div class="modal-pkg-block">'
          +'<div class="modal-pkg-tag '+tagClass+'">Paquete '+p.id.replace('P','')+'</div>'
          +'<div class="g-task-col">'+rows.labels+'</div>'
          +'<div class="g-lanes-scroll"><div class="g-lanes-inner">'
            +renderGridlines(axisStart, totalDays)
            +rows.lanes
          +'</div></div>'
        +'</div>';
    }).join('');

    return '<div class="section" style="padding-top:0;">'
      +'<div class="section-h">Cronograma de actividades por paquete</div>'
      +'<div class="g-tabs">'+tabsHtml+'</div>'
      +'<div class="gantt">'
        +'<div class="g-head">'
          +'<div class="g-head-spacer"></div>'
          +'<div class="g-head-scroll"><div class="g-head-months">'+monthHead+'</div></div>'
        +'</div>'
        +'<div class="g-stack">'+panelsHtml+'</div>'
      +'</div>'
      +'<div class="note">Cronograma según plan de trabajo. La barra de <strong>Desarrollo</strong> muestra el avance real vs. planificado. Seleccioná un paquete arriba para ver su detalle.</div>'
      +'<div class="gantt-full-btn-wrap"><button class="gantt-full-btn" id="btnShowFullGantt" type="button">Ver cronograma completo</button></div>'
    +'</div>'
    // Modal
    +'<div class="gantt-modal-overlay" id="ganttModal" aria-hidden="true">'
      +'<div class="gantt-modal">'
        +'<div class="gantt-modal-head">'
          +'<span class="gantt-modal-title">Cronograma completo de actividades</span>'
          +'<button class="gantt-modal-close" id="btnCloseGantt" type="button">✕</button>'
        +'</div>'
        +'<div class="gantt-modal-body">'
          +'<div class="gantt gantt-in-modal">'
            +'<div class="g-head">'
              +'<div class="g-head-spacer"></div>'
              +'<div class="g-head-scroll"><div class="g-head-months">'+monthHead+'</div></div>'
            +'</div>'
            +'<div class="g-modal-body">'+modalPkgsHtml+'</div>'
          +'</div>'
        +'</div>'
        +'<div class="gantt-modal-footer">'
          +'<div class="gmf-format">'
            +'<label class="gmf-radio"><input type="radio" name="gmfFormat" value="png" checked> PNG (alta resolución)</label>'
            +'<label class="gmf-radio"><input type="radio" name="gmfFormat" value="pdf"> PDF</label>'
          +'</div>'
          +'<button class="gmf-save-btn" id="btnSaveGantt" type="button">Guardar</button>'
        +'</div>'
      +'</div>'
    +'</div>';
  }

  // ── Render resumen de entregas ────────────────────────────────────────────────
  // ── Catálogo de trámites por paquete ──────────────────────────────────────────
  // Listado fijo de los trámites comprometidos, agrupados por paquete
  // productivo (a pedido de Darío, 2026-09-22). Referencia: Smartsheet,
  // tarea "Desarrollo" de cada paquete. Se excluyen del listado los
  // trámites 12 (Anulación de inscripciones) y 13 (Trámite y pago de
  // subsidio) a pedido de Darío (2026-09-22).
  var TRAMITES_CATALOGO = [
    { paquete:'P1', no:1,  nombre:'Inscripción de patronos' },
    { paquete:'P2', no:2,  nombre:'Modificación en la inscripción de patronos' },
    { paquete:'P2', no:3,  nombre:'Registro de pasividad o de reanudación de labores del patrono' },
    { paquete:'P1', no:4,  nombre:'Inscripción de trabajadores' },
    { paquete:'P2', no:5,  nombre:'Modificación de información del derechohabiente' },
    { paquete:'P1', no:6,  nombre:'Inscripción de beneficiario (a) esposo (a) o compañero (a) de vida' },
    { paquete:'P1', no:7,  nombre:'Inscripción de beneficiario hijo (a) de 0 a 18 años' },
    { paquete:'P3', no:8,  nombre:'Inscripción o cambio de estatus de trabajador activo a pensionado por invalidez o vejez, pensionado por anualidad y de beneficiario a pensionado por viudez' },
    { paquete:'P2', no:9,  nombre:'Renovación de tarjetas (Patrono, niños, trabajador extranjero)' },
    { paquete:'P3', no:10, nombre:'Actualización de estatus que optan a la devolución o asignación por invalidez, viudez o vejez en seis anualidades (decreto 787)' },
    { paquete:'P1', no:11, nombre:'Constancias a trabajadores no inscritos en el ISSS' },
    { paquete:'P3', no:14, nombre:'Trámite y pago de auxilio de sepelio' },
    { paquete:'P3', no:15, nombre:'Pago por pensión por invalidez por riesgo profesional' },
    { paquete:'P3', no:16, nombre:'Pensión por muerte por riesgo profesional' },
    { paquete:'P1', no:17, nombre:'Historial de cuenta individual' },
    { paquete:'P2', no:18, nombre:'Certificado de Cesantía' },
    { paquete:'P3', no:19, nombre:'Solicitud de pago de mora con dispensa de multas y recargos' },
    { paquete:'P3', no:20, nombre:'Solicitud de pago de mora sin dispensa de multas y recargos' },
    { paquete:'P3', no:21, nombre:'Emisión de mandamiento de pago de cuotas de Convenios por mora de cotizaciones' },
    { paquete:'P3', no:22, nombre:'Solicitud de inspección por denuncia' },
    { paquete:'P2', no:23, nombre:'Solicitud notas de abono patronal' },
    { paquete:'P2', no:24, nombre:'Solicitud de devolución de cotizaciones pagadas en exceso' },
    { paquete:'P2', no:25, nombre:'Solicitud de información de instituciones públicas' },
    { paquete:'P1', no:26, nombre:'Emisión de constancias de no cotizantes' }
  ];

  function renderCatalogoTramites(paquetes, opts){
    opts = opts || {};
    var nombrePorPaquete = {};
    (paquetes||[]).forEach(function(p){ nombrePorPaquete[p.id] = p.nombre; });

    var grupos = ['P1','P2','P3'].map(function(pid){
      var items = TRAMITES_CATALOGO.filter(function(t){ return t.paquete === pid; })
        .sort(function(a,b){ return a.no - b.no; });
      return { id: pid, nombre: nombrePorPaquete[pid] || pid, items: items };
    });

    var totalCount = TRAMITES_CATALOGO.length;

    var pkgCountCards = grupos.map(function(g){
      return '<div class="tram-count-card"><div class="tram-count-val">'+g.items.length+'</div><div class="tram-count-lbl">'+g.id+' · '+escapeHtml(g.nombre)+'</div></div>';
    }).join('');

    var pkgListCards = grupos.map(function(g){
      var rows = g.items.map(function(t){
        return '<tr><td class="tram-pkg-no">'+t.no+'</td><td>'+escapeHtml(t.nombre)+'</td></tr>';
      }).join('');
      return '<div class="tram-pkg-card">'
        +'<div class="tram-pkg-card-head"><span class="pkg-id-chip">'+g.id+'</span>'+escapeHtml(g.nombre)+'</div>'
        +'<table class="tram-pkg-table">'
          +'<thead><tr><th>N°</th><th>Nombre del trámite</th></tr></thead>'
          +'<tbody>'+rows+'</tbody>'
        +'</table>'
      +'</div>';
    }).join('');

    return '<div class="section" style="padding-top:0;">'
      +'<details class="rm-collapsible"'+(opts.forceOpen?' open':'')+'>'
        +'<summary>Catálogo de trámites por paquete ('+totalCount+')</summary>'
        +'<div class="rm-collapsible-body">'
          +'<div class="tram-total-row"><div class="tram-count-card tram-count-total"><div class="tram-count-val">'+totalCount+'</div><div class="tram-count-lbl">Trámites totales</div></div></div>'
          +'<div class="tram-count-cards">'+pkgCountCards+'</div>'
          +'<div class="tram-pkg-cards">'+pkgListCards+'</div>'
        +'</div>'
      +'</details>'
    +'</div>';
  }

  function renderResumen(paquetes){
    var cards = paquetes.map(function(p){
      var actual = p.progreso || 0;
      var planif = p.progreso_planif != null ? p.progreso_planif : null;

      var badgeActual = '<span class="sum-pct-badge '+(actual > 0 ? 'pct-actual' : 'pct-actual-zero')+'"><span class="sum-pct-label">Real</span>'+actual+'%</span>';
      var badgePlanif = planif !== null
        ? '<span class="sum-pct-badge pct-planif"><span class="sum-pct-label">Plan</span>'+planif+'%</span>'
        : '';

      var progBar = '<div class="sum-prog-bar">'
        +(planif !== null ? '<div class="sum-prog-fill-planif" style="width:'+Math.min(planif,100)+'%;"></div>' : '')
        +'<div class="sum-prog-fill-actual" style="width:'+Math.min(actual,100)+'%;"></div>'
        +'</div>';

      return '<div class="sum-card">'
        +'<div class="sum-pct-wrap">'+badgeActual+badgePlanif+'</div>'
        +'<div class="sum-id">'+p.id+'</div>'
        +'<div class="sum-title">'+p.nombre+'</div>'
        +progBar
        +'<div class="sum-rel"><span>Liberación</span><strong>'+fmtLong(p.liberacion)+'</strong></div>'
      +'</div>';
    }).join('');
    return '<div class="section">'
      +'<div class="section-h">Resumen de entregas</div>'
      +'<div class="summary">'+cards+'</div>'
      +'<div class="note">Las fechas de liberación corresponden al plan de programa (ciclo completo UAT → ciberseguridad → producción). Los sprints de desarrollo se alinean al Release Plan vigente.</div>'
    +'</div>';
  }

  // ── Render hito en track ──────────────────────────────────────────────────────
  function renderHito(h){
    var tipo = h.tipo||'lib';
    var cls  = 'hito hito-'+tipo;
    var catLabel = { dev:'Desarrollo', entrega:'Entrega / Demo', uat:'Pruebas UAT', ciber:'Ciberseguridad', lib:'Liberación' };
    var catCls   = { dev:'cat-dev', entrega:'cat-entrega', uat:'cat-uat', ciber:'cat-ciber', lib:'cat-lib' };
    var fechaTxt = h.fecha_fin ? fmtShort(h.fecha)+' – '+fmtShort(h.fecha_fin) : fmtShort(h.fecha);
    return '<div class="'+cls+'">'
      +'<span class="hito-dot"></span>'
      +'<span class="hito-f">'+fechaTxt+'</span>'
      +'<span class="hito-t">'+h.titulo+'</span>'
      +'<span class="hito-cat '+(catCls[tipo]||'cat-dev')+'">'+(catLabel[tipo]||tipo)+'</span>'
    +'</div>';
  }

  // ── Render detalle por paquete ────────────────────────────────────────────────
  function renderDetalle(paquetes){
    var tabs = paquetes.map(function(p,i){
      return '<button class="pkg-tab'+(i===0?' is-active':'')+'" data-target="'+p.id+'" type="button">'
        +'<span class="tab-id">'+p.id+'</span>'
        +'<span class="tab-title">'+p.nombre+'</span>'
      +'</button>';
    }).join('');

    var panels = paquetes.map(function(p,i){
      // Sprints range label
      var sps = p.sprints; var spRange = sps.length ? fmtShort(sps[0].inicio)+' – '+fmtShort(sps[sps.length-1].fin) : '';
      var sprsHtml = sps.map(function(s){
        return '<div class="sp-row">'
          +'<span class="sp-tag">'+s.id+'</span>'
          +'<span class="sp-f">'+fmtShort(s.inicio)+' – '+fmtShort(s.fin)+'</span>'
          +'<span class="sp-d">'+s.descripcion+'</span>'
        +'</div>';
      }).join('');

      var alcHtml = p.alcance.map(function(a){ return '<li>'+a+'</li>'; }).join('');
      var hitosHtml = p.hitos.map(renderHito).join('');

      // SPI badge
      var spiHtml = '';
      if(p.spi !== null && p.spi !== undefined){
        spiHtml = '<span style="font-family:\'Geist Mono\',monospace;font-size:11px;font-weight:600;padding:2px 8px;border-radius:12px;background:'+
          (p.spi>=1?'var(--emerald-50)':p.spi>=0.8?'var(--amber-50)':'#FEF2F2')+';color:'+spiColor(p.spi)+';">SPI '+p.spi.toFixed(2)+'</span>';
      }

      var progHtml = p.progreso > 0
        ? '<span style="font-family:\'Geist Mono\',monospace;font-size:11px;font-weight:700;color:var(--goes-blue-700);"> '+p.progreso+'%</span>'
        : '';

      return '<section class="pkg pkg-panel'+(i===0?' is-active':'')+'" data-pkg="'+p.id+'">'
        +'<div class="pkg-head">'
          +'<div class="pkg-id">'+p.id+'</div>'
          +'<div class="pkg-titles">'
            +'<div class="pkg-name">Paquete '+p.id.replace('P','')+' · <span class="pkg-sub">'+p.nombre+'</span></div>'
            +'<div class="pkg-meta">'
              +'<span class="badge '+p.badge_class+'">'+p.estado+'</span>'
              +(spRange?'<span class="pkg-range">'+spRange+'</span>':'')
              +progHtml+spiHtml
            +'</div>'
          +'</div>'
          +'<div class="pkg-release">'
            +'<div class="rel-label">Liberación</div>'
            +'<div class="rel-date">'+fmtLong(p.liberacion)+'</div>'
          +'</div>'
        +'</div>'
        +'<div class="pkg-body">'
          +'<div class="col col-scope">'
            +'<div class="col-h">Alcance funcional</div>'
            +'<ul class="mod-list">'+alcHtml+'</ul>'
            +'<div class="col-h col-h-sp">Desarrollo (sprints)</div>'
            +'<div class="sp-block">'+sprsHtml+'</div>'
          +'</div>'
          +'<div class="col col-track">'
            +'<div class="col-h">Ruta a liberación</div>'
            +'<div class="track">'+hitosHtml+'</div>'
          +'</div>'
        +'</div>'
        +'<div class="pkg-foot"><span class="foot-dot"></span>'+p.pie+'</div>'
      +'</section>';
    }).join('');

    return '<div class="section" style="padding-top:0;">'
      +'<div class="section-h">Detalle por paquete</div>'
      +'<div class="pkg-tabs">'+tabs+'</div>'
      +'<div class="pkg-stack">'+panels+'</div>'
      +'<div class="legend">'
        +'<div class="lg lg-dev"><span class="d"></span>Desarrollo</div>'
        +'<div class="lg lg-entrega"><span class="d"></span>Entrega / Demo</div>'
        +'<div class="lg lg-uat"><span class="d"></span>Pruebas UAT</div>'
        +'<div class="lg lg-ciber"><span class="d"></span>Ciberseguridad</div>'
        +'<div class="lg lg-lib"><span class="d"></span>Liberación</div>'
      +'</div>'
    +'</div>';
  }

  // ── Render capa transversal ───────────────────────────────────────────────────
  function renderTransversal(items){
    var rows = items.map(function(t){
      return '<div class="tr-row">'
        +'<span class="tr-name">'+t.nombre+'</span>'
        +'<span class="tr-range">'+t.rango+'</span>'
        +'<span class="badge '+t.badge_class+'">'+t.estado+'</span>'
      +'</div>';
    }).join('');
    return '<div class="section" style="padding-top:0;">'
      +'<div class="section-h">Capa transversal — Landing, Dashboard y Plataforma</div>'
      +'<div class="trans">'+rows+'</div>'
      +'<div class="note">Habilitadores que dan soporte a los tres paquetes: catálogo de trámites, autenticación SSO, gestión de secretos, integración RNPN y landing.</div>'
    +'</div>';
  }

  // ── Render meta bar ───────────────────────────────────────────────────────────
  function renderMetaBar(meta){
    var spiHtml = meta.spi_global !== undefined && meta.spi_global !== null
      ? '<div class="rmb-item"><span class="rmb-k">SPI Global</span><span class="rmb-v" style="color:'+spiColor(meta.spi_global)+';">'+meta.spi_global.toFixed(2)+'</span></div>'
      : '';
    var progHtml = meta.progreso_global !== undefined && meta.progreso_global !== null
      ? '<div class="rmb-item"><span class="rmb-k">Avance global</span><span class="rmb-v">'+meta.progreso_global+'%'
          +(meta.progreso_planif != null ? '<small style="font-weight:400;color:rgba(255,255,255,.5);font-size:12px;margin-left:6px;">/ '+meta.progreso_planif+'% plan</small>' : '')
        +'</span></div>'
      : '';
    return '<div class="roadmap-meta-bar">'
      +'<div class="rmb-item"><span class="rmb-k">Horizonte</span><span class="rmb-v">'+meta.horizonte+'</span></div>'
      +'<div class="rmb-item"><span class="rmb-k">Paquetes</span><span class="rmb-v">'+meta.paquetes_count+' productivos</span></div>'
      +'<div class="rmb-item"><span class="rmb-k">Metodología</span><span class="rmb-v">'+meta.metodologia+'</span></div>'
      +progHtml+spiHtml
      +'<div class="rmb-item"><span class="rmb-k">Liberación final</span><span class="rmb-v">'+fmtLong(meta.liberacion_final)+'</span></div>'
    +'</div>';
  }

  // ── Avances de actividades ────────────────────────────────────────────────────
  // Tabla de seguimiento manual (Actividad / Responsable / Prioridad / Fecha
  // planeada / Estatus / % avance). La descripción SOLO puede elegirse de un catálogo —
  // TODAS las líneas de la columna "Proyecto" del plan de trabajo
  // (Digitalización Trámites ISSS), en su mismo orden y con su mismo nivel
  // de sangría (agrupación de filas de Excel) — nunca se escribe libre.
  // El catálogo vive en /data/plan_actividades.json (generado desde el xlsx;
  // no se lee el xlsx desde el navegador). Fecha/Asignado a/% de avance se
  // autocompletan de ahí (columnas K/M/H) y quedan editables; el Estatus
  // siempre es manual. Las filas guardadas viven en la hoja
  // "avances_actividades" del mismo Apps Script que ya usa Seguimiento
  // (lectura vía ?sheet=, escritura vía doPost).
  var ESTADOS_AVANCE = ['Pendiente','En Proceso','Finalizado','Replanificado','Atrasado','N/A'];
  var PRIORIDAD_AVANCE = ['Baja','Media','Alta','Crítica'];
  var PRIORIDAD_DEFAULT = 'Media';
  var _avancesRows = [];
  var _avancesCatalogo = [];
  var _avancePickerSel = null;

  function escapeHtml(s){
    return String(s==null?'':s).replace(/[&<>"']/g, function(c){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
  }

  function estadoBadgeClass(estado){
    var key = String(estado||'').toLowerCase();
    if(key==='en proceso') return 'est-proceso';
    if(key==='finalizado') return 'est-finalizado';
    if(key==='replanificado') return 'est-replanificado';
    if(key==='atrasado') return 'est-atrasado';
    if(key==='n/a') return 'est-na';
    return 'est-pendiente';
  }

  // Filas guardadas antes de este campo no traen "prioridad" — se tratan
  // como Media por compatibilidad (mismo default que usa el formulario).
  function prioridadBadgeClass(prioridad){
    var key = String(prioridad||'').toLowerCase();
    if(key==='crítica' || key==='critica') return 'prio-critica';
    if(key==='alta') return 'prio-alta';
    if(key==='baja') return 'prio-baja';
    return 'prio-media';
  }

  // Filas viejas (guardadas antes de este campo) no traen "origen" — se
  // tratan como 'plan' por compatibilidad, ya que antes TODA actividad
  // venía forzosamente del catálogo.
  function origenBadge(origen){
    var esPlan = origen !== 'adicional';
    return '<span class="origen-badge '+(esPlan?'origen-plan':'origen-adicional')+'" title="'+(esPlan?'Del plan de trabajo':'Actividad adicional, no estaba en el plan')+'">'+(esPlan?'📋':'➕')+'</span>';
  }

  // Orden manual: cada fila guarda un "orden" numérico (columna nueva en la
  // hoja). Filas sin orden todavía (viejas, o recién cargadas antes de mover
  // algo) usan su posición de llegada como orden implícito — así una lista
  // que nunca se reordenó mantiene el orden de creación de siempre.
  function getSortedAvances(){
    return _avancesRows.map(function(r, i){ r.__idx = i; return r; }).slice().sort(function(a,b){
      var ao = parseFloat(a.orden); if(isNaN(ao)) ao = a.__idx;
      var bo = parseFloat(b.orden); if(isNaN(bo)) bo = b.__idx;
      return ao - bo;
    });
  }

  function moveAvance(id, dir){
    var sorted = getSortedAvances();
    var idx = -1;
    for(var i=0;i<sorted.length;i++){ if(sorted[i].id===id){ idx=i; break; } }
    if(idx<0) return;
    var swapIdx = dir==='up' ? idx-1 : idx+1;
    if(swapIdx<0 || swapIdx>=sorted.length) return;
    var tmp = sorted[idx]; sorted[idx] = sorted[swapIdx]; sorted[swapIdx] = tmp;
    sorted.forEach(function(r, i){ r.orden = i; });
    refreshAvancesTable();
    var idsCsv = sorted.map(function(r){ return r.id; }).join(',');
    postAvances({ action:'reorder_avances', ids: idsCsv }, function(err){
      if(err) alert('No se pudo guardar el nuevo orden: '+err);
    });
  }

  var _avanceEditingId = null;

  function renderAvancesRows(rows){
    if(!rows.length) return '<tr><td colspan="9" class="avances-empty">Sin actividades agregadas todavía. Usá "Agregar actividad" abajo.</td></tr>';
    return rows.map(function(r, i){
      var pct = parseInt(r.pct_avance)||0;
      var upDisabled = i===0 ? 'disabled' : '';
      var downDisabled = i===rows.length-1 ? 'disabled' : '';
      var editing = (_avanceEditingId === r.id);

      var fechaCell, asignadoCell, prioridadCell, estatusCell, pctCell, accionesCell;
      if(editing){
        fechaCell = '<input type="date" class="avance-inline-input" id="edit-fecha-'+escapeHtml(r.id)+'" value="'+escapeHtml(isoDateOnly(r.fecha_planeada))+'">';
        asignadoCell = '<input type="text" class="avance-inline-input" id="edit-asignado-'+escapeHtml(r.id)+'" value="'+escapeHtml(r.asignado_a||'')+'">';
        prioridadCell = '<select class="avance-inline-input" id="edit-prioridad-'+escapeHtml(r.id)+'">'
          + PRIORIDAD_AVANCE.map(function(c){ return '<option value="'+c+'"'+(c===(r.prioridad||PRIORIDAD_DEFAULT)?' selected':'')+'>'+c+'</option>'; }).join('')
          + '</select>';
        estatusCell = '<select class="avance-inline-input" id="edit-estatus-'+escapeHtml(r.id)+'">'
          + ESTADOS_AVANCE.map(function(e){ return '<option value="'+e+'"'+(e===(r.estatus||'Pendiente')?' selected':'')+'>'+e+'</option>'; }).join('')
          + '</select>';
        pctCell = '<input type="number" class="avance-inline-input avance-inline-pct" id="edit-pct-'+escapeHtml(r.id)+'" min="0" max="100" value="'+pct+'">';
        accionesCell = '<button class="avances-edit-btn avances-save-btn" type="button" data-save-id="'+escapeHtml(r.id)+'" title="Guardar cambios">✓</button>'
          +'<button class="avances-edit-btn" type="button" data-cancel-id="'+escapeHtml(r.id)+'" title="Cancelar">✕</button>';
      } else {
        fechaCell = fmtLong(r.fecha_planeada);
        asignadoCell = escapeHtml(r.asignado_a);
        prioridadCell = '<span class="est-badge '+prioridadBadgeClass(r.prioridad)+'">'+escapeHtml(r.prioridad||PRIORIDAD_DEFAULT)+'</span>';
        estatusCell = '<span class="est-badge '+estadoBadgeClass(r.estatus)+'">'+escapeHtml(r.estatus||'Pendiente')+'</span>';
        pctCell = pct+'%';
        accionesCell = '<button class="avances-edit-btn" type="button" data-edit-id="'+escapeHtml(r.id)+'" title="Editar">✎</button>'
          +'<button class="avances-edit-btn avances-del-btn" type="button" data-del-id="'+escapeHtml(r.id)+'" title="Eliminar">✕</button>';
      }

      // Orden de columnas: Actividades, Responsables, Prioridad, Fecha,
      // Estatus, % de avance (a pedido de Darío, 2026-09-22) — reorder y
      // origen quedan al inicio, acciones al final, sin cambios.
      return '<tr data-avance-id="'+escapeHtml(r.id)+'">'
        +'<td class="avances-reorder-col">'
          +'<button class="avances-move-btn" type="button" data-move="up" data-id="'+escapeHtml(r.id)+'" '+upDisabled+' title="Subir">▲</button>'
          +'<button class="avances-move-btn" type="button" data-move="down" data-id="'+escapeHtml(r.id)+'" '+downDisabled+' title="Bajar">▼</button>'
        +'</td>'
        +'<td class="avances-origen-col">'+origenBadge(r.origen)+'</td>'
        +'<td>'+escapeHtml(r.actividad)+'</td>'
        +'<td>'+asignadoCell+'</td>'
        +'<td>'+prioridadCell+'</td>'
        +'<td class="mono" style="font-family:\'Geist Mono\',monospace;font-size:12px;color:var(--goes-gray-550);">'+fechaCell+'</td>'
        +'<td>'+estatusCell+'</td>'
        +'<td class="avances-pct">'+pctCell+'</td>'
        +'<td class="avances-del-col">'+accionesCell+'</td>'
        +'</tr>';
    }).join('');
  }

  function renderAvancesSection(){
    return '<div class="section" style="padding-top:0;">'
      +'<div class="section-h">Avances de actividades</div>'
      +'<div class="avances-wrap">'
        +'<table class="avances-table">'
          +'<thead><tr><th></th><th title="Origen de la actividad"></th><th>Actividades</th><th>Responsables</th><th>Prioridad</th><th>Fecha</th><th>Estatus</th><th>% de avance</th><th></th></tr></thead>'
          +'<tbody id="avancesTbody"><tr><td colspan="9" class="avances-empty">Cargando…</td></tr></tbody>'
        +'</table>'
        +'<div class="avances-foot">'
          +'<button class="avances-add-btn" id="btnAddAvance" type="button">+ Agregar actividad</button>'
          +'<button class="avances-add-btn avances-preview-btn" id="btnPreviewAvances" type="button">Vista previa (PNG)</button>'
        +'</div>'
      +'</div>'
      +'<div class="note">Seguimiento manual de hitos clave del plan de trabajo. La descripción puede elegirse del catálogo de actividades del cronograma (📋) o escribirse como actividad adicional cuando no está en el plan (➕). Usá las flechas ▲▼ para reordenar filas y ✎ para editar Fecha/Asignado a/Estatus/% de avance de una fila ya guardada.</div>'
    +'</div>'
    // Modal de vista previa / descarga de imagen
    +'<div class="avance-modal-overlay" id="avanceExportModal" aria-hidden="true">'
      +'<div class="avance-modal" style="width:min(880px,92vw);">'
        +'<div class="avance-modal-head">'
          +'<span class="avance-modal-title">Vista previa — Avances de actividades</span>'
          +'<button class="avance-modal-close" id="btnCloseAvanceExport" type="button">✕</button>'
        +'</div>'
        +'<div class="avance-modal-body" style="text-align:center;background:var(--goes-gray-50);">'
          +'<div id="avanceExportStatus" style="padding:40px;color:var(--goes-gray-450);font-size:13px;">Generando imagen…</div>'
          +'<img id="avanceExportImg" style="max-width:100%;display:none;border:1px solid var(--goes-gray-150);border-radius:8px;">'
        +'</div>'
        +'<div class="avance-modal-footer">'
          +'<button class="avance-btn-cancel" id="btnCancelAvanceExport" type="button">Cerrar</button>'
          +'<button class="avance-btn-save" id="btnDownloadAvanceExport" type="button" disabled>Descargar PNG</button>'
        +'</div>'
      +'</div>'
    +'</div>'
    // Modal
    +'<div class="avance-modal-overlay" id="avanceModal" aria-hidden="true">'
      +'<div class="avance-modal">'
        +'<div class="avance-modal-head">'
          +'<span class="avance-modal-title">Agregar actividad</span>'
          +'<button class="avance-modal-close" id="btnCloseAvance" type="button">✕</button>'
        +'</div>'
        +'<div class="avance-modal-body">'
          +'<div class="avance-field">'
            +'<label>Actividad</label>'
            +'<div class="avance-field-hint">Elegí una sugerencia del plan o escribí una actividad adicional.</div>'
            +'<div id="avanceSelectedChip"></div>'
            +'<input type="text" class="avance-picker-search" id="avancePickerSearch" placeholder="Escribí para buscar…">'
            +'<div class="avance-picker-list" id="avancePickerList"></div>'
          +'</div>'
          +'<div class="avance-field"><label>Fecha planeada <span style="font-weight:400;text-transform:none;color:var(--goes-gray-450);">— se completa del plan, editable</span></label><input type="date" id="avanceFecha"></div>'
          +'<div class="avance-field"><label>Asignado a <span style="font-weight:400;text-transform:none;color:var(--goes-gray-450);">— se completa del plan, editable</span></label><input type="text" id="avanceAsignado" placeholder="Ej. ISSS/GOES/TCA"></div>'
          +'<div class="avance-field"><label>Prioridad</label><select id="avancePrioridad">'
            +PRIORIDAD_AVANCE.map(function(c){ return '<option value="'+c+'"'+(c===PRIORIDAD_DEFAULT?' selected':'')+'>'+c+'</option>'; }).join('')
          +'</select></div>'
          +'<div class="avance-field"><label>Estatus</label><select id="avanceEstatus">'
            +ESTADOS_AVANCE.map(function(e){ return '<option value="'+e+'">'+e+'</option>'; }).join('')
          +'</select></div>'
          +'<div class="avance-field"><label>% de avance <span style="font-weight:400;text-transform:none;color:var(--goes-gray-450);">— se completa del plan, editable</span></label><input type="number" id="avancePct" min="0" max="100" value="0"></div>'
          +'<div class="avance-err" id="avanceErr" style="display:none;"></div>'
        +'</div>'
        +'<div class="avance-modal-footer">'
          +'<button class="avance-btn-cancel" id="btnCancelAvance" type="button">Cancelar</button>'
          +'<button class="avance-btn-save" id="btnSaveAvance" type="button" disabled>Guardar</button>'
        +'</div>'
      +'</div>'
    +'</div>';
  }

  function renderPickerList(filterText){
    var f = String(filterText||'').trim().toLowerCase();
    var htmlRows = [];
    var hayCoincidenciaExacta = false;
    _avancesCatalogo.forEach(function(it, idx){
      if(f && it.actividad.toLowerCase().indexOf(f)===-1) return;
      if(f && it.actividad.toLowerCase()===f) hayCoincidenciaExacta = true;
      var sel = _avancePickerSel && _avancePickerSel.idx===idx;
      var pad = 12 + Math.min(it.level||0, 6)*16;
      htmlRows.push('<div class="avance-picker-item'+(sel?' is-selected':'')+'" style="padding-left:'+pad+'px;" data-idx="'+idx+'">'+escapeHtml(it.actividad)+'</div>');
    });
    // Texto que no coincide exacto con ninguna fila del catálogo: se ofrece
    // como actividad adicional, seleccionable igual que una fila normal.
    var textoOriginal = String(filterText||'').trim();
    if(textoOriginal && !hayCoincidenciaExacta){
      var sel = _avancePickerSel && _avancePickerSel.idx===-1;
      htmlRows.push('<div class="avance-picker-item avance-picker-freetext'+(sel?' is-selected':'')+'" data-idx="-1">➕ Agregar "'+escapeHtml(textoOriginal)+'" como actividad adicional</div>');
    }
    if(!htmlRows.length) return '<div class="avance-picker-empty">Sin coincidencias.</div>';
    return htmlRows.join('');
  }

  function refreshSelectedChip(){
    var chip = document.getElementById('avanceSelectedChip');
    var btnSave = document.getElementById('btnSaveAvance');
    if(!chip) return;
    if(_avancePickerSel){
      chip.innerHTML = '<div class="avance-selected-chip">'+origenBadge(_avancePickerSel.origen)+'<span>'+escapeHtml(_avancePickerSel.actividad)+'</span><button type="button" id="btnClearAvancePick">Cambiar</button></div>';
      var clearBtn = document.getElementById('btnClearAvancePick');
      if(clearBtn) clearBtn.addEventListener('click', function(){ _avancePickerSel=null; refreshSelectedChip(); document.getElementById('avancePickerList').innerHTML = renderPickerList(document.getElementById('avancePickerSearch').value); });
    } else {
      chip.innerHTML = '';
    }
    if(btnSave) btnSave.disabled = !_avancePickerSel;
  }

  function openAvanceModal(){
    var overlay = document.getElementById('avanceModal');
    if(!overlay) return;
    _avancePickerSel = null;
    document.getElementById('avancePickerSearch').value = '';
    document.getElementById('avancePickerList').innerHTML = renderPickerList('');
    document.getElementById('avanceFecha').value = '';
    document.getElementById('avanceAsignado').value = '';
    document.getElementById('avancePrioridad').value = PRIORIDAD_DEFAULT;
    document.getElementById('avanceEstatus').value = 'Pendiente';
    document.getElementById('avancePct').value = 0;
    document.getElementById('avanceErr').style.display = 'none';
    refreshSelectedChip();
    overlay.classList.add('open');
    overlay.setAttribute('aria-hidden','false');
  }

  function closeAvanceModal(){
    var overlay = document.getElementById('avanceModal');
    if(!overlay) return;
    overlay.classList.remove('open');
    overlay.setAttribute('aria-hidden','true');
  }

  function postAvances(payload, cb){
    // Los Web Apps de Apps Script responden con un 302 a script.googleusercontent.com
    // tanto en GET como en POST. Al seguir esa redirección, un POST puede convertirse
    // en GET y perder el body (esto es lo que causaba "Failed to fetch" al guardar).
    // Como el camino GET (?sheet=...) ya es confiable en todo el portal, mandamos
    // también add/delete como GET con los datos en query params.
    if(!SH){ cb('URL no configurada en datos.js'); return; }
    var qs = Object.keys(payload).map(function(k){
      return encodeURIComponent(k)+'='+encodeURIComponent(payload[k]==null ? '' : payload[k]);
    }).join('&');
    fetch(SH + '?' + qs)
      .then(function(r){ return r.json(); })
      .then(function(d){
        // Cualquier respuesta con "error" (o ok:false explícito) es una falla —
        // antes solo se detectaba ok===false, así que una respuesta de error
        // "genérica" (como la que devuelve doGet cuando no reconoce la acción)
        // se trataba como éxito silenciosamente.
        if(!d || d.ok===false || d.error){ cb((d&&d.error)||'Error desconocido'); return; }
        cb(null, d);
      })
      .catch(function(e){ cb('Error de red: '+e.message); });
  }

  function refreshAvancesTable(){
    var tbody = document.getElementById('avancesTbody');
    if(tbody) tbody.innerHTML = renderAvancesRows(getSortedAvances());
  }

  function wireAvancesUI(){
    var btnAdd = document.getElementById('btnAddAvance');
    var btnClose = document.getElementById('btnCloseAvance');
    var btnCancel = document.getElementById('btnCancelAvance');
    var overlay = document.getElementById('avanceModal');
    var search = document.getElementById('avancePickerSearch');
    var list = document.getElementById('avancePickerList');
    var btnSave = document.getElementById('btnSaveAvance');

    if(btnAdd) btnAdd.addEventListener('click', openAvanceModal);
    if(btnClose) btnClose.addEventListener('click', closeAvanceModal);
    if(btnCancel) btnCancel.addEventListener('click', closeAvanceModal);
    if(overlay) overlay.addEventListener('click', function(e){ if(e.target===overlay) closeAvanceModal(); });

    // Actividad adicional (texto libre) — no viene del catálogo, así que no
    // hay Fecha/Asignado/%avance que autocompletar. Se usa tanto al hacer
    // clic en la fila "+ Agregar…" como al presionar Enter en el buscador.
    function seleccionarTextoLibre(texto){
      texto = String(texto||'').trim();
      if(!texto) return;
      _avancePickerSel = { idx: -1, actividad: texto, origen: 'adicional' };
      refreshSelectedChip();
      list.innerHTML = renderPickerList(search.value);
    }

    if(search) search.addEventListener('input', function(){ list.innerHTML = renderPickerList(search.value); });
    if(search) search.addEventListener('keydown', function(e){
      if(e.key !== 'Enter') return;
      e.preventDefault();
      var texto = search.value.trim();
      if(!texto) return;
      // Si el texto coincide exacto con una fila del catálogo, Enter no hace
      // nada especial — esa fila se elige haciendo clic, igual que siempre.
      var coincidenciaExacta = _avancesCatalogo.some(function(it){ return it.actividad.toLowerCase()===texto.toLowerCase(); });
      if(coincidenciaExacta) return;
      seleccionarTextoLibre(texto);
    });
    if(list) list.addEventListener('click', function(e){
      var el = e.target.closest('.avance-picker-item');
      if(!el) return;
      var idx = parseInt(el.getAttribute('data-idx'), 10);
      if(idx===-1){
        seleccionarTextoLibre(search.value);
        return;
      }
      var it = _avancesCatalogo[idx];
      if(!it) return;
      _avancePickerSel = { idx: idx, actividad: it.actividad, origen: 'plan' };
      // Autocompleta desde el plan (Fecha fin=col K, Responsable=col M,
      // % Progreso=col H) — quedan editables por si hace falta ajustarlas.
      document.getElementById('avanceFecha').value = it.fin || '';
      document.getElementById('avanceAsignado').value = it.responsable || '';
      document.getElementById('avancePct').value = (it.progreso===null || it.progreso===undefined) ? 0 : it.progreso;
      refreshSelectedChip();
      list.innerHTML = renderPickerList(search.value);
    });

    if(btnSave) btnSave.addEventListener('click', function(){
      if(!_avancePickerSel) return;
      var errEl = document.getElementById('avanceErr');
      errEl.style.display = 'none';
      var fechaVal = document.getElementById('avanceFecha').value;
      if(fechaVal && !/^\d{4}-\d{2}-\d{2}$/.test(fechaVal)){
        errEl.textContent = 'La fecha no tiene un formato válido. Usá el selector de calendario o completá día, mes y año.';
        errEl.style.display = 'block';
        return;
      }
      var payload = {
        action: 'add_avance',
        actividad: _avancePickerSel.actividad,
        origen: _avancePickerSel.origen || 'plan',
        fecha_planeada: fechaVal,
        asignado_a: document.getElementById('avanceAsignado').value,
        prioridad: document.getElementById('avancePrioridad').value || PRIORIDAD_DEFAULT,
        estatus: document.getElementById('avanceEstatus').value,
        pct_avance: parseInt(document.getElementById('avancePct').value)||0
      };
      btnSave.disabled = true; btnSave.textContent = 'Guardando…';
      postAvances(payload, function(err, res){
        btnSave.disabled = false; btnSave.textContent = 'Guardar';
        if(err){ errEl.textContent = err; errEl.style.display = 'block'; return; }
        payload.id = res.id;
        delete payload.action;
        _avancesRows.push(payload);
        refreshAvancesTable();
        closeAvanceModal();
      });
    });

    var tbody = document.getElementById('avancesTbody');
    if(tbody) tbody.addEventListener('click', function(e){
      var moveBtn = e.target.closest('.avances-move-btn');
      if(moveBtn){
        if(moveBtn.disabled) return;
        moveAvance(moveBtn.getAttribute('data-id'), moveBtn.getAttribute('data-move'));
        return;
      }

      var editBtn = e.target.closest('[data-edit-id]');
      if(editBtn){
        _avanceEditingId = editBtn.getAttribute('data-edit-id');
        refreshAvancesTable();
        return;
      }
      var cancelBtn = e.target.closest('[data-cancel-id]');
      if(cancelBtn){
        _avanceEditingId = null;
        refreshAvancesTable();
        return;
      }
      var saveBtn = e.target.closest('[data-save-id]');
      if(saveBtn){
        var editId = saveBtn.getAttribute('data-save-id');
        var row = _avancesRows.filter(function(r){ return r.id===editId; })[0];
        if(!row) return;
        var fechaEl = document.getElementById('edit-fecha-'+editId);
        var fechaVal = fechaEl.value;
        if(fechaVal && !/^\d{4}-\d{2}-\d{2}$/.test(fechaVal)){
          alert('La fecha no tiene un formato válido. Usá el selector de calendario o completá día, mes y año.');
          return;
        }
        var updated = {
          id: editId,
          fecha_planeada: fechaVal,
          asignado_a: document.getElementById('edit-asignado-'+editId).value,
          prioridad: document.getElementById('edit-prioridad-'+editId).value || PRIORIDAD_DEFAULT,
          estatus: document.getElementById('edit-estatus-'+editId).value,
          pct_avance: parseInt(document.getElementById('edit-pct-'+editId).value)||0
        };
        saveBtn.disabled = true;
        postAvances({
          action: 'update_avance',
          id: updated.id,
          fecha_planeada: updated.fecha_planeada,
          asignado_a: updated.asignado_a,
          prioridad: updated.prioridad,
          estatus: updated.estatus,
          pct_avance: updated.pct_avance
        }, function(err){
          saveBtn.disabled = false;
          if(err){ alert('No se pudieron guardar los cambios: '+err); return; }
          row.fecha_planeada = updated.fecha_planeada;
          row.asignado_a = updated.asignado_a;
          row.prioridad = updated.prioridad;
          row.estatus = updated.estatus;
          row.pct_avance = updated.pct_avance;
          _avanceEditingId = null;
          refreshAvancesTable();
        });
        return;
      }

      var btn = e.target.closest('.avances-del-btn');
      if(!btn) return;
      var id = btn.getAttribute('data-del-id');
      if(!confirm('¿Eliminar esta actividad del seguimiento?')) return;
      btn.disabled = true;
      postAvances({ action:'delete_avance', id:id }, function(err){
        if(err){ alert('No se pudo eliminar: '+err); btn.disabled = false; return; }
        _avancesRows = _avancesRows.filter(function(r){ return r.id!==id; });
        refreshAvancesTable();
      });
    });
  }

  function initAvances(){
    wireAvancesUI();
    wireAvancesExport();
    fetch('/data/plan_actividades.json?v='+Date.now())
      .then(function(r){ return r.json(); })
      .then(function(d){ _avancesCatalogo = d || []; })
      .catch(function(){ _avancesCatalogo = []; });
    if(!SH){ refreshAvancesTable(); return; }
    fetch(SH+'?sheet=avances_actividades')
      .then(function(r){ return r.json(); })
      .then(function(d){
        _avancesRows = (d && d.rows) ? d.rows : [];
        refreshAvancesTable();
      })
      .catch(function(){
        _avancesRows = [];
        refreshAvancesTable();
      });
  }

  // ── Exportar "Avances de actividades" como PNG 4K (3840×2160, 16:9) ──────────
  // Misma resolución que ya usa la exportación del cronograma — pensada para
  // usarse en una presentación sin perder nitidez. Misma idea que esa
  // exportación: se construye una copia limpia (sin los botones de
  // reordenar/editar/eliminar) fuera de pantalla, se escala para que el ancho
  // quede en proporción 16:9 respecto a su alto natural, se captura con
  // html2canvas y por las dudas se redibuja sobre un canvas del tamaño exacto
  // para garantizar el tamaño final sin importar pequeñas diferencias de medición.
  var AVANCES_EXPORT_W = 3840;
  var AVANCES_EXPORT_H = 2160;
  var AVANCES_EXPORT_PADDING = 36;

  function ensureHtml2Canvas(cb){
    loadScriptOnce('https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js', function(){ return !!window.html2canvas; }, cb);
  }

  function buildAvancesExportClone(){
    var wrap = document.createElement('div');
    wrap.style.position = 'fixed';
    wrap.style.left = '0';
    wrap.style.top = '0';
    wrap.style.zIndex = '-1';
    wrap.style.background = '#ffffff';
    wrap.style.padding = AVANCES_EXPORT_PADDING+'px';
    wrap.style.fontFamily = "'Geist',sans-serif";
    wrap.style.boxSizing = 'border-box';
    wrap.style.width = 'max-content';

    var title = document.createElement('div');
    title.textContent = 'Avances de actividades — Digitalización de Trámites ISSS';
    title.style.cssText = 'font-size:20px;font-weight:700;color:#0B1F3A;margin-bottom:18px;white-space:nowrap;';
    wrap.appendChild(title);

    var rows = getSortedAvances();
    var rowsHtml = rows.length ? rows.map(function(r){
      var pct = parseInt(r.pct_avance)||0;
      return '<tr>'
        +'<td class="avances-origen-col">'+origenBadge(r.origen)+'</td>'
        +'<td>'+escapeHtml(r.actividad)+'</td>'
        +'<td>'+escapeHtml(r.asignado_a)+'</td>'
        +'<td><span class="est-badge '+prioridadBadgeClass(r.prioridad)+'">'+escapeHtml(r.prioridad||PRIORIDAD_DEFAULT)+'</span></td>'
        +'<td class="mono" style="font-family:\'Geist Mono\',monospace;color:var(--goes-gray-550);">'+fmtLong(r.fecha_planeada)+'</td>'
        +'<td><span class="est-badge '+estadoBadgeClass(r.estatus)+'">'+escapeHtml(r.estatus||'Pendiente')+'</span></td>'
        +'<td class="avances-pct">'+pct+'%</td>'
        +'</tr>';
    }).join('') : '<tr><td colspan="7" class="avances-empty">Sin actividades agregadas todavía.</td></tr>';

    var tableWrap = document.createElement('div');
    tableWrap.className = 'avances-wrap';
    tableWrap.style.width = 'max-content';
    tableWrap.innerHTML = '<table class="avances-table" style="font-size:17px;">'
      +'<thead><tr><th></th><th>Actividades</th><th>Responsables</th><th>Prioridad</th><th>Fecha</th><th>Estatus</th><th>% de avance</th></tr></thead>'
      +'<tbody>'+rowsHtml+'</tbody></table>';
    wrap.appendChild(tableWrap);

    document.body.appendChild(wrap);

    // Alto natural (a lo ancho que el contenido pida por sí solo) — a partir de
    // ahí se calcula el ancho necesario para que la proporción quede en 16:9.
    var naturalHeight = wrap.getBoundingClientRect().height;
    var neededWidth = naturalHeight * (AVANCES_EXPORT_W / AVANCES_EXPORT_H);
    wrap.style.width = neededWidth+'px';
    tableWrap.style.width = '100%';

    // Ensanchar puede achicar un poco el alto (texto que ya no necesita ajustarse
    // en varias líneas) — se remide una vez más para afinar el ancho final.
    var finalHeight = wrap.getBoundingClientRect().height;
    var finalWidth = finalHeight * (AVANCES_EXPORT_W / AVANCES_EXPORT_H);
    wrap.style.width = finalWidth+'px';

    var scale = AVANCES_EXPORT_W / finalWidth;
    return { wrap: wrap, scale: scale };
  }

  function captureAvancesCanvas(then){
    var built = buildAvancesExportClone();
    var wrap = built.wrap;
    // setTimeout en vez de requestAnimationFrame: alcanza para que el navegador
    // aplique el layout del clon antes de capturarlo, sin depender de que la
    // pestaña esté "componiendo" frames activamente (rAF puede no disparar
    // nunca en una pestaña en segundo plano o sin foco).
    setTimeout(function(){
      setTimeout(function(){
        window.html2canvas(wrap, { scale: built.scale, backgroundColor: '#ffffff' }).then(function(canvas){
          document.body.removeChild(wrap);
          // Se redibuja sobre un canvas de tamaño exacto 3840×2160 — cualquier
          // pequeño desvío de medición queda absorbido acá, sin depender de que
          // html2canvas haya redondeado al pixel exacto.
          var finalCanvas = document.createElement('canvas');
          finalCanvas.width = AVANCES_EXPORT_W;
          finalCanvas.height = AVANCES_EXPORT_H;
          var ctx = finalCanvas.getContext('2d');
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, AVANCES_EXPORT_W, AVANCES_EXPORT_H);
          ctx.drawImage(canvas, 0, 0, AVANCES_EXPORT_W, AVANCES_EXPORT_H);
          then(null, finalCanvas);
        }).catch(function(err){
          document.body.removeChild(wrap);
          then(err);
        });
      });
    });
  }

  function avancesExportFilename(){
    var d = new Date();
    var pad = function(n){ return String(n).padStart(2,'0'); };
    return 'avances-actividades-ISSS-'+d.getFullYear()+pad(d.getMonth()+1)+pad(d.getDate())+'.png';
  }

  function wireAvancesExport(){
    var btnOpen = document.getElementById('btnPreviewAvances');
    var overlay = document.getElementById('avanceExportModal');
    var btnClose = document.getElementById('btnCloseAvanceExport');
    var btnCancel = document.getElementById('btnCancelAvanceExport');
    var btnDownload = document.getElementById('btnDownloadAvanceExport');
    if(!btnOpen || !overlay) return;

    var currentBlobUrl = null;

    function closeExportModal(){
      overlay.classList.remove('open');
      overlay.setAttribute('aria-hidden','true');
    }

    btnOpen.addEventListener('click', function(){
      var statusEl = document.getElementById('avanceExportStatus');
      var img = document.getElementById('avanceExportImg');
      statusEl.style.display = 'block';
      statusEl.textContent = 'Generando imagen…';
      img.style.display = 'none';
      btnDownload.disabled = true;
      overlay.classList.add('open');
      overlay.setAttribute('aria-hidden','false');

      ensureHtml2Canvas(function(err){
        if(err){ statusEl.textContent = 'No se pudo cargar la librería de exportación. Verificá tu conexión e intentá de nuevo.'; return; }
        captureAvancesCanvas(function(capErr, canvas){
          if(capErr){ statusEl.textContent = 'Ocurrió un error al generar la imagen.'; return; }
          canvas.toBlob(function(blob){
            if(currentBlobUrl) URL.revokeObjectURL(currentBlobUrl);
            currentBlobUrl = URL.createObjectURL(blob);
            img.src = currentBlobUrl;
            img.style.display = 'inline-block';
            statusEl.style.display = 'none';
            btnDownload.disabled = false;
          }, 'image/png');
        });
      });
    });

    if(btnClose) btnClose.addEventListener('click', closeExportModal);
    if(btnCancel) btnCancel.addEventListener('click', closeExportModal);
    overlay.addEventListener('click', function(e){ if(e.target===overlay) closeExportModal(); });

    if(btnDownload) btnDownload.addEventListener('click', function(){
      if(!currentBlobUrl) return;
      downloadFile(currentBlobUrl, avancesExportFilename());
    });
  }

  // ══════════════════════════════════════════════════════════════
  // REPORTE — botón "Generar resumen" → modal (HTML interactivo / PDF)
  // ══════════════════════════════════════════════════════════════
  // Último dato de /data/roadmap.json usado para pintar la página — es lo
  // que alimenta el resumen HTML/PDF (ver construirReporteHTMLStandalone).
  var _lastRoadmapData = null;

  var REPORT_SLIDE_TITULOS = ['Resumen general', 'Avances de actividades', 'Trámites por paquete'];

  // Expuesta globalmente: el resumen HTML exportado carga este mismo archivo
  // (modules/roadmap.js) desde el portal y la usa para renderizarse con los
  // datos embebidos, en vez de volver a pedirlos por red. Así el resumen usa
  // exactamente el mismo código (tarjetas, tabla, catálogo) que la web app.
  window.RM_RENDER_REPORT_FROM_DATA = function(mountEl, data){
    data = data || {};
    mountEl.innerHTML = renderReportCarousel(data.meta||{}, data.paquetes||[], data.avances||[]);
    initReportCarousel(mountEl);
  };

  function avancesSnapshotParaReporte(){
    return getSortedAvances().map(function(r){
      return {
        actividad: r.actividad, asignado_a: r.asignado_a, prioridad: r.prioridad,
        fecha_planeada: r.fecha_planeada, estatus: r.estatus, pct_avance: r.pct_avance,
        origen: r.origen
      };
    });
  }

  // Tabla de Avances de actividades de solo lectura — mismas columnas y
  // badges que la tabla editable, sin reordenar/editar/eliminar ni el
  // botón "+ Agregar actividad" (a pedido de Darío, 2026-09-22: el resumen
  // es para compartir, no para editar).
  function renderAvancesRowsReadOnly(rows){
    if(!rows || !rows.length) return '<tr><td colspan="7" class="avances-empty">Sin actividades registradas.</td></tr>';
    return rows.map(function(r){
      var pct = parseInt(r.pct_avance)||0;
      return '<tr>'
        +'<td class="avances-origen-col">'+origenBadge(r.origen)+'</td>'
        +'<td>'+escapeHtml(r.actividad)+'</td>'
        +'<td>'+escapeHtml(r.asignado_a)+'</td>'
        +'<td><span class="est-badge '+prioridadBadgeClass(r.prioridad)+'">'+escapeHtml(r.prioridad||PRIORIDAD_DEFAULT)+'</span></td>'
        +'<td style="font-family:\'Geist Mono\',monospace;font-size:12px;color:var(--goes-gray-550);">'+fmtLong(r.fecha_planeada)+'</td>'
        +'<td><span class="est-badge '+estadoBadgeClass(r.estatus)+'">'+escapeHtml(r.estatus||'Pendiente')+'</span></td>'
        +'<td class="avances-pct">'+pct+'%</td>'
      +'</tr>';
    }).join('');
  }

  // Contenido de las 3 slides — compartido entre el HTML interactivo
  // (carrusel) y el PDF (apiladas con salto de página), reutilizando
  // exactamente los mismos render que usa la web app.
  function buildReportSlides(meta, paquetes, avancesRows){
    var slide1 = renderMetaBar(meta) + renderResumen(paquetes);
    var slide2 = '<div class="section" style="padding-top:0;">'
      +'<div class="section-h">Avances de actividades</div>'
      +'<div class="avances-wrap">'
        +'<table class="avances-table">'
          +'<thead><tr><th title="Origen de la actividad"></th><th>Actividades</th><th>Responsables</th><th>Prioridad</th><th>Fecha</th><th>Estatus</th><th>% de avance</th></tr></thead>'
          +'<tbody>'+renderAvancesRowsReadOnly(avancesRows)+'</tbody>'
        +'</table>'
      +'</div>'
    +'</div>';
    var slide3 = renderCatalogoTramites(paquetes, {forceOpen:true});
    return [slide1, slide2, slide3];
  }

  function renderReportCarousel(meta, paquetes, avancesRows){
    var slides = buildReportSlides(meta, paquetes, avancesRows);
    var slidesHtml = slides.map(function(html, i){
      return '<div class="rm-slide'+(i===0?' active':'')+'" data-slide="'+i+'"><div class="rm-slide-inner"><div class="rm-slide-fit">'+html+'</div></div></div>';
    }).join('');
    var dots = slides.map(function(_, i){
      return '<button type="button" class="rm-dot'+(i===0?' active':'')+'" data-goto="'+i+'" aria-label="Ir a: '+REPORT_SLIDE_TITULOS[i]+'"></button>';
    }).join('');
    return '<div class="rm-report-carousel">'
      +'<div class="rm-slide-counter"><span class="rm-slide-counter-cur">1</span> / '+slides.length+' · <span class="rm-slide-counter-title">'+REPORT_SLIDE_TITULOS[0]+'</span></div>'
      + slidesHtml
      +'<button class="rm-slide-nav rm-slide-prev" type="button" aria-label="Slide anterior" disabled>‹</button>'
      +'<button class="rm-slide-nav rm-slide-next" type="button" aria-label="Slide siguiente">›</button>'
      +'<div class="rm-slide-dots">'+dots+'</div>'
    +'</div>';
  }

  // Ajusta el tamaño de una slide a la pantalla donde se está presentando:
  // mide el alto/ancho natural de su contenido (.rm-slide-fit) contra el
  // espacio disponible y, si no entra, lo achica con transform:scale (nunca
  // lo agranda) — así se ve completo sin scroll en cualquier pantalla, como
  // una slide real (a pedido de Darío, 2026-09-22).
  function fitSlide(slideEl){
    if(!slideEl) return;
    var inner = slideEl.querySelector('.rm-slide-inner');
    var fit = slideEl.querySelector('.rm-slide-fit');
    if(!inner || !fit) return;
    fit.style.transform = 'none';
    var availH = inner.clientHeight;
    var availW = inner.clientWidth;
    // Contenedores internos con overflow:hidden (p.ej. .avances-wrap, para
    // redondear la tabla) esconden de scrollWidth el ancho real que la
    // tabla necesita — se destapan un instante para medir el tamaño
    // natural completo y se restauran enseguida (a pedido de Darío,
    // 2026-09-22: antes esa parte se recortaba en vez de achicarse).
    var clipped = fit.querySelectorAll('*');
    var restore = [];
    for(var i=0;i<clipped.length;i++){
      var el = clipped[i];
      var cs = getComputedStyle(el);
      if(cs.overflowX==='hidden' || cs.overflow==='hidden'){
        restore.push([el, el.style.overflow, el.style.overflowX]);
        el.style.overflow = 'visible';
        el.style.overflowX = 'visible';
      }
    }
    var naturalH = fit.scrollHeight;
    var naturalW = fit.scrollWidth;
    restore.forEach(function(r){ r[0].style.overflow = r[1]; r[0].style.overflowX = r[2]; });
    if(!availH || !naturalH) return;
    var scale = Math.min(availH/naturalH, availW/naturalW, 1);
    if(scale < 0.999){
      fit.style.transform = 'scale('+scale+')';
    }
  }

  // Navegación del carrusel: flechas, puntos y flechas de teclado. Cada
  // slide se reescala (fitSlide) al mostrarla y al cambiar el tamaño de
  // ventana, para que quede ajustada a la pantalla donde se presenta.
  function initReportCarousel(root){
    var slides = root.querySelectorAll('.rm-slide');
    var dots   = root.querySelectorAll('.rm-dot');
    var prevBtn = root.querySelector('.rm-slide-prev');
    var nextBtn = root.querySelector('.rm-slide-next');
    var counterCur = root.querySelector('.rm-slide-counter-cur');
    var counterTitle = root.querySelector('.rm-slide-counter-title');
    var idx = 0;
    function show(i){
      idx = Math.max(0, Math.min(slides.length-1, i));
      slides.forEach(function(s,j){ s.classList.toggle('active', j===idx); });
      dots.forEach(function(d,j){ d.classList.toggle('active', j===idx); });
      if(prevBtn) prevBtn.disabled = idx===0;
      if(nextBtn) nextBtn.disabled = idx===slides.length-1;
      if(counterCur) counterCur.textContent = idx+1;
      if(counterTitle) counterTitle.textContent = REPORT_SLIDE_TITULOS[idx]||'';
      requestAnimationFrame(function(){ fitSlide(slides[idx]); });
    }
    if(prevBtn) prevBtn.addEventListener('click', function(){ show(idx-1); });
    if(nextBtn) nextBtn.addEventListener('click', function(){ show(idx+1); });
    dots.forEach(function(d,j){ d.addEventListener('click', function(){ show(j); }); });
    document.addEventListener('keydown', function(e){
      if(!document.body.contains(root)) return;
      if(e.key==='ArrowRight') show(idx+1);
      if(e.key==='ArrowLeft') show(idx-1);
    });
    window.addEventListener('resize', function(){ fitSlide(slides[idx]); });
    show(0);
  }

  // Fuente de este mismo archivo (roadmap.js), pedida una sola vez y
  // cacheada — se embebe tal cual en el resumen HTML (ver más abajo) en vez
  // de referenciarla con <script src>. Un <script src> con URL absoluta
  // (location.origin + '/modules/roadmap.js') solo funciona si el resumen
  // se sigue sirviendo desde el portal; abierto como archivo local
  // (file://, que es como termina abriéndose casi siempre un HTML
  // descargado) location.origin es inválido y el script nunca carga, dejando
  // "Cargando resumen…" para siempre. Embebido, el resumen es 100%
  // autocontenido (a pedido de Darío, 2026-09-22 — bug reportado).
  var _roadmapScriptSourceCache = null;
  function fetchRoadmapScriptSource(cb){
    if(_roadmapScriptSourceCache){ cb(_roadmapScriptSourceCache); return; }
    fetch('/modules/roadmap.js?v=' + Date.now())
      .then(function(r){ if(!r.ok) throw new Error('HTTP '+r.status); return r.text(); })
      .then(function(txt){ _roadmapScriptSourceCache = txt; cb(txt); })
      .catch(function(){ cb(null); });
  }

  function construirReporteHTMLStandalone(scriptSource){
    if(!_lastRoadmapData) return null;
    var payload = { meta:_lastRoadmapData.meta, paquetes:_lastRoadmapData.paquetes, avances:avancesSnapshotParaReporte() };
    // Escapar "<" evita que un nombre de trámite/actividad con literalmente
    // "</script>" cierre el bloque de datos antes de tiempo — JSON.parse lo
    // revierte igual.
    var dataJson = JSON.stringify(payload).replace(/</g,'\\u003c');
    // Mismo motivo para el código fuente embebido: si en algún momento
    // aparece literalmente "</script" adentro (comentario, string), cerraría
    // el bloque antes de tiempo. Al navegador no le importa que esté dentro
    // de un string JS — solo busca la secuencia de caracteres.
    var scriptSafe = String(scriptSource||'').replace(/<\/script/gi, '<\\/script');
    var generadoTs = new Date().toLocaleString('es-SV', {dateStyle:'medium', timeStyle:'short'});
    return '<!doctype html>'
      +'<html lang="es"><head><meta charset="utf-8">'
      +'<meta name="viewport" content="width=device-width, initial-scale=1">'
      +'<title>Resumen de Roadmap — ISSS-SYDT</title>'
      +'<meta name="generado" content="'+generadoTs+'">'
      +'<link rel="preconnect" href="https://fonts.googleapis.com">'
      +'<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>'
      +'<link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800&display=swap" rel="stylesheet">'
      +'<style>html,body{margin:0;height:100%;background:#E4E8EC;font-family:\'Nunito\',sans-serif;}</style>'
      +'</head><body>'
      +'<div id="roadmap-report-mount"><div style="padding:80px 24px;text-align:center;color:#7C8896;font-family:\'Nunito\',sans-serif;font-size:13px;">Cargando resumen…</div></div>'
      +'<script type="application/json" id="rm-report-data">'+dataJson+'<\/script>'
      +'<script>'+scriptSafe+'<\/script>'
      +'<script>'
        +'document.addEventListener("DOMContentLoaded",function(){'
          +'(function tryRender(){'
            +'if(typeof RM_RENDER_REPORT_FROM_DATA!=="function"){ setTimeout(tryRender,150); return; }'
            +'var data=JSON.parse(document.getElementById("rm-report-data").textContent);'
            +'RM_RENDER_REPORT_FROM_DATA(document.getElementById("roadmap-report-mount"), data);'
          +'})();'
        +'});'
      +'<\/script>'
      +'</body></html>';
  }

  function descargarTextoComoArchivo(nombre, contenido, mime){
    var blob = new Blob([contenido], {type: mime});
    var url = URL.createObjectURL(blob);
    downloadFile(url, nombre);
    setTimeout(function(){ URL.revokeObjectURL(url); }, 4000);
  }

  // PDF = las 3 slides apiladas con salto de página, impresas por el
  // navegador (Guardar como PDF) — "información plana" a pedido de Darío
  // (2026-09-22), sin el carrusel ni la navegación interactiva.
  function renderReportPrintStack(meta, paquetes, avancesRows){
    var slides = buildReportSlides(meta, paquetes, avancesRows);
    return '<div id="rm-report-print-root">'
      + slides.map(function(html, i){
          return '<div class="rm-print-slide">'
            +'<div class="rm-print-slide-label">Resumen de Roadmap — ISSS-SYDT · Slide '+(i+1)+'/'+slides.length+' · '+REPORT_SLIDE_TITULOS[i]+'</div>'
            +'<div class="rm-print-slide-inner">'+html+'</div>'
          +'</div>';
        }).join('')
    +'</div>';
  }

  // El PDF se imprime dentro de la página viva del portal (que usa Geist,
  // no Nunito) — hay que cargar Nunito ahí antes de imprimir para que el
  // PDF salga con la misma tipografía que el resumen HTML.
  function ensureNunitoFontLoaded(){
    if(document.getElementById('rm-nunito-font')) return;
    var pre1 = document.createElement('link'); pre1.rel='preconnect'; pre1.href='https://fonts.googleapis.com';
    var pre2 = document.createElement('link'); pre2.rel='preconnect'; pre2.href='https://fonts.gstatic.com'; pre2.crossOrigin='anonymous';
    var sheet = document.createElement('link'); sheet.id='rm-nunito-font'; sheet.rel='stylesheet';
    sheet.href='https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800&display=swap';
    document.head.appendChild(pre1);
    document.head.appendChild(pre2);
    document.head.appendChild(sheet);
  }

  function generarReportePDF(){
    if(!_lastRoadmapData) return false;
    ensureNunitoFontLoaded();
    var existente = document.getElementById('rm-report-print-root');
    if(existente) existente.parentNode.removeChild(existente);
    var wrap = document.createElement('div');
    wrap.innerHTML = renderReportPrintStack(_lastRoadmapData.meta, _lastRoadmapData.paquetes, avancesSnapshotParaReporte());
    document.body.appendChild(wrap.firstChild);
    var tituloOriginal = document.title;
    document.title = 'Resumen Roadmap ISSS-SYDT ' + new Date().toISOString().slice(0,10);
    function limpiar(){
      var root = document.getElementById('rm-report-print-root');
      if(root && root.parentNode) root.parentNode.removeChild(root);
      document.title = tituloOriginal;
      window.removeEventListener('afterprint', limpiar);
    }
    window.addEventListener('afterprint', limpiar);
    // document.fonts.ready espera a que Nunito (recién solicitada arriba)
    // termine de cargar antes de abrir el diálogo de impresión — si no,
    // la primera vez el PDF podría salir con la tipografía de respaldo.
    var esperarFuente = (document.fonts && document.fonts.ready) ? document.fonts.ready : Promise.resolve();
    Promise.race([esperarFuente, new Promise(function(r){ setTimeout(r, 800); })]).then(function(){
      window.print();
    });
    return true;
  }

  function mountReportModal(){
    var btn = document.getElementById('rm-btn-generar-resumen');
    if(!btn) return;

    var overlay = document.getElementById('rm-report-overlay');
    if(!overlay){
      overlay = document.createElement('div');
      overlay.className = 'rm-modal-overlay';
      overlay.id = 'rm-report-overlay';
      overlay.innerHTML =
        '<div class="rm-modal">'
          +'<div class="rm-modal-head"><div class="rm-modal-title">Generar resumen</div><button class="rm-modal-close" id="rm-report-close" aria-label="Cerrar">✕</button></div>'
          +'<div class="rm-modal-body" id="rm-report-body">'
            +'<div class="rm-report-options">'
              +'<button type="button" class="rm-report-opt active" data-fmt="html">'
                +'<span class="rm-report-opt-radio"></span>'
                +'<span class="rm-report-opt-title">HTML interactivo</span>'
              +'</button>'
              +'<button type="button" class="rm-report-opt" data-fmt="pdf">'
                +'<span class="rm-report-opt-radio"></span>'
                +'<span class="rm-report-opt-title">PDF</span>'
              +'</button>'
            +'</div>'
          +'</div>'
          +'<div class="rm-modal-foot" id="rm-report-foot">'
            +'<button class="rm-btn-secondary" id="rm-report-cancel">Cancelar</button>'
            +'<button class="rm-btn-report" id="rm-report-generar">Generar</button>'
          +'</div>'
        +'</div>';
      document.body.appendChild(overlay);

      var body = overlay.querySelector('#rm-report-body');
      var foot = overlay.querySelector('#rm-report-foot');
      var bodyHTMLOriginal = body.innerHTML;
      var footHTMLOriginal = foot.innerHTML;
      var fmtSeleccionado = 'html';

      function wireOpciones(){
        body.querySelectorAll('.rm-report-opt').forEach(function(opt){
          opt.addEventListener('click', function(){
            body.querySelectorAll('.rm-report-opt').forEach(function(o){ o.classList.remove('active'); });
            opt.classList.add('active');
            fmtSeleccionado = opt.dataset.fmt;
          });
        });
      }
      function wireFoot(){
        var cancelBtn = foot.querySelector('#rm-report-cancel');
        var generarBtn = foot.querySelector('#rm-report-generar');
        if(cancelBtn) cancelBtn.addEventListener('click', cerrar);
        if(generarBtn) generarBtn.addEventListener('click', generar);
      }
      function generar(){
        if(!_lastRoadmapData){
          body.innerHTML = '<div class="rm-report-error">Todavía se está cargando el Roadmap. Esperá unos segundos e intentá de nuevo.</div>';
          foot.innerHTML = '<button class="rm-btn-secondary" id="rm-report-cancel">Cerrar</button>';
          wireFoot();
          return;
        }
        body.innerHTML = '<div class="rm-report-status"><div class="rm-spinner"></div>Generando resumen…</div>';
        foot.innerHTML = '';
        // setTimeout deja pintar el spinner antes del trabajo síncrono (el
        // print() bloquea hasta cerrar el diálogo).
        setTimeout(function(){
          if(fmtSeleccionado==='pdf'){
            generarReportePDF();
            cerrar();
            return;
          }
          fetchRoadmapScriptSource(function(src){
            if(!src){
              body.innerHTML = '<div class="rm-report-error">No se pudo generar el resumen. Intentá de nuevo.</div>';
              foot.innerHTML = '<button class="rm-btn-secondary" id="rm-report-cancel">Cerrar</button>';
              wireFoot();
              return;
            }
            var html = construirReporteHTMLStandalone(src);
            var fecha = new Date().toISOString().slice(0,10);
            descargarTextoComoArchivo('resumen-roadmap-isss-sydt-'+fecha+'.html', html, 'text/html;charset=utf-8');
            body.innerHTML = '<div class="rm-report-ok">✓ Resumen descargado.</div>';
            setTimeout(cerrar, 900);
          });
        }, 50);
      }

      var abrir = function(){
        body.innerHTML = bodyHTMLOriginal;
        foot.innerHTML = footHTMLOriginal;
        fmtSeleccionado = 'html';
        wireOpciones();
        wireFoot();
        overlay.classList.add('rm-modal-open');
      };
      var cerrar = function(){ overlay.classList.remove('rm-modal-open'); };

      overlay.querySelector('#rm-report-close').addEventListener('click', cerrar);
      overlay.addEventListener('click', function(e){ if(e.target===overlay) cerrar(); });
      overlay._rmAbrir = abrir;
    }

    // El botón se recrea en cada render() (mount.innerHTML se reemplaza
    // entero), así que solo hace falta re-enlazar el click al abrir()
    // persistido en el overlay — el modal en sí se crea una sola vez.
    btn.addEventListener('click', overlay._rmAbrir);
  }

  // ── Render principal ──────────────────────────────────────────────────────────
  function render(data){
    var axisStart = parseDate(data.meta.gantt_inicio);
    var axisEnd   = parseDate(data.meta.gantt_fin);
    var totalDays = (axisEnd - axisStart) / 86400000;

    mount.innerHTML =
      '<div class="roadmap-topbar"><button class="rm-btn-report" id="rm-btn-generar-resumen" type="button">Generar resumen</button></div>'
      + renderMetaBar(data.meta)
      + renderResumen(data.paquetes)
      + renderGanttSection(data.meta, data.paquetes, axisStart, totalDays)
      + renderAvancesSection()
      + renderCatalogoTramites(data.paquetes)
      + renderDetalle(data.paquetes)
      + renderTransversal(data.transversal)
      + '<div class="docfoot">'
          +'<div>Roadmap de Producto · Digitalización de Trámites ISSS</div>'
          +'<div class="mono">Plan actualizado: '+data.meta.actualizado+'</div>'
        +'</div>';

    _lastRoadmapData = data;
    bindTabs();
    bindModal();
    bindGanttScrollSync();
    initAvances();
    mountReportModal();
    // Asegura que el layout ya está resuelto (ancho real del contenedor) antes de
    // calcular los px de la franja de fechas y la línea de hoy. rAF cubre el caso
    // normal; el setTimeout es respaldo si el tab no está pintando activamente.
    requestAnimationFrame(function(){
      requestAnimationFrame(function(){ positionTodayLines(axisStart, totalDays); });
    });
    setTimeout(function(){ positionTodayLines(axisStart, totalDays); }, 300);
    window.addEventListener('resize', function(){ positionTodayLines(axisStart, totalDays); });
  }

  // ── Tabs ──────────────────────────────────────────────────────────────────────
  function bindGroup(tabSel, panelSel, attrTab, attrPanel){
    var tabs   = document.querySelectorAll(tabSel);
    var panels = document.querySelectorAll(panelSel);
    tabs.forEach(function(t){
      t.addEventListener('click', function(){
        var target = t.getAttribute(attrTab);
        tabs.forEach(function(x){ x.classList.toggle('is-active', x===t); });
        panels.forEach(function(p){ p.classList.toggle('is-active', p.getAttribute(attrPanel)===target); });
      });
    });
  }

  function bindTabs(){
    bindGroup('.pkg-tab',  '.pkg-panel',  'data-target',  'data-pkg');
    bindGroup('.g-tab',    '.g-panel',    'data-gtarget', 'data-gpkg');
    document.querySelectorAll('.g-tab').forEach(function(t){
      t.addEventListener('click', function(){
        setTimeout(function(){
          // El panel recién activado hereda el scroll del encabezado (que nunca
          // está oculto), por si el navegador no conservó el scroll de un panel
          // que estuvo en display:none.
          var section = t.closest('.section');
          var g = section ? section.querySelector('.gantt') : null;
          if(g){
            var headScroll = g.querySelector('.g-head-scroll');
            var activeLanes = g.querySelector('.g-panel.is-active .g-lanes-scroll');
            if(headScroll && activeLanes) activeLanes.scrollLeft = headScroll.scrollLeft;
          }
          positionTodayLines(_axisStart, _totalDays);
        }, 30);
      });
    });
  }

  // ── Sincronización de scroll (header ⇄ franjas de fecha) ─────────────────────
  // El encabezado de meses y cada franja de fechas son elementos con scroll
  // independientes; se mantienen alineados reflejando el scrollLeft entre ellos.
  function bindGanttScrollSync(){
    document.querySelectorAll('#roadmap-mount .gantt').forEach(function(g){
      var scrollers = Array.prototype.slice.call(g.querySelectorAll('.g-lanes-scroll'));
      var headScroll = g.querySelector('.g-head-scroll');
      if(headScroll) scrollers.push(headScroll);
      var syncing = false;
      scrollers.forEach(function(src){
        src.addEventListener('scroll', function(){
          if(syncing) return;
          syncing = true;
          var left = src.scrollLeft;
          scrollers.forEach(function(dst){ if(dst!==src) dst.scrollLeft = left; });
          syncing = false;
        });
      });
    });
  }

  function setGanttScrollLeft(g, left){
    g.querySelectorAll('.g-lanes-scroll, .g-head-scroll').forEach(function(el){ el.scrollLeft = left; });
  }

  // ── Modal ─────────────────────────────────────────────────────────────────────
  function bindModal(){
    var btnOpen  = document.getElementById('btnShowFullGantt');
    var btnClose = document.getElementById('btnCloseGantt');
    var overlay  = document.getElementById('ganttModal');
    if(!btnOpen||!overlay) return;
    function openModal(){ overlay.classList.add('open'); overlay.setAttribute('aria-hidden','false'); document.body.style.overflow='hidden'; setTimeout(function(){ positionTodayLines(_axisStart, _totalDays); }, 30); }
    function closeModal(){ overlay.classList.remove('open'); overlay.setAttribute('aria-hidden','true'); document.body.style.overflow=''; }
    btnOpen.addEventListener('click', openModal);
    if(btnClose) btnClose.addEventListener('click', closeModal);
    overlay.addEventListener('click', function(e){ if(e.target===overlay) closeModal(); });
    document.addEventListener('keydown', function(e){ if(e.key==='Escape') closeModal(); });

    var btnSave = document.getElementById('btnSaveGantt');
    if(btnSave) btnSave.addEventListener('click', function(){ handleSaveGantt(btnSave); });
  }

  // ── Exportar cronograma completo (PNG / PDF) ──────────────────────────────────
  function loadScriptOnce(src, isReady, cb){
    if(isReady()) { cb(); return; }
    var existing = document.querySelector('script[data-lib-src="'+src+'"]');
    if(existing){ existing.addEventListener('load', function(){ cb(); }); return; }
    var s = document.createElement('script');
    s.src = src;
    s.setAttribute('data-lib-src', src);
    s.onload = function(){ cb(); };
    s.onerror = function(){ cb(new Error('No se pudo cargar '+src)); };
    document.head.appendChild(s);
  }

  function ensureExportLibs(cb){
    loadScriptOnce('https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js', function(){ return !!window.html2canvas; }, function(err){
      if(err){ cb(err); return; }
      loadScriptOnce('https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js', function(){ return !!(window.jspdf && window.jspdf.jsPDF); }, cb);
    });
  }

  // Construye una copia del cronograma completo, sin scroll ni recortes, para capturarla entera.
  // Resolución final objetivo del archivo exportado (PNG/PDF): 4K, 16:9. La vista web usa
  // una escala pensada para scroll (todo el rango de fechas a resolución diaria, muy
  // ancho); el archivo exportado no tiene scroll, así que se comprime/redistribuye la
  // línea de tiempo y se escala todo para llegar exactamente a este tamaño de imagen.
  var EXPORT_TARGET_W = 3840;
  var EXPORT_TARGET_H = 2160;
  var EXPORT_PADDING = 24;
  var EXPORT_FIXED_COL_W = 272; // etiqueta de paquete (52px) + columna de tareas (220px)
  var EXPORT_RIGHT_LABEL_BUFFER = 70; // espacio para que la última fecha ("dd mmm") no se corte

  function styleGanttCloneCommon(clone){
    clone.style.overflow = 'visible';
    clone.style.width = 'max-content';
    clone.style.borderRadius = '10px';
    clone.querySelectorAll('.g-lanes-scroll, .g-head-scroll').forEach(function(el){
      el.style.overflow = 'visible';
      el.style.width = 'auto';
      el.style.flex = '0 0 auto';
    });
    // html2canvas no interpreta bien writing-mode vertical (título "Paquete N" ilegible/espejado
    // en el archivo exportado); se reemplaza por texto horizontal rotado con transform simple.
    clone.querySelectorAll('.modal-pkg-tag').forEach(function(tag){
      var text = tag.textContent;
      tag.textContent = '';
      tag.style.writingMode = 'horizontal-tb';
      tag.style.transform = 'none';
      var span = document.createElement('span');
      span.textContent = text;
      span.style.display = 'inline-block';
      span.style.whiteSpace = 'nowrap';
      span.style.transform = 'rotate(-90deg)';
      tag.appendChild(span);
    });
  }

  // Construye el clon exportable ya dimensionado para que, al capturarlo con el "scale"
  // devuelto, el PNG/PDF final quede en exactamente EXPORT_TARGET_W x EXPORT_TARGET_H
  // (16:9), con el margen de la última fecha incluido dentro de ese tamaño (no sumado
  // aparte) y las semanas redistribuidas para aprovechar el ancho disponible.
  function buildGanttExportClone(){
    var original = document.querySelector('.gantt-in-modal');
    var wrap = document.createElement('div');
    wrap.style.position = 'fixed';
    wrap.style.left = '0';
    wrap.style.top = '0';
    wrap.style.zIndex = '-1';
    wrap.style.background = '#ffffff';
    wrap.style.padding = EXPORT_PADDING+'px';
    wrap.style.paddingRight = (EXPORT_PADDING + EXPORT_RIGHT_LABEL_BUFFER)+'px';
    wrap.style.fontFamily = "'Geist',sans-serif";

    var title = document.createElement('div');
    title.textContent = 'Cronograma completo de actividades — Digitalización de Trámites ISSS';
    title.style.cssText = 'font-size:15px;font-weight:700;color:#0B1F3A;margin-bottom:14px;';
    wrap.appendChild(title);

    var clone = original.cloneNode(true);
    styleGanttCloneCommon(clone);
    wrap.appendChild(clone);
    document.body.appendChild(wrap);

    // 1) La altura total del contenido (título + encabezado + filas + padding) no depende
    //    del ancho de la franja de fechas — se mide primero, tal cual quedó al clonar.
    var naturalHeight = wrap.getBoundingClientRect().height;

    // 2) Ancho base (en px CSS, antes de escalar) para que el total sea exactamente 16:9.
    var baseWidth = naturalHeight * (EXPORT_TARGET_W / EXPORT_TARGET_H);

    // 3) Con ese ancho ya se redistribuye la franja de fechas completa (todo el rango de
    //    semanas, no solo lo visible en pantalla) para llenar el espacio disponible.
    var laneW = Math.max(260, baseWidth - EXPORT_FIXED_COL_W - EXPORT_PADDING*2 - EXPORT_RIGHT_LABEL_BUFFER);
    clone.querySelectorAll('.g-head-months, .g-lanes-inner').forEach(function(el){
      el.style.width = laneW+'px';
    });

    // 4) Escala de captura para que el ancho base (16:9) llegue exactamente a 4K.
    var scale = EXPORT_TARGET_W / baseWidth;

    return { wrap: wrap, scale: scale };
  }

  function captureFullGanttCanvas(then){
    var prevBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = '';
    var built = buildGanttExportClone();
    var wrap = built.wrap;
    requestAnimationFrame(function(){
      requestAnimationFrame(function(){
        window.html2canvas(wrap, { scale: built.scale, backgroundColor: '#ffffff' }).then(function(canvas){
          document.body.removeChild(wrap);
          document.body.style.overflow = prevBodyOverflow;
          then(null, canvas);
        }).catch(function(err){
          document.body.removeChild(wrap);
          document.body.style.overflow = prevBodyOverflow;
          then(err);
        });
      });
    });
  }

  function downloadFile(url, filename){
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  function ganttExportFilename(ext){
    var d = new Date();
    var pad = function(n){ return String(n).padStart(2,'0'); };
    return 'cronograma-completo-ISSS-'+d.getFullYear()+pad(d.getMonth()+1)+pad(d.getDate())+'.'+ext;
  }

  function handleSaveGantt(btn){
    var formatEl = document.querySelector('input[name="gmfFormat"]:checked');
    var format = formatEl ? formatEl.value : 'png';
    var originalLabel = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Generando…';

    function done(){ btn.disabled = false; btn.textContent = originalLabel; }

    ensureExportLibs(function(err){
      if(err){ done(); alert('No se pudieron cargar las librerías de exportación. Verificá tu conexión a internet e intentá de nuevo.'); return; }
      captureFullGanttCanvas(function(capErr, canvas){
        if(capErr){ done(); alert('Ocurrió un error al generar la imagen del cronograma.'); return; }
        if(format === 'pdf'){
          // JPEG (no PNG) para que el PDF quede en un tamaño de archivo razonable;
          // el PNG descargable sigue siendo sin pérdida para la opción "alta resolución".
          var imgData = canvas.toDataURL('image/jpeg', 0.92);
          var orientation = canvas.width >= canvas.height ? 'l' : 'p';
          // La unidad "px" de jsPDF no es 1:1 con los px del canvas (depende de la
          // versión/DPI asumido) y puede terminar en una página físicamente enorme.
          // Se define el tamaño de página en puntos, asumiendo 96 DPI (1pt = 1px * 72/96).
          var PX_TO_PT = 72/96;
          var pageW = canvas.width * PX_TO_PT;
          var pageH = canvas.height * PX_TO_PT;
          var pdf = new window.jspdf.jsPDF({ orientation: orientation, unit: 'pt', format: [pageW, pageH], compress: true });
          pdf.addImage(imgData, 'JPEG', 0, 0, pageW, pageH);
          pdf.save(ganttExportFilename('pdf'));
          done();
        } else {
          canvas.toBlob(function(blob){
            var url = URL.createObjectURL(blob);
            downloadFile(url, ganttExportFilename('png'));
            URL.revokeObjectURL(url);
            done();
          }, 'image/png');
        }
      });
    });
  }

  // ── Today line ────────────────────────────────────────────────────────────────
  var _axisStart, _totalDays;
  var VISIBLE_DAYS = 45; // ~1 mes y medio visible por pantalla — solo el modal

  // Calcula y aplica el ancho (en px) de la franja de fechas de cada gantt.
  // El cronograma principal muestra TODO el rango de una vez (sin scroll),
  // a escala compacta. El modal "Ver cronograma completo" conserva su propio
  // zoom (~1.5 meses visibles, con scroll), sin cambios.
  // El ancho se aplica únicamente a "g-lanes-inner"/"g-head-months": la columna
  // de tareas queda fuera del área con scroll, así que nunca se desborda.
  function layoutGantt(){
    if(!_totalDays) return;
    document.querySelectorAll('#roadmap-mount .gantt').forEach(function(g){
      // Usa el primer "g-lanes-scroll" VISIBLE como referencia: si el panel activo
      // no es el primero en el DOM (p.ej. tras cambiar de pestaña), los ocultos
      // (display:none) miden 0 y no deben frenar el recálculo del ancho.
      var candidates  = g.querySelectorAll('.g-lanes-scroll');
      var visibleLaneW = 0;
      for(var i=0;i<candidates.length;i++){
        var w = candidates[i].clientWidth;
        if(w){ visibleLaneW = w; break; }
      }
      if(!visibleLaneW) return; // aún no visible (p.ej. modal cerrado); se recalcula al abrir/resize
      var isModal     = g.classList.contains('gantt-in-modal');
      var visibleDays = isModal ? VISIBLE_DAYS : _totalDays;
      var pxPerDay    = visibleLaneW / visibleDays;
      var laneW       = pxPerDay * _totalDays;

      g.__laneW        = laneW;
      g.__visibleLaneW = visibleLaneW;

      var headMonths = g.querySelector('.g-head-months');
      if(headMonths) headMonths.style.width = laneW+'px';
      g.querySelectorAll('.g-lanes-inner').forEach(function(inner){ inner.style.width = laneW+'px'; });
    });
  }

  function positionTodayLines(axisStart, totalDays){
    if(axisStart !== undefined){ _axisStart = axisStart; _totalDays = totalDays; }
    if(!_axisStart) return;
    layoutGantt();
    var now     = new Date();
    var today   = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    var pct     = (today - _axisStart) / 86400000 / _totalDays * 100;
    var label   = today.getDate()+' '+MESES_CORTO[today.getMonth()];
    var inRange = pct >= 0 && pct <= 100;
    var clamped = Math.max(0, Math.min(100, pct));

    document.querySelectorAll('#roadmap-mount .g-lanes-inner').forEach(function(inner){
      var line = inner.querySelector('.g-today-line-v');
      if(!line){ line = document.createElement('div'); line.className='g-today-line-v'; inner.appendChild(line); }
      var lbl = inner.querySelector('.g-today-label-date');
      if(!lbl){ lbl = document.createElement('div'); lbl.className='g-today-label-date'; inner.appendChild(lbl); }
      if(!inRange){ line.style.display='none'; lbl.style.display='none'; return; }
      line.style.display = '';
      line.style.left = clamped+'%';

      // En el modal (los 3 paquetes juntos) la etiqueta de fecha sólo se
      // muestra en el último carril, para no repetirla 3 veces.
      var block = inner.closest('.modal-pkg-block');
      var showLabel = true;
      if(block){
        var blocks = block.parentElement.querySelectorAll('.modal-pkg-block');
        showLabel = block === blocks[blocks.length-1];
      }
      lbl.style.display = showLabel ? '' : 'none';
      if(showLabel){
        lbl.style.left  = clamped+'%';
        lbl.textContent = label;
      }
    });

    // Centra el scroll sobre la fecha actual la primera vez que se calcula, por gantt
    if(inRange){
      document.querySelectorAll('#roadmap-mount .gantt').forEach(function(g){
        if(g.__autoScrolled || !g.__laneW) return;
        g.__autoScrolled = true;
        var target = Math.max(0, (g.__laneW*clamped/100) - (g.__visibleLaneW||0)*0.3);
        setGanttScrollLeft(g, target);
      });
    }
  }

})();
