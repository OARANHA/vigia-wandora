# Política de upstream

## Origem

O Vigia parte do projeto open source Latitude:

- Repositório: `latitude-dev/latitude-llm`
- Branch de referência: `development`
- Licença observada no bootstrap: MIT
- Copyright upstream: Latitude Data SL

## Regra

Não remover avisos de copyright/licença exigidos pela licença MIT das porções derivadas.

A marca **Vigia** e as camadas próprias do produto devem ser tratadas separadamente do nome e da identidade visual Latitude.

## Modelo de branches sugerido

- `main`: versão Vigia estável/integrada.
- `upstream/latitude`: fotografia limpa do Latitude usada para sincronização.
- `feat/*`: mudanças do Vigia.
- `release/*`: preparação de releases.

## Atualização

Ao atualizar o motor:

1. buscar a branch `development` do Latitude;
2. atualizar `upstream/latitude` sem alterações próprias;
3. comparar com o último baseline usado pelo Vigia;
4. integrar em uma branch específica;
5. resolver conflitos mantendo a camada Vigia;
6. rodar build, typecheck, testes e smoke tests;
7. só então integrar em `main`.

Evitar alterações cosméticas espalhadas pelo monorepo quando uma configuração de branding, token, tradução ou wrapper resolver o mesmo problema.
