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
import { playCircuitSound } from '@/libs/circuitSounds';
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
        const sounds = () =>
            vi.mocked(playCircuitSound).mock.calls.map((c) => c[0]);

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

        it('toca um som por transição: bips da preparação, vai, recuperação, descanso', () => {
            render(<CircuitTimer exercises={pair} recoverySeconds={10} />);
            startNow();
            expect(sounds()).toEqual(['tick', 'tick', 'tick', 'go']);
            tick(20_000); // A termina
            const afterA = sounds().slice(4);
            expect(afterA.filter((n) => n === 'tick')).toHaveLength(3);
            expect(afterA[afterA.length - 1]).toBe('recover');
            tick(10_000); // recuperação (10 s) termina -> B
            expect(sounds().pop()).toBe('go');
            tick(20_000); // B termina -> descanso da rodada
            expect(sounds().pop()).toBe('rest');
        });

        it('com o som desligado não toca nada', () => {
            window.localStorage.setItem(
                'venafit.circuit.settings',
                JSON.stringify({ sound: false }),
            );
            render(<CircuitTimer exercises={pair} />);
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
