'use client';

import React from 'react';
import Link from 'next/link';
import { FiAward, FiStar } from 'react-icons/fi';
import ExerciseThumbnail from '@/components/features/ExerciseThumbnail';
import {
    equipmentLabel,
    levelLabel,
    type StoreAuthorCard,
    type StoreProgramCard,
} from '@/libs/storeService';
import { formatBRL, programFacts } from '@/libs/storeFormat';
import s from '../loja.module.css';

/** Capa do programa: a imagem enviada, senão a mídia do 1º exercício. */
export function StoreCover({
    program,
    className = s.cover,
    children,
}: {
    program: Pick<
        StoreProgramCard,
        'title' | 'cover_url' | 'cover_video_thumb' | 'cover_video_url'
    >;
    className?: string;
    children?: React.ReactNode;
}) {
    return (
        <div className={className}>
            {program.cover_url ? (
                <img src={program.cover_url} alt="" className={s.coverImg} />
            ) : (
                <ExerciseThumbnail
                    name={program.title}
                    videoThumb={program.cover_video_thumb}
                    videoUrl={program.cover_video_url}
                    width="100%"
                    height="100%"
                    borderRadius={0}
                    captureFrame={false}
                    lazyCapture
                    style={{ position: 'absolute', inset: 0 }}
                />
            )}
            {children}
        </div>
    );
}

/** Estrelas de quem comprou: "★ 4,7 (12)". Nada sem avaliação. */
export function StoreStars({ avg, count }: { avg: number; count: number }) {
    if (count <= 0) return null;
    return (
        <span
            className={s.stars}
            aria-label={`Nota ${avg.toLocaleString('pt-BR')} de 5, ${count} avaliações`}
        >
            <FiStar className={s.starIcon} aria-hidden="true" />
            {avg.toLocaleString('pt-BR', {
                minimumFractionDigits: 1,
                maximumFractionDigits: 1,
            })}
            <span>({count})</span>
        </span>
    );
}

export function AuthorAvatar({
    author,
    large = false,
}: {
    author: Pick<StoreAuthorCard, 'name' | 'photo_url'>;
    large?: boolean;
}) {
    const cls = large ? s.avatarLarge : s.avatar;
    if (author.photo_url) {
        return <img src={author.photo_url} alt="" className={cls} />;
    }
    return (
        <span className={cls} aria-hidden="true">
            {author.name.trim().charAt(0).toUpperCase()}
        </span>
    );
}

/** Autor com o selo do CREF (ou "Coleção Venafit"). link = vai para a
 *  página do autor. */
export function StoreAuthor({
    author,
    link = false,
}: {
    author?: StoreAuthorCard;
    link?: boolean;
}) {
    if (!author) {
        return <span className={s.collection}>Coleção Venafit</span>;
    }
    const body = (
        <>
            <AuthorAvatar author={author} />
            <span className={s.authorText}>
                <span className={s.authorName}>{author.name}</span>
                <span className={s.cref}>
                    <FiAward aria-hidden="true" /> {author.cref}
                </span>
            </span>
        </>
    );
    return link ? (
        <Link
            href={`/loja/autor/${encodeURIComponent(author.code)}`}
            className={s.author}
        >
            {body}
        </Link>
    ) : (
        <span className={s.author}>{body}</span>
    );
}

/** Card da vitrine. O card inteiro leva à página do programa. */
export function ProgramCard({ program }: { program: StoreProgramCard }) {
    const facts = programFacts({
        level: levelLabel(program.level),
        days: program.days_per_week,
        weeks: program.duration_weeks,
        equipment: equipmentLabel(program.equipment),
    });
    return (
        <Link href={`/loja/programa/${program.id}`} className={s.card}>
            <StoreCover program={program}>
                <span className={s.coverBadges}>
                    {program.featured && (
                        <span className={`${s.badge} ${s.badgeFeatured}`}>
                            Destaque
                        </span>
                    )}
                </span>
            </StoreCover>
            <div className={s.cardBody}>
                <p className={s.cardTitle}>{program.title}</p>
                <StoreAuthor author={program.author} />
                {facts && <p className={s.meta}>{facts}</p>}
                <div className={s.cardFooter}>
                    <span className={s.price}>{formatBRL(program.price)}</span>
                    <StoreStars
                        avg={program.rating_avg}
                        count={program.rating_count}
                    />
                </div>
            </div>
        </Link>
    );
}
