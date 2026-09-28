import { Button, CloseTrigger, FormWrapper, Input, Modal, useToast } from "@repo/ui"
import { useForm } from "@tanstack/react-form"
import { useQueryClient } from "@tanstack/react-query"
import { useRouter } from "@tanstack/react-router"
import { createProjectMutation } from "../../../domains/projects/projects.collection.ts"
import type { ProjectRecord } from "../../../domains/projects/projects.functions.ts"
import { toUserMessage } from "../../../lib/errors.ts"
import { createFormSubmitHandler, fieldErrorsAsStrings } from "../../../lib/form-server-action.ts"

export function CreateProjectModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { toast } = useToast()
  const router = useRouter()
  const queryClient = useQueryClient()
  const form = useForm({
    defaultValues: {
      name: "",
    },
    onSubmit: createFormSubmitHandler(
      async (value) => {
        const { projectId, transaction } = createProjectMutation(value.name)
        await transaction.isPersisted.promise
        return { projectId }
      },
      {
        onSuccess: async ({ projectId }) => {
          const projects = queryClient.getQueryData<ProjectRecord[]>(["projects"])
          const slug = projects?.find((p) => p.id === projectId)?.slug
          if (slug) {
            await router.navigate({
              to: "/projects/$projectSlug/onboarding",
              params: { projectSlug: slug },
            })
          }
          onClose()
        },
        onError: (error) => {
          toast({
            variant: "destructive",
            title: "Não foi possível criar o agente",
            description: toUserMessage(error),
          })
        },
      },
    ),
  })

  return (
    <Modal
      open={open}
      dismissible
      onOpenChange={onClose}
      title="Criar agente"
      description="Crie um agente para conectar suas execuções ao Vigia."
      footer={
        <>
          <CloseTrigger />
          <Button
            type="submit"
            onClick={() => {
              void form.handleSubmit()
            }}
          >
            Criar agente
          </Button>
        </>
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault()
          void form.handleSubmit()
        }}
      >
        <FormWrapper>
          <form.Field name="name">
            {(field) => (
              <Input
                required
                type="text"
                label="Nome do agente"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                errors={fieldErrorsAsStrings(field.state.meta.errors)}
                placeholder="Agente de atendimento"
              />
            )}
          </form.Field>
        </FormWrapper>
      </form>
    </Modal>
  )
}
