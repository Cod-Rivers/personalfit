'use client';

import React, { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { FiCornerUpLeft, FiMessageCircle, FiShield } from 'react-icons/fi';
import FollowUpPage from '@/components/templates/FollowUpPage';
import DeliveryStatus from '@/components/atoms/DeliveryStatus';
import { useToast } from '@/components/system/Toast';
import { useAuthGuard } from '@/hooks/useAuthGuard';
import { getStudentHomeRoute } from '@/libs/session';
import {
    commentDeliveryState,
    getMyAIReportPrivacy,
    listMyComments,
    markReplySeen,
    setMyAIReportPrivacy,
    type WorkoutComment,
} from '@/libs/workoutCommentService';
import {
    PAIN_TAG,
    WORKOUT_COMMENT_RETENTION_DAYS,
    describeCommentFacts,
    feelingOption,
    reactionOption,
} from '@/libs/workoutComment';
import s from './meus-comentarios.module.css';

function MyComments() {
    const params = useSearchParams();
    const highlightId = params.get('c');
    const { checking } = useAuthGuard();
    const { showError, ToastSlot } = useToast();
    const [items, setItems] = useState<WorkoutComment[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [optOut, setOptOut] = useState<boolean | null>(null);
    const [savingPrivacy, setSavingPrivacy] = useState(false);
    const highlightRef = useRef<HTMLLIElement>(null);

    useEffect(() => {
        if (checking) return;
        let alive = true;
        listMyComments()
            .then((list) => {
                if (!alive) return;
                setItems(list);
                // Ver a lista é ver as respostas: tira o selo de "nova".
                list.filter((c) => c.reply && !c.reply.seen_at).forEach((c) => void markReplySeen(c.id).catch(() => {}));
            })
            .catch(() => alive && setError('Não foi possível carregar seus comentários. Sem internet? Tente de novo depois.'));
        getMyAIReportPrivacy()
            .then((p) => alive && setOptOut(p.opt_out))
            .catch(() => {});
        return () => {
            alive = false;
        };
    }, [checking]);

    useEffect(() => {
        if (items && highlightId) highlightRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, [items, highlightId]);

    const togglePrivacy = async () => {
        if (optOut === null) return;
        setSavingPrivacy(true);
        try {
            setOptOut((await setMyAIReportPrivacy(!optOut)).opt_out);
        } catch {
            showError('Não foi possível salvar sua preferência.');
        } finally {
            setSavingPrivacy(false);
        }
    };

    if (checking) return null;

    return (
        <FollowUpPage
            title="Meus comentários"
            icon={<FiMessageCircle aria-hidden />}
            subtitle={`O que você disse ao seu personal no fim do treino, com as respostas. Cada comentário fica guardado por ${WORKOUT_COMMENT_RETENTION_DAYS} dias.`}
            help={{ text: 'Ao concluir o treino, você pode mandar um comentário ao seu personal: como foi, uma dor, a carga. Ele vê, reage e pode responder.', href: '/ajuda#comentario-treino' }}
            backHref={getStudentHomeRoute()}
        >
            {error && <p className={s.empty}>{error}</p>}
            {items && items.length === 0 && (
                <p className={s.empty}>
                    Você ainda não comentou nenhum treino. Na próxima vez que concluir, conte ao seu personal como foi.
                </p>
            )}
            {items && items.length > 0 && (
                <ul className={s.list}>
                    {items.map((c) => {
                        const feeling = feelingOption(c.feeling);
                        const reaction = reactionOption(c.reply?.reaction);
                        return (
                            <li
                                key={c.id}
                                ref={c.id === highlightId ? highlightRef : undefined}
                                className={`${s.item} ${c.id === highlightId ? s.highlighted : ''}`}
                            >
                                <div className={s.head}>
                                    <span className={s.when}>
                                        Treino {c.training_ref} · {new Date(c.workout_at).toLocaleDateString('pt-BR')}
                                    </span>
                                    <DeliveryStatus state={commentDeliveryState(c)} />
                                </div>
                                {(feeling || c.tags.length > 0) && (
                                    <p className={s.facts}>
                                        {feeling && `${feeling.emoji} ${feeling.label}`}
                                        {feeling && c.tags.length > 0 && ' · '}
                                        {describeCommentFacts(c.tags, c.tags.includes(PAIN_TAG) ? c.pain_regions : [])}
                                    </p>
                                )}
                                {c.text && <p className={s.text}>{c.text}</p>}
                                {c.reply && (
                                    <div className={s.reply}>
                                        <FiCornerUpLeft aria-hidden />
                                        <span>
                                            {reaction && <span aria-label={reaction.label}>{reaction.emoji} </span>}
                                            {c.reply.text}
                                        </span>
                                    </div>
                                )}
                            </li>
                        );
                    })}
                </ul>
            )}

            <section id="privacidade" className={s.privacy} aria-labelledby="privacy-title">
                <h2 id="privacy-title" className={s.privacyTitle}>
                    <FiShield aria-hidden /> Relatório com IA
                </h2>
                <p>
                    Se o seu personal usa o relatório de acompanhamento (plano PRO), seus comentários do mês podem ser
                    resumidos por uma IA para ele. Antes de enviar, o app tira seu nome, telefone, e-mail, documentos e
                    links. O texto do comentário não é guardado no relatório: só a data, o treino e os marcadores. A leitura
                    é feita pelo Google Gemini, como operador, e não diagnostica nada.
                </p>
                {optOut !== null && (
                    <label className={s.toggle}>
                        <input type="checkbox" checked={!optOut} onChange={() => void togglePrivacy()} disabled={savingPrivacy} />
                        <span>
                            {optOut
                                ? 'Meus comentários NÃO entram na leitura por IA (o relatório usa só os números).'
                                : 'Meus comentários podem entrar na leitura por IA do relatório.'}
                        </span>
                    </label>
                )}
            </section>
            {ToastSlot}
        </FollowUpPage>
    );
}

export default function MyCommentsPage() {
    return (
        <Suspense fallback={null}>
            <MyComments />
        </Suspense>
    );
}
