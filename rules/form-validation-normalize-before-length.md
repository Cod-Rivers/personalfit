---
title: Normalizar pra dígitos antes de validar comprimento (CPF, telefone)
impact: HIGH
impactDescription: validar a string mascarada deixava texto com letras passar como telefone válido
tags: validation, forms, zod
---

## Normalizar pra dígitos antes de validar comprimento (CPF, telefone)

Validação de formulário usa **Zod** (`src/libs/validation/*Schemas.ts`) com
**react-hook-form**. Máscara visual (`src/libs/formatters.ts`) é responsabilidade
separada da validação — a validação real sempre normaliza pra dígitos primeiro
(`replace(/\D/g, '')`) antes de checar comprimento ou regra de negócio.

Bug real documentado no comentário do próprio schema: telefone era validado pelo
comprimento da **string mascarada**, então texto com 10+ caracteres — incluindo
letras — passava como válido.

**Incorrect:**

```ts
const phoneSchema = z.string().min(10) // valida o comprimento da string mascarada/digitada
```

**Correct:**

```ts
// src/libs/validation/authSchemas.ts
const phoneSchema = z.string().refine((val) => {
  const digits = val.replace(/\D/g, '')
  return digits.length === 10 || digits.length === 11 // DDD + 8 ou 9 dígitos
})
```

CPF segue o mesmo princípio, mas com checksum real espelhando o algoritmo do
backend Go (`cpf-validator.go`) — existe justamente pra pegar CPF com 11 dígitos
mas checksum inválido no frontend, em vez de deixar isso estourar como erro 500
genérico só no backend:

```ts
export function isValidCpfChecksum(cpf: string): boolean { ... }
```

Política de senha forte é aplicada só no **cadastro**, não no login — aplicar
retroativamente no login quebraria contas antigas criadas antes da regra existir.
Ao adicionar validação nova em campo existente, considere se ela precisa ser
"forward-only" (só em criação) pelo mesmo motivo.
