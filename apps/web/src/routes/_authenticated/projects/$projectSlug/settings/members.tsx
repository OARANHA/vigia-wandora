import {
  Avatar,
  Button,
  CloseTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRoot,
  DropdownMenuTrigger,
  FormWrapper,
  Icon,
  Input,
  Label,
  Modal,
  Select,
  Table,
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
import { relativeTime, toTitle } from "@repo/utils"
import { useForm } from "@tanstack/react-form"
import { createFileRoute } from "@tanstack/react-router"
import { ChevronDown, Trash2, UserPlusIcon } from "lucide-react"
import { useState } from "react"
import {
  cancelMemberInviteMutation,
  inviteMemberMutation,
  removeMemberMutation,
  transferOwnershipMutation,
  updateMemberRoleMutation,
  useMembersCollection,
} from "../../../../../domains/members/members.collection.ts"
import type { MemberRecord } from "../../../../../domains/members/members.functions.ts"
import { toUserMessage } from "../../../../../lib/errors.ts"
import { createFormSubmitHandler, fieldErrorsAsStrings } from "../../../../../lib/form-server-action.ts"
import { useAuthenticatedUser } from "../../../-route-data.ts"
import { SettingsPage } from "./-components/settings-page.tsx"

export const Route = createFileRoute("/_authenticated/projects/$projectSlug/settings/members")({
  component: MembersSettingsPage,
})

const INVITE_ROLE_OPTIONS: { label: string; value: "admin" | "member" }[] = [
  { label: "Membro", value: "member" },
  { label: "Administrador", value: "admin" },
]

function InviteMemberModal({ open, setOpen }: { open: boolean; setOpen: (open: boolean) => void }) {
  const { toast } = useToast()
  const form = useForm({
    defaultValues: { email: "", role: "member" as "admin" | "member" },
    onSubmit: createFormSubmitHandler(
      async (value) => {
        await inviteMemberMutation(value.email, value.role)
      },
      {
        onSuccess: async () => {
          setOpen(false)
          toast({ description: "Convite enviado" })
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
          <Modal.Header title="Adicionar membro" description="Convide uma pessoa para esta empresa por email." />
          <Modal.Body>
            <FormWrapper>
              <form.Field name="email">
                {(field) => (
                  <Input
                    required
                    type="email"
                    label="Email"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    errors={fieldErrorsAsStrings(field.state.meta.errors)}
                    placeholder="pessoa@empresa.com.br"
                  />
                )}
              </form.Field>
              <form.Field name="role">
                {(field) => (
                  <Select
                    name="role"
                    label="Função"
                    options={INVITE_ROLE_OPTIONS}
                    value={field.state.value}
                    onChange={(value) => field.handleChange(value)}
                    errors={fieldErrorsAsStrings(field.state.meta.errors)}
                  />
                )}
              </form.Field>
            </FormWrapper>
          </Modal.Body>
          <Modal.Footer>
            <Button type="submit" disabled={form.state.isSubmitting}>
              Send invite
            </Button>
            <CloseTrigger />
          </Modal.Footer>
        </form>
      </Modal.Content>
    </Modal.Root>
  )
}

function TransferOwnershipModal({
  open,
  setOpen,
  members,
  currentUserId,
}: {
  open: boolean
  setOpen: (open: boolean) => void
  members: MemberRecord[]
  currentUserId: string
}) {
  const { toast } = useToast()
  const eligibleMembers = members.filter(
    (member) => member.status === "active" && member.userId !== currentUserId && member.userId !== null,
  )
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null)

  const memberOptions = eligibleMembers.map((member) => ({
    label: `${member.name ?? member.email} (${member.email})`,
    value: member.userId ?? "",
  }))

  const handleTransfer = async () => {
    if (!selectedMemberId) return

    try {
      await transferOwnershipMutation(selectedMemberId)
      setOpen(false)
      toast({ description: "Propriedade transferida com sucesso. Agora você é administrador." })
    } catch (error) {
      toast({ variant: "destructive", description: toUserMessage(error) })
    }
  }

  return (
    <Modal.Root open={open} onOpenChange={setOpen}>
      <Modal.Content dismissible>
        <Modal.Header
          title="Transferir propriedade"
          description="Transfira a propriedade desta empresa para outro membro. Após a transferência, você será administrador."
        />
        <Modal.Body>
          <FormWrapper>
            {eligibleMembers.length === 0 ? (
              <Text.H5 color="foregroundMuted">
                Nenhum membro elegível para receber a propriedade. Adicione mais membros primeiro.
              </Text.H5>
            ) : (
              <div className="flex flex-col gap-2">
                <Label>Selecione o novo proprietário</Label>
                <Select
                  name="newOwner"
                  options={memberOptions}
                  value={selectedMemberId ?? undefined}
                  onChange={(value) => setSelectedMemberId(value)}
                  placeholder="Selecione um membro..."
                  searchable
                  searchPlaceholder="Buscar membros..."
                  searchableEmptyMessage="Nenhum membro encontrado"
                />
              </div>
            )}
          </FormWrapper>
        </Modal.Body>
        <Modal.Footer>
          <CloseTrigger />
          <Button
            type="button"
            disabled={eligibleMembers.length === 0 || !selectedMemberId}
            onClick={() => void handleTransfer()}
          >
            Transferir propriedade
          </Button>
        </Modal.Footer>
      </Modal.Content>
    </Modal.Root>
  )
}

function ChangeRoleModal({
  open,
  setOpen,
  member,
  onRoleChange,
}: {
  open: boolean
  setOpen: (open: boolean) => void
  member: MemberRecord | null
  onRoleChange: (targetUserId: string, newRole: "admin" | "member") => Promise<void>
}) {
  const { toast } = useToast()
  const [selectedRole, setSelectedRole] = useState<"admin" | "member" | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      if (member?.role === "admin") {
        setSelectedRole("admin")
      } else if (member?.role === "member") {
        setSelectedRole("member")
      }
    } else {
      setSelectedRole(null)
    }
    setOpen(nextOpen)
  }

  const handleSubmit = async () => {
    if (!member?.userId || !selectedRole) return

    setIsSubmitting(true)
    try {
      await onRoleChange(member.userId, selectedRole)
      setOpen(false)
      toast({ description: `Função atualizada para ${selectedRole === "admin" ? "administrador" : "membro"}` })
    } catch (error) {
      toast({ variant: "destructive", description: toUserMessage(error) })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!member) return null

  return (
    <Modal.Root open={open} onOpenChange={handleOpenChange}>
      <Modal.Content dismissible>
        <Modal.Header title="Alterar função do membro" description={`Atualize a função de ${member.name ?? member.email}`} />
        <Modal.Body>
          <FormWrapper>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label>Selecione a nova função</Label>
                <div className="flex flex-col gap-2">
                  <label className="flex cursor-pointer items-center gap-2 rounded border p-3 hover:bg-muted">
                    <input
                      type="radio"
                      name="role"
                      value="admin"
                      checked={selectedRole === "admin"}
                      onChange={(e) => setSelectedRole(e.target.value as "admin")}
                      className="h-4 w-4"
                    />
                    <div className="flex flex-col">
                      <Text.H5>Administrador</Text.H5>
                      <Text.H6 color="foregroundMuted">Pode gerenciar membros e configurações da empresa</Text.H6>
                    </div>
                  </label>
                  <label className="flex cursor-pointer items-center gap-2 rounded border p-3 hover:bg-muted">
                    <input
                      type="radio"
                      name="role"
                      value="member"
                      checked={selectedRole === "member"}
                      onChange={(e) => setSelectedRole(e.target.value as "member")}
                      className="h-4 w-4"
                    />
                    <div className="flex flex-col">
                      <Text.H5>Membro</Text.H5>
                      <Text.H6 color="foregroundMuted">Membro padrão com permissões limitadas</Text.H6>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          </FormWrapper>
        </Modal.Body>
        <Modal.Footer>
          <CloseTrigger />
          <Button type="button" disabled={!selectedRole || isSubmitting} onClick={() => void handleSubmit()}>
            {isSubmitting ? "Atualizando..." : "Atualizar função"}
          </Button>
        </Modal.Footer>
      </Modal.Content>
    </Modal.Root>
  )
}

function MembersTable({
  members,
  currentUserId,
  isOwner,
  isAdmin,
}: {
  members: MemberRecord[]
  currentUserId: string
  isOwner: boolean
  isAdmin: boolean
}) {
  const { toast } = useToast()
  const [transferOpen, setTransferOpen] = useState(false)
  const [changeRoleOpen, setChangeRoleOpen] = useState(false)
  const [selectedMember, setSelectedMember] = useState<MemberRecord | null>(null)
  const [isMutatingMember, setIsMutatingMember] = useState(false)
  const [pendingMemberMutation, setPendingMemberMutation] = useState<
    | { type: "remove-member"; membershipId: string; email: string; name: string | null }
    | { type: "cancel-invite"; inviteId: string; email: string; name: string | null }
    | null
  >(null)

  const isExpired = (expiresAt: string | null | undefined) => {
    if (!expiresAt) return false
    return new Date(expiresAt) < new Date()
  }

  const handleRoleChange = async (targetUserId: string, newRole: "admin" | "member") => {
    try {
      await updateMemberRoleMutation(targetUserId, newRole)
    } catch (error) {
      toast({ variant: "destructive", description: toUserMessage(error) })
      throw error
    }
  }

  const canChangeRole = (member: MemberRecord) => {
    if (!isAdmin) return false
    if (member.userId === currentUserId) return false
    if (member.role === "owner") return false
    if (member.status !== "active") return false
    return true
  }

  const handleConfirmMemberMutation = async () => {
    if (!pendingMemberMutation) return

    setIsMutatingMember(true)
    try {
      const transaction =
        pendingMemberMutation.type === "cancel-invite"
          ? cancelMemberInviteMutation(pendingMemberMutation.inviteId)
          : removeMemberMutation(pendingMemberMutation.membershipId)

      await transaction.isPersisted.promise

      toast({
        description: pendingMemberMutation.type === "cancel-invite" ? "Convite cancelado" : "Membro removido",
      })
      setPendingMemberMutation(null)
    } catch (error) {
      toast({ variant: "destructive", description: toUserMessage(error) })
    } finally {
      setIsMutatingMember(false)
    }
  }

  const pendingMemberDisplayName = pendingMemberMutation?.name ?? pendingMemberMutation?.email ?? "este membro"
  const isCancelInviteMutation = pendingMemberMutation?.type === "cancel-invite"

  return (
    <>
      <TransferOwnershipModal
        open={transferOpen}
        setOpen={setTransferOpen}
        members={members}
        currentUserId={currentUserId}
      />
      <ChangeRoleModal
        open={changeRoleOpen}
        setOpen={setChangeRoleOpen}
        member={selectedMember}
        onRoleChange={handleRoleChange}
      />
      <Modal.Root
        open={pendingMemberMutation !== null}
        onOpenChange={(open) => {
          if (!open && !isMutatingMember) {
            setPendingMemberMutation(null)
          }
        }}
      >
        <Modal.Content dismissible>
          <Modal.Header
            title={isCancelInviteMutation ? "Cancelar convite?" : "Remover membro?"}
            description={
              isCancelInviteMutation
                ? `Deseja cancelar o convite pendente para ${pendingMemberDisplayName}?`
                : `Deseja remover ${pendingMemberDisplayName} desta empresa?`
            }
          />
          <Modal.Footer>
            <CloseTrigger />
            <Button
              variant="destructive"
              onClick={() => void handleConfirmMemberMutation()}
              disabled={pendingMemberMutation === null || isMutatingMember}
            >
              {isMutatingMember
                ? isCancelInviteMutation
                  ? "Cancelando..."
                  : "Removendo..."
                : isCancelInviteMutation
                  ? "Cancelar convite"
                  : "Remover membro"}
            </Button>
          </Modal.Footer>
        </Modal.Content>
      </Modal.Root>
      <Table>
        <TableHeader>
          <TableRow verticalPadding>
            <TableHead>Membro</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Função</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Convite</TableHead>
            {isAdmin && <TableHead />}
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.map((member) => (
            <TableRow key={member.id} verticalPadding hoverable={false}>
              <TableCell>
                {member.name ? (
                  <div className="inline-flex justify-center items-center gap-2">
                    <Avatar name={member.name} size="sm" imageSrc={member.image} />
                    <Text.H5>
                      {member.name}{" "}
                      {member.userId === currentUserId && <span className="text-muted-foreground">· Você</span>}
                    </Text.H5>
                  </div>
                ) : (
                  <Text.H5>-</Text.H5>
                )}
              </TableCell>
              <TableCell>
                <Text.H5 color="foregroundMuted">{member.email}</Text.H5>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  {(member.role === "owner" && isOwner) || canChangeRole(member) ? (
                    <DropdownMenuRoot modal={false}>
                      <DropdownMenuTrigger asChild>
                        <div className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 transition-colors hover:bg-muted">
                          <Text.H5 color="foregroundMuted">{toTitle(member.role)}</Text.H5>
                          <Icon icon={ChevronDown} size="sm" className="text-muted-foreground" />
                        </div>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="border-0">
                        {member.role === "owner" && isOwner ? (
                          <DropdownMenuItem onSelect={() => setTransferOpen(true)}>Transferir propriedade</DropdownMenuItem>
                        ) : null}
                        {canChangeRole(member) ? (
                          <DropdownMenuItem
                            onSelect={() => {
                              setSelectedMember(member)
                              setChangeRoleOpen(true)
                            }}
                          >
                            Change role
                          </DropdownMenuItem>
                        ) : null}
                      </DropdownMenuContent>
                    </DropdownMenuRoot>
                  ) : (
                    <Text.H5 color="foregroundMuted">{toTitle(member.role)}</Text.H5>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <Text.H5 color={member.status === "invited" ? "warningMutedForeground" : "foregroundMuted"}>
                  {member.status === "invited" ? "Pending" : "Active"}
                </Text.H5>
              </TableCell>
              <TableCell>
                {member.status === "invited" ? (
                  member.expiresAt && isExpired(member.expiresAt) ? (
                    <Text.H5 color="destructive">Expirado</Text.H5>
                  ) : member.expiresAt ? (
                    <Text.H5 color="foregroundMuted">
                      Expires {relativeTime(member.expiresAt).replace(/^./, (c) => c.toLowerCase())}
                    </Text.H5>
                  ) : (
                    <Text.H5 color="foregroundMuted">Sem expiração</Text.H5>
                  )
                ) : (
                  <Text.H5 color="foregroundMuted">-</Text.H5>
                )}
              </TableCell>
              {isAdmin && (
                <TableCell align="right">
                  {(member.status === "active" || member.status === "invited") &&
                  !(member.role === "owner" && !isOwner) &&
                  member.userId !== currentUserId ? (
                    <Tooltip
                      asChild
                      trigger={
                        <Button
                          variant="ghost"
                          onClick={() => {
                            setPendingMemberMutation(
                              member.status === "invited"
                                ? {
                                    type: "cancel-invite",
                                    inviteId: member.id,
                                    email: member.email,
                                    name: member.name,
                                  }
                                : {
                                    type: "remove-member",
                                    membershipId: member.id,
                                    email: member.email,
                                    name: member.name,
                                  },
                            )
                          }}
                        >
                          <Icon icon={Trash2} size="sm" />
                        </Button>
                      }
                    >
                      {member.status === "invited" ? "Cancelar convite" : "Remover membro"}
                    </Tooltip>
                  ) : null}
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  )
}

function MembersSettingsPage() {
  const user = useAuthenticatedUser()
  const [inviteOpen, setInviteOpen] = useState(false)
  const { data, isLoading } = useMembersCollection()
  const members = data ?? []
  const currentUserMembership = members.find((member) => member.userId === user.id)
  const isOwner = currentUserMembership?.role === "owner"
  const isAdmin = isOwner || currentUserMembership?.role === "admin"

  return (
    <SettingsPage
      title="Membros"
      description="Membros e convites pendentes desta empresa"
      actions={
        isAdmin ? (
          <Button variant="outline" onClick={() => setInviteOpen(true)}>
            <Icon size="sm" icon={UserPlusIcon} />
            Member
          </Button>
        ) : null
      }
    >
      <InviteMemberModal open={inviteOpen} setOpen={setInviteOpen} />
      <div className="flex flex-col gap-2">
        {isLoading ? <TableSkeleton cols={6} rows={3} /> : null}
        {!isLoading && members.length > 0 ? (
          <MembersTable members={members} currentUserId={user.id} isOwner={isOwner} isAdmin={isAdmin} />
        ) : null}
      </div>
    </SettingsPage>
  )
}
