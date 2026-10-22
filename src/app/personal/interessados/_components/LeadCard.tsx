'use client';

import React, { useState } from 'react';
import { FiTrash2 } from 'react-icons/fi';
import { WhatsappIcon } from '@/app/vitrine/_components/ShowcaseCard';
import type { Lead, LeadUpdate } from '@/libs/leadService';
import {
    LEAD_STATUSES,
    LOST_REASONS,
    formatPhoneBR,
    goalLabel,
    leadWhatsappMessage,
    lostReasonLabel,
    modalityLabel,
    sourceLabel,
    timeAgo,
    type LeadStatus,
    type LostReason,
} from '@/libs/leadFunnel';
import { whatsappLink } from '@/libs/financeFormat';
import s from '../interessados.module.css';

interface Props {
    lead: Lead;
    personalName: string;
    onUpdate: (id: string, patch: LeadUpdate) => Promise<boolean>;
    onDelete: (lead: Lead) => void;
}

/** Um interessado: quem é, o que quer, de onde veio e o que fazer agora. */
export default function LeadCard({ lead, personalName, onUpdate, onDelete }: Props) {
    const [pendingLost, setPendingLost] = useState(false);
    const [note, setNote] = useState(lead.note ?? '');

    const wa = whatsappLink(lead.phone, leadWhatsappMessage(lead, personalName));
    const details = [goalLabel(lead.goal), modalityLabel(lead.modality)].filter(Boolean);

    function changeStatus(next: LeadStatus) {
        if (next === lead.status) return;
        if (next === 'lost') {
            // Perdeu exige o motivo: abre a escolha antes de gravar.
            setPendingLost(true);
            return;
        }
        setPendingLost(false);
        onUpdate(lead.id, { status: next });
    }

    function chooseLostReason(reason: LostReason) {
        setPendingLost(false);
        onUpdate(lead.id, { status: 'lost', lost_reason: reason });
    }

    function saveNote() {
        if ((lead.note ?? '') === note.trim()) return;
        onUpdate(lead.id, { note: note.trim() });
    }

    // Chamar no WhatsApp já conta como primeiro contato.
    function onWhatsappClick() {
        if (lead.status === 'new') onUpdate(lead.id, { status: 'contacted' });
    }

    return (
        <article className={lead.status === 'new' ? s.leadNew : s.lead}>
            <header className={s.leadHead}>
                <div className={s.leadWho}>
                    <h3 className={s.leadName}>{lead.name}</h3>
                    <span className={s.leadMeta}>
                        {sourceLabel(lead)} · {timeAgo(lead.last_request_at)}
                    </span>
                </div>
                <button
                    type="button"
                    className={s.iconBtn}
                    onClick={() => onDelete(lead)}
                    aria-label={`Apagar ${lead.name}`}
                    title="Apagar"
                >
                    <FiTrash2 />
                </button>
            </header>

            {details.length > 0 && (
                <div className={s.tags}>
                    {details.map((d) => (
                        <span key={d} className={s.tag}>
                            {d}
                        </span>
                    ))}
                </div>
            )}
            {lead.availability && (
                <p className={s.leadText}>
                    <strong>Horários:</strong> {lead.availability}
                </p>
            )}
            {lead.message && <p className={s.leadQuote}>&ldquo;{lead.message}&rdquo;</p>}
            <p className={s.leadText}>
                {lead.phone ? formatPhoneBR(lead.phone) : 'Sem WhatsApp'}
                {lead.email && <> · {lead.email}</>}
            </p>

            <div className={s.leadActions}>
                {wa ? (
                    <a
                        className={s.waBtn}
                        href={wa}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={onWhatsappClick}
                    >
                        <WhatsappIcon size={16} /> Chamar no WhatsApp
                    </a>
                ) : lead.email ? (
                    <a
                        className={s.waBtn}
                        href={`mailto:${lead.email}`}
                        onClick={onWhatsappClick}
                    >
                        Mandar e-mail
                    </a>
                ) : null}
                <label className={s.statusSelect}>
                    <span className="visually-hidden">Etapa</span>
                    <select
                        value={pendingLost ? 'lost' : lead.status}
                        onChange={(e) => changeStatus(e.target.value as LeadStatus)}
                        aria-label={`Etapa de ${lead.name}`}
                    >
                        {LEAD_STATUSES.map((st) => (
                            <option key={st.value} value={st.value}>
                                {st.label}
                            </option>
                        ))}
                    </select>
                </label>
            </div>

            {pendingLost && (
                <div className={s.lostPicker} role="group" aria-label="Por que não fechou?">
                    <span>Por que não fechou?</span>
                    <div className={s.lostChips}>
                        {LOST_REASONS.map((r) => (
                            <button
                                key={r.value}
                                type="button"
                                className={s.lostChip}
                                onClick={() => chooseLostReason(r.value)}
                            >
                                {r.label}
                            </button>
                        ))}
                        <button
                            type="button"
                            className={s.lostCancel}
                            onClick={() => setPendingLost(false)}
                        >
                            Cancelar
                        </button>
                    </div>
                </div>
            )}
            {lead.status === 'lost' && lead.lost_reason && !pendingLost && (
                <p className={s.leadText}>
                    <strong>Motivo:</strong> {lostReasonLabel(lead.lost_reason)}
                </p>
            )}

            <label className={s.noteField}>
                <span className="visually-hidden">Anotação</span>
                <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    onBlur={saveNote}
                    maxLength={500}
                    rows={1}
                    placeholder="Anotação (só você vê)"
                />
            </label>
        </article>
    );
}
