'use client';
import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { FiLock } from 'react-icons/fi';
import { getUser, planRank } from '@/libs/session';
import { getPlans, type PlanCatalog } from '@/libs/paymentService';
import { formatBRL } from '@/libs/storeFormat';
import { trackProUpsellClick, trackProUpsellView } from '@/libs/analytics';
import s from './ProUpsell.module.css';

/** Convite ao PRO no ponto em que o personal esbarra num recurso dele.
 *
 *  Para quem já paga o Plus, o argumento é a DIFERENÇA de preço ("+ R$ 20
 *  por mês"), não o preço cheio: ele já paga a maior parte. Não oferece teste
 *  grátis: o teste próprio do Venafit foi desligado em 2026-10-06 (ver
 *  ProTrialOffered no backend) e nunca valeu para quem já pagou.
 *
 *  - `banner`: caixa com cadeado, título, o texto do recurso e o botão.
 *  - `cta`: só o botão e a linha da diferença, para telas que já têm o
 *    próprio bloco de "recurso bloqueado" (relatórios, agenda).
 *
 *  `feature` identifica a tela nos eventos pro_upsell_view/pro_upsell_click.
 *  Fora da conta de personal (aluno vendo a própria evolução) mostra só o
 *  texto: o aluno não assina o PRO. */
type Variant = 'banner' | 'cta';

interface ProUpsellProps {
    feature: string;
    variant?: Variant;
    title?: string;
    children?: ReactNode;
}

let catalogRequest: Promise<PlanCatalog | null> | null = null;
function loadCatalog(): Promise<PlanCatalog | null> {
    catalogRequest ??= getPlans().catch(() => {
        catalogRequest = null;
        return null;
    });
    return catalogRequest;
}

/** Quanto o PRO mensal custa a mais que o Plus mensal (undefined sem catálogo). */
export function proMonthlyDelta(catalog: PlanCatalog | null): number | undefined {
    const pro = catalog?.pro.find((p) => p.cycle === 'MONTHLY')?.value;
    const plus = catalog?.personal_plus.value;
    if (pro === undefined || plus === undefined || pro <= plus) return undefined;
    return Math.round((pro - plus) * 100) / 100;
}

export default function ProUpsell({ feature, variant = 'banner', title, children }: ProUpsellProps) {
    // Lido em efeito: localStorage não existe no servidor.
    const [viewer, setViewer] = useState<{ personal: boolean; rank: number } | null>(null);
    const [delta, setDelta] = useState<number | undefined>();

    useEffect(() => {
        const user = getUser();
        const personal = user?.role === 'personal';
        const rank = planRank(user?.plan_type);
        setViewer({ personal, rank });
        if (!personal || rank >= 2) return;
        trackProUpsellView(feature, rank);
        if (rank !== 1) return;
        let cancelled = false;
        loadCatalog().then((c) => {
            if (!cancelled) setDelta(proMonthlyDelta(c));
        });
        return () => {
            cancelled = true;
        };
    }, [feature]);

    if (viewer && viewer.rank >= 2) return null;
    const showCta = viewer?.personal === true;
    const isPlus = viewer?.rank === 1;

    const cta = showCta && (
        <div className={s.ctaRow}>
            <Link
                href="/pagamento?produto=pro"
                className={`btn btn-gold btn-sm ${s.cta}`}
                onClick={() => trackProUpsellClick(feature, viewer.rank)}
            >
                {isPlus ? 'Passar para o PRO' : 'Conhecer o PRO'}
            </Link>
            {isPlus && delta !== undefined && (
                <span className={s.delta}>
                    + {formatBRL(delta)} por mês sobre o seu Plus
                </span>
            )}
        </div>
    );

    if (variant === 'cta') return cta || null;

    return (
        <div className={s.banner} role="note">
            <FiLock aria-hidden="true" className={s.icon} />
            <div className={s.body}>
                {title && <p className={s.title}>{title}</p>}
                {children && <div className={s.text}>{children}</div>}
                {cta}
            </div>
        </div>
    );
}
