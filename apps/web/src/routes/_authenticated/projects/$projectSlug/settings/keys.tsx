import {
  Avatar,
  Button,
  CloseTrigger,
  CopyableText,
  FormWrapper,
  Icon,
  Input,
  Modal,
  Table,
  TableBlankSlate,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableSkeleton,
  Text,
  Tooltip,
  useToast,
} from "@repo/ui"
import { relativeTime } from "@repo/utils"
import { useForm } from "@tanstack/react-form"
import { createFileRoute } from "@tanstack/react-router"
import { Loader2, Pencil, PlusIcon, Trash2 } from "lucide-react"
import { useState } from "react"
import {
  deleteApiKeyMutation,
  insertApiKeyMutation,
  updateApiKeyMutation,
  useApiKeysCollection,
} from "../../../../../domains/api-keys/api-keys.collection.ts"
import type { ApiKeyRecord } from "../../../../../domains/api-keys/api-keys.functions.ts"
import { revokeOAuthKeyMutation, useOAuthKeysCollection } from "../../../../../domains/oauth/oauth-keys.collection.ts"
import type { OAuthKeyRecord } from "../../../../../domains/oauth/oauth-keys.functions.ts"
import { toUserMessage } from "../../../../../lib/errors.ts"
import { createFormSubmitHandler, fieldErrorsAsStrings } from "../../../../../lib/form-server-action.ts"
import { maskSensitiveValue } from "../../../../../lib/mask-sensitive-value.ts"
import { SettingsPage } from "./-components/settings-page.tsx"

export const Route = createFileRoute("/_authenticated/projects/$projectSlug/settings/keys")({
  component: KeysSettingsPage,
})

function CreateApiKeyModal({ open, setOpen }: { open: boolean; setOpen: (open: boolean) => void }) {
  const { toast } = useToast()
  const form = useForm({
    defaultValues: { name: "" },
    onSubmit: createFormSubmitHandler(
      async (value) => {
        await insertApiKeyMutation(value.name)
      },
      {
        onSuccess: async () => {
          setOpen(false)
          toast({
            title: "Sucesso",
            description: "Chave de API criada com sucesso.",
          })
        },
        onError: (error) => {
          toast({ variant: "destructive", description: toUserMessage(error) })
        },
      },
    ),
  })

  return (
    <Modal.Root open={open} onOpenChange={setOpen}>
      <Modal.Content dismissible>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            void form.handleSubmit()
          }}
        >
          <Modal.Header
            title="Criar chave de API"
            description="Crie uma nova chave de API para acessar a API do Vigia."
          />
          <Modal.Body>
            <FormWrapper>
              <form.Field name="name">
                {(field) => (
                  <Input
                    required
                    type="text"
                    label="Nome"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    errors={fieldErrorsAsStrings(field.state.meta.errors)}
                    placeholder="Minha chave de API"
                    description="Um nome descritivo para esta chave de API"
                  />
                )}
              </form.Field>
            </FormWrapper>
          </Modal.Body>
          <Modal.Footer>
            <CloseTrigger />
            <Button type="submit" disabled={form.state.isSubmitting}>
              Create API key
            </Button>
          </Modal.Footer>
        </form>
      </Modal.Content>
    </Modal.Root>
  )
}

function UpdateApiKeyModal({ apiKey, onClose }: { apiKey: ApiKeyRecord; onClose: () => void }) {
  const { toast } = useToast()
  const form = useForm({
    defaultValues: { name: apiKey.name ?? "" },
    onSubmit: createFormSubmitHandler(
      async (value) => {
        const transaction = updateApiKeyMutation(apiKey.id, value.name)
        await transaction.isPersisted.promise
      },
      {
        onSuccess: async () => {
          toast({
            title: "Sucesso",
            description: "Nome da chave de API atualizado.",
          })
          onClose()
        },
        onError: (error) => {
          toast({ variant: "destructive", description: toUserMessage(error) })
        },
      },
    ),
  })

  return (
    <Modal.Root open onOpenChange={onClose}>
      <Modal.Content dismissible>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            void form.handleSubmit()
          }}
        >
          <Modal.Header title="Atualizar chave de API" description="Atualize o nome da sua chave de API." />
          <Modal.Body>
            <FormWrapper>
              <form.Field name="name">
                {(field) => (
                  <Input
                    required
                    type="text"
                    label="Nome"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    errors={fieldErrorsAsStrings(field.state.meta.errors)}
                    placeholder="Nome da chave de API"
                  />
                )}
              </form.Field>
            </FormWrapper>
          </Modal.Body>
          <Modal.Footer>
            <CloseTrigger />
            <Button type="submit" disabled={form.state.isSubmitting}>
              Update API key
            </Button>
          </Modal.Footer>
        </form>
      </Modal.Content>
    </Modal.Root>
  )
}

function DeleteApiKeyModal({ apiKey, onClose }: { apiKey: ApiKeyRecord; onClose: () => void }) {
  const { toast } = useToast()
  const [deleting, setDeleting] = useState(false)
  const displayName = apiKey.name || "Chave de API do Vigia"

  const handleConfirm = async () => {
    setDeleting(true)
    try {
      await deleteApiKeyMutation(apiKey.id).isPersisted.promise
      toast({ description: "Chave de API excluída" })
      onClose()
    } catch (error) {
      setDeleting(false)
      toast({ variant: "destructive", description: toUserMessage(error) })
    }
  }

  return (
    <Modal
      open
      onOpenChange={(open) => {
        if (!open && !deleting) onClose()
      }}
      title="Excluir chave de API"
      description={`Deseja excluir "${displayName}"? Qualquer aplicação que use esta chave perderá imediatamente o acesso à API do Vigia. Esta ação não pode ser desfeita.`}
      dismissible
      footer={
        <div className="flex flex-row items-center gap-2">
          <Button variant="outline" onClick={onClose} disabled={deleting}>
            <Text.H5>Cancelar</Text.H5>
          </Button>
          <Button variant="destructive" onClick={() => void handleConfirm()} disabled={deleting}>
            {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            <Text.H5 color="white">{deleting ? "Excluindo..." : "Excluir chave de API"}</Text.H5>
          </Button>
        </div>
      }
    />
  )
}

function ApiKeysTable({ apiKeys }: { apiKeys: ApiKeyRecord[] }) {
  const [apiKeyToEdit, setApiKeyToEdit] = useState<ApiKeyRecord | null>(null)
  const [apiKeyToDelete, setApiKeyToDelete] = useState<ApiKeyRecord | null>(null)

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Chave</TableHead>
            <TableHead>Criada em</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {apiKeys.map((apiKey) => (
            <TableRow key={apiKey.id} verticalPadding hoverable={false}>
              <TableCell>
                <Text.H5>{apiKey.name || "Chave de API do Vigia"}</Text.H5>
              </TableCell>
              <TableCell>
                <CopyableText
                  value={apiKey.token}
                  displayValue={maskSensitiveValue(apiKey.token)}
                  tooltip="Copiar chave de API"
                />
              </TableCell>
              <TableCell>
                <Text.H5 color="foregroundMuted">{relativeTime(apiKey.createdAt)}</Text.H5>
              </TableCell>
              <TableCell align="right">
                <div className="flex flex-row items-center gap-1">
                  <Tooltip
                    asChild
                    trigger={
                      <Button variant="ghost" onClick={() => setApiKeyToEdit(apiKey)}>
                        <Icon icon={Pencil} size="sm" />
                      </Button>
                    }
                  >
                    Edit API key name
                  </Tooltip>
                  <Tooltip
                    asChild
                    trigger={
                      <Button disabled={apiKeys.length === 1} variant="ghost" onClick={() => setApiKeyToDelete(apiKey)}>
                        <Icon icon={Trash2} size="sm" />
                      </Button>
                    }
                  >
                    {apiKeys.length === 1 ? "Você não pode excluir a última chave de API" : "Excluir chave de API"}
                  </Tooltip>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {apiKeyToEdit ? <UpdateApiKeyModal apiKey={apiKeyToEdit} onClose={() => setApiKeyToEdit(null)} /> : null}
      {apiKeyToDelete ? <DeleteApiKeyModal apiKey={apiKeyToDelete} onClose={() => setApiKeyToDelete(null)} /> : null}
    </>
  )
}

function OAuthKeysTable({ oauthKeys }: { oauthKeys: OAuthKeyRecord[] }) {
  const { toast } = useToast()
  const [keyToRevoke, setKeyToRevoke] = useState<OAuthKeyRecord | null>(null)
  const [revoking, setRevoking] = useState(false)

  const handleConfirm = async () => {
    if (!keyToRevoke) return
    setRevoking(true)
    try {
      await revokeOAuthKeyMutation({ clientId: keyToRevoke.clientId, userId: keyToRevoke.userId })
      toast({ description: "Chave OAuth revogada" })
      setKeyToRevoke(null)
    } catch (error) {
      toast({ variant: "destructive", description: toUserMessage(error) })
    } finally {
      setRevoking(false)
    }
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Cliente</TableHead>
            <TableHead>Autorizado por</TableHead>
            <TableHead>Conectado em</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {oauthKeys.map((row) => (
            <TableRow key={row.id} verticalPadding hoverable={false}>
              <TableCell>
                <div className="inline-flex justify-center items-center gap-2">
                  {row.clientIcon ? (
                    <img
                      src={row.clientIcon}
                      alt=""
                      className="h-6 w-6 inline-flex shrink-0 overflow-hidden rounded-full"
                    />
                  ) : (
                    <Avatar name={row.clientName ?? "Unknown"} size="sm" />
                  )}
                  <div className="flex flex-col">
                    <Text.H5>{row.clientName ?? "Unknown"}</Text.H5>
                    {row.disabled ? <Text.H6 color="destructive">Desativado</Text.H6> : null}
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <div className="inline-flex justify-center items-center gap-2">
                  <Avatar name={(row.userName ?? row.userEmail).trim()} size="sm" />
                  <Text.H5>{row.userName ?? row.userEmail}</Text.H5>
                </div>
              </TableCell>
              <TableCell>
                <Text.H5 color="foregroundMuted">{relativeTime(row.createdAt)}</Text.H5>
              </TableCell>
              <TableCell align="right">
                <Tooltip
                  asChild
                  trigger={
                    <Button variant="ghost" onClick={() => setKeyToRevoke(row)}>
                      <Icon icon={Trash2} size="sm" />
                    </Button>
                  }
                >
                  Revoke OAuth key
                </Tooltip>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {keyToRevoke ? (
        <Modal
          open
          onOpenChange={(open) => {
            if (!open && !revoking) setKeyToRevoke(null)
          }}
          title="Revogar chave OAuth"
          description={`Deseja revogar "${keyToRevoke.clientName ?? "este cliente OAuth"}" para ${
            keyToRevoke.userName ?? keyToRevoke.userEmail
          }? O cliente perderá imediatamente o acesso à API do Vigia. Esta ação não pode ser desfeita.`}
          dismissible
          footer={
            <div className="flex flex-row items-center gap-2">
              <Button variant="outline" onClick={() => setKeyToRevoke(null)} disabled={revoking}>
                <Text.H5>Cancelar</Text.H5>
              </Button>
              <Button variant="destructive" onClick={() => void handleConfirm()} disabled={revoking}>
                {revoking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                <Text.H5 color="white">{revoking ? "Revogando..." : "Revogar chave OAuth"}</Text.H5>
              </Button>
            </div>
          }
        />
      ) : null}
    </>
  )
}

function KeysSettingsPage() {
  const [createOpen, setCreateOpen] = useState(false)
  const { data: apiKeyData, isLoading: apiKeysLoading } = useApiKeysCollection()
  const { data: oauthKeyData, isLoading: oauthKeysLoading } = useOAuthKeysCollection()
  // `useLiveQuery` doesn't preserve the server-fn's ORDER BY — TanStack DB
  // iterates the collection by item key, not by insertion order — so we sort
  // here to match the "Created at" / "Connected at" columns the user reads.
  // Newest first.
  const byCreatedAtDesc = <T extends { readonly createdAt: string }>(a: T, b: T): number =>
    a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0
  const apiKeys = (apiKeyData ?? []).slice().sort(byCreatedAtDesc)
  const oauthKeys = (oauthKeyData ?? []).slice().sort(byCreatedAtDesc)

  return (
    <SettingsPage title="Chaves" description="Gerencie chaves de API e conexões OAuth desta empresa">
      <CreateApiKeyModal open={createOpen} setOpen={setCreateOpen} />

      <section className="flex flex-col gap-4">
        <div className="flex flex-row flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <div className="flex flex-col gap-1">
            <Text.H4 weight="bold">Chaves de API</Text.H4>
            <Text.H5 color="foregroundMuted">
              Chaves de aplicação com acesso a esta empresa por API ou SDK
            </Text.H5>
          </div>
          <div className="shrink-0">
            <Button variant="outline" onClick={() => setCreateOpen(true)}>
              <Icon size="sm" icon={PlusIcon} />
              Nova chave de API
            </Button>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          {apiKeysLoading ? <TableSkeleton cols={3} rows={3} /> : <ApiKeysTable apiKeys={apiKeys} />}
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <Text.H4 weight="bold">Chaves OAuth</Text.H4>
          <Text.H5 color="foregroundMuted">
            Clientes OAuth conectados com acesso a esta empresa (Claude Code, Codex, Cursor... via MCP ou parceiros)
          </Text.H5>
        </div>
        <div className="flex flex-col gap-2">
          {oauthKeysLoading ? (
            <TableSkeleton cols={4} rows={2} />
          ) : oauthKeys.length === 0 ? (
            <TableBlankSlate
              description={
                <div className="flex flex-col justify-center items-center gap-4">
                  Nenhum cliente OAuth conectado ainda
                </div>
              }
            />
          ) : (
            <OAuthKeysTable oauthKeys={oauthKeys} />
          )}
        </div>
      </section>
    </SettingsPage>
  )
}
