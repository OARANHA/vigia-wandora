# Vigia production runtime

Este diretório contém o runtime reproduzível e canônico do primeiro deploy público do Vigia.\n\nArquivos canônicos: `deploy/production/compose.yml`, `deploy/production/traefik-vigia.yml` e `.github/workflows/vigia-images.yml`. Evite criar um segundo Compose ou workflow concorrente para o mesmo runtime.

## Modelo

- imagens da aplicação são construídas no GitHub Actions a partir do próprio repositório;
- a stack é criada no Portainer a partir de Git;
- segredos entram apenas como variáveis do Portainer;
- Traefik continua fora da stack e usa file provider;
- web, API e ingest compartilham o host público `vigia.wandora.com.br` por roteamento de path;
- somente `web`, `api` e `ingest` entram na rede externa `wandora-edge`;
- object storage usa o driver `fs` em volume compartilhado no host único, evitando SeaweedFS neste primeiro runtime;
- retenção inicial de telemetria: 30 dias, deliberadamente conservadora porque o host de produção estava com 83% do disco raiz ocupado antes do deploy.

## Registry

As imagens `ghcr.io/oaranha/vigia-*` devem ser construídas com sucesso pelo workflow `Vigia container images` antes de qualquer deploy. Antes de criar ou atualizar a stack, confirme também que o host de produção consegue fazer pull das imagens do GHCR sem expor credenciais no Compose.

## Variáveis obrigatórias no Portainer

- `VIGIA_IMAGE_TAG`
- `POSTGRES_PASSWORD`
- `POSTGRES_RUNTIME_PASSWORD`
- `CLICKHOUSE_PASSWORD`
- `LAT_MASTER_ENCRYPTION_KEY`
- `LAT_BETTER_AUTH_SECRET`

Todos os segredos devem ser valores exclusivos de produção. As chaves de aplicação devem ter 32 bytes hexadecimais quando exigido pelo Latitude.

## Bootstrap de autenticação

O primeiro runtime usa Mailpit somente como sink de e-mail de bootstrap, exposto exclusivamente em `127.0.0.1:8025` no host. Ele não é uma solução de e-mail de produção e deve ser substituído por SMTP/Mailgun/SendGrid antes de uso por clientes externos.

## Traefik

O arquivo `traefik-vigia.yml` é a cópia versionada da configuração esperada no file provider do Traefik. A configuração ativa continua no host em `/opt/wandora/stacks/traefik/dynamic/vigia.yml`.
