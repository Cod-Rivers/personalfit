'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { isAxiosError } from 'axios';
import { FiPlus } from 'react-icons/fi';
import Modal from '@/components/system/Modal';
import {
    deleteAdminCollection,
    listAdminAuthorVideos,
    listAdminCollections,
    listAdminReviews,
    moderateAdminReview,
    promoteAdminAuthorVideo,
    saveAdminCollection,
    type AdminAuthorVideo,
    type AdminStoreCollection,
    type AdminStoreCollectionInput,
    type AdminStoreProgram,
    type AdminStoreReviewItem,
    type ReviewModeration,
} from '@/libs/storeService';
import s from './AdminStore.module.css';

function apiError(err: unknown, fallback: string): string {
    return (
        (isAxiosError(err) &&
            (err.response?.data as { error?: string })?.error) ||
        fallback
    );
}

const EMPTY_COLLECTION: AdminStoreCollectionInput = {
    slug: '',
    title: '',
    description: '',
    program_ids: [],
    published: false,
    position: 0,
};

/* ── Coleções temáticas ── */

function CollectionModal({
    editing,
    programs,
    onClose,
    onSaved,
}: {
    editing: AdminStoreCollection | 'new' | null;
    programs: AdminStoreProgram[];
    onClose: () => void;
    onSaved: () => void;
}) {
    const [form, setForm] =
        useState<AdminStoreCollectionInput>(EMPTY_COLLECTION);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        setError('');
        setForm(
            editing && editing !== 'new'
                ? {
                      slug: editing.slug,
                      title: editing.title,
                      description: editing.description ?? '',
                      program_ids: [...editing.program_ids],
                      published: editing.published,
                      position: editing.position,
                  }
                : EMPTY_COLLECTION,
        );
    }, [editing]);

    if (!editing) return null;
    const set = (patch: Partial<AdminStoreCollectionInput>) =>
        setForm((f) => ({ ...f, ...patch }));
    const titleOf = (id: string) =>
        programs.find((p) => p.id === id)?.listing.title ?? id;
    const available = programs.filter(
        (p) => p.status !== 'retired' && !form.program_ids.includes(p.id),
    );
    const move = (i: number, delta: number) => {
        const ids = [...form.program_ids];
        const j = i + delta;
        if (j < 0 || j >= ids.length) return;
        [ids[i], ids[j]] = [ids[j], ids[i]];
        set({ program_ids: ids });
    };

    const save = async () => {
        setBusy(true);
        setError('');
        try {
            await saveAdminCollection(
                editing === 'new' ? null : editing.id,
                form,
            );
            onSaved();
        } catch (err) {
            setError(apiError(err, 'Não foi possível salvar a coleção.'));
        } finally {
            setBusy(false);
        }
    };

    return (
        <Modal
            open
            onClose={onClose}
            title={editing === 'new' ? 'Nova coleção' : editing.title}
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
                        type="button"
                        className={s.btnPrimary}
                        disabled={busy || !form.title.trim()}
                        onClick={() => void save()}
                    >
                        {busy ? 'Salvando…' : 'Salvar'}
                    </button>
                </>
            }
        >
            <div className={s.form}>
                {error && <div className={s.errorMsg}>{error}</div>}
                <label className={s.field}>
                    <span className={s.label}>Título</span>
                    <input
                        className={s.input}
                        value={form.title}
                        maxLength={60}
                        onChange={(e) => set({ title: e.target.value })}
                    />
                </label>
                <div className={s.twoCols}>
                    <label className={s.field}>
                        <span className={s.label}>
                            Endereço (vazio = sai do título)
                        </span>
                        <input
                            className={s.input}
                            value={form.slug}
                            maxLength={60}
                            placeholder="treinar-em-casa"
                            onChange={(e) => set({ slug: e.target.value })}
                        />
                    </label>
                    <label className={s.field}>
                        <span className={s.label}>Posição na vitrine</span>
                        <input
                            className={s.input}
                            type="number"
                            inputMode="numeric"
                            value={form.position}
                            onChange={(e) =>
                                set({ position: Number(e.target.value) || 0 })
                            }
                        />
                    </label>
                </div>
                <label className={s.field}>
                    <span className={s.label}>Descrição</span>
                    <textarea
                        className={s.input}
                        rows={2}
                        maxLength={300}
                        value={form.description}
                        onChange={(e) => set({ description: e.target.value })}
                    />
                </label>
                <label className={s.goal}>
                    <input
                        type="checkbox"
                        checked={form.published}
                        onChange={(e) => set({ published: e.target.checked })}
                    />
                    Publicada (aparece na vitrine quando tiver programa à venda)
                </label>
                <div className={s.field}>
                    <span className={s.label}>
                        Programas, na ordem ({form.program_ids.length}/24)
                    </span>
                    {form.program_ids.length === 0 ? (
                        <p className={s.hint}>Nenhum programa ainda.</p>
                    ) : (
                        <ol className={s.checklist}>
                            {form.program_ids.map((id, i) => (
                                <li key={id}>
                                    {titleOf(id)}{' '}
                                    <button
                                        type="button"
                                        className={s.btnGhost}
                                        onClick={() => move(i, -1)}
                                        aria-label="Subir"
                                    >
                                        ↑
                                    </button>{' '}
                                    <button
                                        type="button"
                                        className={s.btnGhost}
                                        onClick={() => move(i, 1)}
                                        aria-label="Descer"
                                    >
                                        ↓
                                    </button>{' '}
                                    <button
                                        type="button"
                                        className={s.btnDanger}
                                        onClick={() =>
                                            set({
                                                program_ids:
                                                    form.program_ids.filter(
                                                        (x) => x !== id,
                                                    ),
                                            })
                                        }
                                    >
                                        Tirar
                                    </button>
                                </li>
                            ))}
                        </ol>
                    )}
                    <select
                        className={s.input}
                        value=""
                        onChange={(e) =>
                            e.target.value &&
                            set({
                                program_ids: [
                                    ...form.program_ids,
                                    e.target.value,
                                ],
                            })
                        }
                    >
                        <option value="">Adicionar programa…</option>
                        {available.map((p) => (
                            <option key={p.id} value={p.id}>
                                {p.listing.title}
                                {p.status !== 'published'
                                    ? ' (fora da vitrine)'
                                    : ''}
                            </option>
                        ))}
                    </select>
                </div>
            </div>
        </Modal>
    );
}

function Collections({ programs }: { programs: AdminStoreProgram[] }) {
    const [list, setList] = useState<AdminStoreCollection[] | null>(null);
    const [editing, setEditing] = useState<AdminStoreCollection | 'new' | null>(
        null,
    );
    const [error, setError] = useState('');

    const load = useCallback(async () => {
        try {
            setList(await listAdminCollections());
        } catch {
            setList([]);
            setError('Não foi possível carregar as coleções.');
        }
    }, []);

    useEffect(() => {
        void load();
    }, [load]);

    const remove = async (c: AdminStoreCollection) => {
        if (
            !window.confirm(
                `Apagar a coleção "${c.title}"? Os programas continuam na loja.`,
            )
        )
            return;
        try {
            await deleteAdminCollection(c.id);
            await load();
        } catch (err) {
            setError(apiError(err, 'Não foi possível apagar.'));
        }
    };

    return (
        <section className={s.card} aria-labelledby="colecoes">
            <div className={s.header}>
                <h3 id="colecoes" className={s.cardTitle}>
                    Coleções temáticas
                </h3>
                <button
                    type="button"
                    className={s.btnGhost}
                    onClick={() => setEditing('new')}
                >
                    <FiPlus aria-hidden="true" /> Nova coleção
                </button>
            </div>
            <p className={s.hint}>
                Linhas da vitrine (&quot;Treinar em casa&quot;, &quot;Para
                começar&quot;), cada uma com a página própria em
                /loja/colecao/endereço.
            </p>
            {error && <div className={s.errorMsg}>{error}</div>}
            {list === null ? (
                <p className={s.hint}>Carregando…</p>
            ) : list.length === 0 ? (
                <p className={s.hint}>Nenhuma coleção ainda.</p>
            ) : (
                <ul className={s.list}>
                    {list.map((c) => (
                        <li key={c.id} className={s.item}>
                            <div className={s.itemMain}>
                                <p className={s.itemTitle}>
                                    {c.title}
                                    <span
                                        className={
                                            c.published ? s.chipLive : s.chip
                                        }
                                    >
                                        {c.published ? 'Publicada' : 'Rascunho'}
                                    </span>
                                </p>
                                <p className={s.meta}>
                                    /loja/colecao/{c.slug} ·{' '}
                                    {c.program_ids.length} programa(s) · posição{' '}
                                    {c.position}
                                </p>
                            </div>
                            <div className={s.actions}>
                                <button
                                    type="button"
                                    className={s.btnGhost}
                                    onClick={() => setEditing(c)}
                                >
                                    Editar
                                </button>
                                <button
                                    type="button"
                                    className={s.btnDanger}
                                    onClick={() => void remove(c)}
                                >
                                    Apagar
                                </button>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
            <CollectionModal
                editing={editing}
                programs={programs}
                onClose={() => setEditing(null)}
                onSaved={() => {
                    setEditing(null);
                    void load();
                }}
            />
        </section>
    );
}

/* ── Comentários de quem comprou ── */

const MODERATION_LABEL: Record<ReviewModeration, string> = {
    pending: 'Para revisar',
    approved: 'Publicados',
    rejected: 'Recusados',
};

function Reviews() {
    const [status, setStatus] = useState<ReviewModeration>('pending');
    const [list, setList] = useState<AdminStoreReviewItem[] | null>(null);
    const [error, setError] = useState('');

    const load = useCallback(async () => {
        setError('');
        try {
            setList(await listAdminReviews(status));
        } catch {
            setList([]);
            setError('Não foi possível carregar os comentários.');
        }
    }, [status]);

    useEffect(() => {
        void load();
    }, [load]);

    const moderate = async (r: AdminStoreReviewItem, approve: boolean) => {
        try {
            await moderateAdminReview(r.id, approve);
            await load();
        } catch (err) {
            setError(apiError(err, 'Não deu certo. Tente de novo.'));
        }
    };

    return (
        <section className={s.card} aria-labelledby="comentarios">
            <div className={s.header}>
                <h3 id="comentarios" className={s.cardTitle}>
                    Comentários de quem comprou
                </h3>
                <select
                    className={s.input}
                    style={{ width: 'auto' }}
                    value={status}
                    aria-label="Situação"
                    onChange={(e) =>
                        setStatus(e.target.value as ReviewModeration)
                    }
                >
                    {(Object.keys(MODERATION_LABEL) as ReviewModeration[]).map(
                        (k) => (
                            <option key={k} value={k}>
                                {MODERATION_LABEL[k]}
                            </option>
                        ),
                    )}
                </select>
            </div>
            <p className={s.hint}>
                Só aparecem na página do programa depois de publicados, com o
                primeiro nome que o aluno autorizou. Recuse ofensa, dado
                pessoal, propaganda ou promessa de resultado.
            </p>
            {error && <div className={s.errorMsg}>{error}</div>}
            {list === null ? (
                <p className={s.hint}>Carregando…</p>
            ) : list.length === 0 ? (
                <p className={s.hint}>Nada aqui.</p>
            ) : (
                <ul className={s.list}>
                    {list.map((r) => (
                        <li key={r.id} className={s.item}>
                            <div className={s.itemMain}>
                                <p className={s.itemTitle}>
                                    {'★'.repeat(r.stars)}
                                    {'☆'.repeat(5 - r.stars)} · {r.first_name}
                                </p>
                                <p className={s.meta}>
                                    {r.program_title || 'Programa'} ·{' '}
                                    {new Date(r.created_at).toLocaleDateString(
                                        'pt-BR',
                                    )}
                                </p>
                                <p className={s.issue}>{r.comment}</p>
                            </div>
                            <div className={s.actions}>
                                {r.moderation !== 'approved' && (
                                    <button
                                        type="button"
                                        className={s.btnPrimary}
                                        onClick={() => void moderate(r, true)}
                                    >
                                        Publicar
                                    </button>
                                )}
                                {r.moderation !== 'rejected' && (
                                    <button
                                        type="button"
                                        className={s.btnDanger}
                                        onClick={() => void moderate(r, false)}
                                    >
                                        {r.moderation === 'approved'
                                            ? 'Tirar da página'
                                            : 'Recusar'}
                                    </button>
                                )}
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}

/* ── Vídeos de autores para a biblioteca geral ── */

function AuthorVideos() {
    const [list, setList] = useState<AdminAuthorVideo[] | null>(null);
    const [error, setError] = useState('');
    const [ok, setOk] = useState('');
    const [busy, setBusy] = useState('');

    const load = useCallback(async () => {
        try {
            setList(await listAdminAuthorVideos());
        } catch {
            setList([]);
            setError('Não foi possível carregar os vídeos.');
        }
    }, []);

    useEffect(() => {
        void load();
    }, [load]);

    const promote = async (v: AdminAuthorVideo) => {
        const target = window.prompt(
            'ID de um exercício da biblioteca que deve receber este vídeo (deixe em branco para criar um exercício novo):',
            '',
        );
        if (target === null) return;
        setBusy(v.exercise_id);
        setError('');
        setOk('');
        try {
            await promoteAdminAuthorVideo(
                v.exercise_id,
                target.trim() || undefined,
            );
            setOk(`"${v.name}" foi para a biblioteca, com o crédito do autor.`);
            await load();
        } catch (err) {
            setError(apiError(err, 'Não foi possível levar o vídeo.'));
        } finally {
            setBusy('');
        }
    };

    return (
        <section className={s.card} aria-labelledby="videos-autores">
            <h3 id="videos-autores" className={s.cardTitle}>
                Vídeos que os autores ofereceram à biblioteca
            </h3>
            <p className={s.hint}>
                O autor autoriza vídeo a vídeo. Levar para a biblioteca copia o
                vídeo para a pasta da biblioteca, com o crédito; o autor apagar
                o original não tira o vídeo de ninguém. Confira a execução, o
                áudio e quem aparece antes.
            </p>
            {error && <div className={s.errorMsg}>{error}</div>}
            {ok && <div className={s.okMsg}>{ok}</div>}
            {list === null ? (
                <p className={s.hint}>Carregando…</p>
            ) : list.length === 0 ? (
                <p className={s.hint}>Nenhum vídeo oferecido ainda.</p>
            ) : (
                <div className={s.videos}>
                    {list.map((v) => (
                        <div key={v.exercise_id}>
                            <video
                                className={s.video}
                                src={v.video_url}
                                poster={v.video_thumb || undefined}
                                controls
                                preload="metadata"
                            />
                            <p className={s.itemTitle}>{v.name}</p>
                            <p className={s.meta}>
                                {v.credit || 'Conta que não é mais autora'}
                                {v.muscle_group ? ` · ${v.muscle_group}` : ''}
                            </p>
                            {v.promoted_library_id ? (
                                <span className={s.chipLive}>
                                    Na biblioteca
                                </span>
                            ) : (
                                <button
                                    type="button"
                                    className={s.btnPrimary}
                                    disabled={
                                        busy === v.exercise_id || !v.credit
                                    }
                                    onClick={() => void promote(v)}
                                >
                                    {busy === v.exercise_id
                                        ? 'Levando…'
                                        : 'Levar para a biblioteca'}
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </section>
    );
}

/** Fase 3 da loja no admin: coleções, comentários e vídeos de autores. */
export default function StoreCuration({
    programs,
}: {
    programs: AdminStoreProgram[];
}) {
    return (
        <>
            <Collections programs={programs} />
            <Reviews />
            <AuthorVideos />
        </>
    );
}
