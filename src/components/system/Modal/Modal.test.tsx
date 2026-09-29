import { useState } from 'react';
import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import Modal from './index';
import { resetModalHistoryForTests } from '@/libs/modalHistory';

/** Espera o popstate do voltar (jsdom resolve numa task) e um respiro. */
function settleHistory(): Promise<void> {
    return new Promise((resolve) => {
        let timer = setTimeout(done, 2000);
        function onPop() {
            clearTimeout(timer);
            timer = setTimeout(done, 40);
        }
        function done() {
            window.removeEventListener('popstate', onPop);
            resolve();
        }
        window.addEventListener('popstate', onPop);
    });
}

async function pressBack() {
    await act(async () => {
        const settled = settleHistory();
        window.history.back();
        await settled;
    });
}

/** Card do exercício com o player de vídeo por cima, como no treino do aluno. */
function ExerciseWithVideo() {
    const [card, setCard] = useState(true);
    const [video, setVideo] = useState(false);
    return (
        <>
            <Modal open={card} onClose={() => setCard(false)} title="Supino">
                <button onClick={() => setVideo(true)}>ver vídeo</button>
            </Modal>
            <Modal
                open={video}
                onClose={() => setVideo(false)}
                title="Vídeo do supino"
            >
                <p>player</p>
            </Modal>
        </>
    );
}

describe('Modal + botão voltar', () => {
    beforeEach(() => {
        resetModalHistoryForTests();
        window.history.replaceState(null, '', '/meus-treinos');
        window.history.pushState({ __NA: true }, '', '/meus-treinos/1/2');
    });
    afterEach(() => resetModalHistoryForTests());

    it('voltar fecha o vídeo, depois o card, sem sair da página do treino', async () => {
        render(<ExerciseWithVideo />);
        await act(async () => screen.getByText('ver vídeo').click());
        expect(screen.getByText('player')).toBeTruthy();

        await pressBack();
        expect(screen.queryByText('player')).toBeNull();
        expect(screen.getByText('ver vídeo')).toBeTruthy();

        await pressBack();
        expect(screen.queryByText('ver vídeo')).toBeNull();
        expect(window.location.pathname).toBe('/meus-treinos/1/2');
    });

    it('com onBack, voltar sobe um nível e o modal continua aberto', async () => {
        function Stack() {
            const [level, setLevel] = useState(2);
            return (
                <Modal
                    open
                    onClose={() => {}}
                    onBack={level > 1 ? () => setLevel((l) => l - 1) : undefined}
                    title={`nível ${level}`}
                >
                    conteúdo
                </Modal>
            );
        }
        render(<Stack />);
        await pressBack();
        expect(screen.getByText('nível 1')).toBeTruthy();
        expect(window.location.pathname).toBe('/meus-treinos/1/2');
    });
});
