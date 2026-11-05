import axios from 'axios';

/** "code" do 403 de quando o personal desativou o aluno (ErrStudentLinkInactive no backend). */
export const LINK_INACTIVE_CODE = 'student_link_inactive';

/**
 * true quando a API recusou o plano porque o personal desativou o aluno (ou
 * pediu para reativar e o aluno ainda não confirmou). O treino que o personal
 * montou fica fora de alcance até o vínculo voltar a ficar ativo.
 */
export function isLinkInactiveError(err: unknown): boolean {
    if (!axios.isAxiosError(err)) return false;
    const data = err.response?.data as { code?: string } | undefined;
    return err.response?.status === 403 && data?.code === LINK_INACTIVE_CODE;
}
