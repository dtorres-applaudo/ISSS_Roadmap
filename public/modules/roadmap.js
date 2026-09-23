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
  style.textContent = `/* Todos los valores salen de modules/ds.js (var(--ds-*)). */
#roadmap-mount, .rm-report-carousel, #rm-report-print-root{font:var(--ds-font-body);color:var(--ds-text);}
.num{font-variant-numeric:tabular-nums;}

/* ── Secciones ── */
.section{padding:var(--ds-space-400) 0 0;}
/* En la web app todas las secciones llevan el mismo aire, aunque el render
   traiga padding-top:0 inline (pensado para las slides del resumen). */
#roadmap-mount .section{padding-top:var(--ds-space-500) !important;}
.section-h{font:var(--ds-font-heading-small);color:var(--ds-text);margin-bottom:var(--ds-space-200);}
.note{font:var(--ds-font-body-small);color:var(--ds-text-subtlest);margin-top:var(--ds-space-150);max-width:880px;}
.docfoot{margin-top:var(--ds-space-500);padding-top:var(--ds-space-200);border-top:1px solid var(--ds-border);
  display:flex;justify-content:space-between;gap:var(--ds-space-200);flex-wrap:wrap;
  font:var(--ds-font-body-small);color:var(--ds-text-subtlest);}
.mono{font-variant-numeric:tabular-nums;}

/* ── Lozenges (badges de estado) ── */
.badge,.est-badge,.hito-cat{display:inline-flex;align-items:center;height:16px;padding:0 var(--ds-space-050);
  border-radius:var(--ds-radius-xsmall);font:700 .6875rem/16px var(--ds-font-family-body);text-transform:uppercase;
  white-space:nowrap;vertical-align:middle;background:var(--ds-lz-default-bg);color:var(--ds-lz-default-text);}
.badge-prog,.est-proceso,.cat-uat{background:var(--ds-lz-inprogress-bg);color:var(--ds-lz-inprogress-text);}
.badge-plan,.est-pendiente,.est-na,.cat-dev,.prio-baja{background:var(--ds-lz-default-bg);color:var(--ds-lz-default-text);}
.badge-hito,.est-finalizado,.cat-lib{background:var(--ds-lz-success-bg);color:var(--ds-lz-success-text);}
.est-replanificado,.cat-ciber,.prio-media{background:var(--ds-lz-moved-bg);color:var(--ds-lz-moved-text);}
.est-atrasado,.prio-alta{background:var(--ds-lz-removed-bg);color:var(--ds-lz-removed-text);}
.prio-critica{background:var(--ds-lz-removed-bold-bg);color:var(--ds-text-inverse);}
.cat-entrega{background:var(--ds-lz-new-bg);color:var(--ds-lz-new-text);}
.rm-spi{display:inline-flex;align-items:center;height:20px;padding:0 var(--ds-space-075);border-radius:var(--ds-radius-small);
  font:600 .75rem/20px var(--ds-font-family-body);font-variant-numeric:tabular-nums;white-space:nowrap;}
.rm-spi-ok{background:var(--ds-background-success);color:var(--ds-text-success);}
.rm-spi-warn{background:var(--ds-background-warning);color:var(--ds-text-warning);}
.rm-spi-bad{background:var(--ds-background-danger);color:var(--ds-text-danger);}
.rm-spi-na{background:var(--ds-background-neutral);color:var(--ds-text-subtle);}

/* ── Meta bar → fila de stat cards ── */
.roadmap-meta-bar{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:var(--ds-space-150);}
.rmb-item{border:1px solid var(--ds-border);border-radius:var(--ds-radius-large);padding:var(--ds-space-150) var(--ds-space-200);background:var(--ds-surface);}
.rmb-k{display:block;font:var(--ds-font-body-small);color:var(--ds-text-subtlest);margin-bottom:var(--ds-space-050);}
.rmb-v{display:block;font:var(--ds-font-heading-small);color:var(--ds-text);font-variant-numeric:tabular-nums;}
.rmb-v small{font:var(--ds-font-body-small);color:var(--ds-text-subtlest);margin-left:var(--ds-space-050);}
.rmb-v.spi-ok{color:var(--ds-text-success);} .rmb-v.spi-warn{color:var(--ds-text-warning);} .rmb-v.spi-bad{color:var(--ds-text-danger);}

/* ── Resumen de entregas ── */
.summary{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:var(--ds-space-200);}
.sum-card{position:relative;display:flex;flex-direction:column;border:1px solid var(--ds-border);border-radius:var(--ds-radius-large);
  padding:var(--ds-space-200);background:var(--ds-surface);transition:box-shadow var(--ds-motion);}
.sum-card:hover{box-shadow:var(--ds-shadow-raised);}
.sum-id{display:inline-flex;align-items:center;gap:var(--ds-space-075);font:var(--ds-font-heading-xxsmall);color:var(--ds-text-subtle);margin-bottom:var(--ds-space-100);}
.sum-id::before{content:"";width:12px;height:12px;border-radius:3px;background:var(--ds-pkg-1);}
.sum-card.p2 .sum-id::before{background:var(--ds-pkg-2);}
.sum-card.p3 .sum-id::before{background:var(--ds-pkg-3);}
.sum-title{font:var(--ds-font-heading-xsmall);line-height:1.25rem;color:var(--ds-text);min-height:40px;padding-right:96px;}
.sum-pct-wrap{position:absolute;top:var(--ds-space-200);right:var(--ds-space-200);display:flex;flex-direction:column;align-items:flex-end;gap:var(--ds-space-050);}
.sum-pct-badge{display:inline-flex;align-items:baseline;gap:var(--ds-space-050);font:var(--ds-font-heading-small);font-variant-numeric:tabular-nums;color:var(--ds-text);}
.sum-pct-badge.pct-actual{color:var(--ds-text-success);}
.sum-pct-badge.pct-actual-zero{color:var(--ds-text-subtlest);}
.sum-pct-badge.pct-planif{font:var(--ds-font-body-small);color:var(--ds-text-subtle);font-variant-numeric:tabular-nums;}
.sum-pct-label{font:var(--ds-font-body-small);color:var(--ds-text-subtlest);}
.sum-prog-bar{position:relative;height:6px;border-radius:var(--ds-radius-full);background:var(--ds-background-neutral);margin-top:var(--ds-space-200);overflow:hidden;}
.sum-prog-fill-planif{position:absolute;top:0;left:0;height:100%;border-radius:var(--ds-radius-full);background:var(--ds-background-selected-hovered);}
.sum-prog-fill-actual{position:absolute;top:0;left:0;height:100%;border-radius:var(--ds-radius-full);background:var(--ds-background-success-bold);}
.sum-rel{margin-top:var(--ds-space-200);padding-top:var(--ds-space-150);border-top:1px solid var(--ds-border);
  display:flex;justify-content:space-between;align-items:baseline;}
.sum-rel span{font:var(--ds-font-body-small);color:var(--ds-text-subtlest);}
.sum-rel strong{font:var(--ds-font-heading-xsmall);color:var(--ds-text);font-variant-numeric:tabular-nums;}

/* ── Tabs (Gantt, detalle, estilo ADS) ── */
.g-tabs,.pkg-tabs{display:flex;gap:var(--ds-space-050);margin-bottom:var(--ds-space-200);box-shadow:inset 0 -2px 0 var(--ds-border);overflow-x:auto;}
.g-tab,.pkg-tab{flex:none;display:flex;align-items:center;gap:var(--ds-space-100);cursor:pointer;
  padding:var(--ds-space-100) var(--ds-space-100);margin:0;border:none;border-bottom:2px solid transparent;border-radius:0;background:none;
  font:500 .875rem/1.25rem var(--ds-font-family-body);color:var(--ds-text-subtle);text-align:left;white-space:nowrap;
  transition:color var(--ds-motion),border-color var(--ds-motion);}
.g-tab:hover,.pkg-tab:hover{color:var(--ds-text);border-bottom-color:var(--ds-border-bold);}
.g-tab.is-active,.pkg-tab.is-active{color:var(--ds-text-selected);border-bottom-color:var(--ds-border-selected);}
.pkg-tab .tab-id{width:24px;height:24px;flex:none;border-radius:var(--ds-radius-small);display:flex;align-items:center;justify-content:center;
  font:700 .6875rem/1 var(--ds-font-family-body);color:var(--ds-text-inverse);background:var(--ds-pkg-1);}
.pkg-tab[data-target="P2"] .tab-id{background:var(--ds-pkg-2);}
.pkg-tab[data-target="P3"] .tab-id{background:var(--ds-pkg-3);}
.pkg-tab .tab-title{max-width:280px;overflow:hidden;text-overflow:ellipsis;}
.pkg-panel,.g-panel{display:none;}
.pkg-panel.is-active,.g-panel.is-active{display:block;}

/* ── GANTT (estilo Jira Timeline) ── */
.gantt{border:1px solid var(--ds-border);border-radius:var(--ds-radius-large);overflow:hidden;background:var(--ds-surface);}
.g-head{display:flex;background:var(--ds-surface-sunken);border-bottom:1px solid var(--ds-border);}
.g-head-spacer{width:220px;flex:none;border-right:1px solid var(--ds-border);}
.g-head-scroll{flex:1;overflow:hidden;position:relative;}
.g-head-months{position:relative;height:36px;}
.g-month{position:absolute;top:0;height:36px;display:flex;align-items:center;justify-content:center;padding:0 var(--ds-space-075);
  font:var(--ds-font-heading-xxsmall);color:var(--ds-text-subtle);border-left:1px solid var(--ds-border);white-space:nowrap;}
.g-body{display:flex;background:var(--ds-surface);}
.g-modal-body{background:var(--ds-surface);}
.g-task-col{width:220px;flex:none;border-right:1px solid var(--ds-border);}
.g-task-row{height:32px;display:flex;align-items:center;justify-content:flex-end;text-align:right;padding-right:var(--ds-space-150);
  font:var(--ds-font-body-small);color:var(--ds-text-subtle);line-height:1.15;}
.g-lanes-scroll{flex:1;min-width:0;overflow-x:auto;overflow-y:hidden;}
.g-lanes-scroll::-webkit-scrollbar{height:8px;}
.g-lanes-scroll::-webkit-scrollbar-track{background:var(--ds-surface-sunken);}
.g-lanes-scroll::-webkit-scrollbar-thumb{background:var(--ds-background-neutral-hovered);border-radius:var(--ds-radius-full);}
.g-lanes-inner{position:relative;}
.g-gridlines{position:absolute;inset:0;pointer-events:none;}
.g-grid{position:absolute;top:0;bottom:0;width:1px;background:var(--ds-chart-grid);}
.g-lane-row{position:relative;height:32px;}
.g-bar{position:absolute;top:50%;transform:translateY(-50%);height:16px;border-radius:var(--ds-radius-small);}
.g-bar-inner{position:absolute;inset:0;border-radius:var(--ds-radius-small);overflow:hidden;}
.g-bar-track{position:absolute;inset:0;border-radius:var(--ds-radius-small);background:var(--ds-pkg-1-subtle);}
.g-bar-track.g1{background:var(--ds-pkg-1-subtle);}
.g-bar-track.g2{background:var(--ds-pkg-2-subtle);}
.g-bar-track.g3{background:var(--ds-pkg-3-subtle);}
.g-bar-fill{position:absolute;top:0;left:0;height:100%;background:var(--ds-pkg-1);}
.g-bar-track.g2 + .g-bar-fill{background:var(--ds-pkg-2);}
.g-bar-track.g3 + .g-bar-fill{background:var(--ds-pkg-3);}
.g-bar-pct{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);padding:0 var(--ds-space-050);
  border-radius:var(--ds-radius-xsmall);background:var(--ds-surface);color:var(--ds-text);
  font:700 9px/13px var(--ds-font-family-body);font-variant-numeric:tabular-nums;white-space:nowrap;pointer-events:none;}
.g-d{position:absolute;top:50%;transform:translateY(-50%);font:400 10px/1 var(--ds-font-family-body);font-variant-numeric:tabular-nums;color:var(--ds-text-subtlest);white-space:nowrap;}
.g-d-ini{right:calc(100% + 4px);}
.g-d-fin{left:calc(100% + 4px);}
.g-task-row.mile,.g-lane-row.mile{height:36px;}
.g-task-row.mile{font-weight:600;color:var(--ds-text) !important;}
.g-task-row.final{color:var(--ds-text-danger) !important;font-weight:700;}
.g-milestone{position:absolute;top:50%;transform:translate(-50%,-50%);display:flex;align-items:center;gap:var(--ds-space-075);}
.g-mile-dot{width:12px;height:12px;flex:none;border-radius:2px;transform:rotate(45deg);background:var(--ds-pkg-1);}
.g-milestone.g2 .g-mile-dot{background:var(--ds-pkg-2);}
.g-milestone.g3 .g-mile-dot{background:var(--ds-pkg-3);}
.g-mile-final .g-mile-dot{width:14px;height:14px;background:var(--ds-background-danger-bold);box-shadow:0 0 0 3px var(--ds-background-danger);}
.g-mile-date{font:600 12px/1 var(--ds-font-family-body);font-variant-numeric:tabular-nums;color:var(--ds-text);white-space:nowrap;}
.g-mile-final .g-mile-date{color:var(--ds-text-danger);}
/* Línea de hoy */
.g-today-line-v{position:absolute;top:0;bottom:0;width:0;border-left:2px solid var(--ds-border-danger);pointer-events:none;z-index:20;}
.g-today-label-date{position:absolute;bottom:2px;transform:translateX(-50%);padding:1px var(--ds-space-050);
  border-radius:var(--ds-radius-xsmall);background:var(--ds-background-danger-bold);color:var(--ds-text-inverse);
  font:700 9px/1.3 var(--ds-font-family-body);white-space:nowrap;pointer-events:none;z-index:25;}
.gantt-full-btn-wrap{display:flex;justify-content:flex-end;padding-top:var(--ds-space-150);}

/* ── Botones (clases del módulo → estilo ds-btn) ── */
.rm-btn-report,.rm-btn-secondary,.gantt-full-btn,.gmf-save-btn,.avances-add-btn,.avance-btn-cancel,.avance-btn-save{
  display:inline-flex;align-items:center;justify-content:center;gap:var(--ds-space-075);height:32px;padding:0 var(--ds-space-150);
  border:none;border-radius:var(--ds-radius-small);font:500 .875rem/1 var(--ds-font-family-body);white-space:nowrap;cursor:pointer;
  background:var(--ds-background-neutral);color:var(--ds-text-subtle);transition:background var(--ds-motion);}
.rm-btn-secondary:hover,.gantt-full-btn:hover,.avance-btn-cancel:hover,.avances-preview-btn:hover{background:var(--ds-background-neutral-hovered);color:var(--ds-text);}
.rm-btn-report,.gmf-save-btn,.avances-add-btn,.avance-btn-save{background:var(--ds-background-brand-bold);color:var(--ds-text-inverse);}
.rm-btn-report:hover,.gmf-save-btn:hover,.avances-add-btn:hover,.avance-btn-save:hover{background:var(--ds-background-brand-bold-hovered);}
.avances-add-btn.avances-preview-btn{background:var(--ds-background-neutral);color:var(--ds-text-subtle);}
.gmf-save-btn:disabled,.avance-btn-save:disabled{background:var(--ds-background-disabled);color:var(--ds-text-disabled);cursor:not-allowed;}

/* ── Modales (ADS modal dialog) ── */
.gantt-modal-overlay,.avance-modal-overlay{position:fixed;inset:0;background:var(--ds-blanket);z-index:9998;
  display:flex;align-items:center;justify-content:center;padding:var(--ds-space-200);opacity:0;pointer-events:none;transition:opacity .2s;}
.gantt-modal-overlay.open,.avance-modal-overlay.open{opacity:1;pointer-events:auto;}
.rm-modal-overlay{position:fixed;inset:0;background:var(--ds-blanket);display:none;align-items:center;justify-content:center;z-index:9998;padding:var(--ds-space-200);}
.rm-modal-overlay.rm-modal-open{display:flex;}
.gantt-modal,.avance-modal,.rm-modal{display:flex;flex-direction:column;max-height:88vh;width:min(560px,100%);overflow:hidden;
  background:var(--ds-surface-overlay);border-radius:var(--ds-radius-small);box-shadow:var(--ds-shadow-overlay);}
.gantt-modal{width:min(1200px,96vw);}
.rm-modal{width:min(400px,100%);}
.gantt-modal-head,.avance-modal-head,.rm-modal-head{flex:none;display:flex;align-items:center;justify-content:space-between;gap:var(--ds-space-200);
  padding:var(--ds-space-300) var(--ds-space-300) var(--ds-space-100);}
.gantt-modal-title,.avance-modal-title,.rm-modal-title{font:var(--ds-font-heading-medium);color:var(--ds-text);}
.gantt-modal-close,.avance-modal-close,.rm-modal-close{width:32px;height:32px;flex:none;display:flex;align-items:center;justify-content:center;
  border:none;border-radius:var(--ds-radius-small);background:none;color:var(--ds-text-subtle);font-size:14px;cursor:pointer;}
.gantt-modal-close:hover,.avance-modal-close:hover,.rm-modal-close:hover{background:var(--ds-background-neutral-subtle-hovered);color:var(--ds-text);}
.gantt-modal-body,.avance-modal-body,.rm-modal-body{flex:1;overflow-y:auto;padding:var(--ds-space-100) var(--ds-space-300) var(--ds-space-200);}
.gantt-modal-footer,.avance-modal-footer,.rm-modal-foot{flex:none;display:flex;align-items:center;justify-content:flex-end;gap:var(--ds-space-100);
  padding:var(--ds-space-200) var(--ds-space-300) var(--ds-space-300);}
.gantt-modal-footer{gap:var(--ds-space-300);border-top:1px solid var(--ds-border);padding-top:var(--ds-space-200);}
.gmf-format{display:flex;align-items:center;gap:var(--ds-space-200);}
.gmf-radio{display:flex;align-items:center;gap:var(--ds-space-075);font:var(--ds-font-body);color:var(--ds-text);cursor:pointer;user-select:none;}
.gmf-radio input{accent-color:var(--ds-background-brand-bold);width:16px;height:16px;margin:0;cursor:pointer;}
/* Gantt dentro del modal (también es la base del export PNG/PDF) */
.gantt-in-modal{border-radius:var(--ds-radius-large);overflow:hidden;}
.gantt-in-modal .g-tabs{display:none !important;}
.gantt-in-modal .g-panel{display:block !important;}
.gantt-in-modal .g-head-spacer{width:272px;}
.modal-pkg-block{display:flex;position:relative;border-top:1px solid var(--ds-border);}
.modal-pkg-block:first-of-type{border-top:none;}
.modal-pkg-separator{height:1px;background:var(--ds-border);}
.modal-pkg-tag{width:52px;flex:none;display:flex;align-items:center;justify-content:center;padding:var(--ds-space-150) 0;
  writing-mode:vertical-rl;transform:rotate(180deg);font:700 12px/1 var(--ds-font-family-body);letter-spacing:.04em;
  color:var(--ds-pkg-1);background:var(--ds-surface-sunken);border-right:1px solid var(--ds-border);}
.modal-tag-pp1{color:var(--ds-pkg-1);}
.modal-tag-pp2{color:var(--ds-pkg-2);}
.modal-tag-pp3{color:var(--ds-pkg-3);}
.gantt-in-modal .g-task-row,.gantt-in-modal .g-lane-row{height:24px !important;}
.gantt-in-modal .g-task-row.mile,.gantt-in-modal .g-lane-row.mile{height:28px !important;}
.gantt-in-modal .g-task-row{font-size:13px !important;}
.gantt-in-modal .g-d{font-size:11px !important;}
.gantt-in-modal .g-mile-date{font-size:13px !important;}
/* En el modal, la barra de scroll visible y la etiqueta de fecha sólo se muestran
   en el último carril (paquete inferior); los demás quedan sincronizados igual. */
.gantt-in-modal .modal-pkg-block:not(:last-child) .g-lanes-scroll{scrollbar-width:none;-ms-overflow-style:none;}
.gantt-in-modal .modal-pkg-block:not(:last-child) .g-lanes-scroll::-webkit-scrollbar{display:none;}
@media print{.g-tabs{display:none !important;}.g-panel{display:block !important;}.pkg-tabs{display:none !important;}.pkg-panel{display:block !important;margin-bottom:24px !important;}}

/* ── Detalle por paquete ── */
.pkg{border:1px solid var(--ds-border);border-radius:var(--ds-radius-large);overflow:hidden;background:var(--ds-surface);}
.pkg-head{display:flex;align-items:center;gap:var(--ds-space-200);padding:var(--ds-space-200) var(--ds-space-300);border-bottom:1px solid var(--ds-border);}
.pkg-id{width:40px;height:40px;flex:none;border-radius:var(--ds-radius-medium);display:flex;align-items:center;justify-content:center;
  font:700 .875rem/1 var(--ds-font-family-body);color:var(--ds-text-inverse);background:var(--ds-pkg-1);}
.pkg[data-pkg="P2"] .pkg-id{background:var(--ds-pkg-2);}
.pkg[data-pkg="P3"] .pkg-id{background:var(--ds-pkg-3);}
.pkg-titles{flex:1;min-width:0;}
.pkg-name{font:var(--ds-font-heading-small);color:var(--ds-text);}
.pkg-sub{font-weight:400;color:var(--ds-text-subtle);}
.pkg-meta{margin-top:var(--ds-space-075);display:flex;align-items:center;gap:var(--ds-space-100);flex-wrap:wrap;}
.pkg-range{font:var(--ds-font-body-small);color:var(--ds-text-subtle);font-variant-numeric:tabular-nums;}
.pkg-prog{font:600 .75rem/1 var(--ds-font-family-body);color:var(--ds-text-brand);font-variant-numeric:tabular-nums;}
.pkg-release{text-align:right;flex:none;}
.rel-label{font:var(--ds-font-body-small);color:var(--ds-text-subtlest);}
.rel-date{font:var(--ds-font-heading-small);color:var(--ds-text);font-variant-numeric:tabular-nums;}
.pkg-body{display:flex;flex-direction:row;}
.col{padding:var(--ds-space-250) var(--ds-space-300);}
.col-scope{width:42%;flex:none;border-right:1px solid var(--ds-border);}
.col-track{flex:1;min-width:0;}
.col-h{font:var(--ds-font-heading-xxsmall);color:var(--ds-text-subtle);margin-bottom:var(--ds-space-150);}
.col-h-sp{margin-top:var(--ds-space-300);}
.mod-list{list-style:none;}
.mod-list li{position:relative;padding-left:var(--ds-space-200);margin-bottom:var(--ds-space-075);font:var(--ds-font-body);color:var(--ds-text);}
.mod-list li::before{content:"";position:absolute;left:2px;top:8px;width:5px;height:5px;border-radius:50%;background:var(--ds-text-subtlest);}
.sp-block{display:flex;flex-direction:column;border:1px solid var(--ds-border);border-radius:var(--ds-radius-small);overflow:hidden;}
.sp-row{display:flex;align-items:center;gap:var(--ds-space-150);padding:var(--ds-space-100) var(--ds-space-150);border-top:1px solid var(--ds-border);}
.sp-row:first-child{border-top:none;}
.sp-tag{flex:none;min-width:64px;display:inline-flex;justify-content:center;height:20px;align-items:center;padding:0 var(--ds-space-075);
  border-radius:var(--ds-radius-small);font:600 .75rem/1 var(--ds-font-family-body);color:var(--ds-text-selected);background:var(--ds-background-selected);}
.sp-f{flex:none;min-width:104px;font:var(--ds-font-body-small);color:var(--ds-text-subtle);font-variant-numeric:tabular-nums;}
.sp-d{font:var(--ds-font-body);color:var(--ds-text);}
.track{position:relative;padding-left:var(--ds-space-075);}
.hito{position:relative;display:flex;align-items:baseline;gap:var(--ds-space-150);padding:0 0 var(--ds-space-200) var(--ds-space-250);border-left:2px solid var(--ds-border);}
.hito:last-child{border-left-color:transparent;padding-bottom:0;}
.hito-dot{position:absolute;left:-7px;top:3px;width:12px;height:12px;border-radius:50%;background:var(--ds-surface);border:2px solid var(--ds-border-bold);}
.hito-dev .hito-dot{border-color:var(--ds-chart-gray);}
.hito-entrega .hito-dot{border-color:var(--ds-background-discovery-bold);}
.hito-uat .hito-dot{border-color:var(--ds-background-information-bold);}
.hito-ciber .hito-dot{border-color:var(--ds-border-warning);}
.hito-lib .hito-dot{border-color:var(--ds-background-success-bold);background:var(--ds-background-success-bold);}
.hito-f{flex:none;min-width:92px;font:600 .75rem/1.25rem var(--ds-font-family-body);color:var(--ds-text);font-variant-numeric:tabular-nums;}
.hito-t{flex:1;font:var(--ds-font-body);color:var(--ds-text);}
.hito-cat{flex:none;}
.pkg-foot{display:flex;align-items:center;gap:var(--ds-space-100);padding:var(--ds-space-150) var(--ds-space-300);
  background:var(--ds-surface-sunken);border-top:1px solid var(--ds-border);font:var(--ds-font-body);color:var(--ds-text-subtle);}
.foot-dot{width:8px;height:8px;flex:none;border-radius:50%;background:var(--ds-background-success-bold);box-shadow:0 0 0 3px var(--ds-background-success);}
.legend{display:flex;gap:var(--ds-space-250);flex-wrap:wrap;margin-top:var(--ds-space-150);}
.lg{display:flex;align-items:center;gap:var(--ds-space-075);font:var(--ds-font-body-small);color:var(--ds-text-subtle);}
.lg .d{width:10px;height:10px;border-radius:50%;border:2px solid;}
.lg-dev .d{border-color:var(--ds-chart-gray);}
.lg-entrega .d{border-color:var(--ds-background-discovery-bold);}
.lg-uat .d{border-color:var(--ds-background-information-bold);}
.lg-ciber .d{border-color:var(--ds-border-warning);}
.lg-lib .d{border-color:var(--ds-background-success-bold);background:var(--ds-background-success-bold);}

/* ── Capa transversal ── */
.trans{border:1px solid var(--ds-border);border-radius:var(--ds-radius-large);overflow:hidden;}
.tr-row{display:flex;align-items:center;gap:var(--ds-space-200);padding:var(--ds-space-150) var(--ds-space-200);border-top:1px solid var(--ds-border);}
.tr-row:first-child{border-top:none;}
.tr-row:hover{background:var(--ds-surface-hovered);}
.tr-name{flex:1;font:var(--ds-font-body);color:var(--ds-text);}
.tr-range{min-width:140px;font:var(--ds-font-body-small);color:var(--ds-text-subtle);font-variant-numeric:tabular-nums;}

/* ── Tablas (ADS dynamic table) ── */
.avances-wrap{border:1px solid var(--ds-border);border-radius:var(--ds-radius-large);overflow:hidden;background:var(--ds-surface);}
.avances-table,.tram-pkg-table{width:100%;border-collapse:collapse;font:var(--ds-font-body);}
.avances-table th,.tram-pkg-table th{padding:var(--ds-space-100) var(--ds-space-150);text-align:left;white-space:nowrap;
  font:var(--ds-font-heading-xxsmall);color:var(--ds-text-subtle);border-bottom:2px solid var(--ds-border);background:var(--ds-surface);}
.avances-table td,.tram-pkg-table td{padding:var(--ds-space-100) var(--ds-space-150);border-bottom:1px solid var(--ds-border);color:var(--ds-text);vertical-align:middle;}
.avances-table tr:last-child td,.tram-pkg-table tr:last-child td{border-bottom:none;}
.avances-table tbody tr:hover td{background:var(--ds-surface-hovered);}
.avances-pct{font-weight:600;font-variant-numeric:tabular-nums;white-space:nowrap;}
.avances-date{font:var(--ds-font-body);color:var(--ds-text-subtle);font-variant-numeric:tabular-nums;white-space:nowrap;}
.avances-empty{padding:var(--ds-space-300);text-align:center;color:var(--ds-text-subtlest);}
.avances-reorder-col{width:60px;white-space:nowrap;text-align:center !important;}
.avances-origen-col{width:36px;text-align:center;}
.avances-del-col{width:76px;white-space:nowrap;text-align:right !important;}
.avances-move-btn,.avances-edit-btn{width:24px;height:24px;display:inline-flex;align-items:center;justify-content:center;
  border:none;border-radius:var(--ds-radius-small);background:none;color:var(--ds-text-subtle);cursor:pointer;font-size:12px;line-height:1;
  transition:background var(--ds-motion),color var(--ds-motion);}
.avances-move-btn{font-size:9px;}
.avances-edit-btn{margin-left:2px;}
.avances-move-btn:hover:not(:disabled),.avances-edit-btn:hover:not(:disabled){background:var(--ds-background-neutral-subtle-hovered);color:var(--ds-text);}
.avances-move-btn:disabled{opacity:.3;cursor:not-allowed;}
.avances-edit-btn:disabled{opacity:.5;cursor:not-allowed;}
.avances-save-btn{background:var(--ds-background-brand-bold);color:var(--ds-text-inverse);}
.avances-save-btn:hover:not(:disabled){background:var(--ds-background-brand-bold-hovered) !important;color:var(--ds-text-inverse) !important;}
.avances-del-btn:hover:not(:disabled){background:var(--ds-background-danger) !important;color:var(--ds-text-danger) !important;}
.avance-inline-input{width:100%;height:32px;padding:0 var(--ds-space-075);font:var(--ds-font-body);color:var(--ds-text);
  background:var(--ds-background-input);border:1px solid var(--ds-border-input);border-radius:var(--ds-radius-small);outline:none;}
.avance-inline-input:focus{border-color:var(--ds-border-focused);box-shadow:inset 0 0 0 1px var(--ds-border-focused);}
.avance-inline-pct{width:72px;}
.avances-foot{display:flex;gap:var(--ds-space-100);padding:var(--ds-space-150);border-top:1px solid var(--ds-border);background:var(--ds-surface);}
.origen-badge{display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;flex:none;overflow:hidden;
  border-radius:var(--ds-radius-small);font-size:11px;line-height:1;}
.origen-plan{background:var(--ds-background-neutral);}
.origen-adicional{background:var(--ds-background-warning);}

/* ── Expander (details) ── */
.rm-collapsible{border:1px solid var(--ds-border);border-radius:var(--ds-radius-large);background:var(--ds-surface);}
.rm-collapsible summary{display:flex;align-items:center;gap:var(--ds-space-100);padding:var(--ds-space-150) var(--ds-space-200);
  cursor:pointer;list-style:none;user-select:none;border-radius:var(--ds-radius-large);
  font:var(--ds-font-heading-small);color:var(--ds-text);}
.rm-collapsible summary:hover{background:var(--ds-surface-hovered);}
.rm-collapsible summary::-webkit-details-marker{display:none;}
.rm-collapsible summary::before{content:"";flex:none;width:8px;height:8px;margin:0 4px;border-right:2px solid var(--ds-text-subtle);border-bottom:2px solid var(--ds-text-subtle);
  transform:rotate(-45deg);transition:transform var(--ds-motion);}
.rm-collapsible[open] summary::before{transform:rotate(45deg);}
.rm-collapsible[open] summary{border-radius:var(--ds-radius-large) var(--ds-radius-large) 0 0;}
.rm-collapsible-body{padding:var(--ds-space-100) var(--ds-space-200) var(--ds-space-200);}

/* ── Catálogo de trámites ── */
.tram-total-row{display:flex;margin-bottom:var(--ds-space-150);}
.tram-total-row .tram-count-card{flex:1;}
.tram-count-cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:var(--ds-space-150);margin-bottom:var(--ds-space-250);}
.tram-count-card{border:1px solid var(--ds-border);border-radius:var(--ds-radius-large);padding:var(--ds-space-150) var(--ds-space-200);background:var(--ds-surface);}
.tram-count-total{background:var(--ds-background-selected);border-color:transparent;}
.tram-count-val{font:var(--ds-font-metric-medium);color:var(--ds-text);font-variant-numeric:tabular-nums;}
.tram-count-total .tram-count-val{color:var(--ds-text-selected);}
.tram-count-lbl{font:var(--ds-font-body-small);color:var(--ds-text-subtle);margin-top:var(--ds-space-025);}
.pkg-id-chip{display:inline-flex;align-items:center;justify-content:center;height:20px;min-width:24px;padding:0 var(--ds-space-050);
  border-radius:var(--ds-radius-small);font:700 .6875rem/1 var(--ds-font-family-body);color:var(--ds-text-inverse);background:var(--ds-pkg-1);}
.pkg-id-chip.p2{background:var(--ds-pkg-2);} .pkg-id-chip.p3{background:var(--ds-pkg-3);}
.tram-pkg-cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:var(--ds-space-150);align-items:start;}
.tram-pkg-card{border:1px solid var(--ds-border);border-radius:var(--ds-radius-large);background:var(--ds-surface);overflow:hidden;}
.tram-pkg-card-head{display:flex;align-items:center;gap:var(--ds-space-100);padding:var(--ds-space-150) var(--ds-space-200);
  border-bottom:1px solid var(--ds-border);font:var(--ds-font-heading-xsmall);color:var(--ds-text);}
.tram-pkg-table td{vertical-align:top;}
.tram-pkg-no{width:36px;color:var(--ds-text-subtlest) !important;font-variant-numeric:tabular-nums;}

/* ── Modal "Agregar actividad" ── */
.avance-field{margin-bottom:var(--ds-space-200);}
.avance-field label{display:block;margin-bottom:var(--ds-space-050);font:var(--ds-font-heading-xxsmall);color:var(--ds-text-subtle);}
.avance-label-hint{font-weight:400;color:var(--ds-text-subtlest);}
.avance-field-hint{font:var(--ds-font-body-small);color:var(--ds-text-subtlest);margin:0 0 var(--ds-space-100);}
.avance-field input[type=text],.avance-field input[type=date],.avance-field input[type=number],.avance-field select,.avance-picker-search{
  width:100%;height:40px;padding:0 var(--ds-space-100);font:var(--ds-font-body);color:var(--ds-text);
  background:var(--ds-background-input);border:1px solid var(--ds-border-input);border-radius:var(--ds-radius-small);outline:none;}
.avance-field input:focus,.avance-field select:focus,.avance-picker-search:focus{border-color:var(--ds-border-focused);box-shadow:inset 0 0 0 1px var(--ds-border-focused);}
.avance-picker-search{margin-bottom:var(--ds-space-100);}
.avance-picker-list{max-height:220px;overflow-y:auto;border:1px solid var(--ds-border);border-radius:var(--ds-radius-small);padding:var(--ds-space-050) 0;}
.avance-picker-group{position:sticky;top:0;padding:var(--ds-space-075) var(--ds-space-150);font:var(--ds-font-heading-xxsmall);color:var(--ds-text-subtlest);background:var(--ds-surface);}
.avance-picker-item{padding:var(--ds-space-075) var(--ds-space-150);font:var(--ds-font-body);color:var(--ds-text);cursor:pointer;border-left:2px solid transparent;}
.avance-picker-item:hover{background:var(--ds-surface-hovered);border-left-color:var(--ds-border-selected);}
.avance-picker-item.is-selected{background:var(--ds-background-selected);color:var(--ds-text-selected);border-left-color:var(--ds-border-selected);}
.avance-picker-freetext{border-top:1px solid var(--ds-border);color:var(--ds-link);}
.avance-picker-empty{padding:var(--ds-space-200);text-align:center;font:var(--ds-font-body-small);color:var(--ds-text-subtlest);}
.avance-selected-chip{display:flex;align-items:center;gap:var(--ds-space-100);margin-bottom:var(--ds-space-100);padding:var(--ds-space-100) var(--ds-space-150);
  border-radius:var(--ds-radius-small);background:var(--ds-background-selected);font:var(--ds-font-body);color:var(--ds-text);}
.avance-selected-chip span:not(.origen-badge){flex:1;}
.avance-selected-chip button{border:none;background:none;cursor:pointer;font:600 .8125rem/1 var(--ds-font-family-body);color:var(--ds-link);}
.avance-selected-chip button:hover{text-decoration:underline;}
.avance-err{margin-top:var(--ds-space-100);padding:var(--ds-space-150);border-radius:var(--ds-radius-small);
  background:var(--ds-background-danger);color:var(--ds-text);font:var(--ds-font-body);}
.avance-export-body{text-align:center;background:var(--ds-surface-sunken);border-radius:var(--ds-radius-small);padding:var(--ds-space-200) !important;margin:0 var(--ds-space-300);}
.avance-export-status{padding:var(--ds-space-500);color:var(--ds-text-subtlest);}
.avance-export-img{max-width:100%;display:none;border:1px solid var(--ds-border);border-radius:var(--ds-radius-small);}

/* ── "Generar resumen": opciones y estados ── */
.rm-report-options{display:flex;flex-direction:column;gap:var(--ds-space-100);}
.rm-report-opt{display:flex;align-items:center;gap:var(--ds-space-150);width:100%;padding:var(--ds-space-150) var(--ds-space-200);text-align:left;cursor:pointer;
  border:none;border-radius:var(--ds-radius-small);box-shadow:inset 0 0 0 1px var(--ds-border);background:var(--ds-surface);
  font:var(--ds-font-body);transition:box-shadow var(--ds-motion),background var(--ds-motion);}
.rm-report-opt:hover{background:var(--ds-surface-hovered);}
.rm-report-opt.active{background:var(--ds-background-selected);box-shadow:inset 0 0 0 2px var(--ds-border-selected);}
.rm-report-opt-radio{flex:none;width:16px;height:16px;border-radius:50%;border:2px solid var(--ds-border-input);position:relative;background:var(--ds-surface);}
.rm-report-opt.active .rm-report-opt-radio{border-color:var(--ds-border-selected);}
.rm-report-opt.active .rm-report-opt-radio::after{content:"";position:absolute;inset:2px;border-radius:50%;background:var(--ds-background-selected-bold);}
.rm-report-opt-title{font:var(--ds-font-heading-xsmall);color:var(--ds-text);}
.rm-report-status{display:flex;align-items:center;gap:var(--ds-space-150);padding:var(--ds-space-100) 0;color:var(--ds-text-subtle);}
.rm-spinner{width:20px;height:20px;flex:none;border-radius:50%;border:2px solid var(--ds-background-neutral-hovered);border-top-color:var(--ds-background-brand-bold);animation:rm-spin .7s linear infinite;}
@keyframes rm-spin{to{transform:rotate(360deg);}}
.rm-report-error{padding:var(--ds-space-200);border-radius:var(--ds-radius-small);background:var(--ds-background-danger);color:var(--ds-text);}
.rm-report-ok{padding:var(--ds-space-200);border-radius:var(--ds-radius-small);background:var(--ds-background-success);color:var(--ds-text);font-weight:600;}
.rm-loading{display:flex;align-items:center;justify-content:center;gap:var(--ds-space-150);padding:var(--ds-space-500);color:var(--ds-text-subtle);}
.rm-load-error{padding:var(--ds-space-200);border-radius:var(--ds-radius-small);background:var(--ds-background-danger);color:var(--ds-text);}

/* ── Carrusel del resumen (HTML interactivo exportado) ──
   Fondo sunken para que las tarjetas blancas contrasten (a pedido de Darío,
   2026-09-22); la tipografía es la misma del portal (font stack del sistema). */
.rm-report-carousel{position:relative;height:100vh;background:var(--ds-surface-sunken);overflow:hidden;}
.rm-slide{display:none;height:100%;}
.rm-slide.active{display:block;}
.rm-slide-inner{height:100%;padding:64px 28px 64px;overflow-y:auto;display:flex;align-items:flex-start;justify-content:center;}
.rm-slide-fit{width:100%;max-width:1180px;transform-origin:top center;padding:var(--ds-space-300);background:var(--ds-surface);
  border-radius:var(--ds-radius-large);box-shadow:var(--ds-shadow-raised);}
.rm-slide-fit > .section:first-child{padding-top:0;}
/* Red de seguridad: en pantallas muy angostas, si aun así la tabla de avances
   no entra ni escalada, que sea desplazable en vez de recortarse. */
.rm-slide-fit .avances-wrap{overflow-x:auto;}
.rm-slide-fit .avances-table td,.rm-slide-fit .avances-table th{padding:var(--ds-space-075) var(--ds-space-100);}
.rm-slide-counter{position:fixed;top:18px;left:50%;transform:translateX(-50%);z-index:20;white-space:nowrap;
  padding:var(--ds-space-075) var(--ds-space-200);border-radius:var(--ds-radius-full);background:var(--ds-surface-overlay);box-shadow:var(--ds-shadow-raised);
  font:var(--ds-font-body-small);color:var(--ds-text-subtle);}
.rm-slide-nav{position:fixed;top:50%;transform:translateY(-50%);z-index:20;width:40px;height:40px;border-radius:50%;border:none;cursor:pointer;
  display:flex;align-items:center;justify-content:center;background:var(--ds-surface-overlay);box-shadow:var(--ds-shadow-overlay);
  font-size:22px;line-height:1;color:var(--ds-text-subtle);}
.rm-slide-nav:hover{background:var(--ds-surface-hovered);color:var(--ds-text);}
.rm-slide-nav:disabled{opacity:.35;cursor:not-allowed;}
.rm-slide-prev{left:20px;}
.rm-slide-next{right:20px;}
.rm-slide-dots{position:fixed;bottom:20px;left:50%;transform:translateX(-50%);display:flex;gap:var(--ds-space-100);z-index:20;}
.rm-dot{width:8px;height:8px;padding:0;border:none;border-radius:var(--ds-radius-full);cursor:pointer;background:var(--ds-background-neutral-hovered);transition:width .15s,background .15s;}
.rm-dot.active{width:24px;background:var(--ds-background-brand-bold);}

/* ── Reporte PDF: 3 slides apiladas, una por página ── */
#rm-report-print-root{display:none;}
@media print{
  /* Solo mientras se imprime el resumen (clase puesta por generarReportePDF),
     para no dejar en blanco el PDF de Seguimiento. */
  body.rm-printing > *:not(#rm-report-print-root){display:none !important;}
  html, body{height:auto !important;overflow:visible !important;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
  #rm-report-print-root{display:block !important;}
  .rm-print-slide{page-break-after:always;min-height:100vh;background:var(--ds-surface);-webkit-print-color-adjust:exact;print-color-adjust:exact;}
  .rm-print-slide:last-child{page-break-after:auto;}
  .rm-print-slide-label{padding:0 var(--ds-space-300);margin-top:var(--ds-space-200);font:var(--ds-font-body-small);color:var(--ds-text-subtlest);}
  .rm-print-slide-inner{padding:var(--ds-space-200) var(--ds-space-300) var(--ds-space-300);}
  .rm-print-slide-inner > .section:first-child{padding-top:0;}
  @page{ size:landscape; margin:12mm; }
}

/* ── Responsive ── */
@media (max-width: 880px){
  .pkg-body{flex-direction:column;}
  .col-scope{width:auto;border-right:none;border-bottom:1px solid var(--ds-border);}
  .pkg-head{flex-wrap:wrap;}
  .pkg-release{text-align:left;}
  .gantt:not(.gantt-in-modal) .g-head-spacer,.gantt:not(.gantt-in-modal) .g-task-col{width:150px;}
  .hito,.tr-row,.sp-row{flex-wrap:wrap;row-gap:var(--ds-space-050);}
  .tr-range,.sp-f{min-width:0;}
  .col{padding:var(--ds-space-200);}
  .pkg-head{padding:var(--ds-space-200);}
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
      mount.innerHTML = '<div class="rm-loading"><div class="rm-spinner"></div>Cargando datos del roadmap…</div>';
      fetchRoadmapNetwork(function(err, data){
        if (err) { mount.innerHTML = '<div class="rm-load-error">Error al cargar datos del roadmap: '+escapeHtml(err.message)+'</div>'; return; }
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

  // Semáforo del SPI: >=1 en línea, >=0.80 en riesgo, <0.80 atrasado.
  function spiLevel(spi){ if(spi===null||spi===undefined) return 'na'; if(spi>=1) return 'ok'; if(spi>=0.80) return 'warn'; return 'bad'; }

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
      var tagClass = 'modal-tag-pp'+p.id.replace('P','');
      var rows = renderGanttRows(p.gantt, p.color_class, axisStart, totalDays, p.progreso);
      return (i>0?'<div class="modal-pkg-separator"></div>':'')+
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
        +'<div class="tram-pkg-card-head"><span class="pkg-id-chip '+g.id.toLowerCase()+'">'+g.id+'</span>'+escapeHtml(g.nombre)+'</div>'
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

      return '<div class="sum-card '+String(p.id||'').toLowerCase()+'">'
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
        spiHtml = '<span class="rm-spi rm-spi-'+spiLevel(p.spi)+'">SPI '+p.spi.toFixed(2)+'</span>';
      }

      var progHtml = p.progreso > 0
        ? '<span class="pkg-prog">'+p.progreso+'% avance</span>'
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
      ? '<div class="rmb-item"><span class="rmb-k">SPI Global</span><span class="rmb-v spi-'+spiLevel(meta.spi_global)+'">'+meta.spi_global.toFixed(2)+'</span></div>'
      : '';
    var progHtml = meta.progreso_global !== undefined && meta.progreso_global !== null
      ? '<div class="rmb-item"><span class="rmb-k">Avance global</span><span class="rmb-v">'+meta.progreso_global+'%'
          +(meta.progreso_planif != null ? '<small>/ '+meta.progreso_planif+'% plan</small>' : '')
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
      if(err) DS.flag('No se pudo guardar el nuevo orden: '+err, 'error');
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
        +'<td class="avances-date">'+fechaCell+'</td>'
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
      +'<div class="avance-modal" style="width:min(880px,100%);">'
        +'<div class="avance-modal-head">'
          +'<span class="avance-modal-title">Vista previa — Avances de actividades</span>'
          +'<button class="avance-modal-close" id="btnCloseAvanceExport" type="button">✕</button>'
        +'</div>'
        +'<div class="avance-modal-body avance-export-body">'
          +'<div id="avanceExportStatus" class="avance-export-status">Generando imagen…</div>'
          +'<img id="avanceExportImg" class="avance-export-img" alt="Vista previa de Avances de actividades">'
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
          +'<div class="avance-field"><label>Fecha planeada <span class="avance-label-hint">— se completa del plan, editable</span></label><input type="date" id="avanceFecha"></div>'
          +'<div class="avance-field"><label>Asignado a <span class="avance-label-hint">— se completa del plan, editable</span></label><input type="text" id="avanceAsignado" placeholder="Ej. ISSS/GOES/TCA"></div>'
          +'<div class="avance-field"><label>Prioridad</label><select id="avancePrioridad">'
            +PRIORIDAD_AVANCE.map(function(c){ return '<option value="'+c+'"'+(c===PRIORIDAD_DEFAULT?' selected':'')+'>'+c+'</option>'; }).join('')
          +'</select></div>'
          +'<div class="avance-field"><label>Estatus</label><select id="avanceEstatus">'
            +ESTADOS_AVANCE.map(function(e){ return '<option value="'+e+'">'+e+'</option>'; }).join('')
          +'</select></div>'
          +'<div class="avance-field"><label>% de avance <span class="avance-label-hint">— se completa del plan, editable</span></label><input type="number" id="avancePct" min="0" max="100" value="0"></div>'
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
          DS.flag('La fecha no tiene un formato válido. Usá el selector de calendario o completá día, mes y año.', 'warning');
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
          if(err){ DS.flag('No se pudieron guardar los cambios: '+err, 'error'); return; }
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
        if(err){ DS.flag('No se pudo eliminar: '+err, 'error'); btn.disabled = false; return; }
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
    wrap.style.background = DS.token('--ds-surface','#FFFFFF');
    wrap.style.padding = AVANCES_EXPORT_PADDING+'px';
    wrap.style.fontFamily = DS.token('--ds-font-family-body','sans-serif');
    wrap.style.boxSizing = 'border-box';
    wrap.style.width = 'max-content';

    var title = document.createElement('div');
    title.textContent = 'Avances de actividades — Digitalización de Trámites ISSS';
    title.style.cssText = 'font-size:22px;font-weight:600;color:'+DS.token('--ds-text','#292A2E')+';margin-bottom:18px;white-space:nowrap;';
    wrap.appendChild(title);

    var rows = getSortedAvances();
    var rowsHtml = rows.length ? rows.map(function(r){
      var pct = parseInt(r.pct_avance)||0;
      return '<tr>'
        +'<td class="avances-origen-col">'+origenBadge(r.origen)+'</td>'
        +'<td>'+escapeHtml(r.actividad)+'</td>'
        +'<td>'+escapeHtml(r.asignado_a)+'</td>'
        +'<td><span class="est-badge '+prioridadBadgeClass(r.prioridad)+'">'+escapeHtml(r.prioridad||PRIORIDAD_DEFAULT)+'</span></td>'
        +'<td class="avances-date">'+fmtLong(r.fecha_planeada)+'</td>'
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
        window.html2canvas(wrap, { scale: built.scale, backgroundColor: DS.token('--ds-surface','#FFFFFF') }).then(function(canvas){
          document.body.removeChild(wrap);
          // Se redibuja sobre un canvas de tamaño exacto 3840×2160 — cualquier
          // pequeño desvío de medición queda absorbido acá, sin depender de que
          // html2canvas haya redondeado al pixel exacto.
          var finalCanvas = document.createElement('canvas');
          finalCanvas.width = AVANCES_EXPORT_W;
          finalCanvas.height = AVANCES_EXPORT_H;
          var ctx = finalCanvas.getContext('2d');
          ctx.fillStyle = DS.token('--ds-surface','#FFFFFF');
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
        +'<td class="avances-date">'+fmtLong(r.fecha_planeada)+'</td>'
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
  // Se embebe también modules/ds.js (tokens y componentes del design
  // system), que roadmap.js necesita y que en el portal carga index.html.
  var _roadmapScriptSourceCache = null;
  function fetchRoadmapScriptSource(cb){
    if(_roadmapScriptSourceCache){ cb(_roadmapScriptSourceCache); return; }
    function get(path){
      return fetch(path + '?v=' + Date.now())
        .then(function(r){ if(!r.ok) throw new Error('HTTP '+r.status); return r.text(); });
    }
    Promise.all([get('/modules/ds.js'), get('/modules/roadmap.js')])
      .then(function(srcs){ _roadmapScriptSourceCache = srcs.join('\n;\n'); cb(_roadmapScriptSourceCache); })
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
      +'<style>*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}'
        +'html,body{height:100%;}body{background:var(--ds-surface-sunken);color:var(--ds-text);font:var(--ds-font-body);-webkit-font-smoothing:antialiased;}'
        +'button{font-family:inherit;}.rm-report-boot{padding:80px 24px;text-align:center;color:#6B6E76;font:14px ui-sans-serif,-apple-system,"Segoe UI",sans-serif;}</style>'
      +'</head><body>'
      +'<div id="roadmap-report-mount"><div class="rm-report-boot">Cargando resumen…</div></div>'
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

  function generarReportePDF(){
    if(!_lastRoadmapData) return false;
    var existente = document.getElementById('rm-report-print-root');
    if(existente) existente.parentNode.removeChild(existente);
    var wrap = document.createElement('div');
    wrap.innerHTML = renderReportPrintStack(_lastRoadmapData.meta, _lastRoadmapData.paquetes, avancesSnapshotParaReporte());
    document.body.appendChild(wrap.firstChild);
    document.body.classList.add('rm-printing');
    var tituloOriginal = document.title;
    document.title = 'Resumen Roadmap ISSS-SYDT ' + new Date().toISOString().slice(0,10);
    function limpiar(){
      var root = document.getElementById('rm-report-print-root');
      if(root && root.parentNode) root.parentNode.removeChild(root);
      document.title = tituloOriginal;
      document.body.classList.remove('rm-printing');
      window.removeEventListener('afterprint', limpiar);
    }
    window.addEventListener('afterprint', limpiar);
    // Un tick para que el navegador aplique el layout del print root antes
    // de abrir el diálogo de impresión (la tipografía es la del sistema, no
    // hay que esperar a que cargue ninguna fuente web).
    setTimeout(function(){ window.print(); }, 50);
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
      '<div class="page-header page-header-row">'
        +'<div><div class="page-title">Roadmap de Producto</div>'
        +'<div class="page-desc">Plan de entregas, cronograma y avance de los paquetes productivos de la Digitalización de Trámites ISSS.</div></div>'
        +'<button class="rm-btn-report" id="rm-btn-generar-resumen" type="button">Generar resumen</button>'
      +'</div>'
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
    wrap.style.background = DS.token('--ds-surface','#FFFFFF');
    wrap.style.padding = EXPORT_PADDING+'px';
    wrap.style.paddingRight = (EXPORT_PADDING + EXPORT_RIGHT_LABEL_BUFFER)+'px';
    wrap.style.fontFamily = DS.token('--ds-font-family-body','sans-serif');

    var title = document.createElement('div');
    title.textContent = 'Cronograma completo de actividades — Digitalización de Trámites ISSS';
    title.style.cssText = 'font-size:16px;font-weight:600;color:'+DS.token('--ds-text','#292A2E')+';margin-bottom:14px;';
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
        window.html2canvas(wrap, { scale: built.scale, backgroundColor: DS.token('--ds-surface','#FFFFFF') }).then(function(canvas){
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
      if(err){ done(); DS.flag('No se pudieron cargar las librerías de exportación. Verificá tu conexión a internet e intentá de nuevo.', 'error'); return; }
      captureFullGanttCanvas(function(capErr, canvas){
        if(capErr){ done(); DS.flag('Ocurrió un error al generar la imagen del cronograma.', 'error'); return; }
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
