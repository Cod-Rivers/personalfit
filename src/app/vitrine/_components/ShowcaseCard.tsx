'use client';

/**
 * O cartão da vitrine do personal: capa, foto, nome, redes, números, bio,
 * especialidades, resultados, depoimento e aviso. Usado em dois lugares:
 * a vitrine que o aluno vê ao entrar no app (/vitrine) e a página pública do
 * personal (/p/[slug], funil de vendas -48). Cada tela põe o que é dela nos
 * encaixes: botões sobre a capa, aviso abaixo dela e o rodapé (o botão
 * principal).
 */

import React from 'react';
import ExternalLink from '@/components/atoms/ExternalLink';
import ShowcaseMuralResults from '@/components/features/results/ShowcaseMuralResults';
import type { Showcase } from '@/libs/showcaseService';
import styles from '../vitrine.module.css';

/*
 * Ícones das redes sociais inline: o app usa react-icons/fi (Feather), que não
 * tem WhatsApp — misturar um segundo pacote de ícones só por causa disso sairia
 * mais caro que estes três paths.
 */
export const InstagramIcon = () => (
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

export const YoutubeIcon = () => (
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

export const WhatsappIcon = ({ size = 15 }: { size?: number }) => (
    <svg
        viewBox="0 0 24 24"
        width={size}
        height={size}
        fill="currentColor"
        aria-hidden="true"
    >
        <path d="M12 2a10 10 0 0 0-8.6 15L2 22l5.2-1.4A10 10 0 1 0 12 2zm5.6 14.3c-.2.6-1.3 1.2-1.9 1.3-.5.1-1.1.1-1.7-.1a13.3 13.3 0 0 1-5.9-4.4 6.6 6.6 0 0 1-1.4-3.5c0-.9.5-1.7 1-2.2.2-.2.5-.3.7-.3h.5c.2 0 .4 0 .6.4l.8 2c.1.2 0 .4-.1.6l-.4.5c-.1.2-.3.3-.1.6a8.4 8.4 0 0 0 3.5 3c.2.1.4.1.5-.1l.6-.7c.2-.2.4-.2.6-.1l1.8 1c.2.1.4.2.5.3.1.2.1.7-.1 1.2z" />
    </svg>
);

/** Iniciais do nome, usadas quando não há foto de perfil. */
export function initials(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase();
}

const ALL_SECTIONS = {
    bio: true,
    specialties: true,
    stats: true,
    social: true,
    results: true,
    testimonial: true,
};

interface ShowcaseCardProps {
    showcase: Showcase;
    /** Texto no lugar da capa quando não há foto (ex.: dica ao personal). */
    coverPlaceholder?: string;
    /** Botões sobre a capa (voltar, editar, selo). */
    coverActions?: React.ReactNode;
    /** Aviso logo abaixo da capa. */
    notice?: React.ReactNode;
    /** Rodapé do cartão: o botão principal de cada tela. */
    children?: React.ReactNode;
}

export default function ShowcaseCard({
    showcase,
    coverPlaceholder = '',
    coverActions,
    notice,
    children,
}: ShowcaseCardProps) {
    // Uma vitrine recém-criada não tem especialidades nem resultados, e campos
    // de lista vazios podem chegar ausentes da API. A vitrine é a primeira tela
    // do aluno depois do login: qualquer acesso desprotegido aqui derruba a
    // entrada inteira no app, então as listas são normalizadas antes do uso.
    const sec = showcase.sections ?? ALL_SECTIONS;
    const specialties = showcase.specialties ?? [];
    const results = showcase.results ?? [];

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
        <div className={styles.card}>
            {/* ── Capa ── */}
            <div className={styles.cover}>
                {showcase.cover_url ? (
                    <img
                        src={showcase.cover_url}
                        alt=""
                        className={styles.coverImg}
                    />
                ) : (
                    <div className={styles.coverPlaceholder}>
                        {coverPlaceholder}
                    </div>
                )}
                <div className={styles.coverScrim} />

                {coverActions && (
                    <div className={styles.coverTop}>{coverActions}</div>
                )}

                <div className={styles.avatar}>
                    {showcase.avatar_url ? (
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

            {notice}

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
                                <ExternalLink
                                    key={s.label}
                                    href={s.url}
                                    aria-label={s.label}
                                    title={s.label}
                                    className={styles.socialLink}
                                >
                                    {s.icon}
                                </ExternalLink>
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
                                    key={r.photo_key || r.photo_url || i}
                                    className={styles.resultCard}
                                >
                                    <img
                                        src={r.photo_url}
                                        alt={r.caption}
                                        className={styles.resultImg}
                                    />
                                    {r.caption && (
                                        <div className={styles.resultCaption}>
                                            {r.caption}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Mural de resultados (-51): só o que o aluno autorizou. */}
                <ShowcaseMuralResults results={showcase.mural_results} />

                {sec.testimonial && showcase.testimonial_text && (
                    <div className={styles.testimonial}>
                        {showcase.testimonial_photo_url && (
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

                {hasAnnouncement && showcase.announcement_type === 'text' && (
                    <AnnouncementTag
                        {...announcementLinkProps}
                        className={styles.announcement}
                    >
                        <div className={styles.announcementLabel}>Aviso</div>
                        <div className={styles.announcementText}>
                            {showcase.announcement_text}
                        </div>
                    </AnnouncementTag>
                )}

                {hasAnnouncement && showcase.announcement_type === 'image' && (
                    <AnnouncementTag
                        {...announcementLinkProps}
                        className={styles.announcementImageWrap}
                    >
                        <img
                            src={showcase.announcement_image_url}
                            alt="Aviso"
                            className={styles.announcementImg}
                        />
                    </AnnouncementTag>
                )}

                {children}
            </div>
        </div>
    );
}
