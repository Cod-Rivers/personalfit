/**
 * Gestão centralizada da sessão do cliente.
 *
 * O token de acesso continua em localStorage (a API autentica por header
 * Authorization: Bearer, nunca por cookie). Além disso, espelhamos dois cookies
 * LEVES — `vf_auth` (presença) e `vf_role` (papel) — que NÃO contêm o JWT.
 * Eles servem apenas para o middleware de borda (middleware.ts) poder gatear
 * rotas sem enviar o token; como o backend ignora cookies, não há superfície de
 * CSRF nova.
 *
 * Centralizar aqui elimina a duplicação de leitura/escrita de sessão que estava
 * espalhada por login, seleção de perfil, header e interceptores.
 */

import { nativeAuthClear, nativeAuthSave } from '@/libs/nativeBridge';

// Import de TIPO apenas (apagado na compilação) — não cria dependência de
// runtime, então não fecha o ciclo session.ts -> syncQueue.ts ->
// workoutLogService.ts -> api.ts -> session.ts. O acesso real às funções da
// fila dentro de clearSession() usa import() dinâmico pelo mesmo motivo.
import type { PendingMutation } from '@/libs/offline/db';

export interface SessionUser {
    id?: string;
    role?: string;
    name?: string;
    email?: string;
    has_personal?: boolean;
    // true para aluno pré-cadastrado pelo personal que ainda não trocou a
    // senha temporária recebida por e-mail (ver /trocar-senha-temporaria).
    must_change_password?: boolean;
    // Vazio quando o personal pré-cadastrou o aluno sem informar CPF — a
    // tela de troca de senha do primeiro login exige completá-lo nesse caso.
    cpf?: string;
}

const TOKEN_KEY = 'token';
const USER_KEY = 'user';
const REFRESH_TOKEN_KEY = 'refresh_token';
const AUTH_COOKIE = 'vf_auth';
const ROLE_COOKIE = 'vf_role';

/**
 * Teto absoluto da sessão (ver RefreshSessionMaxDays no backend): o access
 * token em si dura só 45min, mas é renovado em silêncio pelo heartbeat
 * (ver renewSession em sessionHeartbeat.ts, chamado pelo FCMProvider)
 * enquanto o refresh token continuar válido. O cookie de presença precisa
 * acompanhar esse teto, não a duração curta do access token — senão o
 * middleware trataria o usuário como deslogado no meio de uma sessão que na
 * verdade ainda é válida.
 */
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

/**
 * Prefixo do cache local (localStorage) de "Minhas Anotações" por exercício
 * (ver exerciseAnnotationService.ts). É dado sensível de treino/saúde, então
 * precisa ser limpo no logout como o resto (mesmo motivo do IndexedDB acima).
 */
export const EXERCISE_NOTE_CACHE_PREFIX = 'vf_exercise_note:';

/**
 * Prefixo do cache local (localStorage) da carga ("Peso (KG)") que o aluno
 * definiu por exercício (ver exerciseWeightService.ts). Mesmo motivo do
 * prefixo de anotações acima: dado sensível de treino, precisa ser limpo no
 * logout.
 */
export const EXERCISE_WEIGHT_CACHE_PREFIX = 'vf_exercise_weight:';

/**
 * Prefixo do cache local (localStorage) do timestamp de início do treino
 * (ver workoutSessionTimer.ts), usado para calcular a duração automática.
 * Não é dado sensível de saúde, mas segue o mesmo padrão de higiene dos
 * prefixos acima: limpo no logout para não vazar entre usuários no mesmo
 * dispositivo.
 */
export const WORKOUT_START_CACHE_PREFIX = 'vf_workout_start:';

function setCookie(name: string, value: string, maxAgeSeconds: number): void {
    if (typeof document === 'undefined') return;
    const secure = window.location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAgeSeconds}; SameSite=Lax${secure}`;
}

function deleteCookie(name: string): void {
    if (typeof document === 'undefined') return;
    document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax`;
}

/**
 * Salva a sessão (localStorage + cookies de presença/papel). Chamada tanto
 * no login quanto a cada renovação silenciosa do heartbeat — por isso
 * refreshToken é opcional (o heartbeat sempre passa um; alguns fluxos
 * legados de troca de perfil podem não ter um novo no momento).
 */
export function saveSession(
    token: string,
    user: SessionUser,
    refreshToken?: string,
): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    if (refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    setCookie(AUTH_COOKIE, '1', SESSION_MAX_AGE_SECONDS);
    setCookie(ROLE_COOKIE, String(user.role ?? ''), SESSION_MAX_AGE_SECONDS);
    // Token para o widget de calendário do app Android sincronizar em
    // background (AuthBridge.kt). No navegador comum não faz nada.
    nativeAuthSave(token);
}

export function getRefreshToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(REFRESH_TOKEN_KEY);
}

/**
 * Reenvia o token atual (se houver) para a bridge nativa. Chamada no boot da
 * app (FCMProvider), não só no login/heartbeat — cobre o caso do processo
 * nativo ter sido reiniciado e perdido o último token salvo (ver
 * AuthBridge.kt e WorkoutCalendarSyncWorker).
 */
export function refreshNativeAuthToken(): void {
    if (typeof window === 'undefined') return;
    const token = getToken();
    if (token) nativeAuthSave(token);
}

export function getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(TOKEN_KEY);
}

export function getUser(): SessionUser | null {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
        return JSON.parse(raw) as SessionUser;
    } catch {
        return null;
    }
}

/**
 * Hub de treinos do aluno logado: `/meus-treinos` para quem tem personal
 * vinculado (sistema de macrociclo), `/app` para quem não tem (dashboard
 * legado de protocolo). Usado pelos botões "voltar" nas telas do aluno.
 */
export function getStudentHomeRoute(): string {
    return getUser()?.has_personal ? '/meus-treinos' : '/app';
}

/**
 * Rota de entrada por papel, logo após a autenticação. Usada tanto pelo login
 * quanto pela seleção de perfil (login com CPF de papel duplo), que antes
 * repetiam a mesma cadeia de ternários.
 *
 * Aluno COM personal vinculado entra por `/vitrine` — a página de divulgação da
 * marca do personal. Quem decide se ela aparece é o SERVIDOR: `/vitrine`
 * consulta a API e, se o personal não estiver no plano Pro ou não tiver
 * publicado a página, redireciona na hora para o fluxo atual (Meus Treinos).
 * O cliente não conhece o plano do personal e não deveria conhecer. Aluno sem
 * personal nem passa por lá.
 */
export function landingRouteFor(user: SessionUser): string {
    if (user.role === 'admin' || user.role === 'content_editor') return '/admin';
    if (user.role === 'personal') return '/personal';
    return user.has_personal ? '/vitrine' : '/app';
}

/**
 * Chave de localStorage do resumo de registros de treino que NÃO foram
 * sincronizados a tempo do IndexedDB ser apagado no logout (P-5, spec
 * §5.3/C-11). Guarda só `{date, trainingRef}` — nunca série, carga, RPE,
 * nota ou foto, que são dado de saúde e são de fato apagados. Fica FORA do
 * IndexedDB de propósito, porque o banco que guardaria isso é exatamente o
 * que está sendo destruído.
 *
 * Ninguém lê esta chave ainda — mostrar o aviso ao aluno na próxima sessão
 * é trabalho de outra tarefa (fora do escopo desta sprint); aqui só
 * persistimos o resumo para que essa tarefa futura tenha o que ler.
 */
export const LOST_WORKOUT_SUMMARY_KEY = 'vf_lost_workout_summary';

export interface LostWorkoutSummaryEntry {
    date: string;
    trainingRef: string;
}

/** Extrai `{date, trainingRef}` de mutações que não puderam ser
 * sincronizadas antes do logout apagar a fila. Para `type:'session'`, os
 * dois campos vêm do `sessionBody` (o log ainda nem existe no servidor);
 * para `'complete'`/`'skip'`, não há uma data planejada guardada na
 * mutação, então usamos a data de criação local como aproximação. */
function persistLostWorkoutSummary(mutations: PendingMutation[]): void {
    try {
        const entries: LostWorkoutSummaryEntry[] = mutations.map((m) => {
            if (m.type === 'session' && m.sessionBody) {
                return {
                    date: m.sessionBody.planned_date,
                    trainingRef: m.sessionBody.training_ref,
                };
            }
            return {
                date: m.createdAt.slice(0, 10),
                trainingRef: m.trainingRef ?? '?',
            };
        });
        localStorage.setItem(LOST_WORKOUT_SUMMARY_KEY, JSON.stringify(entries));
    } catch {
        /* melhor-esforço: localStorage cheio/indisponível não pode travar o
         * logout por causa de um aviso que já é, em si, best-effort. */
    }
}

/**
 * Limpa toda a sessão: localStorage, cookies e — importante para LGPD — os
 * dados sensíveis de saúde/treino em cache local (IndexedDB offline e Cache
 * Storage do service worker). Em dispositivo compartilhado, isso evita que o
 * próximo usuário acesse o plano do anterior via DevTools.
 */
let clearSessionInFlight: Promise<void> | null = null;

export function clearSession(): Promise<void> {
    if (typeof window === 'undefined') return Promise.resolve();
    // Reentrância: o flush abaixo chama `processQueue()`, que fala com a API
    // com o access token atual. Se esse token (não só o refresh) também já
    // expirou, CADA requisição da fila volta 401 e o interceptor de api.ts
    // chama `clearSession()` de novo — uma vez por mutação pendente. Sem
    // esta guarda, cada chamada reentrante rodaria seu próprio flush e seu
    // próprio `indexedDB.deleteDatabase()` em paralelo com o da primeira,
    // que ainda está no meio do `Promise.race` de 6s: o banco pode ser
    // apagado no meio de uma leitura/escrita da passada original, a exceção
    // cai no catch "melhor-esforço" abaixo, e o resumo de perda (P-5/D-04)
    // nunca chega a ser persistido — o próprio mecanismo criado para não
    // perder dado em silêncio causaria a perda em silêncio. Reaproveitar a
    // mesma promise (padrão de `refreshInFlight` em api.ts) garante que só
    // a primeira chamada realmente limpa; as demais só esperam o resultado.
    if (clearSessionInFlight) return clearSessionInFlight;
    clearSessionInFlight = runClearSession().finally(() => {
        clearSessionInFlight = null;
    });
    return clearSessionInFlight;
}

async function runClearSession(): Promise<void> {
    // P-5 (spec §5.3, C-11): flush final da fila offline ANTES de apagar
    // qualquer coisa. Precisa rodar aqui, ANTES do
    // `localStorage.removeItem(TOKEN_KEY)` logo abaixo — a instância `Api`
    // (api.ts) lê o token direto do localStorage a cada requisição, então
    // limpar primeiro faria o flush falhar por falta de auth mesmo com o
    // access token ainda válido em memória (o caso que este flush existe
    // para aproveitar: refresh expirado, access token ainda não).
    //
    // Import DINÂMICO de propósito, não estático no topo do arquivo:
    // `syncQueue.ts` -> `workoutLogService.ts` -> `api.ts` -> este mesmo
    // `session.ts` fecharia um ciclo de módulos resolvido na carga inicial
    // do bundle; import() só resolve em runtime, dentro desta função, então
    // o ciclo nunca precisa ser resolvido estaticamente.
    try {
        const [{ getPendingMutations, processQueue }, { countPendingMedia }] = await Promise.all([
            import('@/libs/offline/syncQueue'),
            import('@/libs/offline/db'),
        ]);

        const [mutationsBefore, mediaBefore] = await Promise.all([
            getPendingMutations(),
            countPendingMedia(),
        ]);

        if (mutationsBefore.length + mediaBefore > 0) {
            if (navigator.onLine) {
                // Timeout curto: não travar o logout esperando uma rede
                // lenta ou uma tentativa que nunca resolve — é
                // best-effort, não uma garantia.
                await Promise.race([
                    processQueue(),
                    new Promise<void>((resolve) => setTimeout(resolve, 6000)),
                ]);
            }

            const stillPending = await getPendingMutations();
            if (stillPending.length > 0) {
                // Perda informada, nunca silenciosa (D-04/P-5): o aluno
                // não sabe ainda, mas o dado para avisá-lo depois existe.
                persistLostWorkoutSummary(stillPending);
            }
        }
    } catch {
        /* melhor-esforço: se o flush falhar por qualquer motivo (ambiente
         * sem IndexedDB, import falhando, etc.), o logout segue normalmente
         * — nunca bloquear o aluno por causa desta tentativa extra. */
    }

    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    deleteCookie(AUTH_COOKIE);
    deleteCookie(ROLE_COOKIE);
    nativeAuthClear();

    // Anotações e carga de exercício cacheadas localmente (dado sensível de treino)
    for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (
            key?.startsWith(EXERCISE_NOTE_CACHE_PREFIX) ||
            key?.startsWith(EXERCISE_WEIGHT_CACHE_PREFIX) ||
            key?.startsWith(WORKOUT_START_CACHE_PREFIX)
        ) {
            localStorage.removeItem(key);
        }
    }

    // IndexedDB offline (planos de treino, mutações pendentes)
    try {
        if (window.indexedDB) {
            await new Promise<void>((resolve) => {
                const req = indexedDB.deleteDatabase('venafit-offline');
                req.onsuccess = req.onerror = req.onblocked = () => resolve();
            });
        }
    } catch {
        /* melhor-esforço: não bloquear o logout por falha de limpeza */
    }

    // Cache Storage do service worker (respostas cacheadas)
    try {
        if ('caches' in window) {
            const keys = await caches.keys();
            await Promise.all(keys.map((k) => caches.delete(k)));
        }
    } catch {
        /* melhor-esforço */
    }
}
