'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { isAxiosError } from 'axios';
import { FiPlus, FiShoppingBag } from 'react-icons/fi';
import Modal from '@/components/system/Modal';
import StoreListingFields from '@/components/organism/StoreListingFields';
import {
    getAllReferralPartners,
    type ReferralPartner,
} from '@/libs/referralPartnerService';
import AuthorApplications from './AuthorApplications';
import StoreCuration from './StoreCuration';
import {
    approveStoreRevision,
    createStoreProgram,
    EMPTY_LISTING,
    getAdminStoreMeta,
    getAdminStoreReview,
    getStoreCoverUploadUrl,
    listAdminStorePrograms,
    listStoreSourceTemplates,
    rejectStoreProgram,
    rejectStoreRevision,
    runStoreProgramAction,
    setStoreCover,
    STORE_STATUS_LABEL,
    updateStoreProgram,
    uploadToSignedUrl,
    type AdminStoreMeta,
    type AdminStoreProgram,
    type AdminStoreReview,
    type AdminStoreSourceTemplate,
    type ContentIssue,
    type StoreListing,
    type StoreProgramAction,
} from '@/libs/storeService';
import s from './AdminStore.module.css';

function money(v: number): string {
    return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function apiError(err: unknown, fallback: string): string {
    return (
        (isAxiosError(err) &&
            (err.response?.data as { error?: string })?.error) ||
        fallback
    );
}

function StatusChip({ status }: { status: AdminStoreProgram['status'] }) {
    const cls =
        status === 'published'
            ? s.chipLive
            : status === 'rejected' || status === 'retired'
              ? s.chipBad
              : status === 'paused' || status === 'pending'
                ? s.chipWarn
                : s.chip;
    return <span className={cls}>{STORE_STATUS_LABEL[status]}</span>;
}

/** O que a alteração em revisão muda na ficha, campo a campo. */
function revisionChanges(p: AdminStoreProgram): string[] {
    const rev = p.revision;
    if (!rev) return [];
    const out: string[] = [];
    const fields: [keyof StoreListing, string][] = [
        ['title', 'Título'],
        ['summary', 'Resumo'],
        ['description', 'Descrição'],
        ['audience', 'Para quem é'],
        ['prerequisites', 'Pré-requisitos'],
        ['level', 'Nível'],
        ['equipment', 'Local'],
        ['session_minutes', 'Duração da sessão'],
    ];
    for (const [key, label] of fields) {
        if (String(rev.listing[key] ?? '') !== String(p.listing[key] ?? '')) {
            out.push(
                `${label}: ${String(rev.listing[key] ?? '') || '(vazio)'}`,
            );
        }
    }
    if (
        [...rev.listing.goals].sort().join() !==
        [...p.listing.goals].sort().join()
    ) {
        out.push(`Objetivos: ${rev.listing.goals.join(', ') || '(nenhum)'}`);
    }
    if (rev.price_tier !== p.price_tier) {
        out.push(`Preço: ${money(p.price)} → ${money(rev.price)}`);
    }
    if ((rev.cover_key ?? '') !== (p.cover_key ?? '')) {
        out.push(
            rev.cover_key
                ? 'Capa nova (abaixo)'
                : 'Volta para a capa automática',
        );
    }
    if (rev.has_content) out.push('Conteúdo novo do plano');
    return out.length ? out : ['Nenhuma mudança na ficha.'];
}

/** Checklist da revisão (§5.8 e §5.10 do plano da loja). */
const REVIEW_CHECKLIST = [
    'Volume plausível para o nível (séries, repetições e descanso).',
    'Descrição sem promessa de resultado ("perca 10 kg em 30 dias" é publicidade enganosa, CDC art. 37).',
    'Sem nome ou imagem de terceiros.',
    'Vídeos funcionando; os próprios mostram a execução completa e segura e batem com o nome do exercício.',
    'Sem música protegida, sem marca d’água de outro app; quem aparece é o autor ou alguém que autorizou por escrito.',
    'CREF do autor ativo (conferido no cadastro do parceiro).',
];

/* ── Criar ficha ── */

function CreateProgramModal({
    open,
    meta,
    authors,
    onClose,
    onCreated,
}: {
    open: boolean;
    meta: AdminStoreMeta | null;
    authors: ReferralPartner[];
    onClose: () => void;
    onCreated: (p: AdminStoreProgram) => void;
}) {
    const [authorId, setAuthorId] = useState('');
    const [templates, setTemplates] = useState<
        AdminStoreSourceTemplate[] | null
    >(null);
    const [templateId, setTemplateId] = useState('');
    const [listing, setListing] = useState<StoreListing>(EMPTY_LISTING);
    const [tier, setTier] = useState('2990');
    const [needsRemoval, setNeedsRemoval] = useState(false);
    const [removeFromLibrary, setRemoveFromLibrary] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!open) return;
        setTemplates(null);
        setTemplateId('');
        setNeedsRemoval(false);
        setRemoveFromLibrary(false);
        listStoreSourceTemplates(authorId || undefined)
            .then(setTemplates)
            .catch(() => setTemplates([]));
    }, [open, authorId]);

    useEffect(() => {
        if (!open) {
            setAuthorId('');
            setListing(EMPTY_LISTING);
            setError('');
        }
    }, [open]);

    const pickTemplate = (id: string) => {
        setTemplateId(id);
        setNeedsRemoval(false);
        const t = templates?.find((x) => x.id === id);
        if (t && !listing.title) setListing({ ...listing, title: t.name });
    };

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setBusy(true);
        setError('');
        try {
            const created = await createStoreProgram({
                source_template_id: templateId,
                author_partner_id: authorId || undefined,
                listing,
                price_tier: tier,
                remove_source_from_library: removeFromLibrary,
            });
            onCreated(created);
        } catch (err) {
            const code =
                isAxiosError(err) &&
                (err.response?.data as { code?: string })?.code;
            if (code === 'source_in_public_library') {
                setNeedsRemoval(true);
            }
            setError(apiError(err, 'Não foi possível criar o programa.'));
        } finally {
            setBusy(false);
        }
    };

    const selected = templates?.find((t) => t.id === templateId);

    return (
        <Modal
            open={open}
            onClose={onClose}
            title="Novo programa na loja"
            footer={
                <>
                    <button
                        type="button"
                        className={s.btnGhost}
                        onClick={onClose}
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        form="createStoreProgram"
                        className={s.btnPrimary}
                        disabled={
                            busy ||
                            !templateId ||
                            (needsRemoval && !removeFromLibrary)
                        }
                    >
                        {busy ? 'Criando…' : 'Criar rascunho'}
                    </button>
                </>
            }
        >
            <form id="createStoreProgram" className={s.form} onSubmit={submit}>
                {error && <div className={s.errorMsg}>{error}</div>}
                <label className={s.field}>
                    <span className={s.label}>Autor</span>
                    <select
                        className={s.input}
                        value={authorId}
                        onChange={(e) => setAuthorId(e.target.value)}
                    >
                        <option value="">Coleção Venafit (sem autor)</option>
                        {authors.map((a) => (
                            <option key={a.id} value={a.id}>
                                {a.author?.public_name || a.name} ·{' '}
                                {a.author?.cref_label}
                                {a.author?.can_publish
                                    ? ''
                                    : ' (ainda não pode publicar)'}
                            </option>
                        ))}
                    </select>
                </label>
                <label className={s.field}>
                    <span className={s.label}>Modelo de origem</span>
                    <select
                        className={s.input}
                        value={templateId}
                        onChange={(e) => pickTemplate(e.target.value)}
                        required
                    >
                        <option value="">
                            {templates === null
                                ? 'Carregando…'
                                : 'Escolha o modelo'}
                        </option>
                        {(templates ?? []).map((t) => (
                            <option key={t.id} value={t.id}>
                                {t.name} · {t.trainings} treinos ·{' '}
                                {t.created_by_admin
                                    ? 'da equipe'
                                    : 'da conta do autor'}
                                {t.in_library ? ' · na biblioteca pública' : ''}
                            </option>
                        ))}
                    </select>
                    <small className={s.hint}>
                        {authorId
                            ? 'O programa ganha uma cópia congelada do modelo, fora de toda biblioteca. O autor continua editando o modelo dele; o programa só muda quando você atualizar o conteúdo.'
                            : 'Na Coleção Venafit, o programa usa o próprio modelo da equipe, que continua na biblioteca do personal.'}
                    </small>
                </label>
                {(needsRemoval || (authorId && selected?.in_library)) && (
                    <label className={s.goal}>
                        <input
                            type="checkbox"
                            checked={removeFromLibrary}
                            onChange={(e) =>
                                setRemoveFromLibrary(e.target.checked)
                            }
                        />
                        Retirar o modelo de origem da biblioteca pública (modelo
                        da equipe é apagado; modelo do autor fica privado na
                        conta dele). Sem isso, qualquer personal aplicaria o
                        programa de graça.
                    </label>
                )}
                <label className={s.field}>
                    <span className={s.label}>Preço</span>
                    <select
                        className={s.input}
                        value={tier}
                        onChange={(e) => setTier(e.target.value)}
                    >
                        {(meta?.price_tiers ?? []).map((t) => (
                            <option key={t.id} value={t.id}>
                                {money(t.value)} · Google Play:{' '}
                                {t.play_product_id}
                            </option>
                        ))}
                    </select>
                </label>
                <StoreListingFields listing={listing} onChange={setListing} />
            </form>
        </Modal>
    );
}

/* ── Revisão de um programa ── */

function ReviewModal({
    programId,
    meta,
    onClose,
    onChanged,
}: {
    programId: string | null;
    meta: AdminStoreMeta | null;
    onClose: () => void;
    onChanged: () => void;
}) {
    const [review, setReview] = useState<AdminStoreReview | null>(null);
    const [listing, setListing] = useState<StoreListing>(EMPTY_LISTING);
    const [tier, setTier] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [ok, setOk] = useState('');
    const [blockers, setBlockers] = useState<ContentIssue[]>([]);

    const load = useCallback(async () => {
        if (!programId) return;
        try {
            const r = await getAdminStoreReview(programId);
            setReview(r);
            setListing(r.program.listing);
            setTier(r.program.price_tier);
        } catch (err) {
            setError(apiError(err, 'Não foi possível abrir o programa.'));
        }
    }, [programId]);

    useEffect(() => {
        setReview(null);
        setError('');
        setOk('');
        setBlockers([]);
        void load();
    }, [load]);

    if (!programId) return null;

    const run = async (fn: () => Promise<unknown>, done: string) => {
        setBusy(true);
        setError('');
        setOk('');
        setBlockers([]);
        try {
            await fn();
            setOk(done);
            await load();
            onChanged();
        } catch (err) {
            const data = isAxiosError(err)
                ? (err.response?.data as { issues?: ContentIssue[] })
                : undefined;
            if (data?.issues) setBlockers(data.issues);
            setError(apiError(err, 'Não deu certo. Tente de novo.'));
        } finally {
            setBusy(false);
        }
    };

    const action = (a: StoreProgramAction, done: string) =>
        run(() => runStoreProgramAction(programId, a), done);

    const reject = () => {
        const reason = window.prompt('Motivo da recusa (o autor vai ler):');
        if (!reason?.trim()) return;
        void run(
            () => rejectStoreProgram(programId, reason.trim()),
            'Programa recusado.',
        );
    };

    const rejectRevision = () => {
        const reason = window.prompt(
            'Motivo da recusa da alteração (o autor vai ler):',
        );
        if (!reason?.trim()) return;
        void run(
            () => rejectStoreRevision(programId, reason.trim()),
            'Alteração recusada: a vitrine segue com a versão aprovada.',
        );
    };

    const uploadCover = async (file: File | undefined) => {
        if (!file) return;
        await run(async () => {
            const up = await getStoreCoverUploadUrl(programId, file.type);
            await uploadToSignedUrl(up.upload_url, file);
            await setStoreCover(programId, up.key);
        }, 'Capa atualizada.');
    };

    const p = review?.program;
    const editable = p && p.status !== 'retired';

    return (
        <Modal open onClose={onClose} title={p ? p.listing.title : 'Programa'}>
            {!review ? (
                error ? (
                    <div className={s.errorMsg}>{error}</div>
                ) : (
                    <p className={s.hint}>Carregando…</p>
                )
            ) : (
                p && (
                    <div className={s.form}>
                        <p className={s.hint}>
                            <StatusChip status={p.status} />{' '}
                            {p.venafit_collection
                                ? 'Coleção Venafit'
                                : `Autor: ${p.author_name ?? '—'}`}
                            {' · '}versão {p.version} · {p.sales_count} vendas ·{' '}
                            {money(p.price)}
                            {p.rejection_reason &&
                                ` · recusado: ${p.rejection_reason}`}
                            {p.status === 'paused' &&
                                (p.paused_by === 'author'
                                    ? ' · pausado pelo autor'
                                    : ' · pausado pela equipe')}
                            {p.revision_rejection_reason &&
                                ` · última alteração recusada: ${p.revision_rejection_reason}`}
                        </p>
                        {!p.venafit_collection && !p.author_can_publish && (
                            <div className={s.errorMsg}>
                                O autor ainda não pode publicar: falta conferir
                                o CREF, registrar o Termo do Autor ou ligar a
                                loja dele (Parceiros de Indicação → Autor).
                            </div>
                        )}
                        {error && <div className={s.errorMsg}>{error}</div>}
                        {blockers.length > 0 && (
                            <div className={s.errorMsg}>
                                {blockers.map((i, idx) => (
                                    <p key={idx} className={s.issue}>
                                        {i.message}
                                    </p>
                                ))}
                            </div>
                        )}
                        {ok && <div className={s.okMsg}>{ok}</div>}

                        <div className={s.actions}>
                            {[
                                'draft',
                                'pending',
                                'rejected',
                                'paused',
                            ].includes(p.status) && (
                                <button
                                    type="button"
                                    className={s.btnPrimary}
                                    disabled={busy}
                                    onClick={() =>
                                        void action(
                                            'publish',
                                            'Programa publicado na vitrine.',
                                        )
                                    }
                                >
                                    {p.status === 'pending'
                                        ? 'Aprovar e publicar'
                                        : 'Publicar'}
                                </button>
                            )}
                            {p.status === 'published' && (
                                <button
                                    type="button"
                                    className={s.btnGhost}
                                    disabled={busy}
                                    onClick={() =>
                                        void action(
                                            'pause',
                                            'Programa pausado: saiu da vitrine.',
                                        )
                                    }
                                >
                                    Pausar
                                </button>
                            )}
                            {p.status === 'paused' && (
                                <button
                                    type="button"
                                    className={s.btnGhost}
                                    disabled={busy}
                                    onClick={() =>
                                        void action(
                                            'resume',
                                            'Programa de volta à vitrine.',
                                        )
                                    }
                                >
                                    Voltar à vitrine
                                </button>
                            )}
                            {!p.venafit_collection &&
                                p.source_template_id &&
                                !['published', 'retired'].includes(
                                    p.status,
                                ) && (
                                    <button
                                        type="button"
                                        className={s.btnGhost}
                                        disabled={busy}
                                        onClick={() =>
                                            void action(
                                                'refresh',
                                                'Conteúdo atualizado a partir do modelo do autor.',
                                            )
                                        }
                                    >
                                        Atualizar do modelo
                                    </button>
                                )}
                            {['draft', 'pending'].includes(p.status) && (
                                <button
                                    type="button"
                                    className={s.btnDanger}
                                    disabled={busy}
                                    onClick={reject}
                                >
                                    Recusar
                                </button>
                            )}
                            {p.status !== 'retired' && (
                                <button
                                    type="button"
                                    className={s.btnDanger}
                                    disabled={busy}
                                    onClick={() => {
                                        if (
                                            window.confirm(
                                                'Encerrar de vez? Sai da loja e não volta. Quem comprou continua com o plano.',
                                            )
                                        )
                                            void action(
                                                'retire',
                                                'Programa encerrado.',
                                            );
                                    }}
                                >
                                    Encerrar
                                </button>
                            )}
                            {editable && (
                                <label className={s.goal}>
                                    <input
                                        type="checkbox"
                                        checked={p.featured}
                                        disabled={busy}
                                        onChange={(e) =>
                                            void run(
                                                () =>
                                                    updateStoreProgram(
                                                        programId,
                                                        {
                                                            featured:
                                                                e.target
                                                                    .checked,
                                                        },
                                                    ),
                                                e.target.checked
                                                    ? 'Programa em destaque.'
                                                    : 'Destaque removido.',
                                            )
                                        }
                                    />
                                    Destaque
                                </label>
                            )}
                        </div>

                        {p.revision && (
                            <section className={s.card}>
                                <h3 className={s.cardTitle}>
                                    Alteração enviada pelo autor em{' '}
                                    {new Date(
                                        p.revision.submitted_at,
                                    ).toLocaleDateString('pt-BR')}
                                </h3>
                                <p className={s.hint}>
                                    A vitrine segue com a versão aprovada até
                                    você decidir.{' '}
                                    {p.revision.has_content
                                        ? 'Traz conteúdo novo: as checagens, os vídeos e o plano abaixo são os da alteração.'
                                        : 'Só a ficha, o preço ou a capa mudaram; o conteúdo continua o mesmo.'}
                                </p>
                                {p.revision.note && (
                                    <p className={s.issue}>
                                        <strong>Nota do autor:</strong>{' '}
                                        {p.revision.note}
                                    </p>
                                )}
                                <ul className={s.checklist}>
                                    {revisionChanges(p).map((c) => (
                                        <li key={c}>{c}</li>
                                    ))}
                                </ul>
                                {p.revision.cover_url &&
                                    p.revision.cover_key !== p.cover_key && (
                                        <img
                                            src={p.revision.cover_url}
                                            alt="Capa proposta"
                                            className={s.cover}
                                        />
                                    )}
                                <div className={s.actions}>
                                    <button
                                        type="button"
                                        className={s.btnPrimary}
                                        disabled={busy}
                                        onClick={() =>
                                            void run(
                                                () =>
                                                    approveStoreRevision(
                                                        programId,
                                                    ),
                                                'Alteração aprovada: já está na vitrine.',
                                            )
                                        }
                                    >
                                        Aprovar alteração
                                    </button>
                                    <button
                                        type="button"
                                        className={s.btnDanger}
                                        disabled={busy}
                                        onClick={rejectRevision}
                                    >
                                        Recusar alteração
                                    </button>
                                </div>
                            </section>
                        )}

                        <section className={s.card}>
                            <h3 className={s.cardTitle}>
                                Checagens automáticas
                            </h3>
                            {review.issues.length === 0 ? (
                                <p className={s.hint}>
                                    Nenhum problema encontrado.
                                </p>
                            ) : (
                                review.issues.map((i, idx) => (
                                    <p
                                        key={idx}
                                        className={
                                            i.severity === 'block'
                                                ? s.issueBlock
                                                : s.issue
                                        }
                                    >
                                        {i.severity === 'block'
                                            ? 'Impede publicar: '
                                            : 'Aviso: '}
                                        {i.message}
                                    </p>
                                ))
                            )}
                            <h3 className={s.cardTitle}>
                                Checklist da revisão
                            </h3>
                            <ul className={s.checklist}>
                                {REVIEW_CHECKLIST.map((c) => (
                                    <li key={c}>{c}</li>
                                ))}
                            </ul>
                        </section>

                        {review.own_videos.length > 0 && (
                            <section className={s.card}>
                                <h3 className={s.cardTitle}>
                                    Vídeos próprios do autor (
                                    {review.own_videos.length})
                                </h3>
                                <p className={s.hint}>
                                    Na publicação, cada vídeo é copiado para a
                                    pasta do programa: o autor pode apagar ou
                                    trocar o original sem tirar o vídeo de quem
                                    comprou.
                                </p>
                                <div className={s.videos}>
                                    {review.own_videos.map((v, idx) => (
                                        <div key={idx}>
                                            <video
                                                className={s.video}
                                                src={v.url}
                                                controls
                                                preload="metadata"
                                            />
                                            <p className={s.meta}>
                                                {v.exercise} · {v.training}
                                                {v.in_store
                                                    ? ' · já na loja'
                                                    : ''}
                                                {v.fast_start === false &&
                                                    ' · só toca depois de baixar inteiro'}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}

                        {editable && (
                            <section className={s.card}>
                                <h3 className={s.cardTitle}>Ficha</h3>
                                <form
                                    className={s.form}
                                    onSubmit={(e) => {
                                        e.preventDefault();
                                        void run(
                                            () =>
                                                updateStoreProgram(programId, {
                                                    listing,
                                                    ...(tier !== p.price_tier
                                                        ? { price_tier: tier }
                                                        : {}),
                                                }),
                                            'Ficha salva.',
                                        );
                                    }}
                                >
                                    <label className={s.field}>
                                        <span className={s.label}>Preço</span>
                                        <select
                                            className={s.input}
                                            value={tier}
                                            onChange={(e) =>
                                                setTier(e.target.value)
                                            }
                                        >
                                            {(meta?.price_tiers ?? []).map(
                                                (t) => (
                                                    <option
                                                        key={t.id}
                                                        value={t.id}
                                                    >
                                                        {money(t.value)}
                                                    </option>
                                                ),
                                            )}
                                        </select>
                                        <small className={s.hint}>
                                            Depois de publicado, o preço muda no
                                            máximo uma vez a cada 30 dias.
                                        </small>
                                    </label>
                                    <StoreListingFields
                                        listing={listing}
                                        onChange={setListing}
                                    />
                                    <div className={s.actions}>
                                        <button
                                            type="submit"
                                            className={s.btnPrimary}
                                            disabled={busy}
                                        >
                                            Salvar ficha
                                        </button>
                                    </div>
                                </form>
                                <div className={s.field}>
                                    <span className={s.label}>Capa</span>
                                    {p.cover_url ? (
                                        <img
                                            src={p.cover_url}
                                            alt=""
                                            className={s.cover}
                                        />
                                    ) : (
                                        <p className={s.hint}>
                                            Sem capa enviada: a loja usa a mídia
                                            do 1º exercício.
                                        </p>
                                    )}
                                    <input
                                        type="file"
                                        accept="image/jpeg,image/png,image/webp"
                                        disabled={busy}
                                        onChange={(e) =>
                                            void uploadCover(
                                                e.target.files?.[0],
                                            )
                                        }
                                    />
                                    {p.cover_key && (
                                        <button
                                            type="button"
                                            className={s.btnGhost}
                                            disabled={busy}
                                            onClick={() =>
                                                void run(
                                                    () =>
                                                        setStoreCover(
                                                            programId,
                                                            '',
                                                        ),
                                                    'Capa removida.',
                                                )
                                            }
                                        >
                                            Usar a capa automática
                                        </button>
                                    )}
                                </div>
                            </section>
                        )}

                        <section className={s.card}>
                            <h3 className={s.cardTitle}>
                                {review.revision_content
                                    ? 'Conteúdo novo da alteração (só a equipe vê)'
                                    : 'Plano inteiro (só a equipe vê)'}
                            </h3>
                            {review.template.mesocycles.map((meso) => (
                                <div key={meso.id}>
                                    <p className={s.meta}>
                                        {meso.name} · {meso.duration_weeks}{' '}
                                        semanas
                                    </p>
                                    {meso.trainings.map((t) => (
                                        <div key={t.id} className={s.tableWrap}>
                                            <p className={s.itemTitle}>
                                                Treino {t.reference}
                                                {t.name ? ` · ${t.name}` : ''}
                                            </p>
                                            <table className={s.table}>
                                                <thead>
                                                    <tr>
                                                        <th>Exercício</th>
                                                        <th>Séries</th>
                                                        <th>Descanso</th>
                                                        <th>Vídeo</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {t.exercises.map((ex) => (
                                                        <tr key={ex.id}>
                                                            <td>{ex.name}</td>
                                                            <td>
                                                                {ex.series_label ||
                                                                    ex.series.join(
                                                                        ' / ',
                                                                    )}
                                                            </td>
                                                            <td>
                                                                {ex.rest_seconds
                                                                    ? `${ex.rest_seconds}s`
                                                                    : '—'}
                                                            </td>
                                                            <td>
                                                                {ex.video_url ? (
                                                                    <a
                                                                        href={
                                                                            ex.video_url
                                                                        }
                                                                        target="_blank"
                                                                        rel="noreferrer"
                                                                    >
                                                                        abrir
                                                                    </a>
                                                                ) : ex.exercise_library_id ? (
                                                                    'biblioteca'
                                                                ) : (
                                                                    '—'
                                                                )}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </section>
                    </div>
                )
            )}
        </Modal>
    );
}

/**
 * Página "Loja" do admin (Todo/PLANO_LOJA_DE_TREINOS.md §5.8): as fichas dos
 * programas, a criação a partir de um modelo (do autor ou da equipe), a
 * revisão com o plano inteiro e os vídeos próprios, publicar, pausar,
 * encerrar, destacar, preço e capa.
 */
export default function AdminStore() {
    const [programs, setPrograms] = useState<AdminStoreProgram[] | null>(null);
    const [meta, setMeta] = useState<AdminStoreMeta | null>(null);
    const [authors, setAuthors] = useState<ReferralPartner[]>([]);
    const [creating, setCreating] = useState(false);
    const [openId, setOpenId] = useState<string | null>(null);
    const [error, setError] = useState('');
    const [onlyReview, setOnlyReview] = useState(false);

    const loadAuthors = useCallback(() => {
        getAllReferralPartners()
            .then((list) => setAuthors(list.filter((p) => p.author)))
            .catch(() => setAuthors([]));
    }, []);

    const load = useCallback(async () => {
        try {
            setPrograms(await listAdminStorePrograms());
        } catch {
            setPrograms([]);
            setError('Não foi possível carregar a loja.');
        }
    }, []);

    useEffect(() => {
        void load();
        getAdminStoreMeta()
            .then(setMeta)
            .catch(() => setMeta(null));
        loadAuthors();
    }, [load, loadAuthors]);

    // Fila de revisão: os mais antigos primeiro (primeiro envio ou alteração).
    const inReview = (programs ?? [])
        .filter((p) => p.in_review)
        .sort((a, b) =>
            (a.revision?.submitted_at ?? a.submitted_at ?? '').localeCompare(
                b.revision?.submitted_at ?? b.submitted_at ?? '',
            ),
        );
    const shown = onlyReview ? inReview : (programs ?? []);

    return (
        <div className={s.container}>
            <div className={s.header}>
                <h2 className={s.title}>
                    <FiShoppingBag aria-hidden="true" /> Loja de treinos
                </h2>
                <button
                    type="button"
                    className={s.btnPrimary}
                    onClick={() => setCreating(true)}
                >
                    <FiPlus aria-hidden="true" /> Novo programa
                </button>
            </div>
            <p className={s.hint}>
                Programas à venda na loja do aluno. O autor é um parceiro com o
                bloco de autor (Parceiros de Indicação → Autor): CREF conferido,
                Termo do Autor e loja ligada. A Coleção Venafit são os modelos
                da equipe (os &quot;Estilo X&quot;).
            </p>
            {error && <div className={s.errorMsg}>{error}</div>}

            <AuthorApplications onApproved={loadAuthors} />
            <StoreCuration programs={programs ?? []} />

            <label className={s.goal}>
                <input
                    type="checkbox"
                    checked={onlyReview}
                    onChange={(e) => setOnlyReview(e.target.checked)}
                />
                Só o que espera revisão ({inReview.length})
            </label>

            {programs === null ? (
                <p className={s.hint}>Carregando…</p>
            ) : onlyReview && shown.length === 0 ? (
                <p className={s.hint}>Nada esperando revisão.</p>
            ) : programs.length === 0 ? (
                <p className={s.hint}>
                    Nenhum programa ainda. Os 20 &quot;Estilo X&quot; entram
                    pela ferramenta cmd/migrate-store-programs; programas de
                    autor, pelo botão acima.
                </p>
            ) : (
                <ul className={s.list}>
                    {shown.map((p) => (
                        <li key={p.id} className={s.item}>
                            <div className={s.itemMain}>
                                <p className={s.itemTitle}>
                                    {p.listing.title}
                                    <StatusChip status={p.status} />
                                    {p.revision && (
                                        <span className={s.chipWarn}>
                                            Alteração em revisão
                                        </span>
                                    )}
                                    {p.featured && (
                                        <span className={s.chipWarn}>
                                            Destaque
                                        </span>
                                    )}
                                </p>
                                <p className={s.meta}>
                                    {p.venafit_collection
                                        ? 'Coleção Venafit'
                                        : (p.author_name ?? 'Autor')}{' '}
                                    · {money(p.price)} · {p.sales_count} vendas
                                    · {p.days_per_week}x por semana ·{' '}
                                    {p.duration_weeks} semanas
                                </p>
                            </div>
                            <div className={s.actions}>
                                <button
                                    type="button"
                                    className={s.btnGhost}
                                    onClick={() => setOpenId(p.id)}
                                >
                                    Abrir
                                </button>
                            </div>
                        </li>
                    ))}
                </ul>
            )}

            <CreateProgramModal
                open={creating}
                meta={meta}
                authors={authors}
                onClose={() => setCreating(false)}
                onCreated={(p) => {
                    setCreating(false);
                    void load();
                    setOpenId(p.id);
                }}
            />
            <ReviewModal
                programId={openId}
                meta={meta}
                onClose={() => setOpenId(null)}
                onChanged={() => void load()}
            />
        </div>
    );
}
