/**
 * Paletas da vitrine do personal (plano Pro).
 *
 * O personal escolhe UMA paleta de um conjunto fechado — accent + fundo — e
 * todas as demais cores da tela (cartão, borda, três níveis de texto, texto do
 * botão) são DERIVADAS dela aqui. É o que garante contraste sem depender do
 * personal acertar meia dúzia de hex à mão, e é também o motivo de o seletor de
 * cor livre ter saído da tela de Personalização.
 *
 * A lista precisa ficar em sincronia com `ShowcaseThemes` em
 * internal/domain/user/personal-showcase.go — o backend valida o `theme_id`
 * contra a mesma tabela e materializa primary/secondary do branding a partir
 * dela.
 */

import type { CSSProperties } from 'react';

export interface ShowcaseTheme {
    id: string;
    label: string;
    accent: string;
    bg: string;
}

export const SHOWCASE_THEMES: ShowcaseTheme[] = [
    { id: 'mint-noir', label: 'Mint Noir', accent: '#0ffcbe', bg: '#0b0b0b' },
    { id: 'ember', label: 'Ember', accent: '#f0a500', bg: '#120d08' },
    { id: 'crimson', label: 'Crimson', accent: '#ff6b6b', bg: '#120808' },
    { id: 'violet-pulse', label: 'Violet Pulse', accent: '#8b5cf6', bg: '#0d0b16' },
    { id: 'ocean', label: 'Ocean', accent: '#38bdf8', bg: '#060f16' },
    { id: 'light-editorial', label: 'Light Editorial', accent: '#c2410c', bg: '#faf6ef' },
];

export const DEFAULT_SHOWCASE_THEME_ID = 'mint-noir';

export function findShowcaseTheme(id: string | undefined | null): ShowcaseTheme {
    return (
        SHOWCASE_THEMES.find((t) => t.id === id) ??
        SHOWCASE_THEMES.find((t) => t.id === DEFAULT_SHOWCASE_THEME_ID)!
    );
}

/** Clareia (amt > 0) ou escurece (amt < 0) um hex #RRGGBB, com clamp por canal. */
function shade(hex: string, amt: number): string {
    const n = parseInt(hex.slice(1), 16);
    const clamp = (v: number) => Math.max(0, Math.min(255, v));
    const r = clamp((n >> 16) + amt);
    const g = clamp(((n >> 8) & 0xff) + amt);
    const b = clamp((n & 0xff) + amt);
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

/** Luminância relativa (coeficientes ITU-R BT.709), 0 = preto, 1 = branco. */
function luminance(hex: string): number {
    const n = parseInt(hex.slice(1), 16);
    const r = (n >> 16) / 255;
    const g = ((n >> 8) & 0xff) / 255;
    const b = (n & 0xff) / 255;
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Variáveis CSS aplicadas no container da vitrine. Os nomes são locais à tela
 * (prefixo `--vt-`) para NÃO colidirem com os tokens globais do app
 * (`--mint`, `--surface-2`, `--text-primary`…): a vitrine é uma ilha de tema
 * fechado dentro de um app que já tem light/dark próprios.
 */
export interface ShowcaseThemeVars {
    '--vt-accent': string;
    '--vt-accent-dim': string;
    '--vt-bg': string;
    '--vt-card': string;
    '--vt-border': string;
    '--vt-text': string;
    '--vt-text-secondary': string;
    '--vt-text-muted': string;
    '--vt-text-faint': string;
    '--vt-frame-border': string;
    '--vt-btn-text': string;
}

/**
 * Deriva a paleta completa a partir do par accent/fundo. Fundo claro e escuro
 * puxam a escala em direções opostas (o cartão precisa ficar mais escuro que um
 * fundo claro e mais claro que um fundo escuro) — daí o `isLight` conduzir os
 * sinais em vez de duas tabelas separadas.
 */
export function buildShowcaseThemeVars(theme: ShowcaseTheme): ShowcaseThemeVars {
    const isLight = luminance(theme.bg) > 0.5;

    return {
        '--vt-accent': theme.accent,
        '--vt-accent-dim': shade(theme.accent, isLight ? 40 : -40),
        '--vt-bg': theme.bg,
        '--vt-card': shade(theme.bg, isLight ? -10 : 12),
        '--vt-border': shade(theme.bg, isLight ? -18 : 22),
        '--vt-frame-border': theme.bg,
        '--vt-text': isLight ? '#1c1712' : '#f2f2f2',
        '--vt-text-secondary': isLight ? '#4a3f30' : '#c9c9c9',
        '--vt-text-muted': isLight ? '#8a7f6c' : '#999999',
        '--vt-text-faint': isLight ? '#a89d89' : '#777777',
        // Texto do botão de CTA: preto sobre accent claro, branco sobre escuro.
        '--vt-btn-text': luminance(theme.accent) > 0.5 ? '#0b0b0b' : '#ffffff',
    };
}

/** Atalho para `style={...}` — as vars derivadas do id do tema. */
export function showcaseThemeStyle(themeId: string | undefined | null) {
    return buildShowcaseThemeVars(
        findShowcaseTheme(themeId),
    ) as unknown as CSSProperties;
}
