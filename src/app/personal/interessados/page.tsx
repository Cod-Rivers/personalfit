'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { isAxiosError } from 'axios';
import { FiLock, FiPlus, FiUserPlus } from 'react-icons/fi';
import FollowUpPage from '@/components/templates/FollowUpPage';
import Button from '@/components/atoms/Button';
import CountBadge from '@/components/atoms/CountBadge';
import Modal from '@/components/system/Modal';
import { useToast } from '@/components/system/Toast';
import { useAuthGuard } from '@/hooks/useAuthGuard';
import { getUser } from '@/libs/session';
import {
    createLead,
    deleteLead,
    getMyPage,
    listLeads,
    updateLead,
    type Lead,
    type LeadInbox,
    type LeadUpdate,
    type ManualLead,
    type MyPersonalPage,
} from '@/libs/leadService';
import {
    LEAD_GOALS,
    LEAD_MODALITIES,
    isOpenStatus,
    type LeadStatus,
} from '@/libs/leadFunnel';
import PageSettings from './_components/PageSettings';
import LeadCard from './_components/LeadCard';
import s from './interessados.module.css';

type Filter = 'open' | 'new' | 'won' | 'lost' | 'all';

const FILTERS: { value: Filter; label: string }[] = [
    { value: 'open', label: 'Em aberto' },
    { value: 'new', label: 'Novos' },
    { value: 'won', label: 'Fecharam' },
    { value: 'lost', label: 'Perdidos' },
    { value: 'all', label: 'Todos' },
];

function matches(filter: Filter, status: LeadStatus): boolean {
    switch (filter) {
        case 'open':
            return isOpenStatus(status);
        case 'new':
            return status === 'new';
        case 'won':
            return status === 'won';
        case 'lost':
            return status === 'lost';
        default:
            return true;
    }
}

function errorMessage(err: unknown, fallback: string): string {
    return isAxiosError(err) && err.response?.data?.error
        ? String(err.response.data.error)
        : fallback;
}

const EMPTY_MANUAL: ManualLead = { name: '', phone: '', goal: '', modality: '', note: '' };

/** Funil de vendas do personal (-48): a página pública e quem pediu contato. */
export default function InteressadosPage() {
    const { checking } = useAuthGuard({ allowedRoles: ['personal'] });
    const { showError, showSuccess, ToastSlot } = useToast();
    const personalName = getUser()?.name ?? '';

    const [page, setPage] = useState<MyPersonalPage | null>(null);
    const [inbox, setInbox] = useState<LeadInbox | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [filter, setFilter] = useState<Filter>('open');
    const [manualOpen, setManualOpen] = useState(false);
    const [manual, setManual] = useState<ManualLead>(EMPTY_MANUAL);
    const [savingManual, setSavingManual] = useState(false);

    const load = useCallback(async () => {
        setLoadError(null);
        try {
            const [p, l] = await Promise.all([getMyPage(), listLeads()]);
            setPage(p);
            setInbox(l);
        } catch (err) {
            setLoadError(
                isAxiosError(err) && !err.response
                    ? 'Sem conexão. Os interessados aparecem quando a internet voltar.'
                    : 'Não foi possível carregar seus interessados.',
            );
        }
    }, []);

    useEffect(() => {
        if (!checking) load();
    }, [checking, load]);

    const leads = useMemo(() => inbox?.leads ?? [], [inbox]);
    const visible = useMemo(() => leads.filter((l) => matches(filter, l.status)), [leads, filter]);
    const newCount = leads.filter((l) => l.status === 'new').length;
    const openCount = leads.filter((l) => isOpenStatus(l.status)).length;
    const wonCount = leads.filter((l) => l.status === 'won').length;

    const handleUpdate = useCallback(
        async (id: string, patch: LeadUpdate): Promise<boolean> => {
            try {
                const updated = await updateLead(id, patch);
                setInbox((prev) =>
                    prev
                        ? {
                              ...prev,
                              leads: prev.leads.map((l) =>
                                  l.id === id ? { ...updated, referrer_name: l.referrer_name } : l,
                              ),
                          }
                        : prev,
                );
                return true;
            } catch (err) {
                showError(errorMessage(err, 'Não foi possível salvar a mudança.'));
                return false;
            }
        },
        [showError],
    );

    const handleDelete = useCallback(
        async (lead: Lead) => {
            if (!confirm(`Apagar ${lead.name} da sua caixa? Os dados saem de vez.`)) return;
            try {
                await deleteLead(lead.id);
                setInbox((prev) =>
                    prev ? { ...prev, leads: prev.leads.filter((l) => l.id !== lead.id) } : prev,
                );
            } catch (err) {
                showError(errorMessage(err, 'Não foi possível apagar.'));
            }
        },
        [showError],
    );

    async function submitManual(e: React.FormEvent) {
        e.preventDefault();
        setSavingManual(true);
        try {
            const created = await createLead({
                ...manual,
                name: manual.name.trim(),
                goal: manual.goal || undefined,
                modality: manual.modality || undefined,
            });
            setInbox((prev) => (prev ? { ...prev, leads: [created, ...prev.leads] } : prev));
            setManual(EMPTY_MANUAL);
            setManualOpen(false);
            setFilter('open');
            showSuccess('Interessado anotado.');
        } catch (err) {
            showError(errorMessage(err, 'Não foi possível anotar.'));
        } finally {
            setSavingManual(false);
        }
    }

    if (checking) return null;

    return (
        <FollowUpPage
            title="Interessados"
            icon={<FiUserPlus aria-hidden />}
            subtitle="Sua página pública e quem pediu contato por ela ou pelos seus desafios."
            help={{
                text: 'Sua página para a bio do Instagram, com o formulário "Quero treinar com você". Cada pedido chega aqui e no celular; chame no WhatsApp e mova o interessado pelas etapas até fechar.',
                href: '/ajuda#interessados',
            }}
            backHref="/personal"
            actions={
                <Button size="sm" leftIcon={<FiPlus />} onClick={() => setManualOpen(true)}>
                    Anotar
                </Button>
            }
        >
            {ToastSlot}
            {loadError && (
                <p className={s.errorBox} role="alert">
                    {loadError}{' '}
                    <button type="button" className={s.linkBtn} onClick={load}>
                        Tentar de novo
                    </button>
                </p>
            )}

            {page && (
                <PageSettings
                    data={page}
                    onSaved={(p) =>
                        setPage((prev) => (prev ? { ...prev, page: p, saved: true } : prev))
                    }
                    onError={showError}
                    onSuccess={showSuccess}
                />
            )}

            {inbox && (
                <section className={s.inbox} aria-labelledby="caixa-titulo">
                    <div className={s.inboxHead}>
                        <h2 id="caixa-titulo" className={s.cardTitle}>
                            Caixa de interessados
                        </h2>
                        <p className={s.cardSub}>
                            {openCount} em aberto · {wonCount} fecharam. Quem responde
                            nos primeiros minutos fecha muito mais.
                        </p>
                    </div>

                    <div className={s.tabs} role="tablist" aria-label="Filtro">
                        {FILTERS.map((f) => (
                            <button
                                key={f.value}
                                type="button"
                                role="tab"
                                aria-selected={filter === f.value}
                                className={filter === f.value ? s.tabActive : s.tab}
                                onClick={() => setFilter(f.value)}
                            >
                                {f.label}
                                {f.value === 'new' && (
                                    <CountBadge count={newCount} label={`${newCount} novos`} />
                                )}
                            </button>
                        ))}
                    </div>

                    {visible.length === 0 ? (
                        <p className={s.empty}>
                            {leads.length === 0
                                ? 'Ninguém pediu contato ainda. Publique sua página e coloque o link na bio do Instagram.'
                                : 'Nenhum interessado nesta etapa.'}
                        </p>
                    ) : (
                        <div className={s.list}>
                            {visible.map((l) => (
                                <LeadCard
                                    key={l.id}
                                    lead={l}
                                    personalName={personalName}
                                    onUpdate={handleUpdate}
                                    onDelete={handleDelete}
                                />
                            ))}
                        </div>
                    )}

                    {inbox.locked > 0 && (
                        <div className={s.lockedBox}>
                            <FiLock aria-hidden />
                            <p>
                                {inbox.locked === 1
                                    ? 'Mais 1 interessado guardado.'
                                    : `Mais ${inbox.locked} interessados guardados.`}{' '}
                                No plano grátis a caixa mostra os 3 pedidos mais
                                recentes; com o Plus você vê e acompanha todos.
                            </p>
                            <Link href="/pagamento?produto=personal-plus" className={s.lockedLink}>
                                Conhecer o Plus
                            </Link>
                        </div>
                    )}
                </section>
            )}

            <Modal
                open={manualOpen}
                onClose={() => setManualOpen(false)}
                title="Anotar interessado"
            >
                <form className={s.settingsForm} onSubmit={submitManual}>
                    <p className={s.cardSub}>
                        Para quem chegou por fora: conversa na academia, direct,
                        indicação.
                    </p>
                    <label className={s.field}>
                        <span>Nome</span>
                        <input
                            value={manual.name}
                            onChange={(e) => setManual({ ...manual, name: e.target.value })}
                            required
                            maxLength={80}
                        />
                    </label>
                    <label className={s.field}>
                        <span>WhatsApp com DDD</span>
                        <input
                            value={manual.phone ?? ''}
                            onChange={(e) => setManual({ ...manual, phone: e.target.value })}
                            required
                            inputMode="tel"
                            placeholder="(21) 99999-0000"
                        />
                    </label>
                    <label className={s.field}>
                        <span>Objetivo</span>
                        <select
                            value={manual.goal ?? ''}
                            onChange={(e) => setManual({ ...manual, goal: e.target.value })}
                        >
                            <option value="">Não sei</option>
                            {LEAD_GOALS.map((g) => (
                                <option key={g.value} value={g.value}>
                                    {g.label}
                                </option>
                            ))}
                        </select>
                    </label>
                    <label className={s.field}>
                        <span>Modalidade</span>
                        <select
                            value={manual.modality ?? ''}
                            onChange={(e) => setManual({ ...manual, modality: e.target.value })}
                        >
                            <option value="">Não sei</option>
                            {LEAD_MODALITIES.map((m) => (
                                <option key={m.value} value={m.value}>
                                    {m.label}
                                </option>
                            ))}
                        </select>
                    </label>
                    <label className={s.field}>
                        <span>Anotação (opcional)</span>
                        <textarea
                            value={manual.note ?? ''}
                            onChange={(e) => setManual({ ...manual, note: e.target.value })}
                            maxLength={500}
                            rows={2}
                        />
                    </label>
                    <div className={s.rowActions}>
                        <Button variant="ghost" size="sm" onClick={() => setManualOpen(false)}>
                            Cancelar
                        </Button>
                        <Button type="submit" size="sm" isLoading={savingManual}>
                            Anotar
                        </Button>
                    </div>
                </form>
            </Modal>
        </FollowUpPage>
    );
}
