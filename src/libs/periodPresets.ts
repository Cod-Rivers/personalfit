/** Atalhos de período dos relatórios (admin e painel do parceiro). Datas
 *  sempre AAAA-MM-DD no fuso do navegador. */

export function ymd(d: Date): string {
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${m}-${day}`;
}

export type Preset = 'month' | 'last-month' | '90d' | 'year' | 'custom';

export const PRESETS: { value: Preset; label: string }[] = [
    { value: 'month', label: 'Este mês' },
    { value: 'last-month', label: 'Mês passado' },
    { value: '90d', label: 'Últimos 90 dias' },
    { value: 'year', label: 'Este ano' },
    { value: 'custom', label: 'Personalizado' },
];

export function presetRange(p: Preset): { from: string; to: string } | null {
    const now = new Date();
    switch (p) {
        case 'month':
            return {
                from: ymd(new Date(now.getFullYear(), now.getMonth(), 1)),
                to: ymd(now),
            };
        case 'last-month':
            return {
                from: ymd(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
                to: ymd(new Date(now.getFullYear(), now.getMonth(), 0)),
            };
        case '90d': {
            const from = new Date(now);
            from.setDate(from.getDate() - 89);
            return { from: ymd(from), to: ymd(now) };
        }
        case 'year':
            return {
                from: ymd(new Date(now.getFullYear(), 0, 1)),
                to: ymd(now),
            };
        default:
            return null;
    }
}
