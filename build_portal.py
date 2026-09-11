# -*- coding: utf-8 -*-
# build_portal.py — genera el shell del portal ISSS-SYDT

font_faces = open('/home/claude/portal/_font_faces.txt').read()

CSS = font_faces + r"""
/* ── RESET ─────────────────────────────────────────── */
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
html,body{height:100%;overflow:hidden;}
body{font-family:'Geist',sans-serif;font-size:14px;line-height:1.5;
  background:var(--bg);color:var(--text-body);}
button{font-family:inherit;cursor:pointer;border:none;background:none;}
input{font-family:inherit;}
a{text-decoration:none;color:inherit;}

/* ── Z11 TOKENS ─────────────────────────────────────── */
:root{
  /* GoesBlue */
  --gb-50:#F0F4FA; --gb-100:#DCE6F4; --gb-150:#C8D8EE;
  --gb-200:#B0C8E8; --gb-300:#7EA8D8; --gb-350:#6494CC;
  --gb-400:#4A80C0; --gb-450:#3370B4; --gb-500:#2060A8;
  --gb-600:#1A508E; --gb-700:#144074; --gb-800:#0E305A;
  --gb-900:#082040; --gb-950:#041020;
  /* GoesGray */
  --gg-50:#F8F9FA; --gg-100:#F0F2F4; --gg-150:#E4E8EC;
  --gg-200:#D4DAE0; --gg-300:#B8C2CC; --gg-350:#9DAAB6;
  --gg-400:#8292A0; --gg-450:#677888; --gg-500:#506070;
  --gg-550:#3E4F5E; --gg-600:#304050; --gg-700:#223040;
  --gg-800:#162030; --gg-900:#0C1420; --gg-950:#060A10;
  /* semantic */
  --blue-50:#EFF6FF; --blue-100:#DBEAFE; --blue-500:#3B82F6;
  --blue-600:#2563EB; --blue-700:#1D4ED8;
  --emerald-50:#ECFDF5; --emerald-500:#10B981; --emerald-700:#047857;
  --amber-50:#FFFBEB; --amber-500:#F59E0B; --amber-700:#B45309;
  --red-50:#FEF2F2; --red-500:#EF4444; --red-600:#DC2626; --red-700:#B91C1C;
  --violet-50:#F5F3FF; --violet-700:#6D28D9;
  /* surfaces */
  --bg:var(--gg-150);
  --surface:var(--gg-50);
  --surface-raised:#FFFFFF;
  --border:var(--gg-200);
  --border-quiet:var(--gg-150);
  /* text */
  --text-heading:var(--gg-700);
  --text-body:var(--gg-550);
  --text-quiet:var(--gg-450);
  --text-on-solid:#FFFFFF;
  /* sidebar */
  --sb-bg:var(--gb-800);
  --sb-text:rgba(255,255,255,.75);
  --sb-text-active:#FFFFFF;
  --sb-hover:rgba(255,255,255,.08);
  --sb-active:rgba(255,255,255,.15);
  --sb-border:rgba(255,255,255,.10);
  --sb-width:240px;
  --sb-width-collapsed:60px;
  /* transitions */
  --t:.18s ease;
}

/* ── LOGIN SCREEN ───────────────────────────────────── */
#login-screen{
  position:fixed;inset:0;display:flex;z-index:1000;
  background:var(--gg-150);
}
#login-screen.hidden{display:none;}

.login-left{
  flex:0 0 42%;background:var(--gb-800);
  display:flex;flex-direction:column;justify-content:space-between;
  padding:52px 48px;position:relative;overflow:hidden;
}
.login-left::after{
  content:"";position:absolute;right:-120px;bottom:-120px;
  width:400px;height:400px;border-radius:50%;
  background:rgba(255,255,255,.04);pointer-events:none;
}
.login-kicker{
  font-size:11px;letter-spacing:.16em;text-transform:uppercase;
  color:rgba(255,255,255,.45);margin-bottom:32px;
}
.login-title{
  font-size:40px;font-weight:700;color:#fff;line-height:1.15;
  letter-spacing:-.02em;
}
.login-sub{
  margin-top:16px;font-size:15px;color:rgba(255,255,255,.55);
  max-width:300px;line-height:1.6;
}
.login-footer{
  font-size:11px;color:rgba(255,255,255,.3);
  font-family:'Geist Mono',monospace;
}

.login-right{
  flex:1;display:flex;align-items:center;justify-content:center;
  padding:40px;background:var(--gg-50);
}
.login-card{
  width:100%;max-width:420px;background:#fff;
  border-radius:16px;padding:40px;
  box-shadow:0 4px 6px -1px rgba(0,0,0,.07),0 12px 24px -4px rgba(0,0,0,.08);
}
.login-card-title{
  font-size:22px;font-weight:700;color:var(--text-heading);margin-bottom:6px;
}
.login-card-sub{
  font-size:13px;color:var(--text-quiet);margin-bottom:28px;
}

/* form */
.form-group{margin-bottom:18px;}
.form-label{
  display:block;font-size:12px;font-weight:600;
  color:var(--text-body);margin-bottom:6px;letter-spacing:.02em;
}
.form-input{
  width:100%;padding:10px 13px;font-size:14px;font-family:'Geist',sans-serif;
  border:1px solid var(--border);border-radius:8px;
  color:var(--text-heading);background:#fff;
  transition:border-color var(--t),box-shadow var(--t);outline:none;
}
.form-input:focus{
  border-color:var(--blue-500);
  box-shadow:0 0 0 3px rgba(59,130,246,.15);
}
.input-wrap{position:relative;}
.input-wrap .form-input{padding-right:42px;}
.toggle-pass{
  position:absolute;right:12px;top:50%;transform:translateY(-50%);
  color:var(--text-quiet);font-size:16px;cursor:pointer;
  background:none;border:none;padding:4px;
  transition:color var(--t);
}
.toggle-pass:hover{color:var(--text-body);}

.btn-primary{
  width:100%;padding:11px;font-size:14px;font-weight:600;
  color:#fff;background:var(--blue-600);border-radius:8px;
  transition:background var(--t),box-shadow var(--t);
}
.btn-primary:hover{background:var(--blue-700);box-shadow:0 4px 12px rgba(37,99,235,.3);}
.btn-primary:active{background:var(--blue-700);}

.divider{
  display:flex;align-items:center;gap:12px;
  margin:20px 0;color:var(--text-quiet);font-size:12px;
}
.divider::before,.divider::after{content:"";flex:1;height:1px;background:var(--border);}

.btn-google{
  width:100%;display:flex;align-items:center;justify-content:center;gap:10px;
  padding:10px;font-size:14px;font-weight:500;color:var(--text-heading);
  background:#fff;border:1px solid var(--border);border-radius:8px;
  transition:background var(--t),border-color var(--t);
}
.btn-google:hover{background:var(--gg-50);border-color:var(--gg-350);}
.btn-google svg{width:18px;height:18px;flex:none;}

.login-error{
  margin-top:14px;padding:10px 13px;border-radius:8px;
  background:var(--red-50);border:1px solid #FECACA;
  font-size:12px;color:var(--red-700);display:none;
}
.login-error.show{display:block;}

/* ── APP SHELL ──────────────────────────────────────── */
#app-shell{display:flex;height:100vh;overflow:hidden;}
#app-shell.hidden{display:none;}

/* SIDEBAR */
#sidebar{
  width:var(--sb-width);flex:none;
  background:var(--sb-bg);
  display:flex;flex-direction:column;
  transition:width var(--t);overflow:hidden;
  position:relative;z-index:100;
}
#sidebar.collapsed{width:var(--sb-width-collapsed);}

.sb-header{
  display:flex;align-items:center;justify-content:space-between;
  padding:18px 16px 14px;border-bottom:1px solid var(--sb-border);
  min-height:64px;
}
.sb-logo{
  display:flex;align-items:center;gap:10px;
  white-space:nowrap;overflow:hidden;
}
.sb-logo-icon{
  width:32px;height:32px;border-radius:8px;
  background:rgba(255,255,255,.15);flex:none;
  display:flex;align-items:center;justify-content:center;
  font-size:13px;font-weight:700;color:#fff;letter-spacing:-.02em;
}
.sb-logo-text{
  font-size:13px;font-weight:600;color:#fff;
  opacity:1;transition:opacity var(--t),width var(--t);
  white-space:nowrap;
}
#sidebar.collapsed .sb-logo-text{opacity:0;width:0;overflow:hidden;}

.sb-collapse-btn{
  width:28px;height:28px;border-radius:6px;flex:none;
  display:flex;align-items:center;justify-content:center;
  color:var(--sb-text);transition:background var(--t),color var(--t),transform var(--t);
}
.sb-collapse-btn:hover{background:var(--sb-hover);color:#fff;}
#sidebar.collapsed .sb-collapse-btn{transform:rotate(180deg);}

.sb-nav{flex:1;overflow-y:auto;overflow-x:hidden;padding:12px 0;}
.sb-nav::-webkit-scrollbar{width:4px;}
.sb-nav::-webkit-scrollbar-track{background:transparent;}
.sb-nav::-webkit-scrollbar-thumb{background:rgba(255,255,255,.15);border-radius:2px;}

.sb-section{margin-bottom:4px;}
.sb-section-label{
  font-size:10px;letter-spacing:.12em;text-transform:uppercase;
  color:rgba(255,255,255,.3);padding:8px 16px 4px;
  white-space:nowrap;overflow:hidden;
  transition:opacity var(--t);
}
#sidebar.collapsed .sb-section-label{opacity:0;}

.sb-item{
  display:flex;align-items:center;gap:10px;
  padding:9px 16px;cursor:pointer;
  color:var(--sb-text);font-size:13px;font-weight:500;
  transition:background var(--t),color var(--t);
  white-space:nowrap;position:relative;
  border-radius:0;
}
.sb-item:hover{background:var(--sb-hover);color:var(--sb-text-active);}
.sb-item.active{background:var(--sb-active);color:var(--sb-text-active);}
.sb-item.active::before{
  content:"";position:absolute;left:0;top:6px;bottom:6px;
  width:3px;border-radius:0 3px 3px 0;background:#fff;
}
.sb-icon{
  width:20px;height:20px;flex:none;display:flex;
  align-items:center;justify-content:center;font-size:15px;
}
.sb-label{
  flex:1;transition:opacity var(--t),width var(--t);
  overflow:hidden;
}
#sidebar.collapsed .sb-label{opacity:0;width:0;}
.sb-chevron{
  font-size:11px;color:rgba(255,255,255,.3);
  transition:transform var(--t),opacity var(--t);flex:none;
}
#sidebar.collapsed .sb-chevron{opacity:0;}
.sb-item.open .sb-chevron{transform:rotate(90deg);}

/* sub-items */
.sb-subnav{
  overflow:hidden;max-height:0;
  transition:max-height .22s ease;
}
.sb-subnav.open{max-height:200px;}
.sb-subitem{
  display:flex;align-items:center;gap:10px;
  padding:7px 16px 7px 46px;cursor:pointer;
  color:rgba(255,255,255,.55);font-size:12.5px;
  transition:background var(--t),color var(--t);
  white-space:nowrap;position:relative;
}
.sb-subitem:hover{background:var(--sb-hover);color:#fff;}
.sb-subitem.active{color:#fff;}
.sb-subitem.active::after{
  content:"";position:absolute;left:30px;top:50%;
  transform:translateY(-50%);width:5px;height:5px;
  border-radius:50%;background:#fff;
}
#sidebar.collapsed .sb-subnav{display:none;}

/* tooltip on collapsed */
#sidebar.collapsed .sb-item{justify-content:center;padding:9px 0;}
#sidebar.collapsed .sb-item.active::before{display:none;}

.sb-footer{
  padding:14px 16px;border-top:1px solid var(--sb-border);
}
.sb-user{
  display:flex;align-items:center;gap:10px;
  padding:8px;border-radius:8px;cursor:pointer;
  transition:background var(--t);
}
.sb-user:hover{background:var(--sb-hover);}
.sb-avatar{
  width:32px;height:32px;border-radius:50%;flex:none;
  background:rgba(255,255,255,.2);
  display:flex;align-items:center;justify-content:center;
  font-size:13px;font-weight:600;color:#fff;
}
.sb-user-info{overflow:hidden;transition:opacity var(--t),width var(--t);}
#sidebar.collapsed .sb-user-info{opacity:0;width:0;}
.sb-user-email{
  font-size:11px;color:rgba(255,255,255,.55);
  overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:150px;
}
.sb-signout{
  font-size:11px;color:rgba(255,255,255,.35);
  margin-top:1px;transition:color var(--t);
}
.sb-user:hover .sb-signout{color:rgba(255,255,255,.7);}

/* MAIN CONTENT */
#main{flex:1;display:flex;flex-direction:column;overflow:hidden;background:var(--bg);}
.main-topbar{
  height:64px;flex:none;background:var(--surface-raised);
  border-bottom:1px solid var(--border-quiet);
  display:flex;align-items:center;padding:0 28px;
  gap:16px;
}
.topbar-breadcrumb{
  display:flex;align-items:center;gap:8px;
  font-size:13px;color:var(--text-quiet);
}
.topbar-breadcrumb .current{color:var(--text-heading);font-weight:600;}
.topbar-sep{color:var(--gg-300);}

#page-content{flex:1;overflow-y:auto;padding:28px;}
#page-content::-webkit-scrollbar{width:6px;}
#page-content::-webkit-scrollbar-track{background:transparent;}
#page-content::-webkit-scrollbar-thumb{background:var(--gg-300);border-radius:3px;}

/* ── PAGES ──────────────────────────────────────────── */
.page{display:none;}
.page.active{display:block;}

/* page header */
.page-header{margin-bottom:24px;}
.page-title{font-size:24px;font-weight:700;color:var(--text-heading);letter-spacing:-.02em;}
.page-desc{font-size:13px;color:var(--text-quiet);margin-top:4px;}

/* placeholder card */
.placeholder-card{
  background:var(--surface-raised);border:1px solid var(--border-quiet);
  border-radius:12px;padding:48px 32px;text-align:center;
}
.placeholder-icon{font-size:40px;margin-bottom:16px;opacity:.4;}
.placeholder-title{font-size:16px;font-weight:600;color:var(--text-heading);margin-bottom:8px;}
.placeholder-text{font-size:13px;color:var(--text-quiet);max-width:400px;margin:0 auto;}
.placeholder-badge{
  display:inline-block;margin-top:16px;padding:4px 12px;border-radius:20px;
  background:var(--amber-50);color:var(--amber-700);
  font-size:11px;font-weight:600;letter-spacing:.04em;
}
"""

HTML = r"""<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Portal ISSS-SYDT</title>
<style>__CSS__</style>
<script src="datos.js"></script>
</head>
<body>

<!-- ═══════════ LOGIN SCREEN ═══════════ -->
<div id="login-screen">
  <div class="login-left">
    <div>
      <div class="login-kicker">Portal Institucional · SYDT</div>
      <div class="login-title">Plataforma Digital de Trámites del ISSS</div>
      <div class="login-sub">Sistema de seguimiento y gestión del proyecto de digitalización.</div>
    </div>
    <div class="login-footer">ISSS · GOES · Applaudo Studios · 2026</div>
  </div>

  <div class="login-right">
    <div class="login-card">
      <div class="login-card-title">Iniciar sesión</div>
      <div class="login-card-sub">Introducí tus credenciales para acceder al portal.</div>

      <div class="form-group">
        <label class="form-label" for="inp-email">Correo electrónico</label>
        <input class="form-input" id="inp-email" type="email"
          placeholder="correo@ejemplo.com" autocomplete="username">
      </div>
      <div class="form-group">
        <label class="form-label" for="inp-pass">Contraseña</label>
        <div class="input-wrap">
          <input class="form-input" id="inp-pass" type="password"
            placeholder="Introducé su contraseña" autocomplete="current-password">
          <button class="toggle-pass" id="toggle-pass" tabindex="-1"
            aria-label="Mostrar contraseña">👁</button>
        </div>
      </div>

      <button class="btn-primary" id="btn-email-login">Iniciar sesión</button>

      <div class="divider">o</div>

      <button class="btn-google" id="btn-google-login">
        <svg viewBox="0 0 48 48">
          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
          <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
        </svg>
        Continuar con Google
      </button>

      <div class="login-error" id="login-error"></div>
    </div>
  </div>
</div>

<!-- ═══════════ APP SHELL ═══════════ -->
<div id="app-shell" class="hidden">

  <!-- SIDEBAR -->
  <nav id="sidebar">
    <div class="sb-header">
      <div class="sb-logo">
        <div class="sb-logo-icon">IS</div>
        <div class="sb-logo-text">ISSS-SYDT</div>
      </div>
      <button class="sb-collapse-btn" id="sb-toggle" title="Colapsar menú">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M10.5 3L5.5 8l5 5" stroke="currentColor" stroke-width="1.5"
            stroke-linecap="round" stroke-linejoin="round" fill="none"/>
        </svg>
      </button>
    </div>

    <div class="sb-nav">
      <!-- Roadmap -->
      <div class="sb-section">
        <div class="sb-item active" data-page="roadmap">
          <span class="sb-icon">🗺</span>
          <span class="sb-label">Roadmap</span>
        </div>
      </div>

      <!-- Seguimiento -->
      <div class="sb-section">
        <div class="sb-item" id="nav-seguimiento" data-group="seguimiento">
          <span class="sb-icon">📊</span>
          <span class="sb-label">Seguimiento</span>
          <span class="sb-chevron">›</span>
        </div>
        <div class="sb-subnav" id="subnav-seguimiento">
          <div class="sb-subitem" data-page="seg-resumen">Resumen ejecutivo</div>
          <div class="sb-subitem" data-page="seg-paquetes">Detalle por paquete</div>
        </div>
      </div>

      <!-- DevOps -->
      <div class="sb-section">
        <div class="sb-item" id="nav-devops" data-group="devops">
          <span class="sb-icon">⚙️</span>
          <span class="sb-label">Desarrollo</span>
          <span class="sb-chevron">›</span>
        </div>
        <div class="sb-subnav" id="subnav-devops">
          <div class="sb-subitem" data-page="dev-ejecutivo">Vista ejecutiva</div>
          <div class="sb-subitem" data-page="dev-operativo">Vista operativa</div>
        </div>
      </div>
    </div>

    <div class="sb-footer">
      <div class="sb-user" id="sb-signout-btn" title="Cerrar sesión">
        <div class="sb-avatar" id="sb-avatar">?</div>
        <div class="sb-user-info">
          <div class="sb-user-email" id="sb-user-email">—</div>
          <div class="sb-signout">Cerrar sesión</div>
        </div>
      </div>
    </div>
  </nav>

  <!-- MAIN -->
  <div id="main">
    <div class="main-topbar">
      <div class="topbar-breadcrumb">
        <span id="bc-module">Portal</span>
        <span class="topbar-sep" id="bc-sep" style="display:none">›</span>
        <span class="current" id="bc-page"></span>
      </div>
    </div>
    <div id="page-content">

      <!-- PAGE: Roadmap -->
      <div class="page active" id="page-roadmap">
        <div class="page-header">
          <div class="page-title">Roadmap de Producto</div>
          <div class="page-desc">Hoja de ruta de entrega por paquetes productivos.</div>
        </div>
        <div id="roadmap-mount"></div>
      </div>

      <!-- PAGE: Seguimiento — Resumen -->
      <div class="page" id="page-seg-resumen">
        <div class="page-header">
          <div class="page-title">Seguimiento — Resumen ejecutivo</div>
          <div class="page-desc">Indicadores clave del plan de trabajo.</div>
        </div>
        <div class="placeholder-card">
          <div class="placeholder-icon">📈</div>
          <div class="placeholder-title">Módulo en construcción</div>
          <div class="placeholder-text">
            Los indicadores SPI/CPI, progreso real vs esperado, tareas atrasadas
            y próximas tareas estarán disponibles en la siguiente iteración.
          </div>
          <div class="placeholder-badge">PRÓXIMAMENTE</div>
        </div>
      </div>

      <!-- PAGE: Seguimiento — Paquetes -->
      <div class="page" id="page-seg-paquetes">
        <div class="page-header">
          <div class="page-title">Seguimiento — Detalle por paquete</div>
          <div class="page-desc">Estado por paquete según el plan de trabajo.</div>
        </div>
        <div class="placeholder-card">
          <div class="placeholder-icon">📦</div>
          <div class="placeholder-title">Módulo en construcción</div>
          <div class="placeholder-text">
            Tabla de avance real vs esperado por paquete (PP1/PP2/PP3)
            con semáforo RAG y listado de tareas atrasadas.
          </div>
          <div class="placeholder-badge">PRÓXIMAMENTE</div>
        </div>
      </div>

      <!-- PAGE: DevOps — Ejecutivo -->
      <div class="page" id="page-dev-ejecutivo">
        <div class="page-header">
          <div class="page-title">Desarrollo — Vista ejecutiva</div>
          <div class="page-desc">KPIs del sprint, avance acumulado y estado por HU.</div>
        </div>
        <div class="placeholder-card">
          <div class="placeholder-icon">⚙️</div>
          <div class="placeholder-title">Pendiente de conexión con Azure DevOps</div>
          <div class="placeholder-text">
            Esta vista se activará cuando el webhook de n8n esté configurado.
            Mostrará KPIs del sprint actual, gráfica de avance acumulado por paquete
            y estado por HU.
          </div>
          <div class="placeholder-badge">PENDIENTE INTEGRACIÓN</div>
        </div>
      </div>

      <!-- PAGE: DevOps — Operativo -->
      <div class="page" id="page-dev-operativo">
        <div class="page-header">
          <div class="page-title">Desarrollo — Vista operativa</div>
          <div class="page-desc">Detalle de HUs y tareas del sprint activo.</div>
        </div>
        <div class="placeholder-card">
          <div class="placeholder-icon">🔧</div>
          <div class="placeholder-title">Pendiente de conexión con Azure DevOps</div>
          <div class="placeholder-text">
            Tabla de HUs del sprint activo con filtros por paquete y estado,
            y detalle expandible de tareas hijas.
          </div>
          <div class="placeholder-badge">PENDIENTE INTEGRACIÓN</div>
        </div>
      </div>

    </div><!-- /page-content -->
  </div><!-- /main -->
</div><!-- /app-shell -->

<!-- Firebase SDK -->
<script type="module">
import { initializeApp }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup,
         signInWithEmailAndPassword, signOut, onAuthStateChanged }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

const cfg  = window.PORTAL_CONFIG;
const app  = initializeApp(cfg.firebase);
const auth = getAuth(app);
const gp   = new GoogleAuthProvider();
gp.setCustomParameters({ prompt: 'select_account' });

const allowed = (email) =>
  cfg.allowedEmails.map(e => e.toLowerCase()).includes((email||'').toLowerCase());

// ── DOM refs ──
const loginScreen = document.getElementById('login-screen');
const appShell    = document.getElementById('app-shell');
const loginError  = document.getElementById('login-error');
const sbUserEmail = document.getElementById('sb-user-email');
const sbAvatar    = document.getElementById('sb-avatar');

function showError(msg){ loginError.textContent=msg; loginError.classList.add('show'); }
function clearError(){ loginError.classList.remove('show'); }

// email/pass login
document.getElementById('btn-email-login').addEventListener('click', async () => {
  clearError();
  const email = document.getElementById('inp-email').value.trim();
  const pass  = document.getElementById('inp-pass').value;
  if(!email||!pass){ showError('Completá ambos campos.'); return; }
  try { await signInWithEmailAndPassword(auth, email, pass); }
  catch(e){
    const msgs = { 'auth/user-not-found':'Usuario no encontrado.',
      'auth/wrong-password':'Contraseña incorrecta.',
      'auth/invalid-credential':'Credenciales inválidas.',
      'auth/too-many-requests':'Demasiados intentos. Intentá más tarde.' };
    showError(msgs[e.code]||'Error al iniciar sesión.');
  }
});

// enter key
document.getElementById('inp-pass').addEventListener('keydown', e => {
  if(e.key==='Enter') document.getElementById('btn-email-login').click();
});

// toggle password visibility
document.getElementById('toggle-pass').addEventListener('click', () => {
  const inp = document.getElementById('inp-pass');
  inp.type = inp.type==='password' ? 'text' : 'password';
});

// Google login
document.getElementById('btn-google-login').addEventListener('click', async () => {
  clearError();
  try { await signInWithPopup(auth, gp); }
  catch(e){ showError('No se pudo iniciar sesión con Google.'); }
});

// sign out
document.getElementById('sb-signout-btn').addEventListener('click', () => signOut(auth));

// auth state
onAuthStateChanged(auth, user => {
  if(user && allowed(user.email)){
    loginScreen.classList.add('hidden');
    appShell.classList.remove('hidden');
    sbUserEmail.textContent = user.email;
    sbAvatar.textContent = (user.email[0]||'?').toUpperCase();
    if(window.__roadmapLoaded) return;
    window.__roadmapLoaded = true;
    loadRoadmap();
  } else if(user && !allowed(user.email)){
    signOut(auth);
    loginScreen.classList.remove('hidden');
    appShell.classList.add('hidden');
    showError(`Tu cuenta (${user.email}) no está autorizada.`);
  } else {
    loginScreen.classList.remove('hidden');
    appShell.classList.add('hidden');
  }
});

// ── SIDEBAR LOGIC ──────────────────────────────────
const sidebar  = document.getElementById('sidebar');
const sbToggle = document.getElementById('sb-toggle');

sbToggle.addEventListener('click', () => sidebar.classList.toggle('collapsed'));

const pages = {
  roadmap:       { title:'Roadmap',            module:'Roadmap de Producto' },
  'seg-resumen': { title:'Resumen ejecutivo',  module:'Seguimiento' },
  'seg-paquetes':{ title:'Detalle por paquete',module:'Seguimiento' },
  'dev-ejecutivo':{ title:'Vista ejecutiva',   module:'Desarrollo' },
  'dev-operativo':{ title:'Vista operativa',   module:'Desarrollo' },
};

function navigate(pageId){
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.sb-item').forEach(i => i.classList.remove('active'));
  document.querySelectorAll('.sb-subitem').forEach(i => i.classList.remove('active'));
  const pg = document.getElementById('page-'+pageId);
  if(pg) pg.classList.add('active');
  // breadcrumb
  const info = pages[pageId]||{};
  document.getElementById('bc-module').textContent = info.module||'Portal';
  const sep  = document.getElementById('bc-sep');
  const bcp  = document.getElementById('bc-page');
  if(info.title && info.title !== info.module){
    sep.style.display=''; bcp.textContent=info.title;
  } else { sep.style.display='none'; bcp.textContent=''; }
  // mark active
  const direct = document.querySelector(`.sb-item[data-page="${pageId}"]`);
  if(direct) direct.classList.add('active');
  const sub = document.querySelector(`.sb-subitem[data-page="${pageId}"]`);
  if(sub) sub.classList.add('active');
}

// group toggles
['seguimiento','devops'].forEach(group => {
  const btn    = document.getElementById('nav-'+group);
  const subnav = document.getElementById('subnav-'+group);
  btn.addEventListener('click', () => {
    const isOpen = subnav.classList.contains('open');
    // close all
    document.querySelectorAll('.sb-subnav').forEach(s => {
      s.classList.remove('open');
      s.previousElementSibling?.classList.remove('open');
    });
    if(!isOpen){ subnav.classList.add('open'); btn.classList.add('open'); }
    // navigate to first subpage
    if(!isOpen){
      const first = subnav.querySelector('.sb-subitem');
      if(first) navigate(first.dataset.page);
    }
  });
});

// direct nav items
document.querySelectorAll('.sb-item[data-page]').forEach(item => {
  item.addEventListener('click', () => navigate(item.dataset.page));
});
document.querySelectorAll('.sb-subitem').forEach(item => {
  item.addEventListener('click', e => { e.stopPropagation(); navigate(item.dataset.page); });
});

// ── ROADMAP LOADER ─────────────────────────────────
function loadRoadmap(){
  const s = document.createElement('script');
  s.src = 'modules/roadmap.js';
  document.head.appendChild(s);
}
</script>
</body>
</html>"""

css = CSS.replace('{','{{').replace('}','}}')
html_final = HTML.replace('__CSS__', CSS)

with open('/home/claude/portal/public/index.html','w',encoding='utf-8') as f:
    f.write(html_final)
print('index.html:', len(html_final), 'bytes')
