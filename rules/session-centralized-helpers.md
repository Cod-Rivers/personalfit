---
title: Sessão/rota por papel sempre via src/libs/session.ts, nunca localStorage espalhado
impact: HIGH
impactDescription: leitura/escrita de sessão duplicada em várias telas foi causa real de bugs de estado
tags: auth, session, architecture
---

## Sessão/rota por papel sempre via src/libs/session.ts, nunca localStorage espalhado

Toda leitura/escrita de sessão (token, refresh token, usuário) e toda decisão de
"pra onde este usuário vai" está centralizada em `src/libs/session.ts` — o próprio
arquivo documenta no topo que isso existe pra evitar a duplicação que havia antes
espalhada por várias telas.

Funções a reusar em vez de reimplementar:

- `getStudentHomeRoute()` — `/meus-treinos` (aluno com personal vinculado) vs
  `/app` (aluno sem personal, dashboard legado).
- `landingRouteFor(user)` — destino pós-login por role: `admin`/`content_editor` →
  `/admin`, `personal` → `/personal`, aluno com personal → `/vitrine`, aluno sem
  personal → `/app`. Substitui cadeias de ternário repetidas.
- `clearSession()` — limpa localStorage, cookies leves (`vf_auth`, `vf_role`),
  caches locais sensíveis (`vf_exercise_note:`, `vf_exercise_weight:`,
  `vf_workout_start:`), o IndexedDB `venafit-offline` inteiro e o Cache Storage do
  service worker. Isso existe por LGPD — dispositivo compartilhado não deve
  vazar dado de saúde do usuário anterior pro próximo login.
- `useAuthGuard` (`src/hooks/useAuthGuard.ts`) — encapsula "ler token/user,
  redirecionar se ausente ou role não permitido", também duplicado antes em ~10
  páginas.

**Incorrect:**

```tsx
useEffect(() => {
  const token = localStorage.getItem('token')
  const user = JSON.parse(localStorage.getItem('user') || '{}')
  if (!token) router.push('/')
  else if (user.role === 'personal') router.push('/personal')
  else if (user.hasPersonal) router.push('/vitrine')
  else router.push('/app')
}, [])
```

**Correct:**

```tsx
const { user } = useAuthGuard(['student', 'personal'])
useEffect(() => {
  if (user) router.push(landingRouteFor(user))
}, [user])
```

Ao logout/trocar de conta, sempre chame `clearSession()` — nunca só
`localStorage.removeItem('token')` — pra não deixar cache offline/nota de
exercício do usuário anterior visível pro próximo a logar no mesmo device.
