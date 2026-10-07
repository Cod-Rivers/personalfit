'use client';

import React, { useEffect, useState } from 'react';
import { isAxiosError } from 'axios';
import Modal from '@/components/system/Modal';
import {
    linkPartnerAccount,
    unlinkPartnerAccount,
    type ReferralPartner,
} from '@/libs/referralPartnerService';
import styles from './AdminReferralPartners.module.css';

/**
 * Libera o painel do parceiro (/parceiro) para uma conta do Venafit. O admin
 * digita o e-mail de LOGIN da pessoa e confere o nome que volta: o acesso
 * nunca sai sozinho do e-mail de contato, para ninguém criar uma conta com o
 * e-mail do parceiro e ver as comissões dele. Ao liberar, a pessoa recebe um
 * e-mail com o link do painel.
 */
export default function PartnerAccessModal({
    partner,
    onClose,
    onChanged,
}: {
    partner: ReferralPartner | null;
    onClose: () => void;
    onChanged: () => void;
}) {
    const [email, setEmail] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [done, setDone] = useState('');

    useEffect(() => {
        setEmail(partner?.email ?? '');
        setError('');
        setDone('');
    }, [partner]);

    if (!partner) return null;

    const errorText = (err: unknown, fallback: string) =>
        (isAxiosError(err) &&
            (err.response?.data as { error?: string })?.error) ||
        fallback;

    const link = async (e: React.FormEvent) => {
        e.preventDefault();
        setBusy(true);
        setError('');
        try {
            const acc = await linkPartnerAccount(partner.id, email.trim());
            setDone(
                `Painel liberado para ${acc.account_name} (${acc.account_email}). Enviamos um e-mail com o link.`,
            );
            onChanged();
        } catch (err) {
            setError(errorText(err, 'Não foi possível liberar o painel.'));
        } finally {
            setBusy(false);
        }
    };

    const unlink = async () => {
        if (
            !confirm(
                `Tirar o acesso de ${partner.account_name ?? 'esta conta'} ao painel de ${partner.name}?`,
            )
        )
            return;
        setBusy(true);
        setError('');
        try {
            await unlinkPartnerAccount(partner.id);
            setDone('Acesso removido.');
            onChanged();
        } catch (err) {
            setError(errorText(err, 'Não foi possível remover o acesso.'));
        } finally {
            setBusy(false);
        }
    };

    const linked =
        !!partner.account_email && !done.startsWith('Acesso removido');

    return (
        <Modal
            open
            onClose={onClose}
            title={`Painel de ${partner.name}`}
            footer={
                <>
                    <button
                        type="button"
                        className={styles.btnCancel}
                        onClick={onClose}
                    >
                        Fechar
                    </button>
                    {!linked && !done && (
                        <button
                            type="submit"
                            form="partnerAccessForm"
                            className={styles.btnSave}
                            disabled={busy}
                        >
                            {busy ? 'Liberando…' : 'Liberar painel'}
                        </button>
                    )}
                </>
            }
        >
            {error && <div className={styles.errorMsg}>{error}</div>}
            {done && <p className={styles.hint}>{done}</p>}

            {linked && !done ? (
                <div className={styles.form}>
                    <p className={styles.hint}>
                        O painel está liberado para{' '}
                        <strong>{partner.account_name}</strong> (
                        {partner.account_email}). A pessoa entra no Venafit com
                        essa conta e acessa <code>/parceiro</code>.
                    </p>
                    <button
                        type="button"
                        className={styles.btnDeactivate}
                        onClick={unlink}
                        disabled={busy}
                    >
                        Remover acesso
                    </button>
                </div>
            ) : (
                !done && (
                    <form
                        id="partnerAccessForm"
                        className={styles.form}
                        onSubmit={link}
                    >
                        <div className={styles.row}>
                            <label
                                className={styles.label}
                                htmlFor="partner_access_email"
                            >
                                E-mail de login da conta do parceiro no Venafit
                            </label>
                            <input
                                id="partner_access_email"
                                type="email"
                                className={styles.input}
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                            <small className={styles.smallHint}>
                                A pessoa precisa ter uma conta no Venafit (pode
                                ser gratuita). Confira o nome que aparece depois
                                de liberar: só ela verá as vendas e comissões
                                deste parceiro.
                            </small>
                        </div>
                    </form>
                )
            )}
        </Modal>
    );
}
