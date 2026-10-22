'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { isAxiosError } from 'axios';
import {
    FiCheck,
    FiCopy,
    FiExternalLink,
    FiEye,
    FiEyeOff,
    FiLoader,
} from 'react-icons/fi';
import Button from '@/components/atoms/Button';
import {
    checkSlug,
    saveMyPage,
    type MyPersonalPage,
    type PersonalPageData,
} from '@/libs/leadService';
import { formatPhoneBR, normalizeSlug, publicPageUrl } from '@/libs/leadFunnel';
import { copyToClipboard } from '@/libs/socialShare';
import { SITE_URL } from '@/libs/storePublic';
import s from '../interessados.module.css';

type SlugCheck =
    | { kind: 'idle' }
    | { kind: 'checking' }
    | { kind: 'ok' }
    | { kind: 'bad'; reason: string };

interface Props {
    data: MyPersonalPage;
    onSaved: (page: PersonalPageData) => void;
    onError: (msg: string) => void;
    onSuccess: (msg: string) => void;
}

/** Cartão "Sua página": o link para a bio, os números e a configuração. */
export default function PageSettings({ data, onSaved, onError, onSuccess }: Props) {
    const saved = data.page;
    const [editing, setEditing] = useState(!data.saved);
    const [slug, setSlug] = useState(saved.slug);
    const [whatsapp, setWhatsapp] = useState(formatPhoneBR(saved.whatsapp));
    const [headline, setHeadline] = useState(saved.headline);
    const [about, setAbout] = useState(saved.about);
    const [showShowcase, setShowShowcase] = useState(saved.show_showcase);
    const [enabled, setEnabled] = useState(data.saved ? saved.enabled : true);
    const [check, setCheck] = useState<SlugCheck>({ kind: 'idle' });
    const [saving, setSaving] = useState(false);
    const [copied, setCopied] = useState(false);

    const canonical = normalizeSlug(slug);
    const url = publicPageUrl(SITE_URL, saved.slug);

    // Confere o endereço enquanto o personal digita (com folga de 400 ms).
    useEffect(() => {
        if (!editing) return;
        if (!canonical || (data.saved && canonical === saved.slug)) {
            setCheck({ kind: 'idle' });
            return;
        }
        setCheck({ kind: 'checking' });
        const t = setTimeout(() => {
            checkSlug(canonical)
                .then((r) =>
                    setCheck(
                        r.available
                            ? { kind: 'ok' }
                            : { kind: 'bad', reason: r.reason ?? 'Endereço indisponível.' },
                    ),
                )
                .catch(() => setCheck({ kind: 'idle' }));
        }, 400);
        return () => clearTimeout(t);
    }, [canonical, editing, data.saved, saved.slug]);

    async function save(nextEnabled = enabled) {
        setSaving(true);
        try {
            const page = await saveMyPage({
                slug: canonical,
                enabled: nextEnabled,
                whatsapp,
                headline,
                about,
                show_showcase: showShowcase,
            });
            onSaved(page);
            setEnabled(page.enabled);
            setSlug(page.slug);
            setWhatsapp(formatPhoneBR(page.whatsapp));
            setEditing(false);
            onSuccess(page.enabled ? 'Página salva e no ar.' : 'Página salva (fora do ar).');
        } catch (err) {
            onError(
                isAxiosError(err) && err.response?.data?.error
                    ? String(err.response.data.error)
                    : 'Não foi possível salvar a página.',
            );
        } finally {
            setSaving(false);
        }
    }

    async function copyLink() {
        if (await copyToClipboard(url)) {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    }

    return (
        <section className={s.card} aria-labelledby="pagina-titulo">
            <div className={s.cardHead}>
                <div>
                    <h2 id="pagina-titulo" className={s.cardTitle}>
                        Sua página
                    </h2>
                    <p className={s.cardSub}>
                        Coloque o link na bio do Instagram. Quem pedir contato
                        aparece aqui embaixo na hora.
                    </p>
                </div>
                {data.saved && (
                    <span className={saved.enabled ? s.liveOn : s.liveOff}>
                        {saved.enabled ? (
                            <>
                                <FiEye aria-hidden /> No ar
                            </>
                        ) : (
                            <>
                                <FiEyeOff aria-hidden /> Fora do ar
                            </>
                        )}
                    </span>
                )}
            </div>

            {data.saved && !editing && (
                <>
                    <div className={s.linkRow}>
                        <code className={s.link}>{url.replace(/^https?:\/\//, '')}</code>
                        <div className={s.linkActions}>
                            <Button
                                size="sm"
                                variant="secondary"
                                leftIcon={copied ? <FiCheck /> : <FiCopy />}
                                onClick={copyLink}
                            >
                                {copied ? 'Copiado' : 'Copiar'}
                            </Button>
                            {saved.enabled && (
                                <a
                                    className={s.openLink}
                                    href={`/p/${saved.slug}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    <FiExternalLink aria-hidden /> Abrir
                                </a>
                            )}
                        </div>
                    </div>
                    <div className={s.metrics}>
                        <div className={s.metric}>
                            <strong>{data.visits_7d}</strong>
                            <span>visitas em 7 dias</span>
                        </div>
                        <div className={s.metric}>
                            <strong>{data.visits_30d}</strong>
                            <span>visitas em 30 dias</span>
                        </div>
                    </div>
                    <div className={s.rowActions}>
                        <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
                            Editar página
                        </Button>
                        <Button
                            size="sm"
                            variant="ghost"
                            isLoading={saving}
                            onClick={() => save(!saved.enabled)}
                        >
                            {saved.enabled ? 'Tirar do ar' : 'Colocar no ar'}
                        </Button>
                    </div>
                </>
            )}

            {editing && (
                <form
                    className={s.settingsForm}
                    onSubmit={(e) => {
                        e.preventDefault();
                        save();
                    }}
                >
                    <label className={s.field}>
                        <span>Endereço da página</span>
                        <div className={s.slugInput}>
                            <span className={s.slugPrefix}>/p/</span>
                            <input
                                value={slug}
                                onChange={(e) => setSlug(e.target.value)}
                                maxLength={40}
                                required
                                autoCapitalize="none"
                                spellCheck={false}
                            />
                        </div>
                        <small className={s.hint}>
                            {canonical && canonical !== slug.trim() && (
                                <>Vai ficar: /p/{canonical}. </>
                            )}
                            {check.kind === 'checking' && (
                                <>
                                    <FiLoader aria-hidden /> Conferindo…
                                </>
                            )}
                            {check.kind === 'ok' && <span className={s.okText}>Livre.</span>}
                            {check.kind === 'bad' && (
                                <span className={s.badText}>{check.reason}</span>
                            )}
                        </small>
                    </label>
                    <label className={s.field}>
                        <span>Seu WhatsApp (opcional)</span>
                        <input
                            value={whatsapp}
                            onChange={(e) => setWhatsapp(e.target.value)}
                            inputMode="tel"
                            placeholder="(21) 99999-0000"
                        />
                        <small className={s.hint}>
                            Aparece como &ldquo;Prefiro chamar no WhatsApp&rdquo;.
                        </small>
                    </label>
                    <label className={s.field}>
                        <span>Frase de apresentação</span>
                        <input
                            value={headline}
                            onChange={(e) => setHeadline(e.target.value)}
                            maxLength={80}
                            placeholder="Ex.: Treino de força para mulheres 40+"
                        />
                    </label>
                    <label className={s.field}>
                        <span>Sobre você</span>
                        <textarea
                            value={about}
                            onChange={(e) => setAbout(e.target.value)}
                            maxLength={300}
                            rows={3}
                            placeholder="Formação, como você trabalha, onde atende."
                        />
                        <small className={s.hint}>
                            {data.has_showcase && showShowcase
                                ? 'Com a vitrine ligada, a página usa a bio e a frase dela.'
                                : `${about.length}/300`}
                        </small>
                    </label>
                    {data.has_showcase && (
                        <label className={s.check}>
                            <input
                                type="checkbox"
                                checked={showShowcase}
                                onChange={(e) => setShowShowcase(e.target.checked)}
                            />
                            <span>
                                Mostrar minha vitrine (capa, resultados, depoimento)
                                na página pública
                            </span>
                        </label>
                    )}
                    <label className={s.check}>
                        <input
                            type="checkbox"
                            checked={enabled}
                            onChange={(e) => setEnabled(e.target.checked)}
                        />
                        <span>Página no ar</span>
                    </label>
                    {data.show_badge && (
                        <p className={s.planNote}>
                            No plano grátis a página leva o selo &ldquo;Feito com
                            Venafit&rdquo;. Com o{' '}
                            <Link href="/pagamento?produto=personal-plus">Plus</Link>,
                            ela mostra sua vitrine completa e sai sem o selo.
                        </p>
                    )}
                    <div className={s.rowActions}>
                        {data.saved && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                    setEditing(false);
                                    setSlug(saved.slug);
                                }}
                            >
                                Cancelar
                            </Button>
                        )}
                        <Button
                            type="submit"
                            size="sm"
                            isLoading={saving}
                            disabled={check.kind === 'bad' || !canonical}
                        >
                            Salvar página
                        </Button>
                    </div>
                </form>
            )}
        </section>
    );
}
