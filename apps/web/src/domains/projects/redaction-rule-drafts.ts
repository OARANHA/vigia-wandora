import {
  generateId,
  REDACTION_RULE_LABEL_PATTERN,
  RESERVED_REDACTION_LABELS,
  type RedactionRule,
  type RedactionRuleKind,
  redactionRuleSchema,
} from "@domain/shared"
import { z } from "zod"

interface RedactionRuleKindMeta {
  readonly label: string
  readonly description: string
}

export const REDACTION_RULE_KIND_META: Record<RedactionRuleKind, RedactionRuleKindMeta> = {
  attribute_key: {
    label: "Chave de atributo",
    description:
      "Remove um atributo do span pelo nome, onde quer que apareça. Como nenhum valor é analisado, esta regra não remove o conteúdo errado.",
  },
  terms: {
    label: "Termos exatos",
    description:
      "Remove uma lista de textos exatos, como números de conta conhecidos ou nomes internos. Só corresponde ao que você informar.",
  },
  pattern: {
    label: "Regex",
    description:
      "Remove qualquer valor que corresponda a uma expressão regular. É a opção mais poderosa e a única que pode atingir valores que você não pretendia.",
  },
}

/** Display order runs from the safest kind to the one that needs the most care. */
export const REDACTION_RULE_KIND_ORDER: readonly RedactionRuleKind[] = ["attribute_key", "terms", "pattern"]

/**
 * A rule list encoded for the page's draft overlay.
 *
 * The overlay compares fields with `Object.is` and rebuilds its baseline on every render, so an
 * array could never compare equal to its baseline and the form would read as permanently dirty.
 * Encoding to a string makes it a primitive, which is the same reason `encodeEntities` exists.
 *
 * The key order is fixed per kind rather than left to whatever order an object happens to carry,
 * so editing a rule and undoing the edit produces the identical string and the field drops back
 * out of the dirty set.
 */
export const encodeRules = (rules: readonly RedactionRule[]): string => JSON.stringify(rules.map(canonicalRule))

const canonicalRule = (rule: RedactionRule): Record<string, unknown> => {
  const head = { id: rule.id, kind: rule.kind, label: rule.label, enabled: rule.enabled }

  if (rule.kind === "attribute_key") return { ...head, keys: [...rule.keys] }
  if (rule.kind === "terms") {
    return { ...head, terms: [...rule.terms], wholeWord: rule.wholeWord, caseSensitive: rule.caseSensitive }
  }

  return {
    ...head,
    pattern: rule.pattern,
    ignoreCase: rule.ignoreCase,
    dotAll: rule.dotAll,
    validatorVersion: rule.validatorVersion,
  }
}

const encodedRulesSchema = z.array(redactionRuleSchema)

/**
 * Throws rather than falling back to an empty list. An empty list is a valid policy that deletes
 * every rule the customer had, so swallowing a decode failure here would quietly destroy their
 * configuration; failing the apply surfaces it instead.
 */
export const decodeRules = (encoded: string): RedactionRule[] => {
  const parsed = encodedRulesSchema.safeParse(parseJson(encoded))
  if (!parsed.success) throw new Error(DECODE_FAILURE_MESSAGE)

  return parsed.data
}

const DECODE_FAILURE_MESSAGE = "Não foi possível ler as regras de privacidade desta página. Recarregue e tente novamente."

// Unparseable and well-formed-but-wrong are the same failure to the user, so they read the same message.
const parseJson = (encoded: string): unknown => {
  try {
    return JSON.parse(encoded)
  } catch {
    throw new Error(DECODE_FAILURE_MESSAGE)
  }
}

export const newRuleDraft = (kind: RedactionRuleKind): RedactionRule => {
  const id = generateId()

  if (kind === "attribute_key") return { id, kind, label: "", keys: [] }
  if (kind === "terms") return { id, kind, label: "", terms: [] }

  return { id, kind, label: "", pattern: "" }
}

/** Turns a human name into the placeholder label, which is what appears in stored content. */
export const toRuleLabel = (name: string): string =>
  name
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 32)

export const labelIssue = (label: string): string | undefined => {
  if (label === "") return undefined
  if (RESERVED_REDACTION_LABELS.has(label)) return `${label} já é usado por uma categoria padrão.`
  if (!REDACTION_RULE_LABEL_PATTERN.test(label)) {
    return "Use de 3 a 32 caracteres: letras maiúsculas, números e sublinhados, começando por uma letra."
  }

  return undefined
}

/** Whether the draft is complete enough to be worth validating on the server. */
export const isRuleDraftReady = (rule: RedactionRule): boolean => {
  if (labelIssue(rule.label) !== undefined || rule.label === "") return false
  if (rule.kind === "attribute_key") return rule.keys.length > 0
  if (rule.kind === "terms") return rule.terms.length > 0

  return rule.pattern.length > 0
}

export const describeRule = (rule: RedactionRule): string => {
  if (rule.kind === "attribute_key") return rule.keys.join(", ")
  if (rule.kind === "terms") {
    const shown = rule.terms.slice(0, 3).join(", ")
    return rule.terms.length > 3 ? `${shown} e mais ${rule.terms.length - 3}` : shown
  }

  return rule.pattern
}

export const withRuleReplaced = (rules: readonly RedactionRule[], next: RedactionRule): RedactionRule[] => {
  const existing = rules.findIndex((rule) => rule.id === next.id)
  if (existing === -1) return [...rules, next]

  return rules.map((rule) => (rule.id === next.id ? next : rule))
}
