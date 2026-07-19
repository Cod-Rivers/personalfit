import { Api } from '@/libs/api';

export type LinkStatus = 'active' | 'pending' | 'inactive';

interface MeResponse {
    has_personal?: boolean;
    link_status?: LinkStatus;
}

/** Busca o status atual do vínculo do aluno logado com o personal (fresco, via /me). */
export async function getMyLinkStatus(): Promise<LinkStatus | null> {
    const { data } = await Api.get<MeResponse>('/me');
    if (!data.has_personal || !data.link_status) return null;
    return data.link_status;
}

/** Aluno confirma a solicitação de ativação do vínculo. */
export async function acceptPersonalLink(): Promise<void> {
    await Api.patch('/my-link/accept', {});
}

/** Aluno recusa a solicitação de ativação do vínculo. */
export async function declinePersonalLink(): Promise<void> {
    await Api.patch('/my-link/decline', {});
}
