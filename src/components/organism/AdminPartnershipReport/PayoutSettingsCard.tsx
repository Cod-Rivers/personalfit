'use client';

import React, { useState } from 'react';
import { isAxiosError } from 'axios';
import Modal from '@/components/system/Modal';
import {
    saveProgramSettings,
    type ProgramSettings,
} from '@/libs/referralPartnerService';
import { fmtDate, money } from './PartnershipLists';
import s from './AdminPartnershipReport.module.css';

/**
 * Regras de repasse do programa (valor mínimo e dia do mês). São as mesmas
 * que o parceiro vê no painel dele; mudar aqui muda lá.
 */
export default function PayoutSettingsCard({
    settings,
    onSaved,
}: {
    settings: ProgramSettings | null;
    onSaved: (s: ProgramSettings) => void;
}) {
    const [open, setOpen] = useState(false);
    const [min, setMin] = useState('');
    const [day, setDay] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    if (!settings) return null;

    const edit = () => {
        setMin(String(settings.min_payout).replace('.', ','));
        setDay(String(settings.payout_day));
        setError('');
        setOpen(true);
    };

    const save = async (e: React.FormEvent) => {
        e.preventDefault();
        setBusy(true);
        setError('');
        try {
            onSaved(
                await saveProgramSettings(
                    Number(min.replace(',', '.')) || 0,
                    Number(day),
                ),
            );
            setOpen(false);
        } catch (err) {
            setError(
                (isAxiosError(err) &&
                    (err.response?.data as { error?: string })?.error) ||
                    'Não foi possível salvar.',
            );
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className={s.payoutBar}>
            <p className={s.payoutText}>
                <strong>Repasse:</strong> mensal, até o dia{' '}
                {settings.payout_day}, para saldo liberado de pelo menos{' '}
                {money(settings.min_payout)} · próximo até{' '}
                {fmtDate(settings.next_payout)} · carência de{' '}
                {settings.hold_days} dias
            </p>
            <button type="button" className={s.btnGhost} onClick={edit}>
                Alterar
            </button>

            <Modal
                open={open}
                onClose={() => setOpen(false)}
                title="Regras de repasse"
                footer={
                    <>
                        <button
                            type="button"
                            className={s.btnGhost}
                            onClick={() => setOpen(false)}
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            form="payoutSettingsForm"
                            className={s.btnPrimary}
                            disabled={busy}
                        >
                            {busy ? 'Salvando…' : 'Salvar'}
                        </button>
                    </>
                }
            >
                {error && (
                    <div className={s.errorMsg} role="alert">
                        {error}
                    </div>
                )}
                <form
                    id="payoutSettingsForm"
                    className={s.form}
                    onSubmit={save}
                >
                    <label className={s.field}>
                        <span className={s.fieldLabel}>
                            Valor mínimo para repasse (R$)
                        </span>
                        <input
                            className={s.input}
                            inputMode="decimal"
                            value={min}
                            onChange={(e) => setMin(e.target.value)}
                            required
                        />
                        <small className={s.fieldHint}>
                            Abaixo disso, o saldo acumula para o mês seguinte.
                        </small>
                    </label>
                    <label className={s.field}>
                        <span className={s.fieldLabel}>
                            Pagar até o dia (1 a 28)
                        </span>
                        <input
                            className={s.input}
                            type="number"
                            min={1}
                            max={28}
                            value={day}
                            onChange={(e) => setDay(e.target.value)}
                            required
                        />
                        <small className={s.fieldHint}>
                            O mês fecha no último dia; o saldo liberado até ali
                            é pago até este dia do mês seguinte. Os parceiros
                            veem estas regras no painel.
                        </small>
                    </label>
                </form>
            </Modal>
        </div>
    );
}
