# 🚀 Deploy do Frontend Next.js no Google Cloud Run

Este guia explica como fazer o deploy da aplicação Next.js no Google Cloud Run.

## 📋 Pré-requisitos

1. **Google Cloud CLI** instalado

    ```bash
    # Verificar se está instalado
    gcloud --version

    # Se não estiver, instale de: https://cloud.google.com/sdk/docs/install
    ```

2. **Fazer login no Google Cloud**

    ```bash
    gcloud auth login
    ```

3. **Configurar o projeto**

    ```bash
    gcloud config set project dbomfim
    ```

4. **Habilitar APIs necessárias**
    ```bash
    gcloud services enable cloudbuild.googleapis.com run.googleapis.com containerregistry.googleapis.com
    ```

## 🎯 Opções de Deploy

### Opção 1: Deploy Rápido com Script (RECOMENDADO)

No PowerShell/Terminal:

```bash
# No Windows (PowerShell)
bash deploy.sh

# Ou usando Git Bash
./deploy.sh
```

**Antes de executar**, edite o arquivo `deploy.sh` e verifique:

- `PROJECT_ID`: seu ID do projeto (provavelmente "dbomfim")
- `REGION`: região desejada (padrão: us-west1)
- `API_URL`: URL da sua API (já configurada)

### Opção 2: Deploy Manual Passo a Passo

#### 1. Build e Push da Imagem

```bash
gcloud builds submit --tag gcr.io/dbomfim/personal-fit-frontend
```

#### 2. Deploy no Cloud Run

```bash
gcloud run deploy personal-fit-frontend \
  --image gcr.io/dbomfim/personal-fit-frontend \
  --platform managed \
  --region us-west1 \
  --allow-unauthenticated \
  --set-env-vars NEXT_PUBLIC_API_URL=https://dbomfim-1003252716435.us-west1.run.app \
  --memory 1Gi \
  --cpu 1
```

### Opção 3: Deploy com Cloud Build (CI/CD)

Se você usar GitHub ou outro repositório Git:

```bash
gcloud builds submit --config cloudbuild.yaml
```

## 🔧 Configurações Importantes

### Variáveis de Ambiente

As variáveis de ambiente são configuradas no deploy. Para adicionar mais:

```bash
gcloud run services update personal-fit-frontend \
  --region us-west1 \
  --set-env-vars NEXT_PUBLIC_API_URL=https://sua-api-url.com,OUTRA_VAR=valor
```

### Domínio Customizado

Para usar um domínio próprio:

```bash
gcloud run domain-mappings create \
  --service personal-fit-frontend \
  --domain seu-dominio.com \
  --region us-west1
```

### Escalamento

Para configurar o número de instâncias:

```bash
gcloud run services update personal-fit-frontend \
  --region us-west1 \
  --min-instances 0 \
  --max-instances 10
```

## 🐛 Troubleshooting

### Ver logs da aplicação

```bash
gcloud run services logs read personal-fit-frontend --region us-west1
```

### Ver logs em tempo real

```bash
gcloud run services logs tail personal-fit-frontend --region us-west1
```

### Testar localmente com Docker

```bash
# Build local
docker build -t personal-fit-frontend .

# Run local
docker run -p 8080:8080 \
  -e NEXT_PUBLIC_API_URL=https://dbomfim-1003252716435.us-west1.run.app \
  personal-fit-frontend
```

Acesse: http://localhost:8080

### Erro de autenticação

```bash
gcloud auth login
gcloud auth configure-docker
```

### Erro de permissões

Verifique se você tem as permissões necessárias:

- Cloud Run Admin
- Cloud Build Editor
- Storage Admin

## 📊 Monitoramento

Após o deploy, você pode monitorar sua aplicação:

```bash
# Ver detalhes do serviço
gcloud run services describe personal-fit-frontend --region us-west1

# Ver URL do serviço
gcloud run services describe personal-fit-frontend \
  --region us-west1 \
  --format 'value(status.url)'
```

## 💰 Custos

O Cloud Run cobra baseado em:

- Tempo de execução (quando recebe requisições)
- Memória utilizada
- Número de requisições

Primeira camada é gratuita:

- 2 milhões de requisições por mês
- 360.000 GB-segundos de memória

## 🔄 Atualizações

Para fazer deploy de uma nova versão:

```bash
# Opção 1: Com o script
bash deploy.sh

# Opção 2: Manual
gcloud builds submit --tag gcr.io/dbomfim/personal-fit-frontend && \
gcloud run deploy personal-fit-frontend \
  --image gcr.io/dbomfim/personal-fit-frontend \
  --region us-west1
```

## ✅ Checklist de Deploy

- [ ] Google Cloud CLI instalado
- [ ] Autenticado no gcloud
- [ ] Projeto configurado
- [ ] APIs habilitadas
- [ ] Arquivo `.env.local` com variáveis corretas
- [ ] Build local testado (opcional)
- [ ] Deploy executado
- [ ] URL testada no navegador
- [ ] Logs verificados

## 🌐 Próximos Passos

1. **HTTPS**: Automático no Cloud Run
2. **CDN**: Configure Cloud CDN para melhor performance
3. **Domínio**: Mapeie um domínio customizado
4. **CI/CD**: Configure deploy automático com GitHub Actions
5. **Monitoramento**: Configure alertas no Cloud Monitoring
