# Infraestrutura standalone do Vigia

Esta stack contém a borda própria do Vigia. Ela é implantada pelo Portainer da VPS Vigia a partir do GitHub.

## Componentes

- Traefik próprio;
- rede externa `vigia-edge`, criada no bootstrap do Portainer;
- armazenamento persistente do ACME/Let's Encrypt.

O Traefik usa file provider e carrega o roteamento público do produto a partir de `deploy/production/traefik-vigia.yml`.

## Variável obrigatória

- `TRAEFIK_ACME_EMAIL`: e-mail operacional usado pelo Let's Encrypt.

## Portainer

O Portainer não é exposto publicamente durante o bootstrap. O hostname `ops.vigia.wandora.com.br` só deve ser ativado depois que:

1. o primeiro administrador do Portainer estiver configurado;
2. o acesso HTTPS estiver validado;
3. a proteção de acesso administrativo estiver definida.

Não publicar a tela de inicialização do Portainer diretamente na internet.
