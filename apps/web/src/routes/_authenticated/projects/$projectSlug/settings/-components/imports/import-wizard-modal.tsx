import { Modal } from "@repo/ui"
import { ImportWizard } from "../../../../../../../components/imports/import-wizard.tsx"
import type { ImportRecord } from "../../../../../../../domains/imports/imports.functions.ts"

/** The imports settings page's dialog framing around the shared wizard. */
export function ImportWizardModal({
  projectId,
  retryJob,
  onClose,
}: {
  readonly projectId: string
  readonly retryJob?: ImportRecord
  readonly onClose: () => void
}) {
  return (
    <Modal.Root open onOpenChange={(open) => !open && onClose()}>
      <Modal.Content dismissible size="medium">
        <Modal.Header
          title={retryJob ? "Tentar importação novamente" : "Importar traces"}
          description={
            retryJob
              ? "In order to retry the import we need the platform's credentials again"
              : "Importe sessões, traces e spans existentes de outras plataformas de observabilidade"
          }
        />
        <ImportWizard
          projectId={projectId}
          chrome="modal"
          onCancel={onClose}
          onStarted={onClose}
          {...(retryJob ? { retryJob } : {})}
        />
      </Modal.Content>
    </Modal.Root>
  )
}
