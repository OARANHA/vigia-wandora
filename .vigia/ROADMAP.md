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
- [ ] Configuração de URLs/subdomínios
- [ ] Instalar Docker, Traefik e Portainer próprios na VPS Vigia
- [ ] Publicar `vigia.wandora.com.br` no Traefik próprio da VPS Vigia
- [ ] Publicar `ops.vigia.wandora.com.br` para operação administrativa do Vigia
- [ ] Validar HTTPS público sem HTTP 526
- [ ] Remover referências comerciais desnecessárias ao Latitude
- [ ] Dashboard simplificado para visão empresarial
- [x] Primeiro fluxo "Conecte seu agente"
- [ ] Receber primeiro trace OTLP em runtime público (capability implementada; falta deploy/smoke test)

## Fase 2 — camada própria

- [ ] Events API
- [ ] Correlação trace_id -> resultado de negócio
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

Próxima validação real: publicar a primeira stack executável, configurar o router dinâmico do Traefik e enviar um trace real pelo domínio público antes de marcar ingestão pública como concluída.


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

Configurações permanece **parcialmente concluída**. Próximo slice:

- [ ] dispatch de agentes;
- [ ] destinos de dados;
- [ ] privacidade/redaction avançada;
- [ ] GitHub/Slack avançados;
- [ ] defaults e flaggers;
- [ ] SSO e billing, quando habilitados.

Depois:

- [ ] Custos e Pontuação do agente quando habilitados;
- [ ] `/backoffice` como **Administração Vigia** em slice separado.
