import {
  admitsTopic,
  NOTIFICATION_GROUP_META,
  NOTIFICATION_GROUPS,
  NOTIFICATION_TOPIC_META,
  type NotificationGroup,
  type NotificationPreferences,
  type NotificationTopic,
} from "@domain/shared"
import {
  Avatar,
  Button,
  Checkbox,
  FormWrapper,
  GitHubIcon,
  GoogleIcon,
  Icon,
  Input,
  Label,
  Modal,
  Skeleton,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableSkeleton,
  Text,
  Tooltip,
  useMountEffect,
  useToast,
} from "@repo/ui"
import { relativeTime, toTitle } from "@repo/utils"
import { useForm } from "@tanstack/react-form"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute, useRouter } from "@tanstack/react-router"
import { Loader2, LogOut, type LucideIcon, Monitor, TabletSmartphone, Tv } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { z } from "zod"
import { minSeverityHint, SeveritySelector } from "../../../../../domains/alerts/severity-selector.tsx"
import {
  getNotificationPreferences,
  updateNotificationPreferences,
} from "../../../../../domains/notifications/notifications.functions.ts"
import { deleteCurrentUser, updateUserName } from "../../../../../domains/sessions/session.functions.ts"
import {
  listUserAccounts,
  SOCIAL_PROVIDER_IDS,
  type SocialProviderId,
  type UserAccountDto,
  unlinkUserAccount,
} from "../../../../../domains/sessions/user-accounts.functions.ts"
import {
  listUserSessions,
  revokeAllOtherUserSessions,
  revokeUserSession,
  type UserSessionDto,
} from "../../../../../domains/sessions/user-sessions.functions.ts"
import { oauthLinkErrorMessage } from "../../../../../lib/auth/oauth-errors.ts"
import { authClient } from "../../../../../lib/auth-client.ts"
import { toUserMessage } from "../../../../../lib/errors.ts"
import { createFormSubmitHandler, fieldErrorsAsStrings } from "../../../../../lib/form-server-action.ts"
import { useAuthenticatedUser } from "../../../-route-data.ts"
import { SettingsPage } from "./-components/settings-page.tsx"

// Flash params from the `linkSocial` redirect round-trip: BA sends the user
// back to `callbackURL` (`?linked=<provider>`) on success or appends
// `?error=<code>` to `errorCallbackURL` on failure.
const accountSearchParams = z.object({
  linked: z.enum(SOCIAL_PROVIDER_IDS).optional(),
  error: z.string().optional(),
})

export const Route = createFileRoute("/_authenticated/projects/$projectSlug/settings/account")({
  validateSearch: accountSearchParams,
  component: AccountSettingsPage,
})

function DeleteAccountConfirmModal({ open, setOpen }: { open: boolean; setOpen: (open: boolean) => void }) {
  const { toast } = useToast()
  const router = useRouter()
  const [confirmText, setConfirmText] = useState("")
  const [isDeleting, setIsDeleting] = useState(false)

  const expectedText = "excluir minha conta"
  const isConfirmed = confirmText.toLowerCase() === expectedText

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      await deleteCurrentUser()
      await authClient.signOut()
      void router.navigate({ to: "/login" })
    } catch (error) {
      toast({ variant: "destructive", description: toUserMessage(error) })
      setIsDeleting(false)
    }
  }

  return (
    <Modal
      dismissible
      open={open}
      onOpenChange={(v) => {
        if (!v) setConfirmText("")
        setOpen(v)
      }}
      title="Excluir conta"
      description="Esta ação é permanente e não pode ser desfeita. Todos os seus dados serão excluídos. Se você for o único membro de uma empresa, ela também será excluída permanentemente."
      footer={
        <>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button variant="destructive" disabled={!isConfirmed || isDeleting} onClick={() => void handleDelete()}>
            {isDeleting ? "Excluindo..." : "Excluir conta"}
          </Button>
        </>
      }
    >
      <FormWrapper>
        <Input
          type="text"
          label={`Type "${expectedText}" to confirm`}
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          placeholder={expectedText}
        />
      </FormWrapper>
    </Modal>
  )
}

const formatSessionLocation = (session: UserSessionDto): string => {
  if (!session.geo) return "Unknown location"
  const parts = [session.geo.city, session.geo.region, session.geo.country].filter((p): p is string => Boolean(p))
  if (parts.length === 0) return "Unknown location"
  return parts.join(", ")
}

const formatDeviceLine = (session: UserSessionDto): string => {
  const browser = session.browserName ? toTitle(session.browserName) : "Unknown browser"
  const os = session.osName ? ` on ${toTitle(session.osName)}` : " on a"
  const device = ` ${session.deviceKind.toLowerCase()}`
  return `${browser}${os}${device}`
}

/**
 * Bowser `platform.type` → lucide icon. Bowser only emits
 * `desktop | mobile | tablet | tv`, with `"desktop"` as the fallback for
 * the unset case. Anything we don't recognize falls back to the generic
 * `tablet-smartphone` so an unexpected value never breaks the row.
 */
const DEVICE_ICONS: Readonly<Record<string, LucideIcon>> = {
  desktop: Monitor,
  mobile: TabletSmartphone,
  tablet: TabletSmartphone,
  tv: Tv,
}

const deviceIconFor = (kind: string): LucideIcon => DEVICE_ICONS[kind] ?? TabletSmartphone

function RevokeSessionConfirmModal({ session, onClose }: { session: UserSessionDto; onClose: () => void }) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [revoking, setRevoking] = useState(false)

  const handleConfirm = async () => {
    setRevoking(true)
    try {
      await revokeUserSession({ data: { token: session.token } })
      toast({ description: "Sessão encerrada" })
      await queryClient.invalidateQueries({ queryKey: ["userSessions"] })
      onClose()
    } catch (error) {
      setRevoking(false)
      toast({ variant: "destructive", description: toUserMessage(error) })
    }
  }

  return (
    <Modal
      open
      onOpenChange={(open) => {
        if (!open && !revoking) onClose()
      }}
      title="Encerrar sessão do dispositivo"
      description={`Deseja encerrar a sessão de "${formatDeviceLine(session)}"? Este dispositivo perderá o acesso imediatamente e precisará entrar novamente.`}
      dismissible
      footer={
        <div className="flex flex-row items-center gap-2">
          <Button variant="outline" onClick={onClose} disabled={revoking}>
            <Text.H5>Cancelar</Text.H5>
          </Button>
          <Button variant="destructive" onClick={() => void handleConfirm()} disabled={revoking}>
            {revoking ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
            <Text.H5 color="white">{revoking ? "Signing out..." : "Sign out"}</Text.H5>
          </Button>
        </div>
      }
    />
  )
}

function RevokeAllOtherSessionsConfirmModal({ otherCount, onClose }: { otherCount: number; onClose: () => void }) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [revoking, setRevoking] = useState(false)

  const handleConfirm = async () => {
    setRevoking(true)
    try {
      await revokeAllOtherUserSessions()
      toast({ description: "Sessões encerradas nos outros dispositivos" })
      await queryClient.invalidateQueries({ queryKey: ["userSessions"] })
      onClose()
    } catch (error) {
      setRevoking(false)
      toast({ variant: "destructive", description: toUserMessage(error) })
    }
  }

  const deviceLabel = otherCount === 1 ? "1 other device" : `${otherCount} other devices`

  return (
    <Modal
      open
      onOpenChange={(open) => {
        if (!open && !revoking) onClose()
      }}
      title="Sign out everywhere else"
      description={`Deseja encerrar a sessão de ${deviceLabel}? O acesso será perdido imediatamente e será necessário entrar novamente. Este dispositivo permanecerá conectado.`}
      dismissible
      footer={
        <div className="flex flex-row items-center gap-2">
          <Button variant="outline" onClick={onClose} disabled={revoking}>
            <Text.H5>Cancelar</Text.H5>
          </Button>
          <Button variant="destructive" onClick={() => void handleConfirm()} disabled={revoking}>
            {revoking ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
            <Text.H5 color="white">{revoking ? "Signing out..." : "Sign out everywhere else"}</Text.H5>
          </Button>
        </div>
      }
    />
  )
}

interface SocialProviderMeta {
  readonly id: SocialProviderId
  readonly label: string
  readonly icon: React.ComponentType<{ className?: string }>
}

const SOCIAL_PROVIDERS: readonly SocialProviderMeta[] = [
  { id: "google", label: "Google", icon: GoogleIcon },
  { id: "github", label: "GitHub", icon: GitHubIcon },
]

const providerLabel = (id: SocialProviderId): string => SOCIAL_PROVIDERS.find((p) => p.id === id)?.label ?? id

function DisconnectAccountConfirmModal({
  provider,
  account,
  onClose,
}: {
  provider: SocialProviderMeta
  account: UserAccountDto
  onClose: () => void
}) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [disconnecting, setDisconnecting] = useState(false)

  const handleConfirm = async () => {
    setDisconnecting(true)
    try {
      await unlinkUserAccount({
        data: { providerId: provider.id, accountId: account.accountId },
      })
      toast({ description: `${provider.label} desconectado` })
      await queryClient.invalidateQueries({ queryKey: ["userAccounts"] })
      onClose()
    } catch (error) {
      setDisconnecting(false)
      toast({ variant: "destructive", description: toUserMessage(error) })
    }
  }

  return (
    <Modal
      open
      onOpenChange={(open) => {
        if (!open && !disconnecting) onClose()
      }}
      title={`Desconectar ${provider.label}`}
      description={`Você não poderá mais entrar com ${provider.label}. O acesso por email continuará funcionando e você poderá reconectar ${provider.label} quando quiser.`}
      dismissible
      footer={
        <div className="flex flex-row items-center gap-2">
          <Button variant="outline" onClick={onClose} disabled={disconnecting}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={() => void handleConfirm()} disabled={disconnecting}>
            {disconnecting ? "Desconectando..." : "Desconectar"}
          </Button>
        </div>
      }
    />
  )
}

function ConnectedAccountsSection() {
  const { toast } = useToast()
  const { data, isLoading } = useQuery({
    queryKey: ["userAccounts"],
    queryFn: () => listUserAccounts(),
  })
  const [connecting, setConnecting] = useState<SocialProviderId | null>(null)
  const [toDisconnect, setToDisconnect] = useState<{
    provider: SocialProviderMeta
    account: UserAccountDto
  } | null>(null)

  const handleConnect = async (provider: SocialProviderMeta) => {
    if (connecting) return
    setConnecting(provider.id)

    // Full-page redirect to the provider; we come back to this page with a
    // `?linked=` / `?error=` flash param (handled in AccountSettingsPage).
    const { data: linkData, error } = await authClient.linkSocial({
      provider: provider.id,
      callbackURL: `${window.location.pathname}?linked=${provider.id}`,
      errorCallbackURL: window.location.pathname,
    })
    if (error) {
      toast({
        variant: "destructive",
        description: error.message ?? `Não foi possível iniciar a conexão com ${provider.label}`,
      })
      setConnecting(null)
      return
    }
    // The BA client normally redirects on its own; this is a fallback. Keep
    // the "Redirecting…" state — the page is about to unload either way.
    if (linkData?.url) window.location.assign(linkData.url)
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <Text.H5 weight="semibold">Contas conectadas</Text.H5>
        <Text.H5 color="foregroundMuted">
          Connect Google or GitHub to sign in with one click. Signing in with your email always keeps working
        </Text.H5>
      </div>
      <div className="flex w-full flex-col gap-1">
        {SOCIAL_PROVIDERS.map((provider) => {
          const account = data?.find((a) => a.providerId === provider.id)
          const profile = account?.profile ?? null
          const ProviderIcon = provider.icon
          return (
            <div
              key={provider.id}
              className="flex w-full flex-row flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-lg bg-muted/30 p-4"
            >
              <div className="flex flex-row items-center gap-3">
                {profile ? (
                  <Avatar name={profile.name ?? provider.label} imageSrc={profile.image} size="lg" />
                ) : (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-background border border-border">
                    <ProviderIcon />
                  </div>
                )}
                <div className="flex flex-col">
                  <div className="flex flex-row items-baseline gap-1.5">
                    <Text.H5 weight="medium">{profile?.name ?? provider.label}</Text.H5>
                    {profile?.name ? <Text.H6 color="foregroundMuted">· {provider.label}</Text.H6> : null}
                  </div>
                  <Text.H6 color="foregroundMuted">
                    {isLoading
                      ? "…"
                      : account
                        ? (profile?.email ?? `Conectada ${relativeTime(account.createdAt)}`)
                        : "Not connected"}
                  </Text.H6>
                </div>
              </div>
              {isLoading ? null : account ? (
                <Button variant="destructive" onClick={() => setToDisconnect({ provider, account })}>
                  Disconnect
                </Button>
              ) : (
                <Button variant="outline" disabled={connecting !== null} onClick={() => void handleConnect(provider)}>
                  {connecting === provider.id ? "Redirecting…" : "Connect"}
                </Button>
              )}
            </div>
          )
        })}
      </div>

      {toDisconnect ? (
        <DisconnectAccountConfirmModal
          provider={toDisconnect.provider}
          account={toDisconnect.account}
          onClose={() => setToDisconnect(null)}
        />
      ) : null}
    </section>
  )
}

function SessionsSection() {
  const { data, isLoading } = useQuery({
    queryKey: ["userSessions"],
    queryFn: () => listUserSessions(),
  })
  const [sessionToRevoke, setSessionToRevoke] = useState<UserSessionDto | null>(null)
  const [revokeAllOpen, setRevokeAllOpen] = useState(false)

  // Current device pinned to the top so the user sees "this is me" first;
  // every other session sorted by `createdAt` desc (newest connection first).
  const sessions = (data ?? []).slice().sort((a, b) => {
    if (a.current !== b.current) return a.current ? -1 : 1
    return a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0
  })
  const otherCount = sessions.filter((s) => !s.current).length

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-row flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="flex flex-col gap-1">
          <Text.H5 weight="semibold">Sessões</Text.H5>
          <Text.H5 color="foregroundMuted">
            Devices currently signed in to your account. Sign out of any device you don't recognize
          </Text.H5>
        </div>
        {otherCount > 0 ? (
          <Button variant="outline" onClick={() => setRevokeAllOpen(true)}>
            <Icon size="sm" icon={LogOut} />
            Sign out everywhere else
          </Button>
        ) : null}
      </div>
      <div className="flex flex-col gap-2">
        {isLoading ? (
          <TableSkeleton cols={4} rows={2} />
        ) : sessions.length === 0 ? (
          <Text.H5 color="foregroundMuted">Nenhuma sessão ativa.</Text.H5>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Dispositivo</TableHead>
                <TableHead>Localização</TableHead>
                <TableHead>Criada em</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessions.map((s) => (
                <TableRow key={s.id} verticalPadding hoverable={false}>
                  <TableCell>
                    <div className="inline-flex items-center gap-2">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted">
                        <Icon icon={deviceIconFor(s.deviceKind)} size="sm" color="foregroundMuted" />
                      </div>
                      <Text.H5>
                        {formatDeviceLine(s)}
                        {s.current ? (
                          <Text.H5 color="foregroundMuted" asChild>
                            <span>&nbsp;· Este dispositivo</span>
                          </Text.H5>
                        ) : null}
                      </Text.H5>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Text.H5 color="foregroundMuted">
                      <div className="flex flex-col">
                        <Text.H5>{formatSessionLocation(s)}</Text.H5>
                        <Text.H6 color="foregroundMuted">{s.ipAddress ?? "Unknown IP address"}</Text.H6>
                      </div>
                    </Text.H5>
                  </TableCell>
                  <TableCell>
                    <Text.H5 color="foregroundMuted">{relativeTime(s.createdAt)}</Text.H5>
                  </TableCell>
                  <TableCell align="right">
                    {s.current ? null : (
                      <Tooltip
                        asChild
                        trigger={
                          <Button variant="ghost" onClick={() => setSessionToRevoke(s)}>
                            <Icon icon={LogOut} size="sm" />
                          </Button>
                        }
                      >
                        Sign this device out
                      </Tooltip>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {sessionToRevoke ? (
        <RevokeSessionConfirmModal session={sessionToRevoke} onClose={() => setSessionToRevoke(null)} />
      ) : null}
      {revokeAllOpen ? (
        <RevokeAllOtherSessionsConfirmModal otherCount={otherCount} onClose={() => setRevokeAllOpen(false)} />
      ) : null}
    </section>
  )
}

const PREFERENCES_QUERY_KEY = ["notificationPreferences"]

function NotificationsSection() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  // A save replaces the whole preferences object, so saves have to reach the
  // server in the order they were made — a slower earlier one would otherwise
  // land last and undo a later toggle. Each is queued behind the previous.
  const queued = useRef<Promise<void>>(Promise.resolve())

  const { data } = useQuery({
    queryKey: PREFERENCES_QUERY_KEY,
    queryFn: () => getNotificationPreferences(),
  })

  // Local prefs mirror server prefs; saves run in the background per change.
  // Missing entries are treated as "email on" so a fresh user sees every
  // toggle in the on position (matches the opt-out default). That default is
  // only safe to render once the query lands — applied to an empty cache it
  // would open every group's sub-toggles, then snap them shut on arrival.
  const isLoaded = data !== undefined
  const prefs: NotificationPreferences = data?.preferences ?? {}

  // Scroll the targeted toggle into view when the page is opened with a
  // `#notifications-<group>` hash. Email unsubscribe links go through the
  // `/settings/$section` redirect, which appends the hash so the user lands
  // directly on the row they came to flip. Waits for the load so the rows are
  // at their final height before scrolling.
  useEffect(() => {
    if (!isLoaded) return
    const hash = window.location.hash.slice(1)
    if (!hash.startsWith("notifications-")) return
    const el = document.getElementById(hash)
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" })
  }, [isLoaded])

  const cachedPreferences = (): NotificationPreferences =>
    queryClient.getQueryData<{ readonly preferences: NotificationPreferences | null }>(PREFERENCES_QUERY_KEY)
      ?.preferences ?? {}

  const patchGroup = (
    group: NotificationGroup,
    patch: Partial<NonNullable<NotificationPreferences[NotificationGroup]>>,
  ) => {
    // Read the cache rather than this render's `prefs`: a second toggle clicked
    // before React re-renders would otherwise be built on the pre-first-toggle value.
    const current = cachedPreferences()
    // Optimistic update so the controls never lag behind the user's intent.
    queryClient.setQueryData(PREFERENCES_QUERY_KEY, {
      preferences: { ...current, [group]: { ...(current[group] ?? {}), ...patch } },
    })
    queued.current = queued.current.then(async () => {
      try {
        // Re-read at send time so this carries every change made while it waited.
        await updateNotificationPreferences({ data: { preferences: cachedPreferences() } })
      } catch (error) {
        toast({ variant: "destructive", description: toUserMessage(error) })
        // Refetch rather than restoring a snapshot, which by now may be behind
        // toggles that saved fine.
        await queryClient.invalidateQueries({ queryKey: PREFERENCES_QUERY_KEY })
      }
    })
  }

  const setGroupEmail = (group: NotificationGroup, enabled: boolean) => patchGroup(group, { email: enabled })

  const setGroupTopic = (group: NotificationGroup, topic: NotificationTopic, enabled: boolean) =>
    patchGroup(group, { emailTopics: { ...(cachedPreferences()[group]?.emailTopics ?? {}), [topic]: enabled } })

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <Text.H5 weight="semibold">Notificações por email</Text.H5>
        <Text.H5 color="foregroundMuted">
          Choose which kinds of notifications you'd like to receive by email. In-app notifications always appear in the
          bell.
        </Text.H5>
      </div>
      <div className="flex w-full flex-col gap-1">
        {NOTIFICATION_GROUPS.map((group) => {
          const meta = NOTIFICATION_GROUP_META[group]
          const enabled = prefs[group]?.email ?? true
          const inputId = `notification-pref-${group}`
          return (
            <div
              key={group}
              id={`notifications-${group}`}
              className="flex w-full flex-col gap-3 rounded-lg bg-muted/30 p-4 scroll-mt-8"
            >
              <div className="flex w-full flex-row items-center justify-between gap-4">
                <div className="flex flex-col gap-1">
                  <Label htmlFor={inputId}>{meta.label}</Label>
                  <Text.H6 color="foregroundMuted">{meta.description}</Text.H6>
                </div>
                {isLoaded ? (
                  <Switch
                    id={inputId}
                    checked={enabled}
                    onCheckedChange={(checked) => setGroupEmail(group, checked)}
                    aria-label={`Alternar notificações por email para ${meta.label}`}
                  />
                ) : (
                  // Sized to the switch it stands in for, so the row doesn't move when it arrives.
                  <Skeleton className="h-5 w-16 shrink-0 rounded-lg" />
                )}
              </div>
              {isLoaded && enabled && meta.topics.length > 0 ? (
                <div className="flex flex-col gap-3 rounded-lg bg-muted/80 px-3 py-2.5">
                  {meta.topics.map((topic) => {
                    const topicMeta = NOTIFICATION_TOPIC_META[topic]
                    const topicId = `${inputId}-${topic}`
                    return (
                      <div key={topic} className="flex flex-row items-start gap-3">
                        <Checkbox
                          id={topicId}
                          checked={admitsTopic(prefs[group]?.emailTopics, topic)}
                          onCheckedChange={(checked) => setGroupTopic(group, topic, checked === true)}
                        />
                        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                          <Label htmlFor={topicId}>{topicMeta.label}</Label>
                          <Text.H6 color="foregroundMuted">{topicMeta.description}</Text.H6>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : null}
              {isLoaded && enabled && meta.severityFiltered ? (
                <div className="flex flex-row items-center justify-between gap-4 rounded-lg bg-muted/80 px-3 py-2">
                  <div className="flex flex-row items-baseline gap-1.5">
                    <Text.H6M>Severidade</Text.H6M>
                    <Text.H6 color="foregroundMuted">
                      · {minSeverityHint(prefs[group]?.emailMinSeverity ?? "low")}
                    </Text.H6>
                  </div>
                  <SeveritySelector
                    variant="bordered"
                    value={prefs[group]?.emailMinSeverity ?? "low"}
                    onSelect={(minSeverity) => patchGroup(group, { emailMinSeverity: minSeverity })}
                  />
                </div>
              ) : null}
            </div>
          )
        })}
      </div>
    </section>
  )
}

function AccountSettingsPage() {
  const user = useAuthenticatedUser()
  const { toast } = useToast()
  const router = useRouter()
  const search = Route.useSearch()
  const [deleteOpen, setDeleteOpen] = useState(false)

  // Toast the result of a `linkSocial` round-trip, then strip the flash
  // params so a refresh doesn't repeat the toast.
  useMountEffect(() => {
    if (search.linked) {
      toast({ description: `${providerLabel(search.linked)} conectado` })
    } else if (search.error) {
      toast({
        variant: "destructive",
        description: oauthLinkErrorMessage(search.error),
      })
    }
    if (search.linked || search.error) {
      void router.navigate({ to: Route.fullPath, search: {}, replace: true })
    }
  })

  const form = useForm({
    defaultValues: { name: user.name ?? "" },
    onSubmit: createFormSubmitHandler(
      async ({ name }) => {
        await updateUserName({ data: { name: name.trim() } })
      },
      {
        resetOnSuccess: false,
        onSuccess: () => {
          toast({ description: "Nome atualizado" })
          // `useAuthenticatedUser` is sourced from route data; refresh so
          // the new name shows up wherever the user is rendered.
          void router.invalidate()
        },
        onError: (error) => {
          toast({ variant: "destructive", description: toUserMessage(error) })
        },
      },
    ),
  })

  return (
    <SettingsPage title="Conta" description="Gerencie sua conta pessoal">
      <form
        className="flex w-full flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault()
          void form.handleSubmit()
        }}
      >
        <form.Field name="name">
          {(field) => (
            <Input
              key={user.id}
              required
              type="text"
              name={field.name}
              label="Nome"
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              errors={fieldErrorsAsStrings(field.state.meta.errors)}
              placeholder="Seu nome"
              aria-label="Seu nome"
            />
          )}
        </form.Field>
        <div className="self-start">
          <form.Subscribe selector={(state) => state.isSubmitting}>
            {(isSubmitting) => (
              <Button type="submit" isLoading={isSubmitting}>
                Save
              </Button>
            )}
          </form.Subscribe>
        </div>
      </form>
      <NotificationsSection />
      <ConnectedAccountsSection />
      <SessionsSection />
      <div className="flex flex-col gap-4 rounded-lg border border-destructive/30 bg-destructive/5 p-6">
        <Text.H4 weight="bold" color="destructive">
          Delete Account
        </Text.H4>
        <Text.H5 color="destructive">
          Permanently delete your account and all associated data. If you are the sole member of an organization, that
          organization will also be deleted.
        </Text.H5>
        <div>
          <DeleteAccountConfirmModal open={deleteOpen} setOpen={setDeleteOpen} />
          <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
            Delete Account
          </Button>
        </div>
      </div>
    </SettingsPage>
  )
}
