'use client';

import { useState } from 'react';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import type { ResultCrop } from '@/libs/resultService';
import s from './results.module.css';

/** Data AAAA-MM-DD → "mar/2026". */
export function shortMonth(date: string): string {
    const [y, m] = date.split('-').map(Number);
    if (!y || !m) return '';
    const name = new Date(y, m - 1, 1).toLocaleDateString('pt-BR', { month: 'short' });
    return `${name.replace('.', '')}/${y}`;
}

/** Mostra o recorte de uma foto original (URL assinada) sem gerar imagem nova:
 *  o quadro tem a proporção 4:5 do recorte e a foto é posicionada por CSS.
 *  `hide` (frações do recorte) aparece como uma tarja — no público ela sai
 *  pixelizada pelo servidor. */
export function CroppedPhoto({
    url,
    crop,
    hide,
    alt,
    tag,
}: {
    url?: string;
    crop: ResultCrop;
    hide?: ResultCrop | null;
    alt: string;
    tag?: string;
}) {
    return (
        <div className={s.cropBox}>
            {url && (
                 
                <img
                    src={url}
                    alt={alt}
                    draggable={false}
                    style={{
                        width: `${100 / crop.w}%`,
                        height: `${100 / crop.h}%`,
                        left: `${(-crop.x / crop.w) * 100}%`,
                        top: `${(-crop.y / crop.h) * 100}%`,
                    }}
                />
            )}
            {hide && (
                <span
                    className={s.hideMask}
                    style={{
                        left: `${hide.x * 100}%`,
                        top: `${hide.y * 100}%`,
                        width: `${hide.w * 100}%`,
                        height: `${hide.h * 100}%`,
                    }}
                    aria-hidden="true"
                />
            )}
            {tag && <span className={s.photoTag}>{tag}</span>}
        </div>
    );
}

/** As duas fotos lado a lado (cópias públicas). */
export function BeforeAfterPair({
    beforeUrl,
    afterUrl,
    beforeDate,
    afterDate,
    name,
}: {
    beforeUrl?: string;
    afterUrl?: string;
    beforeDate: string;
    afterDate: string;
    name: string;
}) {
    return (
        <div className={s.pair}>
            <div className={s.photoBox}>
                {beforeUrl && (
                     
                    <img src={beforeUrl} alt={`${name} antes, ${shortMonth(beforeDate)}`} loading="lazy" />
                )}
                <span className={s.photoTag}>Antes · {shortMonth(beforeDate)}</span>
            </div>
            <div className={s.photoBox}>
                {afterUrl && (
                     
                    <img src={afterUrl} alt={`${name} depois, ${shortMonth(afterDate)}`} loading="lazy" />
                )}
                <span className={s.photoTag}>Depois · {shortMonth(afterDate)}</span>
            </div>
        </div>
    );
}

/** Deslizador: a foto de depois por cima, revelada até a linha. Teclado e
 *  leitor de tela usam o <input type="range"> invisível que cobre a área. */
export function BeforeAfterSlider({
    beforeUrl,
    afterUrl,
    beforeDate,
    afterDate,
    name,
}: {
    beforeUrl?: string;
    afterUrl?: string;
    beforeDate: string;
    afterDate: string;
    name: string;
}) {
    const [pos, setPos] = useState(50);
    return (
        <div>
            <div className={s.slider}>
                {beforeUrl && (
                     
                    <img src={beforeUrl} alt={`${name} antes`} draggable={false} />
                )}
                {afterUrl && (
                     
                    <img
                        src={afterUrl}
                        alt={`${name} depois`}
                        draggable={false}
                        style={{ clipPath: `inset(0 0 0 ${pos}%)` }}
                    />
                )}
                <span className={s.sliderLine} style={{ left: `${pos}%` }} />
                <span className={s.sliderKnob} style={{ left: `${pos}%` }} aria-hidden="true">
                    <FiChevronLeft />
                    <FiChevronRight />
                </span>
                <input
                    type="range"
                    min={0}
                    max={100}
                    value={pos}
                    onChange={(e) => setPos(Number(e.target.value))}
                    className={s.sliderRange}
                    aria-label="Comparar antes e depois"
                />
            </div>
            <div className={s.sliderLabels}>
                <span>← Antes · {shortMonth(beforeDate)}</span>
                <span>Depois · {shortMonth(afterDate)} →</span>
            </div>
        </div>
    );
}
