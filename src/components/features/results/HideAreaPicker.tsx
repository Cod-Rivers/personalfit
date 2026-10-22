'use client';

import { useRef, useState } from 'react';
import type { ResultCrop } from '@/libs/resultService';
import { CroppedPhoto } from './ResultPhotos';
import s from './results.module.css';

/** Arrastar sobre a foto recortada marca a área a esconder (o rosto, uma
 *  tatuagem). Coordenadas em frações do recorte; o servidor pixeliza essa
 *  área na cópia pública. */
export default function HideAreaPicker({
    url,
    crop,
    value,
    onChange,
    alt,
}: {
    url?: string;
    crop: ResultCrop;
    value: ResultCrop | null;
    onChange: (v: ResultCrop | null) => void;
    alt: string;
}) {
    const stageRef = useRef<HTMLDivElement>(null);
    const start = useRef<{ x: number; y: number } | null>(null);
    const [draft, setDraft] = useState<ResultCrop | null>(null);

    const point = (e: React.PointerEvent) => {
        const r = stageRef.current!.getBoundingClientRect();
        return {
            x: Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)),
            y: Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)),
        };
    };

    const rectFrom = (a: { x: number; y: number }, b: { x: number; y: number }): ResultCrop => ({
        x: Math.min(a.x, b.x),
        y: Math.min(a.y, b.y),
        w: Math.abs(a.x - b.x),
        h: Math.abs(a.y - b.y),
    });

    return (
        <div className={s.section}>
            <div
                ref={stageRef}
                className={s.hideStage}
                onPointerDown={(e) => {
                    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
                    start.current = point(e);
                    setDraft({ ...start.current, w: 0, h: 0 });
                }}
                onPointerMove={(e) => {
                    if (start.current) setDraft(rectFrom(start.current, point(e)));
                }}
                onPointerUp={(e) => {
                    if (!start.current) return;
                    const r = rectFrom(start.current, point(e));
                    start.current = null;
                    setDraft(null);
                    // Um toque sem arrastar não esconde nada (área mínima 3%).
                    if (r.w >= 0.03 && r.h >= 0.03) onChange(r);
                }}
                role="img"
                aria-label={`${alt}: arraste sobre a foto para marcar a área que vai sair coberta`}
            >
                <CroppedPhoto url={url} crop={crop} hide={draft ?? value} alt={alt} />
            </div>
            <div className={s.actions}>
                <button type="button" className={s.btn} onClick={() => onChange(null)} disabled={!value}>
                    Não esconder nada
                </button>
            </div>
        </div>
    );
}
