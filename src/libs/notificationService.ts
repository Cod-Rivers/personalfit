import { Api } from '@/libs/api';


export interface Notification {
    id: string;
    user_id: string;
    title: string;
    message: string;
    type: string;
    read: boolean;
    /** Rota interna aberta ao tocar (ex.: "/personal/comentarios?c=…").
     * Ausente nas notificações sem destino. */
    link?: string;
    created_at: string;
}

/** Só segue link interno ("/..."): o texto vem do servidor, mas um link
 * externo aqui abriria sem o usuário saber para onde. */
export function safeNotificationLink(link?: string): string | null {
    if (!link || !link.startsWith('/') || link.startsWith('//')) return null;
    return link;
}

export async function getMyNotifications(): Promise<Notification[]> {
    const { data } = await Api.get<Notification[]>('/notifications');
    return data ?? [];
}

export async function markAsRead(id: string): Promise<void> {
    await Api.put(`/notifications/${id}/read`, {});
}

export async function submitRating(body: {
    target_id: string;
    target_type: string;
    stars: number;
    comment?: string;
}): Promise<void> {
    await Api.post('/ratings', body);
}
