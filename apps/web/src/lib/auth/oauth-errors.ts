/**
 * Mensagens visíveis ao usuário para falhas no callback OAuth.
 *
 * O valor cru de `?error=` nunca é exibido na interface.
 */

const SIGN_IN_EXPIRED_MESSAGE = "Esta tentativa de acesso expirou ou foi interrompida. Tente novamente."

const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  account_not_linked:
    "Este e-mail já possui uma conta que não está vinculada a esse provedor. Entre com seu e-mail abaixo e depois vincule o provedor em Configurações → Conta.",
  access_denied: "O acesso foi cancelado antes de ser concluído. Tente novamente.",
  please_restart_the_process: SIGN_IN_EXPIRED_MESSAGE,
  state_mismatch: SIGN_IN_EXPIRED_MESSAGE,
  state_not_found: SIGN_IN_EXPIRED_MESSAGE,
  signup_disabled: "Novos cadastros estão desativados para este provedor. Continue com seu e-mail abaixo.",
  email_not_verified: "Seu e-mail não está verificado nesse provedor. Verifique-o e tente novamente.",
}

const GENERIC_OAUTH_ERROR_MESSAGE =
  "Não foi possível concluir o acesso. Tente novamente ou continue com seu e-mail abaixo."

export function oauthCallbackErrorMessage(code: string | undefined): string | undefined {
  if (!code) return undefined
  return OAUTH_ERROR_MESSAGES[code] ?? GENERIC_OAUTH_ERROR_MESSAGE
}

const LINK_ERROR_MESSAGES: Record<string, string> = {
  "email_doesn't_match":
    "Essa conta usa um e-mail diferente da sua conta Vigia. Escolha a conta que corresponde ao e-mail do Vigia.",
  account_already_linked_to_different_user: "Essa conta já está conectada a outro usuário do Vigia.",
  access_denied: "A conexão foi cancelada antes de ser concluída.",
}

const GENERIC_LINK_ERROR_MESSAGE = "Não foi possível conectar a conta. Tente novamente."

export function oauthLinkErrorMessage(code: string): string {
  return LINK_ERROR_MESSAGES[code] ?? GENERIC_LINK_ERROR_MESSAGE
}
