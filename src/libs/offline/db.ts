import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { ExerciseRequest, MacrocycleResponse } from '@/libs/planningService';
import { CompleteWorkoutLogRequest, WorkoutSessionRequest } from '@/libs/workoutLogService';

const DB_NAME = 'venafit-offline';
// v1 -> v2: acrescenta a store `pendingMedia` (Sprint 4 vai escrever nela;
// aqui só o schema) e os campos novos de `pendingMutations` (idempotência,
// backoff, corpo de sessão).
// v2 -> v3: acrescenta `pendingPrescriptionPatches` — fila do PERSONAL (edição
// de série/carga pelo card do exercício, ver prescriptionQueue.ts). Store
// própria, não reaproveita `pendingMutations`: aquela fila é do ALUNO
// (workoutLogId, conclusão/pular treino), esta é do personal (mesocycleId,
// substituição de exercício) — payloads e endpoint diferentes.
// Nenhuma store existente é recriada em nenhum dos dois bumps — o guard
// `if (!db.objectStoreNames.contains(...))` por store já torna o bump
// idempotente e preserva os dados de quem atualiza o app com a fila cheia.
const DB_VERSION = 3;

export interface StoredMacrocycle {
    id: string;
    data: MacrocycleResponse;
    serverUpdatedAt: string;
    downloadedAt: string;
}

/** Log de treino "pending" pré-criado online, para permitir completar/pular
 * offline sem precisar de um create-then-complete em duas chamadas. */
export interface PendingWorkoutLogId {
    key: string; // `${microcycleId}:${trainingRef}`
    microcycleId: string;
    trainingRef: string;
    logId: string;
}

export type PendingMutationType = 'complete' | 'skip' | 'session';

export interface PendingMutation {
    id?: number;
    type: PendingMutationType;
    createdAt: string;
    studentId: string;
    planningId: string;
    mesocycleId: string;
    microcycleId: string;
    workoutLogId: string;
    completeBody?: CompleteWorkoutLogRequest;
    skipReason?: string;
    /** UUID v4 gerado com `crypto.randomUUID()` no momento em que a mutação é
     *  criada, e NUNCA regenerado num retry — é a chave de idempotência que o
     *  servidor usa em `client_mutation_id` para reconhecer o reenvio de uma
     *  resposta perdida (C-1) sem duplicar o registro. Opcional só para não
     *  quebrar o tipo de mutações 'complete'/'skip' já gravadas antes desta
     *  sprint, que nunca tiveram esse campo. */
    clientMutationId?: string;
    /** Corpo completo de POST .../workout-log/session, para type 'session'.
     *  Análogo a `completeBody` acima, mas para o endpoint novo que
     *  cria-ou-conclui numa chamada só (sem depender de log pré-criado). */
    sessionBody?: WorkoutSessionRequest;
    status: 'pending' | 'syncing' | 'failed';
    retryCount: number;
    /** ISO. A fila só tenta reenviar esta linha quando `Date.now()` já passou
     *  deste instante — implementa o backoff exponencial (spec §4.3).
     *  Ausente/vazio = elegível imediatamente. */
    nextAttemptAt?: string;
    /** Referência do treino (A/B/C/D), só para exibição na UI de pendências —
     *  existe porque `workoutLogId` pode não existir ainda para type
     *  'session' na primeira tentativa (o log só é criado no servidor). */
    trainingRef?: string;
    lastError?: string;
    /** ISO da primeira vez que esta linha virou `status:'failed'` (RN-40).
     *  Preservado entre retentativas que falham de novo — a expiração de
     *  45 dias conta a partir daqui, nunca da falha mais recente. */
    firstFailedAt?: string;
}

/** Mídia (foto de check-in) pendente de upload — Sprint 4 (mediaQueue.ts).
 *
 * O campo original desta store era `mutationId: number` (id local da linha
 * em `pendingMutations`), mas essa referência não sobrevive ao sucesso da
 * sincronização: a linha é APAGADA de `pendingMutations` assim que o
 * servidor confirma, e o upload da foto normalmente só começa depois disso
 * (precisa do `logId` real, que só existe quando o log já sincronizou).
 * Por isso a ligação é feita por `clientMutationId` (o UUID estável que
 * `enqueueSession` gera e nunca regenera) contra o mapeamento gravado em
 * `meta` por `setResolvedSessionLogId` — sobrevive à linha de
 * `pendingMutations` já ter sumido. Quando o chamador já tem o ID real na
 * hora de enfileirar (ex.: log pré-existente, fora do fluxo de sessão
 * offline), `logId` é preenchido direto e `clientMutationId` fica de fora. */
export interface PendingMedia {
    id?: number;
    blob: Blob;
    /** Sempre 'image/jpeg' hoje — compressImageToBlob sempre reexporta como
     * JPEG, mas o campo existe explícito para não hardcodar o content-type
     * do PUT/POST em vários lugares de mediaQueue.ts. */
    contentType: string;
    createdAt: string;
    status: 'pending' | 'uploading' | 'failed';
    retryCount: number;
    /** Mesmo backoff exponencial com jitter de `pendingMutations` (spec
     * §4.3) — ver computeNextAttemptAt em syncQueue.ts, reaproveitado por
     * mediaQueue.ts em vez de reimplementado. */
    nextAttemptAt?: string;
    lastError?: string;
    /** ISO da primeira vez que esta linha virou 'failed' — mesma política de
     * expiração de 45 dias de `pendingMutations` (RN-40), reaproveitada por
     * mediaQueue.ts. */
    firstFailedAt?: string;
    studentId: string;
    planningId: string;
    mesocycleId: string;
    microcycleId: string;
    /** ID real do log no servidor, quando já conhecido no momento de
     * enfileirar (ver comentário da interface acima). */
    logId?: string;
    /** Presente quando `logId` ainda não existe: o mesmo `client_mutation_id`
     * usado na sessão correspondente em `pendingMutations`/`sessionBody`.
     * mediaQueue.ts resolve para um `logId` real assim que syncQueue.ts
     * sincronizar aquela sessão especificamente. */
    clientMutationId?: string;
}

/**
 * Edição de série/carga do PERSONAL (`ExerciseDetailCard` no editor de
 * periodização) feita sem rede. Guarda a INTENÇÃO (qual exercício, qual
 * patch), não um retrato do macrociclo — ao sincronizar, `prescriptionQueue.ts`
 * busca a fase atual no servidor e aplica o patch em cima dela, em vez de
 * reenviar um payload velho que poderia sobrescrever o que mudou nesse meio
 * tempo (outro card salvo, ou o status do microciclo avançando por causa de
 * treinos que o aluno concluiu enquanto o personal estava offline).
 */
export interface PendingPrescriptionPatch {
    id?: number;
    createdAt: string;
    studentId: string;
    /** ID do macrociclo (o path da API chama de "planningId"). */
    planningId: string;
    mesocycleId: string;
    trainingId: string;
    exerciseId: string;
    /** Só para exibição no badge de pendências — não é reenviado. */
    exerciseName: string;
    /** `{ load_kg }` ou `{ series, series_label, timed }` — ver
     * onPrescribeWeight/onPrescribeSeries em ExerciseDetailCard.tsx. */
    patch: Partial<ExerciseRequest>;
    status: 'pending' | 'syncing' | 'failed';
    retryCount: number;
    /** Mesmo backoff exponencial com jitter de pendingMutations (ver
     * computeNextAttemptAt em syncQueue.ts, reaproveitado por
     * prescriptionQueue.ts). */
    nextAttemptAt?: string;
    lastError?: string;
    /** ISO da primeira vez que esta linha virou 'failed' — mesma política de
     * expiração de 45 dias de pendingMutations (RN-40), reaproveitada. */
    firstFailedAt?: string;
}

interface VenafitOfflineDB extends DBSchema {
    macrocycles: {
        key: string;
        value: StoredMacrocycle;
    };
    pendingWorkoutLogIds: {
        key: string;
        value: PendingWorkoutLogId;
    };
    pendingMutations: {
        key: number;
        value: PendingMutation;
    };
    pendingMedia: {
        key: number;
        value: PendingMedia;
    };
    pendingPrescriptionPatches: {
        key: number;
        value: PendingPrescriptionPatch;
    };
    meta: {
        key: string;
        value: unknown;
    };
}

let dbPromise: Promise<IDBPDatabase<VenafitOfflineDB>> | null = null;

/** O banco offline não pôde ser aberto. Tipada (em vez de um `Error` solto)
 *  porque a tela de registro de treino precisa distinguir este caso de uma
 *  falha qualquer: aqui "tente de novo" não resolve sozinho — o aluno tem de
 *  fechar a outra aba, ou sair do modo privado. */
export class OfflineDBUnavailableError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'OfflineDBUnavailableError';
    }
}

/** Prazo máximo para abrir o banco. `openDB` NÃO rejeita quando a abertura é
 *  bloqueada: se outra aba (ou o mesmo app aberto duas vezes) ainda segura uma
 *  conexão numa versão antiga do banco, o evento é `blocked` e a Promise fica
 *  pendurada para sempre. Como o botão "Confirmar" do check-in espera por este
 *  `await`, isso aparecia para o aluno como carregamento infinito, sem
 *  mensagem nenhuma. Com prazo vira um erro tratável — e a próxima tentativa
 *  reabre do zero, porque `dbPromise` é limpo em caso de falha. */
const DB_OPEN_TIMEOUT_MS = 10000;

export function getOfflineDB(): Promise<IDBPDatabase<VenafitOfflineDB>> {
    if (typeof window === 'undefined') {
        return Promise.reject(new Error('IndexedDB só está disponível no client.'));
    }
    if (!dbPromise) {
        const opening = openDB<VenafitOfflineDB>(DB_NAME, DB_VERSION, {
            upgrade(db) {
                if (!db.objectStoreNames.contains('macrocycles')) {
                    db.createObjectStore('macrocycles', { keyPath: 'id' });
                }
                if (!db.objectStoreNames.contains('pendingWorkoutLogIds')) {
                    db.createObjectStore('pendingWorkoutLogIds', { keyPath: 'key' });
                }
                if (!db.objectStoreNames.contains('pendingMutations')) {
                    db.createObjectStore('pendingMutations', {
                        keyPath: 'id',
                        autoIncrement: true,
                    });
                }
                // Nova em v2 (Sprint 3). A guarda de existência é a mesma
                // usada pelas stores acima — quem já está na v1 ganha só esta
                // store nova ao abrir a v2; ninguém perde dado.
                if (!db.objectStoreNames.contains('pendingMedia')) {
                    db.createObjectStore('pendingMedia', {
                        keyPath: 'id',
                        autoIncrement: true,
                    });
                }
                // Nova em v3. Mesmo guard das demais.
                if (!db.objectStoreNames.contains('pendingPrescriptionPatches')) {
                    db.createObjectStore('pendingPrescriptionPatches', {
                        keyPath: 'id',
                        autoIncrement: true,
                    });
                }
                if (!db.objectStoreNames.contains('meta')) {
                    db.createObjectStore('meta');
                }
            },
            // Outra conexão antiga está impedindo o upgrade desta. Só dá para
            // registrar: quem precisa fechar é a OUTRA aba (ver `blocking`).
            blocked() {
                console.warn(
                    '[offlineDB] Abertura bloqueada por outra aba do Venafit numa versão antiga do banco.',
                );
            },
            // Nós é que estamos segurando: outra aba pediu o upgrade. Fecha
            // esta conexão para destravá-la e esquece o singleton, para que a
            // próxima chamada reabra já na versão nova em vez de reutilizar
            // uma conexão fechada (que só lançaria InvalidStateError).
            blocking(_currentVersion, _blockedVersion, event) {
                // `event.target` é a conexão crua (IDBDatabase) por trás do
                // wrapper do idb — fechá-la é o que libera o upgrade da outra aba.
                (event.target as IDBDatabase | null)?.close();
                dbPromise = null;
            },
            // Conexão derrubada pelo navegador (aba em segundo plano com
            // pouca memória, dados do site limpos): o singleton aponta para
            // algo morto, então zera para reabrir na próxima chamada.
            terminated() {
                dbPromise = null;
            },
        });

        let timer: ReturnType<typeof setTimeout>;
        const guarded = Promise.race([
            opening,
            new Promise<never>((_, rejectOpen) => {
                timer = setTimeout(
                    () =>
                        rejectOpen(
                            new OfflineDBUnavailableError(
                                'Tempo esgotado ao abrir o armazenamento offline. Se o Venafit estiver aberto em outra aba, feche-a e tente de novo.',
                            ),
                        ),
                    DB_OPEN_TIMEOUT_MS,
                );
            }),
        ]).finally(() => clearTimeout(timer));

        dbPromise = guarded.catch((err) => {
            // Sem isto, uma falha momentânea ficaria guardada no singleton e
            // TODA chamada seguinte falharia igual, até recarregar o app.
            dbPromise = null;
            if (err instanceof OfflineDBUnavailableError) throw err;
            // Navegador em modo privado, armazenamento bloqueado pelo usuário,
            // banco corrompido: tudo chega aqui como um erro genérico do
            // IndexedDB, que não diz nada a quem está olhando a tela.
            throw new OfflineDBUnavailableError(
                'Não foi possível abrir o armazenamento offline deste navegador. Verifique se o armazenamento de dados do site está liberado.',
            );
        });
    }
    return dbPromise;
}

export function pendingWorkoutLogKey(microcycleId: string, trainingRef: string): string {
    return `${microcycleId}:${trainingRef}`;
}

/** Conta os registros em `pendingMedia`. Usado pelo flush final de
 * `clearSession()` (S3.4) para decidir se vale a pena tentar sincronizar
 * antes de apagar o banco. */
export async function countPendingMedia(): Promise<number> {
    const db = await getOfflineDB();
    return db.count('pendingMedia');
}

// ── Mapeamento clientMutationId -> logId real (Sprint 4 / mediaQueue.ts) ──
//
// Guardado na store `meta` (chave/valor livre, já existente) em vez de mais
// uma store dedicada: é só uma string por sessão, sem necessidade de índice
// nem de outra guarda de upgrade. Prefixo evita colidir com outras chaves
// que `meta` venha a ganhar no futuro.
const SESSION_LOG_ID_PREFIX = 'sessionLogId:';

/** Chamado por syncQueue.ts assim que uma mutação `type:'session'` sincroniza
 * com sucesso (ou é reconhecida via 409 idempotente) — grava o `logId` real
 * que o servidor atribuiu, para mediaQueue.ts encontrar depois. Sobrevive à
 * linha de `pendingMutations` já ter sido apagada (é exatamente o caso
 * normal: a foto só começa a subir DEPOIS que a sessão já sincronizou). */
export async function setResolvedSessionLogId(
    db: Awaited<ReturnType<typeof getOfflineDB>>,
    clientMutationId: string,
    logId: string,
): Promise<void> {
    await db.put('meta', logId, `${SESSION_LOG_ID_PREFIX}${clientMutationId}`);
}

export async function getResolvedSessionLogId(
    db: Awaited<ReturnType<typeof getOfflineDB>>,
    clientMutationId: string,
): Promise<string | undefined> {
    const value = await db.get('meta', `${SESSION_LOG_ID_PREFIX}${clientMutationId}`);
    return typeof value === 'string' ? value : undefined;
}

/** Limpeza best-effort depois que mediaQueue.ts termina de usar o
 * mapeamento (foto confirmada, ou descartada de vez) — evita que `meta`
 * cresça sem limite ao longo dos anos. Não é crítico se falhar ou nunca for
 * chamado: são só strings pequenas, não é o tipo de vazamento que preocupa
 * (diferente do banco inteiro por LGPD, que é apagado por `clearSession`). */
export async function deleteResolvedSessionLogId(
    db: Awaited<ReturnType<typeof getOfflineDB>>,
    clientMutationId: string,
): Promise<void> {
    await db.delete('meta', `${SESSION_LOG_ID_PREFIX}${clientMutationId}`);
}
