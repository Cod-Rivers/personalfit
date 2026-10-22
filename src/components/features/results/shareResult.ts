import { buildBeforeAfterShareCard, type ShareCardStat } from '@/libs/shareCard';
import { shareImage, shareText, type ShareOutcome } from '@/libs/socialShare';
import { formatDelta, measurementLabel, type ResultCard } from '@/libs/resultService';
import { weeksLabel } from './ResultCardView';

/** Endereço público do resultado (o card leva o domínio; o texto, o link). */
export function resultUrl(id: string): string {
    const origin = typeof window === 'undefined' ? '' : window.location.origin;
    return `${origin}/resultados/${id}`;
}

function statsOf(r: ResultCard): ShareCardStat[] {
    const out: ShareCardStat[] = [{ label: 'Semanas', value: String(r.weeks_between) }];
    if (r.stats.weight_delta_kg != null) {
        out.push({ label: 'Peso', value: formatDelta(r.stats.weight_delta_kg, 'kg') });
    }
    const m = Object.entries(r.stats.measurements ?? {})[0];
    if (m) out.push({ label: measurementLabel(m[0]), value: formatDelta(m[1], 'cm') });
    return out.slice(0, 3);
}

/** Compartilha o antes e depois: a imagem com a marca quando dá; senão, só
 *  o link (ex.: o domínio público sem CORS impede montar a imagem). */
export async function shareResult(r: ResultCard): Promise<ShareOutcome> {
    const url = resultUrl(r.id);
    const text = r.program
        ? `${weeksLabel(r.weeks_between)} de ${r.program.title} no Venafit.`
        : `Meu antes e depois: ${weeksLabel(r.weeks_between)} no Venafit.`;
    if (r.before_url && r.after_url) {
        try {
            const file = await buildBeforeAfterShareCard({
                beforeUrl: r.before_url,
                afterUrl: r.after_url,
                headline: `${weeksLabel(r.weeks_between)} de evolução`,
                subline: r.program ? `Com o programa ${r.program.title}` : undefined,
                stats: statsOf(r),
                callToAction: 'Veja mais resultados reais no mural',
            });
            return await shareImage(file, `${text} ${url}`);
        } catch {
            /* cai no link */
        }
    }
    return shareText(text, url);
}
