import React from 'react';
import styles from './styles.module.css';

interface MetricTileProps {
    value: React.ReactNode;
    label: string;
    /** Variação contra o período anterior ("+5", "−12", "="). */
    delta?: string | null;
    /** A variação é boa (verde) ou ruim (vermelho). */
    deltaTone?: 'good' | 'bad' | 'neutral';
    hint?: string;
}

/** Número do período com a variação contra o período anterior. */
export default function MetricTile({ value, label, delta, deltaTone = 'neutral', hint }: MetricTileProps) {
    return (
        <div className={styles.tile} title={hint}>
            <div className={styles.value}>{value}</div>
            <div className={styles.label}>{label}</div>
            {delta && delta !== '=' && (
                <div className={`${styles.delta} ${styles[deltaTone]}`}>
                    {delta} <span className={styles.deltaCaption}>vs. anterior</span>
                </div>
            )}
        </div>
    );
}
