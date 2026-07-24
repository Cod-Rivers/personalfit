import { Api } from '@/libs/api';

export interface RetentionStudent {
    id: string;
    name: string;
    link_status: 'active' | 'pending' | 'inactive';
    last_workout_at?: string;
    days_since_last: number; // -1 = nunca treinou
    workouts_last_7: number;
    workouts_last_30: number;
    at_risk: boolean;
}

export interface RetentionOverview {
    total_students: number;
    active_link: number;
    pending_link: number;
    inactive_link: number;
    training_now: number;
    at_risk: number;
    never_trained: number;
    risk_days: number;
    students: RetentionStudent[];
}

export async function getRetentionOverview(): Promise<RetentionOverview> {
    const { data } = await Api.get<RetentionOverview>('/dashboard/retention');
    return data;
}
