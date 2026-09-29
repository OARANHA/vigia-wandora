import { Button, Icon, Modal, useToast } from "@repo/ui"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Trash2 } from "lucide-react"
import { useState } from "react"
import {
  type DestinationRecord,
  deleteDestination,
} from "../../../../../../domains/destinations/destinations.functions.ts"
import { toUserMessage } from "../../../../../../lib/errors.ts"
import { destinationsQueryKey } from "./destinations-section.tsx"

export function DeleteDestinationModal({
  projectId,
  destination,
  onClose,
}: {
  readonly projectId: string
  readonly destination: DestinationRecord
  readonly onClose: () => void
}) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [deleting, setDeleting] = useState(false)

  const mutation = useMutation({
    mutationFn: () => deleteDestination({ data: { projectId, destinationId: destination.id } }),
  })

  const handleConfirm = async () => {
    setDeleting(true)
    try {
      await mutation.mutateAsync()
      await queryClient.invalidateQueries({ queryKey: destinationsQueryKey(projectId) })
      toast({ description: "Destino excluído." })
      onClose()
    } catch (error) {
      setDeleting(false)
      toast({ variant: "destructive", description: toUserMessage(error) })
    }
  }

  return (
    <Modal
      open
      dismissible
      onOpenChange={(next) => {
        if (!next && !deleting) onClose()
      }}
      title="Excluir destino"
      description={`Excluir "${destination.name}"? Isso interrompe a sincronização e remove permanentemente o histórico de entregas. Dados já enviados ao destino não são afetados.`}
      footer={
        <div className="flex flex-row items-center gap-2">
          <Button variant="outline" onClick={onClose} disabled={deleting}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={() => void handleConfirm()} disabled={deleting} isLoading={deleting}>
            <Icon icon={Trash2} size="sm" />
            {deleting ? "Excluindo…" : "Excluir destino"}
          </Button>
        </div>
      }
    />
  )
}
