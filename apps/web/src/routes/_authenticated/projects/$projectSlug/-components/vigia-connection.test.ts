import { describe, expect, it } from "vitest"
import {
  getVigiaConnectionValues,
  getVigiaFlowisePhoenixValues,
  getVigiaN8nEnvBlock,
  getVigiaOtelCurlVerifySnippet,
  getVigiaOtelEnvBlock,
  resolveVigiaConnectionSource,
} from "./vigia-connection.ts"

describe("Vigia OTLP connection config", () => {
  it("uses the Vigia public endpoint and customer-facing project header", () => {
    expect(getVigiaConnectionValues("atendimento", "secret")).toEqual({
      endpoint: "https://vigia.wandora.com.br/v1/traces",
      apiKey: "secret",
      project: "atendimento",
    })

    const env = getVigiaOtelEnvBlock("atendimento", "secret")
    expect(env).toContain("VIGIA_ENDPOINT=https://vigia.wandora.com.br/v1/traces")
    expect(env).toContain("VIGIA_API_KEY=secret")
    expect(env).toContain("VIGIA_PROJECT=atendimento")
    expect(env).toContain("X-Vigia-Project=atendimento")
    expect(env).not.toContain("Latitude")
    expect(env).not.toContain("latitude")
  })

  it("uses safe placeholders when a key is not available yet", () => {
    const curl = getVigiaOtelCurlVerifySnippet(" vendas ", null)
    expect(curl).toContain("Authorization: Bearer SUA_CHAVE_VIGIA")
    expect(curl).toContain("X-Vigia-Project: vendas")
    expect(curl).toContain("https://vigia.wandora.com.br/v1/traces")
  })

  it("uses n8n native OpenTelemetry with the base endpoint and separate trace path", () => {
    const env = getVigiaN8nEnvBlock("atendimento", "secret")

    expect(env).toContain("N8N_OTEL_ENABLED=true")
    expect(env).toContain("N8N_OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf")
    expect(env).toContain("N8N_OTEL_EXPORTER_OTLP_ENDPOINT=https://vigia.wandora.com.br")
    expect(env).toContain("N8N_OTEL_EXPORTER_OTLP_TRACING_PATH=/v1/traces")
    expect(env).toContain("Authorization=Bearer secret")
    expect(env).toContain("X-Vigia-Project=atendimento")
    expect(env).not.toContain("N8N_OTEL_EXPORTER_OTLP_ENDPOINT=https://vigia.wandora.com.br/v1/traces")
  })

  it("builds Flowise Phoenix values with the endpoint base, key and project", () => {
    expect(getVigiaFlowisePhoenixValues(" atendimento ", "secret")).toEqual({
      endpoint: "https://vigia.wandora.com.br",
      apiKey: "secret",
      project: "atendimento",
    })
  })

  it("selects the most specific connection instructions for the composed stack", () => {
    expect(resolveVigiaConnectionSource(["elus"])).toBe("elus")
    expect(resolveVigiaConnectionSource(["elus", "n8n"])).toBe("elus")
    expect(resolveVigiaConnectionSource(["evolution-api", "n8n", "code-sdk"])).toBe("n8n")
    expect(resolveVigiaConnectionSource(["evolution-api", "flowise", "code-sdk"])).toBe("flowise")
    expect(resolveVigiaConnectionSource(["flowise", "n8n"])).toBe("n8n")
    expect(resolveVigiaConnectionSource(["code-sdk"])).toBe("opentelemetry")
  })
})
