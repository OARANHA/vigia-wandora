# ADR-0001 — Flowise via Phoenix OTLP

Data: 2026-10-02
Status: Aceito

## Contexto

O Vigia já aceita OTLP como porta principal de telemetria. Há demanda comercial imediata de clientes com agentes em Flowise.

Na versão Flowise 3.x analisada, métricas OpenTelemetry e tracing de agente são caminhos distintos. O tracing detalhado da camada Analytics pode usar o exporter Phoenix, que envia OTLP protobuf com atributos OpenInference.

## Decisão

Para Flowise compatível com Phoenix, usar o caminho:

```text
Flowise -> Analytics -> Phoenix -> Vigia
```

O ingest do Vigia aceita a compatibilidade necessária para esse exporter:

- autenticação Phoenix quando o header padrão não está presente;
- resolução de projeto pelo atributo OpenInference de projeto;
- validação normal do projeto dentro da organização autenticada.

Não criar fork, sidecar ou adapter por cliente para esse caso.

Business Events continuam sendo a camada própria do Vigia para ligar tracing técnico a resultado de negócio.

## Validação

PR #81 passou em testes unitários, heavy, integração, validação de Compose e builds de imagens.

Em produção:

- `ingest` e `workers` estão na revisão `d6c6bfc27885847c3ed01e8f9e9fc57f959921a8`;
- stack Portainer ficou ativa com `ConfigHash=d6c6bfc27885847c3ed01e8f9e9fc57f959921a8`;
- migrations encerrou com código 0;
- smoke Phoenix enviou OTLP protobuf sem header de projeto do Vigia;
- ingest respondeu HTTP 200;
- o trace foi recuperado pela API pública do Vigia com HTTP 200;
- o contrato OTLP canônico e Business Events continuaram funcionando após a promoção.

## Consequências

O próximo passo de produto é adicionar instruções específicas de Flowise/Phoenix ao onboarding market-first e validar a configuração em um cliente Flowise real.

O Git redeploy do Portainer ainda recria a stack inteira; promoção por serviço permanece como melhoria operacional separada.
