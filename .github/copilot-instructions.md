# GitHub Copilot Instructions

## 🛠️ Ferramentas de Desenvolvimento (CLI)

### Google Cloud SDK

**Localização no Sistema Windows:**

```
C:\Users\river\AppData\Local\Google\Cloud SDK\google-cloud-sdk\bin
```

**Adicionar ao PATH (PowerShell):**

```powershell
$env:PATH = "C:\Users\river\AppData\Local\Google\Cloud SDK\google-cloud-sdk\bin;$env:PATH"
```

**Adicionar ao PATH (Permanente via System Environment Variables):**

1. Abrir "Editar as variáveis de ambiente do sistema"
2. Clicar em "Variáveis de Ambiente"
3. Em "Variáveis do sistema", editar "Path"
4. Adicionar: `C:\Users\river\AppData\Local\Google\Cloud SDK\google-cloud-sdk\bin`

**Versão Instalada:**

- Google Cloud SDK: 550.0.0
- gcloud CLI: 2025.12.12
- gsutil: 5.35
- bq: 2.1.26

**Configuração Atual:**

- **Conta:** plataformateamdbomfim@gmail.com
- **Projeto:** trans-trees-477923-e9
- **Região padrão:** us-west1

**Comandos Essenciais:**

```bash
# Verificar projeto atual
gcloud config get-value project

# Listar serviços Cloud Run
gcloud run services list --region=us-west1

# Ver logs do frontend
gcloud run services logs read plataforma-bom-fim-front-end --region=us-west1 --limit=50

# Descrever serviço (detalhes completos)
gcloud run services describe plataforma-bom-fim-front-end --region=us-west1

# Deploy manual (se necessário)
gcloud run deploy plataforma-bom-fim-front-end \
  --source . \
  --region us-west1 \
  --platform managed \
  --allow-unauthenticated
```

---

## 🏗️ Arquitetura do Projeto

### Stack Tecnológica

- **Framework:** Next.js 15+ (App Router)
- **Linguagem:** TypeScript
- **Runtime:** Node.js 20
- **Plataforma:** Google Cloud Run (Source Deploy com Buildpacks)
- **Estilo:** CSS Modules + Bootstrap 5

### Padrões Arquiteturais

- **Atomic Design:** Componentes organizados em `molecules/`, `organism/`, `templates/`
- **Feature-Based:** Lógica de negócio em `src/components/features`
- **Client-Side Rendering:** Amplo uso de `'use client'` para interatividade
- **API Integration:** Cliente HTTP centralizado em `src/app/utils/api.ts`

---

## 🚀 Regras Críticas de Deploy (Google Cloud Run)

### 1. Compatibilidade com Buildpacks (NÃO USAR DOCKERFILE)

O projeto usa **Source Deploy** do Cloud Run. O Buildpack detecta automaticamente o Next.js.

**OBRIGATÓRIO:**

- ✅ Manter `package.json` atualizado com todas as dependências
- ✅ Script `start` deve executar `next start` para produção:
    ```json
    "scripts": {
      "start": "next start"
    }
    ```
- ✅ Variáveis de ambiente para build devem estar em `next.config.ts`
- ❌ NUNCA adicionar `Dockerfile` customizado (quebra o Source Deploy)
- ❌ NUNCA modificar o `Procfile` sem necessidade extrema

### 2. Serverless Constraints (Cloud Run)

#### Port Binding

```typescript
// ✅ CORRETO - Usa variável de ambiente PORT
const port = process.env.PORT || 8080;

// ❌ ERRADO - Porta hardcoded
const port = 3000;
```

#### Stateless Architecture

```typescript
// ❌ PROIBIDO - Sistema de arquivos volátil
fs.writeFileSync('/tmp/cache.json', data);

// ✅ CORRETO - Use cache externo ou memória
import { Redis } from '@upstash/redis';
const cache = await redis.get('key');
```

#### Graceful Shutdown

```typescript
// ✅ OBRIGATÓRIO - Tratar sinais SIGTERM/SIGINT
process.on('SIGTERM', async () => {
    console.log('Received SIGTERM, shutting down gracefully...');
    await server.close();
    process.exit(0);
});
```

---

## 📝 Padrões de Código

### Componentes React

#### Estrutura de Arquivo

```tsx
// ✅ Sempre use 'use client' quando necessário
'use client';

import React, { useState, useEffect } from 'react';
import styles from './Component.module.css';

interface ComponentProps {
    id: string;
    onAction: (data: string) => void;
}

export default function Component({ id, onAction }: ComponentProps) {
    // Hooks primeiro
    const [state, setState] = useState('');

    // Side effects depois
    useEffect(() => {
        // Lógica aqui
    }, [id]);

    // Handlers
    const handleClick = () => {
        onAction(state);
    };

    return <div className={styles.container}>{/* JSX */}</div>;
}
```

#### Hidratação (Evitar Erros SSR/CSR)

```tsx
// ✅ Use ClientOnly para código que depende do navegador
import ClientOnly from '@/components/molecules/ClientOnly';

<ClientOnly fallback={<LoadingSpinner />}>
    <ComponentQueUsaLocalStorage />
</ClientOnly>;

// ✅ Ou use hook personalizado
const isMounted = useMounted();
if (!isMounted) return null;
```

### API Calls

#### Usar Cliente Centralizado

```typescript
// ✅ SEMPRE use Api de src/app/utils/api.ts
import { Api } from '@/app/utils/api';

const response = await Api.get('/endpoint');

// ❌ NUNCA faça fetch direto
fetch('http://hardcoded-url.com/api'); // PROIBIDO
```

#### Tratamento de Erros

```typescript
// ✅ Estrutura completa de erro
try {
    setLoading(true);
    const { data } = await Api.post('/endpoint', payload);
    setSuccess(true);
} catch (error) {
    console.error('[ComponentName] Erro:', error);
    setError(error.message || 'Erro desconhecido');
} finally {
    setLoading(false);
}
```

### Types & Interfaces

```typescript
// ✅ Definir em src/components/features/types.tsx
export interface Exercise {
    id: string;
    name: string;
    video_url: string;
    series: number[];
    weight: number;
    notes?: string;
}

// ✅ Usar Props explícitas
interface CardProps {
    exercise: Exercise;
    onSelect: (id: string) => void;
}
```

---

## 🔒 Segurança & Compliance

### Variáveis de Ambiente

```typescript
// ✅ Prefixo NEXT_PUBLIC_ para cliente
const apiUrl = process.env.NEXT_PUBLIC_API_URL;

// ✅ Sem prefixo para server-side apenas
const secret = process.env.API_SECRET_KEY;

// ❌ NUNCA commitar .env com secrets
// Use Secret Manager do GCP em produção
```

### Autenticação

```typescript
// ✅ Token sempre do localStorage
const token = localStorage.getItem('token');
Api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

// ❌ NUNCA armazenar senha
localStorage.setItem('password', pwd); // PROIBIDO
```

### CORS (Backend)

- O backend deve permitir origin do Cloud Run: `https://*.run.app`
- Frontend deve usar `NEXT_PUBLIC_API_URL` configurável

---

## 📊 Logging & Monitoramento

### Structured Logging

```typescript
// ✅ Logs estruturados para Cloud Logging
console.log(
    JSON.stringify({
        severity: 'INFO',
        message: 'User action completed',
        userId: user.id,
        timestamp: new Date().toISOString(),
    }),
);

// ❌ Evitar logs não-estruturados em produção
console.log('User did something'); // Pouco útil
```

### Performance

```typescript
// ✅ Lazy loading para imagens/GIFs
<img src={url} loading="lazy" alt={name} />

// ✅ Dynamic imports para componentes pesados
const HeavyChart = dynamic(() => import('./HeavyChart'), {
  loading: () => <Spinner />,
  ssr: false
});
```

---

## 🧪 Testing & Validação

### Antes de Commitar

```bash
# ✅ Build deve passar localmente
npm run build

# ✅ Verificar tipos
npx tsc --noEmit

# ✅ Lint (se configurado)
npm run lint
```

### Checklist de PR

- [ ] Build local passa sem erros
- [ ] Nenhuma variável de ambiente hardcoded
- [ ] Nenhuma porta hardcoded (usar `process.env.PORT`)
- [ ] Logs estruturados adicionados onde necessário
- [ ] Componentes `'use client'` quando usam hooks/eventos
- [ ] Graceful shutdown implementado em novas APIs

---

## 🚨 Proibições Absolutas

❌ **NUNCA:**

- Adicionar `Dockerfile` (quebra Source Deploy)
- Salvar arquivos em `/tmp` ou localmente (filesystem volátil)
- Hardcodar URLs de API (usar `NEXT_PUBLIC_API_URL`)
- Hardcodar porta (usar `process.env.PORT`)
- Commitar `.env.local` com secrets
- Usar `fs.writeFile` em runtime (serverless)
- Quebrar contratos de API sem backward compatibility
- Ignorar sinais SIGTERM (causa perda de dados)

---

## 📚 Recursos Principais

### Arquivos de Configuração

- `next.config.ts` - Configuração Next.js
- `package.json` - Dependências (fonte única de verdade)
- `.env.example` - Template de variáveis

### Documentação Interna

- `GIFS_FRONTEND.md` - Sistema de GIFs
- `IMPLEMENTACAO_ANOTACOES.md` - Feature de anotações
- `TROUBLESHOOTING_GIFS.md` - Debug de GIFs
- `DEPLOY_GUIDE.md` - Guia de deploy completo

### Bibliotecas Core

- `src/libs/gifUtils.ts` - Utilitários de GIFs
- `src/app/utils/api.ts` - Cliente HTTP
- `src/hooks/useMounted.ts` - Hook de hidratação

---

## 🎯 Quando Sugerir Código

### Priorize:

1. **Cloud Run compatibility** - Sempre verificar se é stateless e usa `PORT`
2. **TypeScript strict** - Tipos explícitos sempre
3. **Performance** - Lazy loading, dynamic imports, memoization
4. **Error handling** - Try-catch com logs estruturados
5. **Accessibility** - Adicionar `aria-*` e alt texts

### Evite Sugerir:

- Bibliotecas que requerem filesystem persistente
- Soluções que dependem de Docker customizado
- Código que quebra backward compatibility
- Hardcoded values para configs mutáveis

---

## 🔌 Contexto de Integração com Backend

### Base URL Logic

A API deve ser acessada através da URL base configurada via variável de ambiente:

```javascript
// Desenvolvimento local
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

// Produção
const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_URL || 'https://api.personal-fit.com';
```

**Importante:** Todas as rotas são relativas a esta URL base. Não há prefixo `/api` nas rotas.

### Padrão de Autenticação

**Endpoints Públicos (sem autenticação):**

- `POST /register` - Registro de usuário
- `POST /login` - Login de usuário
- `GET /questions` - Questões de anamnese
- `POST /webhooks/asaas` - Webhook de pagamento
- `GET /health` - Health check
- `GET /swagger/*` - Documentação

**Endpoints Protegidos (requerem autenticação):**
O Frontend deve enviar o token JWT recebido no login em todas as requisições protegidas.

**Header obrigatório:**

```
Authorization: Bearer <jwt-token>
```

**Exemplo de requisição autenticada:**

```javascript
fetch(`${API_BASE_URL}/me`, {
    method: 'GET',
    headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
    },
});
```

### Padrão de Resposta JSON

**Resposta de Sucesso (Login/Registro):**

```json
{
  "user": {
    "id": "string",
    "name": "string",
    "email": "string",
    "cpf": "string",
    "phone": "string",
    "mobile_phone": "string",
    "active": boolean,
    "created_at": "string",
    "updated_at": "string",
    "trainings_progress": []
  },
  "token": "string"
}
```

**Resposta de Sucesso (Perfil - GET /me):**

```json
{
  "id": "string",
  "name": "string",
  "email": "string",
  "cpf": "string",
  "phone": "string",
  "mobile_phone": "string",
  "active": boolean,
  "created_at": "string",
  "updated_at": "string",
  "trainings_progress": []
}
```

**Resposta de Erro:**

```json
{
    "error": "Mensagem de erro descritiva"
}
```

**Códigos HTTP:**

- `200` - Sucesso
- `400` - Erro de validação
- `401` - Não autenticado (Token inválido ou ausente)
- `404` - Recurso não encontrado
- `409` - Conflito (ex: email já cadastrado)
- `500` - Erro interno do servidor

### Resumo dos Principais Recursos

#### 1. Autenticação (`/`)

| Método | Rota        | Autenticação | Descrição          |
| ------ | ----------- | ------------ | ------------------ |
| POST   | `/register` | Não          | Criar novo usuário |
| POST   | `/login`    | Não          | Fazer login        |

**Body - Register:**

```json
{
    "name": "string",
    "email": "string",
    "password": "string",
    "cpf": "string",
    "phone": "string",
    "mobile_phone": "string"
}
```

**Body - Login:**

```json
{
    "email": "string",
    "password": "string"
}
```

#### 2. Perfil do Usuário (`/me`)

| Método | Rota  | Autenticação | Descrição                    |
| ------ | ----- | ------------ | ---------------------------- |
| GET    | `/me` | Sim          | Obter dados do usuário atual |

#### 3. Anamnese (`/questions`, `/anamnesis`)

| Método | Rota         | Autenticação | Descrição                    |
| ------ | ------------ | ------------ | ---------------------------- |
| GET    | `/questions` | Não          | Listar questões de anamnese  |
| POST   | `/anamnesis` | Sim          | Enviar respostas da anamnese |

**Body - Anamnesis:**

```json
{
    "answers": [
        {
            "question_id": "string",
            "answer_id": "string"
        }
    ]
}
```

#### 4. Assinatura (`/subscribe`)

| Método | Rota         | Autenticação | Descrição             |
| ------ | ------------ | ------------ | --------------------- |
| POST   | `/subscribe` | Sim          | Criar nova assinatura |

**Body - Subscribe:**

```json
{
    "value": 30.0,
    "cycle": "BIMONTHLY",
    "description": "Assinatura Bimestral"
}
```

#### 5. Arquivos Estáticos - GIFs dos Exercícios

**Acesso aos GIFs:**
Rota: `GET /static/gifs/{nome_do_arquivo}.gif`

**Lógica de Frontend:**
O banco de dados retorna o caminho relativo (ex: `"static/gifs/Agachamento_Livre_HBL.gif"`). O frontend deve concatenar com a Base URL.

```javascript
const gifUrl = `${API_BASE_URL}/${pathDoBanco}`;
```

### Tipagem e Enums

**Status de Assinatura (SubscriptionStatus):**

- `UNKNOWN`
- `ACTIVE`
- `CANCELED`
- `EXPIRED`
- `SUSPENDED`

**Ciclo de Assinatura (SubscriptionCycle):**

- `MONTHLY`
- `BIMONTHLY`
- `QUARTERLY`
- `YEARLY`

**User Active Status:**

- `true`: Usuário com pagamento confirmado.
- `false`: Usuário aguardando pagamento ou inativo.

### Tratamento de Erros Recomendado

Sempre verificar `response.ok`. Se `false`, extrair a mensagem da chave `error` do JSON.

```javascript
if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Erro desconhecido');
}
```

### Health Check

Endpoint: `GET /health`
Resposta esperada: `{ "status": "ok", "service": "personal-fit-api" }`

---

## 🌐 Configuração de Deploy e Ambiente

### Informações do Projeto Cloud Run

**Projeto GCP:**

- **Project ID:** `trans-trees-477923-e9`
- **Namespace:** `1003252716435`
- **Região:** `us-west1`
- **Service Name:** `plataforma-bom-fim-front-end`
- **URL Pública:** `https://plataforma-bom-fim-front-end-1003252716435.us-west1.run.app`
- **Backend API URL:** `https://dbomfim-1003252716435.us-west1.run.app`

### Configuração de Recursos

**Limites Atuais (Cloud Run):**

- **CPU:** 1000m (1 vCPU)
- **Memória:** 512Mi
- **Concurrency:** 80 requisições simultâneas por instância
- **Max Scale:** 20 instâncias (autoscaling)
- **Timeout:** 300 segundos
- **Port:** 8080 (porta padrão do Cloud Run)
- **Startup Probe:** TCP Socket na porta 8080 (240s timeout)

### Deploy via Cloud Build (CI/CD Automático)

**Trigger Configurado:**

- **Trigger ID:** `57ae579c-9e5c-4868-90b4-8b5ea4922240`
- **Deploy Automático:** A cada `git push`
- **Último Deploy:** 2025-12-18 20:32:53 UTC
- **Commit SHA:** `edf82f69ee8595c1b41a72c32407e792714b4267`
- **Managed By:** `gcp-cloud-build-deploy-cloud-run`

**Imagem Docker Gerada:**

```
us-west1-docker.pkg.dev/trans-trees-477923-e9/cloud-run-source-deploy/plataforma_bom_fim_front_end/plataforma-bom-fim-front-end:edf82f69ee8595c1b41a72c32407e792714b4267
```

### Variáveis de Ambiente Configuradas

```json
{
    "NEXT_PUBLIC_API_URL": "https://dbomfim-1003252716435.us-west1.run.app"
}
```

### Service Account

**Conta de Serviço:**

```
1003252716435-compute@developer.gserviceaccount.com
```

Esta conta é usada para execução do serviço e tem permissões para acessar recursos do GCP.

### Traffic Routing

- **Latest Revision:** 100% do tráfego
- **Current Revision:** `plataforma-bom-fim-front-end-00015-v6g`
- **Ingress:** Permitido de todas as fontes (`all`)
- **IAM Invoker:** Desabilitado (acesso público)

### Startup Optimization

**Startup CPU Boost:** Habilitado

- Fornece CPU extra durante o cold start para acelerar a inicialização do Next.js

### Health Checks

**Startup Probe:**

- **Tipo:** TCP Socket
- **Port:** 8080
- **Timeout:** 240 segundos
- **Failure Threshold:** 1

### Comandos Úteis de Deploy

**Deploy Manual (se necessário):**

```bash
gcloud run deploy plataforma-bom-fim-front-end \
  --source . \
  --platform managed \
  --region us-west1 \
  --allow-unauthenticated \
  --set-env-vars NEXT_PUBLIC_API_URL=https://dbomfim-1003252716435.us-west1.run.app \
  --memory 512Mi \
  --cpu 1 \
  --max-instances 20
```

**Ver Logs:**

```bash
gcloud run services logs read plataforma-bom-fim-front-end --region us-west1
```

**Listar Revisões:**

```bash
gcloud run revisions list --service plataforma-bom-fim-front-end --region us-west1
```

### Monitoramento

**Métricas Disponíveis:**

- Request count
- Request latencies
- Container CPU/Memory utilization
- Instance count (autoscaling)
- Cold start frequency

Acesse via Cloud Console: `https://console.cloud.google.com/run/detail/us-west1/plataforma-bom-fim-front-end`

---

## 📋 Contrato de Dados Frontend-Backend

Este documento descreve como o cliente (Next.js 15+) consome a API, destacando formatos de dados, peculiaridades de autenticação e fluxos que exigem otimização no Backend.

### Formato de Envio de Dados (Data Contracts)

O Backend deve estar preparado para receber dados nos seguintes formatos:

**1. Números e Strings**

- **Campos Numéricos:** Enviados como `Number` sempre que possível.
- **Exceções (Enviados como String):**
    - `CPF`, `CEP`, `Telefone`: Enviados "limpos" (apenas dígitos, sem formatação).
    - `Cartão de Crédito`: String sem espaços.
    - `Ano de Expiração`: **2 dígitos** (ex: "2026" → "26").
    - `holder_address_num`: String.

**Exemplo de Payload de Pagamento:**

```json
{
    "plan_value": 100.0,
    "card_number": "1234567890123456",
    "card_expiry_month": "12",
    "card_expiry_year": "26",
    "holder_cpf": "12345678900",
    "holder_postal_code": "22000000",
    "holder_address_num": "100"
}
```

**2. Séries de Exercícios**

- O Front envia arrays de números: `[10, 12, 15]`.
- O Back deve persistir essa estrutura para garantir que a exibição "10 / 12 / 15" funcione corretamente.

### Peculiaridade na Autenticação (Atenção Crítica) ⚠️

O cliente atual possui **inconsistência no envio do Header de autorização**. O Backend **deve ser permissivo** e tratar ambos os formatos abaixo para evitar erros 401:

1. **Padrão:** `Authorization: Bearer <jwt-token>`
2. **Legado/Exceção:** `Authorization: <jwt-token>` (sem o prefixo "Bearer", ocorre no fluxo de Cartão de Crédito).

### Fluxos Críticos e Gargalos de Performance

O Frontend realiza operações intensivas que dependem de otimização no Backend:

**1. Polling de Pagamento e Assinatura**

- **Comportamento Atual:** Após login ou assinatura, o Front faz **Polling no endpoint `/me`** (até 10 requisições com intervalo de 3s) para verificar se o status `user.active` mudou para `true`.
- **Necessidade Backend:** O endpoint `/me` deve ser extremamente performático (cacheado se possível) ou o Backend deve prover um endpoint leve de status (`/subscription/status/{id}`).

**2. Anamnese (Redução de RTT)**

- **Comportamento Atual:** `POST /user/anamnesis` -> Sucesso -> `GET /user` (para atualizar local state) -> Reload da página.
- **Otimização Solicitada:** O endpoint `POST /user/anamnesis` deve retornar o objeto `user` atualizado no corpo da resposta de sucesso. Isso elimina o `GET` subsequente.

**3. Carregamento de GIFs**

- GIFs são carregados de `/static/gifs/`.
- **Requisito:** Servir estes arquivos com headers de cache agressivos (`Cache-Control: public, max-age=31536000`) para evitar re-download a cada renderização da lista de exercícios.

### Checklist de Implementação Backend

- [ ] **Auth:** Middleware capaz de extrair Token com ou sem o prefixo "Bearer".
- [ ] **Validation:** Validar CPF e CEP no server-side (não confiar apenas na limpeza do front).
- [ ] **Performance:** Otimizar query do endpoint `/me` (alvo de polling).
- [ ] **Response:** Retornar objeto `user` atualizado nas respostas de `POST /anamnesis` e `POST /login`.
- [ ] **Infra:** Garantir suporte a `process.env.PORT` para o Cloud Run.

---

**Lembre-se:** Este projeto roda em **Cloud Run com Source Deploy**. Toda sugestão deve ser compatível com ambientes serverless e Buildpacks do Google Cloud.
