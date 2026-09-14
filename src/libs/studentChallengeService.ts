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

/** Modalidade do desafio. Documento antigo não tem o campo — `challengeMode()`
 * resolve para `individual`, que é o comportamento de sempre.
 *
 * `individual_multi` é um ranking individual único somando os alunos de
 * todos os personais: quem disputa é o aluno, e a carteira dele é só uma
 * etiqueta ao lado do nome. É o que a separa de `teams`, onde quem disputa é
 * a carteira e a pontuação é corrigida pelo tamanho dela. */
export type StudentChallengeMode =
    | 'individual'
    | 'individual_multi'
    | 'teams'
    | 'collaborative';

export type StudentChallengePersonalRole = 'owner' | 'member';

/** Papel do personal logado neste desafio. `invited` = ainda não aceitou o
 * convite; vazio = visão do aluno (ou desafio antigo, anterior ao roster). */
export type StudentChallengeMyRole =
    | StudentChallengePersonalRole
    | 'invited'
    | '';

export type StudentChallengePersonalStatus =
    | 'invited'
    | 'accepted'
    | 'declined'
    | 'left';

/** Um personal no roster do desafio. `team_name` vazio -> a UI usa `name`. */
export interface StudentChallengePersonal {
    personal_id: string;
    name?: string;
    role: StudentChallengePersonalRole;
    status: StudentChallengePersonalStatus;
    team_name?: string;
    invited_at: string;
    accepted_at?: string;
    declined_at?: string;
    left_at?: string;
    is_self: boolean;
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

    /* ── Multi-personal ──
     * Todos os campos abaixo são novos. Um desafio gravado antes da feature
     * responde com os defaults derivados pelo backend, mas o front NUNCA lê
     * nenhum deles direto: usa os helpers logo abaixo, que toleram ausência
     * (resposta de cache do service worker, backend em rollout, mock antigo). */
    mode: StudentChallengeMode;
    is_multi_personal: boolean;
    /** 'v1' (single-personal) ou 'v2' (multi-personal). */
    required_consent_version: string;
    /** Só na visão do ALUNO: consentimento vigente não cobre o escopo atual. */
    needs_reconsent: boolean;
    /** Quantos alunos ativos sairiam do mural se o desafio virasse multi. */
    students_requiring_reconsent: number;
    /** Papel do personal logado. Vazio na visão do aluno. */
    my_role: StudentChallengeMyRole;
    collaborative_goal?: number;
    goal_reached_at?: string;
    /** personal_id alvo de uma oferta de transferência de titularidade. */
    pending_owner_transfer_to?: string;
    personals: StudentChallengePersonal[];
    /** Total real — `participants` pode vir filtrado pelo escopo do leitor. */
    participants_count: number;

    /* ── Antifraude / motivação ──
     * Todos opcionais: um servidor com ADHERENCE_ANTIFRAUD_ENABLED desligado
     * simplesmente não os envia, e nenhuma tela pode quebrar por isso. */
    /** Configuração de antifraude. Só vem na visão do PROFISSIONAL. */
    anti_fraud?: {
        enabled: boolean;
        pose_enabled: boolean;
        deck_id?: string;
        count_policy: 'trust' | 'strict';
        auto_accept_after_hours: number;
    };
    /** O aluno precisa fazer a pose do dia ao registrar o treino. */
    pose_required?: boolean;
    /** Prêmio prometido. Visível também a quem só foi convidado: é o
     * argumento de aceite do convite. */
    prize?: {
        title: string;
        description?: string;
        image_url?: string;
        positions: number;
        awarded_to?: string[];
        awarded_at?: string;
        award_note?: string;
        delivery_pending: boolean;
    };
    /** Existe material exclusivo (treino geral, guia alimentar ou grupo). */
    has_exclusive_content?: boolean;
    /** Primeiro link de grupo/rede, repetido pelo servidor para os clientes
     * em cache que ainda não conhecem `groups`. Só vem para quem PODE vê-lo —
     * o convidado recebe `undefined` mesmo quando o desafio tem grupo. */
    group?: ChallengeGroupLink;
    /** Lista completa (WhatsApp, Telegram, Instagram), mesmo portão de
     * visibilidade de `group`. */
    groups?: ChallengeGroupLink[];
}

export interface ChallengeGroupLink {
    platform: 'whatsapp' | 'telegram' | 'instagram';
    url: string;
    note?: string;
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
    /** Equipe (= personal) do participante. Ausente em desafio individual. */
    team_id?: string;
    team_name?: string;
}

/** Pontuação de uma equipe (= um personal + os alunos que ele inscreveu).
 * `score` é o valor AJUSTADO, que classifica; `raw_rate` é a taxa bruta, que
 * a UI é obrigada a exibir junto (ver seção 6.2 do plano). */
export interface TeamScore {
    personal_id: string;
    /** Nome do personal. */
    name?: string;
    /** Apelido da equipe; vazio -> usar `name`. */
    team_name?: string;
    /** 0 = sem colocação (equipe fora de classificação). */
    rank: number;
    eligible: boolean;
    /** 0..100, uma casa decimal — é o que CLASSIFICA. */
    score: number;
    /** 0..100 — taxa bruta, sem ajuste. */
    raw_rate: number;
    active_count: number;
    total_days: number;
    contributors: number;
    is_self: boolean;
}

/** Progresso da meta coletiva (modo `collaborative`). */
export interface CollaborativeProgress {
    goal: number;
    progress: number;
    percent: number;
    surplus: number;
    reached: boolean;
    pace: number;
    remaining_days: number;
    projected: number;
    has_projection: boolean;
    elapsed_days: number;
}

export interface StudentChallengeLeaderboard {
    challenge_id: string;
    entries: LeaderboardEntry[];
    /* ── Campos novos; ausentes em desafio individual/antigo. ── */
    mode: StudentChallengeMode;
    window_days: number;
    /** Presente só no modo `teams`. */
    teams?: TeamScore[];
    /** Presente só no modo `collaborative`. */
    collaborative?: CollaborativeProgress;
}

export interface CreateStudentChallengePayload {
    name: string;
    description?: string;
    start_date: string; // YYYY-MM-DD
    end_date: string; // YYYY-MM-DD
    /** Já convida estes alunos ao criar, sem precisar de uma segunda chamada. */
    student_ids?: string[];
    /** Ausente -> `individual`, o comportamento de sempre. */
    mode?: StudentChallengeMode;
    /** Obrigatório quando `mode === 'collaborative'`. */
    collaborative_goal?: number;
}

export interface AcceptStudentChallengeInvitePayload {
    consent: boolean;
    consent_version: string;
}

/** Consentimento para desafio de UM personal: foto e sequência visíveis aos
 * colegas da mesma carteira e ao personal organizador. */
export const STUDENT_CHALLENGE_CONSENT_V1 = 'v1';

/** Consentimento para desafio MULTI-PERSONAL: além do escopo de `v1`, os
 * mesmos dados ficam visíveis a alunos de outras carteiras e aos demais
 * personais participantes, listados nominalmente no modal. */
export const STUDENT_CHALLENGE_CONSENT_V2 = 'v2';

/** Versão de consentimento que este desafio exige agora. Tolera o campo
 * ausente (documento antigo / resposta de backend anterior à feature). */
export function requiredConsentVersion(challenge: StudentChallenge): string {
    return challenge.required_consent_version || STUDENT_CHALLENGE_CONSENT_V1;
}

/* ── Acessores tolerantes a campo ausente ──
 * Um desafio criado antes da feature não tem `mode`, `personals` nem
 * `participants_count`. Tudo que renderiza precisa passar por aqui para que
 * esse desafio continue idêntico ao que era. */

export function challengeMode(
    challenge: StudentChallenge,
): StudentChallengeMode {
    return challenge.mode || 'individual';
}

/** Modalidades que reúnem alunos de mais de uma carteira. Todas exigem PRO do
 * organizador e disparam o consentimento v2 assim que um segundo personal
 * aceita — o gate real é o backend, isto aqui só evita oferecer ao personal
 * gratuito uma modalidade que ele receberia 402 ao salvar. */
export function isMultiPersonalMode(mode: StudentChallengeMode): boolean {
    return mode !== 'individual';
}

export function challengePersonals(
    challenge: StudentChallenge,
): StudentChallengePersonal[] {
    return challenge.personals ?? [];
}

/** Só os personais que de fato aceitaram — é esta lista que o modal de
 * consentimento `v2` precisa mostrar nominalmente ao aluno. */
export function acceptedPersonals(
    challenge: StudentChallenge,
): StudentChallengePersonal[] {
    return challengePersonals(challenge).filter(
        (p) => p.status === 'accepted',
    );
}

export function isMultiPersonal(challenge: StudentChallenge): boolean {
    return challenge.is_multi_personal === true;
}

export function participantsCount(challenge: StudentChallenge): number {
    return challenge.participants_count ?? challenge.participants.length;
}

export function myRole(challenge: StudentChallenge): StudentChallengeMyRole {
    return challenge.my_role || '';
}

/** Organizador. Desafio antigo não traz `my_role`: quem lista pela rota do
 * personal e é o `personal_id` do documento é o dono, como sempre foi. */
export function isOwner(
    challenge: StudentChallenge,
    personalId?: string | null,
): boolean {
    if (challenge.my_role) return challenge.my_role === 'owner';
    return !!personalId && challenge.personal_id === personalId;
}

/** Rótulo de exibição de uma equipe: apelido escolhido pelo personal, ou o
 * nome dele, ou um genérico — nunca o ObjectID cru. */
export function teamLabel(team: {
    team_name?: string;
    name?: string;
}): string {
    return team.team_name?.trim() || team.name?.trim() || 'Equipe sem nome';
}

/** Sugestão de meta colaborativa, calculada no CLIENTE e nunca imposta:
 * metade dos dias da janela para cada participante previsto (plano, 7.1). */
export function suggestCollaborativeGoal(
    expectedParticipants: number,
    windowDays: number,
): number {
    return Math.max(
        1,
        Math.round(expectedParticipants * windowDays * 0.5),
    );
}

/** Dias civis da janela, inclusive nas duas pontas — mesma contagem que o
 * backend usa para `window_days`, replicada só para a sugestão de meta. */
export function windowDaysBetween(startISO: string, endISO: string): number {
    const start = new Date(`${startISO}T00:00:00`);
    const end = new Date(`${endISO}T00:00:00`);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return 1;
    const days =
        Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;
    return days > 0 ? days : 1;
}

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

/* ── Personal · roster de personais ── */

/** Convites recebidos de OUTROS personais, ainda pendentes. Caminho separado
 * (`/student-challenge-invites`, não `/student-challenges/invites`) de
 * propósito, para não colidir com `/:id` na árvore de rotas do gin. */
export async function listPersonalChallengeInvites(): Promise<
    StudentChallenge[]
> {
    const { data } = await Api.get<StudentChallenge[]>(
        '/student-challenge-invites',
    );
    return data;
}

/** Convida outro personal por e-mail. Só o organizador, e exige PRO. */
export async function invitePersonal(
    id: string,
    email: string,
): Promise<StudentChallenge> {
    const { data } = await Api.post<StudentChallenge>(
        `/student-challenges/${id}/personals`,
        { email },
    );
    return data;
}

/** Remove um personal MEMBRO do desafio. Só o organizador. */
export async function removePersonal(
    id: string,
    personalId: string,
): Promise<StudentChallenge> {
    const { data } = await Api.delete<StudentChallenge>(
        `/student-challenges/${id}/personals/${personalId}`,
    );
    return data;
}

export async function acceptPersonalInvite(
    id: string,
): Promise<StudentChallenge> {
    const { data } = await Api.post<StudentChallenge>(
        `/student-challenges/${id}/personals/accept`,
    );
    return data;
}

export async function declinePersonalInvite(
    id: string,
): Promise<StudentChallenge> {
    const { data } = await Api.post<StudentChallenge>(
        `/student-challenges/${id}/personals/decline`,
    );
    return data;
}

/** Sai do desafio. Disponível só para personal MEMBRO — o organizador
 * precisa encerrar, excluir ou transferir a titularidade antes. */
export async function leaveStudentChallenge(
    id: string,
): Promise<StudentChallenge> {
    const { data } = await Api.post<StudentChallenge>(
        `/student-challenges/${id}/personals/leave`,
    );
    return data;
}

/** Renomeia a PRÓPRIA equipe. Ninguém renomeia a equipe de outro. */
export async function renameTeam(
    id: string,
    teamName: string,
): Promise<StudentChallenge> {
    const { data } = await Api.patch<StudentChallenge>(
        `/student-challenges/${id}/team`,
        { team_name: teamName },
    );
    return data;
}

/** Modalidade + meta. Só o organizador, e só antes do início. */
export async function setStudentChallengeMode(
    id: string,
    mode: StudentChallengeMode,
    collaborativeGoal?: number,
): Promise<StudentChallenge> {
    const { data } = await Api.patch<StudentChallenge>(
        `/student-challenges/${id}/mode`,
        collaborativeGoal === undefined
            ? { mode }
            : { mode, collaborative_goal: collaborativeGoal },
    );
    return data;
}

/** Remove um aluno da PRÓPRIA equipe. Aluno de carteira alheia é recusado
 * pelo backend (403), mesmo para o organizador. */
export async function removeChallengeStudent(
    id: string,
    studentId: string,
): Promise<StudentChallenge> {
    const { data } = await Api.delete<StudentChallenge>(
        `/student-challenges/${id}/students/${studentId}`,
    );
    return data;
}

/* ── Personal · transferência de titularidade ── */

/** Oferta de transferência. O alvo precisa ser um personal MEMBRO já aceito;
 * nada muda até ele aceitar. */
export async function offerOwnerTransfer(
    id: string,
    personalId: string,
): Promise<StudentChallenge> {
    const { data } = await Api.post<StudentChallenge>(
        `/student-challenges/${id}/transfer`,
        { personal_id: personalId },
    );
    return data;
}

export async function acceptOwnerTransfer(
    id: string,
): Promise<StudentChallenge> {
    const { data } = await Api.post<StudentChallenge>(
        `/student-challenges/${id}/transfer/accept`,
    );
    return data;
}

export async function declineOwnerTransfer(
    id: string,
): Promise<StudentChallenge> {
    const { data } = await Api.post<StudentChallenge>(
        `/student-challenges/${id}/transfer/decline`,
    );
    return data;
}

/** Cancela a própria oferta pendente. Só o organizador. */
export async function cancelOwnerTransfer(
    id: string,
): Promise<StudentChallenge> {
    const { data } = await Api.delete<StudentChallenge>(
        `/student-challenges/${id}/transfer`,
    );
    return data;
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

/** Renova o consentimento quando o desafio passou a exigir um escopo maior
 * (virou multi-personal). Quem não renova simplesmente não volta ao mural —
 * não existe recusa, prazo nem expulsão. */
export async function renewStudentChallengeConsent(
    id: string,
    payload: AcceptStudentChallengeInvitePayload,
): Promise<StudentChallenge> {
    const { data } = await Api.post<StudentChallenge>(
        `/me/student-challenges/${id}/renew-consent`,
        payload,
    );
    return data;
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
