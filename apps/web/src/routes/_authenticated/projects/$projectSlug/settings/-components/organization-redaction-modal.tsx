import { DEFAULT_REDACTION_ENTITIES, type OrganizationRedactionSetting } from "@domain/shared"
import { Button, Label, Modal, Switch, Text, useToast } from "@repo/ui"
import { useState } from "react"
import { updateOrganizationRedactionMutation } from "../../../../../../domains/organizations/organizations.collection.ts"
import { decodeEntities, encodeEntities } from "../../../../../../domains/projects/redaction-entities.ts"
import { decodeRules, encodeRules } from "../../../../../../domains/projects/redaction-rule-drafts.ts"
import { toUserMessage } from "../../../../../../lib/errors.ts"
import { OrgDefaultBlastRadius, otherAffectedProjects, useInlineOrgDefaultConfirm } from "./org-default-confirm.tsx"
import { RedactionCard, type RedactionCardValue } from "./redaction-card.tsx"

/**
 * Editing the organization default from a project page. Deliberately a modal:
 * it interrupts, so an org-wide write never looks as routine as a project one.
 */
export function OrganizationRedactionModal({
  current,
  projectCount,
  overrideCount,
  currentProjectInherits = false,
  onClose,
}: {
  readonly current: OrganizationRedactionSetting | undefined
  readonly projectCount: number
  readonly overrideCount: number
  readonly currentProjectInherits?: boolean
  readonly onClose: () => void
}) {
  const { toast } = useToast()
  const [isSaving, setIsSaving] = useState(false)
  const [value, setValue] = useState<RedactionCardValue>({
    mode: current?.mode ?? "off",
    entities: encodeEntities(current?.entities ?? DEFAULT_REDACTION_ENTITIES),
    metadata: current?.scopes?.metadata ?? false,
    identities: current?.identities ?? "keep",
    rules: encodeRules(current?.rules ?? []),
  })
  const [locked, setLocked] = useState(current?.locked ?? false)

  const otherAffected = otherAffectedProjects({ projectCount, overrideCount, currentProjectInherits })
  const confirm = useInlineOrgDefaultConfirm(otherAffected)

  const save = async () => {
    if (!confirm.gate()) return
    setIsSaving(true)
    try {
      const setting: OrganizationRedactionSetting = {
        mode: value.mode,
        entities: decodeEntities(value.entities),
        scopes: { metadata: value.metadata },
        identities: value.identities,
        rules: decodeRules(value.rules),
        locked,
      }
      await updateOrganizationRedactionMutation(setting)
      toast({ description: "Padrão de privacidade da empresa atualizado" })
      onClose()
    } catch (error) {
      setIsSaving(false)
      toast({ variant: "destructive", description: toUserMessage(error) })
    }
  }

  return (
    <Modal
      open
      dismissible
      onOpenChange={(next) => {
        if (!next && !isSaving) onClose()
      }}
      title="Padrão de privacidade da empresa"
      description="A política que cada projeto herda, salvo quando possui configuração própria."
      footer={
        <div className="flex flex-row items-center gap-2">
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancelar
          </Button>
          <Button onClick={() => void save()} isLoading={isSaving} disabled={isSaving}>
            {confirm.submitLabel}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-6">
        <OrgDefaultBlastRadius
          projectCount={projectCount}
          overrideCount={overrideCount}
          otherAffected={otherAffected}
          awaitingConfirm={confirm.awaitingConfirm}
        />

        <RedactionCard
          idPrefix="org-redaction"
          value={value}
          onChange={(key, next) => setValue({ ...value, [key]: next })}
        />

        <div className="flex flex-row items-start justify-between gap-4 border-border border-t pt-6">
          <div className="flex flex-col gap-1">
            <Label htmlFor="org-redaction-locked">Impedir que projetos alterem esta política</Label>
            <Text.H6 color="foregroundMuted">
              Quando bloqueada, as configurações dos projetos são ignoradas por completo, em vez de combinadas com o padrão,
              e somente um proprietário pode liberar alterações novamente.
            </Text.H6>
          </div>
          <Switch id="org-redaction-locked" checked={locked} onCheckedChange={setLocked} />
        </div>
      </div>
    </Modal>
  )
}
