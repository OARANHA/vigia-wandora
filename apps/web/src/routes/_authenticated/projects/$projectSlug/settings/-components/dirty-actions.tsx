import { Button, Text } from "@repo/ui"

/** Header actions for a settings page with unsaved changes. Render `null` when clean. */
export function DirtyActions({
  dirtyCount,
  isApplying,
  canApply = true,
  onApply,
  onDiscard,
}: {
  readonly dirtyCount: number
  readonly isApplying: boolean
  readonly canApply?: boolean
  readonly onApply: () => void
  readonly onDiscard: () => void
}) {
  if (dirtyCount === 0) return null
  return (
    <div className="flex flex-row items-center gap-3">
      <Text.H5 color="foregroundMuted">
        {dirtyCount} {dirtyCount === 1 ? "alteração não salva" : "alterações não salvas"}
      </Text.H5>
      <Button variant="outline" onClick={onDiscard} disabled={isApplying}>
        Descartar
      </Button>
      <Button onClick={onApply} isLoading={isApplying} disabled={!canApply || isApplying}>
        Aplicar
      </Button>
    </div>
  )
}
