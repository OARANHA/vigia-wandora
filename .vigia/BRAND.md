# Branding inicial

## Nome

**Vigia**

Uso em comunicação: **o Vigia**.

Assinatura institucional: **Vigia by Wandora**.

## Princípios

A interface deve falar com o empresário, não apenas com o engenheiro de LLM.

Preferir linguagem como:

- Agentes ativos
- Saúde
- Problemas detectados
- Clientes afetados
- Falhas de integração
- Custo de IA
- Resultado
- Conversas
- Vendas associadas
- Agendamentos
- Transferências para humano

Evitar expor nomenclatura interna do Latitude quando não for necessária ao usuário.

## PT-BR

Português do Brasil será a experiência principal do Vigia.
A internacionalização deve ser implementada de forma centralizada, evitando tradução manual repetida em componentes.

## Autenticação

O fluxo visível de autenticação deve usar **Vigia by Wandora** e PT-BR, sem expor Latitude ao cliente.

O logo usado no frontend de autenticação é uma versão web otimizada, gerada diretamente do PNG transparente oficial fornecido pela Wandora, preservando a identidade e a proporção da marca. Ele é versionado em:

`apps/web/public/brand/vigia-logo.png`

E fica disponível para a aplicação em:

`/brand/vigia-logo.png`

O e-mail de magic link usa o mesmo asset por URL absoluta no domínio do Vigia. Isso evita duplicar o logo no template e mantém o branding reproduzível pelo mesmo deploy. Alguns clientes de e-mail podem bloquear imagens remotas; por isso, o texto do e-mail continua identificando **Vigia** e **by Wandora** mesmo sem a imagem.

Referências técnicas e de procedência do upstream não devem ser renomeadas apenas por branding. Isso inclui nomes de packages, schemas, migrations, contratos internos e roles esperadas pelo Latitude. Em particular, `latitude_app` permanece como contrato técnico interno do runtime PostgreSQL; não é branding visível ao cliente.
