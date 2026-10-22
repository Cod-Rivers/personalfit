'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { FiCamera, FiEdit2, FiExternalLink, FiPlus, FiShare2, FiTrash2 } from 'react-icons/fi';
import Modal from '@/components/system/Modal';
import { useToast } from '@/components/system/Toast';
import {
    createEvolutionEntry,
    listEvolutionEntries,
    uploadEvolutionPhotos,
    type EvolutionEntry,
} from '@/libs/evolutionService';
import {
    deleteResult,
    listMyResults,
    RESULT_GOALS,
    resultErrorMessage,
    updateResult,
    type MyResult,
    type ResultScope,
    type ResultShow,
} from '@/libs/resultService';
import GhostCamera from './GhostCamera';
import PublishResultWizard from './PublishResultWizard';
import { CroppedPhoto, shortMonth } from './ResultPhotos';
import { ResultBadges, ResultStatsRow, weeksLabel } from './ResultCardView';
import { BeforePhotoReminder } from './ResultReminders';
import { shareResult } from './shareResult';
import s from './results.module.css';

const STATUS: Record<MyResult['status'], { label: string; cls: string }> = {
    pending: { label: 'Em revisão', cls: s.badgeWarn },
    published: { label: 'No mural', cls: s.badgeVerified },
    rejected: { label: 'Não aprovado', cls: s.badgeDanger },
    hidden: { label: 'Fora do ar (denúncia em análise)', cls: s.badgeDanger },
    removed: { label: 'Removido', cls: s.badgeDanger },
};

function todayISO(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** A aba "Resultados" da Evolução do aluno: as publicações dele no mural,
 *  o atalho para publicar e a câmera com guia para a foto de hoje.
 *  `intent` vem do link dos lembretes (?novo=foto | ?novo=resultado). */
export default function MyResultsPanel({ intent }: { intent?: 'foto' | 'resultado' | null }) {
    const [items, setItems] = useState<MyResult[] | null>(null);
    const [entries, setEntries] = useState<EvolutionEntry[]>([]);
    const [wizard, setWizard] = useState(false);
    const [camera, setCamera] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editing, setEditing] = useState<MyResult | null>(null);
    const [confirmDelete, setConfirmDelete] = useState<MyResult | null>(null);
    const { showSuccess, showError, ToastSlot } = useToast();

    const load = useCallback(async () => {
        try {
            const [mine, ev] = await Promise.all([listMyResults(), listEvolutionEntries()]);
            setItems(mine);
            setEntries(ev);
        } catch (e) {
            setItems([]);
            showError(resultErrorMessage(e, 'Não foi possível carregar seus resultados.'));
        }
    }, [showError]);

    useEffect(() => {
        load();
    }, [load]);

    useEffect(() => {
        if (intent === 'resultado') setWizard(true);
        if (intent === 'foto') setCamera(true);
    }, [intent]);

    const withPhotos = entries.filter((e) => (e.photo_urls?.length ?? 0) > 0);
    // A foto de antes da câmera com guia: a mais antiga com foto.
    const oldest = [...withPhotos].sort((a, b) => a.date.localeCompare(b.date))[0];
    const ghostUrl = oldest?.photo_urls?.[0];

    const saveTodayPhoto = async (file: File) => {
        setSaving(true);
        try {
            const keys = await uploadEvolutionPhotos([file]);
            await createEvolutionEntry({ date: todayISO(), photo_keys: keys });
            setCamera(false);
            showSuccess('Foto salva na sua Evolução.');
            await load();
        } catch (e) {
            showError(resultErrorMessage(e, 'Não foi possível salvar a foto.'));
        } finally {
            setSaving(false);
        }
    };

    const onShare = async (r: MyResult) => {
        const outcome = await shareResult(r);
        if (outcome === 'unsupported') showError('Atualize o app para compartilhar imagens.');
        else if (outcome === 'failed') showError('Não foi possível compartilhar agora.');
    };

    const remove = async () => {
        if (!confirmDelete) return;
        try {
            await deleteResult(confirmDelete.id);
            setConfirmDelete(null);
            showSuccess('Publicação apagada. Ela saiu do mural.');
            await load();
        } catch (e) {
            showError(resultErrorMessage(e, 'Não foi possível apagar.'));
        }
    };

    return (
        <div className={s.section}>
            {ToastSlot}
            <BeforePhotoReminder entries={entries} onTakePhoto={() => setCamera(true)} />

            <div className={s.section}>
                <h3 className={s.sectionTitle}>Meu antes e depois</h3>
                <p className={s.muted}>
                    Compare duas fotos da sua Evolução e, se quiser, publique no{' '}
                    <Link href="/resultados">mural de resultados</Link>. Nada fica público antes da revisão da
                    equipe, e você apaga quando quiser.
                </p>
                <div className={s.toolbar}>
                    <button type="button" className={s.btnPrimary} onClick={() => setWizard(true)}>
                        <FiPlus aria-hidden="true" /> Publicar antes e depois
                    </button>
                    <button type="button" className={s.btn} onClick={() => setCamera(true)}>
                        <FiCamera aria-hidden="true" /> {ghostUrl ? 'Foto de hoje com guia' : 'Tirar foto de hoje'}
                    </button>
                </div>
            </div>

            {items === null && <p className={s.muted}>Carregando…</p>}
            {items && items.length === 0 && (
                <div className={s.empty}>Você ainda não publicou nenhum antes e depois.</div>
            )}
            {items && items.length > 0 && (
                <div className={s.myList}>
                    {items.map((r) => {
                        const st = STATUS[r.status];
                        return (
                            <article key={r.id} className={s.card}>
                                <div className={s.cardHead}>
                                    <span className={`${s.badge} ${st.cls}`}>{st.label}</span>
                                    <span className={s.cardWeeks}>{weeksLabel(r.weeks_between)}</span>
                                </div>
                                <div className={s.pair}>
                                    <CroppedPhoto
                                        url={r.before_source.url}
                                        crop={r.before_source.crop}
                                        hide={r.before_source.hide}
                                        alt="Antes"
                                        tag={`Antes · ${shortMonth(r.before_date)}`}
                                    />
                                    <CroppedPhoto
                                        url={r.after_source.url}
                                        crop={r.after_source.crop}
                                        hide={r.after_source.hide}
                                        alt="Depois"
                                        tag={`Depois · ${shortMonth(r.after_date)}`}
                                    />
                                </div>
                                {r.rejection_reason && (
                                    <p className={s.error}>Motivo: {r.rejection_reason}. Ajuste e salve para reenviar.</p>
                                )}
                                <ResultBadges result={r} />
                                <ResultStatsRow stats={r.stats} />
                                {r.caption && <p className={s.caption}>“{r.caption}”</p>}
                                {r.personal_tag_status === 'pending' && r.status === 'published' && (
                                    <span className={s.badge}>Aguardando seu personal confirmar a marcação</span>
                                )}
                                <div className={s.cardFoot}>
                                    <div>
                                        <button type="button" className={s.linkBtn} onClick={() => setEditing(r)}>
                                            <FiEdit2 aria-hidden="true" /> Editar
                                        </button>
                                        {r.status === 'published' && (
                                            <>
                                                <button type="button" className={s.linkBtn} onClick={() => onShare(r)}>
                                                    <FiShare2 aria-hidden="true" /> Compartilhar
                                                </button>
                                                <Link href={`/resultados/${r.id}`} className={s.linkBtn}>
                                                    <FiExternalLink aria-hidden="true" /> Ver no mural
                                                </Link>
                                            </>
                                        )}
                                    </div>
                                    <button type="button" className={s.linkBtn} onClick={() => setConfirmDelete(r)}>
                                        <FiTrash2 aria-hidden="true" /> Apagar
                                    </button>
                                </div>
                            </article>
                        );
                    })}
                </div>
            )}

            <PublishResultWizard
                open={wizard}
                onClose={() => setWizard(false)}
                onTakePhoto={() => {
                    setWizard(false);
                    setCamera(true);
                }}
                onPublished={() => {
                    setWizard(false);
                    showSuccess('Enviado! A equipe revisa e avisa quando estiver no mural.');
                    load();
                }}
            />

            <Modal open={camera} onClose={() => !saving && setCamera(false)} title="Foto de hoje">
                {camera && (
                    <GhostCamera
                        ghostUrl={ghostUrl}
                        busy={saving}
                        onCaptured={saveTodayPhoto}
                        onCancel={() => setCamera(false)}
                    />
                )}
            </Modal>

            {editing && (
                <EditResultModal
                    result={editing}
                    onClose={() => setEditing(null)}
                    onSaved={(review) => {
                        setEditing(null);
                        showSuccess(review ? 'Salvo. A publicação voltou para a revisão.' : 'Salvo.');
                        load();
                    }}
                />
            )}

            <Modal
                open={!!confirmDelete}
                onClose={() => setConfirmDelete(null)}
                title="Apagar publicação?"
                footer={
                    <div className={s.actions}>
                        <button type="button" className={s.btn} onClick={() => setConfirmDelete(null)}>
                            Cancelar
                        </button>
                        <button type="button" className={s.btnDanger} onClick={remove}>
                            Apagar
                        </button>
                    </div>
                }
            >
                <p className={s.muted}>
                    A publicação sai do mural e da página do programa na hora. As fotos continuam na sua Evolução.
                </p>
            </Modal>
        </div>
    );
}

/** Edição: texto, objetivo, o que mostrar e onde pode aparecer. Pôr
 *  informação nova volta para a revisão; tirar não. */
function EditResultModal({
    result,
    onClose,
    onSaved,
}: {
    result: MyResult;
    onClose: () => void;
    onSaved: (backToReview: boolean) => void;
}) {
    const [caption, setCaption] = useState(result.caption ?? '');
    const [goal, setGoal] = useState(result.goal ?? '');
    const [show, setShow] = useState<ResultShow>(result.show);
    const [program, setProgram] = useState(result.scopes.includes('program'));
    const [author, setAuthor] = useState(result.scopes.includes('author'));
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    const save = async () => {
        setBusy(true);
        setError('');
        try {
            const scopes: ResultScope[] = ['mural'];
            if (program) scopes.push('program');
            if (author) scopes.push('author');
            const saved = await updateResult(result.id, { caption, goal, show, scopes });
            onSaved(saved.status === 'pending' && result.status !== 'pending');
        } catch (e) {
            setError(resultErrorMessage(e, 'Não foi possível salvar.'));
        } finally {
            setBusy(false);
        }
    };

    return (
        <Modal
            open
            onClose={onClose}
            title="Editar publicação"
            footer={
                <div className={s.actions}>
                    <button type="button" className={s.btn} onClick={onClose} disabled={busy}>
                        Cancelar
                    </button>
                    <button type="button" className={s.btnPrimary} onClick={save} disabled={busy}>
                        {busy ? 'Salvando…' : 'Salvar'}
                    </button>
                </div>
            }
        >
            <div className={s.section}>
                <label className={s.check}>
                    <input type="checkbox" checked={show.name} onChange={(e) => setShow({ ...show, name: e.target.checked })} />
                    Mostrar meu primeiro nome
                </label>
                <label className={s.check}>
                    <input type="checkbox" checked={show.weight} onChange={(e) => setShow({ ...show, weight: e.target.checked })} />
                    Diferença de peso
                </label>
                <label className={s.check}>
                    <input type="checkbox" checked={show.body_fat} onChange={(e) => setShow({ ...show, body_fat: e.target.checked })} />
                    Diferença de % de gordura
                </label>
                <label className={s.check}>
                    <input type="checkbox" checked={show.measurements} onChange={(e) => setShow({ ...show, measurements: e.target.checked })} />
                    Diferença das medidas
                </label>
                <label className={s.field}>
                    Objetivo
                    <select value={goal} onChange={(e) => setGoal(e.target.value)}>
                        <option value="">Não informar</option>
                        {RESULT_GOALS.map((g) => (
                            <option key={g.value} value={g.value}>
                                {g.label}
                            </option>
                        ))}
                    </select>
                </label>
                <label className={s.field}>
                    Texto
                    <textarea value={caption} maxLength={280} onChange={(e) => setCaption(e.target.value)} />
                    <span className={s.counter}>{caption.length}/280</span>
                </label>
                <label className={s.check}>
                    <input type="checkbox" checked={program} onChange={(e) => setProgram(e.target.checked)} />
                    Aparecer na página do programa da loja
                </label>
                <label className={s.check}>
                    <input type="checkbox" checked={author} onChange={(e) => setAuthor(e.target.checked)} />
                    O autor do programa pode divulgar
                </label>
                <p className={s.muted}>
                    Desligar o nome, um número ou uma autorização vale na hora. Texto novo ou informação nova voltam
                    para a revisão da equipe.
                </p>
                {error && <p className={s.error}>{error}</p>}
            </div>
        </Modal>
    );
}
