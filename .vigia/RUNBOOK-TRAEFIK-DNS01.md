# Traefik Vigia — segundo resolver ACME DNS-01 (Cloudflare)

## Escopo e motivação

A stack `vigia-infrastructure` mantém o resolver original `letsencrypt` (HTTP-01), utilizado pelos domínios de produção. Foi acrescentado o resolver independente `cloudflare-dns` (DNS-01), destinado inicialmente ao `canvas.wandora.com.br`, protegido pelo Cloudflare Access.

**Não há deploy automático por esta documentação.** Qualquer alteração na stack Portainer exige aprovação do responsável, janela de intervenção e testes de regressão. Não alterar a infraestrutura da VPS Wandora.

## Credencial (fora do Git)

Criar token Cloudflare **distinto do usado pela VPS Wandora** para a zona `wandora.com.br`, com permissões **Zone:Read** e **DNS:Edit**. O token é fornecido ao contêiner Traefik por `CF_DNS_API_TOKEN_FILE`, lendo `/run/secrets/cloudflare_dns_api_token` a partir de bind mount somente leitura. O arquivo do host `/etc/vigia/traefik/secrets/cloudflare_dns_api_token` deve ter proprietário root e modo `0400`; o diretório pai, `0700`.

Nunca colocar o valor em Git, variáveis Compose substituídas, prints, chat ou logs. O modo `DNS:Edit` autoriza alterar DNS de toda a zona; rotacionar e revogar credenciais quando necessário.

## Alteração

- Resolver antigo: `letsencrypt` com HTTP-01 e storage `/letsencrypt/acme.json` — **preservado**.
- Resolver novo: `cloudflare-dns` com DNS-01 e storage separado `/letsencrypt/acme-cloudflare-dns.json`.
- A escolha do resolver é **por router**. O arquivo dinâmico isolado do Canvas deve configurar `http.routers.wandora-canvas.tls.certResolver: cloudflare-dns` no momento do deploy. Não trocar o resolver dos demais routers em `vigia.yml`.
- A stack inclui `traefik-config`, que gera `vigia.yml`; não editar o conteúdo gerado manualmente. A configuração `canvas.yml`, se instalada separadamente, deve ser preservada no volume `vigia_traefik_dynamic` antes e depois do redeploy.

## Gates de implementação

1. Reconciliar SHA do Compose no GitHub, Portainer e runtime; identificar se a stack Portainer é **Git-managed** ou Web Editor.
2. Validar a existência e as permissões do segredo, **sem ler nem revelar seu conteúdo**.
3. Fazer backup privado dos dados Portainer, do volume ACME e das rotas dinâmicas; preparar rollback.
4. Verificar o Compose: `docker compose -f deploy/infrastructure/compose.yml config --no-env-resolution --quiet` em contexto com variável de e-mail definida (não registrar valor de segredos). Validar YAML da rota do Canvas.
5. Sob autorização específica, atualizar a stack no **Portainer**, preferindo a origem Git e preservando a semântica do projeto; não iniciar stack paralela via `docker compose up` na mão.
6. Reconhecer possível interrupção breve de HTTPS devido à recriação do contêiner Traefik. Verificar saúde e certs existentes antes e depois.
7. Confirmar a emissão do certificado Let's Encrypt para `canvas.wandora.com.br` na origem, a resposta HTTP 200 para `/canvas/` quando roteada internamente e Cloudflare Access HTTP 302 para visitantes anônimos. Testar sessão autorizada e websocket.
8. Após o sucesso, remover a aplicação temporária de exceção ACME no Cloudflare Access; manter `Wandora Canvas` e `Wandora Operator Only` intactas.

## Reversão

Repor o Compose anterior e o resolver `letsencrypt`; se necessário repor o valor anterior de `certResolver` em `canvas.yml` após backup. **Não apagar** certificados existentes, volumes, contêineres de clientes, dados de ACME ou os registros DNS em produção. Registrar evidências de antes e depois.
