# Rules — personalfit (frontend web)

Convenções reais deste frontend (Next.js App Router + React + TypeScript, CSS
Modules, PWA offline via Service Worker + IndexedDB), extraídas do próprio código
e do histórico de commits — não são boas práticas genéricas de React.

Levantadas em 2026-08-15 com base em pesquisa profunda do repositório, usando como
referência de formato o catálogo de skills de
[tech-leads-club/agent-skills](https://github.com/tech-leads-club/agent-skills)
(clonado localmente em `../references/agent-skills`).

## Quando aplicar

Consulte estas regras ao:

- Criar layout ou elemento fixo/sticky de rodapé
- Criar página nova que ocupa altura de tela
- Tratar erro de chamada de API que também funciona offline
- Ler/escrever sessão, token, ou decidir rota por papel de usuário
- Criar componente reutilizável ou modal
- Adicionar cor/espaçamento/z-index em CSS
- Adicionar ação que precisa funcionar offline
- Validar CPF/telefone ou outro campo de formulário mascarado

## Categorias por prioridade

| Prioridade | Categoria           | Impacto | Prefixo     |
| ---------- | -------------------- | ------- | ----------- |
| 1          | Layout / CSS          | HIGH/MEDIUM | `layout-`, `css-` |
| 2          | API / Offline          | HIGH    | `api-`, `offline-` |
| 3          | Sessão / Auth           | HIGH    | `session-`  |
| 4          | Componentes             | MEDIUM  | `component-` |
| 5          | Formulários             | HIGH    | `form-`     |

## Referência rápida

### 1. Layout / CSS

- [`layout-footer-sibling-not-fixed`](layout-footer-sibling-not-fixed.md) — footer
  é sibling flex fora do scroll, nunca fixed/sticky; elementos fixos de rodapé usam
  `--app-footer-height`
- [`layout-viewport-dvh-mobile`](layout-viewport-dvh-mobile.md) — `100dvh` como
  fallback de `100vh`; `.min-h-screen` herda do pai (`100%`), não força viewport
- [`css-design-tokens`](css-design-tokens.md) — CSS Modules + tokens de
  `constants.css`, unidade rem, z-index nomeado, ícone de alerta não só por cor

### 2. API / Offline

- [`api-error-offline-vs-server`](api-error-offline-vs-server.md) — distinguir
  `axios.isAxiosError(err) && !err.response` (sem rede) de erro de servidor real
- [`offline-sync-queue-pattern`](offline-sync-queue-pattern.md) — mutação offline
  vai pra fila IndexedDB, 409 é sucesso idempotente

### 3. Sessão / Auth

- [`session-centralized-helpers`](session-centralized-helpers.md) — sessão e rota
  por papel sempre via `src/libs/session.ts`, `clearSession()` completo no logout

### 4. Componentes

- [`component-composition-variant-enum`](component-composition-variant-enum.md) —
  `variant`/`size` enum + composição via `children`, não booleans soltos; usar
  `system/Modal` em vez de recriar modal na mão

### 5. Formulários

- [`form-validation-normalize-before-length`](form-validation-normalize-before-length.md)
  — normalizar pra dígitos antes de validar comprimento (CPF, telefone)

## Como usar

Leia o arquivo de cada regra para explicação completa e exemplos de código
incorreto/correto retirados do próprio repositório. Para o documento compilado com
todas as regras em um único arquivo, veja `../AGENTS.md`.
