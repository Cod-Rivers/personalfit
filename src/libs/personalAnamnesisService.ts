import { Api } from '@/libs/api';

/**
 * Anamnese do personal — questionário que o aluno VINCULADO responde para
 * orientar o personal na montagem das séries. Separada da Triagem automática
 * (/anamnese, POST /user/anamnesis), que escolhe um treino pronto para quem
 * não tem personal e nunca é vista por ninguém.
 *
 * Espelha internal/application/user/dtos/personal-anamnesis.go e
 * internal/domain/user/personal-anamnesis-questionnaire.go do backend.
 */

export type PersonalAnamnesisQuestionType = 'single' | 'multi' | 'text';

export interface PersonalAnamnesisOption {
    value: string;
    label: string;
    /** Não pode ser marcada junto com outras (ex.: "Nenhuma"). */
    exclusive?: boolean;
}

export interface PersonalAnamnesisQuestion {
    key: string;
    section: string;
    text: string;
    help?: string;
    type: PersonalAnamnesisQuestionType;
    options?: PersonalAnamnesisOption[];
    required: boolean;
}

export interface PersonalAnamnesisSection {
    key: string;
    title: string;
}

export interface PersonalAnamnesisQuestionnaire {
    version: string;
    sections: PersonalAnamnesisSection[];
    questions: PersonalAnamnesisQuestion[];
}

export interface PersonalAnamnesisAnswer {
    question_key: string;
    values?: string[];
    text?: string;
}

export type PersonalAnamnesisStatus = 'requested' | 'submitted' | 'canceled';

export interface PersonalAnamnesisAnswerView {
    key: string;
    question: string;
    type: string;
    /** Rótulos das opções escolhidas (já resolvidos pelo backend). */
    values?: string[];
    text?: string;
    /** Resposta de risco no PAR-Q. */
    flagged?: boolean;
}

export interface PersonalAnamnesisSectionView {
    key: string;
    title: string;
    answers: PersonalAnamnesisAnswerView[];
}

export interface PersonalAnamnesisView {
    id: string;
    status: PersonalAnamnesisStatus;
    questionnaire_version?: string;
    requested_at?: string;
    submitted_at?: string;
    filled_by?: 'student' | 'personal';
    personal_name?: string;
    flagged: boolean;
    flag_reasons?: string[];
    sections: PersonalAnamnesisSectionView[];
}

/** Anamnese do formato antigo, anterior à Anamnese do personal. */
export interface LegacyAnamnesisView {
    completed_at: string;
    filled_by: 'student' | 'personal';
    flagged: boolean;
    flag_reasons?: string[];
    answers: { question: string; answer: string }[];
}

export interface PersonalAnamnesisHistory {
    pending: PersonalAnamnesisView | null;
    submitted: PersonalAnamnesisView[];
    legacy: LegacyAnamnesisView[];
}

export interface MyPendingPersonalAnamnesis {
    request_id: string;
    requested_at?: string;
    personal_name?: string;
    questionnaire: PersonalAnamnesisQuestionnaire;
}

export interface PersonalAnamnesisSummaryItem {
    status: PersonalAnamnesisStatus;
    requested_at?: string;
    submitted_at?: string;
}

export interface FillPersonalAnamnesisBody {
    answers: PersonalAnamnesisAnswer[];
    personal_name: string;
    personal_cpf: string;
    declaration_accepted: boolean;
    declaration_version: string;
}

/* ── Aluno ── */

/** Solicitação aberta do personal atual do aluno, ou null. */
export async function getMyPendingPersonalAnamnesis(): Promise<MyPendingPersonalAnamnesis | null> {
    const { data } = await Api.get<{ pending: MyPendingPersonalAnamnesis | null }>(
        '/me/personal-anamnesis/pending',
    );
    return data.pending ?? null;
}

export async function submitMyPersonalAnamnesis(
    requestId: string,
    answers: PersonalAnamnesisAnswer[],
    consentVersion: string,
): Promise<void> {
    await Api.post(`/me/personal-anamnesis/${requestId}/submit`, {
        answers,
        consent: true,
        consent_version: consentVersion,
    });
}

/* ── Personal ── */

export async function getStudentPersonalAnamnesis(
    studentId: string,
): Promise<PersonalAnamnesisHistory> {
    const { data } = await Api.get<PersonalAnamnesisHistory>(
        `/students/${studentId}/personal-anamnesis`,
    );
    return data;
}

/** Cria a solicitação (ou reaproveita a pendente) e avisa o aluno. */
export async function requestPersonalAnamnesis(
    studentId: string,
): Promise<PersonalAnamnesisView> {
    const { data } = await Api.post<PersonalAnamnesisView>(
        `/students/${studentId}/personal-anamnesis/request`,
    );
    return data;
}

export async function cancelPersonalAnamnesisRequest(
    studentId: string,
): Promise<void> {
    await Api.delete(`/students/${studentId}/personal-anamnesis/request`);
}

export async function fillPersonalAnamnesis(
    studentId: string,
    body: FillPersonalAnamnesisBody,
): Promise<PersonalAnamnesisView> {
    const { data } = await Api.post<PersonalAnamnesisView>(
        `/students/${studentId}/personal-anamnesis/fill`,
        body,
    );
    return data;
}

export async function getPersonalAnamnesisQuestionnaire(): Promise<PersonalAnamnesisQuestionnaire> {
    const { data } = await Api.get<PersonalAnamnesisQuestionnaire>(
        '/personal-anamnesis/questionnaire',
    );
    return data;
}

/** ID do aluno → status da anamnese mais recente. Ausente = nunca solicitada. */
export async function getPersonalAnamnesisSummary(): Promise<
    Record<string, PersonalAnamnesisSummaryItem>
> {
    const { data } = await Api.get<{
        students: Record<string, PersonalAnamnesisSummaryItem>;
    }>('/personal-anamnesis/summary');
    return data.students ?? {};
}

const ERROR_COPY: Record<string, string> = {
    consent_required:
        'Para enviar, marque a autorização de tratamento dos dados de saúde.',
};

export function friendlyPersonalAnamnesisError(error: unknown): string {
    const response = (
        error as {
            response?: { status?: number; data?: { error?: string; code?: string } };
        }
    )?.response;
    if (response?.data?.code && ERROR_COPY[response.data.code]) {
        return ERROR_COPY[response.data.code];
    }
    if (response?.status === 409) {
        return 'Esta anamnese já foi respondida ou cancelada. Atualize a página.';
    }
    return (
        response?.data?.error ??
        'Não foi possível concluir a ação. Verifique sua conexão e tente novamente.'
    );
}

/** "12/09/2026" a partir de uma data ISO; "" se ausente/inválida. */
export function formatAnamnesisDate(iso?: string): string {
    if (!iso) return '';
    const d = new Date(iso);
    return isNaN(d.getTime()) ? '' : d.toLocaleDateString('pt-BR');
}
