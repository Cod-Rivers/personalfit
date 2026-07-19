// src/components/TrainingCard.tsx
import React from 'react';
import { TrainingCardProps } from './types'; // Caminho OK se types.ts estiver no mesmo diretório
import styles from './TrainingCard.module.css'; // Caminho CORRIGIDO (assumindo que .module.css está no mesmo diretório)

// MODIFICADO: Removido 'onClick' das props e o elemento raiz é um <div>
const TrainingCard: React.FC<TrainingCardProps> = ({ label, phase }) => {
    return (
        <div
            className={styles.cardButton}
            aria-label={`Meus Treinos de ${label}`}
            role="listitem"
        >
            <div className={styles.cardContent}>
                {phase && <span className={styles.phaseBadge}>{phase}</span>}
                <span className={styles.cardLabel}>{label}</span>
            </div>
            <svg
                xmlns="http://www.w3.org/2000/svg"
                className={styles.cardIcon}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true" // Ícone é decorativo
            >
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7" // Seta para a direita
                />
            </svg>
        </div>
    );
};

export default TrainingCard;
