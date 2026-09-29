import { Alert } from "@repo/ui"
import { useState } from "react"

/**
 * How many projects besides the one you're editing from would move if the default changed.
 * Overriders keep their own values, and a change to the project you're looking at is not
 * news, so neither counts. The Defaults page has no current project, so nothing is excluded.
 */
export const otherAffectedProjects = (input: {
  readonly projectCount: number
  readonly overrideCount: number
  readonly currentProjectInherits?: boolean
}): number => Math.max(0, input.projectCount - input.overrideCount - (input.currentProjectInherits ? 1 : 0))

/**
 * Two-step save for an organization default edited from inside a modal, where a
 * confirmation dialog would have to nest. Everywhere else uses
 * {@link useOrgDefaultConfirm} in `org-default-confirm-modal.tsx`.
 */
export function useInlineOrgDefaultConfirm(otherAffected: number) {
  const [awaitingConfirm, setAwaitingConfirm] = useState(false)

  return {
    awaitingConfirm,
    /** False means stop and wait for a second, deliberate save. */
    gate: (): boolean => {
      if (otherAffected === 0 || awaitingConfirm) return true
      setAwaitingConfirm(true)
      return false
    },
    submitLabel: awaitingConfirm ? "Salvar mesmo assim" : "Salvar padrão",
  }
}

export function OrgDefaultBlastRadius({
  projectCount,
  overrideCount,
  otherAffected,
  awaitingConfirm,
}: {
  readonly projectCount: number
  readonly overrideCount: number
  readonly otherAffected: number
  readonly awaitingConfirm: boolean
}) {
  if (awaitingConfirm) {
    return (
      <Alert
        variant="warning"
        showIcon
        title={`Isso altera ${otherAffected} ${otherAffected === 1 ? "outro projeto" : "outros projetos"}`}
        description="Salve novamente para confirmar. Projetos com configuração própria mantêm seus valores."
      />
    )
  }

  return (
    <Alert
      variant="default"
      showIcon
      title={otherAffected > 0 ? "Isso afeta outros projetos" : "Isso afeta apenas este projeto"}
      description={
        overrideCount > 0
          ? `${projectCount - overrideCount} de ${projectCount} projetos usam este padrão. ${overrideCount} têm configuração própria e não serão alterados.`
          : `Todos os ${projectCount} projetos usam este padrão.`
      }
    />
  )
}
