---
title: Footer é sibling flex fora do scroll — nunca fixed/sticky
impact: HIGH
impactDescription: elemento fixed de rodapé (ex. banner de anúncio) já sobrepôs o footer em produção
tags: css, layout, mobile
---

## Footer é sibling flex fora do scroll — nunca fixed/sticky

`.main_back` (body) é um flex column com `overflow: hidden`. `.main-content` é o
único elemento com scroll (`flex: 1; overflow-y: auto`). `<Footer />` é **sibling**
de `<main className="main-content">` dentro de `.main_back`, com
`flex-shrink: 0`, `position: relative` — nunca `fixed` nem `sticky`. Confirmado em
`src/app/layout.tsx` e `Footer/styles.css`.

Qualquer elemento que precise ficar fixo na base da tela (banner de anúncio
sticky, botão flutuante) precisa se ancorar **acima** do footer, não em
`bottom: 0`. O `Footer` publica sua própria altura real via `ResizeObserver` na
CSS var `--app-footer-height`:

```tsx
// src/components/organism/Footer/index.tsx
document.documentElement.style.setProperty('--app-footer-height', `${height}px`)
```

**Incorrect (já causou sobreposição real em produção, corrigido no commit `818c353`):**

```css
/* AdBanner.module.css, antes do fix */
.sticky {
  position: fixed;
  bottom: 0; /* fica sobreposto/atrás do footer */
}
```

**Correct:**

```css
.sticky {
  position: fixed;
  bottom: var(--app-footer-height, 0px);
}
```

Se estiver tentado a usar `position: fixed` ou `sticky` no próprio `<Footer>`,
pare — a arquitetura deste app depende dele nunca cobrir conteúdo do
`.main-content`. Ver também `layout-viewport-dvh-mobile.md` para o problema irmão
de altura de viewport em mobile.
