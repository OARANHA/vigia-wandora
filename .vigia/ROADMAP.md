# Roadmap de bootstrap

## Fase 0 — base e procedência

- [x] Criar repositório Vigia
- [x] Confirmar upstream Latitude
- [x] Confirmar licença MIT do upstream
- [x] Registrar política de atualização do upstream
- [x] Registrar marca e posicionamento inicial
- [x] Importar baseline do Latitude preservando procedência
- [x] Confirmar build local/self-host

## Fase 1 — Vigia mínimo vendável

- [ ] Branding global Vigia by Wandora
- [x] Base centralizada de produto e copy PT-BR
- [x] Login, perfil inicial e seleção de empresa em PT-BR
- [x] Onboarding do projeto/agente em PT-BR
- [x] Navegação principal em PT-BR
- [x] Configuração de URLs/subdomínios
- [x] Instalar Docker, Traefik e Portainer próprios na VPS Vigia
- [x] Publicar `vigia.wandora.com.br` no Traefik próprio da VPS Vigia
- [x] Publicar `ops-vigia.wandora.com.br` para operação administrativa do Vigia
- [x] Validar HTTPS público do `vigia.wandora.com.br` sem HTTP 526
- [ ] Remover referências comerciais desnecessárias ao Latitude
- [ ] Dashboard simplificado para visão empresarial
- [x] Primeiro fluxo "Conecte seu agente"
- [x] Receber primeiro trace OTLP em runtime público

## Fase 2 — camada própria

- [x] Events API
- [x] Correlação trace_id -> resultado de negócio
- [ ] Métricas de saúde
- [ ] Métricas de impacto
- [ ] Alertas orientados a negócio
- [ ] SDK/wrapper Vigia
- [ ] Integração Wandora como primeiro cliente real

## Regra de execução

Primeiro reutilizar o que o Latitude já faz bem. Só criar código próprio quando houver diferença de produto, experiência, integração ou modelo comercial.


## Checkpoint 2026-09-28 — onboarding + OTLP

Concluído em código e validado:

- fluxo de agente em PT-BR;
- seleção de tecnologia/runtime;
- instruções OpenTelemetry/OTLP com marca Vigia;
- endpoint MVP em `vigia.wandora.com.br/v1/traces`;
- header público `X-Vigia-Project`;
- compatibilidade interna com `X-Latitude-Project`;
- detecção do primeiro trace e estado de conexão.

Validação real concluída em 2026-09-29: a stack pública recebeu um trace OTLP pelo domínio canônico e o trace foi confirmado na API de leitura do Vigia.


## Checkpoint 2026-09-28 — preparação do runtime público

Validado antes do deploy:

- runtime canônico consolidado em `deploy/production/compose.yml`, `deploy/production/traefik-vigia.yml` e `.github/workflows/vigia-images.yml`;
- `docker compose ... config --quiet`: sucesso;
- builds Docker de `api`, `ingest`, `workers`, `workflows`, `web` e `migrations`: sucesso;
- pull anônimo das seis imagens `ghcr.io/oaranha/vigia-*:main`: sucesso no PR #24;
- a tentativa inicial de usar o Portainer/Traefik da Wandora foi encerrada;
- nova VPS dedicada do Vigia provisionada com 6 vCPU, 12 GiB RAM e 200 GB SSD;
- capacidade real validada na VPS Vigia: ~191 GB livres e ~9,8 GiB de RAM disponíveis após o bootstrap operacional.

Estado de produção confirmado após essas validações:

- ainda não existe stack `vigia` no Portainer;
- ainda não existem containers Vigia no host;
- ainda não existe a rota ativa `vigia.wandora.com.br` no file provider;
- HTTPS válido e primeiro trace OTLP público continuam pendentes.

O próximo passo operacional é adaptar o runtime canônico para a VPS standalone, instalar a camada de borda/Portainer próprios e só então criar a stack Git com segredos exclusivos do Vigia.

## Checkpoint 2026-09-29 — tradução profunda do núcleo do cliente

Concluído no slice do PR #34:

- [x] Sessões em PT-BR: lista, filtros, estados vazios e detalhe;
- [x] Usuários em PT-BR: lista, estatísticas e detalhe;
- [x] Ferramentas em PT-BR: lista, estatísticas e detalhe;
- [x] Memória em PT-BR: lista, estatísticas e armazenamento;
- [x] Remover referências visíveis a `docs.latitude.so` nas superfícies cobertas;
- [x] Preservar trace/span/TTFT e demais termos técnicos quando úteis.

Próximo slice da área do cliente:

- [ ] Sinais;
- [ ] Comportamentos;
- [ ] Experimentos;
- [ ] Monitores;
- [x] Conjuntos de dados;
- [ ] Configurações;
- [ ] Custos e Pontuação do agente quando habilitados.

Depois de a área do cliente ficar satisfatória, tratar o `/backoffice` como **Administração Vigia** em slice próprio.

## Checkpoint 2026-09-29 — áreas operacionais do cliente

Concluído no PR #35:

- [x] Sinais em PT-BR nas superfícies principais;
- [x] Comportamentos em PT-BR nas superfícies principais;
- [x] Experimentos em PT-BR nas superfícies principais;
- [x] Monitores em PT-BR nas superfícies principais;
- [x] Remover referências visíveis ao Latitude nas superfícies cobertas;
- [x] Remover links visíveis para `docs.latitude.so` nas superfícies cobertas.

Próximos slices da área do cliente:

- [ ] Conjuntos de dados;
- [ ] Configurações;
- [ ] Custos e Pontuação do agente quando habilitados.

Depois disso, tratar o `/backoffice` como **Administração Vigia** em slice próprio.



## Checkpoint 2026-09-29 — conjuntos de dados + configurações essenciais

Concluído neste slice:

- [x] Conjuntos de dados em PT-BR nas superfícies de lista, detalhe, linhas, colunas e CSV;
- [x] Remover o link visível para `docs.latitude.so` em Conjuntos de dados;
- [x] Configurações essenciais de projeto, conta, empresa, membros, chaves, sinais, importações e integrações básicas em PT-BR;
- [x] Remover referências comerciais visíveis ao Latitude e links `docs.latitude.so` nas superfícies de Configurações cobertas.

Configurações permanece **parcialmente concluída**.

- [x] dispatch de agentes em PT-BR/Vigia, preservando contratos técnicos necessários;
- [x] destinos de dados em PT-BR, incluindo PostHog, histórico, backfill/importação histórica e estados operacionais;
- [x] remover links visíveis para `docs.latitude.so` nas superfícies de dispatch e destinos de dados cobertas;
- [x] privacidade/redaction avançada;
- [x] GitHub/Slack avançados;
- [x] defaults e flaggers;
- [ ] SSO e billing, quando habilitados e após decisão comercial canônica quando necessária.

Depois:

- [ ] verificar na aplicação real se Custos e Pontuação do agente estão habilitados;
- [ ] traduzir/revisar Custos e Pontuação do agente quando habilitados;
- [ ] `/backoffice` como **Administração Vigia** em slice separado.

## Checkpoint 2026-09-29 — privacidade e redaction avançada

Concluído no PR #38:

- [x] política de privacidade de projeto e empresa em Vigia/PT-BR;
- [x] escopo empresa/projeto, override, lock e blast radius preservados;
- [x] categorias de PII e identificadores de usuário revisados;
- [x] metadata/tags e regras customizadas em PT-BR;
- [x] editor e validação de regras com contratos técnicos preservados;
- [x] preview contra spans recentes localizado apenas na camada de apresentação;
- [x] ausência de referências comerciais visíveis ao Latitude ou links `docs.latitude.so` nas superfícies cobertas.

Próximos itens de Configurações:

- [ ] GitHub/Slack avançados;
- [x] defaults e flaggers;
- [ ] SSO e billing, quando habilitados e após decisão comercial canônica quando necessária.

Depois, verificar na aplicação real se Custos e Pontuação do agente estão habilitados. O `/backoffice` continua separado como **Administração Vigia**.

## Checkpoint 2026-09-29 — GitHub e Slack avançados

Este slice conclui a revisão das superfícies avançadas de GitHub e Slack em Configurações:

- [x] conexão, desconexão e estados de atenção em Vigia/PT-BR;
- [x] configuração de repositório, branch, monitoramento e palavras de ação do GitHub em PT-BR;
- [x] entregas recentes de webhook do GitHub com apresentação localizada;
- [x] roteamento de notificações do Slack, canais, tópicos, severidade e estados operacionais em PT-BR;
- [x] remoção dos links visíveis para `docs.latitude.so` de GitHub e Slack enquanto não existe documentação canônica equivalente do Vigia;
- [x] remoção das referências comerciais visíveis ao Latitude nas superfícies cobertas.

Enums, schemas, OAuth, tokens, webhooks, persistence, eventos e demais contratos técnicos permanecem inalterados. O formato técnico de slug de sinal exemplificado como `LAT-XY9Z` foi preservado por compatibilidade; a mudança é somente de apresentação.

Próximos itens de Configurações:

- [x] defaults e flaggers;
- [ ] SSO e billing, quando habilitados e após decisão comercial canônica quando necessária.

Depois, verificar na aplicação real se Custos e Pontuação do agente estão habilitados. O `/backoffice` continua separado como **Administração Vigia**.


## Checkpoint 2026-09-29 — padrões e avaliadores

Concluído neste slice:

- [x] página de Padrões da empresa em PT-BR, incluindo herança, overrides e estados de erro;
- [x] padrão de privacidade/remoção de PII e monitoramento do GitHub apresentados em PT-BR;
- [x] presets e grupos de Avaliadores em PT-BR;
- [x] nomes e descrições visíveis dos avaliadores localizados sem alterar os slugs técnicos;
- [x] ações, sampling e estados de alteração em PT-BR;
- [x] cobertura, caminhos de seleção e limitações de observação em PT-BR;
- [x] preservação de mutations, schemas, persistência, modos, slugs e demais contratos técnicos do Latitude.

Próximos itens de Configurações:

- [ ] SSO, quando habilitado e após decisão comercial canônica;
- [ ] billing, quando habilitado e após decisão comercial canônica.

Depois, verificar na aplicação real se **Custos** e **Pontuação do agente** estão habilitados. O `/backoffice` continua separado como **Administração Vigia**.


## Checkpoint 2026-09-29 — hostname administrativo

- [x] Portainer do Vigia validado em `127.0.0.1:9443`, sem exposição direta da porta administrativa;
- [x] Traefik do Vigia validado em 80/443 com file provider próprio;
- [x] rota `ops-vigia.wandora.com.br` publicada e validada publicamente;
- [x] DNS `ops-vigia.wandora.com.br` no Cloudflare validado como Proxied;
- [x] HTTPS público do novo hostname validado; alias legado removido do Traefik.
- [x] hostname legado `ops.vigia.wandora.com.br` não resolve mais em DNS.

## Checkpoint 2026-09-29 — primeiro trace OTLP público

- [x] stack `vigia` ativa no Portainer próprio;
- [x] `web`, `api`, `ingest`, `workers`, `workflows`, Postgres, ClickHouse e Redis saudáveis;
- [x] `POST https://vigia.wandora.com.br/v1/traces` validado com HTTP 200;
- [x] contrato público validado com `Authorization: Bearer <API key>` e `X-Vigia-Project`;
- [x] trace recém-enviado encontrado pela API de leitura do Vigia com HTTP 200;
- [x] `projects.first_trace_at` preenchido no projeto do smoke test;
- [x] nenhuma credencial exposta no chat ou no repositório.

## Checkpoint 2026-09-29 — onboarding público Vigia implantado

- [x] PR #44 integrado ao `main`;
- [x] workflow `Vigia container images` #74 publicado com sucesso;
- [x] stack `vigia` redeployada no commit `417b322c23f06d6c6d17e4839ec437e679c97219`;
- [x] serviços principais saudáveis e migrations com exit 0;
- [x] HTTPS público validado com HTTP 200 e TLS válido;
- [x] onboarding público consolidado no endpoint `https://vigia.wandora.com.br/v1/traces` e header `X-Vigia-Project`;
- [x] smoke OTLP pós-deploy validado com ingest HTTP 200 e trace encontrado pela API do produto.

### Próximo slice

Investigar primeiro as capabilities existentes no Latitude/Vigia para events, signals, scores e correlação com traces. Depois, definir e implementar o menor contrato de **Business Events** capaz de responder **“o que significa sucesso para este agente?”** e provar `trace -> resultado de negócio` ponta a ponta.


## Checkpoint 2026-09-29 — Business Events v0 em código

O PR #46 implementa e valida em código a menor camada vendável para responder **“o que significa sucesso para este agente?”**:

- contrato Vigia `POST /v1/projects/:projectSlug/events`;
- correlação pública por `traceId`;
- persistência reutilizando custom scores nativos, sem tabela ou migration paralela;
- herança nativa de session/span do trace;
- apresentação no trace como **Resultado**;
- valor de negócio opcional em PT-BR;
- resultados negativos preservam a descoberta nativa de Sinais;
- typecheck e testes específicos de API/UI concluídos com sucesso.

O v0 ainda não conclui **Métricas de impacto**: metadata de negócio não é materializada no ClickHouse de scores e a agregação de valor/receita deve ser tratada em slice próprio.

### Próxima validação

Implantar o PR #46, provar `trace -> evento de negócio -> resultado visível no Vigia` no runtime público e então marcar Events API/correlação como concluídas em produção. Em seguida, integrar a Wandora como primeiro emissor real antes de ampliar o modelo.

## Checkpoint 2026-09-29 — Business Events v0 validado em produção

- [x] PR #46 integrado ao `main` em `c845630556be695d6b8a49bee93b9b8ec6c9e4cb`;
- [x] imagens `vigia-*:main` repulladas com sucesso e confirmadas nessa revisão;
- [x] redeploy da stack `vigia` pelo Portainer local;
- [x] `ConfigHash` confirmado em `c845630556be695d6b8a49bee93b9b8ec6c9e4cb`;
- [x] serviços principais saudáveis e migrations com exit 0;
- [x] smoke OTLP público com ingest HTTP 200 e trace encontrado por HTTP 200;
- [x] `POST /v1/projects/:projectSlug/events` validado com HTTP 201;
- [x] resultado `vigia.business.smoke_success` persistido com o mesmo `traceId` e `passed = true`.

O bloqueio Docker -> GHCR foi contornado de forma estreita forçando apenas a faixa IPv6 observada do CDN de blobs a ficar inalcançável, permitindo fallback para IPv4. Esse workaround é temporário e não persiste após reboot; qualquer correção permanente deve continuar evitando mudanças globais de IPv6 sem necessidade comprovada.

As caixas **Events API** e **Correlação trace_id -> resultado de negócio** estão concluídas na Fase 2.

### Próxima ação

- [ ] Integrar a Wandora como primeiro cliente/emissor real: `Wandora -> OTLP + Business Events -> Vigia`.

## Checkpoint 2026-09-30 — experiência pública e captação em código

Implementado neste slice:

- [x] microinterações da landing orientadas à explicação do produto, com suporte a `prefers-reduced-motion`;
- [x] KPIs e gráfico do hero animados;
- [x] comparação `Sem Vigia -> Com Vigia` reproduzida ao entrar na viewport;
- [x] timeline de execução reproduzida em sequência;
- [x] passos de onboarding e casos de uso com interação discreta;
- [x] navegação com seção ativa e CTA final com movimento sutil;
- [x] login dividido entre autenticação e visual 3D dos mascotes;
- [x] email/magic link e Google mantidos como acesso principal; GitHub rebaixado para opção secundária;
- [x] página pública `/interesse/` criada com formulário de qualificação;
- [x] CTA público separado do login para evitar criação de conta por lead frio;
- [x] integração desenhada para persistir o interesse na Wandora por contrato público, sem banco compartilhado.

Pendente de produção:

- [ ] implantar primeiro o endpoint de interesse da Wandora;
- [ ] implantar a nova imagem web/landing do Vigia;
- [ ] validar formulário ponta a ponta e confirmar persistência na Wandora;
- [ ] validar login, Google e GitHub após a mudança visual;
- [ ] validar animações em desktop/mobile e modo de movimento reduzido.

## Checkpoint WIP 2026-09-30 — hero com fundo integrado

Estado persistido no GitHub para continuidade independente do chat:

- branch: `fix/landing-hero-clean-background`;
- o `hero-dashboard-wrap` foi removido da hero;
- a cena limpa do time/mascotes foi persistida como binário real em `apps/landing/assets/vigia-team-office-hero-clean.webp`;
- navegação, headline, CTAs, provas de valor e status continuam como HTML/CSS vivo sobre a imagem;
- breakpoints específicos preservam a composição em desktop, notebook e mobile;
- a imagem reserva espaço negativo à esquerda para a copy e concentra time/dashboard à direita;
- o asset é versionado diretamente no Git, sem depender de `/mnt/data` ou de arquivos base64 temporários;
- neste slice não tocar em Wandora, app autenticado ou backend.

Próxima validação: abrir PR, validar build da landing e só depois publicar `vigia-landing`.

