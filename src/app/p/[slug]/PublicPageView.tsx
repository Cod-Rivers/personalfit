'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { isAxiosError } from 'axios';
import { FiAward, FiCheckCircle, FiSend } from 'react-icons/fi';
import {
    getPublicPage,
    recordPageVisit,
    submitLead,
    type PublicPage,
} from '@/libs/leadService';
import { LEAD_GOALS, LEAD_MODALITIES } from '@/libs/leadFunnel';
import { whatsappLink } from '@/libs/financeFormat';
import type { Showcase } from '@/libs/showcaseService';
import { showcaseThemeStyle } from '@/libs/showcaseThemes';
import ShowcaseCard, {
    WhatsappIcon,
} from '../../vitrine/_components/ShowcaseCard';
import vt from '../../vitrine/vitrine.module.css';
import s from './p.module.css';

/** Para onde o selo do plano free leva: a página do app no hub, com a origem
 *  marcada (ver libs/acquisition.ts). */
const BADGE_URL = 'https://codriverslabs.com/apps/venafit/?ref=personal_page';

/** A página do free (sem vitrine) usa o mesmo cartão, só com o que ela tem:
 *  nome, foto, frase e o texto sobre o personal. */
function pageAsShowcase(page: PublicPage): Showcase {
    return {
        enabled: true,
        personal_name: page.personal_name,
        theme_id: page.theme_id,
        cover_key: '',
        cover_url: '',
        avatar_key: '',
        avatar_url: page.avatar_url,
        tagline: page.headline,
        bio: page.about,
        specialties: [],
        specialties_raw: '',
        stat_students: '',
        stat_years: '',
        stat_rating: '',
        instagram_url: '',
        youtube_url: '',
        whatsapp_url: '',
        results: [],
        testimonial_text: '',
        testimonial_author: '',
        testimonial_photo_key: '',
        testimonial_photo_url: '',
        announcement_type: 'none',
        announcement_text: '',
        announcement_image_key: '',
        announcement_image_url: '',
        announcement_url: '',
        sections: {
            bio: true,
            specialties: false,
            stats: false,
            social: false,
            results: false,
            testimonial: false,
        },
    };
}

function firstName(full: string): string {
    return full.trim().split(/\s+/)[0] ?? full;
}

function fmtDate(d: string) {
    const dt = new Date(d + 'T00:00:00');
    return isNaN(dt.getTime()) ? d : dt.toLocaleDateString('pt-BR');
}

type FormState =
    | { kind: 'closed' }
    | { kind: 'open' }
    | { kind: 'sending' }
    | { kind: 'sent' };

export default function PublicPageView({
    slug,
    initial,
    initialNotFound = false,
}: {
    slug: string;
    initial: PublicPage | null;
    initialNotFound?: boolean;
}) {
    const [page, setPage] = useState<PublicPage | null>(initial);
    const [notFound, setNotFound] = useState(initialNotFound);
    const [ref, setRef] = useState('');
    const [form, setForm] = useState<FormState>({ kind: 'closed' });
    const [error, setError] = useState<string | null>(null);
    const formRef = useRef<HTMLFormElement | null>(null);

    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [goal, setGoal] = useState('');
    const [modality, setModality] = useState('');
    const [availability, setAvailability] = useState('');
    const [message, setMessage] = useState('');
    const [consent, setConsent] = useState(false);
    const [website, setWebsite] = useState('');

    // O servidor falhou (backend fora do ar no SSR): tenta pelo navegador.
    useEffect(() => {
        if (page || notFound) return;
        getPublicPage(slug)
            .then(setPage)
            .catch((err) => {
                if (isAxiosError(err) && err.response?.status === 404) {
                    setNotFound(true);
                }
            });
    }, [slug, page, notFound]);

    // ?ref= de onde a pessoa veio (card do aluno, instagram...). Lido da URL
    // sem useSearchParams para a página não precisar de Suspense.
    useEffect(() => {
        const r = new URLSearchParams(window.location.search).get('ref');
        if (r) setRef(r.slice(0, 60));
    }, []);

    // Uma visita por sessão do navegador. O armazenamento pode faltar (aba
    // anônima, bloqueio): aí conta a cada abertura, que é o menor dos males.
    useEffect(() => {
        if (!page) return;
        const key = `vf_page_visit:${page.slug}`;
        try {
            if (sessionStorage.getItem(key)) return;
            sessionStorage.setItem(key, '1');
        } catch {
            /* sem storage: segue e conta */
        }
        recordPageVisit(page.slug).catch(() => {});
    }, [page]);

    const showcase = useMemo(
        () => (page ? (page.showcase ?? pageAsShowcase(page)) : null),
        [page],
    );

    if (notFound) {
        return (
            <div className={s.missing}>
                <h1>Página não encontrada</h1>
                <p>
                    O endereço pode estar errado, ou o personal tirou a página
                    do ar.
                </p>
                <Link href="/">Conhecer o Venafit</Link>
            </div>
        );
    }
    if (!page || !showcase) {
        return <div className={vt.loading}>Carregando…</div>;
    }

    const personalFirst = firstName(page.personal_name);
    const directWhatsapp = whatsappLink(
        page.whatsapp,
        `Oi, ${personalFirst}! Vi sua página e quero saber mais sobre os treinos.`,
    );

    function openForm() {
        setForm({ kind: 'open' });
        setError(null);
        // Espera o formulário existir na tela para rolar até ele.
        requestAnimationFrame(() =>
            formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
        );
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!page) return;
        setError(null);
        if (!consent) {
            setError('Marque a autorização de contato para enviar.');
            return;
        }
        setForm({ kind: 'sending' });
        try {
            await submitLead(page.slug, {
                name: name.trim(),
                phone: phone.trim(),
                email: email.trim() || undefined,
                goal: goal || undefined,
                modality: modality || undefined,
                availability: availability.trim() || undefined,
                message: message.trim() || undefined,
                consent,
                ref: ref || undefined,
                website,
            });
            setForm({ kind: 'sent' });
        } catch (err) {
            setForm({ kind: 'open' });
            if (isAxiosError(err) && err.response?.status === 429) {
                setError('Muitos envios seguidos. Espere um minuto e tente de novo.');
            } else if (isAxiosError(err) && err.response?.data?.error) {
                setError(String(err.response.data.error));
            } else {
                setError('Não foi possível enviar agora. Confira a internet e tente de novo.');
            }
        }
    }

    const sending = form.kind === 'sending';

    return (
        <div className={vt.page} style={showcaseThemeStyle(page.theme_id)}>
            <ShowcaseCard showcase={showcase}>
                <div className={s.footer}>
                    {form.kind === 'sent' ? (
                        <div className={s.sent} role="status">
                            <FiCheckCircle className={s.sentIcon} aria-hidden />
                            <p className={s.sentTitle}>Pedido enviado!</p>
                            <p className={s.sentText}>
                                {personalFirst} recebeu seu contato e vai te
                                chamar no WhatsApp.
                            </p>
                            {directWhatsapp && (
                                <a
                                    className={s.secondaryBtn}
                                    href={directWhatsapp}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    <WhatsappIcon size={16} /> Falar agora no
                                    WhatsApp
                                </a>
                            )}
                        </div>
                    ) : form.kind === 'closed' ? (
                        <button
                            type="button"
                            className={vt.cta}
                            onClick={openForm}
                        >
                            Quero treinar com {personalFirst}
                        </button>
                    ) : (
                        <form
                            ref={formRef}
                            className={s.form}
                            onSubmit={handleSubmit}
                        >
                            <p className={s.formTitle}>
                                Conte um pouco sobre você
                            </p>
                            <label className={s.field}>
                                <span>Nome</span>
                                <input
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    required
                                    maxLength={80}
                                    autoComplete="name"
                                />
                            </label>
                            <label className={s.field}>
                                <span>WhatsApp com DDD</span>
                                <input
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    required
                                    inputMode="tel"
                                    autoComplete="tel"
                                    placeholder="(21) 99999-0000"
                                />
                            </label>
                            <label className={s.field}>
                                <span>Seu objetivo</span>
                                <select
                                    value={goal}
                                    onChange={(e) => setGoal(e.target.value)}
                                >
                                    <option value="">Escolha</option>
                                    {LEAD_GOALS.map((g) => (
                                        <option key={g.value} value={g.value}>
                                            {g.label}
                                        </option>
                                    ))}
                                </select>
                            </label>
                            <fieldset className={s.chipsField}>
                                <legend>Como prefere treinar</legend>
                                <div className={s.chips}>
                                    {LEAD_MODALITIES.map((m) => (
                                        <button
                                            key={m.value}
                                            type="button"
                                            className={
                                                modality === m.value
                                                    ? s.chipActive
                                                    : s.chip
                                            }
                                            aria-pressed={modality === m.value}
                                            onClick={() =>
                                                setModality(
                                                    modality === m.value
                                                        ? ''
                                                        : m.value,
                                                )
                                            }
                                        >
                                            {m.label}
                                        </button>
                                    ))}
                                </div>
                            </fieldset>
                            <label className={s.field}>
                                <span>Dias e horários livres (opcional)</span>
                                <input
                                    value={availability}
                                    onChange={(e) =>
                                        setAvailability(e.target.value)
                                    }
                                    maxLength={120}
                                    placeholder="Ex.: seg, qua e sex de manhã"
                                />
                            </label>
                            <label className={s.field}>
                                <span>Quer contar mais alguma coisa? (opcional)</span>
                                <textarea
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    maxLength={500}
                                    rows={3}
                                />
                            </label>
                            <label className={s.field}>
                                <span>E-mail (opcional)</span>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    maxLength={120}
                                    autoComplete="email"
                                />
                            </label>
                            {/* Campo-isca contra robô: fora da tela e fora
                                da navegação por teclado. */}
                            <label className={s.honeypot} aria-hidden="true">
                                Site
                                <input
                                    tabIndex={-1}
                                    autoComplete="off"
                                    value={website}
                                    onChange={(e) => setWebsite(e.target.value)}
                                />
                            </label>
                            <label className={s.consent}>
                                <input
                                    type="checkbox"
                                    checked={consent}
                                    onChange={(e) => setConsent(e.target.checked)}
                                />
                                <span>
                                    Autorizo {page.personal_name} a entrar em
                                    contato comigo pelo WhatsApp sobre treinos.
                                    Meus dados servem só para esse contato e são
                                    apagados depois de 6 meses sem conversa.
                                    Veja a{' '}
                                    <Link href="/politica-privacidade" target="_blank">
                                        política de privacidade
                                    </Link>
                                    .
                                </span>
                            </label>
                            {error && (
                                <p className={s.error} role="alert">
                                    {error}
                                </p>
                            )}
                            <button
                                type="submit"
                                className={vt.cta}
                                disabled={sending}
                            >
                                {sending ? (
                                    'Enviando…'
                                ) : (
                                    <>
                                        Enviar <FiSend aria-hidden />
                                    </>
                                )}
                            </button>
                        </form>
                    )}

                    {form.kind !== 'sent' && directWhatsapp && (
                        <a
                            className={s.secondaryBtn}
                            href={directWhatsapp}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            <WhatsappIcon size={16} /> Prefiro chamar no
                            WhatsApp
                        </a>
                    )}

                    {page.challenge && (
                        <Link
                            href={`/desafio/${page.challenge.token}`}
                            className={s.challenge}
                        >
                            <FiAward className={s.challengeIcon} aria-hidden />
                            <span>
                                <strong>{page.challenge.name}</strong>
                                <small>
                                    Desafio aberto até{' '}
                                    {fmtDate(page.challenge.end_date)}.
                                    Inscreva-se grátis.
                                </small>
                            </span>
                        </Link>
                    )}

                    {page.show_badge ? (
                        <a
                            className={s.badge}
                            href={BADGE_URL}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            Feito com <strong>Venafit</strong>, o app do
                            personal trainer
                        </a>
                    ) : (
                        <div className={vt.credit}>
                            {page.personal_name} · powered by Venafit
                        </div>
                    )}
                </div>
            </ShowcaseCard>
        </div>
    );
}
