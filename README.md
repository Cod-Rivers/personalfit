This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy (Cloud Run — venafit-frontend)

Este projeto roda em produção no Cloud Run (`venafit-frontend`, região `us-east1`,
projeto `venafit-78329`), atrás do domínio `venafit.codriverslabs.com`.

### ⚠️ NUNCA use `gcloud run deploy --source .`

As variáveis `NEXT_PUBLIC_*` (URL da API, config do Firebase) são embutidas no
bundle JS **em tempo de build** pelo Next.js — não são lidas em runtime como no
backend Go. Elas só chegam ao build através dos `--build-arg` definidos no
`cloudbuild.yaml`.

`gcloud run deploy --source .` builda a imagem "por fora" desse arquivo, sem
passar nenhum `--build-arg`. O resultado é um bundle publicado em produção
apontando para `http://localhost:8080` (fallback de dev do `libs/api.ts`) —
login e qualquer chamada à API quebram silenciosamente para todo mundo, sem
nenhum erro aparecer no build ou no deploy.

> Isso já aconteceu em produção em 2026-07-22 e derrubou o login no site e no
> app Android (que é um WebView do mesmo site). Desde então o `Dockerfile`
> falha o build (`exit 1`) se `NEXT_PUBLIC_API_URL` vier vazio, mas mesmo assim
> **use sempre o caminho abaixo**.

### Deploy automático (recomendado)

Push/merge na branch `main` do repo `Cod-Rivers/personalfit` dispara o Cloud
Build Trigger `venafit-frontend-main`, que builda com as variáveis corretas e
já publica no Cloud Run. Não precisa fazer nada manualmente.

### Deploy manual (só se o trigger estiver fora do ar)

```bash
gcloud builds submit --config=cloudbuild.yaml --region=us-east1 \
  --substitutions=_IMAGE="us-east1-docker.pkg.dev/venafit-78329/cloud-run-source-deploy/venafit-frontend:$(git rev-parse --short HEAD)",_NEXT_PUBLIC_API_URL="https://venafit-backend-911490267222.southamerica-east1.run.app",_NEXT_PUBLIC_FIREBASE_API_KEY="...",_NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="venafit-78329.firebaseapp.com",_NEXT_PUBLIC_FIREBASE_PROJECT_ID="venafit-78329",_NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="venafit-78329.firebasestorage.app",_NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="911490267222",_NEXT_PUBLIC_FIREBASE_APP_ID="1:911490267222:web:435d05ca19a8de593de3f7",_NEXT_PUBLIC_FIREBASE_VAPID_KEY="..." \
  .
```

Isso builda **e** faz o deploy no Cloud Run (o `cloudbuild.yaml` tem um step
de `gcloud run deploy` no final). Os valores reais de `_NEXT_PUBLIC_FIREBASE_*`
estão no `.env.local` (não versionado) ou no console do Firebase
(`venafit-78329` → Configurações do projeto → Apps → Web).

Para checar se o bundle publicado está com a URL certa:

```bash
curl -s https://venafit.codriverslabs.com/ | grep -o 'chunks/[a-zA-Z0-9_-]*\.js' | sort -u
# baixe os chunks e procure por "venafit-backend-911490267222" (deve aparecer)
# e confirme que "localhost:8080" só aparece como fallback morto, não como base ativa
```
