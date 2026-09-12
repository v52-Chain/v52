# Vector52 Frontend

**Owners:** Omar + Jhamil

**Stack:** React, TypeScript, Vite y PWA

**Repositorio:** `v52-Chain/v52`

**Estado:** frontend separado y listo para adaptar a la Buildathon

## División

- Omar: arquitectura visual, shell, auditoría, evidencia, PWA y demo.
- Jhamil: Agent Access, estados MCP/x402/job y pruebas correspondientes.
- Compartido: tipos API, accesibilidad, design tokens e integración.

## El baseline ya contiene

- formulario de transaction/claim/subject;
- cliente HTTP tipado;
- estados de health, loading, error y resultado;
- Evidence Inspector y Verdict Panel;
- validaciones y pruebas iniciales;
- manifest y service worker PWA.

Todavía está orientado a ETHOnline, Ethereum Mainnet y sponsors anteriores. Consultar [la guía de migración](MIGRACION-BUILDATHON.md) antes de modificarlo.

El backend ya no vive en este repositorio. Su fuente canónica es `v52-Chain/v52-backend`; toda comunicación usa el contrato HTTP/OpenAPI versionado.

## Ejecutar

```bash
pnpm install --frozen-lockfile
pnpm dev
```

El servidor de desarrollo envía `/healthz` y `/v1` a `http://127.0.0.1:8000`.

En producción, configurar solamente `VITE_API_BASE_URL` con la URL pública del backend. Nunca colocar claves de proveedores en variables Vite.

## Validar

```bash
pnpm typecheck
pnpm test
pnpm build
```

## Límites de seguridad

- Nunca colocar API keys de Alchemy, The Graph, Relayer o MCP en `VITE_*`.
- No persistir evidence/package sensibles en el service worker.
- No marcar MCP, HSK o x402 como `READY` basándose en mocks.
- Los links de explorer y receipts deben venir de respuestas verificadas del backend.
