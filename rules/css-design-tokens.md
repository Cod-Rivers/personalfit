---
title: CSS Modules + tokens de constants.css, unidade rem, z-index nomeado
impact: MEDIUM
impactDescription: número mágico de z-index e px solto já geraram bugs de sobreposição e zoom indevido no iOS
tags: css, design-tokens, mobile
---

## CSS Modules + tokens de constants.css, unidade rem, z-index nomeado

Styling é **CSS Modules** (`Componente.module.css` ao lado do componente) — não
há Tailwind real instalado (algumas classes utilitárias tipo Tailwind foram
escritas à mão em `globals.css` só porque Tailwind está ausente) nem
styled-components. Há Bootstrap re-temado via overrides em `globals.css`.

Tokens de design centralizados em `src/app/css/constants.css`:

- Tema light/dark via `:root, [data-theme="light"]` / `[data-theme="dark"]`.
- Escala de espaçamento `--space-1` (4px) a `--space-10` (60px), raios
  `--radius-sm/md/lg/xl/full`, escala tipográfica `--font-xs` a `--font-3xl`.
- **Escala de z-index nomeada** (`--z-base: 0` até `--z-toast: 2000`) — o próprio
  arquivo admite que nem todo o código foi migrado pra escala ainda, mas é o alvo.

**Convenção de unidade**: `rem` pra tipografia/tamanho, `px` só pra
espaçamentos/bordas/sombras muito pequenos. `html { font-size: 16px }` é a base;
o resto é `rem`. Regra específica de mobile: inputs de formulário exigem
`font-size: 1rem !important` (16px) — abaixo disso o iOS Safari dá zoom
automático ao focar o campo.

**Incorrect (número mágico de z-index, competindo com outros elementos):**

```css
.dropdown { z-index: 9999; }
.toast { z-index: 10000; }
```

**Correct:**

```css
.dropdown { z-index: var(--z-sticky); }
.toast { z-index: var(--z-toast); }
```

Alertas (Bootstrap `.alert-warning`/`.alert-danger`/`.alert-success`) usam ícone
via `mask` de `currentColor`, não só cor de fundo — garante que o significado não
dependa só da cor (acessibilidade pra daltonismo/baixo contraste). Ao adicionar um
alerta/estado novo, siga esse padrão em vez de só trocar `background-color`.
