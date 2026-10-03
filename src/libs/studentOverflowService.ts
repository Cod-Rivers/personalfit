import { Api } from '@/libs/api';

/**
 * Excedente de alunos do plano gratuito (2026-10-02): o personal que sai do
 * PRO com mais alunos do que o free permite escolhe quem continua; os demais
 * ficam em espera até `deadline`. Ver domain/user/student-overflow.go no
 * backend.
 */
export interface StudentOverflowStatus {
    /** Há um ciclo de excedente aberto. */
    open: boolean;
    /** Ciclo aberto e o personal ainda não escolheu: o painel fica travado. */
    pending_choice: boolean;
    /** Quantos alunos o plano gratuito inclui. */
    limit?: number;
    opened_at?: string;
    /** Fim da espera: sem PRO até aqui, os alunos em espera são desvinculados. */
    deadline?: string;
    kept_student_ids: string[];
    standby_student_ids: string[];
}

export async function getStudentOverflow(): Promise<StudentOverflowStatus> {
    const { data } = await Api.get<StudentOverflowStatus>(
        '/personal/student-overflow',
    );
    return data;
}

/** Grava quem continua (escolha definitiva). */
export async function chooseStudentsToKeep(
    studentIds: string[],
): Promise<StudentOverflowStatus> {
    const { data } = await Api.post<StudentOverflowStatus>(
        '/personal/student-overflow/choose',
        { student_ids: studentIds },
    );
    return data;
}
