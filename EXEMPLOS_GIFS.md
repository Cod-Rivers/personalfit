# 🎯 Exemplos Práticos - Sistema de GIFs

## 🔧 Configuração Básica

### Variável de Ambiente

```env
# .env.local
NEXT_PUBLIC_API_URL=http://localhost:8888
```

## 📖 Usando a Biblioteca gifUtils

### Importar as Funções

```typescript
import {
    getGifUrl,
    isGifFile,
    getApiBaseUrl,
    listAvailableGifs,
    validateGifExists,
} from '@/libs/gifUtils';
```

### 1. Construir URL da GIF

```typescript
// Cenário 1: Caminho completo do backend
const exercise = {
    video_url: 'static/gifs/Agachamento_Livre_HBL.gif',
};

const gifUrl = getGifUrl(exercise.video_url);
// Resultado: "http://localhost:8888/static/gifs/Agachamento_Livre_HBL.gif"

// Cenário 2: Apenas nome do arquivo
const gifUrl2 = getGifUrl('Supino_Reto_HBL.gif');
// Resultado: "http://localhost:8888/static/gifs/Supino_Reto_HBL.gif"

// Cenário 3: Caminho parcial
const gifUrl3 = getGifUrl('gifs/Levantamento_Terra.gif');
// Resultado: "http://localhost:8888/static/gifs/Levantamento_Terra.gif"
```

### 2. Verificar se é GIF

```typescript
const videoUrl = 'static/gifs/exercicio.gif';
if (isGifFile(videoUrl)) {
    console.log('É uma GIF!');
    // Renderizar como <img>
} else {
    console.log('É um vídeo!');
    // Renderizar como <video>
}
```

### 3. Listar Todas as GIFs Disponíveis

```typescript
async function loadAvailableGifs() {
    const gifs = await listAvailableGifs();
    console.log(`${gifs.length} GIFs disponíveis:`, gifs);
    // ["Agachamento_Livre_HBL.gif", "Supino_Reto_HBL.gif", ...]
}
```

### 4. Validar se GIF Existe

```typescript
async function checkGif(gifPath: string) {
    const exists = await validateGifExists(gifPath);
    if (exists) {
        console.log('✅ GIF encontrada!');
    } else {
        console.log('❌ GIF não encontrada!');
    }
}

await checkGif('static/gifs/Agachamento_Livre_HBL.gif');
```

## 🎨 Componentes React

### Exemplo 1: Card de Exercício Simples

```tsx
import { getGifUrl } from '@/libs/gifUtils';

interface Exercise {
    id: string;
    name: string;
    video_url: string;
}

function ExerciseCard({ exercise }: { exercise: Exercise }) {
    const [showGif, setShowGif] = useState(false);
    const gifUrl = getGifUrl(exercise.video_url);

    return (
        <div className="exercise-card">
            <h3>{exercise.name}</h3>
            <button onClick={() => setShowGif(!showGif)}>
                {showGif ? 'Ocultar' : 'Ver'} Demonstração
            </button>

            {showGif && (
                <img
                    src={gifUrl}
                    alt={exercise.name}
                    onError={(e) => {
                        console.error('Erro ao carregar:', gifUrl);
                        e.currentTarget.src = '/placeholder.gif';
                    }}
                />
            )}
        </div>
    );
}
```

### Exemplo 2: Lista de GIFs Disponíveis

```tsx
import { listAvailableGifs, getGifUrl } from '@/libs/gifUtils';

function GifBrowser() {
    const [gifs, setGifs] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadGifs() {
            const availableGifs = await listAvailableGifs();
            setGifs(availableGifs);
            setLoading(false);
        }
        loadGifs();
    }, []);

    if (loading) return <div>Carregando GIFs...</div>;

    return (
        <div className="gif-grid">
            {gifs.map((gif) => (
                <div key={gif} className="gif-item">
                    <img src={getGifUrl(gif)} alt={gif} loading="lazy" />
                    <p>{gif}</p>
                </div>
            ))}
        </div>
    );
}
```

### Exemplo 3: Validação Antes de Carregar

```tsx
import { validateGifExists, getGifUrl } from '@/libs/gifUtils';

function SafeExerciseGif({ gifPath }: { gifPath: string }) {
    const [isValid, setIsValid] = useState<boolean | null>(null);

    useEffect(() => {
        async function checkGif() {
            const valid = await validateGifExists(gifPath);
            setIsValid(valid);
        }
        checkGif();
    }, [gifPath]);

    if (isValid === null) {
        return <div>Verificando GIF...</div>;
    }

    if (!isValid) {
        return <div>❌ GIF não disponível</div>;
    }

    return (
        <img src={getGifUrl(gifPath)} alt="Exercise" className="exercise-gif" />
    );
}
```

### Exemplo 4: Usando ProtectedVideo

```tsx
import ProtectedVideo from '@/components/molecules/ProtectedVideo';

function ExerciseDetail({ exercise }) {
    return (
        <div className="exercise-detail">
            <h2>{exercise.name}</h2>

            {/* O componente já trata tudo automaticamente */}
            <ProtectedVideo
                videoId={exercise.video_url}
                title={`Demonstração - ${exercise.name}`}
                className="exercise-video"
            />

            <p>Séries: {exercise.series.join(' / ')}</p>
            <p>Peso: {exercise.weight}kg</p>
        </div>
    );
}
```

## 🐛 Debug e Tratamento de Erros

### Console Logs Úteis

```typescript
// Adicione logs para debug
const gifUrl = getGifUrl(exercise.video_url);
console.log('GIF URL construída:', gifUrl);
console.log('É arquivo GIF?', isGifFile(exercise.video_url));
console.log('API Base:', getApiBaseUrl());
```

### Tratamento de Erro Completo

```tsx
function RobustExerciseGif({ exercise }) {
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const gifUrl = getGifUrl(exercise.video_url);

    return (
        <div>
            {loading && <div className="spinner">Carregando...</div>}

            {error && (
                <div className="error">
                    <p>❌ {error}</p>
                    <small>{exercise.video_url}</small>
                    <button onClick={() => window.location.reload()}>
                        Tentar Novamente
                    </button>
                </div>
            )}

            <img
                src={gifUrl}
                alt={exercise.name}
                style={{ display: loading || error ? 'none' : 'block' }}
                onLoad={() => {
                    setLoading(false);
                    setError(null);
                    console.log('✅ GIF carregada:', gifUrl);
                }}
                onError={(e) => {
                    setLoading(false);
                    setError('Falha ao carregar GIF');
                    console.error('❌ Erro ao carregar:', gifUrl);
                    e.currentTarget.src = '/placeholder.gif';
                }}
            />
        </div>
    );
}
```

## 🧪 Testando no Console do Navegador

Abra o console (F12) e teste diretamente:

```javascript
// 1. Verificar configuração
console.log('API Base:', process.env.NEXT_PUBLIC_API_URL);

// 2. Testar construção de URL
const testUrl = 'static/gifs/Agachamento_Livre_HBL.gif';
console.log('URL:', `${process.env.NEXT_PUBLIC_API_URL}/${testUrl}`);

// 3. Testar acesso à GIF
fetch('http://localhost:8888/api/gifs')
    .then((r) => r.json())
    .then((data) => console.log('GIFs disponíveis:', data));

// 4. Testar se GIF específica carrega
const img = new Image();
img.onload = () => console.log('✅ GIF carregou!');
img.onerror = () => console.log('❌ GIF não carregou!');
img.src = 'http://localhost:8888/static/gifs/Agachamento_Livre_HBL.gif';
```

## 📋 Checklist de Implementação

Ao adicionar GIFs em um novo componente:

- [ ] Importar `getGifUrl` de `@/libs/gifUtils`
- [ ] Usar `getGifUrl(exercise.video_url)` para construir URL
- [ ] Adicionar `onError` handler na tag `<img>`
- [ ] Adicionar `loading="lazy"` para performance
- [ ] Adicionar `alt` text descritivo
- [ ] Testar com GIF que existe
- [ ] Testar com GIF que não existe
- [ ] Verificar logs no console
- [ ] Testar em diferentes resoluções

## 🎯 Boas Práticas

### ✅ Fazer

```tsx
// Use a função utilitária
const gifUrl = getGifUrl(exercise.video_url);

// Adicione tratamento de erro
<img src={gifUrl} onError={handleError} />

// Use loading lazy
<img src={gifUrl} loading="lazy" />

// Adicione alt text
<img src={gifUrl} alt={exercise.name} />
```

### ❌ Evitar

```tsx
// NÃO construa URL manualmente
const gifUrl = `http://localhost:8888/static/gifs/${exercise.video_url}`;

// NÃO ignore erros
<img src={gifUrl} />; // Sem onError!

// NÃO carregue todas de uma vez
{
    exercises.map((ex) => <img src={getGifUrl(ex.video_url)} />);
} // Sem lazy!
```

## 🚀 Performance

### Lazy Loading de GIFs

```tsx
function ExerciseList({ exercises }) {
    return (
        <div className="exercise-list">
            {exercises.map((exercise) => (
                <img
                    key={exercise.id}
                    src={getGifUrl(exercise.video_url)}
                    alt={exercise.name}
                    loading="lazy" // ✅ Carrega apenas quando visível
                    decoding="async" // ✅ Não bloqueia renderização
                />
            ))}
        </div>
    );
}
```

### Pré-validação de GIFs

```tsx
// Validar múltiplas GIFs de uma vez
async function preloadExercises(exercises) {
    const validations = exercises.map((ex) => validateGifExists(ex.video_url));

    const results = await Promise.all(validations);

    return exercises.filter((_, index) => results[index]);
}
```

## 📚 Recursos

- [gifUtils.ts](src/libs/gifUtils.ts) - Código fonte das funções
- [ProtectedVideo](src/components/molecules/ProtectedVideo/index.tsx) - Componente completo
- [GIFS_FRONTEND.md](GIFS_FRONTEND.md) - Documentação completa
- [README.md](README.md) - Guia de início rápido
