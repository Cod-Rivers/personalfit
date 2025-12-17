# 🎥 Sistema de GIFs dos Exercícios - Frontend

## 📋 Visão Geral

O sistema foi atualizado para carregar as GIFs dos exercícios diretamente do backend, sem necessidade de proxy ou autenticação adicional.

## 🔧 Configuração

### 1. Variável de Ambiente

Crie o arquivo `.env.local` na raiz do projeto (já criado):

```env
NEXT_PUBLIC_API_URL=http://localhost:8888
```

### 2. Como Funciona

#### Backend fornece o caminho da GIF:

```json
{
  "id": "123",
  "name": "Agachamento Livre",
  "video_url": "static/gifs/Agachamento_Livre_HBL.gif",
  "series": [10, 12, 15],
  ...
}
```

#### Frontend constrói a URL completa:

```typescript
// O componente ProtectedVideo agora faz automaticamente:
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8888';

// Se video_url = "static/gifs/nome.gif"
const gifUrl = `${API_BASE}/static/gifs/nome.gif`;
// Resultado: http://localhost:8888/static/gifs/Agachamento_Livre_HBL.gif
```

## 🎯 Componentes Atualizados

### ProtectedVideo Component

O componente `ProtectedVideo` foi atualizado para:

✅ **Não usar mais proxy** - Carrega GIFs diretamente do backend
✅ **Não requer autenticação** - Arquivos estáticos são públicos
✅ **Suporta múltiplos formatos** de path:

- `"static/gifs/nome.gif"` → `http://localhost:8080/static/gifs/nome.gif`
- `"gifs/nome.gif"` → `http://localhost:8080/static/gifs/nome.gif`
- `"nome.gif"` → `http://localhost:8080/static/gifs/nome.gif`

✅ **Tratamento de erros melhorado** com logs detalhados
✅ **Detecta automaticamente** GIFs vs vídeos pela extensão

### Exemplo de Uso

```tsx
// No ExerciseDetailCard
<ProtectedVideo
    videoId={exercise.video_url} // Ex: "static/gifs/Agachamento_Livre_HBL.gif"
    title={`Vídeo demonstrativo - ${exercise.name}`}
    className={styles.verticalVideo}
/>
```

## 🐛 Debug

### Logs no Console

O componente ProtectedVideo emite logs detalhados:

```javascript
[ProtectedVideo] Iniciando carregamento para videoId: static/gifs/nome.gif
[ProtectedVideo] URL da GIF construída: http://localhost:8888/static/gifs/nome.gif
[ProtectedVideo] GIF/Vídeo carregado com sucesso
```

### Em caso de erro:

```javascript
[ProtectedVideo] Erro ao carregar GIF: http://localhost:8888/static/gifs/nome.gif
```

## 🧪 Como Testar

### 1. Verificar GIFs disponíveis no Backend

```bash
curl http://localhost:8888/api/gifs
```

Retorna JSON com todas as 293 GIFs disponíveis.

### 2. Testar GIF específica no navegador

Abra no navegador:

```
http://localhost:8888/static/gifs/Agachamento_Livre_HBL.gif
```

Se a GIF aparecer, o backend está funcionando! ✅

### 3. Testar no Front-end

1. Inicie o backend (porta 8888)
2. Inicie o frontend:
    ```bash
    npm run dev
    ```
3. Acesse um card de exercício
4. Abra o Console do navegador (F12)
5. Verifique os logs do `[ProtectedVideo]`

## ⚠️ Troubleshooting

### GIF não carrega

**Problema**: GIF não aparece no card

**Checklist**:

1. ✅ Backend está rodando na porta 8888?
2. ✅ A GIF existe em `backend/static/gifs/`?
3. ✅ O `video_url` no exercício está correto?
4. ✅ Variável `NEXT_PUBLIC_API_URL` está configurada?
5. ✅ Console mostra algum erro?

**Teste direto**:

```bash
# Verificar se GIF existe no backend
curl http://localhost:8888/static/gifs/NomeDaGif.gif
```

### Erro de CORS

Se aparecer erro de CORS no console:

**Solução**: O backend já está configurado para CORS. Verifique se está usando a URL correta (`http://localhost:8888`)

### Variável de ambiente não funciona

**Problema**: `process.env.NEXT_PUBLIC_API_URL` é undefined

**Solução**:

1. Verifique se o arquivo `.env.local` existe
2. Reinicie o servidor de desenvolvimento
3. Variáveis Next.js devem começar com `NEXT_PUBLIC_`

## 📦 Arquivos Modificados

- ✅ `src/components/molecules/ProtectedVideo/index.tsx` - Carregamento direto das GIFs
- ✅ `.env.local` - Variável de ambiente da API
- ✅ `.env.example` - Exemplo de configuração
- ✅ `GIFS_FRONTEND.md` - Esta documentação

## 🔄 Diferença: Antes vs Depois

### ❌ Antes (Usando Proxy)

```typescript
// Frontend fazia requisição para proxy interno
const response = await fetch(`/api/video/${videoId}`, {
    headers: { Authorization: `Bearer ${token}` },
});

// Proxy Next.js redirecionava para backend
// backend/api/video/[videoId]/route.ts chamava backend
// Complexo, lento, dependia de autenticação
```

### ✅ Agora (Direto do Backend)

```typescript
// Frontend carrega direto da URL pública
const gifUrl = `${API_BASE}/${exercise.video_url}`;
// <img src={gifUrl} />

// Simples, rápido, sem autenticação necessária
```

## 🚀 Benefícios

- 🎯 **Mais rápido** - Sem proxy intermediário
- 🔓 **Sem autenticação** - GIFs são públicas
- 📝 **Logs detalhados** - Debug facilitado
- 🛠️ **Melhor tratamento de erros** - Mensagens claras
- 🔍 **Múltiplos formatos de path** - Flexível

## 📚 Recursos Adicionais

- Backend: Veja `backend/GIFS.md` para documentação do servidor
- API: `GET /api/gifs` lista todas as GIFs disponíveis
- Health Check: `GET /health` verifica status da API
- Arquivos estáticos: `GET /static/gifs/{nome}.gif` acessa GIFs diretamente
