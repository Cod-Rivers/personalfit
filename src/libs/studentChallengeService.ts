import { Api } from '@/libs/api';

/**
 * Cliente do "Desafio entre Alunos" (competitivo, entre alunos já vinculados
 * ao personal) — não confundir com `challengeService.ts`, que é o desafio de
 * CAPTAÇÃO DE LEADS (link público, sem vínculo, sem consentimento revogável).
 * São dois sistemas paralelos de propósito, ver plano da feature.
 */

export type StudentChallengeStatus = 'active' | 'finished';

export type StudentChallengeParticipantStatus =
    | 'invited'
    | 'active'
    | 'declined'
    | 'opted_out';

export interface StudentChallengeParticipant {
    student_id: string;
    name: string;
    status: StudentChallengeParticipantStatus;
    invited_at: string;
    consented_at: string | null;
    consent_version: string | null;
    declined_at: string | null;
    opted_out_at: string | null;
}

export interface StudentChallenge {
    id: string;
    personal_id: string;
    name: string;
    description: string;
    start_date: string;
    end_date: string;
    status: StudentChallengeStatus;
    participants: StudentChallengeParticipant[];
    created_at: string;
}

export interface LeaderboardEntry {
    rank: number;
    student_id: string;
    name: string;
    /** Data-URI já pronta — não precisa (nem deve) ser resolvida no cliente. */
    avatar_url?: string;
    current_streak: number;
    longest_streak: number;
    total_qualifying_days: number;
    /** URL assinada já resolvida pelo servidor; `null` se ninguém no ranking
     * anexou foto de check-in ainda. */
    latest_photo_url: string | null;
    latest_photo_at: string | null;
    /** Marca a linha do próprio usuário logado, quando ele está no ranking. */
    is_self: boolean;
}

export interface StudentChallengeLeaderboard {
    challenge_id: string;
    entries: LeaderboardEntry[];
}

export interface CreateStudentChallengePayload {
    name: string;
    description?: string;
    start_date: string; // YYYY-MM-DD
    end_date: string; // YYYY-MM-DD
    /** Já convida estes alunos ao criar, sem precisar de uma segunda chamada. */
    student_ids?: string[];
}

export interface AcceptStudentChallengeInvitePayload {
    consent: boolean;
    consent_version: string;
}

/** Versão vigente do texto de consentimento mostrado no modal de aceite. */
export const STUDENT_CHALLENGE_CONSENT_VERSION = 'v1';

/* ── Personal ── */

export async function createStudentChallenge(
    payload: CreateStudentChallengePayload,
): Promise<StudentChallenge> {
    const { data } = await Api.post<StudentChallenge>(
        '/student-challenges',
        payload,
    );
    return data;
}

export async function listStudentChallenges(): Promise<StudentChallenge[]> {
    const { data } = await Api.get<StudentChallenge[]>('/student-challenges');
    return data;
}

export async function getStudentChallenge(
    id: string,
): Promise<StudentChallenge> {
    const { data } = await Api.get<StudentChallenge>(
        `/student-challenges/${id}`,
    );
    return data;
}

export async function inviteStudents(
    id: string,
    studentIds: string[],
): Promise<StudentChallenge> {
    const { data } = await Api.post<StudentChallenge>(
        `/student-challenges/${id}/invite`,
        { student_ids: studentIds },
    );
    return data;
}

export async function endStudentChallenge(
    id: string,
): Promise<StudentChallenge> {
    const { data } = await Api.patch<StudentChallenge>(
        `/student-challenges/${id}/end`,
    );
    return data;
}

export async function deleteStudentChallenge(id: string): Promise<void> {
    await Api.delete(`/student-challenges/${id}`);
}

/** Mural na visão do personal (vê todos os participantes ativos). */
export async function getLeaderboard(
    id: string,
): Promise<StudentChallengeLeaderboard> {
    const { data } = await Api.get<StudentChallengeLeaderboard>(
        `/student-challenges/${id}/leaderboard`,
    );
    return data;
}

/* ── Aluno ── */

/** Convites pendentes + desafios em que o aluno logado já é participante ativo. */
export async function listMyStudentChallenges(): Promise<StudentChallenge[]> {
    const { data } = await Api.get<StudentChallenge[]>(
        '/me/student-challenges',
    );
    return data;
}

export async function acceptStudentChallengeInvite(
    id: string,
    payload: AcceptStudentChallengeInvitePayload,
): Promise<StudentChallenge> {
    const { data } = await Api.post<StudentChallenge>(
        `/me/student-challenges/${id}/accept`,
        payload,
    );
    return data;
}

export async function declineStudentChallengeInvite(
    id: string,
): Promise<void> {
    await Api.post(`/me/student-challenges/${id}/decline`);
}

/** Sai do desafio — revoga o consentimento e para a exposição de dado
 * imediatamente. Ação irreversível: o aluno precisa ser convidado de novo
 * para voltar a participar. */
export async function optOutStudentChallenge(id: string): Promise<void> {
    await Api.post(`/me/student-challenges/${id}/opt-out`);
}

/** Mural na visão do aluno participante (inclui `is_self` na própria linha). */
export async function getMyLeaderboard(
    id: string,
): Promise<StudentChallengeLeaderboard> {
    const { data } = await Api.get<StudentChallengeLeaderboard>(
        `/me/student-challenges/${id}/leaderboard`,
    );
    return data;
}
