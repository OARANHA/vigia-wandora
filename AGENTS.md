# AGENTS.md — Vigia by Wandora

Este repositório usa Latitude como motor open source e adiciona a camada de produto Vigia.

## Fonte de verdade

Antes de editar:

1. leia `.vigia/MASTER_PLAN.md`, `.vigia/PROJECT.md`, `.vigia/UPSTREAM.md`, `.vigia/BASELINE.md`, `.vigia/BRAND.md` e `.vigia/ROADMAP.md`;
2. confira branch, PRs, CI e runtime quando aplicável;
3. trate GitHub/runtime como autoridade acima do histórico do chat.

Fluxo preferido:

**REAL NOW → EVIDENCE → GAPS → DECISION → EXECUTION → VALIDATION → DOCUMENTATION**

## Arquitetura

**Latitude é motor. Vigia é produto.**

- `upstream/latitude` deve permanecer uma fotografia limpa do Latitude.
- `main` é a linha integrada do Vigia.
- mudanças do produto entram por `feat/*`.
- antes de criar capability nova, verifique se o Latitude já a oferece.
- prefira configuração, wrapper, adapter, tema, tradução centralizada e camada própria a forks espalhados pelo upstream.

## Regras herdadas do Latitude

Ao editar código derivado do Latitude:

- leia o `.agents/skills/<skill>/SKILL.md` correspondente à área;
- para UI, leia também `design.md` e preserve os componentes/tokens existentes;
- não invoque `tsc` diretamente; use os scripts de typecheck do workspace;
- preserve multi-tenancy, boundaries de domínio, migrations e convenções descritas nos skills;
- não carregue para o Vigia as regras de branch/release/deploy específicas da empresa Latitude.

## Produto Vigia

- PT-BR é a experiência principal;
- onboarding deve parecer SaaS, não consultoria;
- OpenTelemetry/OTLP é a porta principal;
- o cliente não precisa conhecer Latitude;
- dashboard deve traduzir telemetria em saúde, custo, falhas, impacto e resultado de negócio;
- a Wandora é primeiro cliente real, mas sem acoplamento especial.

## Infraestrutura e segurança

Para infraestrutura nova: **GitHub → Portainer → Docker**.

- segredos fora do Git;
- não expor credenciais no chat;
- não alterar produção para recuperar contexto;
- validar antes e depois de mudanças sensíveis.

Quando uma decisão importante se consolidar, atualize a documentação canônica em `.vigia/`. Crie ADRs/runbooks apenas quando houver necessidade real.
