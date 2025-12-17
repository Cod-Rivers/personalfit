# 🔧 Troubleshooting - Sistema de GIFs

## ❌ Problemas Comuns e Soluções

### 1. GIF Não Carrega no Card

#### Sintomas

- Área da GIF aparece em branco
- Ícone de "imagem quebrada"
- Console mostra erro de carregamento

#### Checklist de Diagnóstico

```bash
# 1. Backend está rodando?
curl http://localhost:8888/health
# Deve retornar: {"status": "ok"}

# 2. Lista de GIFs funciona?
curl http://localhost:8888/api/gifs
# Deve retornar JSON com lista de GIFs

# 3. GIF específica existe?
curl -I http://localhost:8888/static/gifs/Agachamento_Livre_HBL.gif
# Deve retornar: HTTP/1.1 200 OK
```

#### Soluções

**A. Variável de ambiente incorreta**

```env
# ❌ Errado
NEXT_PUBLIC_API_URL=http://localhost:8080

# ✅ Correto
NEXT_PUBLIC_API_URL=http://localhost:8888
```

**B. Reiniciar servidor após alterar .env**

```bash
# Pare o servidor (Ctrl+C)
# Reinicie
npm run dev
```

**C. Limpar cache do navegador**

- Chrome/Edge: Ctrl + Shift + Delete
- Firefox: Ctrl + Shift + Del
- Ou use modo anônimo (Ctrl + Shift + N)

### 2. Console Mostra 404 Not Found

#### Mensagem de Erro

```
GET http://localhost:8888/static/gifs/nome.gif 404 (Not Found)
```

#### Possíveis Causas

**A. GIF não existe no backend**

```bash
# Verificar no backend se arquivo existe
ls backend/static/gifs/ | grep "nome.gif"
```

**B. Nome da GIF incorreto no banco de dados**

```javascript
// No console do navegador
console.log('video_url:', exercise.video_url);
// Verificar se o nome está correto
```

**C. Caminho incorreto**

```typescript
// ❌ Errado - video_url com path errado
video_url: '/gifs/nome.gif'; // Falta "static/"

// ✅ Correto
video_url: 'static/gifs/nome.gif';
```

### 3. CORS Error

#### Mensagem de Erro

```
Access to fetch at 'http://localhost:8888/...' from origin 'http://localhost:3000'
has been blocked by CORS policy
```

#### Solução

O backend deve estar configurado com CORS habilitado para `localhost:3000`:

```go
// No backend (main.go)
r.Use(cors.New(cors.Config{
    AllowOrigins:     []string{"http://localhost:3000"},
    AllowMethods:     []string{"GET", "POST", "PUT", "DELETE"},
    AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
    AllowCredentials: true,
}))
```

### 4. Variável de Ambiente Undefined

#### Sintomas

```javascript
console.log(process.env.NEXT_PUBLIC_API_URL);
// undefined
```

#### Soluções

**A. Arquivo .env.local existe?**

```bash
# Verificar se arquivo existe
ls -la .env.local

# Se não existir, criar
echo "NEXT_PUBLIC_API_URL=http://localhost:8888" > .env.local
```

**B. Nome da variável correto?**

```env
# ❌ Errado - sem NEXT_PUBLIC_
API_URL=http://localhost:8888

# ✅ Correto - com NEXT_PUBLIC_
NEXT_PUBLIC_API_URL=http://localhost:8888
```

**C. Servidor reiniciado?**

```bash
# SEMPRE reinicie após alterar .env
# Ctrl+C para parar
npm run dev
```

### 5. GIF Carrega Devagar

#### Problema

GIFs demoram muito para carregar ou travam a página.

#### Soluções

**A. Usar loading lazy**

```tsx
<img
    src={gifUrl}
    loading="lazy" // ✅ Carrega apenas quando visível
    decoding="async" // ✅ Não bloqueia UI
/>
```

**B. Carregar sob demanda**

```tsx
function ExerciseCard({ exercise }) {
    const [showGif, setShowGif] = useState(false);

    return (
        <div>
            <button onClick={() => setShowGif(true)}>Ver Demonstração</button>
            {showGif && <img src={getGifUrl(exercise.video_url)} />}
        </div>
    );
}
```

**C. Pré-carregar GIFs críticas**

```tsx
useEffect(() => {
    // Pré-carregar GIF principal
    const img = new Image();
    img.src = getGifUrl(mainExercise.video_url);
}, []);
```

### 6. ProtectedVideo Não Aparece

#### Sintomas

- Componente não renderiza nada
- Console mostra: `videoId está vazio`

#### Debug

```tsx
// Adicione logs antes do componente
console.log('exercise:', exercise);
console.log('video_url:', exercise.video_url);

<ProtectedVideo videoId={exercise.video_url} />;
```

#### Soluções

**A. video_url está vazio?**

```typescript
// Adicione fallback
const videoUrl = exercise.video_url || 'default.gif';

<ProtectedVideo videoId={videoUrl} />
```

**B. Verificar estrutura do exercício**

```javascript
// No console
console.log(JSON.stringify(exercise, null, 2));
// Verificar se tem propriedade video_url
```

### 7. Backend na Porta Errada

#### Sintomas

- Console mostra: `Failed to fetch`
- Erro de conexão recusada

#### Verificar Porta do Backend

```bash
# Verificar qual porta o backend está usando
netstat -ano | findstr :8888
# Ou
lsof -i :8888  # Linux/Mac
```

#### Solução

```env
# Atualizar .env.local com porta correta
NEXT_PUBLIC_API_URL=http://localhost:8888  # Porta correta do backend
```

### 8. Erro 500 Internal Server Error

#### Sintomas

```
GET http://localhost:8888/static/gifs/nome.gif 500 (Internal Server Error)
```

#### Verificar Logs do Backend

```bash
# Ver logs do backend para detalhes do erro
# Procurar por erros de leitura de arquivo ou permissões
```

#### Possíveis Causas

- Arquivo GIF corrompido
- Sem permissão de leitura
- Path do arquivo incorreto no backend

### 9. TypeScript Errors

#### Erro: Property 'video_url' does not exist

```typescript
// Verificar interface
interface ExerciseLog {
    id: string;
    name: string;
    video_url: string; // ✅ Deve estar definido
    // ...
}
```

#### Erro: Cannot find module '@/libs/gifUtils'

```typescript
// Verificar tsconfig.json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]  // ✅ Alias configurado
    }
  }
}
```

## 🔍 Ferramentas de Debug

### 1. Console do Navegador

Abra F12 e execute:

```javascript
// Testar URL da API
fetch(process.env.NEXT_PUBLIC_API_URL + '/health')
    .then((r) => r.json())
    .then((d) => console.log('✅ Backend OK:', d))
    .catch((e) => console.error('❌ Backend Erro:', e));

// Listar GIFs
fetch(process.env.NEXT_PUBLIC_API_URL + '/api/gifs')
    .then((r) => r.json())
    .then((d) => console.log('GIFs:', d.total))
    .catch((e) => console.error('Erro:', e));

// Testar GIF específica
const img = new Image();
img.onload = () => console.log('✅ GIF OK');
img.onerror = () => console.error('❌ GIF Erro');
img.src =
    process.env.NEXT_PUBLIC_API_URL + '/static/gifs/Agachamento_Livre_HBL.gif';
```

### 2. Network Tab

Abra F12 > Network:

1. ✅ Filtrar por "gif" ou "static"
2. ✅ Ver status codes (200 = OK, 404 = Not Found)
3. ✅ Ver tempo de carregamento
4. ✅ Ver tamanho dos arquivos

### 3. React DevTools

Instale extensão React DevTools:

1. ✅ Inspecionar componente `ProtectedVideo`
2. ✅ Ver props: `videoId`, `className`, `title`
3. ✅ Ver state: `loading`, `error`, `videoSrc`

## 📋 Checklist Completo

Quando GIF não carrega, verifique na ordem:

- [ ] Backend rodando na porta 8888?
- [ ] `curl http://localhost:8888/health` retorna OK?
- [ ] `curl http://localhost:8888/api/gifs` lista GIFs?
- [ ] GIF específica acessível no navegador?
- [ ] `.env.local` tem `NEXT_PUBLIC_API_URL=http://localhost:8888`?
- [ ] Frontend foi reiniciado após alterar `.env.local`?
- [ ] Console do navegador mostra logs do `[ProtectedVideo]`?
- [ ] `exercise.video_url` tem valor correto?
- [ ] Network tab mostra requisição para GIF?
- [ ] Status code da requisição é 200?
- [ ] Cache do navegador foi limpo?

## 🆘 Ainda Com Problema?

### Coletar Informações

Execute e compartilhe os resultados:

```bash
# 1. Versão do Node
node --version

# 2. Backend health
curl http://localhost:8888/health

# 3. Lista de GIFs
curl http://localhost:8888/api/gifs | head -20

# 4. Testar GIF específica
curl -I http://localhost:8888/static/gifs/Agachamento_Livre_HBL.gif

# 5. Verificar .env
cat .env.local
```

### Console do Navegador

Abra F12 > Console e copie:

```javascript
// Executar e copiar resultado
console.log({
    apiUrl: process.env.NEXT_PUBLIC_API_URL,
    exercise: exercise,
    videoUrl: exercise.video_url,
    constructedUrl: getGifUrl(exercise.video_url),
});
```

### Logs Detalhados

No componente que usa `ProtectedVideo`, adicione:

```tsx
console.log('=== DEBUG GIF ===');
console.log('Exercise:', JSON.stringify(exercise, null, 2));
console.log('video_url:', exercise.video_url);
console.log('API Base:', process.env.NEXT_PUBLIC_API_URL);
console.log('Full URL:', getGifUrl(exercise.video_url));
```

Com essas informações, será mais fácil identificar o problema! 🎯
