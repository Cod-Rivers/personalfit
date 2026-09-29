import { Api } from '@/libs/api';
import { isValidLogWindow, type LogWindow } from '@/libs/logWindow';

export interface LogWindowResponse {
    log_window: LogWindow;
    /** Veio de EffectiveLogWindow() no backend, não de uma escolha explícita
     * do personal — ver dtos.LogWindowResponse.IsDefault (RN-02). */
    is_default: boolean;
    updated_at?: string;
    /** Foto de check-in ligada no servidor (ADHERENCE_PHOTO_ENABLED). Só vem
     * no GET /me/log-window; ausente em backend anterior ao campo. */
    photo_enabled?: boolean;
    /** Comentário pós-treino ligado no servidor (WORKOUT_COMMENTS_ENABLED).
     * Ausente em backend anterior ao campo — o check-in trata como ligado. */
    comments_enabled?: boolean;
    /** O personal do aluno usa o relatório de acompanhamento com IA e o aluno
     * não saiu dele: o check-in avisa que o comentário pode entrar na
     * leitura por IA (D10). */
    ai_report_enabled?: boolean;
    /** Primeiro nome do personal com vínculo ativo, para "Mensagem para Ana"
     * funcionar offline. */
    personal_name?: string;
}

/**
 * Lê a janela de registro atual de um aluno vinculado.
 *
 * ATENÇÃO — gap conhecido do backend: só existe `PUT /students/:id/log-window`
 * (personal) e `GET /me/log-window` (o próprio aluno). Não há hoje uma rota
 * GET equivalente para o personal consultar a janela de UM aluno específico
 * antes de editá-la (LogWindowPersonalRoutes só registra o PUT — ver
 * log-window-controller.go). Esta função já chama a rota simétrica que
 * deveria existir; enquanto ela não for criada pelo sync-engineer, todo GET
 * aqui volta 404 e quem chama (LogWindowSettings) degrada para o default
 * (48h) em vez de travar a tela.
 */
export async function getStudentLogWindow(
    studentId: string,
): Promise<LogWindowResponse> {
    const { data } = await Api.get<LogWindowResponse>(
        `/students/${studentId}/log-window`,
    );
    return data;
}

/** Define a janela de registro de um aluno vinculado. Só o personal chama
 * isto — o aluno nunca altera a própria janela (RN-08). */
export async function updateStudentLogWindow(
    studentId: string,
    logWindow: LogWindow,
): Promise<LogWindowResponse> {
    const { data } = await Api.put<LogWindowResponse>(
        `/students/${studentId}/log-window`,
        { log_window: logWindow },
    );
    return data;
}

/* ── Janela do PRÓPRIO aluno (S4.4, aviso de tardio no check-in) ──
 *
 * O aviso de tardio (RN-39) precisa funcionar OFFLINE — é literalmente o
 * caso de uso da feature. Como o projeto não tem nenhum cache local
 * genérico para config pouco mutável (não existe precedente parecido em
 * session.ts nem em outro lugar), um `localStorage` simples com timestamp de
 * busca é o suficiente aqui: não precisa expirar, invalidar em background
 * nem sincronizar entre abas — só sobreviver a "o aluno está sem sinal
 * agora e concluiu o cache antes". */

const MY_LOG_WINDOW_CACHE_KEY = 'venafit:my-log-window';

export interface CachedMyLogWindow {
    log_window: LogWindow;
    is_default: boolean;
    /** Ver LogWindowResponse.photo_enabled. */
    photo_enabled?: boolean;
    /** Ver LogWindowResponse (comentário pós-treino). */
    comments_enabled?: boolean;
    ai_report_enabled?: boolean;
    personal_name?: string;
    fetchedAt: string;
}

/** A foto de check-in só some quando o servidor disse EXPLICITAMENTE que ela
 * está desligada. Sem cache (aparelho novo) ou com backend antigo, sem o
 * campo, a opção continua aparecendo — o comportamento de sempre, e o envio
 * da foto nunca bloqueia o registro do treino. */
export function isCheckInPhotoEnabled(
    cached: Pick<CachedMyLogWindow, 'photo_enabled'> | null,
): boolean {
    return cached?.photo_enabled !== false;
}

/** O comentário pós-treino some só quando o servidor disse EXPLICITAMENTE que
 * está desligado — mesma regra da foto. */
export function isCheckInCommentEnabled(
    cached: Pick<CachedMyLogWindow, 'comments_enabled'> | null,
): boolean {
    return cached?.comments_enabled !== false;
}

function cacheMyLogWindow(data: LogWindowResponse): void {
    if (typeof window === 'undefined') return;
    try {
        const cached: CachedMyLogWindow = {
            log_window: data.log_window,
            is_default: data.is_default,
            photo_enabled: data.photo_enabled,
            comments_enabled: data.comments_enabled,
            ai_report_enabled: data.ai_report_enabled,
            personal_name: data.personal_name,
            fetchedAt: new Date().toISOString(),
        };
        window.localStorage.setItem(
            MY_LOG_WINDOW_CACHE_KEY,
            JSON.stringify(cached),
        );
    } catch {
        // localStorage indisponível ou cheio — o cache é só uma conveniência
        // para o aviso offline de tardio (RN-39); sem ele o aviso apenas não
        // aparece, o check-in em si não depende disto.
    }
}

/** Consulta a própria janela de registro (GET /me/log-window) e atualiza o
 * cache local para uso offline por `getCachedMyLogWindow`. Chame em segundo
 * plano sempre que houver oportunidade (ex.: ao abrir a lista de treinos,
 * ou ao entrar no passo de check-in já online) — nunca é pré-condição para
 * nada, só mantém o cache fresco para a PRÓXIMA vez que faltar rede. */
export async function getMyLogWindow(): Promise<LogWindowResponse> {
    const { data } = await Api.get<LogWindowResponse>('/me/log-window');
    cacheMyLogWindow(data);
    return data;
}

/** Lê a janela cacheada localmente, SEM rede — é o que o passo de check-in
 * usa para estimar o aviso de tardio (RN-39) mesmo sem sinal. `null` quando
 * nunca foi buscada neste aparelho (aluno nunca abriu nada que chamasse
 * `getMyLogWindow` online, ou o storage foi limpo) — quem chama decide o
 * fallback (hoje: assume o default 48h, mesma regra do backend). */
export function getCachedMyLogWindow(): CachedMyLogWindow | null {
    if (typeof window === 'undefined') return null;
    try {
        const raw = window.localStorage.getItem(MY_LOG_WINDOW_CACHE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as CachedMyLogWindow;
        if (!isValidLogWindow(parsed.log_window)) return null;
        return parsed;
    } catch {
        return null;
    }
}
