import { Api } from '@/libs/api';

export interface ChallengeParticipant {
    id: string;
    name: string;
    email: string;
    phone?: string;
    joined_at: string;
    converted: boolean;
}

export interface Challenge {
    id: string;
    name: string;
    description?: string;
    start_date: string;
    end_date: string;
    max_participants: number;
    public_token: string;
    status: string;
    participant_count: number;
    converted_count: number;
    participants: ChallengeParticipant[];
    template_id?: string;
    created_at: string;
}

export interface CreateChallengePayload {
    name: string;
    description?: string;
    start_date: string; // YYYY-MM-DD
    end_date: string; // YYYY-MM-DD
    max_participants?: number;
    template_id?: string;
}

export interface PublicChallenge {
    name: string;
    description?: string;
    start_date: string;
    end_date: string;
    personal_name: string;
    participant_count: number;
    accepting_signups: boolean;
}

/** Monta o link público compartilhável de um desafio. */
export function challengePublicLink(token: string): string {
    const origin =
        typeof window !== 'undefined' ? window.location.origin : '';
    return `${origin}/desafio/${token}`;
}

export async function listChallenges(): Promise<Challenge[]> {
    const { data } = await Api.get<Challenge[]>('/challenges');
    return data;
}

export async function createChallenge(
    payload: CreateChallengePayload,
): Promise<Challenge> {
    const { data } = await Api.post<Challenge>('/challenges', payload);
    return data;
}

export async function getChallenge(id: string): Promise<Challenge> {
    const { data } = await Api.get<Challenge>(`/challenges/${id}`);
    return data;
}

export async function deleteChallenge(id: string): Promise<void> {
    await Api.delete(`/challenges/${id}`);
}

export async function convertParticipant(
    challengeId: string,
    participantId: string,
): Promise<Challenge> {
    const { data } = await Api.post<Challenge>(
        `/challenges/${challengeId}/participants/${participantId}/convert`,
    );
    return data;
}

/* ── Público (sem auth) ── */

export async function getPublicChallenge(
    token: string,
): Promise<PublicChallenge> {
    const { data } = await Api.get<PublicChallenge>(
        `/challenges/public/${token}`,
    );
    return data;
}

export async function joinChallenge(
    token: string,
    payload: { name: string; email: string; phone?: string },
): Promise<void> {
    await Api.post(`/challenges/public/${token}/join`, payload);
}
