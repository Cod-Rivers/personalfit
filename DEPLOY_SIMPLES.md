# 🚀 Deploy Simples (Sem Docker)

Deploy direto do código fonte, igual você fez com a API Go!

## Comando Único

```powershell
gcloud run deploy personal-fit-frontend --source . --platform managed --region us-west1 --allow-unauthenticated --set-env-vars NEXT_PUBLIC_API_URL=https://dbomfim-1003252716435.us-west1.run.app
```

## Passo a Passo

### 1. Certifique-se de estar logado

```powershell
gcloud auth login
gcloud config set project dbomfim
```

### 2. Execute o deploy

```powershell
# Usando o script
bash deploy-source.sh

# OU comando direto
gcloud run deploy personal-fit-frontend `
  --source . `
  --platform managed `
  --region us-west1 `
  --allow-unauthenticated `
  --set-env-vars NEXT_PUBLIC_API_URL=https://dbomfim-1003252716435.us-west1.run.app
```

## O que acontece?

1. O Google Cloud detecta automaticamente que é Next.js
2. Instala as dependências (`yarn install`)
3. Faz o build (`yarn build`)
4. Inicia o servidor (`yarn start`)
5. Publica na URL do Cloud Run

## Pronto! 🎉

Sem Docker, sem Dockerfile, sem complicação!
