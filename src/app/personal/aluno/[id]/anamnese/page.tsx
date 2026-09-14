'use client';
import { useCallback, useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
    FiHeart,
    FiArrowLeft,
    FiSend,
    FiFileText,
    FiChevronRight,
    FiRefreshCw,
    FiX,
} from 'react-icons/fi';
import { formatCpfInput } from '@/libs/formatters';
import Modal from '@/components/system/Modal';
import { useToast } from '@/components/system/Toast';
import PersonalAnamnesisForm from '@/components/features/PersonalAnamnesisForm';
import PersonalAnamnesisAnswers, {
    LegacyAnamnesisList,
} from '@/components/features/PersonalAnamnesisAnswers';
import {
    cancelPersonalAnamnesisRequest,
    fillPersonalAnamnesis,
    formatAnamnesisDate,
    friendlyPersonalAnamnesisError,
    getPersonalAnamnesisQuestionnaire,
    getStudentPersonalAnamnesis,
    requestPersonalAnamnesis,
    type PersonalAnamnesisAnswer,
    type PersonalAnamnesisHistory,
    type PersonalAnamnesisQuestionnaire,
} from '@/libs/personalAnamnesisService';
// Reaproveita o módulo de estilos já usado pelas telas irmãs deste aluno
// (periodização, plano alimentar) — mesmo padrão de header/card/form em todo
// `personal/aluno/[id]/*`.
import s from '../periodizacao/periodizacao.module.css';
import local from './anamnese.module.css';

// Versão do texto de declaração de responsabilidade aceito pelo personal ao
// preencher em nome do aluno. Incremente ao mudar o texto do checkbox abaixo.
const DECLARATION_VERSION = '2026-09-12';

/**
 * Anamnese do personal: o personal pede ao aluno (que recebe aviso e
 * responde pelo app) ou preenche em nome dele, e lê as respostas aqui para
 * montar as séries. Separada da Triagem automática (/anamnese), que é do
 * aluno sem personal e escolhe um treino pronto.
 */
export default function PersonalStudentAnamnesePage() {
    const router = useRouter();
    const params = useParams<{ id: string }>();
    const studentId = params.id;
    const { showSuccess, showError, ToastSlot } = useToast();

    const [history, setHistory] = useState<PersonalAnamnesisHistory | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [busy, setBusy] = useState<'request' | 'cancel' | null>(null);

    const [fillOpen, setFillOpen] = useState(false);
    const [fillFormKey, setFillFormKey] = useState(0);
    const [questionnaire, setQuestionnaire] =
        useState<PersonalAnamnesisQuestionnaire | null>(null);
    const [questionnaireError, setQuestionnaireError] = useState<string | null>(null);
    const [personalName, setPersonalName] = useState('');
    const [personalCpf, setPersonalCpf] = useState('');
    const [declarationAccepted, setDeclarationAccepted] = useState(false);
    const [fillSubmitting, setFillSubmitting] = useState(false);
    const [fillError, setFillError] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setLoadError(null);
        try {
            setHistory(await getStudentPersonalAnamnesis(studentId));
        } catch (error) {
            setLoadError(friendlyPersonalAnamnesisError(error));
        } finally {
            setLoading(false);
        }
    }, [studentId]);

    useEffect(() => {
        void load();
    }, [load]);

    async function handleRequest() {
        if (busy) return;
        const isResend = !!history?.pending;
        setBusy('request');
        try {
            const view = await requestPersonalAnamnesis(studentId);
            setHistory((prev) => (prev ? { ...prev, pending: view } : prev));
            showSuccess(
                isResend
                    ? 'Aviso reenviado ao aluno.'
                    : 'Anamnese solicitada. O aluno foi avisado.',
            );
        } catch (error) {
            showError(friendlyPersonalAnamnesisError(error));
        } finally {
            setBusy(null);
        }
    }

    async function handleCancel() {
        if (busy) return;
        if (
            !window.confirm(
                'Cancelar a solicitação? O aluno não poderá mais responder a este pedido.',
            )
        ) {
            return;
        }
        setBusy('cancel');
        try {
            await cancelPersonalAnamnesisRequest(studentId);
            setHistory((prev) => (prev ? { ...prev, pending: null } : prev));
            showSuccess('Solicitação cancelada.');
        } catch (error) {
            showError(friendlyPersonalAnamnesisError(error));
        } finally {
            setBusy(null);
        }
    }

    async function openFill() {
        setFillError(null);
        setDeclarationAccepted(false);
        setFillFormKey((k) => k + 1);
        setFillOpen(true);
        if (questionnaire) return;
        try {
            setQuestionnaire(await getPersonalAnamnesisQuestionnaire());
            setQuestionnaireError(null);
        } catch (error) {
            setQuestionnaireError(friendlyPersonalAnamnesisError(error));
        }
    }

    function closeFill() {
        if (fillSubmitting) return;
        setFillOpen(false);
    }

    const cpfDigits = personalCpf.replace(/\D/g, '');
    const canSubmitFill =
        personalName.trim().length > 1 && cpfDigits.length === 11 && declarationAccepted;

    async function handleFillSubmit(answers: PersonalAnamnesisAnswer[]) {
        setFillSubmitting(true);
        setFillError(null);
        try {
            await fillPersonalAnamnesis(studentId, {
                answers,
                personal_name: personalName.trim(),
                personal_cpf: cpfDigits,
                declaration_accepted: declarationAccepted,
                declaration_version: DECLARATION_VERSION,
            });
            setFillOpen(false);
            showSuccess('Anamnese registrada.');
            await load();
        } catch (error) {
            setFillError(friendlyPersonalAnamnesisError(error));
        } finally {
            setFillSubmitting(false);
        }
    }

    const pending = history?.pending ?? null;
    const latest = history?.submitted[0];
    const older = history?.submitted.slice(1) ?? [];

    return (
        <div className={s.page}>
            <div className={s.container}>
                <div className={s.header}>
                    <div>
                        <h1 className={s.headerTitle}>
                            <FiHeart /> Anamnese do personal
                        </h1>
                        <p className={s.headerSub}>
                            Respostas do aluno para orientar a montagem das séries
                        </p>
                    </div>
                    <button className={s.btnBack} onClick={() => router.back()}>
                        <FiArrowLeft /> Voltar
                    </button>
                </div>

                {loading && <p className={s.loading}>Carregando…</p>}

                {!loading && loadError && (
                    <div className={s.errorMsg}>
                        {loadError}{' '}
                        <button type="button" className={s.btnSecondary} onClick={load}>
                            Tentar de novo
                        </button>
                    </div>
                )}

                {!loading && history && (
                    <>
                        <div className={s.list}>
                            <div className={`${s.card} ${local.card}`}>
                                <div className={s.cardInfo}>
                                    {pending ? (
                                        <>
                                            <p className={s.cardName}>
                                                <FiSend /> Aguardando o aluno responder
                                            </p>
                                            <p className={s.cardMeta}>
                                                Solicitada em{' '}
                                                {formatAnamnesisDate(pending.requested_at)}. O
                                                aluno recebeu um aviso e vê o pedido na tela
                                                inicial do app.
                                            </p>
                                        </>
                                    ) : (
                                        <>
                                            <p className={s.cardName}>
                                                <FiSend /> Pedir para o aluno responder
                                            </p>
                                            <p className={s.cardMeta}>
                                                O aluno recebe um aviso e responde pelo app
                                                dele. As respostas aparecem aqui, e nada gera
                                                treino automático.
                                            </p>
                                        </>
                                    )}
                                </div>
                                <div className={local.cardActions}>
                                    {pending ? (
                                        <>
                                            <button
                                                type="button"
                                                className={s.btnSecondary}
                                                disabled={!!busy}
                                                onClick={handleRequest}
                                            >
                                                <FiRefreshCw />{' '}
                                                {busy === 'request' ? 'Reenviando…' : 'Reenviar aviso'}
                                            </button>
                                            <button
                                                type="button"
                                                className={s.btnDanger}
                                                disabled={!!busy}
                                                onClick={handleCancel}
                                            >
                                                <FiX />{' '}
                                                {busy === 'cancel' ? 'Cancelando…' : 'Cancelar pedido'}
                                            </button>
                                        </>
                                    ) : (
                                        <button
                                            type="button"
                                            className={s.btnAdd}
                                            disabled={!!busy}
                                            onClick={handleRequest}
                                        >
                                            {busy === 'request' ? 'Solicitando…' : 'Solicitar ao aluno'}
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className={`${s.card} ${local.card}`}>
                                <div className={s.cardInfo}>
                                    <p className={s.cardName}>
                                        <FiFileText /> Preencher agora
                                    </p>
                                    <p className={s.cardMeta}>
                                        Você responde em nome do aluno (por exemplo, numa
                                        avaliação presencial), com declaração de
                                        responsabilidade.
                                        {pending ? ' Isso encerra o pedido pendente.' : ''}
                                    </p>
                                </div>
                                <div className={local.cardActions}>
                                    <button
                                        type="button"
                                        className={s.btnSecondary}
                                        onClick={openFill}
                                    >
                                        Preencher <FiChevronRight />
                                    </button>
                                </div>
                            </div>
                        </div>

                        <h2 className={`${s.sectionTitle} ${local.heading}`}>Respostas</h2>
                        {latest ? (
                            <div className={local.panel}>
                                <PersonalAnamnesisAnswers view={latest} />
                            </div>
                        ) : (
                            <div className={s.empty}>
                                <p className={s.emptyTitle}>Nenhuma resposta ainda</p>
                                <p className={s.emptyText}>
                                    {pending
                                        ? 'Assim que o aluno responder, você recebe um aviso e as respostas aparecem aqui.'
                                        : 'Solicite ao aluno ou preencha agora.'}
                                </p>
                            </div>
                        )}

                        {older.length > 0 && (
                            <>
                                <h2 className={`${s.sectionTitle} ${local.heading}`}>
                                    Respostas anteriores
                                </h2>
                                <div className={local.olderList}>
                                    {older.map((view) => (
                                        <details key={view.id} className={local.older}>
                                            <summary className={local.olderSummary}>
                                                Respondida em{' '}
                                                {formatAnamnesisDate(view.submitted_at)}
                                                {view.flagged ? ' · PAR-Q sinalizou risco' : ''}
                                            </summary>
                                            <div className={local.olderBody}>
                                                <PersonalAnamnesisAnswers view={view} />
                                            </div>
                                        </details>
                                    ))}
                                </div>
                            </>
                        )}

                        {history.legacy.length > 0 && (
                            <>
                                <h2 className={`${s.sectionTitle} ${local.heading}`}>
                                    Histórico (formato antigo)
                                </h2>
                                <p className={local.note}>
                                    Questionários respondidos antes da Anamnese do
                                    personal existir, incluindo a Triagem automática.
                                    Só leitura.
                                </p>
                                <LegacyAnamnesisList items={history.legacy} />
                            </>
                        )}
                    </>
                )}
            </div>

            <Modal
                open={fillOpen}
                onClose={closeFill}
                title="Preencher anamnese em nome do aluno"
                closeOnBackdrop={!fillSubmitting}
            >
                {!questionnaire && !questionnaireError && (
                    <p className={s.loading}>Carregando perguntas…</p>
                )}
                {questionnaireError && <div className={s.errorMsg}>{questionnaireError}</div>}
                {questionnaire && (
                    <PersonalAnamnesisForm
                        key={fillFormKey}
                        questionnaire={questionnaire}
                        submitting={fillSubmitting}
                        errorMessage={fillError}
                        canSubmit={canSubmitFill}
                        submitLabel="Registrar anamnese"
                        onSubmit={handleFillSubmit}
                        confirmSlot={
                            <>
                                <p className={local.note}>
                                    Confirme seus dados. Eles identificam quem respondeu
                                    em nome do aluno.
                                </p>
                                <div className={s.formGroup}>
                                    <label className={s.formLabel} htmlFor="pa-personal-name">
                                        Seu nome completo
                                    </label>
                                    <input
                                        id="pa-personal-name"
                                        className={s.formInput}
                                        value={personalName}
                                        onChange={(e) => setPersonalName(e.target.value)}
                                        placeholder="Nome completo"
                                        autoComplete="name"
                                    />
                                </div>
                                <div className={s.formGroup}>
                                    <label className={s.formLabel} htmlFor="pa-personal-cpf">
                                        Seu CPF
                                    </label>
                                    <input
                                        id="pa-personal-cpf"
                                        className={s.formInput}
                                        value={personalCpf}
                                        onChange={(e) =>
                                            setPersonalCpf(formatCpfInput(e.target.value))
                                        }
                                        placeholder="000.000.000-00"
                                        inputMode="numeric"
                                        maxLength={14}
                                    />
                                </div>
                                <div className="form-check">
                                    <input
                                        className="form-check-input"
                                        type="checkbox"
                                        id="pa-declaration"
                                        checked={declarationAccepted}
                                        onChange={(e) => setDeclarationAccepted(e.target.checked)}
                                    />
                                    <label className="form-check-label" htmlFor="pa-declaration">
                                        Declaro que as respostas refletem o relato do aluno e
                                        assumo a responsabilidade pelas informações prestadas.
                                    </label>
                                </div>
                            </>
                        }
                    />
                )}
            </Modal>
            {ToastSlot}
        </div>
    );
}
