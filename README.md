# Vector52 Frontend

**Owners:** Omar + Jhamil

**Stack:** React, TypeScript, Vite y PWA

**Repositorio:** `v52-Chain/v52`

**Estado:** PWA Buildathon activa; Wallet Map y Audit Claim conectados al backend

## División

- Omar: arquitectura visual, shell, auditoría, evidencia, PWA y demo.
- Jhamil: Agent Access, estados MCP/x402/job y pruebas correspondientes.
- Compartido: tipos API, accesibilidad, design tokens e integración.

## Implementado

- landing detective bilingüe ES/EN;
- formulario real de wallet y grafo interactivo de ingresos/egresos;
- formulario de transaction/claim/subject conectado a `/v1/claim-audit`;
- cliente HTTP tipado;
- estados de health, loading, error y resultado;
- Evidence Inspector y Verdict Panel;
- validaciones y 8 pruebas;
- manifest y service worker PWA.

El frontend muestra fielmente `DEGRADED`, warnings y `UNKNOWN`. No interpreta esos estados como análisis terminado. El Core forense, `.v52`, HSK y Agent Access continúan pendientes de integración end-to-end.

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
