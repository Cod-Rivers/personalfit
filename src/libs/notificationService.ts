import { Api } from '@/libs/api';


export interface Notification {
    id: string;
    user_id: string;
    title: string;
    message: string;
    type: string;
    read: boolean;
    created_at: string;
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
