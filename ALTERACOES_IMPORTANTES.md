# Alterações Importantes do Projeto

Este arquivo documenta alterações significativas realizadas no projeto para consulta futura.

---

## 📄 Criação deste Arquivo de Documentação (20/12/2025)

**Propósito:** Centralizar documentação de alterações importantes para consulta futura.

**Arquivo Criado:** `ALTERACOES_IMPORTANTES.md` (raiz do projeto)

**Objetivo:**

- Registrar modificações relevantes no código
- Facilitar consulta de decisões técnicas
- Manter histórico de melhorias e correções
- Servir como referência para próximos chats

**Como Usar:**

- Adicione novas seções conforme necessário
- Documente o problema, solução e resultado
- Inclua código antes/depois quando relevante
- Mantenha organizado por data

---

## 🔄 Ajuste do Endpoint de Cancelamento de Assinatura (20/12/2025)

**Problema:** O frontend estava utilizando o endpoint `/user/cancel-subscribe` para cancelar assinatura, resultando em erro 400.

**Solução:**

- Alterado o endpoint para `/cancel-subscribe` conforme contrato frontend-backend.
- O frontend agora chama o backend, que realiza o cancelamento via Asaas utilizando o ID da assinatura vinculado ao usuário autenticado.
- O método HTTP permanece `POST`.

**Arquivo Modificado:**

- `src/app/perfil/page.tsx`

**Observação:** O backend é responsável por buscar o ID da assinatura do usuário e realizar a requisição DELETE na API do Asaas.

**Problema:** Footer ficava por cima do card modal em dispositivos móveis.

**Arquivos Modificados:**

- `src/components/organism/Footer/Footer.module.css`
- `src/components/features/ExerciseDetailCard.module.css`

**Causa:** Conflito de `z-index` - tanto o footer quanto o modal tinham `z-index: 1000`.

**Solução:**

```css
/* Footer */
.footer {
    z-index: 100; /* ✅ Reduzido de 1000 para 100 */
}

/* Modal */
.modalOverlay {
    z-index: 1050; /* ✅ Aumentado de 1000 para 1050 */
}
```

**Hierarquia de Z-Index Estabelecida:**

- Elementos normais: `z-index: 1-99`
- Footer fixo: `z-index: 100`
- Modais/Overlays: `z-index: 1000+`

**Resultado:** Modais agora aparecem corretamente acima do footer em todos os dispositivos.

---

## �📱 Responsividade - Tela de Login (20/12/2025)

**Problema:** Área de login não ficava boa em dispositivos móveis.

**Arquivo Modificado:** `src/components/templates/Login/styles.css`

**Alterações Realizadas:**

### Antes:

```css
.login_main_container {
    width: 100vw;
    height: 100vh;
    display: flex;
    justify-content: center;
    align-items: center;
}

.login_box {
    min-width: 450px; /* ❌ Problema: fixava largura mínima */
    padding: 20px;
    /* ... */
}
```

### Depois:

```css
.login_main_container {
    width: 100vw;
    height: 100vh;
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 15px; /* ✅ Adicionado padding */
}

.login_box {
    width: 100%; /* ✅ Largura fluida */
    max-width: 450px; /* ✅ Limite máximo */
    padding: 30px 20px; /* ✅ Padding ajustado */
    /* ... */
}

/* ✅ Media Queries adicionadas */
@media (max-width: 768px) {
    .login_box {
        padding: 20px 15px;
        border-radius: 8px;
    }
    .login_box h1 {
        font-size: 1.5rem !important;
    }
    .btn-gold {
        font-size: 1.2em !important;
    }
}

@media (max-width: 480px) {
    .login_box {
        padding: 15px 10px;
    }
    .login_box h1 {
        font-size: 1.3rem !important;
    }
}
```

**Resultado:**

- Layout responsivo em todos os dispositivos
- Box se adapta ao tamanho da tela
- Fontes e espaçamentos otimizados para mobile

---

## [Adicione suas próximas alterações abaixo]
