import { Button, CloseTrigger, FormWrapper, Input, Modal, useToast } from "@repo/ui"
import { useForm } from "@tanstack/react-form"
import { setActiveOrganization } from "../../../domains/auth/auth.functions.ts"
import { createOrganization } from "../../../domains/organizations/organizations.functions.ts"
import { toUserMessage } from "../../../lib/errors.ts"
import { ptBR } from "../../../lib/i18n/pt-BR.ts"
import { createFormSubmitHandler, fieldErrorsAsStrings } from "../../../lib/form-server-action.ts"

interface CreateOrganizationModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateOrganizationModal({ open, onOpenChange }: CreateOrganizationModalProps) {
  const { toast } = useToast()

  const form = useForm({
    defaultValues: { name: "" },
    onSubmit: createFormSubmitHandler(
      async (value) => {
        const org = await createOrganization({ data: { name: value.name } })
        await setActiveOrganization({
          data: { organizationId: org.id, organizationSlug: org.slug },
        })
        return org
      },
      {
        onSuccess: async () => {
          toast({ description: ptBR.clientShell.organizationModal.success })
          onOpenChange(false)
          window.location.href = "/"
        },
        onError: (error) => {
          toast({ variant: "destructive", description: toUserMessage(error) })
        },
      },
    ),
  })

  return (
    <Modal
      open={open}
      dismissible
      onOpenChange={onOpenChange}
      title={ptBR.clientShell.organizationModal.title}
      description={ptBR.clientShell.organizationModal.description}
      footer={
        <>
          <CloseTrigger />
          <Button form="create-organization-form" type="submit" disabled={form.state.isSubmitting}>
            {ptBR.clientShell.organizationModal.create}
          </Button>
        </>
      }
    >
      <form
        id="create-organization-form"
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
                label={ptBR.clientShell.organizationModal.nameLabel}
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                errors={fieldErrorsAsStrings(field.state.meta.errors)}
                placeholder={ptBR.clientShell.organizationModal.namePlaceholder}
              />
            )}
          </form.Field>
        </FormWrapper>
      </form>
    </Modal>
  )
}
