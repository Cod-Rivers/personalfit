---
title: Use 100dvh como fallback de 100vh; min-height genérico herda do pai
impact: MEDIUM
impactDescription: 100vh em mobile inclui a área coberta pela barra de endereço, forçando scroll indevido
tags: css, layout, mobile, viewport
---

## Use 100dvh como fallback de 100vh; min-height genérico herda do pai

Em navegadores mobile, `100vh` conta o viewport **máximo**, incluindo a área que a
barra de endereço ocupa quando visível — isso faz o conteúdo entre header/footer
exigir scroll de página mesmo cabendo na tela. `100dvh` (dynamic viewport height)
resolve isso, mas precisa de fallback pra navegadores sem suporte.

```css
/* src/app/css/globals.css */
.main_back {
  height: 100vh;   /* fallback */
  height: 100dvh;  /* navegadores com suporte sobrescrevem */
}
```

Separadamente, `.min-h-screen` (utilitária genérica usada em várias páginas)
**não** deve forçar `min-height: 100vh` — isso faz páginas dentro de um container
que já tem altura própria (ex. dentro de `.main-content`) estourarem a viewport
inteira de novo. O valor correto pra essa classe genérica é herdar do pai:

**Incorrect:**

```css
.min-h-screen {
  min-height: 100vh; /* ignora que o pai já define a altura disponível */
}
```

**Correct:**

```css
.min-h-screen {
  min-height: 100%;
}
```

Essa correção foi feita em ~15 páginas numa auditoria de responsividade (commits
`727cdcd`, `b8accea`). Ao criar uma página/seção nova que precisa ocupar a altura
disponível, use `100%` do container pai (que já resolve `100dvh` em cascata via
`.main_back`), não `100vh` direto.
