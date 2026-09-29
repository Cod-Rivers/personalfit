import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
    pushModalHistoryEntry,
    resetModalHistoryForTests,
} from './modalHistory';

/**
 * jsdom resolve history.back() numa task. Espera o primeiro popstate e depois
 * um intervalo sem nenhum (os saltos encadeados), sem depender de um tempo
 * fixo que estoura com a suíte inteira rodando em paralelo.
 */
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

/** Menu → página do treino (a página em que os modais abrem). */
function startOnTrainingPage() {
    window.history.replaceState(null, '', '/meus-treinos');
    window.history.pushState({ __NA: true }, '', '/meus-treinos/1/2');
}

async function back() {
    const settled = settleHistory();
    window.history.back();
    await settled;
}

/**
 * Navigation API mínima (jsdom não tem): mantém currentEntry em sincronia com
 * o histórico real e dispara `navigate` antes de cada voltar, como o Chromium.
 */
function installFakeNavigation() {
    const keys = ['k0'];
    let index = 0;
    let seq = 1;
    const nav = new EventTarget();
    Object.defineProperty(nav, 'currentEntry', {
        get: () => ({ key: keys[index], index }),
    });
    const origPush = window.history.pushState.bind(window.history);
    const origBack = window.history.back.bind(window.history);
    window.history.pushState = (data, unused, url) => {
        origPush(data, unused, url);
        keys.splice(index + 1);
        keys.push(`k${seq++}`);
        index++;
    };
    window.history.back = () => {
        if (index === 0) return;
        nav.dispatchEvent(
            Object.assign(new Event('navigate'), {
                navigationType: 'traverse',
                destination: { index: index - 1 },
            }),
        );
        index--;
        origBack();
    };
    (window as unknown as { navigation: EventTarget }).navigation = nav;
    return () => {
        window.history.pushState = origPush;
        window.history.back = origBack;
        delete (window as unknown as { navigation?: EventTarget }).navigation;
    };
}

/** Simula um modal: onBack fecha (libera) ou não, conforme `closes`. */
function openModal(closes = true) {
    const onBack = vi.fn(() => {
        if (closes) release();
    });
    const release = pushModalHistoryEntry(onBack);
    return { onBack, release };
}

describe('modalHistory', () => {
    beforeEach(() => {
        resetModalHistoryForTests();
        startOnTrainingPage();
    });

    afterEach(() => {
        resetModalHistoryForTests();
    });

    it('abrir cria uma entrada na mesma URL, preservando o state do Next', () => {
        const before = window.history.length;
        openModal();
        expect(window.history.length).toBe(before + 1);
        expect(window.location.pathname).toBe('/meus-treinos/1/2');
        expect(window.history.state.__NA).toBe(true);
    });

    it('voltar fecha o modal e fica na página do treino', async () => {
        const m = openModal();
        await back();
        expect(m.onBack).toHaveBeenCalledTimes(1);
        expect(window.location.pathname).toBe('/meus-treinos/1/2');
    });

    it('modais aninhados fecham um por voltar, do topo para baixo', async () => {
        const card = openModal();
        const video = openModal();

        await back();
        expect(video.onBack).toHaveBeenCalledTimes(1);
        expect(card.onBack).not.toHaveBeenCalled();

        await back();
        expect(card.onBack).toHaveBeenCalledTimes(1);
        expect(window.location.pathname).toBe('/meus-treinos/1/2');
    });

    it('modal que não fecha no voltar (navegação interna) recebe a entrada de volta', async () => {
        const m = openModal(false);
        await back();
        await back();
        expect(m.onBack).toHaveBeenCalledTimes(2);
        expect(window.location.pathname).toBe('/meus-treinos/1/2');
    });

    it('fechar pelo X não mexe no histórico e o próximo modal reaproveita a entrada', () => {
        const a = openModal();
        const length = window.history.length;
        a.release();
        expect(window.history.length).toBe(length);
        openModal();
        expect(window.history.length).toBe(length);
    });

    it('sem Navigation API, voltar em entrada morta não fecha nem pula nada', async () => {
        const a = openModal();
        a.release();
        await back();
        expect(a.onBack).not.toHaveBeenCalled();
        expect(window.location.pathname).toBe('/meus-treinos/1/2');
    });

    describe('com Navigation API', () => {
        let uninstall: () => void;
        beforeEach(() => {
            resetModalHistoryForTests();
            uninstall = installFakeNavigation();
            startOnTrainingPage();
        });
        afterEach(() => uninstall());

        it('voltar depois de fechar pelo X sai da página de uma vez', async () => {
            const a = openModal();
            a.release();
            await back();
            expect(window.location.pathname).toBe('/meus-treinos');
        });

        it('vídeo fechado pelo X: o voltar seguinte fecha o card, não a página', async () => {
            const card = openModal();
            const video = openModal();
            video.release();

            await back();
            expect(card.onBack).toHaveBeenCalledTimes(1);
            expect(window.location.pathname).toBe('/meus-treinos/1/2');
        });

        it('popstate de âncora "#" não fecha o modal, e o voltar seguinte fecha', async () => {
            const m = openModal();
            const nav = (window as unknown as { navigation: EventTarget })
                .navigation;
            nav.dispatchEvent(
                Object.assign(new Event('navigate'), {
                    navigationType: 'push',
                    destination: { index: 0 },
                }),
            );
            window.dispatchEvent(new PopStateEvent('popstate', { state: null }));
            expect(m.onBack).not.toHaveBeenCalled();

            await back();
            expect(m.onBack).toHaveBeenCalledTimes(1);
        });

        it('voltando de outra página para uma entrada morta, para na página do treino', async () => {
            const a = openModal();
            a.release();
            window.history.pushState({ __NA: true }, '', '/ajuda');

            await back();
            expect(window.location.pathname).toBe('/meus-treinos/1/2');
        });
    });
});
