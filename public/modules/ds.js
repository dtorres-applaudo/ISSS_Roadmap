// modules/ds.js — Design system del Portal ISSS-SYDT
//
// Tokens y componentes base inspirados en el Atlassian Design System
// (https://atlassian.design), con el navy GOES como color de marca en lugar
// del azul Atlassian. Es la ÚNICA fuente de colores/tipografía/espaciado del
// portal: index.html, roadmap.js y seguimiento.js solo consumen var(--ds-*).
//
// Se carga desde index.html antes que los módulos y además se embebe tal cual
// en los reportes HTML standalone (Roadmap "Generar resumen" y Seguimiento
// "Generar reporte"), por eso no depende de nada del shell. Se inyecta una
// sola vez aunque se ejecute más de una vez.
//
// Valores tomados de @atlaskit/tokens (tema light). Los colores con canal
// alpha van como rgba() y no #RRGGBBAA porque html2canvas 1.4 (exportes PNG/
// PDF) no siempre interpreta hex de 8 dígitos.
(function(){
  if (window.__DS_LOADED__) return;
  window.__DS_LOADED__ = true;

  var CSS = `
:root{
  /* ── Tipografía ── */
  --ds-font-family-body: ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Ubuntu, "Helvetica Neue", sans-serif;
  --ds-font-family-code: ui-monospace, Menlo, "Segoe UI Mono", "Ubuntu Mono", monospace;
  --ds-font-heading-xlarge: 600 1.8125rem/2rem var(--ds-font-family-body);
  --ds-font-heading-large:  600 1.5rem/1.75rem var(--ds-font-family-body);
  --ds-font-heading-medium: 600 1.25rem/1.5rem var(--ds-font-family-body);
  --ds-font-heading-small:  600 1rem/1.25rem var(--ds-font-family-body);
  --ds-font-heading-xsmall: 600 .875rem/1rem var(--ds-font-family-body);
  --ds-font-heading-xxsmall:600 .75rem/1rem var(--ds-font-family-body);
  --ds-font-body:           400 .875rem/1.25rem var(--ds-font-family-body);
  --ds-font-body-small:     400 .75rem/1rem var(--ds-font-family-body);
  --ds-font-metric-large:   653 1.75rem/2rem var(--ds-font-family-body);
  --ds-font-metric-medium:  653 1.5rem/1.75rem var(--ds-font-family-body);

  /* ── Espaciado (escala ADS de 8px) ── */
  --ds-space-025:2px; --ds-space-050:4px; --ds-space-075:6px; --ds-space-100:8px;
  --ds-space-150:12px; --ds-space-200:16px; --ds-space-250:20px; --ds-space-300:24px;
  --ds-space-400:32px; --ds-space-500:40px; --ds-space-600:48px;

  /* ── Forma ── */
  --ds-radius-xsmall:2px; --ds-radius-small:4px; --ds-radius-medium:6px;
  --ds-radius-large:8px; --ds-radius-xlarge:12px; --ds-radius-full:999px;

  /* ── Texto ── */
  --ds-text:#292A2E;
  --ds-text-subtle:#505258;
  --ds-text-subtlest:#6B6E76;
  --ds-text-disabled:rgba(8,15,33,.29);
  --ds-text-inverse:#FFFFFF;
  --ds-text-brand:#1E4B7A;
  --ds-text-selected:#1E4B7A;
  --ds-link:#1E4B7A;
  --ds-text-danger:#AE2E24;
  --ds-text-warning:#9E4C00;
  --ds-text-success:#216E4E;
  --ds-text-information:#1558BC;
  --ds-text-discovery:#803FA5;

  /* ── Superficies (elevation) ── */
  --ds-surface:#FFFFFF;
  --ds-surface-hovered:#F0F1F2;
  --ds-surface-sunken:#F8F8F8;
  --ds-surface-raised:#FFFFFF;
  --ds-surface-overlay:#FFFFFF;
  --ds-shadow-raised:0 1px 1px rgba(30,31,33,.25), 0 0 1px rgba(30,31,33,.31);
  --ds-shadow-overlay:0 8px 12px rgba(30,31,33,.15), 0 0 1px rgba(30,31,33,.31);
  --ds-blanket:rgba(5,12,31,.46);

  /* ── Bordes ── */
  --ds-border:rgba(11,18,14,.14);
  --ds-border-bold:#7D818A;
  --ds-border-input:#8C8F97;
  --ds-border-focused:#2C6196;
  --ds-border-selected:#1E4B7A;
  --ds-border-brand:#1E4B7A;
  --ds-border-danger:#E2483D;
  --ds-border-warning:#E06C00;
  --ds-border-success:#22A06B;
  --ds-border-information:#357DE8;

  /* ── Fondos ── */
  --ds-background-neutral:rgba(5,21,36,.06);
  --ds-background-neutral-hovered:rgba(11,18,14,.14);
  --ds-background-neutral-pressed:rgba(8,15,33,.29);
  --ds-background-neutral-subtle-hovered:rgba(5,21,36,.06);
  --ds-background-neutral-subtle-pressed:rgba(11,18,14,.14);
  --ds-background-neutral-bold:#292A2E;
  --ds-background-neutral-bold-hovered:#3B3D42;
  --ds-background-input:#FFFFFF;
  --ds-background-input-hovered:#F8F8F8;
  --ds-background-disabled:rgba(5,21,36,.06);
  /* marca = navy GOES */
  --ds-background-brand-bold:#1E4B7A;
  --ds-background-brand-bold-hovered:#16385F;
  --ds-background-brand-bold-pressed:#102A4C;
  --ds-background-brand-boldest:#0B1F3A;
  --ds-background-brand-subtlest:#E7EEF6;
  --ds-background-selected:#E7EEF6;
  --ds-background-selected-hovered:#D5E1EF;
  --ds-background-selected-bold:#1E4B7A;
  /* semánticos */
  --ds-background-success:#DCFFF1;       --ds-background-success-bold:#1F845A;
  --ds-background-warning:#FFF5DB;       --ds-background-warning-bold:#FBC828;
  --ds-background-danger:#FFECEB;        --ds-background-danger-bold:#C9372C;
  --ds-background-information:#E9F2FE;   --ds-background-information-bold:#1868DB;
  --ds-background-discovery:#F8EEFE;     --ds-background-discovery-bold:#964AC0;

  /* ── Acentos por paquete (P1 navy GOES · P2 teal · P3 púrpura) ── */
  --ds-pkg-1:#1E4B7A; --ds-pkg-1-subtle:#D5E1EF;
  --ds-pkg-2:#227D9B; --ds-pkg-2-subtle:#C6EDFB;
  --ds-pkg-3:#964AC0; --ds-pkg-3-subtle:#EED7FC;

  /* ── Gráficos ── */
  --ds-chart-neutral:#8C8F97;
  --ds-chart-brand:#1E4B7A;
  --ds-chart-success:#22A06B;
  --ds-chart-warning:#F68909;
  --ds-chart-danger:#E2483D;
  --ds-chart-information:#357DE8;
  --ds-chart-information-subtle:#8FB8F6;
  --ds-chart-warning-subtle:#FBD779;
  --ds-chart-gray:#6B6E76;
  --ds-chart-gray-subtle:#B7B9BE;
  --ds-chart-grid:rgba(11,18,14,.08);

  /* ── Lozenges (appearance subtle / bold) ── */
  --ds-lz-default-bg:#DDDEE1;    --ds-lz-default-text:#292A2E;
  --ds-lz-inprogress-bg:#CFE1FD; --ds-lz-inprogress-text:#123263;
  --ds-lz-success-bg:#BAF3DB;    --ds-lz-success-text:#164B35;
  --ds-lz-moved-bg:#FCE4A6;      --ds-lz-moved-text:#693200;
  --ds-lz-removed-bg:#FFD5D2;    --ds-lz-removed-text:#5D1F1A;
  --ds-lz-new-bg:#EED7FC;        --ds-lz-new-text:#48245D;
  --ds-lz-removed-bold-bg:#C9372C;

  --ds-motion:.15s ease;
}

/* ── Base ── */
.ds-scope, .ds-scope *{box-sizing:border-box;}

/* ── Botón ── */
.ds-btn{display:inline-flex;align-items:center;justify-content:center;gap:var(--ds-space-075);
  height:32px;padding:0 var(--ds-space-150);border:none;border-radius:var(--ds-radius-small);
  font:500 .875rem/1 var(--ds-font-family-body);white-space:nowrap;cursor:pointer;text-decoration:none;
  background:var(--ds-background-neutral);color:var(--ds-text-subtle);
  transition:background var(--ds-motion),box-shadow var(--ds-motion);}
.ds-btn:hover{background:var(--ds-background-neutral-hovered);color:var(--ds-text);}
.ds-btn:active{background:var(--ds-background-neutral-pressed);}
.ds-btn:focus-visible{outline:2px solid var(--ds-border-focused);outline-offset:2px;}
.ds-btn:disabled,.ds-btn[aria-disabled="true"]{background:var(--ds-background-disabled);color:var(--ds-text-disabled);cursor:not-allowed;}
.ds-btn--primary{background:var(--ds-background-brand-bold);color:var(--ds-text-inverse);}
.ds-btn--primary:hover{background:var(--ds-background-brand-bold-hovered);color:var(--ds-text-inverse);}
.ds-btn--primary:active{background:var(--ds-background-brand-bold-pressed);}
.ds-btn--subtle{background:transparent;}
.ds-btn--subtle:hover{background:var(--ds-background-neutral-subtle-hovered);}
.ds-btn--danger{background:var(--ds-background-danger-bold);color:var(--ds-text-inverse);}
.ds-btn--icon{width:32px;padding:0;}
.ds-btn--compact{height:24px;padding:0 var(--ds-space-075);font-size:.8125rem;}
.ds-btn--full{width:100%;height:40px;}

/* ── Lozenge ── */
.ds-lozenge{display:inline-flex;align-items:center;max-width:100%;padding:0 var(--ds-space-050);
  height:16px;border-radius:var(--ds-radius-xsmall);
  font:700 .6875rem/16px var(--ds-font-family-body);text-transform:uppercase;letter-spacing:0;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;vertical-align:middle;
  background:var(--ds-lz-default-bg);color:var(--ds-lz-default-text);}
.ds-lozenge--inprogress{background:var(--ds-lz-inprogress-bg);color:var(--ds-lz-inprogress-text);}
.ds-lozenge--success{background:var(--ds-lz-success-bg);color:var(--ds-lz-success-text);}
.ds-lozenge--moved{background:var(--ds-lz-moved-bg);color:var(--ds-lz-moved-text);}
.ds-lozenge--removed{background:var(--ds-lz-removed-bg);color:var(--ds-lz-removed-text);}
.ds-lozenge--new{background:var(--ds-lz-new-bg);color:var(--ds-lz-new-text);}
.ds-lozenge--bold{background:#6B6E76;color:#FFFFFF;}
.ds-lozenge--inprogress.ds-lozenge--bold{background:#1868DB;color:#FFFFFF;}
.ds-lozenge--success.ds-lozenge--bold{background:#1F845A;color:#FFFFFF;}
.ds-lozenge--moved.ds-lozenge--bold{background:#FBC828;color:#292A2E;}
.ds-lozenge--removed.ds-lozenge--bold{background:var(--ds-lz-removed-bold-bg);color:var(--ds-text-inverse);}
.ds-lozenge--new.ds-lozenge--bold{background:#964AC0;color:#FFFFFF;}

/* ── Tarjeta ── */
.ds-card{background:var(--ds-surface-raised);border-radius:var(--ds-radius-large);box-shadow:var(--ds-shadow-raised);}

/* ── Campos ── */
.ds-textfield{width:100%;height:40px;padding:0 var(--ds-space-100);
  font:var(--ds-font-body);color:var(--ds-text);
  background:var(--ds-background-input);border:1px solid var(--ds-border-input);border-radius:var(--ds-radius-small);
  outline:none;transition:background var(--ds-motion),border-color var(--ds-motion),box-shadow var(--ds-motion);}
.ds-textfield:hover{background:var(--ds-background-input-hovered);}
.ds-textfield:focus{background:var(--ds-background-input);border-color:var(--ds-border-focused);box-shadow:inset 0 0 0 1px var(--ds-border-focused);}
.ds-textfield::placeholder{color:var(--ds-text-subtlest);}
.ds-label{display:block;margin-bottom:var(--ds-space-050);font:var(--ds-font-heading-xxsmall);color:var(--ds-text-subtle);}

/* ── Section message ── */
.ds-section-message{display:flex;gap:var(--ds-space-100);align-items:flex-start;padding:var(--ds-space-200);
  border-radius:var(--ds-radius-small);font:var(--ds-font-body);color:var(--ds-text);background:var(--ds-background-information);}
.ds-section-message::before{content:"i";flex:none;width:18px;height:18px;border-radius:50%;
  display:inline-flex;align-items:center;justify-content:center;font:700 11px/1 var(--ds-font-family-body);
  color:#fff;background:var(--ds-background-information-bold);margin-top:1px;}
.ds-section-message--danger{background:var(--ds-background-danger);}
.ds-section-message--danger::before{content:"!";background:var(--ds-background-danger-bold);}
.ds-section-message--success{background:var(--ds-background-success);}
.ds-section-message--success::before{content:"✓";background:var(--ds-background-success-bold);}
.ds-section-message--warning{background:var(--ds-background-warning);}
.ds-section-message--warning::before{content:"!";background:#E06C00;}

/* ── Spinner ── */
.ds-spinner{width:20px;height:20px;flex:none;border-radius:50%;border:2px solid var(--ds-background-neutral-hovered);
  border-top-color:var(--ds-background-brand-bold);animation:ds-spin .7s linear infinite;}
@keyframes ds-spin{to{transform:rotate(360deg);}}

/* ── Empty state ── */
.ds-empty-state{max-width:464px;margin:var(--ds-space-600) auto;text-align:center;padding:0 var(--ds-space-200);}
.ds-empty-state-icon{width:72px;height:72px;margin:0 auto var(--ds-space-300);border-radius:var(--ds-radius-xlarge);
  display:flex;align-items:center;justify-content:center;background:var(--ds-background-brand-subtlest);color:var(--ds-text-brand);}
.ds-empty-state-icon svg{width:36px;height:36px;}
.ds-empty-state-title{font:var(--ds-font-heading-medium);color:var(--ds-text);margin-bottom:var(--ds-space-200);}
.ds-empty-state-text{font:var(--ds-font-body);color:var(--ds-text-subtle);}
.ds-empty-state .ds-lozenge{margin-top:var(--ds-space-300);}

/* ── Flag (toast) ── */
.ds-flags{position:fixed;left:var(--ds-space-300);bottom:var(--ds-space-300);z-index:10000;
  display:flex;flex-direction:column;gap:var(--ds-space-100);pointer-events:none;}
.ds-flag{pointer-events:auto;width:min(400px,calc(100vw - 48px));display:flex;gap:var(--ds-space-200);align-items:flex-start;
  padding:var(--ds-space-200);background:var(--ds-surface-overlay);border-radius:var(--ds-radius-small);
  box-shadow:var(--ds-shadow-overlay);font:var(--ds-font-body);color:var(--ds-text);
  animation:ds-flag-in .2s ease;}
.ds-flag-icon{flex:none;width:20px;height:20px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;
  font:700 12px/1 var(--ds-font-family-body);color:#fff;background:var(--ds-background-information-bold);}
.ds-flag--error .ds-flag-icon{background:var(--ds-background-danger-bold);}
.ds-flag--warning .ds-flag-icon{background:#E06C00;}
.ds-flag--success .ds-flag-icon{background:var(--ds-background-success-bold);}
.ds-flag-msg{flex:1;min-width:0;padding-top:1px;}
.ds-flag-close{flex:none;width:24px;height:24px;border:none;background:none;border-radius:var(--ds-radius-small);
  color:var(--ds-text-subtle);cursor:pointer;font-size:14px;line-height:1;}
.ds-flag-close:hover{background:var(--ds-background-neutral-subtle-hovered);}
@keyframes ds-flag-in{from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:none;}}
`;

  var style = document.createElement('style');
  style.id = 'ds-core';
  style.textContent = CSS;
  (document.head || document.documentElement).appendChild(style);

  // DS.flag(msg, tipo) — reemplazo no bloqueante de alert(). tipo:
  // 'info' (default) | 'success' | 'warning' | 'error'. Se cierra solo a los 6s.
  function flag(msg, tipo){
    tipo = tipo || 'info';
    var host = document.getElementById('ds-flags');
    if(!host){
      host = document.createElement('div');
      host.id = 'ds-flags';
      host.className = 'ds-flags';
      host.setAttribute('role','status');
      host.setAttribute('aria-live','polite');
      document.body.appendChild(host);
    }
    var el = document.createElement('div');
    el.className = 'ds-flag ds-flag--'+tipo;
    var icon = { success:'✓', warning:'!', error:'!', info:'i' }[tipo] || 'i';
    el.innerHTML = '<span class="ds-flag-icon" aria-hidden="true">'+icon+'</span>'
      +'<div class="ds-flag-msg"></div>'
      +'<button type="button" class="ds-flag-close" aria-label="Cerrar">✕</button>';
    el.querySelector('.ds-flag-msg').textContent = msg;
    function cerrar(){ if(el.parentNode) el.parentNode.removeChild(el); }
    el.querySelector('.ds-flag-close').addEventListener('click', cerrar);
    host.appendChild(el);
    setTimeout(cerrar, 6000);
  }

  // Lee un token como string (para canvas, que no entiende var()).
  function token(name, fallback){
    try {
      var v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
      return v || fallback;
    } catch(e){ return fallback; }
  }

  window.DS = { flag: flag, token: token };
})();
