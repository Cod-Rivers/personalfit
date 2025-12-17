import React from 'react';
import { TrainingCardProps } from './types';
import styles from './TrainingCard.module.css';

const TrainingCard: React.FC<TrainingCardProps> = ({ id, label }) => {
    return (
        <div
            className={styles.cardButton}
            aria-label={`Meus Treinos de ${label}`}
            role="listitem"
        >
            {}
            <span className={styles.cardLabel}>{label}</span>
            <svg
                xmlns="http://www.w3.org/2000/svg"
                className={styles.cardIcon}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
            >
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                />
            </svg>
        </div>
    );
};

export default TrainingCard;
