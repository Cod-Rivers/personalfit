'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FiCheckCircle, FiClipboard } from 'react-icons/fi';
import BackButton from '@/components/molecules/BackButton';
import ExternalLink from '@/components/atoms/ExternalLink';
import PersonalAnamnesisForm from '@/components/features/PersonalAnamnesisForm';
import { getStudentHomeRoute } from '@/libs/session';
import {
    friendlyPersonalAnamnesisError,
    getMyPendingPersonalAnamnesis,
    submitMyPersonalAnamnesis,
    type MyPendingPersonalAnamnesis,
    type PersonalAnamnesisAnswer,
} from '@/libs/personalAnamnesisService';
import s from './page.module.css';

// Versão do texto de consentimento abaixo. Incremente ao mudar o texto para o
// backend registrar qual versão o titular aceitou.
const CONSENT_VERSION = '2026-09-12';

type Step = 'loading' | 'error' | 'none' | 'intro' | 'form' | 'done';

/**
 * Anamnese do personal, do lado do aluno. Só existe quando o personal pediu
 * (a Triagem automática, para quem não tem personal, fica em /anamnese).
 * Chega aqui pelo push/notificação ou pelo aviso em /meus-treinos.
 */
export default function PersonalAnamnesisStudentPage() {
    const router = useRouter();
    const [step, setStep] = useState<Step>('loading');
    const [pending, setPending] = useState<MyPendingPersonalAnamnesis | null>(null);
    const [consent, setConsent] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    async function load() {
        setStep('loading');
        setErrorMessage(null);
        try {
            const result = await getMyPendingPersonalAnamnesis();
            setPending(result);
            setStep(result ? 'intro' : 'none');
        } catch (error) {
            setErrorMessage(friendlyPersonalAnamnesisError(error));
            setStep('error');
        }
    }

    useEffect(() => {
        if (!localStorage.getItem('token')) {
            router.replace('/');
            return;
        }
        void load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    async function handleSubmit(answers: PersonalAnamnesisAnswer[]) {
        if (!pending) return;
        setSubmitting(true);
        setErrorMessage(null);
        try {
            await submitMyPersonalAnamnesis(pending.request_id, answers, CONSENT_VERSION);
            setStep('done');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (error) {
            setErrorMessage(friendlyPersonalAnamnesisError(error));
        } finally {
            setSubmitting(false);
        }
    }

    const personalName = pending?.personal_name?.trim();
    const personalLabel = personalName || 'seu personal';
    const goHome = () => router.push(getStudentHomeRoute());

    return (
        <div className="container">
            <header className="d-flex w-100 mt-4">
                <BackButton link={getStudentHomeRoute()} label="Voltar para Meus Treinos" />
            </header>

            <main className={s.page}>
                {step === 'loading' && (
                    <div className={s.center}>
                        <span className="spinner-border" role="status" aria-label="Carregando" />
                    </div>
                )}

                {step === 'error' && (
                    <div className={s.center}>
                        <p className={s.lead}>{errorMessage}</p>
                        <button type="button" className="btn btn-gold" onClick={load}>
                            Tentar de novo
                        </button>
                    </div>
                )}

                {step === 'none' && (
                    <div className={s.center}>
                        <FiClipboard size={36} className={s.icon} aria-hidden />
                        <h1 className={s.title}>Nenhuma anamnese pendente</h1>
                        <p className={s.lead}>
                            Quando seu personal pedir que você responda a
                            anamnese, ela aparece aqui e você recebe um aviso.
                        </p>
                        <button type="button" className="btn btn-gold" onClick={goHome}>
                            Ir para meus treinos
                        </button>
                    </div>
                )}

                {step === 'intro' && pending && (
                    <div className={s.center}>
                        <span className={s.kicker}>Anamnese do personal</span>
                        <h1 className={s.title}>
                            {personalName ?? 'Seu personal'} pediu que você responda a anamnese
                        </h1>
                        <p className={s.lead}>
                            Suas respostas vão direto para {personalLabel} montar
                            e ajustar seus treinos. Leva cerca de 5 minutos.
                        </p>
                        <button type="button" className="btn btn-gold" onClick={() => setStep('form')}>
                            Começar
                        </button>
                    </div>
                )}

                {step === 'form' && pending && (
                    <>
                        <div className={s.formHeader}>
                            <span className={s.kicker}>Anamnese do personal</span>
                            <p className={s.lead}>Respostas para {personalLabel}</p>
                        </div>
                        <PersonalAnamnesisForm
                            questionnaire={pending.questionnaire}
                            submitting={submitting}
                            errorMessage={errorMessage}
                            canSubmit={consent}
                            submitLabel="Enviar respostas"
                            onBackBeforeFirst={() => setStep('intro')}
                            onSubmit={handleSubmit}
                            confirmSlot={
                                <>
                                    <p className={s.lead}>
                                        Ao enviar, as respostas vão para {personalLabel}.
                                        Se algo mudar depois, avise seu personal:
                                        ele pode pedir uma nova anamnese.
                                    </p>
                                    <div className="form-check">
                                        <input
                                            className="form-check-input"
                                            type="checkbox"
                                            id="personal-anamnesis-consent"
                                            checked={consent}
                                            onChange={(e) => setConsent(e.target.checked)}
                                        />
                                        <label
                                            className="form-check-label"
                                            htmlFor="personal-anamnesis-consent"
                                        >
                                            Autorizo o tratamento dos meus dados de
                                            saúde (as respostas desta anamnese) para
                                            que {personalLabel} monte e acompanhe meu
                                            treino, conforme a{' '}
                                            <ExternalLink href="/politica-privacidade">
                                                Política de Privacidade
                                            </ExternalLink>
                                            .
                                        </label>
                                    </div>
                                </>
                            }
                        />
                    </>
                )}

                {step === 'done' && (
                    <div className={s.center}>
                        <FiCheckCircle size={40} className={s.doneIcon} aria-hidden />
                        <h1 className={s.title}>Respostas enviadas</h1>
                        <p className={s.lead}>
                            {personalName ?? 'Seu personal'} foi avisado e já pode usar
                            suas respostas para montar seus treinos.
                        </p>
                        <button type="button" className="btn btn-gold" onClick={goHome}>
                            Voltar para meus treinos
                        </button>
                    </div>
                )}
            </main>
        </div>
    );
}
