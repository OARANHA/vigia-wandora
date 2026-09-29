import { Button, CloseTrigger, cn, Icon, Modal, Switch, Text, Tooltip, useToast } from "@repo/ui"
import { useParams } from "@tanstack/react-router"
import { BellIcon, BellOffIcon, CheckIcon, EyeIcon, EyeOffIcon, LinkIcon, UndoIcon } from "lucide-react"
import { useCallback, useMemo, useState } from "react"
import { useRegisterCommands } from "../../../../../../components/command-palette/command-palette-provider.tsx"
import type { PaletteCommand } from "../../../../../../components/command-palette/types.ts"
import { invalidateSignalQueries, useSignalDetail } from "../../../../../../domains/signals/signals.collection.ts"
import { applySignalLifecycleAction } from "../../../../../../domains/signals/signals.functions.ts"
import { toUserMessage } from "../../../../../../lib/errors.ts"

type LifecycleConfirmationAction = "resolve" | "unresolve" | "ignore" | "unignore" | "mute" | "unmute"

const CONFIRMATION_TOASTS: Record<LifecycleConfirmationAction, string> = {
  resolve: "Sinal resolvido.",
  unresolve: "Sinal reaberto.",
  ignore: "Sinal ignorado.",
  unignore: "Sinal devolvido à lista de ativos.",
  mute: "Notificações do sinal silenciadas.",
  unmute: "Notificações do sinal reativadas.",
}

function getLifecycleConfirmation(action: LifecycleConfirmationAction) {
  switch (action) {
    case "resolve":
      return {
        title: "Resolver sinal",
        description:
          "Marque este sinal como resolvido. Se ele voltar a ocorrer, o Vigia alertará e o marcará como regressão",
        confirmLabel: "Resolver",
        confirmIcon: CheckIcon,
        confirmVariant: undefined,
      }
    case "unresolve":
      return {
        title: "Reabrir sinal",
        description: "Reabra este sinal. Novas ocorrências não serão tratadas como regressão",
        confirmLabel: "Reabrir",
        confirmIcon: UndoIcon,
        confirmVariant: undefined,
      }
    case "ignore":
      return {
        title: "Ignorar sinal",
        description:
          "Marque este sinal como ignorado. O Vigia deixará de monitorar e alertar sobre novas ocorrências",
        confirmLabel: "Ignorar",
        confirmIcon: EyeOffIcon,
        confirmVariant: "destructive" as const,
      }
    case "unignore":
      return {
        title: "Voltar a acompanhar sinal",
        description: "Volte a acompanhar este sinal. Novas ocorrências voltarão a aparecer",
        confirmLabel: "Acompanhar",
        confirmIcon: EyeIcon,
        confirmVariant: undefined,
      }
    case "mute":
      return {
        title: "Silenciar sinal",
        description: "Silencie este sinal. Novas ocorrências ainda criam incidentes, mas não enviam notificações",
        confirmLabel: "Silenciar",
        confirmIcon: BellOffIcon,
        confirmVariant: "destructive" as const,
      }
    case "unmute":
      return {
        title: "Reativar notificações",
        description: "Reative as notificações deste sinal. Novas ocorrências voltarão a gerar notificações",
        confirmLabel: "Reativar",
        confirmIcon: BellIcon,
        confirmVariant: undefined,
      }
  }
}

export function SignalLifecycleActions({
  projectId,
  signalId,
  compact = false,
}: {
  readonly projectId: string
  readonly signalId: string
  readonly compact?: boolean
}) {
  const { toast } = useToast()
  const { projectSlug } = useParams({ strict: false })
  const { data: issue } = useSignalDetail({ projectId, signalId })
  const [lifecycleConfirmAction, setLifecycleConfirmAction] = useState<LifecycleConfirmationAction | null>(null)
  const [keepMonitoring, setKeepMonitoring] = useState(true)
  const [isLifecycleLoading, setIsLifecycleLoading] = useState(false)

  const lifecycleConfirmation = lifecycleConfirmAction ? getLifecycleConfirmation(lifecycleConfirmAction) : null
  const hasActiveEvaluations = (issue?.evaluations.length ?? 0) > 0

  const keepMonitoringDefault = issue?.keepMonitoringDefault ?? true
  const openConfirmation = useCallback(
    (action: LifecycleConfirmationAction) => {
      if (action === "resolve") setKeepMonitoring(keepMonitoringDefault)
      setLifecycleConfirmAction(action)
    },
    [keepMonitoringDefault],
  )

  const runLifecycleCommand = async (command: LifecycleConfirmationAction) => {
    setIsLifecycleLoading(true)
    try {
      await applySignalLifecycleAction({
        data: {
          projectId,
          signalId,
          command,
          ...(command === "resolve" && hasActiveEvaluations ? { keepMonitoring } : {}),
        },
      })
      await invalidateSignalQueries(projectId, signalId)
      toast({ description: CONFIRMATION_TOASTS[command] })
      setLifecycleConfirmAction(null)
    } catch (error) {
      toast({
        variant: "destructive",
        description: toUserMessage(error),
      })
    } finally {
      setIsLifecycleLoading(false)
    }
  }

  const paletteCommands = useMemo<readonly PaletteCommand[]>(() => {
    if (!issue) return []
    const commands: PaletteCommand[] = []

    commands.push({
      id: `issue:${signalId}:${issue.resolvedAt ? "unresolve" : "resolve"}`,
      title: issue.resolvedAt ? "Reabrir sinal" : "Resolver sinal",
      icon: issue.resolvedAt ? UndoIcon : CheckIcon,
      section: "context",
      group: "Sinal",
      keywords: issue.resolvedAt ? "unresolve reopen" : "resolve archive done fixed",
      perform: () => openConfirmation(issue.resolvedAt ? "unresolve" : "resolve"),
    })

    commands.push({
      id: `issue:${signalId}:${issue.ignoredAt ? "unignore" : "ignore"}`,
      title: issue.ignoredAt ? "Voltar a acompanhar sinal" : "Ignorar sinal",
      icon: issue.ignoredAt ? EyeIcon : EyeOffIcon,
      section: "context",
      group: "Sinal",
      keywords: issue.ignoredAt ? "unignore restore" : "ignore archive dismiss noise",
      perform: () => openConfirmation(issue.ignoredAt ? "unignore" : "ignore"),
    })

    commands.push({
      id: `issue:${signalId}:${issue.mutedAt ? "unmute" : "mute"}`,
      title: issue.mutedAt ? "Reativar notificações" : "Silenciar sinal",
      icon: issue.mutedAt ? BellIcon : BellOffIcon,
      section: "context",
      group: "Sinal",
      keywords: issue.mutedAt ? "unmute resume notifications" : "mute pause notifications",
      perform: () => openConfirmation(issue.mutedAt ? "unmute" : "mute"),
    })

    if (projectSlug) {
      commands.push({
        id: `issue:${signalId}:copy-link`,
        title: "Copiar link do sinal",
        icon: LinkIcon,
        section: "context",
        group: "Sinal",
        keywords: "copy link url share",
        perform: () => {
          void navigator.clipboard.writeText(`${window.location.origin}/projects/${projectSlug}/signals/${signalId}`)
          toast({ description: "Link do sinal copiado." })
        },
      })
    }

    return commands
  }, [issue, openConfirmation, projectSlug, signalId, toast])

  useRegisterCommands(paletteCommands)

  const isLifecycleDisabled = issue === null || issue === undefined || isLifecycleLoading
  const buttonSize = compact ? ("sm" as const) : undefined
  // `size="sm"` drops the label to `text-xs`; the row keeps `text-sm`, so every
  // button in it has to ask for the size back — including the primary one, which
  // only takes the outline tone below when it actually renders as an outline.
  const compactTextClassName = compact ? "text-sm" : undefined
  const outlineToneClassName = compact ? undefined : "text-foreground group-hover:text-secondary-foreground/80"
  const buttonClassName = cn(compactTextClassName, outlineToneClassName)

  const primaryAction: LifecycleConfirmationAction = issue?.resolvedAt ? "unresolve" : "resolve"
  const secondaryAction: LifecycleConfirmationAction = issue?.ignoredAt ? "unignore" : "ignore"

  return (
    <>
      <Button
        size={buttonSize}
        variant={issue?.resolvedAt ? "outline" : "default"}
        className={issue?.resolvedAt ? buttonClassName : compactTextClassName}
        disabled={isLifecycleDisabled}
        onClick={() => openConfirmation(primaryAction)}
      >
        <Icon icon={issue?.resolvedAt ? UndoIcon : CheckIcon} size="sm" />
        {issue?.resolvedAt ? "Reabrir" : "Resolver"}
      </Button>

      <Button
        variant="outline"
        size={buttonSize}
        className={buttonClassName}
        disabled={isLifecycleDisabled}
        onClick={() => openConfirmation(secondaryAction)}
      >
        <Icon icon={issue?.ignoredAt ? EyeIcon : EyeOffIcon} size="sm" />
        {issue?.ignoredAt ? "Acompanhar" : "Ignorar"}
      </Button>

      <Tooltip
        side="bottom"
        trigger={
          <Button
            variant="outline"
            size={buttonSize}
            className={buttonClassName}
            disabled={isLifecycleDisabled}
            onClick={() => openConfirmation(issue?.mutedAt ? "unmute" : "mute")}
          >
            <Icon icon={issue?.mutedAt ? BellOffIcon : BellIcon} size="sm" />
          </Button>
        }
      >
        {issue?.mutedAt ? "Reativar notificações de incidentes" : "Silenciar notificações de incidentes"}
      </Tooltip>

      {lifecycleConfirmAction !== null && lifecycleConfirmation !== null ? (
        <Modal
          open
          onOpenChange={(open) => {
            if (!open) setLifecycleConfirmAction(null)
          }}
          dismissible
          title={lifecycleConfirmation.title}
          description={lifecycleConfirmation.description}
          footer={
            <>
              <CloseTrigger />
              <Button
                {...(lifecycleConfirmation.confirmVariant ? { variant: lifecycleConfirmation.confirmVariant } : {})}
                onClick={() => void runLifecycleCommand(lifecycleConfirmAction)}
                disabled={isLifecycleLoading}
              >
                <Icon icon={lifecycleConfirmation.confirmIcon} size="sm" />
                {lifecycleConfirmation.confirmLabel}
              </Button>
            </>
          }
        >
          {/* A single expression child: `Modal` only renders its padded body
              slot when children are truthy, and a two-expression list would
              reach it as an always-truthy array. */}
          {lifecycleConfirmAction === "resolve" && hasActiveEvaluations ? (
            <div className="flex items-start gap-3">
              <Switch checked={keepMonitoring} onCheckedChange={setKeepMonitoring} disabled={isLifecycleLoading} />
              <div className="flex flex-col gap-1">
                <Text.H6>Continuar avaliando este sinal</Text.H6>
                <Text.H6 color="foregroundMuted">
                  {keepMonitoring
                    ? "As avaliações continuam ativas para que uma regressão reabra o sinal."
                    : "As avaliações serão arquivadas; regressões não serão detectadas."}
                </Text.H6>
              </div>
            </div>
          ) : lifecycleConfirmAction === "ignore" && issue?.origin === "user" ? (
            <Text.H6 color="foregroundMuted">
              A avaliação deste sinal será arquivada. Voltar a acompanhá-lo não restaurará a avaliação; recrie-a pela edição.
            </Text.H6>
          ) : null}
        </Modal>
      ) : null}
    </>
  )
}
