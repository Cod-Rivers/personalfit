'use client';

import React from 'react';
import {
    STORE_EQUIPMENT,
    STORE_GOALS,
    STORE_LEVELS,
    STORE_LIMITS,
    type StoreListing,
} from '@/libs/storeService';
import s from './StoreListingFields.module.css';

interface Props {
    listing: StoreListing;
    onChange: (l: StoreListing) => void;
    /** Mostra, abaixo da descrição, o lembrete do que a revisão recusa
     *  (o autor escrevendo a própria ficha). */
    showReviewHints?: boolean;
}

/** Textos e etiquetas da ficha de um programa da loja: o admin edita na
 *  página "Loja", o autor no envio a partir de "Minha biblioteca". */
export default function StoreListingFields({
    listing,
    onChange,
    showReviewHints = false,
}: Props) {
    const set = (patch: Partial<StoreListing>) =>
        onChange({ ...listing, ...patch });
    const toggleGoal = (g: string) =>
        set({
            goals: listing.goals.includes(g)
                ? listing.goals.filter((x) => x !== g)
                : [...listing.goals, g],
        });
    return (
        <>
            <label className={s.field}>
                <span className={s.label}>
                    Título ({listing.title.length}/{STORE_LIMITS.title})
                </span>
                <input
                    className={s.input}
                    value={listing.title}
                    maxLength={STORE_LIMITS.title}
                    onChange={(e) => set({ title: e.target.value })}
                    required
                />
            </label>
            <label className={s.field}>
                <span className={s.label}>
                    Resumo do card ({listing.summary.length}/
                    {STORE_LIMITS.summary})
                </span>
                <input
                    className={s.input}
                    value={listing.summary}
                    maxLength={STORE_LIMITS.summary}
                    onChange={(e) => set({ summary: e.target.value })}
                />
            </label>
            <div className={s.twoCols}>
                <label className={s.field}>
                    <span className={s.label}>Nível</span>
                    <select
                        className={s.input}
                        value={listing.level}
                        onChange={(e) => set({ level: e.target.value })}
                    >
                        <option value="">—</option>
                        {STORE_LEVELS.map((l) => (
                            <option key={l.value} value={l.value}>
                                {l.label}
                            </option>
                        ))}
                    </select>
                </label>
                <label className={s.field}>
                    <span className={s.label}>Local</span>
                    <select
                        className={s.input}
                        value={listing.equipment}
                        onChange={(e) => set({ equipment: e.target.value })}
                    >
                        <option value="">—</option>
                        {STORE_EQUIPMENT.map((q) => (
                            <option key={q.value} value={q.value}>
                                {q.label}
                            </option>
                        ))}
                    </select>
                </label>
                <label className={s.field}>
                    <span className={s.label}>Duração da sessão (min)</span>
                    <input
                        type="number"
                        inputMode="numeric"
                        className={s.input}
                        min={0}
                        max={240}
                        value={listing.session_minutes || ''}
                        onChange={(e) =>
                            set({
                                session_minutes: Number(e.target.value) || 0,
                            })
                        }
                    />
                </label>
            </div>
            <div className={s.field}>
                <span className={s.label}>Objetivos</span>
                <div className={s.goals}>
                    {STORE_GOALS.map((g) => (
                        <label key={g.value} className={s.goal}>
                            <input
                                type="checkbox"
                                checked={listing.goals.includes(g.value)}
                                onChange={() => toggleGoal(g.value)}
                            />
                            {g.label}
                        </label>
                    ))}
                </div>
            </div>
            <label className={s.field}>
                <span className={s.label}>
                    Descrição ({listing.description.length}/
                    {STORE_LIMITS.description})
                </span>
                <textarea
                    className={s.input}
                    rows={6}
                    maxLength={STORE_LIMITS.description}
                    value={listing.description}
                    onChange={(e) => set({ description: e.target.value })}
                />
                {showReviewHints && (
                    <small className={s.hint}>
                        Sem promessa de resultado (&ldquo;perca 10 kg em 30
                        dias&rdquo;) e sem nome ou imagem de outras pessoas: a
                        revisão recusa.
                    </small>
                )}
            </label>
            <label className={s.field}>
                <span className={s.label}>Para quem é</span>
                <textarea
                    className={s.input}
                    rows={3}
                    maxLength={STORE_LIMITS.audience}
                    value={listing.audience}
                    onChange={(e) => set({ audience: e.target.value })}
                />
            </label>
            <label className={s.field}>
                <span className={s.label}>Pré-requisitos</span>
                <textarea
                    className={s.input}
                    rows={3}
                    maxLength={STORE_LIMITS.prerequisites}
                    value={listing.prerequisites}
                    onChange={(e) => set({ prerequisites: e.target.value })}
                />
            </label>
        </>
    );
}
