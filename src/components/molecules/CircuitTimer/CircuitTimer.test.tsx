import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
    act,
    cleanup,
    fireEvent,
    render,
    screen,
} from '@testing-library/react';
import { createRef } from 'react';
import CircuitTimer, { type CircuitTimerHandle } from './index';
import { playCircuitSound, type CircuitSoundEvent } from '@/libs/circuitSounds';
import { PREP_SECONDS, RESUME_PREP_SECONDS } from '@/libs/circuitRunner';

// Howler não toca em jsdom: os sons são espiados no módulo.
vi.mock('@/libs/circuitSounds', () => ({
    playCircuitSound: vi.fn(),
    preloadCircuitSounds: vi.fn(),
}));

/**
 * Circuito de um bloco agrupado: exercícios da rodada em sequência sem
 * descanso, descanso só no fim da rodada, e a rodada seguinte.
 */
describe('CircuitTimer', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.mocked(playCircuitSound).mockClear();
        window.localStorage.clear();
        Element.prototype.scrollIntoView = vi.fn();
    });
    afterEach(() => {
        cleanup();
        vi.useRealTimers();
    });

    const tick = (ms: number) =>
        act(() => {
            vi.advanceTimersByTime(ms);
        });
    const click = (name: RegExp | string) =>
        fireEvent.click(screen.getByRole('button', { name }));
    /** Iniciar + a preparação inteira: o 1º exercício já está contando. */
    const startNow = () => {
        click(/Iniciar circuito/);
        tick(PREP_SECONDS * 1000);
    };

    const pair60 = [
        { name: 'Polichinelo', series: [60, 60], timed: true, rest: 30 },
        { name: 'Burpee', series: [60, 60], timed: true, rest: 30 },
    ];

    it('emenda os exercícios da rodada e só descansa no fim dela', () => {
        render(<CircuitTimer exercises={pair60} />);
        startNow();
        expect(screen.getByText('Rodada 1 de 2')).toBeTruthy();
        expect(screen.getByText(/Exercício 1 de 2 · faltam 2 na rodada/)).toBeTruthy();

        tick(60_000);
        // Sem descanso entre os exercícios: já está no Burpee, contando.
        expect(screen.getByText(/Exercício 2 de 2 · último da rodada/)).toBeTruthy();
        expect(screen.getByRole('timer').textContent).toBe('1:00');

        tick(60_000);
        expect(screen.getByText('Descanso')).toBeTruthy();
        expect(screen.getByRole('timer').textContent).toBe('0:30');

        tick(30_000);
        expect(screen.getByText('Rodada 2 de 2')).toBeTruthy();
        expect(screen.getByText(/Exercício 1 de 2/)).toBeTruthy();

        tick(60_000);
        tick(60_000);
        // Última rodada não tem descanso depois.
        expect(screen.getByText('Circuito concluído!')).toBeTruthy();
    });

    it('série por repetições espera o "Feito"', () => {
        render(
            <CircuitTimer
                exercises={[
                    { name: 'Prancha', series: [40], timed: true },
                    { name: 'Flexão', series: [12] },
                ]}
            />,
        );
        startNow();
        tick(40_000);
        expect(screen.getByRole('timer').textContent).toBe('12 reps');
        tick(60_000);
        expect(screen.getByRole('timer').textContent).toBe('12 reps');

        click(/Feito/);
        expect(screen.getByText('Circuito concluído!')).toBeTruthy();
    });

    describe('preparação e controles (relato de aluno, 09-26)', () => {
        it('o tempo do 1º exercício só começa depois do "Prepare-se"', () => {
            render(<CircuitTimer exercises={pair60} />);
            click(/Iniciar circuito/);
            expect(screen.getByText('Prepare-se')).toBeTruthy();
            expect(screen.getByText(/Polichinelo · rodada 1 de 2/)).toBeTruthy();
            expect(screen.getByRole('timer').textContent).toBe('0:05');
            tick(PREP_SECONDS * 1000);
            expect(screen.getByText(/Exercício 1 de 2/)).toBeTruthy();
            expect(screen.getByRole('timer').textContent).toBe('1:00');
        });

        it('↺ refaz só o exercício atual, sem voltar para a rodada 1', () => {
            render(<CircuitTimer exercises={pair60} />);
            startNow();
            tick(60_000 + 60_000 + 30_000); // rodada 1 inteira + descanso
            tick(20_000); // 20 s do Polichinelo da rodada 2
            click(/Refazer exercício/);
            expect(screen.getByText('Prepare-se')).toBeTruthy();
            expect(screen.getByText('Rodada 2 de 2')).toBeTruthy();
            tick(PREP_SECONDS * 1000);
            expect(screen.getByRole('timer').textContent).toBe('1:00');
            expect(screen.getByText('Rodada 2 de 2')).toBeTruthy();
        });

        it('recomeçar o circuito inteiro pede confirmação', () => {
            render(<CircuitTimer exercises={pair60} />);
            startNow();
            tick(60_000);
            click(/Recomeçar o circuito inteiro/);
            click('Cancelar');
            expect(screen.getByText(/Exercício 2 de 2/)).toBeTruthy();

            click(/Recomeçar o circuito inteiro/);
            click(/^Recomeçar$/);
            expect(
                screen.getByRole('button', { name: /Iniciar circuito/ }),
            ).toBeTruthy();
        });

        it('Anterior desfaz um Pular acidental', () => {
            render(<CircuitTimer exercises={pair60} />);
            startNow();
            click('Pular para o próximo');
            expect(screen.getByText(/Exercício 2 de 2/)).toBeTruthy();
            click(/Anterior/);
            tick(PREP_SECONDS * 1000);
            expect(screen.getByText(/Exercício 1 de 2/)).toBeTruthy();
            expect(screen.getByRole('timer').textContent).toBe('1:00');
        });

        it('retomar um exercício pausado passa por preparação curta e continua de onde parou', () => {
            render(<CircuitTimer exercises={pair60} />);
            startNow();
            tick(20_000);
            click(/Pausar/);
            tick(120_000);
            expect(screen.getByRole('timer').textContent).toBe('0:40');
            click(/Continuar/);
            expect(screen.getByText('Prepare-se')).toBeTruthy();
            tick(RESUME_PREP_SECONDS * 1000);
            expect(screen.getByRole('timer').textContent).toBe('0:40');
        });
    });

    describe('andamento guardado e registro', () => {
        it('recarregar a página reabre pausado no mesmo passo', () => {
            const view = render(
                <CircuitTimer exercises={pair60} storageKey="t1:b1" />,
            );
            startNow();
            tick(60_000 + 15_000); // no Burpee, 45 s restantes
            view.unmount();

            render(<CircuitTimer exercises={pair60} storageKey="t1:b1" />);
            expect(screen.getByText(/Retomado de onde você parou/)).toBeTruthy();
            expect(screen.getByText(/Exercício 2 de 2/)).toBeTruthy();
            expect(screen.getByRole('timer').textContent).toBe('0:45');
            tick(10_000);
            // Pausado: não conta sozinho ao reabrir.
            expect(screen.getByRole('timer').textContent).toBe('0:45');
        });

        it('prescrição mudou: o andamento antigo não reabre', () => {
            const view = render(
                <CircuitTimer exercises={pair60} storageKey="t1:b1" />,
            );
            startNow();
            view.unmount();
            render(
                <CircuitTimer
                    exercises={pair60}
                    recoverySeconds={10}
                    storageKey="t1:b1"
                />,
            );
            expect(
                screen.getByRole('button', { name: /Iniciar circuito/ }),
            ).toBeTruthy();
        });

        it('avisa o fim e oferece a próxima ação', () => {
            const onComplete = vi.fn();
            render(
                <CircuitTimer
                    exercises={[
                        { name: 'A', series: [10], timed: true },
                        { name: 'B', series: [10], timed: true },
                    ]}
                    onComplete={onComplete}
                    doneAction={<button type="button">Registrar treino</button>}
                />,
            );
            startNow();
            tick(20_000);
            expect(onComplete).toHaveBeenCalledTimes(1);
            expect(
                screen.getByRole('button', { name: 'Registrar treino' }),
            ).toBeTruthy();
        });
    });

    describe('modo tabata e sons', () => {
        const pair = [
            { name: 'A', series: [20, 20], timed: true, rest: 30 },
            { name: 'B', series: [20, 20], timed: true, rest: 30 },
        ];
        it('recuperação prescrita entra entre os exercícios da rodada', () => {
            render(<CircuitTimer exercises={pair} recoverySeconds={10} />);
            expect(screen.getByText('Tabata · 10 s')).toBeTruthy();
            startNow();
            tick(20_000);
            expect(screen.getByText('Recuperação')).toBeTruthy();
            expect(screen.getByText('Próximo: B')).toBeTruthy();
            expect(screen.getByRole('timer').textContent).toBe('0:10');
            tick(10_000);
            expect(screen.getByText(/Exercício 2 de 2/)).toBeTruthy();
        });

        it('sem recuperação prescrita os exercícios emendam, e não há como mudar no aparelho', () => {
            render(<CircuitTimer exercises={pair} />);
            expect(screen.queryByText(/Tabata/)).toBeNull();
            expect(
                screen.queryByRole('button', { name: 'Configurar circuito' }),
            ).toBeNull();
            startNow();
            tick(20_000);
            expect(screen.getByText(/Exercício 2 de 2/)).toBeTruthy();
        });

        const styles = () =>
            vi.mocked(playCircuitSound).mock.calls.map((c) => c[1]);
        /** Rótulo curto do evento: "3", "1+ready", "go", "rest+final"… */
        const label = (e: CircuitSoundEvent) => {
            if (e.kind === 'count') return e.ready ? `${e.n}+ready` : `${e.n}`;
            const round = e.roundCall
                ? e.roundCall.final
                    ? 'final'
                    : `round${e.roundCall.round}`
                : null;
            return [e.cue, round].filter(Boolean).join('+');
        };
        let seen = 0;
        /** Eventos tocados desde a última chamada. */
        const heard = () => {
            const calls = vi.mocked(playCircuitSound).mock.calls;
            const fresh = calls.slice(seen).map((c) => label(c[0]));
            seen = calls.length;
            return fresh;
        };
        beforeEach(() => {
            seen = 0;
        });

        it('roteiro inteiro: rodada, 3-2-1, "Ready" antes de cada exercício, pausas e fim', () => {
            render(<CircuitTimer exercises={pair} recoverySeconds={10} />);
            startNow();
            expect(heard()).toEqual(['round1', '3', '2', '1+ready', 'go']);
            tick(20_000); // A termina -> recuperação: sem "Ready"
            expect(heard()).toEqual(['3', '2', '1', 'recover']);
            tick(10_000); // recuperação termina -> B
            expect(heard()).toEqual(['3', '2', '1+ready', 'go']);
            tick(20_000); // B termina -> descanso, que anuncia a última rodada
            expect(heard()).toEqual(['3', '2', '1', 'rest+final']);
            tick(30_000); // descanso termina -> A da rodada 2
            expect(heard()).toEqual(['3', '2', '1+ready', 'go']);
            tick(30_000); // A + recuperação
            heard();
            tick(20_000); // B, o último passo
            expect(heard()).toEqual(['3', '2', '1', 'done']);
        });

        it('rodadas do meio são anunciadas pelo número', () => {
            render(
                <CircuitTimer
                    exercises={[
                        { name: 'A', series: [20, 20, 20], timed: true },
                        {
                            name: 'B',
                            series: [20, 20, 20],
                            timed: true,
                            rest: 30,
                        },
                    ]}
                />,
            );
            startNow();
            heard();
            tick(40_000); // rodada 1 -> descanso
            expect(heard().pop()).toBe('rest+round2');
            tick(70_000); // descanso + rodada 2 -> descanso
            expect(heard().pop()).toBe('rest+final');
        });

        it('circuito de uma rodada só é "round 1", não "final"', () => {
            render(
                <CircuitTimer
                    exercises={[
                        { name: 'A', series: [20], timed: true },
                        { name: 'B', series: [20], timed: true },
                    ]}
                />,
            );
            startNow();
            expect(heard()).toEqual(['round1', '3', '2', '1+ready', 'go']);
        });

        it('"Feito" na série por repetições vai direto ao "go", sem contagem', () => {
            render(
                <CircuitTimer
                    exercises={[
                        { name: 'A', series: [12] },
                        { name: 'B', series: [20], timed: true },
                    ]}
                />,
            );
            startNow();
            heard();
            click(/Feito/);
            expect(heard()).toEqual(['go']);
        });

        it('voz é o padrão; "Bipe" troca o pacote, fica guardado e volta ao reabrir', () => {
            const { unmount } = render(<CircuitTimer exercises={pair} />);
            const group = screen.getByRole('group', { name: 'Tipo de som' });
            const voice = screen.getByRole('button', { name: 'Voz' });
            const beep = screen.getByRole('button', { name: 'Bipe' });
            expect(group).toBeTruthy();
            expect(voice.getAttribute('aria-pressed')).toBe('true');
            expect(beep.getAttribute('aria-pressed')).toBe('false');

            startNow();
            expect(new Set(styles())).toEqual(new Set(['voice']));

            fireEvent.click(beep);
            expect(beep.getAttribute('aria-pressed')).toBe('true');
            expect(voice.getAttribute('aria-pressed')).toBe('false');
            expect(
                JSON.parse(
                    window.localStorage.getItem('venafit.circuit.settings')!,
                ),
            ).toMatchObject({ sound: true, soundStyle: 'beep' });

            vi.mocked(playCircuitSound).mockClear();
            tick(20_000); // A -> B, já com os bipes
            expect(heard()).toEqual(['3', '2', '1+ready', 'go']);
            expect(new Set(styles())).toEqual(new Set(['beep']));

            unmount();
            render(<CircuitTimer exercises={pair} />);
            expect(
                screen
                    .getByRole('button', { name: 'Bipe' })
                    .getAttribute('aria-pressed'),
            ).toBe('true');
        });

        it('com o som desligado não toca nada e esconde a escolha voz/bipe', () => {
            window.localStorage.setItem(
                'venafit.circuit.settings',
                JSON.stringify({ sound: false }),
            );
            render(<CircuitTimer exercises={pair} />);
            expect(
                screen.queryByRole('group', { name: 'Tipo de som' }),
            ).toBeNull();
            startNow();
            tick(20_000);
            expect(playCircuitSound).not.toHaveBeenCalled();
        });
    });

    it('start() de fora (atalho do card) começa e não reinicia em andamento', () => {
        const ref = createRef<CircuitTimerHandle>();
        render(<CircuitTimer ref={ref} exercises={pair60} />);
        act(() => ref.current!.start());
        expect(screen.getByText('Prepare-se')).toBeTruthy();
        tick(100);
        expect(Element.prototype.scrollIntoView).toHaveBeenCalled();

        tick(PREP_SECONDS * 1000 + 60_000);
        expect(screen.getByText(/Exercício 2 de 2/)).toBeTruthy();
        // Chamar de novo no meio do circuito só rola até ele.
        act(() => ref.current!.start());
        expect(screen.getByText(/Exercício 2 de 2/)).toBeTruthy();
    });
});
