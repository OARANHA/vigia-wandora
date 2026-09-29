import { Button, CloseTrigger, Input, Modal, useToast } from "@repo/ui"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import {
  type DestinationRecord,
  startDestinationBackfill,
} from "../../../../../../domains/destinations/destinations.functions.ts"
import { toUserMessage } from "../../../../../../lib/errors.ts"
import { destinationsQueryKey } from "./destinations-section.tsx"

const toDateInput = (d: Date) => d.toISOString().slice(0, 10)

/**
 * Starts a user-initiated, on-demand historical backfill for a destination's
 * enabled sources. The reachable depth is the org's subscription retention —
 * resolved and clamped entirely on the backend; the UI never needs to know it.
 * An empty date means "as far back as retained". (Resume's gap backfill is
 * enqueued by the server, not here.)
 */
export function BackfillDestinationModal({
  projectId,
  destination,
  onClose,
  onStarted,
}: {
  readonly projectId: string
  readonly destination: DestinationRecord
  readonly onClose: () => void
  readonly onStarted?: () => void
}) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const todayStr = toDateInput(new Date())

  // Empty = "as far back as retained" (backend clamps to the plan's retention window).
  const [since, setSince] = useState("")

  const backfill = useMutation({
    mutationFn: () =>
      startDestinationBackfill({
        data: {
          projectId,
          destinationId: destination.id,
          // Picker date as UTC midnight — deliberate: for a backfill lower bound a few hours of skew only widens coverage.
          ...(since ? { since: new Date(`${since}T00:00:00.000Z`).toISOString() } : {}),
        },
      }),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: destinationsQueryKey(projectId) })
      if (result.failed > 0) {
        toast({ variant: "destructive", description: "Não foi possível iniciar a importação histórica para algumas origens. Tente novamente." })
      } else if (result.enqueued === 0) {
        toast({ description: "Não há nada para importar. O histórico já foi processado até o limite de retenção disponível." })
      } else {
        toast({ description: "Importação histórica iniciada. As janelas processadas aparecerão no histórico de execuções." })
        onStarted?.()
      }
      onClose()
    },
    onError: (error) => toast({ variant: "destructive", description: toUserMessage(error) }),
  })

  return (
    <Modal
      open
      dismissible
      onOpenChange={(next) => {
        if (!next) onClose()
      }}
      title="Importar histórico"
      description="Envie traces anteriores deste projeto para o destino. O Vigia importa até o limite de retenção disponível; dados mais antigos são ignorados."
      footer={
        <>
          <CloseTrigger />
          <Button onClick={() => backfill.mutate()} isLoading={backfill.isPending}>
            Iniciar importação
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Input
          type="date"
          label="Importar histórico desde"
          value={since}
          max={todayStr}
          description="Deixe vazio para importar até o limite de retenção disponível. Repetir a operação é seguro; o destino ignora duplicatas."
          onChange={(event) => setSince(event.target.value)}
        />
      </div>
    </Modal>
  )
}
