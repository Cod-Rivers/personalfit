import { Api } from '@/libs/api';

export interface Achievement {
    code: string;
    title: string;
    description: string;
    unlocked: boolean;
}

export interface Gamification {
    total_workouts: number;
    workouts_this_week: number;
    current_streak_weeks: number;
    longest_streak_weeks: number;
    achievements: Achievement[];
}

export async function getGamification(): Promise<Gamification> {
    const { data } = await Api.get<Gamification>('/me/gamification');
    return data;
}
