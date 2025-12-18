#!/bin/bash

# Script de deploy para Cloud Run
# Execute com: bash deploy.sh

# Configurações
PROJECT_ID="dbomfim"  # Altere para seu PROJECT_ID
REGION="us-west1"
SERVICE_NAME="personal-fit-frontend"
API_URL="https://dbomfim-1003252716435.us-west1.run.app"

echo "🚀 Iniciando deploy do frontend..."

# Verificar se está logado no gcloud
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" > /dev/null 2>&1; then
    echo "❌ Você não está logado no Google Cloud. Execute: gcloud auth login"
    exit 1
fi

# Definir projeto
echo "📦 Configurando projeto: $PROJECT_ID"
gcloud config set project $PROJECT_ID

# Build da imagem
echo "🔨 Construindo imagem Docker..."
gcloud builds submit --tag gcr.io/$PROJECT_ID/$SERVICE_NAME

# Deploy no Cloud Run
echo "☁️ Fazendo deploy no Cloud Run..."
gcloud run deploy $SERVICE_NAME \
  --image gcr.io/$PROJECT_ID/$SERVICE_NAME \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --set-env-vars NEXT_PUBLIC_API_URL=$API_URL \
  --memory 1Gi \
  --cpu 1 \
  --max-instances 10 \
  --timeout 300

echo "✅ Deploy concluído!"
echo "🌐 Sua aplicação está disponível em:"
gcloud run services describe $SERVICE_NAME --platform managed --region $REGION --format 'value(status.url)'
