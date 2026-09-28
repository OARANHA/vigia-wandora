# Vigia by Wandora

Este diretório registra decisões próprias do produto **Vigia** sem misturá-las com o código upstream do Latitude.

## Produto

**Vigia** é uma plataforma de observabilidade e operação de agentes de IA voltada para empresas.

Objetivo do produto:

> Conecte seus agentes ao Vigia e saiba continuamente se eles estão funcionando, onde estão falhando, quanto estão custando e qual impacto estão causando no seu negócio.

## Estratégia técnica

- Latitude é o motor OSS inicial de observabilidade, tracing, signals e evals.
- Vigia é o produto, a experiência, a camada de negócio e as integrações comerciais.
- OpenTelemetry/OTLP deve ser a principal porta de entrada.
- Uma Events API própria ligará telemetria técnica a resultados de negócio.
- O cliente não precisa conhecer Latitude.
- Mudanças próprias devem ficar tão isoladas quanto possível para facilitar atualização do upstream.

## Relação com a Wandora

A Wandora terá papel duplo:

- comercializa o **Vigia** como produto separado no site da Wandora;
- consome o **Vigia** internamente como cliente real para monitorar seus próprios agentes.

O Vigia continua sendo produto independente e fonte de verdade de observabilidade.

A Wandora pode consumir uma API resumida do Vigia para exibir indicadores próprios em seu painel, enquanto investigação detalhada, configuração, traces, evals e operação especializada permanecem no Vigia.

Evitar duplicar o frontend completo do Vigia dentro da Wandora. Preferir resumo na Wandora e navegação para o Vigia quando for necessária análise profunda.

Futuramente, SSO pode conectar os dois produtos com um fluxo "Abrir no Vigia".

## Marca

- Nome oficial: **Vigia**
- Assinatura: **Vigia by Wandora**
- URL planejada: `vigia.wandora.com.br`
- App: `app.vigia.wandora.com.br`
- API: `api.vigia.wandora.com.br`
- Ingestão: `ingest.vigia.wandora.com.br`

## Estado

Bootstrap iniciado em 2026-09-28.
Upstream técnico escolhido: `latitude-dev/latitude-llm`, branch `development`.
