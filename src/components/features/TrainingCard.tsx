// src/components/TrainingCard.tsx
import React from 'react';
import {
    GiWeightLiftingUp,
    GiBiceps,
    GiLeg,
    GiAbdominalArmor,
    GiBodyBalance,
} from 'react-icons/gi';
import { TrainingCardProps } from './types';
import styles from './TrainingCard.module.css';
import { formatRelativeDays } from '@/libs/trainingSummary';

const ACCENT_ICON: Record<
    NonNullable<TrainingCardProps['accent']>,
    React.ComponentType<{ size?: number }>
> = {
    push: GiWeightLiftingUp,
    pull: GiBiceps,
    legs: GiLeg,
    core: GiAbdominalArmor,
    mixed: GiBodyBalance,
};

const TrainingCard: React.FC<TrainingCardProps> = ({
    label,
    focusLabel,
    accent = 'mixed',
    exerciseCount,
    seriesCount,
    estimatedMinutes,
    status,
    completedDate,
    scheduledToday,
}) => {
    const Icon = ACCENT_ICON[accent];
    const title = focusLabel || label;
    const showEyebrow = Boolean(focusLabel && focusLabel !== label);
    const isCompleted = status === 'completed';

    const badge = isCompleted
        ? { text: '✓ Concluído', tone: 'completed' }
        : scheduledToday
          ? { text: 'Hoje', tone: 'today' }
          : status === 'pending'
            ? { text: 'Em andamento', tone: 'progress' }
            : status === 'skipped'
              ? { text: 'Pulado', tone: 'skipped' }
              : null;

    const metaParts: string[] = [];
    if (exerciseCount) {
        metaParts.push(`${exerciseCount} exercício${exerciseCount === 1 ? '' : 's'}`);
    }
    if (seriesCount) {
        metaParts.push(`${seriesCount} série${seriesCount === 1 ? '' : 's'}`);
    }
    if (isCompleted && completedDate) {
        metaParts.push(`última vez: ${formatRelativeDays(completedDate)}`);
    } else if (estimatedMinutes) {
        metaParts.push(`~${estimatedMinutes} min`);
    }

    return (
        <div
            className={styles.cardButton}
            data-accent={accent}
            data-completed={isCompleted || undefined}
            aria-label={`Treino: ${title}${badge ? `, ${badge.text}` : ''}`}
            role="listitem"
        >
            <div className={styles.iconChip}>
                <Icon size={22} />
            </div>
            <div className={styles.cardContent}>
                {showEyebrow && (
                    <span className={styles.eyebrow}>{label}</span>
                )}
                <span className={styles.cardLabel}>{title}</span>
                {metaParts.length > 0 && (
                    <span className={styles.cardMeta}>
                        {metaParts.join(' · ')}
                    </span>
                )}
            </div>
            {badge && (
                <span className={styles.statusBadge} data-tone={badge.tone}>
                    {badge.text}
                </span>
            )}
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
