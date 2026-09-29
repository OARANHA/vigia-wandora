import { describe, expect, it } from "vitest"
import {
  cloudflareAiGatewayConfig,
  getCodingAgentTelemetryPrompt,
  getCodingMachineVigiaRoutingConfig,
  getEnvBlock,
  getHermesEnvBlock,
  getOnboardingSnippet,
  getOtelCurlVerifySnippet,
  getOtelExporterLanguageSnippet,
  getPiTelemetryInstallCommand,
  getProviderSdkPyInstallCommand,
  ONBOARDING_PROVIDER_SNIPPET_CONFIG,
  providerUsesLatitudeSdk,
} from "./onboarding-integration-snippets.ts"

describe("Pydantic AI onboarding integration", () => {
  it("is registered as a Python-only provider", () => {
    const cfg = ONBOARDING_PROVIDER_SNIPPET_CONFIG["pydantic-ai"]
    expect(cfg).toEqual({ id: "pydantic-ai", supportsTypescript: false, supportsPython: true })
  })

  it("uses the Latitude SDK path", () => {
    expect(providerUsesLatitudeSdk("pydantic-ai")).toBe(true)
  })

  it("installs the full pydantic-ai package (bundles the openai extra)", () => {
    expect(getProviderSdkPyInstallCommand("pydantic-ai", "pip")).toBe("pip install pydantic-ai")
    expect(getProviderSdkPyInstallCommand("pydantic-ai", "uv")).toBe("uv add pydantic-ai")
    expect(getProviderSdkPyInstallCommand("pydantic-ai", "poetry")).toBe("poetry add pydantic-ai")
  })

  it("has no TypeScript snippet", () => {
    expect(getOnboardingSnippet("pydantic-ai", "typescript", "my-project", "lat-key")).toBeNull()
  })

  describe("Python snippet", () => {
    const snippet = getOnboardingSnippet("pydantic-ai", "python", "my-project", "lat-key")

    it("returns a snippet", () => {
      expect(snippet).not.toBeNull()
    })

    it("wires the Latitude SDK and Pydantic AI's native instrumentation", () => {
      expect(snippet).toContain("from latitude_telemetry import Latitude, capture")
      expect(snippet).toContain("from pydantic_ai import Agent")
      expect(snippet).toContain("Agent.instrument_all()")
    })

    it("does not register an instrumentations entry (Pydantic AI self-instruments)", () => {
      expect(snippet).not.toContain("instrumentations={")
    })

    it("injects the project slug and API key", () => {
      expect(snippet).toContain('project="my-project"')
      expect(snippet).toContain('api_key="lat-key"')
      expect(snippet).not.toContain('os.environ["LATITUDE_PROJECT_SLUG"]')
      expect(snippet).not.toContain('os.environ["LATITUDE_API_KEY"]')
    })

    it("flushes on exit for short-lived processes", () => {
      expect(snippet).toContain("latitude.shutdown()")
    })
  })
})

describe("Cloudflare AI Gateway onboarding integration", () => {
  it("is registered as an OpenTelemetry-only provider (no SDK snippets)", () => {
    const cfg = ONBOARDING_PROVIDER_SNIPPET_CONFIG["cloudflare-ai-gateway"]
    expect(cfg).toEqual({ id: "cloudflare-ai-gateway", supportsTypescript: false, supportsPython: false })
  })

  it("has neither a TypeScript nor a Python snippet", () => {
    expect(getOnboardingSnippet("cloudflare-ai-gateway", "typescript", "my-project", "lat-key")).toBeNull()
    expect(getOnboardingSnippet("cloudflare-ai-gateway", "python", "my-project", "lat-key")).toBeNull()
  })

  describe("exporter config", () => {
    const config = cloudflareAiGatewayConfig("my-project", "lat-key")

    it("points at the Vigia OTLP traces endpoint", () => {
      expect(config.endpoint).toBe("https://vigia.wandora.com.br/v1/traces")
    })

    it("uses a JSON content type", () => {
      expect(config.contentType).toBe("JSON")
    })

    it("injects the API key and project slug into the custom headers", () => {
      expect(config.headers).toContainEqual({ key: "Authorization", value: "Bearer lat-key" })
      expect(config.headers).toContainEqual({ key: "x-vigia-project", value: "my-project" })
    })

    it("falls back to a placeholder when no API key is available", () => {
      expect(cloudflareAiGatewayConfig("my-project", null).headers).toContainEqual({
        key: "Authorization",
        value: "Bearer YOUR_API_KEY",
      })
    })
  })
})

describe("Vigia public telemetry contract", () => {
  it("uses the Vigia endpoint and project header in the cURL verifier", () => {
    const snippet = getOtelCurlVerifySnippet("my-project", "vig-key")
    expect(snippet).toContain("https://vigia.wandora.com.br/v1/traces")
    expect(snippet).toContain("X-Vigia-Project: my-project")
    expect(snippet).not.toContain("X-Latitude-Project")
  })

  it.each(["go", "java", "ruby", "dotnet"] as const)("uses the Vigia contract in the %s exporter example", (lang) => {
    const snippet = getOtelExporterLanguageSnippet(lang, "my-project", "vig-key")
    expect(snippet).toContain("https://vigia.wandora.com.br/v1/traces")
    expect(snippet).toContain("X-Vigia-Project")
    expect(snippet).not.toContain("X-Latitude-Project")
  })

  it("routes upstream SDK integrations to the Vigia ingest base URL", () => {
    const env = getEnvBlock("openai", "my-project", "vig-key")
    expect(env).toContain("LATITUDE_TELEMETRY_URL=https://vigia.wandora.com.br")
    expect(env).toContain("LATITUDE_PROJECT_SLUG=my-project")
  })

  it("uses Vigia-native variables for Eve direct OTLP", () => {
    const env = getEnvBlock("eve", "my-project", "vig-key")
    const snippet = getOnboardingSnippet("eve", "typescript", "my-project", "vig-key")

    expect(env).toContain("VIGIA_API_KEY=vig-key")
    expect(env).toContain("VIGIA_PROJECT=my-project")
    expect(snippet).toContain('url: "https://vigia.wandora.com.br/v1/traces"')
    expect(snippet).toContain('"X-Vigia-Project": "my-project"')
    expect(snippet).not.toContain("ingest.latitude.so")
  })

  it("routes Hermes and pi compatibility installers to Vigia", () => {
    expect(getHermesEnvBlock("my-project", "vig-key")).toContain("LATITUDE_TELEMETRY_URL=https://vigia.wandora.com.br")
    expect(getPiTelemetryInstallCommand("my-project", "vig-key")).toContain("--base-url=https://vigia.wandora.com.br")
  })

  it("provides non-destructive Vigia routing overrides for Claude Code and OpenClaw", () => {
    expect(getCodingMachineVigiaRoutingConfig("claude-code")).toEqual({
      target: "no objeto env de ~/.claude/settings.json",
      value: '"LATITUDE_BASE_URL": "https://vigia.wandora.com.br"',
    })
    expect(getCodingMachineVigiaRoutingConfig("openclaw")).toEqual({
      target: 'em plugins.entries["@latitude-data/openclaw-telemetry"].config no ~/.openclaw/openclaw.json',
      value: '"baseUrl": "https://vigia.wandora.com.br"',
    })
    expect(getCodingMachineVigiaRoutingConfig("hermes")).toBeNull()
    expect(getCodingMachineVigiaRoutingConfig("pi")).toBeNull()
  })

  it("gives coding agents the public Vigia OTLP contract without requiring Latitude setup", () => {
    const prompt = getCodingAgentTelemetryPrompt("my-project", "vig-key")
    expect(prompt).toContain("https://vigia.wandora.com.br/v1/traces")
    expect(prompt).toContain("X-Vigia-Project: my-project")
    expect(prompt).not.toContain("latitude-telemetry")
    expect(prompt).not.toContain("Latitude MCP")
  })
})
