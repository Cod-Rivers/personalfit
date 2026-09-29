/**
 * Botão voltar fecha o modal do topo em vez de trocar de página — no WebView
 * Android (MainActivity chama webView.goBack()), no voltar do navegador e no
 * gesto de voltar do iOS.
 *
 * Sem isto nenhum modal tinha entrada no histórico e o voltar sempre saía da
 * PÁGINA. Relato de aluno (2026-09-28): abriu o card do exercício, depois o
 * vídeo, apertou voltar e caiu no menu inicial.
 *
 * Como funciona:
 * - Abrir empilha uma entrada com a MESMA URL e uma marca em history.state. O
 *   resto do state é copiado: sem o __NA do Next o roteador recarregaria a
 *   página inteira no popstate.
 * - O voltar tira essa entrada; o popstate chama `onBack` do modal do topo. Se
 *   ele continuar aberto (onBack de navegação interna, onClose no-op), a
 *   entrada é reposta para o próximo voltar também cair nele.
 * - Fechar pelo X/fundo/Escape/botão do conteúdo NÃO chama history.back(): o
 *   Next descarta a navegação pendente quando chega um popstate, então um back
 *   aqui cancelaria um router.push feito junto com o fechamento. A entrada fica
 *   "morta" (marca de modal que não está aberto): o próximo modal a reaproveita
 *   e o próximo voltar passa direto por ela (ver `chain`).
 */

const MARK = '__vfModal';

interface OpenEntry {
    mark: string;
    onBack: () => void;
}

/** Subconjunto da Navigation API usado aqui (Chromium/WebView, Safari 26+). */
interface NavigationEntryLike {
    key: string;
    index: number;
}
interface NavigationLike extends EventTarget {
    currentEntry: NavigationEntryLike | null;
}
interface NavigateEventLike extends Event {
    navigationType: 'push' | 'replace' | 'reload' | 'traverse';
    destination: { index: number };
}

/** Modais com entrada no histórico, do fundo para o topo. */
const open: OpenEntry[] = [];

/** Marca gravada em cada slot do histórico (NavigationHistoryEntry.key). */
const markBySlot = new Map<string, string>();

/**
 * Voltar que começou numa entrada morta: a página visível é a mesma das
 * entradas logo abaixo, então continua voltando até mudar de URL ou fechar um
 * modal. Sem isto cada modal fechado pelo X custaria um voltar "que não faz
 * nada". Só existe com Navigation API (é ela que diz de onde o voltar saiu).
 */
let chain: { url: string } | null = null;
let chainStepUntil = 0;
/** Último `navigate` que não foi voltar/avançar (âncora "#", push, reload). */
let lastNonTraverseAt = 0;
let installed = false;

function markOf(state: unknown): string | undefined {
    const v = (state as Record<string, unknown> | null)?.[MARK];
    return typeof v === 'string' ? v : undefined;
}

function isOpenMark(mark: string | undefined): boolean {
    return !!mark && open.some((e) => e.mark === mark);
}

function isDead(state: unknown): boolean {
    const mark = markOf(state);
    return !!mark && !isOpenMark(mark);
}

function stateWithMark(mark: string) {
    return { ...(window.history.state ?? {}), [MARK]: mark };
}

function pageOf(url: string): string {
    const u = new URL(url, window.location.href);
    return u.pathname + u.search;
}

function getNavigation(): NavigationLike | undefined {
    return (window as unknown as { navigation?: NavigationLike }).navigation;
}

function rememberSlot(mark: string) {
    const key = getNavigation()?.currentEntry?.key;
    if (key) markBySlot.set(key, mark);
}

function writeEntry(mode: 'push' | 'replace', mark: string) {
    try {
        if (mode === 'push') {
            window.history.pushState(stateWithMark(mark), '');
        } else {
            window.history.replaceState(stateWithMark(mark), '');
        }
        rememberSlot(mark);
    } catch {
        // history indisponível (iframe sandbox): segue sem voltar-fecha.
    }
}

function onNavigate(ev: Event) {
    const e = ev as NavigateEventLike;
    if (e.navigationType !== 'traverse') {
        lastNonTraverseAt = Date.now();
        chain = null;
        return;
    }
    lastNonTraverseAt = 0;
    // Passo da própria corrente: mantém a origem original.
    if (Date.now() < chainStepUntil) {
        chainStepUntil = 0;
        return;
    }
    const from = getNavigation()?.currentEntry;
    const backward =
        !!from && e.destination.index >= 0 && e.destination.index < from.index;
    // A origem precisa bater nas duas fontes: history.state ainda é o da origem
    // durante o evento navigate, e o slot confirma que a marca é dela mesmo.
    const mark = markOf(window.history.state);
    const originDead =
        backward &&
        !!from &&
        isDead(window.history.state) &&
        markBySlot.get(from.key) === mark;
    chain = originDead ? { url: pageOf(window.location.href) } : null;
}

function onPopState(ev: PopStateEvent) {
    // Âncora "#" também dispara popstate em alguns navegadores; só o voltar/
    // avançar de verdade interessa. Vale uma vez e por pouco tempo: se algum
    // navegador não disparar `navigate` num voltar, o próximo não é engolido.
    const afterNonTraverse = Date.now() - lastNonTraverseAt < 1000;
    lastNonTraverseAt = 0;
    if (afterNonTraverse) return;

    const mark = markOf(ev.state);
    const landedAt = mark ? open.findIndex((e) => e.mark === mark) : -1;
    // Todo modal acima da entrada em que o voltar parou perdeu a sua.
    const popped = open.slice(landedAt + 1);

    if (popped.length > 0) {
        chain = null;
        for (let i = popped.length - 1; i >= 0; i--) {
            try {
                popped[i].onBack();
            } catch (err) {
                console.error('[modalHistory] onBack falhou', err);
            }
        }
        // Quem continuou aberto precisa de entrada de novo, na mesma ordem.
        popped
            .filter((e) => open.includes(e))
            .forEach((e) => writeEntry('push', e.mark));
        return;
    }

    if (
        chain &&
        (isDead(ev.state) || pageOf(window.location.href) === chain.url)
    ) {
        chainStepUntil = Date.now() + 1000;
        window.history.back();
        return;
    }
    chain = null;
}

function install() {
    if (installed) return;
    installed = true;
    getNavigation()?.addEventListener('navigate', onNavigate);
    window.addEventListener('popstate', onPopState);
}

/**
 * Dá ao modal uma entrada no histórico. `onBack` roda quando o voltar a tira
 * e precisa fechar (ou voltar um nível) de forma síncrona — o hook
 * useCloseOnBack embrulha em flushSync. Devolve a função de liberação, a
 * chamar quando o modal fechar por qualquer outro caminho.
 */
export function pushModalHistoryEntry(onBack: () => void): () => void {
    if (typeof window === 'undefined') return () => {};
    install();
    const entry: OpenEntry = {
        mark: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`,
        onBack,
    };
    // Entrada morta no topo (modal fechado pelo X, remontagem do StrictMode,
    // reload com modal aberto): reaproveita em vez de empilhar outra.
    writeEntry(isDead(window.history.state) ? 'replace' : 'push', entry.mark);
    open.push(entry);
    return () => {
        const i = open.indexOf(entry);
        if (i !== -1) open.splice(i, 1);
    };
}

/** Só para testes: zera o estado do módulo e remove os listeners. */
export function resetModalHistoryForTests() {
    getNavigation()?.removeEventListener('navigate', onNavigate);
    if (typeof window !== 'undefined') {
        window.removeEventListener('popstate', onPopState);
    }
    open.length = 0;
    markBySlot.clear();
    chain = null;
    chainStepUntil = 0;
    lastNonTraverseAt = 0;
    installed = false;
}
