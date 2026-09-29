import type { RedactionIdentityHandling } from "@domain/shared"
import { cn, Icon, Text } from "@repo/ui"
import { type LucideIcon, UserRoundIcon, VenetianMaskIcon } from "lucide-react"

/** One address, shown becoming what each option actually stores. */
const SAMPLE_IDENTITY = "ada@acme.com"
const SAMPLE_PSEUDONYM = "anon_3f9a2b7c1d4e5f60"

interface IdentityOption {
  readonly value: RedactionIdentityHandling
  readonly label: string
  readonly icon: LucideIcon
  readonly stored: string
  readonly consequence: string
}

/**
 * `keep` first because it is the current behaviour for every project, so the list reads as
 * "what happens now" then "what you can change it to".
 */
const OPTIONS: readonly IdentityOption[] = [
  {
    value: "keep",
    label: "Manter",
    icon: UserRoundIcon,
    stored: SAMPLE_IDENTITY,
    consequence: "Armazenado como enviado. Busca e agrupamento por usuário continuam funcionando.",
  },
  {
    value: "pseudonymize",
    label: "Substituir por pseudônimo",
    // Lucide's disguise icon, and the closest it has to a hat-and-glasses.
    icon: VenetianMaskIcon,
    stored: SAMPLE_PSEUDONYM,
    consequence: "O valor original não é armazenado. Agrupamentos e contagens por usuário continuam funcionando.",
  },
]

/**
 * Two cards rather than a dropdown, because this is the one control here whose options both store
 * something — the choice turns on a consequence, not on whether to redact.
 *
 * A dropdown shows one option at a time, so the consequence that decides it (does per-user
 * analytics survive?) could only live in prose underneath. People assume pseudonymizing breaks
 * their dashboards and pick `keep` for a reason that is not true, so both outcomes are shown at
 * once with the same input above each.
 */
export function RedactionIdentityChoice({
  idPrefix,
  value,
  disabled = false,
  onChange,
}: {
  readonly idPrefix: string
  readonly value: RedactionIdentityHandling
  readonly disabled?: boolean
  readonly onChange: (next: RedactionIdentityHandling) => void
}) {
  return (
    <div className="flex flex-col gap-3">
      <Text.H6M>Identificadores de usuário</Text.H6M>

      <div role="radiogroup" aria-label="Identificadores de usuário" className="flex flex-col gap-3 @[540px]:flex-row">
        {OPTIONS.map((option) => {
          const selected = option.value === value

          return (
            /* A real radio rather than a button carrying `role="radio"`: it brings arrow-key
               navigation between the options and the group semantics with it. */
            <label
              key={option.value}
              className={cn(
                "flex flex-1 flex-col gap-2 rounded-md border p-4 transition-colors",
                "focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
                selected ? "border-primary bg-primary/5" : "border-border hover:border-foreground/20",
                disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer",
              )}
            >
              <input
                type="radio"
                className="sr-only"
                name={`${idPrefix}-identities`}
                id={`${idPrefix}-identities-${option.value}`}
                value={option.value}
                checked={selected}
                disabled={disabled}
                onChange={() => onChange(option.value)}
              />

              <div className="flex flex-row items-center gap-2">
                <Icon icon={option.icon} size="sm" color={selected ? "primary" : "foregroundMuted"} />
                <Text.H6M color={selected ? "primary" : "foreground"}>{option.label}</Text.H6M>
              </div>

              <div className="flex flex-col gap-0.5">
                <Text.H6 color="foregroundMuted">
                  <span className="font-mono">{SAMPLE_IDENTITY}</span>
                </Text.H6>
                <Text.H6 color="foregroundMuted">↓</Text.H6>
                <Text.H6>
                  <span className="font-mono">{option.stored}</span>
                </Text.H6>
              </div>

              <Text.H6 color="foregroundMuted">{option.consequence}</Text.H6>
            </label>
          )
        })}
      </div>

      {/* The browser cannot know whether the deployment has a secret, so this is stated rather than
          shown as state on the card it applies to. */}
      <Text.H6 color="foregroundMuted">
        Em instalações próprias sem segredo de pseudonimização configurado, o identificador é removido por completo em vez de
        ser pseudonimizado.
      </Text.H6>
    </div>
  )
}
