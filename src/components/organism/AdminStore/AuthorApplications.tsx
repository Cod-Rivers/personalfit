'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { isAxiosError } from 'axios';
import Modal from '@/components/system/Modal';
import {
    approveAuthorApplication,
    listAuthorApplications,
    rejectAuthorApplication,
    type AuthorApplication,
} from '@/libs/storeService';
import s from './AdminStore.module.css';

function apiError(err: unknown, fallback: string): string {
    return (
        (isAxiosError(err) &&
            (err.response?.data as { error?: string })?.error) ||
        fallback
    );
}

function fmtDate(iso?: string): string {
    return iso ? new Date(iso).toLocaleDateString('pt-BR') : '';
}

const STATUS_LABEL: Record<AuthorApplication['status'], string> = {
    pending: 'Em análise',
    approved: 'Aprovada',
    rejected: 'Recusada',
};

/** Aprovar: o admin declara que conferiu o CREF; porcentagens e código são
 *  opcionais (vazio = o padrão e o código escolhido, ou sorteado). */
function ApproveModal({
    app,
    onClose,
    onDone,
}: {
    app: AuthorApplication | null;
    onClose: () => void;
    onDone: () => void;
}) {
    const [verified, setVerified] = useState(false);
    const [storeShare, setStoreShare] = useState('70');
    const [directShare, setDirectShare] = useState('85');
    const [code, setCode] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        setVerified(false);
        setStoreShare('70');
        setDirectShare('85');
        setCode('');
        setError('');
    }, [app]);

    if (!app) return null;

    const approve = async () => {
        setBusy(true);
        setError('');
        try {
            await approveAuthorApplication(app.id, {
                cref_verified: verified,
                store_share: Number(storeShare),
                direct_share: Number(directShare),
                code: code.trim() || undefined,
            });
            onDone();
        } catch (err) {
            setError(apiError(err, 'Não foi possível aprovar.'));
        } finally {
            setBusy(false);
        }
    };

    return (
        <Modal
            open
            onClose={onClose}
            title={`Aprovar ${app.public_name}`}
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
                        disabled={!verified || busy}
                        onClick={() => void approve()}
                    >
                        {busy ? 'Aprovando…' : 'Aprovar e tornar autor'}
                    </button>
                </>
            }
        >
            <div className={s.form}>
                {error && <div className={s.errorMsg}>{error}</div>}
                <p className={s.hint}>
                    A conta vira autor da loja. Se ela ainda não é de um
                    parceiro, um parceiro novo é criado, com a comissão padrão
                    da parceria e o painel liberado para esta conta. O Termo do
                    Autor ele aceita no painel; até lá, nada é publicado.
                </p>
                <label className={s.goal}>
                    <input
                        type="checkbox"
                        checked={verified}
                        onChange={(e) => setVerified(e.target.checked)}
                    />
                    Conferi o CREF {app.cref}/{app.cref_state} ativo na consulta
                    pública do CONFEF, no nome de {app.name}.
                </label>
                <div className={s.twoCols}>
                    <label className={s.field}>
                        <span className={s.label}>Parte na vitrine (%)</span>
                        <input
                            className={s.input}
                            type="number"
                            inputMode="decimal"
                            min={0}
                            max={100}
                            value={storeShare}
                            onChange={(e) => setStoreShare(e.target.value)}
                        />
                    </label>
                    <label className={s.field}>
                        <span className={s.label}>
                            Parte na venda direta (%)
                        </span>
                        <input
                            className={s.input}
                            type="number"
                            inputMode="decimal"
                            min={0}
                            max={100}
                            value={directShare}
                            onChange={(e) => setDirectShare(e.target.value)}
                        />
                    </label>
                    <label className={s.field}>
                        <span className={s.label}>Código (opcional)</span>
                        <input
                            className={s.input}
                            value={code}
                            maxLength={20}
                            placeholder={app.desired_code || 'sorteado'}
                            onChange={(e) => setCode(e.target.value)}
                        />
                    </label>
                </div>
                <p className={s.hint}>
                    Uma conta que já é de um parceiro mantém o código dele (e as
                    porcentagens combinadas antes, se já foi autor).
                </p>
            </div>
        </Modal>
    );
}

/** Candidaturas "Quero vender meus treinos" (fase 2 do plano da loja). */
export default function AuthorApplications({
    onApproved,
}: {
    /** Chamado depois de aprovar (a lista de autores muda). */
    onApproved: () => void;
}) {
    const [showAll, setShowAll] = useState(false);
    const [apps, setApps] = useState<AuthorApplication[] | null>(null);
    const [approving, setApproving] = useState<AuthorApplication | null>(null);
    const [error, setError] = useState('');
    const [ok, setOk] = useState('');

    const load = useCallback(async () => {
        try {
            setApps(
                await listAuthorApplications(showAll ? undefined : 'pending'),
            );
        } catch {
            setApps([]);
            setError('Não foi possível carregar as candidaturas.');
        }
    }, [showAll]);

    useEffect(() => {
        void load();
    }, [load]);

    const reject = async (app: AuthorApplication) => {
        const reason = window.prompt(
            `Motivo da recusa (vai por e-mail para ${app.email}):`,
        );
        if (!reason?.trim()) return;
        setError('');
        setOk('');
        try {
            await rejectAuthorApplication(app.id, reason.trim());
            setOk('Candidatura recusada; a pessoa recebe o motivo por e-mail.');
            await load();
        } catch (err) {
            setError(apiError(err, 'Não foi possível recusar.'));
        }
    };

    const pending = (apps ?? []).filter((a) => a.status === 'pending').length;

    return (
        <section className={s.card} aria-labelledby="candidaturas">
            <div className={s.header}>
                <h3 id="candidaturas" className={s.cardTitle}>
                    Candidaturas a autor
                    {pending > 0 && (
                        <span className={s.chipWarn}>{pending} em análise</span>
                    )}
                </h3>
                <label className={s.goal}>
                    <input
                        type="checkbox"
                        checked={showAll}
                        onChange={(e) => setShowAll(e.target.checked)}
                    />
                    Mostrar as respondidas
                </label>
            </div>
            {error && <div className={s.errorMsg}>{error}</div>}
            {ok && <div className={s.okMsg}>{ok}</div>}
            {apps === null ? (
                <p className={s.hint}>Carregando…</p>
            ) : apps.length === 0 ? (
                <p className={s.hint}>
                    {showAll
                        ? 'Nenhuma candidatura ainda.'
                        : 'Nenhuma candidatura em análise. O personal se candidata em /loja/vender.'}
                </p>
            ) : (
                <ul className={s.list}>
                    {apps.map((a) => (
                        <li key={a.id} className={s.item}>
                            <div className={s.itemMain}>
                                <p className={s.itemTitle}>
                                    {a.public_name}
                                    <span
                                        className={
                                            a.status === 'pending'
                                                ? s.chipWarn
                                                : a.status === 'approved'
                                                  ? s.chipLive
                                                  : s.chipBad
                                        }
                                    >
                                        {STATUS_LABEL[a.status]}
                                    </span>
                                </p>
                                <p className={s.meta}>
                                    CREF {a.cref}/{a.cref_state} · {a.name} ·{' '}
                                    {a.email}
                                    {a.phone ? ` · ${a.phone}` : ''} · enviada
                                    em {fmtDate(a.created_at)}
                                </p>
                                <p className={s.issue}>{a.pitch}</p>
                                {(a.specialties.length > 0 || a.links) && (
                                    <p className={s.meta}>
                                        {a.specialties.join(', ')}
                                        {a.specialties.length > 0 && a.links
                                            ? ' · '
                                            : ''}
                                        {a.links}
                                    </p>
                                )}
                                {a.bio && <p className={s.meta}>{a.bio}</p>}
                                {a.desired_code && (
                                    <p className={s.meta}>
                                        Código pedido: {a.desired_code}
                                    </p>
                                )}
                                {a.rejection_reason && (
                                    <p className={s.meta}>
                                        Motivo da recusa: {a.rejection_reason}
                                    </p>
                                )}
                            </div>
                            {a.status === 'pending' && (
                                <div className={s.actions}>
                                    <button
                                        type="button"
                                        className={s.btnPrimary}
                                        onClick={() => setApproving(a)}
                                    >
                                        Aprovar
                                    </button>
                                    <button
                                        type="button"
                                        className={s.btnDanger}
                                        onClick={() => void reject(a)}
                                    >
                                        Recusar
                                    </button>
                                </div>
                            )}
                        </li>
                    ))}
                </ul>
            )}
            <ApproveModal
                app={approving}
                onClose={() => setApproving(null)}
                onDone={() => {
                    setApproving(null);
                    setOk(
                        'Aprovada: a conta é autora. Ela recebe um e-mail para aceitar o termo e publicar.',
                    );
                    onApproved();
                    void load();
                }}
            />
        </section>
    );
}
