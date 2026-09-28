import { useForm } from "@tanstack/react-form"
import { EMPTY_ONBOARDING_FORM_VALUES } from "./steps/role-step-form.ts"

export const LEGACY_ONBOARDING_STEPS = ["role", "flaggers", "slack", "telemetry"] as const
export type LegacyOnboardingStep = (typeof LEGACY_ONBOARDING_STEPS)[number]

// The organization-claim flow still reuses the original role form. Keep its
// form instance type beside that legacy surface instead of coupling it to the
// Vigia agent onboarding flow.
function _legacyOnboardingFormTypeHelper() {
  return useForm({
    defaultValues: EMPTY_ONBOARDING_FORM_VALUES,
  })
}

export type LegacyOnboardingForm = ReturnType<typeof _legacyOnboardingFormTypeHelper>
