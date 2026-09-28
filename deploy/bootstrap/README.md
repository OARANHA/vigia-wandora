# Bootstrap da VPS Vigia

Este diretório contém a única exceção deliberada ao padrão **GitHub -> Portainer -> Docker**: o bootstrap inicial do próprio Portainer.

## Ordem

1. instalar e atualizar Ubuntu;
2. instalar Docker + Compose;
3. aplicar `portainer.yml` uma única vez;
4. acessar o Portainer apenas por túnel SSH em `127.0.0.1:9443` e criar o primeiro administrador;
5. a partir daí, criar a stack Git `vigia-infrastructure` usando `deploy/infrastructure/compose.yml`;
6. criar a stack Git `vigia` usando `deploy/production/compose.yml`.

O bootstrap não publica o Portainer na internet. A porta 9443 é vinculada somente ao loopback do host.

A rede `vigia-edge` nasce no bootstrap para permitir que, depois do primeiro login seguro, o Portainer seja conectado à borda pública por uma configuração explícita e revisada.

Não coloque senhas, API keys, chaves de aplicação ou outros segredos neste diretório.
