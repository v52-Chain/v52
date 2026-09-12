# Vector52 Frontend

**Owners:** Omar + Jhamil

**Stack:** React, TypeScript, Vite y PWA

**Repositorio:** `v52-Chain/v52`

**Estado:** PWA Buildathon activa; acceso web con Reown y sesión firmada, Wallet Map, filtros temporales y Audit Claim conectados al backend

## División

- Omar: arquitectura visual, shell, auditoría, evidencia, PWA y demo.
- Jhamil: Agent Access, estados MCP/x402/job y pruebas correspondientes.
- Compartido: tipos API, accesibilidad, design tokens e integración.

## Implementado

- shell visual light tipo aplicación de escritorio, bilingüe ES/EN y con una sola navegación;
- formulario real de wallet y grafo interactivo de ingresos/egresos;
- periodos 7/30/90 días, histórico reciente o rango personalizado enviados al backend;
- iconografía accesible con Lucide React y lienzo forense con `react-force-graph`;
- formulario de transaction/claim/subject conectado a `/v1/claim-audit`;
- cliente HTTP tipado;
- estados de health, loading, error y resultado;
- Evidence Inspector y Verdict Panel;
- validaciones y 11 pruebas;
- manifest y service worker PWA.
- Reown AppKit con WalletConnect/Wagmi/Viem;
- autenticación real por challenge firmado, nonce de un solo uso y sesión temporal;
- canal visual MCP/x402 alimentado por `/v1/agent/capabilities`;
- separación estricta entre wallet conectada y wallet investigada.

El frontend muestra fielmente `DEGRADED`, warnings y `UNKNOWN`. No interpreta esos estados como análisis terminado. El Core forense, `.v52`, HSK y Agent Access continúan pendientes de integración end-to-end.

El backend ya no vive en este repositorio. Su fuente canónica es `v52-Chain/v52-backend`; toda comunicación usa el contrato HTTP/OpenAPI versionado.

## Ejecutar

```bash
pnpm install --frozen-lockfile
pnpm dev
```

El servidor de desarrollo envía `/healthz` y `/v1` a `http://127.0.0.1:8000`.

El filtro temporal no es cosmético: usa `from_date` y `to_date` en el endpoint de wallet. La API devuelve en `limits` la ventana aplicada y el límite de paginación, y expone cualquier limitación como `warning`.

Configurar:

```dotenv
VITE_API_BASE_URL=http://127.0.0.1:8000
VITE_REOWN_PROJECT_ID=<project-id-publico-de-reown>
```

El Project ID de Reown identifica el proyecto cliente y puede ser público. En producción, registrar el dominio real en Reown Verify y usar el mismo origen en el backend. Nunca colocar claves de proveedores, tokens del Relayer o private keys en variables Vite.

## Dos canales, un Core

| Canal | Identidad/autorización | Endpoint |
|---|---|---|
| Persona en PWA | Reown conecta; challenge firmado crea bearer session | `POST /v1/web/investigations/wallet-flow` |
| Agente MCP | Política/signer local; x402 paga antes de ejecutar | `POST /v1/agent/investigations/wallet-flow` |

El navegador nunca auto-paga ni custodia llaves. El agente no recibe una ruta secreta ni un Core diferente. El contrato completo está en [`ACCESS-CONTRACT.md`](../../ACCESS-CONTRACT.md).

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
