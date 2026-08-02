'use client';

/**
 * Vitrine do personal — tela inicial do aluno logo após o login, exibida
 * APENAS quando ele tem um personal vinculado que está no plano Pro e que
 * publicou a página. Em qualquer outro caso o aluno segue direto para o fluxo
 * atual (Meus Treinos / dashboard de protocolo).
 *
 * A decisão de exibir é do servidor: `GET /showcase` devolve `null` quando não
 * há personal, quando ele não é Pro ou quando a página está despublicada — o
 * cliente não conhece (nem deveria conhecer) o plano do personal.
 *
 * O personal dono abre esta mesma tela para editá-la: o lápis no canto superior
 * abre o painel com todos os campos e os interruptores de visibilidade.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FiEdit2 } from 'react-icons/fi';
import { getStudentHomeRoute, getUser } from '@/libs/session';
import { getLinkedShowcase, Showcase } from '@/libs/showcaseService';
import { showcaseThemeStyle } from '@/libs/showcaseThemes';
import ShowcaseEditor from './_components/ShowcaseEditor';
import styles from './vitrine.module.css';

/*
 * Ícones das redes sociais inline: o app usa react-icons/fi (Feather), que não
 * tem WhatsApp — misturar um segundo pacote de ícones só por causa disso sairia
 * mais caro que estes três paths.
 */
const InstagramIcon = () => (
    <svg
        viewBox="0 0 24 24"
        width="15"
        height="15"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        aria-hidden="true"
    >
        <rect x="2" y="2" width="20" height="20" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
);

const YoutubeIcon = () => (
    <svg
        viewBox="0 0 24 24"
        width="15"
        height="15"
        fill="currentColor"
        aria-hidden="true"
    >
        <path d="M23 12s0-3.6-.46-5.3a3 3 0 0 0-2.1-2.1C18.7 4 12 4 12 4s-6.7 0-8.44.6a3 3 0 0 0-2.1 2.1C1 8.4 1 12 1 12s0 3.6.46 5.3a3 3 0 0 0 2.1 2.1C5.3 20 12 20 12 20s6.7 0 8.44-.6a3 3 0 0 0 2.1-2.1C23 15.6 23 12 23 12z" />
        <path d="M10 15.5v-7l6 3.5-6 3.5z" fill="var(--vt-card)" />
    </svg>
);

const WhatsappIcon = () => (
    <svg
        viewBox="0 0 24 24"
        width="15"
        height="15"
        fill="currentColor"
        aria-hidden="true"
    >
        <path d="M12 2a10 10 0 0 0-8.6 15L2 22l5.2-1.4A10 10 0 1 0 12 2zm5.6 14.3c-.2.6-1.3 1.2-1.9 1.3-.5.1-1.1.1-1.7-.1a13.3 13.3 0 0 1-5.9-4.4 6.6 6.6 0 0 1-1.4-3.5c0-.9.5-1.7 1-2.2.2-.2.5-.3.7-.3h.5c.2 0 .4 0 .6.4l.8 2c.1.2 0 .4-.1.6l-.4.5c-.1.2-.3.3-.1.6a8.4 8.4 0 0 0 3.5 3c.2.1.4.1.5-.1l.6-.7c.2-.2.4-.2.6-.1l1.8 1c.2.1.4.2.5.3.1.2.1.7-.1 1.2z" />
    </svg>
);

/** Iniciais do nome, usadas quando não há foto de perfil. */
function initials(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase();
}

export default function VitrinePage() {
    const router = useRouter();
    const [showcase, setShowcase] = useState<Showcase | null>(null);
    const [loading, setLoading] = useState(true);
    const [editOpen, setEditOpen] = useState(false);

    // Para o aluno, o CTA leva ao hub de treinos dele. Para o personal — que
    // abre a mesma tela para editá-la — leva de volta ao painel, já que ele não
    // tem treinos próprios ali.
    const goToTreinos = useCallback(() => {
        router.push(
            getUser()?.role === 'personal' ? '/personal' : getStudentHomeRoute(),
        );
    }, [router]);

    useEffect(() => {
        const user = getUser();
        if (!user) {
            router.replace('/');
            return;
        }

        let cancelled = false;
        getLinkedShowcase()
            .then((sc) => {
                if (cancelled) return;
                if (!sc) {
                    // Sem vitrine para mostrar: fluxo atual, sem tela intermediária.
                    router.replace(
                        user.role === 'personal'
                            ? '/personal'
                            : getStudentHomeRoute(),
                    );
                    return;
                }
                setShowcase(sc);
                setLoading(false);
            })
            .catch(() => {
                if (cancelled) return;
                // A vitrine é divulgação, não conteúdo essencial: falha de rede
                // nunca deve prender o aluno longe dos treinos dele.
                router.replace(getStudentHomeRoute());
            });

        return () => {
            cancelled = true;
        };
    }, [router]);

    if (loading || !showcase) {
        return <div className={styles.loading}>Carregando…</div>;
    }

    // Uma vitrine recém-criada não tem especialidades nem resultados, e campos
    // de lista vazios podem chegar ausentes da API. Esta tela é a primeira do
    // aluno depois do login: qualquer acesso desprotegido aqui derruba a
    // entrada inteira no app, então as listas são normalizadas antes do uso.
    const sec = showcase.sections ?? {
        bio: true,
        specialties: true,
        stats: true,
        social: true,
        results: true,
        testimonial: true,
    };
    const specialties = showcase.specialties ?? [];
    const results = showcase.results ?? [];
    const canEdit = !!showcase.can_edit;

    // Cada ícone só aparece se o personal informou a URL correspondente.
    const socials = [
        {
            url: showcase.instagram_url,
            label: 'Instagram',
            icon: <InstagramIcon />,
        },
        {
            url: showcase.youtube_url,
            label: 'YouTube',
            icon: <YoutubeIcon />,
        },
        {
            url: showcase.whatsapp_url,
            label: 'WhatsApp',
            icon: <WhatsappIcon />,
        },
    ].filter((s) => !!s.url);

    // Estatísticas em branco somem: um "0 alunos" comunica pior que a ausência
    // do número.
    const stats = [
        { label: 'Alunos', value: showcase.stat_students },
        { label: 'Anos', value: showcase.stat_years },
        { label: 'Avaliação', value: showcase.stat_rating },
    ].filter((s) => !!s.value);

    const hasAnnouncement =
        (showcase.announcement_type === 'text' &&
            !!showcase.announcement_text) ||
        (showcase.announcement_type === 'image' &&
            !!showcase.announcement_image_url);

    // Só vira link quando o personal informou um destino; sem URL, o aviso é
    // um bloco de texto comum (um <a href="#"> daria falso affordance).
    const announcementHref = showcase.announcement_url || undefined;
    const AnnouncementTag = announcementHref ? 'a' : 'div';
    const announcementLinkProps = announcementHref
        ? {
              href: announcementHref,
              target: '_blank',
              rel: 'noopener noreferrer',
          }
        : {};

    return (
        <div className={styles.page} style={showcaseThemeStyle(showcase.theme_id)}>
            <div className={styles.card}>
                {/* ── Capa ── */}
                <div className={styles.cover}>
                    {showcase.cover_url ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                            src={showcase.cover_url}
                            alt=""
                            className={styles.coverImg}
                        />
                    ) : (
                        <div className={styles.coverPlaceholder}>
                            {canEdit
                                ? 'Adicione uma foto de capa no painel de edição'
                                : ''}
                        </div>
                    )}
                    <div className={styles.coverScrim} />

                    <div className={styles.coverTop}>
                        {canEdit && (
                            <button
                                type="button"
                                className={styles.editBtn}
                                onClick={() => setEditOpen(true)}
                                aria-label="Editar esta página"
                                title="Editar esta página"
                            >
                                <FiEdit2 size={16} />
                            </button>
                        )}
                        <div className={styles.proBadge}>
                            <span className={styles.proDot} />
                            <span className={styles.proLabel}>PRO</span>
                        </div>
                    </div>

                    <div className={styles.avatar}>
                        {showcase.avatar_url ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                                src={showcase.avatar_url}
                                alt={showcase.personal_name}
                                className={styles.avatarImg}
                            />
                        ) : (
                            <div className={styles.avatarFallback}>
                                {initials(showcase.personal_name)}
                            </div>
                        )}
                    </div>
                </div>

                {canEdit && !showcase.enabled && (
                    <p className={styles.draftNotice}>
                        Esta página ainda está <strong>oculta</strong> para seus
                        alunos. Ative &ldquo;Publicar para meus alunos&rdquo; no
                        painel de edição quando quiser exibi-la.
                    </p>
                )}

                {/* ── Corpo ── */}
                <div className={styles.body}>
                    <div className={styles.identity}>
                        <div>
                            <h1 className={styles.name}>
                                {showcase.personal_name}
                            </h1>
                            {showcase.tagline && (
                                <p className={styles.tagline}>
                                    {showcase.tagline}
                                </p>
                            )}
                        </div>

                        {sec.social && socials.length > 0 && (
                            <div className={styles.social}>
                                {socials.map((s) => (
                                    <a
                                        key={s.label}
                                        href={s.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        aria-label={s.label}
                                        title={s.label}
                                        className={styles.socialLink}
                                    >
                                        {s.icon}
                                    </a>
                                ))}
                            </div>
                        )}
                    </div>

                    {sec.stats && stats.length > 0 && (
                        <div className={styles.stats}>
                            {stats.map((s) => (
                                <div key={s.label} className={styles.stat}>
                                    <div className={styles.statValue}>
                                        {s.value}
                                    </div>
                                    <div className={styles.statLabel}>
                                        {s.label}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {sec.bio && showcase.bio && (
                        <p className={styles.bio}>{showcase.bio}</p>
                    )}

                    {sec.specialties && specialties.length > 0 && (
                        <div className={styles.chips}>
                            {specialties.map((sp) => (
                                <span key={sp} className={styles.chip}>
                                    {sp}
                                </span>
                            ))}
                        </div>
                    )}

                    {sec.results && results.length > 0 && (
                        <div className={styles.section}>
                            <div className={styles.sectionTitle}>
                                Resultados de alunos
                            </div>
                            <div className={styles.carousel}>
                                {results.map((r, i) => (
                                    <div
                                        key={r.photo_key || i}
                                        className={styles.resultCard}
                                    >
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                            src={r.photo_url}
                                            alt={r.caption}
                                            className={styles.resultImg}
                                        />
                                        {r.caption && (
                                            <div
                                                className={
                                                    styles.resultCaption
                                                }
                                            >
                                                {r.caption}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {sec.testimonial && showcase.testimonial_text && (
                        <div className={styles.testimonial}>
                            {showcase.testimonial_photo_url && (
                                /* eslint-disable-next-line @next/next/no-img-element */
                                <img
                                    src={showcase.testimonial_photo_url}
                                    alt=""
                                    className={styles.testimonialAvatar}
                                />
                            )}
                            <div>
                                <p className={styles.testimonialText}>
                                    &ldquo;{showcase.testimonial_text}&rdquo;
                                </p>
                                {showcase.testimonial_author && (
                                    <p className={styles.testimonialAuthor}>
                                        {showcase.testimonial_author}
                                    </p>
                                )}
                            </div>
                        </div>
                    )}

                    {hasAnnouncement &&
                        showcase.announcement_type === 'text' && (
                            <AnnouncementTag
                                {...announcementLinkProps}
                                className={styles.announcement}
                            >
                                <div className={styles.announcementLabel}>
                                    Aviso
                                </div>
                                <div className={styles.announcementText}>
                                    {showcase.announcement_text}
                                </div>
                            </AnnouncementTag>
                        )}

                    {hasAnnouncement &&
                        showcase.announcement_type === 'image' && (
                            <AnnouncementTag
                                {...announcementLinkProps}
                                className={styles.announcementImageWrap}
                            >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={showcase.announcement_image_url}
                                    alt="Aviso"
                                    className={styles.announcementImg}
                                />
                            </AnnouncementTag>
                        )}

                    <div className={styles.ctaWrap}>
                        <button
                            type="button"
                            className={styles.cta}
                            onClick={goToTreinos}
                        >
                            Acessar meus treinos
                        </button>
                        <div className={styles.credit}>
                            Treinador · {showcase.personal_name} · powered by
                            Venafit
                        </div>
                    </div>
                </div>
            </div>

            {canEdit && (
                <ShowcaseEditor
                    open={editOpen}
                    initial={showcase}
                    onClose={() => setEditOpen(false)}
                    onSaved={setShowcase}
                />
            )}
        </div>
    );
}
