import type { FeatureFlagId } from "@domain/feature-flags"
import {
  BellRingIcon,
  BrainIcon,
  Building2,
  CircleDollarSignIcon,
  CreditCard,
  DatabaseIcon,
  EyeOffIcon,
  Fingerprint,
  FlaskConical,
  GaugeIcon,
  ImportIcon,
  Key,
  type LucideIcon,
  MessagesSquareIcon,
  Package,
  Plug,
  ScanSearch,
  SettingsIcon,
  Share2Icon,
  ShieldAlertIcon,
  SlidersHorizontalIcon,
  TagsIcon,
  UserRound,
  Users,
  UsersRoundIcon,
  WrenchIcon,
} from "lucide-react"
import { useMemo } from "react"
import { ptBR } from "../../lib/i18n/pt-BR.ts"
import { useFeatureFlags } from "../feature-flags/feature-flags.collection.ts"

type SectionGroupKey = "observe" | "understand" | "refine"

interface ProjectSection {
  readonly key: string
  readonly label: string
  readonly icon: LucideIcon
  readonly group: SectionGroupKey
  readonly path: (projectSlug: string) => string
  readonly isActive: (pathname: string, projectSlug: string) => boolean
  /** When set, the section renders only if this feature flag is enabled for the org. */
  readonly featureFlag?: FeatureFlagId
}

const PROJECT_SECTIONS: readonly ProjectSection[] = [
  {
    key: "agent-score",
    label: ptBR.clientShell.sections.agentScore,
    icon: GaugeIcon,
    group: "observe",
    path: (slug) => `/projects/${slug}/agent-score`,
    isActive: (pathname, slug) => pathname.startsWith(`/projects/${slug}/agent-score`),
    featureFlag: "agentScore",
  },
  {
    key: "sessions",
    label: ptBR.clientShell.sections.sessions,
    icon: MessagesSquareIcon,
    group: "observe",
    path: (slug) => `/projects/${slug}`,
    isActive: (pathname, slug) => pathname === `/projects/${slug}` || pathname === `/projects/${slug}/`,
  },
  {
    key: "users",
    label: ptBR.clientShell.sections.users,
    icon: UsersRoundIcon,
    group: "observe",
    path: (slug) => `/projects/${slug}/users`,
    isActive: (pathname, slug) => pathname.startsWith(`/projects/${slug}/users`),
  },
  {
    key: "tools",
    label: ptBR.clientShell.sections.tools,
    icon: WrenchIcon,
    group: "observe",
    path: (slug) => `/projects/${slug}/tools`,
    isActive: (pathname, slug) => pathname.startsWith(`/projects/${slug}/tools`),
  },
  {
    key: "memory",
    label: ptBR.clientShell.sections.memory,
    icon: BrainIcon,
    group: "observe",
    path: (slug) => `/projects/${slug}/memory`,
    isActive: (pathname, slug) => pathname.startsWith(`/projects/${slug}/memory`),
  },
  {
    key: "cost",
    label: ptBR.clientShell.sections.cost,
    icon: CircleDollarSignIcon,
    group: "observe",
    path: (slug) => `/projects/${slug}/cost`,
    isActive: (pathname, slug) => pathname.startsWith(`/projects/${slug}/cost`),
    featureFlag: "costDashboard",
  },
  {
    key: "signals",
    label: ptBR.clientShell.sections.signals,
    icon: ShieldAlertIcon,
    group: "understand",
    path: (slug) => `/projects/${slug}/signals`,
    isActive: (pathname, slug) => pathname.startsWith(`/projects/${slug}/signals`),
  },
  {
    key: "behaviours",
    label: ptBR.clientShell.sections.behaviours,
    icon: TagsIcon,
    group: "understand",
    path: (slug) => `/projects/${slug}/behaviours`,
    isActive: (pathname, slug) => pathname.startsWith(`/projects/${slug}/behaviours`),
  },
  {
    key: "experiments",
    label: ptBR.clientShell.sections.experiments,
    icon: FlaskConical,
    group: "understand",
    path: (slug) => `/projects/${slug}/experiments`,
    isActive: (pathname, slug) => pathname.startsWith(`/projects/${slug}/experiments`),
  },
  {
    key: "monitors",
    label: ptBR.clientShell.sections.monitors,
    icon: BellRingIcon,
    group: "refine",
    path: (slug) => `/projects/${slug}/monitors`,
    isActive: (pathname, slug) => pathname.startsWith(`/projects/${slug}/monitors`),
  },
  {
    key: "datasets",
    label: ptBR.clientShell.sections.datasets,
    icon: DatabaseIcon,
    group: "refine",
    path: (slug) => `/projects/${slug}/datasets`,
    isActive: (pathname, slug) => pathname.startsWith(`/projects/${slug}/datasets`),
  },
]

interface ProjectSectionGroup {
  readonly key: SectionGroupKey
  readonly label: string
}

const PROJECT_SECTION_GROUPS: readonly ProjectSectionGroup[] = [
  { key: "observe", label: ptBR.clientShell.groups.observe },
  { key: "understand", label: ptBR.clientShell.groups.understand },
  { key: "refine", label: ptBR.clientShell.groups.refine },
]

/** Top-level Settings entry (rendered in the sidebar footer, separate from the main list). */
export const PROJECT_SETTINGS_SECTION: Omit<ProjectSection, "group"> = {
  key: "settings",
  label: ptBR.clientShell.sections.settings,
  icon: SettingsIcon,
  path: (slug) => `/projects/${slug}/settings`,
  isActive: (pathname, slug) => pathname.startsWith(`/projects/${slug}/settings`),
}

interface ProjectSettingsItem {
  readonly key: string
  readonly label: string
  readonly icon: LucideIcon
  readonly path: (projectSlug: string) => string
}

interface ProjectSettingsGroup {
  readonly title: string
  readonly items: readonly ProjectSettingsItem[]
}

const PROJECT_SETTINGS_GROUPS: readonly ProjectSettingsGroup[] = [
  {
    title: ptBR.clientShell.settings.project,
    items: [
      {
        key: "general",
        label: ptBR.clientShell.settings.general,
        icon: Package,
        path: (slug) => `/projects/${slug}/settings/general`,
      },
      {
        key: "settings-signals",
        label: ptBR.clientShell.sections.signals,
        icon: ShieldAlertIcon,
        path: (slug) => `/projects/${slug}/settings/signals`,
      },
      {
        key: "flaggers",
        label: ptBR.clientShell.settings.flaggers,
        icon: ScanSearch,
        path: (slug) => `/projects/${slug}/settings/flaggers`,
      },
      {
        key: "privacy",
        label: ptBR.clientShell.settings.privacy,
        icon: EyeOffIcon,
        path: (slug) => `/projects/${slug}/settings/privacy`,
      },
      {
        key: "integrations",
        label: ptBR.clientShell.settings.integrations,
        icon: Plug,
        path: (slug) => `/projects/${slug}/settings/integrations`,
      },
      {
        key: "imports",
        label: ptBR.clientShell.settings.imports,
        icon: ImportIcon,
        path: (slug) => `/projects/${slug}/settings/imports`,
      },
      {
        key: "data-destinations",
        label: ptBR.clientShell.settings.destinations,
        icon: Share2Icon,
        path: (slug) => `/projects/${slug}/settings/data-destinations`,
      },
    ],
  },
  {
    title: ptBR.clientShell.settings.organization,
    items: [
      {
        key: "organization",
        label: ptBR.clientShell.settings.general,
        icon: Building2,
        path: (slug) => `/projects/${slug}/settings/organization`,
      },
      {
        key: "members",
        label: ptBR.clientShell.settings.members,
        icon: Users,
        path: (slug) => `/projects/${slug}/settings/members`,
      },
      {
        key: "keys",
        label: ptBR.clientShell.settings.keys,
        icon: Key,
        path: (slug) => `/projects/${slug}/settings/keys`,
      },
      {
        key: "billing",
        label: ptBR.clientShell.settings.billing,
        icon: CreditCard,
        path: (slug) => `/projects/${slug}/settings/billing`,
      },
      {
        key: "defaults",
        label: ptBR.clientShell.settings.defaults,
        icon: SlidersHorizontalIcon,
        path: (slug) => `/projects/${slug}/settings/defaults`,
      },
      {
        key: "organization-integrations",
        label: ptBR.clientShell.settings.integrations,
        icon: Plug,
        path: (slug) => `/projects/${slug}/settings/organization/integrations`,
      },
      {
        key: "sso",
        label: ptBR.clientShell.settings.sso,
        icon: Fingerprint,
        path: (slug) => `/projects/${slug}/settings/sso`,
      },
    ],
  },
  {
    title: ptBR.clientShell.settings.personal,
    items: [
      {
        key: "account",
        label: ptBR.clientShell.settings.account,
        icon: UserRound,
        path: (slug) => `/projects/${slug}/settings/account`,
      },
    ],
  },
]

/** Project sections visible to the current org, in sidebar/palette order. */
export function useVisibleProjectSections(): readonly ProjectSection[] {
  const flags = useFeatureFlags()
  return useMemo(
    () => PROJECT_SECTIONS.filter((section) => !section.featureFlag || flags.has(section.featureFlag)),
    [flags],
  )
}

interface VisibleProjectSectionGroup extends ProjectSectionGroup {
  readonly sections: readonly ProjectSection[]
}

/** Visible project sections bucketed into their sidebar groups (empty groups dropped). */
export function useVisibleProjectSectionGroups(): readonly VisibleProjectSectionGroup[] {
  const sections = useVisibleProjectSections()
  return useMemo(
    () =>
      PROJECT_SECTION_GROUPS.map((group) => ({
        ...group,
        sections: sections.filter((section) => section.group === group.key),
      })).filter((group) => group.sections.length > 0),
    [sections],
  )
}

/** Settings groups in sidebar order. */
export function useVisibleProjectSettingsGroups(): readonly ProjectSettingsGroup[] {
  return PROJECT_SETTINGS_GROUPS
}
