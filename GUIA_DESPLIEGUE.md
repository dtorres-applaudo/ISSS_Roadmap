# Guía de despliegue — Portal ISSS-SYDT v2

## Estructura del paquete

```
portal/
├── firebase.json
├── .firebaserc              ← ponés tu ID de proyecto aquí
└── public/
    ├── index.html           ← shell del portal (no editar)
    ├── datos.js             ← ÚNICO archivo que editás (whitelist + Firebase config)
    └── modules/
        └── roadmap.js       ← módulo Roadmap (no editar)
```

---

## Paso 1 — Editar datos.js (DOS bloques)

Abrí `public/datos.js` en cualquier editor de texto.

**Bloque 1 — Firebase config** (del Paso 3 de la guía anterior):
```js
firebase: {
  apiKey: "REEMPLAZAR_API_KEY",
  authDomain: "REEMPLAZAR_PROYECTO.firebaseapp.com",
  projectId: "REEMPLAZAR_PROYECTO",
  appId: "REEMPLAZAR_APP_ID",
},
```

**Bloque 2 — Correos autorizados:**
```js
allowedEmails: [
  "dtorres@applaudostudios.com",
  // "otra.persona@dominio.com",
],
```

---

## Paso 2 — Activar autenticación en Firebase

En la consola de Firebase → Authentication → Sign-in method:
- **Google** → habilitar (ya lo tenías del deploy anterior).
- **Correo electrónico/Contraseña** → habilitar (nuevo).

Para crear cuentas de correo/contraseña:
Authentication → Users → Agregar usuario → correo + contraseña.

> Los usuarios de correo/contraseña Y los de Google usan la misma whitelist
> en datos.js. Ambos métodos están controlados por esa lista.

---

## Paso 3 — Editar .firebaserc

Abrí `.firebaserc` y reemplazá `REEMPLAZAR_PROYECTO` con tu ID de proyecto Firebase.

---

## Paso 4 — Publicar

Desde la terminal en la carpeta `portal`:

```
firebase deploy
```

---

## Cómo actualizar

**Agregar/quitar acceso:** editar `allowedEmails` en `datos.js` → `firebase deploy`.

**Actualizar datos del Roadmap:** pedirme el `roadmap.js` nuevo → reemplazarlo en
`public/modules/` → `firebase deploy`. La config de `datos.js` no se toca.

**Agregar módulos nuevos:** se agregan archivos en `public/modules/` y se actualiza
`index.html`. Te lo entrego listo para reemplazar.

