// ============================================================
// datos.js — Configuración editable del portal ISSS-SYDT
// ============================================================

// === AUTENTICACIÓN ===
// Agrega / quita correos autorizados aquí.
// Un correo debe estar en esta lista para poder acceder,
// sin importar si usa Google o correo/contraseña.
window.PORTAL_CONFIG = {

  allowedEmails: [
    "dtorres@applaudostudios.com",
    "cvmejia@applaudostudios.com",
    "martha.ballesteros@goes.gob.sv",
    "aalvarez@techsolutions-sv.com",
    "mjovel@applaudostudios.com",
    "ccosta@tca.com",
    "ebernal@tca.com",
    "kmhernandez@techsolutions-sv.com",
    "crivera@applaudostudios.com",
    "magreda@applaudostudios.com"
    // "nombre@dominio.com",
  ],

  // === FIREBASE CONFIG ===
  // Completar con los valores de tu proyecto Firebase (Consola → Configuración del proyecto → Tus apps)
  firebase: {
    apiKey: "AIzaSyA3c3pTdkJzhBvTZQW2_3cj3aBEb2Wal-8",
    authDomain: "product-roadmap-isss.firebaseapp.com",
    projectId: "product-roadmap-isss",
    appId: "1:689353985666:web:f013809df9154c1434ae9b",
  },
  sheets: {
    seguimientoUrl: 'https://script.google.com/macros/s/AKfycbwCVLbNXKnN1zFz1Sm6SmAHfxhJaJrVYxyrdyGe5OEhBkXLPRqFimLCmylCObzX6-im/exec',
    observacionesUrl:  'https://script.google.com/macros/s/AKfycbwCVLbNXKnN1zFz1Sm6SmAHfxhJaJrVYxyrdyGe5OEhBkXLPRqFimLCmylCObzX6-im/exec'
  }

}
