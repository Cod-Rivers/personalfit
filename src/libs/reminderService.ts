import { Api } from '@/libs/api';

export type ReminderType = 'workout' | 'progress' | 'custom';

/** Envia um lembrete (push + notificação in-app) do personal para o aluno. */
export async function sendStudentReminder(
    studentId: string,
    type: ReminderType,
    message?: string,
): Promise<void> {
    await Api.post(`/students/${studentId}/reminder`, { type, message });
}
