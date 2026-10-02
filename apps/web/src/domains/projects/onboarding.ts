import type { FilterSet } from "@domain/shared"

/**
 * Connectivity probes prove that an OTLP collector is reachable, but they do not
 * prove that the customer's real agent/workflow is being observed.
 *
 * n8n names its Settings → OpenTelemetry probe span `n8n.test_trace`. Keep that
 * probe visible in Traces for diagnostics, but exclude it from the onboarding
 * success invariant so the customer must run the workflow they actually want
 * Vigia to monitor.
 */
export const VIGIA_ONBOARDING_TRACE_FILTERS = {
  name: [{ op: "neq", value: "n8n.test_trace" }],
} as const satisfies FilterSet
