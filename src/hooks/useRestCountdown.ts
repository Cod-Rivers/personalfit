'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { getTimerSoundSettings } from '@/libs/timerSoundSettings';
import {
    playTimerSound,
    preloadTimerSounds,
    type TimerSoundEvent,
} from '@/libs/timerSounds';

/** Os três últimos segundos avisam um por um ("3, 2, 1" ou bipes). */
const COUNT_FROM = 3;

/** Sons de um cronômetro (roteiros em libs/timerSounds.ts). Tocam conforme a
 * preferência do aparelho — voz, bipe ou nada. */
export interface CountdownSounds {
    /** Ao iniciar ou retomar (ex.: "Go!" da série por tempo). */
    start?: TimerSoundEvent;
    /** No zero. Se ele começa uma série ("go" sem anúncio de rodada), o "1"
     * da contagem emenda "Ready" e o "Go!" cai no início dela. */
    finish: TimerSoundEvent;
}

function play(event: TimerSoundEvent) {
    const { sound, soundStyle } = getTimerSoundSettings();
    if (sound) playTimerSound(event, soundStyle);
}

/**
 * Contagem regressiva do descanso entre séries (e da série por tempo).
 *
 * Conta pelo relógio (instante de término), não decrementando um número a
 * cada tick: com a tela bloqueada ou o app em segundo plano o navegador
 * atrasa os intervalos, e um contador por tick voltaria "atrasado" — o aluno
 * descansaria mais do que o prescrito.
 *
 * @param seconds duração prescrita. Mudar com o timer parado reinicia a
 * contagem para o novo valor; rodando, a volta atual segue até o fim.
 * @param sounds o que tocar; sem ele, o cronômetro é mudo (só vibra no fim).
 */
export function useRestCountdown(seconds: number, sounds?: CountdownSounds) {
    const [remaining, setRemaining] = useState(seconds);
    const [running, setRunning] = useState(false);
    const [finished, setFinished] = useState(false);
    const endAtRef = useRef<number | null>(null);
    // Lidos dentro do intervalo: o chamador recria o objeto a cada render.
    const soundsRef = useRef(sounds);
    soundsRef.current = sounds;
    const secondsRef = useRef(seconds);
    secondsRef.current = seconds;
    const lastCountRef = useRef<number | null>(null);

    const hasSounds = !!sounds;
    useEffect(() => {
        if (hasSounds) preloadTimerSounds(getTimerSoundSettings().soundStyle);
    }, [hasSounds]);

    useEffect(() => {
        if (running) return;
        setRemaining(seconds);
        setFinished(false);
        // Só a duração prescrita reinicia; parar/pausar não.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [seconds]);

    useEffect(() => {
        if (!running) return;
        const tick = () => {
            const endAt = endAtRef.current;
            if (endAt == null) return;
            const left = Math.max(0, Math.ceil((endAt - Date.now()) / 1000));
            setRemaining(left);
            const cues = soundsRef.current;
            // Contagem só em descanso mais longo que o próprio aviso, como
            // no circuito; uma vez por segundo (o tick roda a cada 250 ms).
            if (
                cues &&
                left >= 1 &&
                left <= COUNT_FROM &&
                secondsRef.current > COUNT_FROM &&
                lastCountRef.current !== left
            ) {
                lastCountRef.current = left;
                const { finish } = cues;
                play({
                    kind: 'count',
                    n: left as 1 | 2 | 3,
                    ready:
                        left === 1 &&
                        finish.kind === 'transition' &&
                        finish.cue === 'go' &&
                        !finish.roundCall,
                });
            }
            if (left === 0) {
                endAtRef.current = null;
                setRunning(false);
                setFinished(true);
                if (cues) play(cues.finish);
                // Na academia o celular está no bolso ou no banco: a vibração
                // é o aviso que chega. Sem suporte (iOS, alguns WebViews), o
                // visual de "Pronto" basta.
                try {
                    navigator.vibrate?.([200, 100, 200]);
                } catch {
                    /* sem vibração */
                }
            }
        };
        tick();
        const id = window.setInterval(tick, 250);
        return () => window.clearInterval(id);
    }, [running]);

    const start = useCallback(() => {
        const from = remaining > 0 ? remaining : seconds;
        endAtRef.current = Date.now() + from * 1000;
        lastCountRef.current = null;
        setRemaining(from);
        setFinished(false);
        setRunning(true);
        const startCue = soundsRef.current?.start;
        if (startCue) play(startCue);
    }, [remaining, seconds]);

    const pause = useCallback(() => {
        const endAt = endAtRef.current;
        if (endAt != null) {
            setRemaining(Math.max(0, Math.ceil((endAt - Date.now()) / 1000)));
        }
        endAtRef.current = null;
        setRunning(false);
    }, []);

    const reset = useCallback(() => {
        endAtRef.current = null;
        setRunning(false);
        setFinished(false);
        setRemaining(seconds);
    }, [seconds]);

    return { remaining, running, finished, start, pause, reset };
}

/** 90 → "1:30". */
export function formatCountdown(totalSeconds: number): string {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
}
