# Migración ETHOnline → Ethereum Bolivia Buildathon

## Decisión

Se reutiliza el baseline técnico porque pertenece al mismo equipo. El frontend quedó en `v52` y FastAPI/Core en `v52-backend`. No se copiará la narrativa, sponsors ni estados de implementación de ETHOnline como si fueran resultados de la Buildathon.

## Diferencias detectadas

| Baseline ETHOnline | Buildathon requerida | Acción |
|---|---|---|
| Solo `chain_id: 1` | Ethereum + Avalanche + HSK | ampliar schema sin strings libres |
| Ethereum RPC genérico | Alchemy Ethereum/Avalanche + RPC HSK | adapters backend por chain |
| Uniswap/The Graph | The Graph + HSK subgraph | conservar provider y agregar red/deployment |
| Sponsors Uniswap/Bazantic | Avalanche/HSK/ShanhaiWoo | reemplazar UI y documentación |
| Sin interfaz MCP | MCP-ready Agent Access | vista + contrato de estados, sin emular MCP |
| Auditoría síncrona | operación pesada pagada/job | `POST audit` + `job_id` + polling/SSE |
| Sin x402 visible | challenge/verify/settle | UI de pago conectada al backend |
| Sin anclaje HSK | manifest hash on-chain | exportar → anclar → verificar |

## Orden de implementación

1. Congelar schemas compartidos y generar fixtures.
2. Franco integra Alchemy y estados de provider.
3. Saúl conecta The Graph, x402 y contratos/subgraph.
4. Omar adapta shell, redes y flujo forense.
5. Jhamil implementa Agent Access UI y estados MCP/x402.
6. Integrar un solo golden path real.
7. Fijar los commits compatibles de `v52`, `v52-backend` y repos satélite en el release manifest.

## Contrato MCP-ready de la UI

La PWA no será cliente MCP con secretos. Consumirá una capa backend que expone:

```text
GET  /v1/integrations/mcp/status
GET  /v1/integrations/mcp/tools
POST /v1/agent-jobs
GET  /v1/agent-jobs/{job_id}
```

Estados mínimos:

```text
UNAVAILABLE → READY → PAYMENT_REQUIRED → PAYMENT_PENDING
            → RUNNING → COMPLETED / PARTIAL / FAILED
```

La implementación real del servidor/protocolo vive en `v52-mcp`; el frontend solo presenta capacidades confirmadas por el backend.

## Gate antes del primer push

- [ ] Búsqueda de secretos y revisión de `.gitignore`.
- [ ] Frontend: typecheck, tests y build.
- [ ] `v52-backend`: pytest y Ruff.
- [ ] README ya no afirma integraciones no verificadas.
- [ ] Se conserva atribución/procedencia del código reutilizado.
- [ ] Omar y Jhamil aprueban el contrato Agent Access.
- [ ] Franco aprueba endpoints consumidos.
- [ ] Saúl entrega redes, direcciones y comprobantes reales.
