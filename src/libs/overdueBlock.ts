import axios from 'axios';

/** "code" do 403 devolvido por RequireNoOverdueBlock no backend. */
export const OVERDUE_BLOCK_CODE = 'student_blocked_overdue';

/**
 * true quando a API recusou a leitura porque o personal do aluno pausou o
 * acesso por mensalidade vencida. As telas precisam distinguir isso de um
 * erro qualquer — e, na evolução e no plano alimentar, do 403 de "precisa de
 * PRO", que mostraria uma oferta de assinatura a quem só está devendo ao
 * personal.
 */
export function isOverdueBlockError(err: unknown): boolean {
    if (!axios.isAxiosError(err)) return false;
    const data = err.response?.data as { code?: string } | undefined;
    return err.response?.status === 403 && data?.code === OVERDUE_BLOCK_CODE;
}
