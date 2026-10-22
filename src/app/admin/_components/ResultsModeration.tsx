'use client';

import { useCallback, useEffect, useState } from 'react';
import Modal from '@/components/system/Modal';
import { useToast } from '@/components/system/Toast';
import { CroppedPhoto, shortMonth } from '@/components/features/results/ResultPhotos';
import { ResultBadges, ResultStatsRow, weeksLabel } from '@/components/features/results/ResultCardView';
import rs from '@/components/features/results/results.module.css';
import {
    adminApproveResult,
    adminListResults,
    adminRejectResult,
    adminRemoveResult,
    adminResultMetrics,
    REPORT_REASONS,
    resultErrorMessage,
    type AdminResult,
} from '@/libs/resultService';

type Status = 'pending' | 'hidden' | 'published' | 'rejected';

const TABS: { value: Status; label: string }[] = [
    { value: 'pending', label: 'Para revisar' },
    { value: 'hidden', label: 'Denunciadas' },
    { value: 'published', label: 'No mural' },
    { value: 'rejected', label: 'Recusadas' },
];

/** Motivos prontos da recusa (o aluno lê). */
const REJECT_REASONS = [
    'Foto sem roupa de treino ou de banho',
    'Pose sensual ou nudez',
    'Pessoa aparenta ter menos de 18 anos',
    'As fotos não parecem ser da mesma pessoa',
    'Foto com texto, contato ou propaganda',
    'Foto de baixa qualidade: não dá para comparar',
];

const reasonLabel = (v: string) => REPORT_REASONS.find((r) => r.value === v)?.label ?? v;
const when = (iso: string) => (iso ? new Date(iso).toLocaleString('pt-BR') : '—');

/** Moderação do mural de resultados (Todo/PLANO_MURAL_DE_RESULTADOS.md).
 *  A prévia usa os originais privados com o recorte por CSS; a cópia
 *  pública só nasce na aprovação. */
export default function ResultsModeration() {
    const [status, setStatus] = useState<Status>('pending');
    const [items, setItems] = useState<AdminResult[] | null>(null);
    const [metrics, setMetrics] = useState<{ mural_sales: number; mural_gross: number } | null>(null);
    const [rejecting, setRejecting] = useState<AdminResult | null>(null);
    const [reason, setReason] = useState('');
    const [busy, setBusy] = useState<string | null>(null);
    const { showSuccess, showError, ToastSlot } = useToast();

    const load = useCallback(async () => {
        setItems(null);
        try {
            setItems(await adminListResults(status));
        } catch (e) {
            setItems([]);
            showError(resultErrorMessage(e, 'Não foi possível carregar.'));
        }
    }, [status, showError]);

    useEffect(() => {
        load();
    }, [load]);

    useEffect(() => {
        adminResultMetrics().then(setMetrics).catch(() => {});
    }, []);

    const act = async (id: string, fn: () => Promise<void>, ok: string) => {
        setBusy(id);
        try {
            await fn();
            showSuccess(ok);
            await load();
        } catch (e) {
            showError(resultErrorMessage(e, 'Não foi possível concluir.'));
        } finally {
            setBusy(null);
        }
    };

    return (
        <div className={rs.section}>
            {ToastSlot}
            <h2 className={rs.sectionTitle}>Mural de resultados</h2>
            <p className={rs.muted}>
                Aprove só o que segue as regras do termo: roupa de treino ou de banho, sem nudez nem pose sensual,
                maior de idade, a mesma pessoa nas duas fotos. O selo “verificado” é calculado pelo servidor.
                {metrics && (
                    <>
                        {' '}
                        Vendas da loja vindas do mural: <strong>{metrics.mural_sales}</strong> (
                        {metrics.mural_gross.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}).
                    </>
                )}
            </p>
            <div className={rs.toolbar}>
                {TABS.map((t) => (
                    <button
                        key={t.value}
                        type="button"
                        className={status === t.value ? rs.btnPrimary : rs.btn}
                        onClick={() => setStatus(t.value)}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            {items === null && <p className={rs.muted}>Carregando…</p>}
            {items && items.length === 0 && <div className={rs.empty}>Nada aqui.</div>}
            <div className={rs.myList}>
                {items?.map((r) => (
                    <article key={r.id} className={rs.card}>
                        <div className={rs.cardHead}>
                            <span className={rs.cardName}>
                                {r.student_name} <span className={rs.cardWeeks}>({r.student_email})</span>
                            </span>
                            <span className={rs.cardWeeks}>{weeksLabel(r.weeks_between)}</span>
                        </div>
                        <div className={rs.pair}>
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
                        <ResultBadges result={r} />
                        <ResultStatsRow stats={r.stats} />
                        {r.caption && <p className={rs.caption}>“{r.caption}”</p>}
                        <p className={rs.disclaimer}>
                            Nome exibido: <strong>{r.display_name}</strong> · Programa do período:{' '}
                            {r.program_title || 'nenhum'}
                            {r.program_title && !r.scopes.includes('program') && ' (sem autorização para a página)'} ·
                            Fotos enviadas em {when(r.before_uploaded_at)} e {when(r.after_uploaded_at)} · Termo{' '}
                            {r.terms_version}, aceito em {when(r.consent_at)}
                            {r.personal_tag_status && ` · Personal marcado (${r.personal_tag_status})`}
                        </p>
                        {r.reports.length > 0 && (
                            <div className={`${rs.badge} ${rs.badgeDanger}`}>
                                {r.reports_count} denúncia(s): {r.reports.map((x) => reasonLabel(x.reason)).join(', ')}
                            </div>
                        )}
                        {r.moderation_reason && <p className={rs.error}>Recusa: {r.moderation_reason}</p>}
                        <div className={rs.actions}>
                            {(status === 'pending' || status === 'hidden') && (
                                <button
                                    type="button"
                                    className={rs.btnPrimary}
                                    disabled={busy === r.id}
                                    onClick={() => act(r.id, () => adminApproveResult(r.id), 'Publicado no mural.')}
                                >
                                    {status === 'hidden' ? 'Manter no mural' : 'Aprovar'}
                                </button>
                            )}
                            {status !== 'rejected' && (
                                <button
                                    type="button"
                                    className={rs.btn}
                                    disabled={busy === r.id}
                                    onClick={() => {
                                        setReason('');
                                        setRejecting(r);
                                    }}
                                >
                                    Recusar
                                </button>
                            )}
                            <button
                                type="button"
                                className={rs.btnDanger}
                                disabled={busy === r.id}
                                onClick={() => {
                                    if (window.confirm('Apagar para sempre? O aluno não poderá reenviar esta publicação.')) {
                                        act(r.id, () => adminRemoveResult(r.id), 'Publicação apagada.');
                                    }
                                }}
                            >
                                Apagar
                            </button>
                        </div>
                    </article>
                ))}
            </div>

            <Modal
                open={!!rejecting}
                onClose={() => setRejecting(null)}
                title="Recusar publicação"
                footer={
                    <div className={rs.actions}>
                        <button type="button" className={rs.btn} onClick={() => setRejecting(null)}>
                            Cancelar
                        </button>
                        <button
                            type="button"
                            className={rs.btnDanger}
                            disabled={!reason.trim()}
                            onClick={() => {
                                const r = rejecting!;
                                setRejecting(null);
                                act(r.id, () => adminRejectResult(r.id, reason), 'Recusada. O aluno foi avisado.');
                            }}
                        >
                            Recusar
                        </button>
                    </div>
                }
            >
                <div className={rs.section}>
                    <p className={rs.muted}>O aluno recebe o motivo e pode ajustar e reenviar.</p>
                    {REJECT_REASONS.map((x) => (
                        <label key={x} className={rs.check}>
                            <input type="radio" name="reject" checked={reason === x} onChange={() => setReason(x)} />
                            {x}
                        </label>
                    ))}
                    <label className={rs.field}>
                        Outro motivo
                        <textarea value={reason} maxLength={300} onChange={(e) => setReason(e.target.value)} />
                    </label>
                </div>
            </Modal>
        </div>
    );
}
