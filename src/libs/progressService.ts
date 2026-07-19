import { Api } from '@/libs/api';

export interface ProgressResponse {
    total_planned: number;
    total_completed: number;
    percentage: number;
}

export async function getProgress(studentId: string): Promise<ProgressResponse> {
    const res = await Api.get<ProgressResponse>(
        `/students/${studentId}/progress`,
    );
    return res.data;
}
