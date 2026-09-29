import { isRedactionEntity, REDACTION_ENTITIES, type RedactionEntity } from "@domain/shared"

interface RedactionEntityMeta {
  readonly label: string
  readonly description: string
  /** Rendered as a warning next to the checkbox; set only where false positives are likely. */
  readonly caution?: string
}

export const REDACTION_ENTITY_META: Record<RedactionEntity, RedactionEntityMeta> = {
  email: {
    label: "Endereços de email",
    description: "Endereços com domínio e sufixo de pelo menos dois caracteres, como ada@example.com.",
  },
  phone: {
    label: "Números de telefone",
    description:
      "Números internacionais com ou sem separadores, como +44 20 7183 8750, e formatos norte-americanos com separadores, como (555) 123-4567.",
    caution: "Três números em sequência, como as latências 250 300 1000, podem ser removidos indevidamente como telefones.",
  },
  credit_card: {
    label: "Números de cartão de crédito",
    description: "Números de 13 a 19 dígitos que passam na validação de checksum e começam com um prefixo conhecido de emissor.",
    caution:
      "Aproximadamente um em cada dez IDs numéricos de 16 dígitos iniciados por 4, e um em cada vinte iniciados por 5, passam no checksum e podem ser removidos indevidamente.",
  },
  iban: {
    label: "IBANs",
    description: "Números internacionais de conta bancária que passam no checksum mod-97.",
  },
  us_ssn: {
    label: "Números de Social Security dos EUA (SSN)",
    description: "Números NNN-NN-NNNN com separadores e faixa válida, além de ITINs. Sequências simples de nove dígitos nunca são detectadas.",
  },
  ip_address: {
    label: "Endereços IP",
    description: "Endereços IPv4 e IPv6.",
    caution: "Números de versão como 1.2.3.4 podem ser removidos indevidamente como endereços IP.",
  },
  secret: {
    label: "Chaves de API e segredos",
    description:
      "Formatos reconhecíveis de chaves de provedores comuns, blocos de chave privada, senhas em connection strings e valores associados a chaves de credencial como DATABASE_PASSWORD.",
  },
}

/** Stable display order: defaults first, then the opt-in detectors. */
export const REDACTION_ENTITY_ORDER: readonly RedactionEntity[] = REDACTION_ENTITIES

export const encodeEntities = (entities: Iterable<RedactionEntity>): string => [...new Set(entities)].sort().join(",")

/**
 * Filters to entities the enum still has. A project that enabled one since retired has it in stored
 * settings, and the form round-trips what it read back into a write that validates strictly, so passing it
 * through would leave that project unable to save its policy at all.
 */
export const decodeEntities = (encoded: string): RedactionEntity[] =>
  encoded === "" ? [] : encoded.split(",").filter((entity): entity is RedactionEntity => isRedactionEntity(entity))
