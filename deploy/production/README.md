# Vigia production runtime

Este diretório contém o runtime reproduzível e canônico do primeiro deploy público do Vigia.

Arquivos canônicos da aplicação: `deploy/production/compose.yml` e `.github/workflows/vigia-images.yml`. A borda e o roteamento standalone ficam em `deploy/infrastructure/compose.yml`; o bootstrap único do Portainer fica em `deploy/bootstrap/portainer.yml`.

## Modelo

- imagens da aplicação são construídas no GitHub Actions a partir do próprio repositório;
- a stack é criada no Portainer próprio da VPS Vigia a partir de Git;
- segredos entram apenas como variáveis/segredos da infraestrutura do Vigia;
- Traefik é próprio da VPS Vigia e continua separado da stack de aplicação;
- web, API e ingest compartilham o host público `vigia.wandora.com.br` por roteamento de path;
- somente `web`, `api` e `ingest` entram na rede externa `vigia-edge` do próprio Vigia;
- object storage usa o driver `fs` em volume compartilhado no host único, evitando SeaweedFS neste primeiro runtime;
- retenção inicial de telemetria: 30 dias; a VPS dedicada foi provisionada com 200 GB SSD e o consumo real será medido antes de ampliar a retenção.

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

O roteamento público fica versionado dentro da stack `deploy/infrastructure/compose.yml`, materializado em volume Docker antes do Traefik iniciar. O runtime não depende do Traefik nem da rede Docker da VPS Wandora.

Hostname administrativo preferido: `ops.vigia.wandora.com.br` para Portainer/console operacional. Esse hostname não faz parte da API pública do produto.

A rota administrativa é versionada no Traefik e encaminha para o Portainer pela rede privada `vigia-edge`; a porta `9443` permanece publicada apenas em `127.0.0.1` para acesso de contingência por túnel SSH. Antes de redeployar a infraestrutura com essa rota ativa, deve existir uma política de acesso administrativo na borda (preferencialmente Cloudflare Access ou proteção equivalente).


## Portainer CE e arquivos auxiliares

O deploy Git não usa bind mounts relativos para arquivos do repositório. Os arquivos de inicialização de Postgres e ClickHouse são incorporados às imagens `vigia-postgres` e `vigia-clickhouse` durante o build no GitHub Actions.


## Role de runtime do Postgres

O usuário interno de runtime do PostgreSQL permanece `latitude_app`. Esse nome faz parte do contrato técnico do upstream: migrations do Latitude concedem permissões e default privileges diretamente a essa role. Não renomear essa role em Compose ou bootstrap; a identidade de produto Vigia fica nas camadas externas, não nos nomes internos esperados pelo motor.
