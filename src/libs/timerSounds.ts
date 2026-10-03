/**
 * Sons dos cronômetros do treino, tocados com Howler.js (Web Audio, com
 * fallback para HTML5 Audio). Os arquivos ficam em public/sounds.
 *
 * Dois pacotes, escolha do aparelho (libs/timerSoundSettings.ts), que vale
 * para todos os cronômetros:
 * - voice: locutora (Voiceover Pack do Kenney, kenney.nl, licença CC0 — uso
 *   comercial livre, sem crédito obrigatório).
 * - beep: bipes — um por segundo nos três últimos e um som por transição.
 *
 * Roteiro na voz, por cronômetro:
 * - Circuito (CircuitTimer): "Round 1" … "3, 2, 1, Ready" "Go!" … "3, 2, 1"
 *   "Time over" (recuperação) … "3, 2, 1" "Level up, Round 2" (descanso) …
 *   "Final round" na última … "Time over, Congratulations, You win!" no fim.
 * - Descanso entre séries (card do exercício, RestTimer): "3, 2, 1, Ready"
 *   "Go!" — o descanso acabou, a próxima série começa.
 * - Série por tempo (SeriesTimer): "Go!" ao iniciar; no fim, "3, 2, 1"
 *   "Level up, Round 2" quando há outra série, "Time over, Congratulations,
 *   You win!" na última. O RestTimer de uma série avulsa diz "Time over".
 *
 * Howler é importado sob demanda: só quem abre um cronômetro paga por ele, e
 * o módulo nunca é avaliado no servidor (ele toca em `window` ao carregar).
 * Cada pacote só é decodificado quando escolhido.
 *
 * Offline: o service worker (public/sw.js, SOUND_FILES) baixa os arquivos
 * dos dois pacotes na instalação e os serve do cache — TIMER_SOUND_FILES
 * abaixo é a lista que ele precisa espelhar.
 *
 * Navegador e WebView bloqueiam áudio até um gesto do usuário. O Howler se
 * destrava sozinho no primeiro toque/clique depois de criado o primeiro Howl
 * — por isso o pré-carregamento acontece ao montar o cronômetro, e o toque
 * em "Iniciar" (o gesto) já toca o primeiro som.
 */
import type { Howl } from 'howler';
import type { CircuitCue, RoundCall } from './circuitRunner';

export type TimerSoundStyle = 'voice' | 'beep';

export type TimerSoundEvent =
    /** Um dos três últimos segundos de uma contagem. `ready`: no zero começa
     * um exercício — a voz emenda "Ready" no "1" e o "Go!" cai no início. */
    | { kind: 'count'; n: 1 | 2 | 3; ready: boolean }
    /** Mudança de fase: as deixas são as do circuito (libs/circuitRunner.ts),
     * reaproveitadas pelos outros cronômetros com o mesmo sentido — `go` =
     * começa a série, `recover` = acabou o tempo dela, `rest` = troca de
     * série, `done` = acabou tudo. */
    | { kind: 'transition'; cue?: CircuitCue; roundCall?: RoundCall };

const NUMBERS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];

const CLIPS: Record<TimerSoundStyle, readonly string[]> = {
    voice: [
        ...NUMBERS,
        'ready',
        'go',
        'round',
        'final_round',
        'level_up',
        'time_over',
        'congratulations',
        'you_win',
    ],
    beep: ['tick', 'go', 'recover', 'rest', 'done'],
};

const fileOf = (clip: string, style: TimerSoundStyle) =>
    style === 'voice' ? `/sounds/voice/${clip}.mp3` : `/sounds/${clip}.wav`;

/** Todos os arquivos dos dois pacotes. O service worker (public/sw.js,
 * SOUND_FILES) baixa estes mesmos na instalação para os cronômetros tocarem
 * offline — timerSounds.test.ts confere que as listas batem. */
export const TIMER_SOUND_FILES: string[] = (
    Object.keys(CLIPS) as TimerSoundStyle[]
).flatMap((style) => CLIPS[style].map((clip) => fileOf(clip, style)));

/** Só há número gravado até 10: acima disso a voz diz só "Round". */
function voiceRound(call: RoundCall): string[] {
    if (call.final) return ['final_round'];
    return call.round <= 10 ? ['round', String(call.round)] : ['round'];
}

/** Falas (ou bipes) de um evento, na ordem em que tocam. */
export function timerSoundSequence(
    event: TimerSoundEvent,
    style: TimerSoundStyle,
): string[] {
    if (style === 'beep') {
        if (event.kind === 'count') return ['tick'];
        return event.cue ? [event.cue] : [];
    }
    if (event.kind === 'count') {
        return event.ready ? [String(event.n), 'ready'] : [String(event.n)];
    }
    const round = event.roundCall ? voiceRound(event.roundCall) : [];
    switch (event.cue) {
        // Sem descanso entre as rodadas, o anúncio vem antes do "Go!".
        case 'go':
            return [...round, 'go'];
        case 'recover':
            return ['time_over', ...round];
        case 'rest':
            return ['level_up', ...round];
        case 'done':
            return ['time_over', 'congratulations', 'you_win'];
        default:
            return round;
    }
}

type Clip = {
    howl: Howl;
    kind: TimerSoundEvent['kind'];
    /** Solta os ouvintes de fim desta fala (tocou até o fim ou foi cortada). */
    release?: () => void;
};

const loading: Partial<
    Record<TimerSoundStyle, Promise<Map<string, Howl> | null>>
> = {};

function load(style: TimerSoundStyle): Promise<Map<string, Howl> | null> {
    if (typeof window === 'undefined') return Promise.resolve(null);
    let pack = loading[style];
    if (!pack) {
        pack = import('howler')
            .then(
                ({ Howl }) =>
                    new Map(
                        CLIPS[style].map((clip) => [
                            clip,
                            new Howl({
                                src: [fileOf(clip, style)],
                                preload: true,
                                volume: 1,
                            }),
                        ]),
                    ),
            )
            .catch(() => null);
        loading[style] = pack;
    }
    return pack;
}

// Fila de reprodução: uma fala por vez, a próxima quando a anterior acaba.
let playing: Clip | null = null;
let queue: Clip[] = [];

function playNext() {
    const clip = queue.shift() ?? null;
    playing = clip;
    if (!clip) return;
    try {
        const id = clip.howl.play();
        const finish = () => {
            clip.release?.();
            if (playing === clip) playNext();
        };
        clip.release = () => {
            clip.howl.off('end', finish, id);
            clip.howl.off('playerror', finish, id);
            clip.release = undefined;
        };
        clip.howl.on('end', finish, id);
        clip.howl.on('playerror', finish, id);
    } catch {
        playNext();
    }
}

function interrupt() {
    const current = playing;
    playing = null;
    queue = [];
    if (!current) return;
    current.release?.();
    try {
        current.howl.stop();
    } catch {
        /* áudio indisponível */
    }
}

/** Baixa e decodifica um pacote antes do primeiro uso. */
export function preloadTimerSounds(style: TimerSoundStyle): void {
    void load(style);
}

/**
 * Toca um evento. Nunca lança: sem áudio, o cronômetro segue só visual.
 *
 * A transição que chega no zero ESPERA a contagem terminar: "1, Ready" ocupa
 * o último segundo quase inteiro (0,99 s de fala), e interromper cortaria o
 * fim do "Ready". Fora isso, o evento novo interrompe o anterior: dois
 * "Pular" seguidos não falam uma frase por cima da outra, e a contagem nunca
 * atrasa.
 */
export function playTimerSound(
    event: TimerSoundEvent,
    style: TimerSoundStyle,
): void {
    const names = timerSoundSequence(event, style);
    if (names.length === 0) return;
    void load(style).then((howls) => {
        if (!howls) return;
        const clips = names
            .map((name) => howls.get(name))
            .filter((howl): howl is Howl => !!howl)
            .map((howl) => ({ howl, kind: event.kind }));
        // Só espera contagem que está mesmo tocando: uma fala que não
        // carregou não pode segurar a fila.
        let countPlaying = false;
        try {
            countPlaying = playing?.kind === 'count' && playing.howl.playing();
        } catch {
            /* áudio indisponível */
        }
        if (event.kind === 'transition' && countPlaying) {
            queue = [...queue.filter((c) => c.kind === 'count'), ...clips];
            return;
        }
        interrupt();
        queue = clips;
        playNext();
    });
}
