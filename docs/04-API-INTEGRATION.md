# 🔌 Integração com API - Personal-Fit Frontend

> **Versão:** 1.0.0  
> **Última atualização:** 23 de Dezembro de 2025  
> **Backend URL:** `https://dbomfim-1003252716435.us-west1.run.app`

---

## Índice

1. [Visão Geral](#1-visão-geral)
2. [Cliente HTTP (Axios)](#2-cliente-http-axios)
3. [Endpoints Completos](#3-endpoints-completos)
4. [Autenticação](#4-autenticação)
5. [Formatos de Request/Response](#5-formatos-de-requestresponse)
6. [Tratamento de Erros](#6-tratamento-de-erros)
7. [Polling e Verificações](#7-polling-e-verificações)
8. [Diagramas de Sequência](#8-diagramas-de-sequência)
9. [Boas Práticas](#9-boas-práticas)

---

## 1. Visão Geral

### 1.1 Arquitetura de Comunicação

```mermaid
graph LR
    subgraph FRONTEND["🖥️ Frontend (Next.js)"]
        PAGES[Pages]
        API_CLIENT[Api Client<br/>Axios]
        API_ROUTE[API Routes<br/>/api/*]
    end

    subgraph BACKEND["🔧 Backend"]
        REST[REST API]
        STATIC[Static Files]
        AUTH[Auth Service]
        PAYMENT[Payment<br/>Asaas]
    end

    PAGES --> API_CLIENT
    API_CLIENT --> |HTTP| REST
    API_ROUTE --> |Proxy| STATIC
    REST --> AUTH
    REST --> PAYMENT

    style FRONTEND fill:#3498db,stroke:#2980b9,color:#fff
    style BACKEND fill:#2ecc71,stroke:#27ae60,color:#fff
```

### 1.2 Configuração Base

| Configuração     | Valor                                            |
| ---------------- | ------------------------------------------------ |
| **Base URL**     | `process.env.NEXT_PUBLIC_API_URL`                |
| **Produção**     | `https://dbomfim-1003252716435.us-west1.run.app` |
| **Content-Type** | `application/json`                               |
| **Timeout**      | Padrão Axios (não configurado)                   |

---

## 2. Cliente HTTP (Axios)

### 2.1 Configuração Principal

**Arquivo:** `src/app/utils/api.ts`

```typescript
import axios from 'axios';

// Instância configurada do Axios
export const Api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Interceptor para adicionar token (se existir)
Api.interceptors.request.use((config) => {
    if (typeof window !== 'undefined') {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
    }
    return config;
});
```

### 2.2 Funções Exportadas

```typescript
/**
 * Salva anotações de um exercício
 * @param trainingId - ID do treino
 * @param exerciseId - ID do exercício
 * @param notes - Texto das anotações
 * @returns Resultado da operação
 */
export async function saveExerciseNotes(
    trainingId: string,
    exerciseId: string,
    notes: string,
): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
        const response = await Api.put(
            `/user/training/${trainingId}/exercise/${exerciseId}/notes`,
            { notes },
        );
        return { success: true, message: 'Notas salvas com sucesso' };
    } catch (error) {
        return {
            success: false,
            error:
                error instanceof Error ? error.message : 'Erro ao salvar notas',
        };
    }
}
```

### 2.3 Uso nos Componentes

```typescript
// Importação
import { Api } from '@/app/utils/api';

// GET Request
const { data } = await Api.get('/me');

// POST Request
const { data } = await Api.post('/login', { email, password });

// PUT Request
await Api.put('/user/training/123/exercise/456/notes', { notes });

// DELETE Request
await Api.delete('/user/subscribe');
```

---

## 3. Endpoints Completos

### 3.1 Mapa de Endpoints

```mermaid
graph TD
    subgraph AUTH["🔐 Autenticação"]
        POST_REGISTER[POST /register]
        POST_LOGIN[POST /login]
    end

    subgraph USER["👤 Usuário"]
        GET_ME[GET /me]
        GET_QUESTIONS[GET /questions]
        POST_ANAMNESIS[POST /user/anamnesis]
    end

    subgraph SUBSCRIPTION["💳 Assinatura"]
        POST_SUBSCRIBE[POST /user/subscribe]
        DELETE_SUBSCRIBE[DELETE /user/subscribe]
    end

    subgraph TRAINING["🏋️ Treino"]
        PUT_NOTES[PUT /user/training/.../notes]
    end

    subgraph STATIC["📁 Arquivos"]
        GET_GIFS[GET /static/gifs/*]
    end

    style AUTH fill:#e74c3c,stroke:#c0392b,color:#fff
    style USER fill:#3498db,stroke:#2980b9,color:#fff
    style SUBSCRIPTION fill:#f39c12,stroke:#d68910,color:#fff
    style TRAINING fill:#9b59b6,stroke:#8e44ad,color:#fff
    style STATIC fill:#2ecc71,stroke:#27ae60,color:#fff
```

### 3.2 Tabela de Endpoints

| Método   | Endpoint                                    | Auth | Descrição                    |
| -------- | ------------------------------------------- | ---- | ---------------------------- |
| `POST`   | `/register`                                 | ❌   | Registrar novo usuário       |
| `POST`   | `/login`                                    | ❌   | Autenticar usuário           |
| `GET`    | `/me`                                       | ✅   | Obter dados do usuário atual |
| `GET`    | `/questions`                                | ❌   | Listar perguntas de anamnese |
| `POST`   | `/user/anamnesis`                           | ✅   | Enviar respostas da anamnese |
| `POST`   | `/user/subscribe`                           | ✅   | Criar assinatura             |
| `DELETE` | `/user/subscribe`                           | ✅   | Cancelar assinatura          |
| `PUT`    | `/user/training/{tid}/exercise/{eid}/notes` | ✅   | Salvar notas do exercício    |
| `GET`    | `/static/gifs/{filename}`                   | ❌   | Obter GIF de exercício       |
| `GET`    | `/health`                                   | ❌   | Health check                 |

---

## 4. Autenticação

### 4.1 Fluxo de Autenticação

```mermaid
sequenceDiagram
    participant C as Cliente
    participant LS as localStorage
    participant API as Backend API

    Note over C,API: Login
    C->>API: POST /login {email, password}
    API-->>C: {user, token}
    C->>LS: Salva token
    C->>LS: Salva user

    Note over C,API: Requisições Autenticadas
    C->>LS: Lê token
    LS-->>C: "jwt_token_here"
    C->>API: GET /me (Authorization: Bearer token)
    API-->>C: {user data}

    Note over C,API: Logout
    C->>LS: Remove token
    C->>LS: Remove user
```

### 4.2 Formato do Header

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 4.3 ⚠️ Peculiaridade Importante

O backend deve aceitar **ambos os formatos** de Authorization header:

```typescript
// Padrão (maioria dos endpoints)
Authorization: Bearer <token>

// Legado (fluxo de pagamento)
Authorization: <token>
```

### 4.4 Armazenamento de Token

```typescript
// Salvar após login
localStorage.setItem('token', data.token);
localStorage.setItem('user', JSON.stringify(data.user));

// Recuperar para requisições
const token = localStorage.getItem('token');

// Limpar no logout
localStorage.removeItem('token');
localStorage.removeItem('user');
```

---

## 5. Formatos de Request/Response

### 5.1 POST /register

**Request:**

```typescript
interface RegisterRequest {
    name: string;
    email: string;
    password: string;
    cpf: string; // 11 dígitos, sem formatação
    phone: string; // 10 dígitos
    mobile_phone: string; // 11 dígitos
}
```

**Exemplo:**

```json
{
    "name": "João Silva",
    "email": "joao@email.com",
    "password": "senha123",
    "cpf": "12345678900",
    "phone": "1133334444",
    "mobile_phone": "11999998888"
}
```

**Response Success (200):**

```typescript
interface RegisterResponse {
    user: User;
    token: string;
}
```

```json
{
    "user": {
        "id": "uuid-here",
        "name": "João Silva",
        "email": "joao@email.com",
        "cpf": "12345678900",
        "phone": "1133334444",
        "mobile_phone": "11999998888",
        "active": false,
        "created_at": "2024-01-15T10:30:00Z",
        "updated_at": "2024-01-15T10:30:00Z",
        "trainings_progress": []
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response Error (409):**

```json
{
    "error": "Email já cadastrado"
}
```

---

### 5.2 POST /login

**Request:**

```typescript
interface LoginRequest {
    email: string;
    password: string;
}
```

**Exemplo:**

```json
{
    "email": "joao@email.com",
    "password": "senha123"
}
```

**Response Success (200):**

```json
{
  "user": {
    "id": "uuid-here",
    "name": "João Silva",
    "email": "joao@email.com",
    "active": true,
    "trainings_progress": [
      {
        "id": "tp-uuid",
        "training_id": "t-uuid",
        "reference": "Protocolo A",
        "exercise_logs": [...]
      }
    ]
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response Error (401):**

```json
{
    "error": "Credenciais inválidas"
}
```

---

### 5.3 GET /me

**Request Headers:**

```http
Authorization: Bearer <token>
```

**Response Success (200):**

```typescript
interface MeResponse {
    id: string;
    name: string;
    email: string;
    cpf: string;
    phone: string;
    mobile_phone: string;
    active: boolean;
    created_at: string;
    updated_at: string;
    trainings_progress: TrainingProgress[];
    exercicios_dor_selecionados?: ExerciciosDor[];
}
```

**Response Error (401):**

```json
{
    "error": "Token inválido ou expirado"
}
```

---

### 5.4 GET /questions

**Response Success (200):**

```typescript
interface QuestionsResponse {
    questions: Array<{
        id: string;
        text: string;
        options: Array<{
            question_id: string;
            answer_id: string;
            text: string;
        }>;
    }>;
}
```

**Exemplo:**

```json
{
    "questions": [
        {
            "id": "q1",
            "text": "Qual seu objetivo principal?",
            "options": [
                {
                    "question_id": "q1",
                    "answer_id": "a1",
                    "text": "Perder peso"
                },
                {
                    "question_id": "q1",
                    "answer_id": "a2",
                    "text": "Ganhar massa"
                },
                {
                    "question_id": "q1",
                    "answer_id": "a3",
                    "text": "Manter forma"
                }
            ]
        },
        {
            "id": "q2",
            "text": "Você sente dor em alguma região?",
            "options": [
                { "question_id": "q2", "answer_id": "b1", "text": "Não" },
                { "question_id": "q2", "answer_id": "b2", "text": "Joelho" },
                { "question_id": "q2", "answer_id": "b3", "text": "Lombar" }
            ]
        }
    ]
}
```

---

### 5.5 POST /user/anamnesis

**Request:**

```typescript
interface AnamnesisRequest {
    answers: Array<{
        question_id: string;
        answer_id: string;
    }>;
}
```

**Exemplo:**

```json
{
    "answers": [
        { "question_id": "q1", "answer_id": "a2" },
        { "question_id": "q2", "answer_id": "b2" }
    ]
}
```

**Response Success (200):**

```json
{
  "message": "Anamnese salva com sucesso",
  "user": { ... }  // Usuário atualizado (opcional)
}
```

---

### 5.6 POST /user/subscribe

**Request:**

```typescript
interface SubscribeRequest {
    user_id: string;
    plan_value: number;
    plan_cycle: 'BIMONTHLY' | 'SEMIANNUALLY' | 'YEARLY';

    // Dados do cartão
    card_holder_name: string;
    card_number: string; // Sem espaços
    card_expiry_month: string; // "01" a "12"
    card_expiry_year: string; // 2 dígitos: "26"
    card_ccv: string;

    // Dados do titular
    holder_name: string;
    holder_email: string;
    holder_cpf: string; // Apenas dígitos
    holder_postal_code: string; // 8 dígitos
    holder_address_num: string;
    holder_phone: string; // Apenas dígitos

    // Opcional
    indication_receiver?: string;
}
```

**Exemplo:**

```json
{
    "user_id": "user-uuid",
    "plan_value": 79.9,
    "plan_cycle": "BIMONTHLY",
    "card_holder_name": "JOAO SILVA",
    "card_number": "4111111111111111",
    "card_expiry_month": "12",
    "card_expiry_year": "26",
    "card_ccv": "123",
    "holder_name": "João Silva",
    "holder_email": "joao@email.com",
    "holder_cpf": "12345678900",
    "holder_postal_code": "01310100",
    "holder_address_num": "100",
    "holder_phone": "11999998888",
    "indication_receiver": ""
}
```

**Response Success (200):**

```json
{
    "message": "Assinatura criada com sucesso",
    "subscription_id": "sub-uuid"
}
```

**Response Error (400):**

```json
{
    "error": "Cartão inválido ou dados incompletos"
}
```

---

### 5.7 DELETE /user/subscribe

**Request Headers:**

```http
Authorization: Bearer <token>
```

**Response Success (200):**

```json
{
    "message": "Assinatura cancelada com sucesso"
}
```

---

### 5.8 PUT /user/training/{tid}/exercise/{eid}/notes

**Request:**

```json
{
    "notes": "Aumentar carga na próxima semana. Fazer aquecimento extra."
}
```

**Response Success (200):**

```json
{
    "message": "Notas atualizadas com sucesso"
}
```

---

### 5.9 GET /static/gifs/{filename}

**Request:**

```http
GET /static/gifs/Agachamento_Livre_HBL.gif
```

**Response:**

- Content-Type: `image/gif`
- Cache-Control: `public, max-age=31536000`
- Body: Binary GIF data

---

## 6. Tratamento de Erros

### 6.1 Códigos HTTP

| Código | Significado                    | Ação no Frontend        |
| ------ | ------------------------------ | ----------------------- |
| `200`  | Sucesso                        | Processar resposta      |
| `400`  | Erro de validação              | Exibir mensagem de erro |
| `401`  | Não autenticado                | Redirecionar para login |
| `403`  | Sem permissão                  | Exibir acesso negado    |
| `404`  | Não encontrado                 | Exibir mensagem         |
| `409`  | Conflito (ex: email duplicado) | Exibir mensagem         |
| `500`  | Erro interno                   | Exibir erro genérico    |

### 6.2 Formato de Erro Padrão

```typescript
interface ApiError {
    error: string;
    details?: Record<string, string[]>;
}
```

**Exemplos:**

```json
// Erro simples
{ "error": "Credenciais inválidas" }

// Erro com detalhes
{
  "error": "Erro de validação",
  "details": {
    "email": ["Email inválido"],
    "cpf": ["CPF deve ter 11 dígitos"]
  }
}
```

### 6.3 Padrão de Tratamento

```typescript
const handleApiCall = async () => {
    try {
        setLoading(true);
        setError('');

        const { data } = await Api.post('/endpoint', payload);

        // Sucesso
        handleSuccess(data);
    } catch (err) {
        // Extrair mensagem de erro
        if (axios.isAxiosError(err)) {
            const message = err.response?.data?.error || 'Erro na requisição';
            setError(message);

            // Tratamento específico por status
            if (err.response?.status === 401) {
                localStorage.removeItem('token');
                router.push('/');
            }
        } else {
            setError('Erro desconhecido');
        }

        console.error('[ComponentName] Erro:', err);
    } finally {
        setLoading(false);
    }
};
```

---

## 7. Polling e Verificações

### 7.1 Polling de Status de Pagamento

Após submeter pagamento, o frontend faz polling no `/me` para verificar ativação.

```mermaid
sequenceDiagram
    participant F as Frontend
    participant API as Backend

    F->>API: POST /user/subscribe
    API-->>F: 200 OK

    loop Até 10 tentativas
        F->>F: Aguarda 2 segundos
        F->>API: GET /me
        API-->>F: { user }

        alt user.active = true
            F->>F: Redireciona /app
        else user.active = false
            F->>F: Continua polling
        end
    end

    Note over F: Após 10 tentativas, exibe aviso
```

### 7.2 Implementação do Polling

```typescript
const MAX_ATTEMPTS = 10;
const POLL_INTERVAL = 2000; // 2 segundos

const pollForActivation = async () => {
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        try {
            const { data } = await Api.get('/me');

            if (data.active) {
                // Atualiza localStorage
                localStorage.setItem('user', JSON.stringify(data));
                router.push('/app');
                return;
            }

            // Aguarda antes da próxima tentativa
            await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL));
        } catch (error) {
            console.error('Erro no polling:', error);
        }
    }

    // Timeout
    setMessage('Pagamento em processamento. Você será notificado por email.');
};
```

### 7.3 Verificação de Token no Mount

```typescript
useEffect(() => {
    const checkAuth = async () => {
        const token = localStorage.getItem('token');

        if (!token) {
            router.replace('/');
            return;
        }

        try {
            // Valida token com backend
            const { data } = await Api.get('/me');
            setUser(data);

            // Atualiza dados locais
            localStorage.setItem('user', JSON.stringify(data));
        } catch (error) {
            // Token inválido
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            router.replace('/');
        }
    };

    checkAuth();
}, []);
```

---

## 8. Diagramas de Sequência

### 8.1 Fluxo Completo de Login

```mermaid
sequenceDiagram
    actor User as Usuário
    participant UI as LoginTemplate
    participant Api as Api Client
    participant LS as localStorage
    participant BE as Backend

    User->>UI: Preenche email/senha
    User->>UI: Clica "Entrar"

    UI->>UI: setLoading(true)
    UI->>Api: Api.post('/login', {email, password})
    Api->>BE: POST /login

    alt Credenciais válidas
        BE-->>Api: 200 {user, token}
        Api-->>UI: Response data
        UI->>LS: setItem('token', token)
        UI->>LS: setItem('user', JSON.stringify(user))

        alt user.active = true
            UI->>User: router.push('/app')
        else user.active = false
            UI->>User: router.push('/pagamento')
        end

    else Credenciais inválidas
        BE-->>Api: 401 {error}
        Api-->>UI: AxiosError
        UI->>UI: setError(message)
        UI->>User: Exibe erro
    end

    UI->>UI: setLoading(false)
```

### 8.2 Fluxo de Registro + Pagamento

```mermaid
sequenceDiagram
    actor User as Usuário
    participant Cadastro as /cadastro
    participant Pagamento as /pagamento
    participant Api as Api Client
    participant BE as Backend

    User->>Cadastro: Preenche formulário
    Cadastro->>Api: POST /register
    Api->>BE: Cria usuário
    BE-->>Api: {user, token}
    Api-->>Cadastro: Success
    Cadastro->>User: router.push('/pagamento')

    User->>Pagamento: Seleciona plano
    User->>Pagamento: Preenche cartão
    Pagamento->>Api: POST /user/subscribe
    Api->>BE: Cria assinatura
    BE-->>Api: Success

    loop Polling
        Pagamento->>Api: GET /me
        Api->>BE: Verifica status
        BE-->>Api: {active: false/true}

        alt active = true
            Pagamento->>User: router.push('/app')
        end
    end
```

### 8.3 Fluxo de Carregamento de Treino

```mermaid
sequenceDiagram
    participant Page as TrainingPage
    participant LS as localStorage
    participant Api as Api Client
    participant BE as Backend

    Page->>Page: useEffect mount
    Page->>LS: getItem('user')
    LS-->>Page: userData

    Page->>Page: Extrai trainings_progress
    Page->>Page: Filtra por params.id
    Page->>Page: Obtém exercise_logs
    Page->>Page: setExercises(logs)
    Page->>Page: Renderiza lista

    Note over Page: Usuário clica exercício
    Page->>Page: setSelectedExercise(ex)
    Page->>Page: Abre modal

    Note over Page: Usuário salva notas
    Page->>Api: PUT /training/{id}/exercise/{id}/notes
    Api->>BE: Atualiza notas
    BE-->>Api: Success
    Api-->>Page: Response
    Page->>Page: setNotesSaved(true)
```

---

## 9. Boas Práticas

### 9.1 Checklist de Implementação

| Prática | Status                         | Descrição                           |
| ------- | ------------------------------ | ----------------------------------- |
| ✅      | Usar cliente centralizado      | Todas as chamadas via `Api`         |
| ✅      | Try-catch em todas as chamadas | Tratamento de erro obrigatório      |
| ✅      | Loading states                 | Feedback visual durante requisições |
| ✅      | Token no header                | Interceptor automático              |
| ⚠️      | Refresh token                  | Não implementado                    |
| ✅      | Logout em 401                  | Limpa storage e redireciona         |
| ✅      | Logs estruturados              | console.error com contexto          |

### 9.2 Padrão de Request

```typescript
// ✅ CORRETO
const fetchData = async () => {
    try {
        setLoading(true);
        setError('');

        const { data } = await Api.get('/endpoint');
        setData(data);
    } catch (error) {
        const message = axios.isAxiosError(error)
            ? error.response?.data?.error || 'Erro na requisição'
            : 'Erro desconhecido';

        setError(message);
        console.error('[fetchData] Erro:', error);
    } finally {
        setLoading(false);
    }
};

// ❌ INCORRETO
const fetchData = async () => {
    const { data } = await Api.get('/endpoint'); // Sem try-catch
    setData(data);
};
```

### 9.3 Formatação de Dados

```typescript
// Antes de enviar ao backend
const cleanCPF = (cpf: string) => cpf.replace(/\D/g, '');
const cleanPhone = (phone: string) => phone.replace(/\D/g, '');
const cleanCEP = (cep: string) => cep.replace(/\D/g, '');
const formatYear = (year: string) => year.slice(-2); // "2026" → "26"

// Exemplo de payload
const payload = {
    cpf: cleanCPF('123.456.789-00'), // "12345678900"
    phone: cleanPhone('(11) 99999-8888'), // "11999998888"
    card_expiry_year: formatYear('2026'), // "26"
};
```

### 9.4 Cache de GIFs

```typescript
// GIFs devem ter cache agressivo
// Backend deve enviar:
// Cache-Control: public, max-age=31536000

// Frontend pode usar browser cache
// Evitar recarregar GIFs desnecessariamente
<img
  src={gifUrl}
  loading="lazy"  // Lazy loading
  alt={name}
/>
```

---

## Referências Cruzadas

- **Arquitetura geral:** [01-ARCHITECTURE.md](01-ARCHITECTURE.md)
- **Componentes:** [02-COMPONENTS.md](02-COMPONENTS.md)
- **Páginas e rotas:** [03-PAGES-ROUTES.md](03-PAGES-ROUTES.md)
- **Tipos e interfaces:** [05-TYPES-INTERFACES.md](05-TYPES-INTERFACES.md)
- **Hooks e utilitários:** [06-HOOKS-UTILITIES.md](06-HOOKS-UTILITIES.md)
- **Segurança e deploy:** [07-SECURITY-DEPLOY.md](07-SECURITY-DEPLOY.md)

---

> **Próximo:** [05-TYPES-INTERFACES.md](05-TYPES-INTERFACES.md) - Tipos e interfaces TypeScript
