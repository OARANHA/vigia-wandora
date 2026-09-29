import { Button, CloseTrigger, Icon, Input, Modal, Select, SwitchInput, Text, useToast } from "@repo/ui"
import { useForm } from "@tanstack/react-form"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { CircleAlert, CircleCheck, Loader2 } from "lucide-react"
import { useState } from "react"
import {
  createDestination,
  type DestinationConnectionTestResult,
  type DestinationRecord,
  testDestinationConnection,
  testExistingDestinationConnection,
  updateDestination,
} from "../../../../../../domains/destinations/destinations.functions.ts"
import { toUserMessage } from "../../../../../../lib/errors.ts"
import { createFormSubmitHandler, fieldErrorsAsStrings } from "../../../../../../lib/form-server-action.ts"
import {
  DEFAULT_DESTINATION_KIND,
  DESTINATION_FORM_MODULES,
  DESTINATION_KIND_OPTIONS,
} from "./destination-forms/index.ts"
import { destinationsQueryKey } from "./destinations-section.tsx"

/** Inline connection-probe feedback — fully kind-agnostic; the adapter owns what a passing probe means. */
type ConnectionTest =
  | { readonly phase: "idle" }
  | { readonly phase: "testing" }
  | { readonly phase: "success" }
  | { readonly phase: "error"; readonly message: string }

/**
 * Create or edit a destination. The shell owns everything kind-agnostic —
 * Modal chrome, the kind picker, the name field, create/update mutations, the
 * connection probe, and toasts — and delegates the kind-specific fields and
 * value→payload mapping to the matching {@link DESTINATION_FORM_MODULES} entry.
 * Mounted only while open so form defaults reset per target. On edit the secret
 * is never returned from the server — a blank secret field leaves it untouched.
 * v1 ships a single kind, so the kind picker is fixed.
 */
export function DestinationFormModal({
  projectId,
  destination,
  onClose,
}: {
  readonly projectId: string
  readonly destination?: DestinationRecord | undefined
  readonly onClose: () => void
}) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const isEdit = destination !== undefined

  const kind = destination?.kind ?? DEFAULT_DESTINATION_KIND
  const formModule = DESTINATION_FORM_MODULES[kind]
  const [connectionTest, setConnectionTest] = useState<ConnectionTest>({ phase: "idle" })
  const testing = connectionTest.phase === "testing"

  // Create-time "import history" option, off by default. `null` = off; a date string ("" = full
  // retention) = on. Reach is the org's retention window — resolved and clamped on the backend.
  const todayStr = new Date().toISOString().slice(0, 10)
  const [importSince, setImportSince] = useState<string | null>(null)

  const create = useMutation({ mutationFn: createDestination })
  const update = useMutation({ mutationFn: updateDestination })

  const form = useForm({
    defaultValues: {
      name: destination?.name ?? "",
      ...formModule.defaultValues(destination),
    },
    onSubmit: createFormSubmitHandler(
      async (value) => {
        const name = value.name.trim()
        const config = formModule.buildConfig(value)
        const sourceConfigs = formModule.buildSourceConfigs(value)

        if (isEdit) {
          return update.mutateAsync({
            data: {
              projectId,
              destinationId: destination.id,
              name,
              config,
              sourceConfigs,
              ...(formModule.credentialsProvided(value) ? { credentials: formModule.buildCredentials(value) } : {}),
            },
          })
        }

        return create.mutateAsync({
          data: {
            projectId,
            name,
            config,
            sourceConfigs,
            credentials: formModule.buildCredentials(value),
            // The date picker's "since" is a UI-time instant; the server owns enqueuing the backfill.
            // Parsed as UTC midnight — deliberate: as a backfill lower bound, a few hours of skew only widens coverage.
            ...(importSince === null
              ? {}
              : {
                  importHistory: true,
                  ...(importSince ? { importSince: new Date(`${importSince}T00:00:00.000Z`).toISOString() } : {}),
                }),
          },
        })
      },
      {
        resetOnSuccess: !isEdit,
        onSuccess: async (result) => {
          void queryClient.invalidateQueries({ queryKey: destinationsQueryKey(projectId) })
          const importStarted = "importStarted" in result && result.importStarted
          if (!isEdit && importSince !== null && !importStarted) {
            toast({
              variant: "destructive",
              description:
                "Conectado, mas não foi possível iniciar a importação do histórico. Você pode iniciá-la depois no destino.",
            })
          } else {
            toast({
              description: importStarted
                ? "Destino conectado. Importando o histórico em segundo plano."
                : isEdit
                  ? "Destino atualizado."
                  : "Destino conectado.",
            })
          }
          onClose()
        },
        onError: (error) => toast({ variant: "destructive", description: toUserMessage(error) }),
      },
    ),
  })

  const handleTestConnection = async () => {
    const values = form.state.values
    const config = formModule.buildConfig(values)

    // New key typed → probe it inline. On edit with a blank key → probe the stored key.
    // On create with no key → nudge to enter one.
    let probe: Promise<DestinationConnectionTestResult>
    if (formModule.credentialsProvided(values)) {
      probe = testDestinationConnection({ data: { config, credentials: formModule.buildCredentials(values) } })
    } else if (destination) {
      probe = testExistingDestinationConnection({ data: { destinationId: destination.id, config } })
    } else {
      setConnectionTest({ phase: "error", message: "Informe suas credenciais para testar a conexão." })
      return
    }

    setConnectionTest({ phase: "testing" })
    try {
      const result = await probe
      if (result.ok) {
        setConnectionTest({ phase: "success" })
      } else {
        setConnectionTest({
          phase: "error",
          message: result.retryable
            ? `Falha na conexão (${result.reason ?? "desconhecido"}). Isso costuma ser temporário; tente novamente.`
            : `Conexão rejeitada (${result.reason ?? "desconhecido"}). Verifique a configuração e as credenciais.`,
        })
      }
    } catch (error) {
      setConnectionTest({ phase: "error", message: toUserMessage(error) })
    }
  }

  const Fields = formModule.Fields

  return (
    <Modal
      open
      dismissible
      onOpenChange={(next) => {
        if (!next) onClose()
      }}
      title={isEdit ? "Editar destino" : "Conectar destino"}
      description="Sincronize continuamente os traces deste projeto com uma ferramenta de analytics controlada pelo cliente."
      footer={
        <>
          <CloseTrigger />
          <Button variant="outline" onClick={() => void handleTestConnection()} disabled={testing} isLoading={testing}>
            Testar conexão
          </Button>
          <Button type="submit" onClick={() => void form.handleSubmit()}>
            {isEdit ? "Salvar" : "Conectar"}
          </Button>
        </>
      }
    >
      <form
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault()
          void form.handleSubmit()
        }}
      >
        <Select
          name="kind"
          label="Destino"
          options={DESTINATION_KIND_OPTIONS}
          value={kind}
          disabled
          onChange={() => {}}
        />

        <form.Field name="name">
          {(field) => (
            <Input
              required
              autoFocus
              label="Nome"
              placeholder="Meu destino"
              value={field.state.value}
              onChange={(event) => field.handleChange(event.target.value)}
              errors={fieldErrorsAsStrings(field.state.meta.errors)}
            />
          )}
        </form.Field>

        <Fields form={form} isEdit={isEdit} projectId={projectId} destination={destination} />

        {isEdit ? null : (
          <div className="flex flex-col gap-3 rounded-lg border border-border p-3">
            <SwitchInput
              label="Importar traces anteriores"
              description="Após conectar, importe o histórico retido até o limite disponível. Desativado por padrão, para que novos destinos sincronizem apenas dados futuros."
              checked={importSince !== null}
              onCheckedChange={(checked) => setImportSince(checked ? "" : null)}
            />
            {importSince !== null ? (
              <Input
                type="date"
                label="Importar histórico desde"
                value={importSince}
                max={todayStr}
                description="Deixe vazio para importar até o limite de retenção disponível."
                onChange={(event) => setImportSince(event.target.value)}
              />
            ) : null}
          </div>
        )}

        {connectionTest.phase === "testing" ? (
          <div className="flex items-center gap-2">
            <Icon icon={Loader2} size="sm" color="foregroundMuted" className="animate-spin" />
            <Text.H6 color="foregroundMuted">Testando conexão…</Text.H6>
          </div>
        ) : null}
        {connectionTest.phase === "success" ? (
          <div className="flex items-center gap-2">
            <Icon icon={CircleCheck} size="sm" color="success" />
            <Text.H6 color="success">Conexão bem-sucedida.</Text.H6>
          </div>
        ) : null}
        {connectionTest.phase === "error" ? (
          <div className="flex items-center gap-2">
            <Icon icon={CircleAlert} size="sm" color="destructive" />
            <Text.H6 color="destructive">{connectionTest.message}</Text.H6>
          </div>
        ) : null}
      </form>
    </Modal>
  )
}
