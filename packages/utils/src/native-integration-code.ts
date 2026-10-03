import { Effect } from "effect"
import { base64urlDecode, base64urlEncode } from "./base64.ts"
import { CryptoError, decrypt, encodeUtf8, encrypt } from "./crypto.ts"

export interface NativeIntegrationAuthorization {
  readonly version: 1
  readonly integration: "elus"
  readonly organizationId: string
  readonly projectId: string
  readonly projectSlug: string
  readonly apiKey: string
  readonly ingestUrl: string
  readonly apiUrl: string
  readonly codeChallenge: string
  readonly expiresAt: number
}

const deriveKey = (secret: string): Effect.Effect<Uint8Array, CryptoError> =>
  Effect.tryPromise({
    try: async () => new Uint8Array(await crypto.subtle.digest("SHA-256", encodeUtf8(secret))),
    catch: (cause) => new CryptoError({ operation: "nativeIntegration.deriveKey", cause }),
  })

export const createPkceChallenge = async (verifier: string): Promise<string> => {
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", encodeUtf8(verifier)))
  return base64urlEncode(digest)
}

export const issueNativeIntegrationAuthorization = (
  payload: NativeIntegrationAuthorization,
  masterSecret: string,
): Effect.Effect<string, CryptoError> =>
  Effect.gen(function* () {
    const key = yield* deriveKey(masterSecret)
    const ciphertext = yield* encrypt(JSON.stringify(payload), key)
    return base64urlEncode(ciphertext)
  })

const decodeAuthorization = (plaintext: string): NativeIntegrationAuthorization => {
  const value = JSON.parse(plaintext) as Partial<NativeIntegrationAuthorization>
  if (
    value.version !== 1 ||
    value.integration !== "elus" ||
    typeof value.organizationId !== "string" ||
    typeof value.projectId !== "string" ||
    typeof value.projectSlug !== "string" ||
    typeof value.apiKey !== "string" ||
    typeof value.ingestUrl !== "string" ||
    typeof value.apiUrl !== "string" ||
    typeof value.codeChallenge !== "string" ||
    typeof value.expiresAt !== "number"
  ) {
    throw new Error("Invalid native integration authorization payload")
  }
  return value as NativeIntegrationAuthorization
}

export const readNativeIntegrationAuthorization = (
  code: string,
  masterSecret: string,
): Effect.Effect<NativeIntegrationAuthorization, CryptoError> =>
  Effect.gen(function* () {
    const key = yield* deriveKey(masterSecret)
    const encoded = yield* Effect.try({
      try: () => new TextDecoder().decode(base64urlDecode(code)),
      catch: (cause) => {
        throw new CryptoError({ operation: "nativeIntegration.decode", cause })
      },
    })
    const plaintext = yield* decrypt(encoded, key)
    return yield* Effect.try({
      try: () => decodeAuthorization(plaintext),
      catch: (cause) => {
        throw new CryptoError({ operation: "nativeIntegration.parse", cause })
      },
    })
  })

export const verifyNativeIntegrationPkce = async (
  verifier: string,
  expectedChallenge: string,
): Promise<boolean> => {
  if (verifier.length < 43 || verifier.length > 128) return false
  return (await createPkceChallenge(verifier)) === expectedChallenge
}
