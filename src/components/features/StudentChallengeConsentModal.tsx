'use client';

import { useState } from 'react';
import axios from 'axios';
import Modal from '@/components/system/Modal';
import {
    acceptStudentChallengeInvite,
    declineStudentChallengeInvite,
    renewStudentChallengeConsent,
    requiredConsentVersion,
    acceptedPersonals,
    isMultiPersonal,
    type StudentChallenge,
} from '@/libs/studentChallengeService';
import s from './StudentChallengeConsentModal.module.css';

/** `accept` = primeiro aceite do convite. `renew` = o desafio passou a exigir
 * um escopo maior (virou multi-personal) e o aluno precisa reconfirmar. */
export type ConsentModalMode = 'accept' | 'renew';

interface Props {
    open: boolean;
    challenge: StudentChallenge;
    /** Padrão `accept`, que é o comportamento de sempre. */
    mode?: ConsentModalMode;
    onClose: () => void;
    onAccepted: (updated: StudentChallenge) => void;
    onDeclined: () => void;
}

function fmt(d: string): string {
    const dt = new Date(d + 'T00:00:00');
    return isNaN(dt.getTime()) ? d : dt.toLocaleDateString('pt-BR');
}

function personalDisplayName(name?: string): string {
    return name?.trim() || 'Personal sem nome cadastrado';
}

/**
 * Tela de consentimento específica do Desafio entre Alunos — diferente do
 * checkbox genérico de cadastro (SignUp), porque aqui o consentimento é
 * REVOGÁVEL a qualquer momento (opt-out), e precisa deixar isso claro antes
 * do aceite.
 *
 * O texto é CONDICIONAL ao escopo: num desafio multi-personal os mesmos dados
 * passam a ser vistos por alunos de outra carteira e por personais que não têm
 * contrato com este aluno — mudança material de destinatário, que exige dizer
 * quem são, nominalmente, antes do aceite.
 */
export default function StudentChallengeConsentModal({
    open,
    challenge,
    mode = 'accept',
    onClose,
    onAccepted,
    onDeclined,
}: Props) {
    const [checked, setChecked] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const multi = isMultiPersonal(challenge);
    const personals = acceptedPersonals(challenge);
    const renewing = mode === 'renew';

    async function handleAccept() {
        if (!checked) return;
        setSubmitting(true);
        setError('');
        const payload = {
            consent: true,
            consent_version: requiredConsentVersion(challenge),
        };
        try {
            const updated = renewing
                ? await renewStudentChallengeConsent(challenge.id, payload)
                : await acceptStudentChallengeInvite(challenge.id, payload);
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
            title={
                renewing
                    ? `Confirmar participação em "${challenge.name}"`
                    : `Participar de "${challenge.name}"`
            }
            footer={
                <>
                    {/* Na renovação não existe "Recusar": quem não confirma
                        simplesmente não volta ao mural, sem prazo e sem
                        expulsão (plano, 3.3 item 5). */}
                    <button
                        type="button"
                        className={s.btnGhost}
                        onClick={renewing ? onClose : handleDecline}
                        disabled={submitting}
                    >
                        {renewing ? 'Agora não' : 'Recusar'}
                    </button>
                    <button
                        type="button"
                        className={s.btnPrimary}
                        onClick={handleAccept}
                        disabled={submitting || !checked}
                    >
                        {submitting
                            ? 'Aguarde...'
                            : renewing
                              ? 'Confirmar e voltar ao mural'
                              : 'Aceitar e participar'}
                    </button>
                </>
            }
        >
            {challenge.description && (
                <p className={s.description}>{challenge.description}</p>
            )}

            {renewing ? (
                <p className={s.text}>
                    O desafio <strong>{challenge.name}</strong>, de{' '}
                    {fmt(challenge.start_date)} a {fmt(challenge.end_date)},
                    passou a reunir alunos de mais de um personal. Como isso
                    muda quem enxerga os seus dados, precisamos da sua
                    confirmação de novo. Até você confirmar, você continua
                    inscrito, mas <strong>fora do mural</strong>: ninguém vê
                    suas fotos nem sua sequência, e você também não vê a dos
                    outros. Sua sequência não é perdida e volta exatamente como
                    está assim que você confirmar.
                </p>
            ) : (
                <p className={s.text}>
                    Seu personal te convidou para o desafio de constância{' '}
                    <strong>{challenge.name}</strong>, de{' '}
                    {fmt(challenge.start_date)} a {fmt(challenge.end_date)}.
                </p>
            )}

            {multi ? (
                <>
                    <p className={s.text}>
                        Este desafio reúne alunos de{' '}
                        <strong>mais de um personal</strong>. Ao participar, as
                        fotos que você anexar ao concluir seus treinos durante o
                        período do desafio, a sua sequência de dias, o seu nome
                        e a sua foto de perfil ficarão visíveis para{' '}
                        <strong>
                            alunos de outros personais, que não são colegas da
                            sua carteira
                        </strong>
                        , e também para{' '}
                        <strong>
                            os outros personais participantes, que não são o seu
                            personal
                        </strong>
                        .
                    </p>
                    <p className={s.text}>
                        Personais que participam deste desafio hoje:
                    </p>
                    {personals.length === 0 ? (
                        <p className={s.text}>
                            A lista de personais ainda não está disponível. Se
                            ela não aparecer, feche e abra o convite de novo
                            antes de confirmar.
                        </p>
                    ) : (
                        <ul className={s.personalList}>
                            {personals.map((p) => (
                                <li
                                    className={s.personalItem}
                                    key={p.personal_id}
                                >
                                    <span className={s.personalName}>
                                        {personalDisplayName(p.name)}
                                    </span>
                                    {p.role === 'owner' && (
                                        <span className={s.personalTag}>
                                            organizador
                                        </span>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}
                    <p className={s.text}>
                        Eles não têm acesso ao seu treino, à sua avaliação, ao
                        seu telefone nem ao seu e-mail — apenas ao que aparece
                        no mural. Você pode sair do desafio a qualquer momento,
                        o que interrompe essa visibilidade imediatamente.
                    </p>
                </>
            ) : (
                <p className={s.text}>
                    Ao participar, as fotos que você anexar ao concluir seus
                    treinos durante o período do desafio ficarão visíveis aos
                    outros participantes. Você pode sair do desafio a qualquer
                    momento, o que interrompe essa visibilidade imediatamente.
                </p>
            )}

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
                    {multi
                        ? 'Li e concordo em compartilhar minhas fotos de check-in, minha sequência de dias, meu nome e minha foto de perfil com os demais participantes deste desafio — incluindo alunos de outros personais e os personais participantes listados acima.'
                        : 'Li e concordo em compartilhar minhas fotos de check-in e minha sequência de dias com os demais participantes deste desafio.'}
                </label>
            </div>
        </Modal>
    );
}
