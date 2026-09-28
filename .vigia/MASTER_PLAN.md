# Vigia — Master Plan

Atualizado em: 2026-09-28

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

Camada própria do Vigia para correlacionar telemetria de IA com resultado de negócio.

Exemplo conceitual:

`POST /v1/events`

Com:

- `trace_id`
- tipo do evento
- valor/resultado
- metadados de negócio

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

- `vigia.wandora.com.br` — **domínio já existente** e entrada pública inicial do Vigia;
- `app.vigia.wandora.com.br` — opcional/futuro se houver necessidade real de separar site e aplicação;
- `api.vigia.wandora.com.br` — planejado;
- `ingest.vigia.wandora.com.br` — planejado.

Para o primeiro produto executável, preferir a simplicidade de usar `vigia.wandora.com.br` como URL principal em vez de criar subdomínios adicionais antes da necessidade.

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

Ainda existem referências e copy do Latitude em outras áreas autenticadas. Isso continua pendente.

O próximo passo de runtime é publicar a primeira stack executável e validar um trace real pelo domínio público. Depois disso, o próximo slice de produto é responder: **“o que significa sucesso para este agente?”**.

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

Novo padrão Wandora:

```text
GitHub
   |
   v
Portainer Stack criada a partir de Git
   |
   v
Environment Variables / secrets no Portainer ou secrets da VPS
   |
   v
Docker
```

Não usar `docker compose up` manual como mecanismo normal para novos projetos.

O Compose permanece versionado no Git.

Segredos não entram no repositório público.

O controle da API do Portainer via Remote-Ops-MCP já foi configurado e validado.

### Traefik e domínio público

Estado verificado em 2026-09-28:

- `vigia.wandora.com.br` já existe no DNS/Cloudflare;
- o Traefik de produção está saudável e conectado à rede `wandora-edge`;
- o Traefik usa `providers.file.directory=/etc/traefik/dynamic`; portanto **Docker labels não criam a rota automaticamente**;
- ainda não existe router dinâmico para `vigia.wandora.com.br`;
- enquanto não houver router/certificado de origem, o host responde Cloudflare HTTP 526.

No deploy do Vigia é obrigatório:

1. conectar o serviço web do Vigia à rede externa `wandora-edge`;
2. criar configuração dinâmica do Traefik (preferencialmente `dynamic/vigia.yml`);
3. configurar `Host(\`vigia.wandora.com.br\`)` no entrypoint `websecure`;
4. usar `tls.certResolver: letsencrypt`;
5. apontar o service do Traefik para o nome DNS interno/porta do container Vigia;
6. validar certificado, HTTPS e resposta da aplicação antes de considerar o deploy concluído.

Não alterar o Traefik em produção antes de existir um serviço Vigia válido para receber a rota.

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
8. conectar à `wandora-edge` e publicar `vigia.wandora.com.br` no Traefik com TLS válido.

### Etapa C — conexão do primeiro agente

1. [x] expor contrato Vigia sobre o ingest OTLP existente;
2. [x] criar tela "Conecte seu agente";
3. [x] mostrar endpoint/chave/projeto;
4. [ ] receber primeiro trace no runtime público;
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

**Fazer o primeiro deploy executável do Vigia, publicar `vigia.wandora.com.br` pelo Traefik e validar um trace OTLP real ponta a ponta.**

Depois do smoke test público, avançar para a definição de sucesso por agente e Business Events.


### Checkpoint de preparação do primeiro runtime — 2026-09-28

O empacotamento e o caminho de registry já foram comprovados antes de tocar produção:

- runtime canônico: `deploy/production/compose.yml`;
- configuração Traefik versionada: `deploy/production/traefik-vigia.yml`;
- workflow canônico: `.github/workflows/vigia-images.yml`;
- Compose validado pelo GitHub Actions;
- seis targets Docker do Vigia compilados com sucesso;
- seis imagens `ghcr.io/oaranha/vigia-*:main` puxadas anonimamente com sucesso no gate do PR #24.

O Portainer de produção continua sem stack `vigia`, e o host continua sem containers Vigia. A rota do Traefik também não foi ativada.

A automação disponível para criar a stack exige receber os segredos como variáveis. O controle de segurança bloqueou esse transporte antes da execução; portanto nenhum segredo foi persistido e nenhuma stack foi criada. O próximo passo é fornecer os segredos diretamente por um canal operacional seguro do Portainer/host, criar a stack Git, validar saúde e recursos, e somente depois instalar a configuração dinâmica do Traefik.
