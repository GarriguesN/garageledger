import type { NextConfig } from "next";
import path from "path";

// audit:S-4 — Cabeceras de seguridad para toda la app. Antes solo las emitía
// el endpoint de descarga de adjuntos, y solo `nosniff`.
//
// Sobre la CSP: lo ideal sería `script-src 'self' 'nonce-…'`, pero eso obliga
// a generar un nonce por petición en el middleware y a pasárselo a Next. Con
// 'unsafe-inline' la CSP no frena un XSS reflejado —cosa que aquí no aplica:
// no hay `dangerouslySetInnerHTML` con datos del usuario y React escapa por
// defecto— pero sí frena lo que de verdad puede pasar en esta app: que un
// script cargue desde un dominio de fuera o que los datos se exfiltren a un
// tercero, porque `default-src`, `connect-src` e `img-src` se quedan en 'self'.
//
// 'wasm-unsafe-eval' es imprescindible: el escaneo de documentos carga
// @techstark/opencv-js y pdfjs-dist, que compilan WebAssembly.
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const SECURITY_HEADERS = [
  { key: "Content-Security-Policy", value: CSP },
  // frame-ancestors ya lo cubre en navegadores modernos; DENY sigue valiendo
  // para los que solo entienden esta.
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Las URLs llevan ids de coche y de gasto: no tienen por qué viajar a
  // ningún sitio de fuera en el Referer.
  { key: "Referrer-Policy", value: "same-origin" },
  // La app no usa cámara vía getUserMedia (el escaneo va por <input file>),
  // ni micrófono, ni geolocalización. Se apagan para que no puedan usarse.
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
];

const nextConfig: NextConfig = {
  output: "standalone",
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
  turbopack: {
    // Without this, Turbopack infers the workspace root from the nearest
    // lockfile above this dir and can walk into unrelated sibling projects.
    root: path.join(__dirname),
    // @techstark/opencv-js (used by the document scan flow, lazy-loaded from
    // UploadDocumentModal) has a dead `if (ENVIRONMENT_IS_NODE) require("fs")`
    // branch that never runs in the browser, but Turbopack still tries to
    // resolve it statically. Same fix the package's README documents for
    // webpack (`resolve.fallback: { fs: false, path: false, crypto: false }`),
    // ported to Turbopack's condition-based resolveAlias.
    resolveAlias: {
      fs: { browser: "./src/shims/empty.js" },
      path: { browser: "./src/shims/empty.js" },
      crypto: { browser: "./src/shims/empty.js" },
    },
  },
};

export default nextConfig;
