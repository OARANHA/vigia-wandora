# Roadmap de bootstrap

## Fase 0 — base e procedência

- [x] Criar repositório Vigia
- [x] Confirmar upstream Latitude
- [x] Confirmar licença MIT do upstream
- [x] Registrar política de atualização do upstream
- [x] Registrar marca e posicionamento inicial
- [ ] Importar baseline do Latitude preservando procedência
- [ ] Confirmar build local/self-host

## Fase 1 — Vigia mínimo vendável

- [ ] Branding global Vigia by Wandora
- [ ] Login e onboarding em PT-BR
- [ ] Navegação principal em PT-BR
- [ ] Configuração de URLs/subdomínios
- [ ] Remover referências comerciais desnecessárias ao Latitude
- [ ] Dashboard simplificado para visão empresarial
- [ ] Primeiro fluxo "Conecte seu agente"
- [ ] Receber primeiro trace OTLP

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
