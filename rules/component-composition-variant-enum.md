---
title: Componentes usam variant/size enum + composição, não booleans soltos
impact: MEDIUM
impactDescription: booleans soltos (isX, isY) tendem a virar condicionais aninhadas difíceis de manter
tags: components, composition, architecture
---

## Componentes usam variant/size enum + composição, não booleans soltos

Componentes reutilizáveis (`src/components/atoms`, `molecules`, `system`) seguem
props de `variant`/`size` como union type em vez de múltiplos booleans
independentes, e usam **composição via `children`** em vez de props booleanas pra
alternar o que é renderizado:

```tsx
// src/components/atoms/Button/index.tsx
variant: 'primary' | 'secondary' | 'danger' | 'warning' | 'ghost'
size: 'sm' | 'md' | 'lg'
```

Classe CSS composta com array + `.filter(Boolean).join(' ')` (sem lib externa tipo
`clsx`):

```tsx
const classes = [
  styles.button, styles[variant], styles[size],
  FILLED_VARIANTS.includes(variant) && styles.filled,
  fullWidth && styles.fullWidth, className,
].filter(Boolean).join(' ')
```

Estado com múltiplas fases usa union type discriminada, não vários booleans
(`isLoading`, `isDone`, `isError` simultâneos e potencialmente inconsistentes):

```ts
// src/components/features/DownloadOfflineButton.tsx
type State =
  | { kind: 'idle' }
  | { kind: 'downloading'; done: number; total: number }
  | { kind: 'downloaded'; downloadedAt: string; stale: boolean }
  | { kind: 'error'; message: string }
```

O `Modal` central (`src/components/system/Modal`) é o exemplo de composição por
`children` + prop `footer?: ReactNode` — não `hasFooter: boolean`. Ele já resolve
portal (`createPortal`), pilha de modais abertos (só o do topo fecha com Escape) e
ajuste de altura pro teclado do iOS Safari. Modais ad-hoc com `position: fixed`
manual foram migrados pra esse componente (commit `48a8511`) — **não recrie
modal na mão**, use `system/Modal`.

**Incorrect:**

```tsx
function ExerciseCard({ isExpanded, isEditing, isReadOnly, hasVideo }: Props) { ... }
```

**Correct:**

```tsx
type ExerciseCardState =
  | { mode: 'collapsed' }
  | { mode: 'expanded'; editable: boolean }
```
