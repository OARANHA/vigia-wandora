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

URLs planejadas:

- `vigia.wandora.com.br`
- `app.vigia.wandora.com.br`
- `api.vigia.wandora.com.br`
- `ingest.vigia.wandora.com.br`

Podemos simplificar a URL do app futuramente se isso melhorar a experiência.

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

O próximo passo técnico é validar build/self-host do Latitude sem customização.

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

## 12. Ordem de execução

### Etapa A — trazer o motor para dentro do Vigia

1. [x] criar/importar `upstream/latitude`;
2. [x] preservar licença e avisos;
3. criar branch de integração;
4. validar build/self-host do Latitude sem customização.

### Etapa B — primeiro Vigia executável

1. branding Vigia by Wandora;
2. login em PT-BR;
3. onboarding em PT-BR;
4. navegação em PT-BR;
5. URLs/configuração próprias;
6. remover referências comerciais desnecessárias ao Latitude;
7. subir como stack Git no Portainer.

### Etapa C — conexão do primeiro agente

1. expor ingest OTLP;
2. criar tela "Conecte seu agente";
3. gerar endpoint/chave/projeto;
4. receber primeiro trace;
5. mostrar estado "Conectado".

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

**Validar o build/self-host do baseline importado em `upstream/latitude`.**

Somente depois disso começar branding, tradução e mudanças visuais.
