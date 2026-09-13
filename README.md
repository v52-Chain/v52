# Vector52 Frontend

**Owners:** Omar + Jhamil

**Stack:** React, TypeScript, Vite y PWA

**Repositorio:** `v52-Chain/v52`

**Estado:** PWA Buildathon activa; onboarding, workspace forense, acceso web con Reown, Wallet Map, filtros temporales y Audit Claim conectados al backend desplegado.

## División

- Omar: arquitectura visual, shell, auditoría, evidencia, PWA y demo.
- Jhamil: Agent Access, estados MCP/x402/job y pruebas correspondientes.
- Compartido: tipos API, accesibilidad, design tokens e integración.

## Implementado

- experiencia inicial automática de tres escenas, bilingüe y sin scroll, separada de la herramienta operativa;
- shell visual light tipo aplicación de escritorio, con una sola navegación y rutas directas;
- página independiente para explicar problema, método, límites y diferencia frente a un explorador;
- formulario real de wallet y grafo interactivo de ingresos/egresos;
- periodos 7/30/90 días, histórico reciente o rango personalizado enviados al backend;
- iconografía accesible con Lucide React y lienzo forense con `react-force-graph`;
- formulario de transaction/claim/subject conectado a `/v1/claim-audit`;
- cliente HTTP tipado;
- estados de health, loading, error y resultado;
- Evidence Inspector y Verdict Panel;
- validaciones y 21 pruebas;
- manifest y service worker PWA.
- Reown AppKit con WalletConnect/Wagmi/Viem;
- autenticación real por challenge firmado, nonce de un solo uso y sesión temporal;
- Access Hub premium con acceso Web Wallet y carrusel MCP para Claude, Codex, OpenCode, Cursor u otro cliente;
- pago x402 dinámico por investigación: el frontend lee precio, activo y receptor del backend, limita el importe firmado y nunca usa valores secretos del navegador;
- canal visual MCP/x402 alimentado por el handshake real del backend: `/v1/agent/capabilities`, `/v1/integrations/mcp/status` y `/v1/integrations/mcp/tools`;
- separación estricta entre wallet conectada y wallet investigada.

El frontend muestra fielmente `DEGRADED`, warnings y `UNKNOWN`. No interpreta esos estados como análisis terminado ni promete recuperar fondos. El Core forense completo, `.v52` y HSK continúan como ampliaciones posteriores al MVP.

El backend ya no vive en este repositorio. Su fuente canónica es `v52-Chain/v52-backend`; toda comunicación usa el contrato HTTP/OpenAPI versionado.

## Ejecutar

```bash
pnpm install --frozen-lockfile
pnpm dev
```

El cliente usa rutas same-origin. Vite redirige `/healthz` y `/v1` al destino indicado por `VITE_API_PROXY_TARGET` durante desarrollo, y `vercel.json` redirige esas mismas rutas a Render en producción. Esto evita depender de CORS en el navegador. `VITE_API_BASE_URL` solo se usa si se quiere omitir deliberadamente ese proxy.

El filtro temporal no es cosmético: usa `from_date` y `to_date` en el endpoint de wallet. La API devuelve en `limits` la ventana aplicada y el límite de paginación, y expone cualquier limitación como `warning`.

Configurar:

```dotenv
VITE_API_BASE_URL=
VITE_API_PROXY_TARGET=https://v52-backend.onrender.com
VITE_REOWN_PROJECT_ID=<project-id-publico-de-reown>
VITE_MCP_SERVER_URL=https://v52-mcp-production.up.railway.app/mcp
```

El Project ID de Reown identifica el proyecto cliente y puede ser público. En producción, registrar el dominio real en Reown Verify y usar el mismo origen en el backend. Nunca colocar claves de proveedores, tokens del Relayer o private keys en variables Vite.

## Conexión Frontend → Backend → MCP

La PWA no invoca herramientas MCP ni firma pagos del agente. Su botón **Connect → MCP Agent** consulta al backend y presenta el estado real del servicio, las tools descubiertas, el precio anunciado y la wallet receptora. El carrusel ofrece Claude, Codex, OpenCode, Cursor y un cliente genérico.

Para que cada usuario pague desde su propia wallet de agente, el modo recomendado ejecuta `v52-mcp` localmente en `http://127.0.0.1:8080/mcp`, con una wallet burner de Fuji configurada en su `.env` ignorado por Git. La clave nunca se escribe en la PWA, en un chat ni en un prompt. El endpoint Railway se conserva como **gateway del equipo** para una demo controlada: mientras tenga una única `X402_AGENT_PRIVATE_KEY`, todos sus callers comparten el payer del servidor y no constituye una solución multiusuario.

```text
PWA Vector52
  └─ GET /v1/agent/capabilities
  └─ GET /v1/integrations/mcp/status
  └─ GET /v1/integrations/mcp/tools
          ↓
Backend Vector52 (Render)
          ↓ handshake sin pago
MCP Vector52 (Railway /mcp)
          ↓ solo al ejecutar vector52_wallet_flow
x402 en Fuji → Backend → Alchemy
```

El panel se actualiza al abrirlo, manualmente y cada 30 segundos mientras permanece visible. Solo muestra `SERVICE READY` y habilita el prompt de prueba cuando el backend confirma `state: READY`, publica `pay_to` y anuncia un precio. `UNAVAILABLE`, `UNKNOWN` o errores de red nunca se convierten visualmente en éxito.

La investigación web sigue un canal separado y directo:

```text
Connect
  → mostrar cuenta, red, saldo USDC y saldo AVAX (sin firma ni pago)
Investigar
  → crear o comprobar sesión firmada (sin pago)
  → validar capabilities: red, token, precio y pay_to
  → cambiar a Avalanche Fuji
  → recibir HTTP 402
  → MetaMask firma la autorización exacta de USDC
  → OpenZeppelin Relayer verifica/liquida
  → backend ejecuta Alchemy
  → frontend dibuja el grafo
```

La ruta `POST /v1/web/investigations/wallet-flow` y la ruta del agente están protegidas por el mismo middleware. El cliente bloquea peticiones simultáneas, fija el máximo al importe anunciado por capabilities y exige un recibo de settlement antes de aceptar el resultado.

Configuración de despliegue necesaria:

| Servicio | Variable | Valor Buildathon |
|---|---|---|
| Vercel, repositorio `v52` | `VITE_API_BASE_URL` | eliminar o dejar vacío; `vercel.json` hace proxy same-origin |
| Vercel, repositorio `v52` | `VITE_MCP_SERVER_URL` | `https://v52-mcp-production.up.railway.app/mcp` |
| Render, repositorio `v52-backend` | `V52_MCP_SERVER_URL` | `https://v52-mcp-production.up.railway.app/mcp` |

Después de cambiar la variable de Render se debe redesplegar el backend. La verificación final, sin pagos, es:

```bash
curl https://v52-backend.onrender.com/v1/integrations/mcp/status
curl https://v52-backend.onrender.com/v1/integrations/mcp/tools
```

El primero debe devolver `state: READY`; el segundo debe listar al menos `vector52_status` y `vector52_wallet_flow`. La URL pública puede aparecer en el frontend, pero cualquier bearer token o credencial permanece en secretos del servidor; la private key del usuario permanece únicamente en su signer local o en una futura wallet delegada, nunca en el MCP público.

## Rutas del producto

| Ruta | Propósito |
|---|---|
| `/` | Vista previa automática de tres escenas; no expone navegación operativa |
| `/app` | Workspace de investigación, consulta y resultados del grafo |
| `/project` | Problema, método, límites, posicionamiento y propuesta de valor |

La PWA inicia directamente en `/app`; una visita web nueva comienza en `/`.

## Dos canales, un Core

| Canal | Identidad/autorización | Endpoint |
|---|---|---|
| Persona en PWA | Reown conecta; una firma crea sesión y otra autorización exacta paga cada investigación en Fuji | `GET /v1/web/capabilities`, `POST /v1/auth/wallet/challenge`, `POST /v1/auth/wallet/verify`, `POST /v1/web/investigations/wallet-flow` |
| Agente MCP | Política/signer local; x402 paga antes de ejecutar | `POST /v1/agent/investigations/wallet-flow` |

La detección y el único reintento del `402` son automáticos, pero la wallet siempre muestra la autorización criptográfica del pago. El navegador no custodia llaves. El agente no recibe una ruta secreta ni un Core diferente. El contrato completo está en [`ACCESS-CONTRACT.md`](../../ACCESS-CONTRACT.md).

## Enfoque de producto

Vector52 está pensado para una persona o analista que necesita seguir fondos después de un robo, hackeo o transferencia sospechosa. La entrada es una dirección pública y un periodo; la salida reúne flujo, fuentes y límites verificables. Puede ayudar a identificar que una ruta llega a una entidad o exchange conocido, pero no identifica automáticamente a una persona, no atraviesa toda frontera de privacidad y no garantiza recuperar activos.

No sustituye a Arkham u otros exploradores: los usa como posibles fuentes complementarias. El diferencial propuesto es convertir actividad pública en un expediente reproducible, consultable en lenguaje natural y cuidadoso al separar evidencia, hipótesis y conclusión.

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
