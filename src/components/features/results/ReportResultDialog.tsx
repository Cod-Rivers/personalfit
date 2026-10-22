'use client';

import { useState } from 'react';
import Modal from '@/components/system/Modal';
import { REPORT_REASONS, reportResult, resultErrorMessage } from '@/libs/resultService';
import s from './results.module.css';

/** Denúncia de uma publicação do mural (com ou sem login). */
export default function ReportResultDialog({
    resultId,
    onClose,
    onDone,
}: {
    resultId: string | null;
    onClose: () => void;
    onDone: (message: string) => void;
}) {
    const [reason, setReason] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    const send = async () => {
        if (!resultId || !reason) return;
        setBusy(true);
        setError('');
        try {
            await reportResult(resultId, reason);
            setReason('');
            onDone('Denúncia enviada. A equipe vai analisar.');
        } catch (e) {
            setError(resultErrorMessage(e, 'Não foi possível enviar a denúncia.'));
        } finally {
            setBusy(false);
        }
    };

    return (
        <Modal
            open={!!resultId}
            onClose={onClose}
            title="Denunciar publicação"
            footer={
                <div className={s.actions}>
                    <button type="button" className={s.btn} onClick={onClose} disabled={busy}>
                        Cancelar
                    </button>
                    <button type="button" className={s.btnDanger} onClick={send} disabled={!reason || busy}>
                        {busy ? 'Enviando…' : 'Denunciar'}
                    </button>
                </div>
            }
        >
            <div className={s.section} role="radiogroup" aria-label="Motivo">
                <p className={s.muted}>
                    Publicações com denúncia de menor de idade, ou da própria pessoa da foto, saem do ar na hora até a
                    revisão.
                </p>
                {REPORT_REASONS.map((r) => (
                    <label key={r.value} className={s.check}>
                        <input
                            type="radio"
                            name="report-reason"
                            value={r.value}
                            checked={reason === r.value}
                            onChange={() => setReason(r.value)}
                        />
                        {r.label}
                    </label>
                ))}
                {error && <p className={s.error}>{error}</p>}
            </div>
        </Modal>
    );
}
