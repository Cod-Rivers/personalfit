/**
 * Sons das transições do circuito, tocados com Howler.js (Web Audio, com
 * fallback para HTML5 Audio). Os arquivos ficam em public/sounds.
 *
 * Howler é importado sob demanda: só quem abre um circuito paga por ele, e o
 * módulo nunca é avaliado no servidor (ele toca em `window` ao carregar).
 *
 * Navegador e WebView bloqueiam áudio até um gesto do usuário. O Howler se
 * destrava sozinho no primeiro toque/clique depois de criado o primeiro Howl
 * — por isso o pré-carregamento acontece ao montar o cronômetro, e o botão
 * "Iniciar circuito" (o gesto) já toca o primeiro som.
 */
import type { Howl } from 'howler';

export type CircuitSound = 'tick' | 'go' | 'recover' | 'rest' | 'done';

const FILES: Record<CircuitSound, string> = {
    tick: '/sounds/tick.wav',
    go: '/sounds/go.wav',
    recover: '/sounds/recover.wav',
    rest: '/sounds/rest.wav',
    done: '/sounds/done.wav',
};

let loading: Promise<Record<CircuitSound, Howl> | null> | null = null;

function load(): Promise<Record<CircuitSound, Howl> | null> {
    if (typeof window === 'undefined') return Promise.resolve(null);
    if (!loading) {
        loading = import('howler')
            .then(({ Howl }) => {
                const make = (src: string) =>
                    new Howl({ src: [src], preload: true, volume: 1 });
                return Object.fromEntries(
                    (Object.keys(FILES) as CircuitSound[]).map((name) => [
                        name,
                        make(FILES[name]),
                    ]),
                ) as Record<CircuitSound, Howl>;
            })
            .catch(() => null);
    }
    return loading;
}

/** Baixa e decodifica os sons antes do primeiro uso. */
export function preloadCircuitSounds(): void {
    void load();
}

/** Toca um som. Nunca lança: sem áudio, o cronômetro segue só visual. */
export function playCircuitSound(name: CircuitSound): void {
    void load().then((sounds) => {
        try {
            sounds?.[name].play();
        } catch {
            /* áudio indisponível */
        }
    });
}
