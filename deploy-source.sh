#!/bin/bash

# Deploy direto do código fonte (sem Docker)
# Igual ao deploy da API Go

PROJECT_ID="dbomfim"  # Altere se necessário
REGION="us-west1"
SERVICE_NAME="personal-fit-frontend"
API_URL="https://dbomfim-1003252716435.us-west1.run.app"

echo "🚀 Deploy do frontend (Source-based, sem Docker)..."

# Deploy direto do código fonte
gcloud run deploy $SERVICE_NAME \
  --source . \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --set-env-vars NEXT_PUBLIC_API_URL=$API_URL \
  --memory 1Gi \
  --cpu 1 \
  --max-instances 10 \
  --port 3000

echo "✅ Deploy concluído!"
