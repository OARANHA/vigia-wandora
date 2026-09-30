# Infraestrutura standalone do Vigia

Esta stack contém a borda própria do Vigia. Ela é implantada pelo Portainer da VPS Vigia a partir do GitHub.

## Componentes

- Traefik próprio;
- rede externa `vigia-edge`, criada no bootstrap do Portainer;
- armazenamento persistente do ACME/Let's Encrypt.

O Traefik usa file provider, mas o arquivo dinâmico é materializado por um container auxiliar em volume Docker nomeado. Isso evita bind mounts relativos e mantém a stack Git compatível com Portainer CE.

## Variável obrigatória

- `TRAEFIK_ACME_EMAIL`: e-mail operacional usado pelo Let's Encrypt.

## Portainer

O Portainer não é exposto publicamente durante o bootstrap. O hostname `ops.vigia.wandora.com.br` só deve ser ativado depois que:

1. o primeiro administrador do Portainer estiver configurado;
2. o acesso HTTPS estiver validado;
3. a proteção de acesso administrativo estiver definida.

Não publicar a tela de inicialização do Portainer diretamente na internet.


## Compatibilidade com Portainer CE

Stacks Git do Portainer CE não devem depender de bind mounts relativos para arquivos do repositório. Por isso, a configuração dinâmica do Traefik é escrita em `vigia_traefik_dynamic` pelo serviço `traefik-config` antes do Traefik iniciar.

## Migração landing / app

A separação de hosts é executada em dois estágios para preservar autenticação e contratos públicos:

1. ativar `app-vigia.wandora.com.br` para o `vigia-web`, mantendo temporariamente o catch-all de `vigia.wandora.com.br` no mesmo serviço;
2. validar login, magic link, sessão, OAuth/SSO quando aplicável e chamadas de API; somente depois transferir o catch-all de `vigia.wandora.com.br` para `vigia-landing`.

Os routers de `/v1/traces`, `/v1/*` e `/.well-known/*` em `vigia.wandora.com.br` permanecem com prioridade superior e não devem ser capturados pela landing.
