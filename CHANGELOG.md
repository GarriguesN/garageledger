# Changelog

Todos los cambios notables de GarageLedger se documentan en este archivo.
Formato basado en [Keep a Changelog](https://keepachangelog.com/es/1.1.0/),
versionado semántico [SemVer](https://semver.org/lang/es/).

El proceso de actualización está definido en `AGENTS.md` (§6): **todo cambio
en el proyecto (código, config, docs, tooling) sube la versión en
`package.json` y añade su entrada aquí, en el mismo commit.**

## [Unreleased]

## [1.6.1] - 2026-08-03

### Tooling

- Nueva regla del proyecto: **cero emojis en la app** (UI, mensajes, toasts, empty states y novedades de `src/lib/changelog.ts`). Documentada en `AGENTS.md` §5.6.
- Limpiados los emojis de las categorías del changelog para que no se propaguen a la app.

## [1.6.0] - 2026-08-03

### Añadido

- Pantalla **Novedades** en el Perfil ("Acerca de") con el historial humanizado de versiones: cada funcionalidad visible se documenta como release note en `src/lib/changelog.ts`.
- La versión del "Acerca de" se lee ahora de `package.json` (fuente de verdad), en vez de la cadena hardcodeada que se quedaba desfasada.

### Tooling

- `deploy.sh` imprime la versión leyéndola de `package.json` automáticamente (adiós a la cifra hardcodeada).
- `AGENTS.md` §6: documentada la obligación de sincronizar las novedades de la app (`src/lib/changelog.ts`) con cada cambio.

## [1.5.0] - 2026-08-03

### Tooling

- Añadido `AGENTS.md`: guía para agentes de IA (arquitectura, convenciones y reglas del proyecto).
- Añadido `CHANGELOG.md` con formato *Keep a Changelog*.
- Sincronizada la versión de `package.json` con la que imprime `deploy.sh` (`v1.5.0`).

<!-- Historial previo al sistema de versionado: los cambios anteriores se
     referenciaban solo por ticket (p. ej. "Ticket 1.21") en los commits. -->
