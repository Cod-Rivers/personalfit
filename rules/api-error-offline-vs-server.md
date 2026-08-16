---
title: Distinguir erro de rede (offline) de erro de servidor antes de decidir o fallback
impact: HIGH
impactDescription: sem isso, um erro de servidor real é tratado como "modo offline" ou vice-versa
tags: api, offline, error-handling
---

## Distinguir erro de rede (offline) de erro de servidor antes de decidir o fallback

O app tem suporte offline real (Service Worker + IndexedDB), então todo lugar que
chama a API e trata erro precisa primeiro distinguir "sem rede" de "servidor
respondeu com erro". O padrão usado consistentemente em pelo menos 8 arquivos
(`meus-treinos/page.tsx`, `ExerciseDetailCard.tsx`, `WorkoutLogger.tsx`,
`syncQueue.ts`) é:

```ts
import axios from 'axios'

try {
  const data = await getMyPlannings()
} catch (err) {
  if (axios.isAxiosError(err) && !err.response) {
    // sem resposta do servidor = sem rede -> cai pro modo offline
    const offlineData = await getAllOfflineMacrocycles()
    setIsOfflineData(true)
  } else {
    // servidor respondeu (4xx/5xx) = erro de verdade, não é "estar offline"
    setError('Não foi possível carregar seus treinos.')
  }
}
```

Status específicos também têm tratamento próprio quando fazem parte do contrato da
API, não do fallback offline: `403` de limite de plano (`TrainingPdfUploadModal.tsx`),
`409` tratado como "já sincronizado, não é erro" na fila offline (`syncQueue.ts`),
`404` como "sem plano ativo" (`planningService.ts`).

**Incorrect:**

```ts
catch (err) {
  // trata qualquer erro como offline, esconde erro real de servidor (500, validação)
  setIsOfflineData(true)
}
```

Ao adicionar uma tela nova que consome dados que também existem offline, replique
esse `axios.isAxiosError(err) && !err.response` antes de decidir cair pro
IndexedDB — não trate todo `catch` como sinônimo de "sem internet".
