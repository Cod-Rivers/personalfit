# Contrato Frontend-Backend

Este documento descreve como o cliente (Next.js 15+) consome a API, destacando formatos de dados, peculiaridades de autenticação e fluxos que exigem otimização no Backend.

## Contexto do Cliente (Frontend)

### Tech Stack Consumidora

- **Framework:** Next.js 15+ (App Router)
- **HTTP Client:** Axios
- **Infra:** Google Cloud Run (Frontend e Backend no mesmo ecossistema)

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

### Requisitos de Rede e CORS

**Origens Permitidas:**
O Backend deve habilitar CORS (`Access-Control-Allow-Origin`) para:

1. **Local:** `http://localhost:3000` e `http://localhost:8080`
2. **Produção:** `https://*.us-west1.run.app` (Wildcard para Cloud Run)

**Headers Obrigatórios:**

- `Access-Control-Allow-Credentials: true`
- `Access-Control-Allow-Headers: Origin, Content-Type, Authorization`

### Peculiaridade na Autenticação (Atenção Crítica) ⚠️

O cliente atual possui inconsistência no envio do Header de autorização. O Backend **deve ser permissivo** e tratar ambos os formatos abaixo para evitar erros 401:

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

## Referências

- [GIFS_FRONTEND.md](GIFS_FRONTEND.md) - Sistema de GIFs
- [IMPLEMENTACAO_ANOTACOES.md](IMPLEMENTACAO_ANOTACOES.md) - Feature de anotações
- [DEPLOY_GUIDE.md](DEPLOY_GUIDE.md) - Deploy no Cloud Run
- [.github/copilot-instructions.md](.github/copilot-instructions.md) - Contexto completo de integração
