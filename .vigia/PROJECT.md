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
- URL principal: `vigia.wandora.com.br` (**já existente no DNS/Cloudflare**)
- App separado: `app.vigia.wandora.com.br` (opcional/futuro)
- API: `api.vigia.wandora.com.br` (planejado)
- Ingestão: `ingest.vigia.wandora.com.br` (planejado)

## Estado

Bootstrap iniciado em 2026-09-28.
Upstream técnico escolhido: `latitude-dev/latitude-llm`, branch `development`.

## Baseline técnico validado

Em 2026-09-28, o baseline Latitude `93f0733dc7596005dcb061ca163a016d4d86e3e2` foi importado para `upstream/latitude`, validado por tree SHA idêntico e compilado com sucesso em GitHub Actions.

Validações concluídas:

- dependências com lockfile;
- build completo do workspace;
- modelo self-host `docker-stack.yml`.

A próxima fase é a integração visual e de produto do Vigia, mantendo `upstream/latitude` limpo.

## Bootstrap integrado

Em 2026-09-28, o PR #2 foi integrado ao `main` no commit `d13ba6d59174e1d2d57df6e2fbcb96e5d78df90b`.

O `main` agora contém o código executável do baseline Latitude mais a primeira camada própria do Vigia:

- `AGENTS.md` com regras de continuidade e arquitetura do Vigia;
- configuração central `VIGIA_PRODUCT`;
- base inicial de copy PT-BR;
- marca textual Vigia by Wandora no fluxo de autenticação;
- metadados do app em PT-BR;
- login, perfil inicial e seleção de empresa em PT-BR.

Validação no HEAD da feature antes do merge:

- `pnpm check`: sucesso;
- `pnpm typecheck`: sucesso;
- build do web: sucesso.

O onboarding profundo de projeto/agente, navegação autenticada e superfícies técnicas ainda contêm referências do Latitude e permanecem pendentes.

## Dependências mínimas do baseline

Desenvolvimento/build:

- Node.js 25 ou superior;
- pnpm 10.33.0;
- Docker para a infraestrutura local/self-host.

Self-host completo usa:

- Postgres com pgvector;
- ClickHouse;
- Redis para cache;
- Redis/BullMQ para filas;
- Temporal;
- armazenamento de objetos compatível com o modelo do Latitude (SeaweedFS no bundle padrão);
- serviços web, api, ingest, workers, workflows e migrations.

A observabilidade básica (ingestão e visualização de traces) funciona sem credenciais de provedor de IA. Recursos dependentes de geração, embeddings ou reranking exigem os provedores correspondentes.

## Publicação no Traefik

Estado verificado em 2026-09-28:

- Traefik de produção: `traefik:v3.7.13`, saudável;
- rede de borda: `wandora-edge`;
- configuração dinâmica via file provider em `/opt/wandora/stacks/traefik/dynamic`;
- ACME/Let's Encrypt via DNS challenge Cloudflare;
- `vigia.wandora.com.br` resolve pelo Cloudflare, porém ainda não possui router/certificado de origem no Traefik e atualmente retorna HTTP 526.

O deploy do Vigia só será considerado completo quando houver serviço na `wandora-edge`, router dinâmico para `vigia.wandora.com.br`, TLS válido e smoke test HTTPS bem-sucedido.


## Onboarding de agente e conexão OTLP

Em 2026-09-28, o slice de onboarding do projeto/agente e conexão OTLP foi implementado na branch `feat/vigia-agent-otlp-onboarding`.

O Vigia agora possui uma camada própria de produto para este fluxo:

- criação de agente leva ao onboarding Vigia;
- cliente escolhe a tecnologia/runtime do agente;
- endpoint público apresentado como `https://vigia.wandora.com.br/v1/traces`;
- autenticação continua usando a infraestrutura de API keys já existente;
- projeto é identificado publicamente por `X-Vigia-Project`;
- `X-Latitude-Project` permanece somente como alias interno de compatibilidade no ingest;
- primeiro trace é detectado por polling e conclui o onboarding;
- estado vazio de traces reutiliza as mesmas instruções Vigia;
- fluxo legado de claim foi desacoplado dos tipos do onboarding novo para preservar compatibilidade.

Não foi criado SDK próprio: o MVP usa OpenTelemetry/OTLP padrão e reaproveita o ingest existente do Latitude.

Validação do slice no SHA `2389b307d675e1ae95e6507144d07bafa5b48841`:

- check Biome dos arquivos alterados: sucesso;
- build de `@app/web` e `@app/ingest`: sucesso;
- typecheck completo do workspace: sucesso;
- testes unitários: sucesso;
- testes unitários pesados: sucesso;
- testes de integração ClickHouse: sucesso.

Observação: um `pnpm check` global anterior expôs diagnósticos preexistentes do baseline fora deste slice. Por isso a validação de estilo deste trabalho foi isolada aos arquivos alterados, sem tratar dívida upstream não relacionada como parte deste escopo.

Ainda não houve deploy do Vigia nem smoke test público de ingestão em `vigia.wandora.com.br`. Esse teste depende da primeira stack executável e da rota dinâmica do Traefik.
