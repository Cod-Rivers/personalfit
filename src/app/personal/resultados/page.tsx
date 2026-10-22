'use client';

import { useCallback, useEffect, useState } from 'react';
import { FiImage } from 'react-icons/fi';
import FollowUpPage from '@/components/templates/FollowUpPage';
import ResultCardView from '@/components/features/results/ResultCardView';
import rs from '@/components/features/results/results.module.css';
import { useToast } from '@/components/system/Toast';
import { useAuthGuard } from '@/hooks/useAuthGuard';
import { listResultTags, respondResultTag, resultErrorMessage, type ResultTag } from '@/libs/resultService';

const TAG_LABEL: Record<ResultTag['tag_status'], string> = {
    pending: 'Aguardando sua resposta',
    accepted: 'Você aparece neste resultado',
    declined: 'Você recusou aparecer',
};

/** Resultados do mural em que um aluno marcou o personal. Aceitar faz o
 *  nome dele aparecer na publicação e o resultado entrar na vitrine. */
export default function PersonalResultsPage() {
    const { checking } = useAuthGuard({ allowedRoles: ['personal'] });
    const [items, setItems] = useState<ResultTag[] | null>(null);
    const [busy, setBusy] = useState<string | null>(null);
    const { showSuccess, showError, ToastSlot } = useToast();

    const load = useCallback(async () => {
        try {
            setItems(await listResultTags());
        } catch (e) {
            setItems([]);
            showError(resultErrorMessage(e, 'Não foi possível carregar.'));
        }
    }, [showError]);

    useEffect(() => {
        if (!checking) load();
    }, [checking, load]);

    const respond = async (id: string, accept: boolean) => {
        setBusy(id);
        try {
            await respondResultTag(id, accept);
            showSuccess(accept ? 'Pronto: seu nome aparece no resultado e na sua vitrine.' : 'Marcação recusada.');
            await load();
        } catch (e) {
            showError(resultErrorMessage(e, 'Não foi possível responder.'));
        } finally {
            setBusy(null);
        }
    };

    if (checking) return null;

    return (
        <FollowUpPage
            title="Resultados dos alunos"
            icon={<FiImage aria-hidden="true" />}
            subtitle="Antes e depois do mural em que um aluno marcou você. Ao aceitar, seu nome aparece na publicação e ela entra na sua vitrine, com a autorização do aluno registrada."
            help={{ text: 'Como funciona a marcação do personal no mural de resultados.', href: '/ajuda#resultados-personal' }}
            backHref="/personal"
        >
            {ToastSlot}
            {items === null && <p className={rs.muted}>Carregando…</p>}
            {items && items.length === 0 && (
                <div className={rs.empty}>Nenhum aluno marcou você num resultado publicado ainda.</div>
            )}
            {items && items.length > 0 && (
                <div className={rs.myList}>
                    {items.map((r) => (
                        <div key={r.id} className={rs.section}>
                            <span className={`${rs.badge} ${r.tag_status === 'accepted' ? rs.badgeVerified : r.tag_status === 'pending' ? rs.badgeWarn : ''}`}>
                                {TAG_LABEL[r.tag_status]}
                            </span>
                            <ResultCardView result={r} />
                            <div className={rs.actions}>
                                {r.tag_status !== 'declined' && (
                                    <button type="button" className={rs.btn} disabled={busy === r.id} onClick={() => respond(r.id, false)}>
                                        {r.tag_status === 'accepted' ? 'Deixar de aparecer' : 'Recusar'}
                                    </button>
                                )}
                                {r.tag_status !== 'accepted' && (
                                    <button type="button" className={rs.btnPrimary} disabled={busy === r.id} onClick={() => respond(r.id, true)}>
                                        Aceitar
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </FollowUpPage>
    );
}
