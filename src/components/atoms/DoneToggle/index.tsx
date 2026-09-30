'use client';

import { FiCheck } from 'react-icons/fi';
import styles from './styles.module.css';

/**
 * Checkbox de "exercício feito" durante o treino — ao lado do Trocar na tela
 * do treino do aluno (personal, /acompanhar) e no mesmo lugar na tela do
 * próprio aluno (/meus-treinos). É outro controle, de propósito, do ✓
 * quadrado tracejado acima da alça, que é a SELEÇÃO para agrupar em bi-set:
 * este é redondo para as duas marcações não se confundirem.
 *
 * - `icon`: só o círculo, para a linha da lista (o nome do exercício vai no
 *   rótulo acessível).
 * - `pill`: círculo + texto, para o card aberto do exercício.
 *
 * Checkbox de verdade (teclado e leitor de tela), visualmente escondido; o
 * desenho é todo do <label>. Os cliques e as teclas não sobem para o
 * contêiner: nas duas listas o card inteiro abre o exercício ao toque, e
 * marcar "feito" não pode abrir o card junto.
 */
export type DoneToggleSize = 'icon' | 'pill';

export default function DoneToggle({
    checked,
    onChange,
    exerciseName,
    size = 'icon',
    className,
}: {
    checked: boolean;
    onChange: (checked: boolean) => void;
    exerciseName: string;
    size?: DoneToggleSize;
    className?: string;
}) {
    const classes = [styles.toggle, styles[size], className].filter(Boolean).join(' ');
    const accessible = checked
        ? `${exerciseName} feito — desmarcar`
        : `Marcar ${exerciseName} como feito`;

    return (
        <label
            className={classes}
            data-checked={checked || undefined}
            title={checked ? 'Feito — toque para desmarcar' : 'Marcar como feito'}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
        >
            <input
                type="checkbox"
                className={styles.input}
                checked={checked}
                onChange={(e) => onChange(e.target.checked)}
                aria-label={accessible}
            />
            <span className={styles.circle} aria-hidden="true">
                <FiCheck />
            </span>
            {size === 'pill' && (
                <span className={styles.text} aria-hidden="true">
                    {checked ? 'Feito' : 'Marcar como feito'}
                </span>
            )}
        </label>
    );
}
