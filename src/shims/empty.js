// Shim vacío para builtins de Node (fs/path/crypto) que @techstark/opencv-js
// referencia bajo una rama `if (ENVIRONMENT_IS_NODE)` que nunca se ejecuta en
// el navegador — pero Turbopack igualmente intenta resolver el require()
// estáticamente. Ver next.config.ts (turbopack.resolveAlias, condición
// "browser"), mismo problema que documenta el README de @techstark/opencv-js
// para webpack (`resolve.fallback`).
module.exports = {};
