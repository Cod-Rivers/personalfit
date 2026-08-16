---
title: Mutação offline vai pra fila IndexedDB, 409 é sucesso idempotente
impact: HIGH
impactDescription: reenviar mutação já aplicada sem tratar 409 quebraria a sincronização
tags: offline, indexeddb, sync
---

## Mutação offline vai pra fila IndexedDB, 409 é sucesso idempotente

Ações feitas offline (completar/pular treino) não tentam a API direto — vão pra
uma fila em IndexedDB (`src/libs/offline/db.ts`, banco `venafit-offline`, store
`pendingMutations`) via `enqueueCompletion`/`enqueueSkip`
(`src/libs/offline/syncQueue.ts`). A fila tenta processar imediatamente se
`navigator.onLine`, e também escuta os eventos `online`/`visibilitychange` pra
tentar de novo automaticamente (`setupSyncTriggers()`).

Ao processar a fila, os três desfechos possíveis são tratados de forma diferente:

- **409** (conflito) → tratado como **sucesso idempotente**: o servidor já tem
  esse dado (provavelmente uma sync anterior conseguiu, ou o usuário fez a mesma
  ação por outro device), não é erro.
- **Erro sem `response`** (sem rede) → ainda offline, não incrementa contador de
  retry, tenta de novo depois.
- **Outro erro** → marca `status: 'failed'` de verdade.

Mudança na fila é propagada por `CustomEvent('venafit:queue-changed')`
(`onQueueChanged`), não por Context API — componentes como `SyncPendingBadge`
escutam o evento diretamente em vez de subscrever um provider.

**Incorrect:**

```ts
async function completeWorkout(id: string) {
  await Api.post(`/workout-logs/${id}/complete`) // falha direto se offline, perde a ação
}
```

**Correct:**

```ts
async function completeWorkout(id: string) {
  await enqueueCompletion(id) // grava no IndexedDB, tenta enviar se online
}

// syncQueue.ts, ao processar
if (axios.isAxiosError(err) && err.response?.status === 409) {
  return { status: 'synced' } // já sincronizado no servidor, não é erro
}
```

Ao adicionar uma ação nova que precisa funcionar offline, siga o mesmo padrão de
fila — não chame a API direto do componente.
