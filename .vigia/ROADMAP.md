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
- [ ] Navegação principal em PT-BR
- [ ] Configuração de URLs/subdomínios
- [ ] Publicar `vigia.wandora.com.br` no Traefik (file provider + Let's Encrypt)
- [ ] Conectar stack Vigia à rede `wandora-edge`
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
- Portainer acessível no endpoint `local` (ID 3);
- Traefik segue saudável na rede `wandora-edge` com file provider;
- capacidade observada antes do deploy: 12 GiB RAM total, cerca de 5,9 GiB disponíveis e 35 GB livres no disco raiz, que estava em 83% de uso.

Estado de produção confirmado após essas validações:

- ainda não existe stack `vigia` no Portainer;
- ainda não existem containers Vigia no host;
- ainda não existe a rota ativa `vigia.wandora.com.br` no file provider;
- HTTPS válido e primeiro trace OTLP público continuam pendentes.

A tentativa de criar a stack via automação foi interrompida pelo controle de segurança ao transportar os valores secretos exigidos pelo Compose. Nenhuma stack foi criada e nenhum segredo foi gravado. O próximo passo operacional é injetar esses segredos por um mecanismo seguro do operador/Portainer, criar a stack Git e só então ativar o Traefik.
