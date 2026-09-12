'use client';

import { useCallback, useEffect, useState } from 'react';
import {
    FiAward,
    FiBookOpen,
    FiExternalLink,
    FiLock,
    FiMessageCircle,
} from 'react-icons/fi';
import {
    getMyChallengeContent,
    type ChallengeContent,
} from '@/libs/studentChallengeAntiFraudService';
import s from './ChallengePerksBlock.module.css';

interface Props {
    challengeId: string;
    /** Só busca o conteúdo quando o desafio realmente tem algo — evita uma
     * requisição por card em quem não usa a feature. */
    hasContent: boolean;
}

/**
 * Bloco do que o aluno ganha por participar: prêmio, treino geral, guia
 * alimentar e link do grupo.
 *
 * Quem só foi CONVIDADO recebe `locked: true` e o conteúdo vazio do servidor —
 * esta tela nunca precisa decidir o que esconder, só desenhar o que chegou. É
 * o gancho do convite: saber que existe algo ali sem ainda poder ver.
 */
export default function ChallengePerksBlock({
    challengeId,
    hasContent,
}: Props) {
    const [content, setContent] = useState<ChallengeContent | null>(null);
    const [loading, setLoading] = useState(false);

    const load = useCallback(async () => {
        if (!hasContent) return;
        setLoading(true);
        try {
            setContent(await getMyChallengeContent(challengeId));
        } catch {
            // Rota inexistente (antifraude desligado no servidor) ou falha de
            // rede: o bloco simplesmente não aparece. Nenhum dado essencial do
            // desafio depende dele.
            setContent(null);
        } finally {
            setLoading(false);
        }
    }, [challengeId, hasContent]);

    useEffect(() => {
        void load();
    }, [load]);

    if (!hasContent || loading || !content) return null;

    if (content.locked) {
        return (
            <div className={s.lockedBox}>
                <FiLock aria-hidden="true" />
                <span>
                    Este desafio tem material exclusivo para quem participa.
                    Aceite o convite para liberar.
                </span>
            </div>
        );
    }

    const { prize, group, workout, nutrition_guide: guide } = content;
    if (!prize && !group && !workout && !guide) return null;

    return (
        <div className={s.block}>
            {prize && (
                <section className={s.card}>
                    <h4 className={s.cardTitle}>
                        <FiAward aria-hidden="true" /> Prêmio
                    </h4>
                    <p className={s.prizeTitle}>{prize.title}</p>
                    {prize.description && (
                        <p className={s.text}>{prize.description}</p>
                    )}
                    <p className={s.meta}>
                        {prize.positions === 1
                            ? 'Para o primeiro colocado do mural.'
                            : `Para os ${prize.positions} primeiros colocados do mural.`}
                    </p>
                    {prize.awarded_at && (
                        <p className={s.meta}>
                            Prêmio já entregue pelo personal.
                        </p>
                    )}
                </section>
            )}

            {group && (
                <section className={s.card}>
                    <h4 className={s.cardTitle}>
                        <FiMessageCircle aria-hidden="true" /> Grupo do desafio
                    </h4>
                    {group.note && <p className={s.text}>{group.note}</p>}
                    <p className={s.warn}>
                        Ao entrar, seu número de telefone fica visível para os
                        outros participantes. Participar do grupo é opcional e
                        não afeta sua pontuação.
                    </p>
                    {/*
                      Navegação na MESMA janela, de propósito. Dentro do app
                      Android, um link com target="_blank" simplesmente não faz
                      nada (a WebView não implementa onCreateWindow); já a
                      navegação normal cai em shouldOverrideUrlLoading e abre o
                      WhatsApp/Telegram nativo.
                    */}
                    <button
                        type="button"
                        className={s.btnGroup}
                        onClick={() => {
                            window.location.href = group.url;
                        }}
                    >
                        <FiExternalLink aria-hidden="true" />
                        Abrir grupo no{' '}
                        {group.platform === 'whatsapp'
                            ? 'WhatsApp'
                            : 'Telegram'}
                    </button>
                </section>
            )}

            {workout && (
                <section className={s.card}>
                    <h4 className={s.cardTitle}>
                        <FiBookOpen aria-hidden="true" /> {workout.title}
                    </h4>
                    {workout.description && (
                        <p className={s.text}>{workout.description}</p>
                    )}
                    <p className={s.meta}>
                        Sugestão geral do desafio, igual para todos. Não
                        substitui o seu plano de treino.
                    </p>
                    <ul className={s.exerciseList}>
                        {workout.exercises.map((ex, i) => (
                            <li key={i} className={s.exercise}>
                                <span className={s.exerciseName}>
                                    {ex.name}
                                </span>
                                <span className={s.exerciseDetail}>
                                    {[
                                        ex.sets && `${ex.sets} séries`,
                                        ex.reps && `${ex.reps} reps`,
                                        ex.rest && `descanso ${ex.rest}`,
                                    ]
                                        .filter(Boolean)
                                        .join(' · ')}
                                </span>
                                {ex.notes && (
                                    <span className={s.exerciseNotes}>
                                        {ex.notes}
                                    </span>
                                )}
                            </li>
                        ))}
                    </ul>
                </section>
            )}

            {guide && (
                <section className={s.card}>
                    <h4 className={s.cardTitle}>
                        <FiBookOpen aria-hidden="true" /> {guide.title}
                    </h4>
                    {guide.body && <p className={s.guideBody}>{guide.body}</p>}
                    {guide.media_url && (
                        <button
                            type="button"
                            className={s.btnGroup}
                            onClick={() => {
                                window.location.href =
                                    guide.media_url as string;
                            }}
                        >
                            <FiExternalLink aria-hidden="true" /> Abrir material
                        </button>
                    )}
                    {/* Aviso vindo do servidor, nunca escrito aqui: prescrição
                        de dieta individualizada é ato privativo de
                        nutricionista, e este guia fica do lado educativo. */}
                    <p className={s.legal}>{guide.disclaimer}</p>
                </section>
            )}
        </div>
    );
}
