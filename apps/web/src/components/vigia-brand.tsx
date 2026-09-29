import { VIGIA_PRODUCT } from "../lib/product.ts"

export function VigiaBrand() {
  return (
    <img
      src={VIGIA_PRODUCT.logoPath}
      alt={VIGIA_PRODUCT.signature}
      width={220}
      height={100}
      className="h-auto w-[220px] max-w-full"
    />
  )
}
