# Vigia — Master Plan

Atualizado em: 2026-10-03

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

### Atendimento e aquisição via Wandora / Ana

A landing pública do Vigia pode hospedar futuramente um widget de atendimento da **Ana**, operado pela Wandora, mas essa integração deve permanecer desacoplada do runtime do Vigia.

Responsabilidades:

- **Wandora / Ana:** conversa, qualificação de lead, CRM, onboarding comercial, suporte e handoff humano;
- **Vigia:** organização, projeto, credenciais, traces, custos, falhas, resultados, Business Events e saúde operacional;
- a ligação entre os produtos deve usar contratos públicos/IDs, nunca acesso direto aos bancos ou internals do Vigia;
- a indisponibilidade da Ana não pode impedir o funcionamento da landing ou do produto Vigia.

A landing mantém apenas um ponto de integração desativado por padrão até existir o contrato público definitivo do widget. A Wandora poderá usar uma API resumida do Vigia para acompanhar o progresso de onboarding e saúde do cliente, preservando o Vigia como fonte de verdade de observabilidade.

## 2.1. Lente de produto: dono, cliente e desenvolvedor

Toda decisão relevante do Vigia deve ser avaliada simultaneamente por três perspectivas:

- **Dono do Vigia:** isso resolve um problema que pequenas e médias empresas compram, é simples de explicar, rápido de ativar e cria oportunidade real de receita?
- **Cliente do Vigia:** eu consigo conectar meu agente e entender saúde, falhas, custo e resultado sem precisar conhecer Latitude, traces, spans ou OpenTelemetry?
- **Desenvolvedor do Vigia:** dá para entregar reutilizando Latitude, OTLP, Business Events e adapters finos, sem criar uma plataforma paralela ou overengineering?

Quando houver conflito, a implementação técnica deve servir à experiência e ao valor comercial, sem comprometer segurança, isolamento multi-tenant ou a independência do Vigia.

### Mercado primeiro, tecnologia depois

O onboarding e o posicionamento devem começar pelo que a empresa comprou e pelo canal em que o agente opera, e somente depois perguntar pela tecnologia usada por baixo.

Ordem mental padrão:

1. **O que o agente faz?** atendimento, vendas/qualificação, agendamento, cobrança, suporte, pós-venda, pedidos, e-commerce, operações internas, documentos etc.;
2. **Onde ele opera?** WhatsApp, site/chat, Instagram/Messenger, voz/telefone, e-mail ou uso interno;
3. **Como foi montado?** n8n, Flowise, Evolution API, Typebot, Dify, Botpress, Make/Zapier, SDK/código próprio ou outro;
4. **Como conectar ao Vigia?** escolher OTLP direto, adapter, webhook/eventos ou combinação mínima necessária;
5. **O que significa sucesso?** atendimento resolvido, lead qualificado, venda, agendamento, pagamento, tarefa concluída ou evento próprio.

Stacks podem ser combinadas. Um agente real pode ser, por exemplo, **WhatsApp + Evolution API + n8n + LLM + CRM**. O Vigia deve observar o fluxo como produto de negócio, não obrigar o cliente a escolher uma única tecnologia que represente toda a solução.

## 3. Experiência que queremos vender

O onboarding precisa parecer produto SaaS, não projeto de consultoria.

Fluxo desejado:

1. criar empresa/organização;
2. criar agente/projeto;
3. definir **o que o agente faz**;
4. marcar **onde ele opera**;
5. informar a **stack composta** usada na solução;
6. definir **o que significa sucesso** para aquele agente;
7. receber somente a instrução de conexão relevante à stack;
8. executar uma conversa/workflow real;
9. Vigia detecta o primeiro trace e conclui o onboarding.

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

- `vigia.wandora.com.br` — entrada pública canônica do produto, endpoint público de API/ingest e, após o cutover da landing, site institucional;
- `app-vigia.wandora.com.br` — aplicação autenticada do Vigia; ativada em estágio de migração antes do cutover da landing;
- `ops-vigia.wandora.com.br` — console operacional/Portainer do Vigia;
- `docs-vigia.wandora.com.br`, `ingest-vigia.wandora.com.br`, `status-vigia.wandora.com.br` e `vigia-infrastructure.wandora.com.br` — nomes reservados sem rota adicional enquanto não houver necessidade real.

A separação entre landing e aplicação deve ocorrer em dois estágios: primeiro tornar `app-vigia.wandora.com.br` a URL canônica do web autenticado e validar autenticação ponta a ponta mantendo o host antigo como compatibilidade; depois mover apenas o catch-all de `vigia.wandora.com.br` para a landing, preservando os routers prioritários de API, OTLP e discovery.

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

O onboarding de projeto/agente e a conexão OTLP possuem uma camada própria Vigia/PT-BR. A experiência é market-first: o cliente começa por função, canais, stack composta e definição de sucesso; depois recebe somente a instrução de conexão aplicável. O primeiro caminho específico usa o OpenTelemetry nativo do n8n, enquanto OTLP genérico permanece como fallback. A interface só conclui o onboarding após detectar um trace real.

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

**Fechar o V1 de integração nativa Elus -> Vigia e provar a primeira execução real ponta a ponta.**

O dogfood genérico da Wandora continua válido, mas não é a prioridade comercial deste slice. O objetivo imediato é que um cliente que já usa Elus consiga autorizar a conexão sem copiar endpoint, API key, headers, project slug ou configuração OTLP.

O contrato deve permanecer público entre os produtos, com credencial server-side por organização e a mesma invariável de primeiro trace real que já fecha o onboarding do Vigia. Billing, compra e entitlement completos ficam para um slice posterior e devem reutilizar o contrato de conexão, não substituí-lo.


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

### Business Events v0 — produção validada — 2026-09-29

O PR #46 está integrado ao `main` no commit `c845630556be695d6b8a49bee93b9b8ec6c9e4cb` e o Business Events v0 foi implantado e validado no runtime público do Vigia.

O bloqueio de deploy foi isolado no caminho Docker -> GHCR: o hostname de blobs `pkg-containers.githubusercontent.com` oferecia IPv4 e IPv6, e o Docker estabelecia conexão IPv6 com a faixa `2606:50c0:8000::/46`, recebendo `connection reset by peer` durante a cópia dos blobs. O registry `ghcr.io` e o mesmo CDN por IPv4 estavam alcançáveis normalmente.

A correção operacional mínima aprovada foi adicionar uma rota `unreachable` apenas para `2606:50c0:8000::/46`, fazendo o cliente falhar imediatamente nesse caminho IPv6 e usar IPv4 para os blobs. Não houve alteração de `daemon.json`, sysctl, firewall, Docker daemon ou IPv6 global do host.

Importante: essa rota é um workaround **temporário e não persistente após reboot**. Antes de depender de novo pull após reinício do host, deve-se verificar se o problema de rede externa ainda existe e decidir uma correção durável igualmente estreita, sem desabilitar IPv6 globalmente por antecipação.

Validação concluída:

- acesso normal ao CDN de blobs passou a usar IPv4;
- as oito imagens `ghcr.io/oaranha/vigia-*:main` foram repulladas com sucesso;
- todas as oito imagens locais reportaram `org.opencontainers.image.revision = c845630556be695d6b8a49bee93b9b8ec6c9e4cb`;
- redeploy executado pelo Portainer local da VPS Vigia, sem novo pull;
- stack `vigia` ativa com `CurrentDeploymentInfo.ConfigHash = c845630556be695d6b8a49bee93b9b8ec6c9e4cb`;
- `web`, `api`, `ingest`, `workers`, `workflows`, Postgres, ClickHouse e Redis saudáveis;
- `vigia-migrations` concluiu com exit 0;
- endpoint público continuou acessível por HTTPS;
- smoke real enviou um novo trace por OTLP com HTTP 200 e confirmou o trace pela API de leitura com HTTP 200;
- `POST /v1/projects/:projectSlug/events` retornou HTTP 201;
- o resultado persistido foi confirmado no Postgres como `sourceId = vigia.business.smoke_success`, `passed = true` e com o mesmo `traceId` do trace recém-enviado.

Com isso, o fluxo `trace -> Business Event -> Resultado` está provado em produção. O próximo passo de produto é usar a Wandora como primeiro emissor real antes de ampliar analytics, SDKs ou abstrações.

### Experiência pública, acesso e captação comercial — 2026-09-30

Decisão consolidada:

- a landing pública continua em `vigia.wandora.com.br` e usa movimento apenas para explicar o produto: KPIs, gráfico, comparação sem/com Vigia, timeline, passos e casos de uso;
- o login de clientes permanece em `app-vigia.wandora.com.br/login`, com email/magic link e Google como opções principais; GitHub fica como opção secundária;
- a tela de login usa composição dividida: autenticação à esquerda e uma cena 3D dos mascotes Vigia em contexto de operação à direita;
- interessados não criam conta automaticamente. O CTA público leva a `vigia.wandora.com.br/interesse/`, com formulário comercial próprio;
- a fonte de verdade do lead é a Wandora. O Vigia envia apenas o contrato público de interesse para a Wandora, sem acesso direto a banco/CRM interno;
- o contrato inicial de captura é `POST https://www.wandora.com.br/api/wandora/product-interest`, com consentimento explícito e origem allowlisted;
- o formulário coleta somente dados úteis à qualificação: nome, email, WhatsApp, empresa, site opcional, caso de uso, volume de agentes, stack, definição de sucesso e mensagem;
- a cena 3D dos mascotes é um ativo visual do produto, sem criar dependência operacional entre Vigia e Wandora.

## Decisão 2026-10-02 — admissão comercial e onboarding pós-compra

O Vigia passa a tratar a criação de empresas de clientes como um ato de **provisionamento comercial controlado**, não como consequência automática de qualquer login.

Princípios desta decisão:

- autenticar um e-mail no Vigia não concede, por si só, o direito de criar uma organização;
- login continua disponível para usuários existentes, convites, SSO e links de ativação;
- novas organizações de clientes são provisionadas pela operação autorizada da Wandora/Vigia;
- o backoffice é a superfície humana inicial para esse provisionamento; a futura integração com Elus deve chamar um contrato protegido equivalente, sem acessar bancos ou internals do Vigia;
- o provisionamento reutiliza as entidades e capabilities existentes de organização, projeto, chave de API e claim. Não existe justificativa para uma nova tabela, state machine ou subsistema de customer provisioning;
- uma organização comercial é durável desde a criação. A expiração do link de ativação não pode apagar a empresa comprada;
- o claim continua temporário, one-shot e vinculado ao e-mail do comprador. O usuário autenticado só assume ownership quando o e-mail da sessão corresponde ao e-mail vinculado ao claim;
- o bootstrap público de conta temporária permanece uma capability separada e mantém sua própria expiração/cleanup.

### Experiência pós-compra

O e-mail de confirmação leva primeiro para uma tela ampla de ativação do Vigia. O comprador não é obrigado a entender OpenTelemetry, OTLP, API keys, traces ou spans para começar.

Fluxo de produto:

```text
compra confirmada
  -> empresa/projeto/chave já provisionados
  -> e-mail "Ativar meu Vigia"
  -> ativar ownership com o e-mail da compra
  -> onboarding guiado em tela ampla
  -> identificar o primeiro agente
  -> identificar onde ele foi criado
  -> instruções específicas
  -> executar/testar o agente
  -> Vigia aguarda telemetria real
  -> primeiro trace recebido
  -> onboarding concluído
```

A primeira experiência oferece **um único caminho guiado**. Opções técnicas avançadas continuam disponíveis depois que o cliente estiver conectado, mas não competem com a tarefa inicial.

A pergunta de entrada deve ser humana: **"Onde seu agente foi criado?"**. Os alvos de experiência incluem n8n, Flowise, Dify, LangFlow e stacks técnicas já suportadas pelo motor. Cada provider só pode ser promovido a opção operacional depois de sua forma real de instrumentação ser qualificada; a interface não deve prometer uma integração que ainda não foi provada.

O sucesso do onboarding não é "configuração salva". É **telemetria real recebida**.

### Linguagem do produto

O Vigia continua usando traces, spans, scores, signals e OpenTelemetry internamente, mas a experiência principal traduz isso para perguntas de negócio:

- o agente está funcionando?
- onde está errando?
- quanto está custando?
- quais ferramentas ou integrações estão falhando?
- a taxa de sucesso está melhorando ou piorando?
- quando precisa de intervenção humana?
- está entregando o resultado esperado?

Termos técnicos permanecem acessíveis nas superfícies de investigação e configuração avançada.

### MCP e integrações

MCP, OAuth, Cursor, Claude Code, Codex, GitHub, Slack e demais integrações são capabilities posteriores ao primeiro sucesso de conexão. Não fazem parte da decisão inicial que o comprador precisa tomar no primeiro acesso.

### Billing

Este fluxo não define preços, nomes de planos comerciais nem mapeamento venda -> entitlement. A infraestrutura de billing existente continua reutilizável, mas a autoridade comercial do Vigia deve ser decidida separadamente antes de automatizar plano/limites a partir da venda.


## Checkpoint 2026-10-03 — Elus como integração nativa do Vigia

Prioridade comercial atual:

> Elus é integração nativa. Flowise/n8n continuam integrações externas/técnicas.

O V1 foi desenhado para conectar **uma conta Elus existente** a um projeto Vigia sem assistência e sem expor configuração de telemetria ao cliente.

Contrato escolhido:

```text
Elus admin
  -> inicia conexão com PKCE + state vinculados a tenant/usuário/sessão
  -> Vigia autentica o usuário e autoriza o projeto atual
  -> Vigia emite código curto cifrado, vinculado ao PKCE
  -> callback server-side do Elus troca o código
  -> Elus cifra a API key individual do Vigia antes de persistir
  -> worker Elus envia OTLP JSON com X-Vigia-Project
  -> primeiro trace real mantém a invariável de ativação do onboarding
```

Decisões de segurança:

- nenhuma API key do Vigia entra em componente React ou configuração copiada pelo usuário;
- não existe credencial global compartilhada entre clientes Elus;
- o código de autorização expira em 5 minutos e é cifrado com a chave mestre do Vigia;
- a troca exige verifier PKCE;
- o Elus persiste a credencial por organização usando a cifra server-side já existente;
- não há banco compartilhado, bypass de autenticação ou dependência de rede Docker entre produtos;
- telemetria do worker é best-effort e nunca pode derrubar o atendimento.

Business Events permanecem no contrato público `POST /v1/projects/:projectSlug/events`. O adapter Elus já preserva o mesmo `traceId` para que resultados reais futuros — como `lead_qualified`, `appointment_scheduled` ou `sale_created` — possam ser emitidos sem criar uma segunda fonte de verdade. Nenhum evento de sucesso foi inventado no V1 sem evidência real do desfecho.

Estado de validação deste checkpoint:

- PR Vigia #84 aberto e mergeable;
- `Vigia tests` e `Vigia container images` verdes no head do PR;
- PR Elus #12 aberto e mergeable;
- o repositório `crm-wandora` não possui `.github/workflows` na `main`, portanto não existe gate GitHub Actions equivalente a afirmar para o Elus;
- produção ainda não foi alterada por este slice.

Próximo passo: integrar os PRs, promover os dois runtimes de forma controlada e executar um smoke real `Elus -> Vigia` com uma organização de teste, confirmando a primeira execução no Vigia antes de considerar o V1 concluído. O fluxo futuro `compra Elus -> plano/entitlement -> provisionamento Vigia` deve reutilizar este mesmo contrato de conexão, sem ser acoplado ao billing agora.
