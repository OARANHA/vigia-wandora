import { Text } from "@repo/ui"
import { VIGIA_PRODUCT } from "../lib/product.ts"

export function VigiaBrand() {
  return (
    <div className="flex flex-col items-center gap-0.5" aria-label={VIGIA_PRODUCT.signature}>
      <Text.H3 align="center">{VIGIA_PRODUCT.name}</Text.H3>
      <Text.H6 color="foregroundMuted" align="center">
        by Wandora
      </Text.H6>
    </div>
  )
}
