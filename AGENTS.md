# AGENTS.md — personalfit (frontend web)

Guia de convenções para agentes de IA (Claude Code, Codex, Cursor, etc.) trabalhando
neste repositório. Frontend Next.js App Router + React + TypeScript do app Venafit
(personal trainer), com suporte offline via Service Worker + IndexedDB.

Este documento é a versão compilada das regras individuais em `rules/`. Para o
índice navegável por categoria, veja `rules/RULES.md`. As regras foram extraídas
do código real e do histórico de commits deste repositório em 2026-08-15 — não são
boas práticas genéricas de React.

---

## Layout / CSS

### Footer é sibling flex fora do scroll — nunca fixed/sticky

`.main_back` é flex column com `overflow: hidden`; `.main-content` é o único
elemento com scroll; `<Footer />` é sibling de `<main>`, `flex-shrink: 0`,
`position: relative`. Elemento fixo de rodapé (banner sticky) precisa se ancorar
acima do footer via `--app-footer-height` (publicada pelo próprio `Footer` via
`ResizeObserver`), nunca `bottom: 0` puro:

```css
.sticky {
  position: fixed;
  bottom: var(--app-footer-height, 0px);
}
```

Detalhe completo: `rules/layout-footer-sibling-not-fixed.md`.

### 100dvh como fallback de 100vh; min-height genérico herda do pai

```css
.main_back { height: 100vh; height: 100dvh; }
.min-h-screen { min-height: 100%; } /* não 100vh — o pai já define a altura disponível */
```

`100vh` em mobile conta a área da barra de endereço, forçando scroll indevido.
Detalhe completo: `rules/layout-viewport-dvh-mobile.md`.

### CSS Modules + tokens de constants.css, unidade rem, z-index nomeado

Styling é CSS Modules (não há Tailwind real instalado). Tokens em
`src/app/css/constants.css`: espaçamento `--space-1..10`, raios, tipografia
`--font-xs..3xl`, z-index nomeado (`--z-base` a `--z-toast`) em vez de números
mágicos. `rem` pra tipografia/tamanho; inputs exigem `font-size: 1rem !important`
(16px, evita zoom automático do iOS Safari ao focar). Alertas usam ícone via
`mask` de `currentColor`, não só cor de fundo (acessibilidade). Detalhe completo:
`rules/css-design-tokens.md`.

---

## API / Offline

### Distinguir erro de rede de erro de servidor antes do fallback

```ts
if (axios.isAxiosError(err) && !err.response) {
  // sem rede -> fallback offline (IndexedDB)
} else {
  // servidor respondeu com erro -> mostrar erro real, não é "estar offline"
}
```

Padrão repetido em pelo menos 8 arquivos. Detalhe completo:
`rules/api-error-offline-vs-server.md`.

### Mutação offline vai pra fila IndexedDB, 409 é sucesso idempotente

Ações offline (`enqueueCompletion`/`enqueueSkip`) gravam em IndexedDB
(`venafit-offline`, store `pendingMutations`) e tentam sincronizar quando
`navigator.onLine` ou em eventos `online`/`visibilitychange`. Ao processar: `409`
= sucesso idempotente (servidor já tinha o dado), erro sem `response` = ainda
offline (não conta retry), outro erro = `status: 'failed'`. Mudança na fila
propaga via `CustomEvent('venafit:queue-changed')`, não Context. Detalhe
completo: `rules/offline-sync-queue-pattern.md`.

---

## Sessão / Auth

### Sessão e rota por papel sempre via src/libs/session.ts

`getStudentHomeRoute()`, `landingRouteFor(user)`, `useAuthGuard`, `clearSession()`
— nunca ler/escrever `localStorage` de token/user direto em componente.
`clearSession()` limpa localStorage, cookies leves, caches locais sensíveis
(nota/peso de exercício), IndexedDB `venafit-offline` inteiro e Cache Storage do
service worker — necessário por LGPD em dispositivo compartilhado. Detalhe
completo: `rules/session-centralized-helpers.md`.

---

## Componentes

### variant/size enum + composição via children, não booleans soltos

```tsx
variant: 'primary' | 'secondary' | 'danger' | 'warning' | 'ghost'
size: 'sm' | 'md' | 'lg'
```

Estado com fases múltiplas usa union type discriminada
(`{ kind: 'idle' } | { kind: 'downloading'; ... }`), não vários booleans
simultâneos. `system/Modal` é o componente canônico (portal, pilha de Escape,
ajuste de teclado iOS) — não recriar modal com `position: fixed` na mão. Detalhe
completo: `rules/component-composition-variant-enum.md`.

---

## Formulários

### Normalizar pra dígitos antes de validar comprimento

```ts
const digits = val.replace(/\D/g, '')
return digits.length === 10 || digits.length === 11 // telefone: DDD + 8/9 dígitos
```

Bug real corrigido: validar comprimento da string mascarada deixava texto com
letras passar. CPF usa checksum real espelhando o backend Go. Política de senha
forte só se aplica em cadastro, não em login (retroatividade quebraria contas
antigas). Detalhe completo: `rules/form-validation-normalize-before-length.md`.
