#!/usr/bin/env bash
set -euo pipefail

UPSTREAM_REMOTE="${UPSTREAM_REMOTE:-latitude}"
UPSTREAM_URL="${UPSTREAM_URL:-https://github.com/latitude-dev/latitude-llm.git}"
UPSTREAM_BRANCH="${UPSTREAM_BRANCH:-development}"
BASELINE="${LATITUDE_BASELINE:-93f0733dc7596005dcb061ca163a016d4d86e3e2}"

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "Execute este script dentro do clone de vigia-wandora." >&2
  exit 1
fi

if git remote get-url "$UPSTREAM_REMOTE" >/dev/null 2>&1; then
  current_url="$(git remote get-url "$UPSTREAM_REMOTE")"
  if [ "$current_url" != "$UPSTREAM_URL" ]; then
    echo "Remote $UPSTREAM_REMOTE já existe com URL diferente: $current_url" >&2
    exit 1
  fi
else
  git remote add "$UPSTREAM_REMOTE" "$UPSTREAM_URL"
fi

echo "Buscando Latitude..."
git fetch "$UPSTREAM_REMOTE" "$UPSTREAM_BRANCH"

if ! git cat-file -e "$BASELINE^{commit}" 2>/dev/null; then
  echo "Baseline $BASELINE não foi encontrado após o fetch." >&2
  exit 1
fi

git branch -f upstream/latitude "$BASELINE"

cat <<EOF
Baseline preparado com sucesso.

Branch local:
  upstream/latitude -> $BASELINE

Este script NÃO faz merge em main.
Próximo passo recomendado:
  criar uma branch de integração baseada em upstream/latitude,
  aplicar a camada .vigia e então validar build/testes antes de alterar main.
EOF
