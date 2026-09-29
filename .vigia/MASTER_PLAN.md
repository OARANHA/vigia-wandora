# Vigia — Master Plan

Atualizado em: 2026-09-29

Este documento consolida as decisões tomadas para o Vigia e serve como fonte de verdade de produto, arquitetura, comercialização e execução.

## 1. Norte do produto

**Vigia by Wandora** é um produto independente para observar agentes de IA e traduzir telemetria técnica em informação de negócio.

Proposta central:

> Conecte seus agentes ao Vigia e saiba continuamente se eles estão funcionando, onde estão falhando, quanto estão custando e qual impacto estão causando no seu negócio.

Princípio principal:

> Latitude é motor. Vigia é produto.

O cliente não precisa conhecer Latitude.

## 2. Cliente e posicionamento

O Vigia deve funcionar para:

- software houses que operam agentes para vários clientes;
- empresas com agentes próprios;
- operações de atendimento, vendas, agendamento, suporte e automação;
- clientes que querem SaaS;
- clientes que exigem instalação dedicada/private.

A Wandora será o primeiro cliente real, mas arquiteturalmente deve usar o Vigia como qualquer outro cliente.

**Fronteira corporativa:** o Vigia é um produto da corporação Wandora, porém é uma unidade operacional independente. Seu runtime não deve depender da VPS, rede Docker, Traefik ou Portainer da Wandora. Essa separação é intencional e também serve como referência para a futura oferta Vigia Private.

### Wandora como vendedora e consumidora do Vigia

A Wandora terá dois papéis simultâneos:

- **vendedora do Vigia** como um produto independente apresentado e comercializado em `wandora.com.br`;
- **cliente do Vigia**, enviando a telemetria e os eventos de negócio de seus próprios agentes para a mesma plataforma.

O Vigia deve permanecer como a fonte de verdade de observabilidade. O painel da Wandora pode consumir uma API resumida do Vigia para mostrar indicadores operacionais próprios, como:

- agentes ativos;
- saúde geral;
- problemas e alertas;
- custo;
- volume de execuções;
- indicadores de resultado.

A investigação detalhada continua no Vigia. O padrão desejado é:

```text
Wandora Dashboard
       |
       | API resumida
       v
      Vigia
       |
       +-- saúde / alertas / custo / impacto
       |
       +-- investigação completa no produto Vigia
```

O frontend completo do Vigia não deve ser duplicado dentro da Wandora. A Wandora exibe resumo e contexto; o Vigia cuida de configuração, análise profunda, traces, evals e operação especializada.

Futuramente, um fluxo de SSO pode permitir que um usuário saia do painel Wandora em "Abrir no Vigia" e entre diretamente no contexto do agente/projeto correspondente.

Essa relação cria um ciclo estratégico: a Wandora usa primeiro as novas capacidades do Vigia em produção, valida valor e problemas reais e depois oferece as capacidades maduras aos clientes externos.

## 3. Experiência que queremos vender

O onboarding precisa parecer produto SaaS, não projeto de consultoria.

Fluxo desejado:

1. criar empresa/organização;
2. criar agente/projeto;
3. escolher como o agente foi desenvolvido;
4. copiar configuração de conexão;
5. executar uma conversa de teste;
6. Vigia detecta a primeira execução;
7. definir o que significa sucesso para aquele agente.

A pergunta de negócio fundamental é:

> O que significa sucesso para este agente?

Exemplos: resolver atendimento, gerar lead, qualificar lead, fazer agendamento, realizar venda, executar tarefa corretamente ou evento personalizado.

## 4. Arquitetura de entrada

Três portas principais:

### OpenTelemetry / OTLP

É o caminho principal e deve atender a maior parte das integrações.

Cliente -> OTLP -> Vigia Ingest -> Latitude

### SDK Vigia

Wrappers finos para simplificar configuração quando necessário.

Exemplos futuros:

- npm: `@vigia/telemetry`
- Python: `vigia`

Por baixo, o SDK configura OpenTelemetry e envia ao Vigia.

### Business Events API

Camada própria e fina do Vigia para correlacionar telemetria de IA com resultado de negócio, sem criar um armazenamento paralelo ao motor.

Contrato v0:

`POST /v1/projects/:projectSlug/events`

Campos públicos:

- `traceId`: trace que produziu ou influenciou o resultado;
- `event`: nome estável do evento, como `sale_completed` ou `appointment_booked`;
- `success`: se o evento representa sucesso para o objetivo de negócio do agente;
- `label`: rótulo humano opcional;
- `value` e `currency`: valor de negócio opcional;
- `occurredAt`: instante do evento; quando omitido, o Vigia materializa o horário de ingestão;
- `metadata`: contexto adicional do cliente. O namespace `metadata.vigia` é reservado.

A implementação reutiliza o `custom score` nativo do Latitude como substrato. O adapter Vigia transforma `traceId` em uma referência interna de trace, e o motor resolve automaticamente `traceId`, `sessionId` e o último span de conclusão LLM antes de persistir o resultado.

O resultado é gravado como `sourceId = vigia.business.<event>`, com `passed = success`, e fica visível no trace como **Resultado**. Eventos negativos preservam a pipeline nativa de descoberta de Sinais; eventos positivos não abrem Sinais apenas por existirem.

Não foi criada tabela `business_events`, migration, worker ou modelo de correlação paralelo.

Limites deliberados do v0:

- Business Events não alimentam automaticamente o **Agent Score / Outcome**; o Outcome atual do motor usa julgamentos próprios de cumprimento da tarefa;
- metadata arbitrária do custom score fica persistida no Postgres, mas não é materializada hoje no ClickHouse de scores. Agregações de receita/valor/impacto são um próximo slice explícito, não uma capability presumida.

Exemplos de resultado:

- venda realizada;
- lead qualificado;
- atendimento resolvido;
- agendamento criado;
- pedido criado;
- cliente desistiu;
- intervenção humana necessária.

## 5. Arquitetura lógica

```text
                         VIGIA
                           |
          +----------------+----------------+
          |                |                |
       OTLP API         SDK Vigia      Events API
          |                |                |
          +----------------+----------------+
                           |
                    Ingestion Layer
                           |
                        Latitude
                           |
              traces / signals / evals
                           |
                 Vigia Business Layer
                           |
             saúde / impacto / resultados
                           |
                    Dashboard Vigia
```

## 6. Dashboard

O dashboard do Vigia deve falar linguagem empresarial.

Prioridades:

- agentes ativos;
- saúde geral;
- problemas detectados;
- clientes/processos afetados;
- falhas de integração;
- custo;
- conversas analisadas;
- resultados de negócio;
- principais problemas;
- alertas que indiquem onde agir.

O usuário não deve precisar entender traces, spans ou infraestrutura para obter valor.

## 7. Modelo comercial

### Vigia Cloud

SaaS compartilhado, mais simples e barato.

### Vigia Private

Instância dedicada na infraestrutura do cliente ou em infraestrutura isolada gerenciada por nós.

A camada comercial é do Vigia; Latitude permanece como componente técnico interno.

## 8. Marca e URLs

Marca:

- **Vigia**
- assinatura: **Vigia by Wandora**

URLs:

- `vigia.wandora.com.br` — entrada pública canônica do produto e, no MVP, endpoint único para web/API/ingest;
- `ops-vigia.wandora.com.br` — console operacional/Portainer do Vigia;
- `app-vigia.wandora.com.br`, `docs-vigia.wandora.com.br`, `ingest-vigia.wandora.com.br`, `status-vigia.wandora.com.br` e `vigia-infrastructure.wandora.com.br` — nomes já reservados no DNS/Cloudflare para separação futura, sem rota de produto ativa enquanto não houver necessidade real.

Para o primeiro produto executável, manter a simplicidade de `vigia.wandora.com.br` como endpoint público único da aplicação. Subdomínios reservados não devem criar componentes ou rotas adicionais por antecipação.

## 9. Estratégia de upstream Latitude

Origem:

- repositório: `latitude-dev/latitude-llm`
- branch: `development`
- baseline inicial: `93f0733dc7596005dcb061ca163a016d4d86e3e2`
- licença: MIT

Modelo de branches desejado:

- `main`: Vigia integrado;
- `upstream/latitude`: fotografia limpa do Latitude;
- `feat/*`: desenvolvimento do Vigia;
- `release/*`: releases.

### Estado atual do upstream

A procedência, licença, baseline, política de sincronização e script de preparação já estão registrados no repositório.

**O baseline do Latitude já foi importado para `upstream/latitude`.**

A branch `upstream/latitude` contém um snapshot de conteúdo exato do baseline `93f0733dc7596005dcb061ca163a016d4d86e3e2`.

Validação concluída em 2026-09-28: o tree SHA do snapshot no repositório Vigia é `993bb208505c49dfbd13cb04644fcf8a79a6cdcc`, idêntico ao tree SHA do commit upstream.

Build/self-host do baseline foi validado em 2026-09-28 no GitHub Actions:

- Node 25 + pnpm 10.33.0;
- `pnpm install --frozen-lockfile`;
- `pnpm build`;
- validação de `docker-stack.yml` com `docker compose ... config --quiet`.

Todos os passos concluíram com sucesso.

O bootstrap integrado foi concluído no PR #2 e incorporado ao `main` em 2026-09-28.

Checkpoint do merge:

- PR: `#2 — feat: bootstrap executável do Vigia sobre Latitude`
- merge/squash: `d13ba6d59174e1d2d57df6e2fbcb96e5d78df90b`
- `upstream/latitude` permaneceu limpo e com tree SHA `993bb208505c49dfbd13cb04644fcf8a79a6cdcc`;
- `pnpm check`, `pnpm typecheck` e build do web passaram no HEAD integrado;
- marca textual, metadados, login, perfil inicial e seleção de empresa já usam Vigia/PT-BR.

O onboarding de projeto/agente e a conexão OTLP já possuem uma camada própria Vigia/PT-BR. O cliente escolhe como o agente foi desenvolvido, recebe endpoint/chave/projeto do Vigia, configura OpenTelemetry e a interface detecta o primeiro trace.

O contrato público do MVP usa `https://vigia.wandora.com.br/v1/traces` e o cabeçalho `X-Vigia-Project`. O ingest mantém `X-Latitude-Project` apenas como alias de compatibilidade interna.

Ainda existem referências e copy do Latitude em áreas autenticadas e, principalmente, em parte das instruções avançadas de telemetria. Isso continua pendente.

O primeiro trace OTLP real pelo domínio público foi validado em 2026-09-29:

- `POST https://vigia.wandora.com.br/v1/traces` retornou HTTP 200 usando `Authorization: Bearer ...` e `X-Vigia-Project`;
- o mesmo trace foi encontrado pela API de leitura do Vigia com HTTP 200;
- `projects.first_trace_at` ficou preenchido no projeto usado no smoke test;
- a stack `vigia` estava ativa e os serviços web, API, ingest, workers, workflows, Postgres, ClickHouse e Redis estavam saudáveis.

O gap de onboarding público foi fechado no PR #44 e implantado em produção em 2026-09-29. As instruções públicas de OTLP usam o contrato Vigia, enquanto nomes e variáveis Latitude permanecem somente onde são exigidos por SDKs/adapters upstream. O runtime foi validado no commit `417b322c23f06d6c6d17e4839ec437e679c97219`: stack ativa, serviços saudáveis, HTTPS público 200 e novo smoke OTLP ponta a ponta com ingest HTTP 200 e trace encontrado pela API de leitura.

## 10. Regra de customização

Evitar transformar o fork em uma coleção de alterações espalhadas difíceis de atualizar.

Preferir:

- configuração;
- wrappers;
- camada própria;
- temas/tokens;
- tradução centralizada;
- componentes Vigia isolados.

Somente modificar profundamente o motor quando for necessário para o produto.

## 11. Implantação daqui para frente

Padrão de implantação do Vigia:

```text
GitHub
   |
   v
Portainer próprio da VPS Vigia
   |
   v
Environment Variables / secrets da VPS Vigia
   |
   v
Docker + Traefik próprios do Vigia
```

Não usar `docker compose up` manual como mecanismo normal para novos projetos.

O Compose permanece versionado no Git.

Segredos não entram no repositório público.

O controle da API do Portainer via Remote-Ops-MCP já foi configurado e validado.

### Traefik, Portainer e domínio público

Decisão consolidada em 2026-09-28:

- `vigia.wandora.com.br` continua como entrada pública do produto;
- a VPS dedicada do Vigia terá Docker, Traefik e Portainer próprios;
- a rede de borda do Vigia será própria e não reutilizará `wandora-edge`;
- `ops-vigia.wandora.com.br` é o hostname administrativo canônico para o Portainer/console operacional;
- `ops-vigia.wandora.com.br` foi validado publicamente em 2026-09-29 e substitui definitivamente o hostname aninhado anterior; a escolha por um hostname de primeiro nível preserva o proxy TLS da Cloudflare no plano atual, sem exigir certificado pago para subdomínio aninhado;
- `mcp.wandora.com.br` permanece somente como control plane externo da corporação, sem participar do caminho de runtime do Vigia.

O runtime do Vigia deve continuar funcional mesmo se a VPS da Wandora estiver indisponível.

## 12. Ordem de execução

### Etapa A — trazer o motor para dentro do Vigia

1. [x] criar/importar `upstream/latitude`;
2. [x] preservar licença e avisos;
3. [x] criar branch de integração;
4. [x] validar build/self-host do Latitude sem customização.

### Etapa B — primeiro Vigia executável

1. branding Vigia by Wandora;
2. login em PT-BR;
3. onboarding em PT-BR;
4. navegação em PT-BR;
5. URLs/configuração próprias;
6. remover referências comerciais desnecessárias ao Latitude;
7. subir como stack Git no Portainer;
8. publicar `vigia.wandora.com.br` no Traefik próprio da VPS Vigia com TLS válido.

### Etapa C — conexão do primeiro agente

1. [x] expor contrato Vigia sobre o ingest OTLP existente;
2. [x] criar tela "Conecte seu agente";
3. [x] mostrar endpoint/chave/projeto;
4. [x] receber primeiro trace no runtime público;
5. [x] detectar primeiro trace e mostrar estado "Conectado" na aplicação.

### Etapa D — produto vendável

1. dashboard empresarial;
2. custo e falhas;
3. saúde;
4. alertas;
5. primeiro cliente real: Wandora.

### Etapa E — diferencial do Vigia

1. Events API;
2. correlação `trace_id -> resultado de negócio`;
3. métricas de impacto;
4. definição de sucesso por agente;
5. SDKs/wrappers;
6. Cloud e Private estruturados comercialmente.

## 13. Critério de foco

A prioridade é chegar rapidamente a um Vigia executável e demonstrável.

Não construir do zero o que Latitude já resolve.

O diferencial que merece código próprio é a combinação de:

- experiência simples;
- PT-BR;
- visão empresarial;
- resultado de negócio;
- onboarding fácil;
- operação comercial.

## 14. Próxima ação objetiva

**Implantar e validar o Business Events v0 ponta a ponta e, em seguida, usar a Wandora como primeiro emissor real.**

A investigação confirmou que o Latitude já fornece persistência de scores, metadata, correlação com trace/session/span, analytics técnicos, outbox e descoberta de Sinais. O Vigia adiciona somente o contrato e a apresentação de negócio necessários.

Depois da prova em produção de `trace -> Business Event -> Resultado`, o próximo slice deve ser a menor leitura agregada de resultado/impacto útil ao empresário. Como o ClickHouse de scores não materializa metadata arbitrária, essa agregação deve ser desenhada explicitamente, sem duplicar a fonte de verdade de observabilidade.


### Checkpoint de preparação do primeiro runtime — 2026-09-28

O empacotamento e o caminho de registry já foram comprovados antes de tocar produção:

- runtime canônico: `deploy/production/compose.yml`;
- configuração Traefik versionada: `deploy/production/traefik-vigia.yml`;
- workflow canônico: `.github/workflows/vigia-images.yml`;
- Compose validado pelo GitHub Actions;
- seis targets Docker do Vigia compilados com sucesso;
- seis imagens `ghcr.io/oaranha/vigia-*:main` puxadas anonimamente com sucesso no gate do PR #24.

A tentativa na VPS Wandora foi abandonada e seus artefatos foram removidos. O primeiro runtime será implantado exclusivamente na VPS dedicada do Vigia.

A automação disponível para criar a stack exige receber os segredos como variáveis. O controle de segurança bloqueou esse transporte antes da execução; portanto nenhum segredo foi persistido e nenhuma stack foi criada. O próximo passo é fornecer os segredos diretamente por um canal operacional seguro do Portainer/host, criar a stack Git, validar saúde e recursos, e somente depois instalar a configuração dinâmica do Traefik.


### Estado operacional do Business Events v0 — 2026-09-29

O PR #46 foi integrado ao `main` no commit `c845630556be695d6b8a49bee93b9b8ec6c9e4cb`. O workflow de produção `Vigia container images` #86 concluiu com sucesso e publicou as imagens desse commit.

O redeploy na VPS Vigia **não foi executado**. A automação operacional abortou ainda na etapa de pull de imagens porque o Docker recebeu `connection reset by peer` ao copiar blobs do GHCR por IPv6. Duas execuções controladas falharam da mesma forma no primeiro pull (`vigia-web:main`) e terminaram com `aborted_before_redeploy`.

Após as falhas foi reconfirmado:

- stack Portainer `vigia` ativa;
- `CurrentDeploymentInfo.ConfigHash = 417b322c23f06d6c6d17e4839ec437e679c97219`;
- serviços principais permanecem saudáveis;
- nenhum redeploy parcial ocorreu;
- o host alcança `ghcr.io` por IPv4, portanto o bloqueio está no caminho de cópia de blobs usado pelo Docker/registry.

Próxima ação operacional: corrigir ou contornar o transporte GHCR/IPv6 da VPS, com aprovação específica antes de qualquer alteração de daemon/rede; depois repullar as imagens, redeployar via Portainer e executar o smoke `trace -> Business Event -> Resultado`.
