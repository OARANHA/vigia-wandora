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

Como decisão de infraestrutura e operação, o Vigia pertence ao ecossistema corporativo da Wandora, mas deve rodar em infraestrutura própria e não depender do runtime da Wandora. A VPS do Vigia deve possuir seu próprio Docker, Traefik, Portainer, bancos e volumes. A Wandora consome o Vigia externamente como qualquer outro cliente.

O plano de administração usa `mcp.wandora.com.br` apenas como control plane externo. Uma indisponibilidade da infraestrutura da Wandora não deve derrubar o runtime do Vigia.

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

O onboarding de projeto/agente e o shell principal autenticado já possuem camada Vigia/PT-BR. As superfícies técnicas internas de cada seção ainda contêm copy herdada do Latitude e permanecem como trabalho incremental.

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

Decisão atual: o Vigia será publicado pela infraestrutura própria da VPS Vigia, não pelo Traefik da VPS Wandora.

A VPS dedicada do Vigia terá seu próprio Traefik e rede de borda. O host público permanece `vigia.wandora.com.br`. O hostname administrativo preferido é `ops.vigia.wandora.com.br`, destinado ao Portainer/console operacional e separado da aplicação pública.

O deploy só será considerado completo quando o DNS apontar para a VPS Vigia, o Traefik próprio emitir TLS válido e o smoke test HTTPS/OTLP funcionar sem depender da rede `wandora-edge` da Wandora.


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


## Preparação do runtime público

Em 2026-09-28, o runtime de produção foi consolidado e validado sem ainda ser implantado:

- Compose canônico: `deploy/production/compose.yml`;
- roteamento canônico: `deploy/production/traefik-vigia.yml`;
- workflow de imagens: `.github/workflows/vigia-images.yml`;
- Compose válido no CI;
- builds dos seis serviços de aplicação/migration concluídos com sucesso;
- pull anônimo de todas as seis imagens `ghcr.io/oaranha/vigia-*:main` concluído com sucesso.

O Portainer continua sem uma stack `vigia` e a VPS continua sem containers Vigia. A rota pública ainda não foi aplicada no Traefik.

A criação automatizada da stack foi bloqueada antes da execução quando o fluxo tentou transportar os segredos obrigatórios do Compose. Nenhum segredo foi salvo. O deploy deve continuar apenas quando esses valores puderem ser injetados por um mecanismo seguro do operador/Portainer.


## Shell autenticado do cliente — 2026-09-29

O PR #32 consolidou o primeiro slice visual pós-login da área do cliente:

- logotipo oficial do Vigia na sidebar autenticada;
- navegação principal e breadcrumbs em PT-BR;
- criação de empresa, menu da conta, ambiente de teste e indicador de uso em PT-BR;
- acesso administrativo nomeado como **Administração Vigia** somente para usuários com role global `admin`;
- link visível para a documentação comercial do Latitude removido do cabeçalho;
- changelog comercial do upstream ocultado até existir um feed próprio do Vigia.

A tradução profunda do conteúdo de cada página e o rebranding/PT-BR do `/backoffice` permanecem em slices separados. Contratos, rotas e referências internas necessárias ao motor Latitude continuam preservados.

## Tradução profunda da área do cliente — 2026-09-29

O PR #34 aprofunda a experiência PT-BR nas superfícies mais visíveis após o login:

- Sessões: lista, filtros, estados vazios e drawer de detalhe;
- Usuários: busca, tabela, estatísticas, detalhe, sessões, uso, sinais e memória;
- Ferramentas: filtros, estados, tabela, estatísticas, detalhe, erros, parâmetros, contexto e chamadas recentes;
- Memória: lista, estatísticas, conexão inicial e visão de armazenamento.

A copy recorrente dessas superfícies passa pela base central `apps/web/src/lib/i18n/pt-BR.ts` quando há reutilização real. Termos técnicos como trace, span e TTFT permanecem quando ajudam a leitura técnica sem expor a marca do motor.

Neste slice também foram removidos links visíveis para `docs.latitude.so` nas áreas cobertas e referências comerciais ao Latitude nos estados de Sessões e Memória.

Continuam pendentes como próximos slices de cliente: Sinais, Comportamentos, Experimentos, Monitores, Conjuntos de dados, Configurações e, quando habilitados, Custos/Pontuação do agente. O `/backoffice` permanece separado e será tratado depois da área do cliente.

## Tradução das áreas operacionais do cliente — 2026-09-29

O PR #35 aprofunda a experiência PT-BR nas áreas de análise e operação que vêm depois do núcleo de Sessões/Usuários/Ferramentas/Memória:

- **Sinais**: lista, estatísticas, estados vazios, ações de ciclo de vida e principais superfícies do detalhe;
- **Comportamentos**: estado vazio, progresso de análise, visão, cabeçalho e ações;
- **Experimentos**: lista, estado vazio, modais e detalhe principal;
- **Monitores**: lista, estado vazio, criação, detalhe e ações principais.

Também foram removidas referências comerciais visíveis ao Latitude nas superfícies cobertas. Em particular, monitores de sistema e exemplos automáticos de sinais deixaram de exibir a marca do motor, e links visíveis para `docs.latitude.so` foram removidos onde ainda apareciam nesse slice.

Termos técnicos e contratos internos do Latitude continuam preservados quando fazem parte da implementação e não da experiência do cliente.

Permanecem como próximos slices da área do cliente: Conjuntos de dados, Configurações e as superfícies de Custos/Pontuação do agente quando habilitadas. O `/backoffice` segue separado para um rebranding posterior como **Administração Vigia**.



## Conjuntos de dados e Configurações essenciais — 2026-09-29

O slice da branch `feat/vigia-client-ptbr-datasets-settings` conclui a tradução/revisão de **Conjuntos de dados** e avança a camada PT-BR das **Configurações essenciais** do cliente.

Conjuntos de dados cobertos:

- lista, busca e estado vazio;
- detalhe e tabela de linhas;
- criação/edição/remoção;
- adição de traces/linhas;
- importação e prévia de CSV;
- mapeamento e gerenciamento de colunas;
- importação/exportação e mensagens de operação.

Também foi removido o link visível para `docs.latitude.so` no estado vazio de conjuntos de dados.

Configurações essenciais cobertas neste slice:

- projeto e conta;
- empresa e membros;
- chaves de API/OAuth;
- sinais;
- importações;
- páginas e cabeçalhos básicos de integrações.

As superfícies cobertas usam linguagem Vigia/PT-BR e deixam de expor referências comerciais ao Latitude ou links para `docs.latitude.so` onde foram revisadas. Contratos técnicos internos permanecem inalterados.

**Configurações ainda não está concluída como área total.** Permanecem para um slice próprio os fluxos avançados e/ou condicionais: dispatch de agentes, destinos de dados, políticas avançadas de privacidade/redaction, configurações profundas de GitHub/Slack, defaults, flaggers, SSO e billing.

Depois de fechar essas configurações avançadas, o próximo item canônico continua sendo Custos/Pontuação do agente quando habilitados e, em seguida, `/backoffice` como **Administração Vigia**.


## Configurações avançadas — dispatch e destinos de dados — 2026-09-29

O slice da branch `feat/vigia-settings-dispatch-destinations` revisa duas superfícies avançadas de Configurações:

- dispatch de agentes para Cursor, Claude Code, Linear e webhook;
- destinos de dados, incluindo PostHog, histórico de sincronização, importação histórica e estados operacionais;
- shell compartilhado de escopo e conexão usado por essas configurações.

Nas superfícies cobertas, a experiência visível foi alinhada ao Vigia/PT-BR e os links para documentação comercial do Latitude foram removidos quando não existe ainda um guia canônico do Vigia.

O contrato técnico do webhook `X-Latitude-Signature` foi preservado deliberadamente. Ele faz parte da compatibilidade real do motor e não deve ser renomeado apenas por branding.

**Configurações continua parcialmente concluída.** Permanecem pendentes:

- privacidade/redaction avançada;
- configurações profundas de GitHub e Slack;
- defaults;
- flaggers;
- SSO, quando habilitado;
- billing, quando habilitado.

SSO e billing continuam fora deste slice porque ainda carregam decisões comerciais do upstream. O Vigia não deve inventar destino de vendas, plano, preço ou operação comercial antes de existir uma decisão canônica de produto.

Depois de fechar essas superfícies, verificar na aplicação real se **Custos** e **Pontuação do agente** estão habilitados antes de iniciar esse trabalho. O `/backoffice` permanece separado como futura **Administração Vigia**.
