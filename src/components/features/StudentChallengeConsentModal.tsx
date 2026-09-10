'use client';

import { useState } from 'react';
import axios from 'axios';
import Modal from '@/components/system/Modal';
import {
    acceptStudentChallengeInvite,
    declineStudentChallengeInvite,
    STUDENT_CHALLENGE_CONSENT_VERSION,
    type StudentChallenge,
} from '@/libs/studentChallengeService';
import s from './StudentChallengeConsentModal.module.css';

interface Props {
    open: boolean;
    challenge: StudentChallenge;
    onClose: () => void;
    onAccepted: (updated: StudentChallenge) => void;
    onDeclined: () => void;
}

function fmt(d: string): string {
    const dt = new Date(d + 'T00:00:00');
    return isNaN(dt.getTime()) ? d : dt.toLocaleDateString('pt-BR');
}

/**
 * Tela de consentimento específica do Desafio entre Alunos — diferente do
 * checkbox genérico de cadastro (SignUp), porque aqui o consentimento é
 * REVOGÁVEL a qualquer momento (opt-out), e precisa deixar isso claro antes
 * do aceite.
 */
export default function StudentChallengeConsentModal({
    open,
    challenge,
    onClose,
    onAccepted,
    onDeclined,
}: Props) {
    const [checked, setChecked] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    async function handleAccept() {
        if (!checked) return;
        setSubmitting(true);
        setError('');
        try {
            const updated = await acceptStudentChallengeInvite(challenge.id, {
                consent: true,
                consent_version: STUDENT_CHALLENGE_CONSENT_VERSION,
            });
            onAccepted(updated);
        } catch (err) {
            // Defesa em profundidade: o botão já fica desabilitado sem o
            // checkbox marcado, então esse 422 não deveria acontecer na
            // prática — mas o backend é a fonte da verdade.
            if (
                axios.isAxiosError(err) &&
                err.response?.data?.code === 'challenge_consent_required'
            ) {
                setError(
                    err.response.data.error ??
                        'É preciso aceitar os termos para participar.',
                );
            } else if (axios.isAxiosError(err) && !err.response) {
                setError('Sem conexão. Tente novamente quando estiver online.');
            } else {
                setError(
                    'Não foi possível confirmar sua participação. Tente novamente.',
                );
            }
        } finally {
            setSubmitting(false);
        }
    }

    async function handleDecline() {
        setSubmitting(true);
        setError('');
        try {
            await declineStudentChallengeInvite(challenge.id);
            onDeclined();
        } catch {
            setError('Não foi possível recusar o convite. Tente novamente.');
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <Modal
            open={open}
            onClose={onClose}
            title={`Participar de "${challenge.name}"`}
            footer={
                <>
                    <button
                        type="button"
                        className={s.btnGhost}
                        onClick={handleDecline}
                        disabled={submitting}
                    >
                        Recusar
                    </button>
                    <button
                        type="button"
                        className={s.btnPrimary}
                        onClick={handleAccept}
                        disabled={submitting || !checked}
                    >
                        {submitting ? 'Aguarde...' : 'Aceitar e participar'}
                    </button>
                </>
            }
        >
            {challenge.description && (
                <p className={s.description}>{challenge.description}</p>
            )}
            <p className={s.text}>
                Seu personal te convidou para o desafio de constância{' '}
                <strong>{challenge.name}</strong>, de {fmt(challenge.start_date)}{' '}
                a {fmt(challenge.end_date)}.
            </p>
            <p className={s.text}>
                Ao participar, as fotos que você anexar ao concluir seus
                treinos durante o período do desafio ficarão visíveis aos
                outros participantes. Você pode sair do desafio a qualquer
                momento, o que interrompe essa visibilidade imediatamente.
            </p>

            {error && <div className={s.errorMsg}>{error}</div>}

            <div className="form-check">
                <input
                    className="form-check-input"
                    type="checkbox"
                    id="student-challenge-consent"
                    checked={checked}
                    onChange={(e) => setChecked(e.target.checked)}
                />
                <label
                    className={`form-check-label ${s.consentLabel}`}
                    htmlFor="student-challenge-consent"
                >
                    Li e concordo em compartilhar minhas fotos de check-in e
                    minha sequência de dias com os demais participantes deste
                    desafio.
                </label>
            </div>
        </Modal>
    );
}
