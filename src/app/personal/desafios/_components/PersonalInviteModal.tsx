'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import { FiAlertTriangle } from 'react-icons/fi';
import Modal from '@/components/system/Modal';
import {
    invitePersonal,
    isMultiPersonal,
    type StudentChallenge,
} from '@/libs/studentChallengeService';
import s from '../desafios.module.css';

interface Props {
    open: boolean;
    challenge: StudentChallenge | null;
    onClose: () => void;
    onInvited: (updated: StudentChallenge) => void;
}

function isEmail(value: string): boolean {
    const v = value.trim();
    return v.length >= 5 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

/**
 * Convida OUTRO personal para o desafio, por e-mail.
 *
 * O convite é o ato que torna o desafio multi-personal, e isso muda o escopo
 * do consentimento de todo aluno já inscrito: quem consentiu na versão antiga
 * sai do mural até reconfirmar. Por isso o modal exige uma confirmação
 * explícita, com o número de alunos afetados, ANTES de enviar — o personal não
 * pode descobrir a queda do mural depois do fato.
 */
export default function PersonalInviteModal({
    open,
    challenge,
    onClose,
    onInvited,
}: Props) {
    const [email, setEmail] = useState('');
    const [acknowledged, setAcknowledged] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!open) return;
        setEmail('');
        setAcknowledged(false);
        setError('');
    }, [open, challenge?.id]);

    if (!challenge) return null;

    const affected = challenge.students_requiring_reconsent ?? 0;
    // Um desafio que já é multi não tem "virada" a avisar de novo — o escopo
    // do consentimento já é o ampliado.
    const needsAck = affected > 0 && !isMultiPersonal(challenge);
    const canSubmit =
        isEmail(email) && (!needsAck || acknowledged) && !submitting;

    async function handleSubmit() {
        if (!challenge || !canSubmit) return;
        setSubmitting(true);
        setError('');
        try {
            const updated = await invitePersonal(challenge.id, email.trim());
            onInvited(updated);
        } catch (err) {
            if (axios.isAxiosError(err) && !err.response) {
                setError(
                    'Sem conexão. O convite não foi enviado — tente de novo quando estiver online.',
                );
            } else if (axios.isAxiosError(err)) {
                const data = err.response?.data as
                    | { code?: string; error?: string; message?: string }
                    | undefined;
                if (data?.code === 'not_pro_plan') {
                    setError(
                        'Convidar outro personal faz parte do plano PRO. O desafio entre os seus próprios alunos continua disponível normalmente.',
                    );
                } else {
                    // O servidor respondeu: mostrar o erro real dele, não uma
                    // mensagem genérica que esconde o motivo.
                    setError(
                        data?.error ||
                            data?.message ||
                            'Não foi possível enviar o convite. Confira o e-mail e tente novamente.',
                    );
                }
            } else {
                setError(
                    'Não foi possível enviar o convite. Tente novamente.',
                );
            }
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <Modal
            open={open}
            onClose={onClose}
            title={`Convidar outro personal — ${challenge.name}`}
            footer={
                <>
                    <button
                        type="button"
                        className={s.btnGhost}
                        onClick={onClose}
                        disabled={submitting}
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        className={s.btnPrimary}
                        onClick={handleSubmit}
                        disabled={!canSubmit}
                    >
                        {submitting ? 'Enviando…' : 'Enviar convite'}
                    </button>
                </>
            }
        >
            <p className={s.cardMeta} style={{ marginBottom: 12 }}>
                O convite vai pelo e-mail cadastrado do personal. Ele só entra
                no desafio depois de aceitar, e a partir daí inscreve apenas os
                alunos da própria carteira — você continua sem acesso aos alunos
                dele, e ele sem acesso aos seus.
            </p>

            <div style={{ marginBottom: 12 }}>
                <label className={s.label} htmlFor="personal-invite-email">
                    E-mail do personal
                </label>
                <input
                    id="personal-invite-email"
                    className={s.input}
                    type="email"
                    inputMode="email"
                    autoComplete="off"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="personal@exemplo.com"
                />
            </div>

            {needsAck && (
                <div className={s.warnBox}>
                    <div className={s.warnTitle}>
                        <FiAlertTriangle aria-hidden="true" />
                        Isto tira {affected}{' '}
                        {affected === 1 ? 'aluno' : 'alunos'} do mural até{' '}
                        {affected === 1 ? 'ele' : 'eles'} reconfirmarem
                    </div>
                    <p className={s.warnText}>
                        Ao entrar outro personal, o desafio passa a expor as
                        fotos e a sequência dos seus alunos para alunos de outra
                        carteira e para o outro personal. Isso muda o
                        consentimento que eles deram. {affected}{' '}
                        {affected === 1
                            ? 'aluno precisará reconfirmar a participação e ficará fora do mural até lá'
                            : 'alunos precisarão reconfirmar a participação e ficarão fora do mural até lá'}
                        . A sequência de cada um é preservada e volta intacta
                        quando confirmarem.
                    </p>
                    <label className={s.warnCheck}>
                        <input
                            type="checkbox"
                            checked={acknowledged}
                            onChange={(e) =>
                                setAcknowledged(e.target.checked)
                            }
                        />
                        Entendi e quero convidar mesmo assim.
                    </label>
                </div>
            )}

            {error && <div className={s.errorMsg}>{error}</div>}
        </Modal>
    );
}
