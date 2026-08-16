# CLAUDE.md — personalfit (frontend web)

Frontend Next.js App Router + React + TypeScript do app Venafit (personal
trainer), CSS Modules, suporte offline via Service Worker + IndexedDB.

Este repositório tem um conjunto de **regras de convenção** extraídas do próprio
código e histórico de commits, não de boas práticas genéricas de React. Antes de
alterações não triviais nas áreas abaixo, leia a regra correspondente em `rules/`
(ou o documento compilado `AGENTS.md`, que tem todas juntas):

- Layout / elemento fixo de rodapé → `rules/layout-footer-sibling-not-fixed.md`
- Página nova ocupando altura de tela → `rules/layout-viewport-dvh-mobile.md`
- Cor/espaçamento/z-index em CSS → `rules/css-design-tokens.md`
- Chamada de API com fallback offline → `rules/api-error-offline-vs-server.md`
- Ação que precisa funcionar offline → `rules/offline-sync-queue-pattern.md`
- Sessão/token/rota por papel de usuário → `rules/session-centralized-helpers.md`
- Componente reutilizável / modal → `rules/component-composition-variant-enum.md`
- Validação de CPF/telefone/campo mascarado → `rules/form-validation-normalize-before-length.md`

Índice completo com prioridade/impacto: `rules/RULES.md`.
