import { Button, CloseTrigger, FormWrapper, Input, Modal, useToast } from "@repo/ui"
import { useForm } from "@tanstack/react-form"
import { useRouter } from "@tanstack/react-router"
import { adminProvisionCustomerOrganization } from "../../../../domains/admin/organizations.functions.ts"
import { toUserMessage } from "../../../../lib/errors.ts"
import { createFormSubmitHandler, fieldErrorsAsStrings } from "../../../../lib/form-server-action.ts"

interface ProvisionCustomerOrganizationModalProps {
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
}

export function ProvisionCustomerOrganizationModal({
  open,
  onOpenChange,
}: ProvisionCustomerOrganizationModalProps) {
  const router = useRouter()
  const { toast } = useToast()

  const form = useForm({
    defaultValues: {
      organizationName: "",
      ownerEmail: "",
    },
    onSubmit: createFormSubmitHandler(
      async (value) =>
        await adminProvisionCustomerOrganization({
          data: {
            organizationName: value.organizationName,
            ownerEmail: value.ownerEmail,
          },
        }),
      {
        onSuccess: async (result) => {
          onOpenChange(false)
          form.reset()
          toast({
            description: `Cliente provisionado. O e-mail de ativação foi enviado para ${result.ownerEmail}.`,
          })
          await router.navigate({
            to: "/backoffice/organizations/$organizationId",
            params: { organizationId: result.organizationId },
          })
        },
        onError: (error) => {
          toast({
            variant: "destructive",
            title: "Não foi possível provisionar o cliente",
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
      onOpenChange={(next) => {
        if (!next) form.reset()
        onOpenChange(next)
      }}
      title="Provisionar cliente"
      description="Cria a empresa, o primeiro projeto e a chave do Vigia. O comprador recebe um link para ativar o acesso e conectar seu primeiro agente."
      footer={
        <>
          <CloseTrigger />
          <Button form="provision-customer-organization-form" type="submit" disabled={form.state.isSubmitting}>
            {form.state.isSubmitting ? "Provisionando…" : "Provisionar e enviar ativação"}
          </Button>
        </>
      }
    >
      <form
        id="provision-customer-organization-form"
        onSubmit={(event) => {
          event.preventDefault()
          void form.handleSubmit()
        }}
      >
        <FormWrapper>
          <form.Field name="organizationName">
            {(field) => (
              <Input
                required
                label="Empresa"
                value={field.state.value}
                onChange={(event) => field.handleChange(event.target.value)}
                errors={fieldErrorsAsStrings(field.state.meta.errors)}
                placeholder="Acme Ltda"
                autoComplete="organization"
              />
            )}
          </form.Field>
          <form.Field name="ownerEmail">
            {(field) => (
              <Input
                required
                type="email"
                label="E-mail do comprador"
                description="Este e-mail será vinculado ao link de ativação e se tornará owner da empresa."
                value={field.state.value}
                onChange={(event) => field.handleChange(event.target.value)}
                errors={fieldErrorsAsStrings(field.state.meta.errors)}
                placeholder="responsavel@empresa.com.br"
                autoComplete="email"
              />
            )}
          </form.Field>
        </FormWrapper>
      </form>
    </Modal>
  )
}
