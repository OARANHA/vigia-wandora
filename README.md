# Vigia by Wandora

**Observabilidade de agentes de IA orientada a resultado de negócio.**

O Vigia está sendo construído para permitir que empresas conectem seus agentes e acompanhem continuamente:

- se estão funcionando;
- onde estão falhando;
- quanto estão custando;
- quais clientes/processos estão sendo afetados;
- qual resultado de negócio os agentes estão produzindo.

## Estado do projeto

Bootstrap em andamento.

O motor open source inicial escolhido é o [Latitude](https://github.com/latitude-dev/latitude-llm), mantido como upstream separado para facilitar atualizações futuras.

Baseline inicial registrado:

`latitude-dev/latitude-llm@93f0733dc7596005dcb061ca163a016d4d86e3e2`

## Arquitetura pretendida

```text
Agente do cliente
      |
      | OpenTelemetry / SDK Vigia
      v
Vigia Ingest
      |
      v
Latitude (motor)
      |
      v
Camada de negócio Vigia
      |
      +-- saúde
      +-- problemas
      +-- custos
      +-- impacto
      +-- resultados
      |
      v
Dashboard Vigia
```

Além da telemetria técnica, o Vigia terá uma **Events API** para correlacionar traces a eventos reais como venda, agendamento, lead qualificado, transferência para humano ou tarefa concluída.

## Marca

**Vigia by Wandora**

Domínio planejado: `vigia.wandora.com.br`

## Desenvolvimento

As decisões próprias do produto ficam em [`.vigia/`](.vigia/).

Para preparar localmente o upstream Latitude sem alterar automaticamente o `main`:

```bash
./scripts/prepare-latitude-upstream.sh
```

## Licenças

Este repositório mantém sua licença própria no arquivo [LICENSE](LICENSE).

O código derivado do Latitude deve preservar a licença e os avisos MIT do projeto original. Veja [NOTICE.md](NOTICE.md) e [THIRD_PARTY_LICENSES/LATITUDE-MIT.txt](THIRD_PARTY_LICENSES/LATITUDE-MIT.txt).
