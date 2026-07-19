'use client';

import { useEffect, useState } from 'react';
import { getProgress, ProgressResponse } from '@/libs/progressService';
import styles from './ProgressBar.module.css';

interface ProgressBarProps {
    studentId: string;
}

export default function ProgressBar({ studentId }: ProgressBarProps) {
    const [progress, setProgress] = useState<ProgressResponse | null>(null);

    useEffect(() => {
        getProgress(studentId)
            .then(setProgress)
            .catch(() => {});
    }, [studentId]);

    if (!progress || progress.total_planned === 0) return null;

    return (
        <div className={styles.progressContainer}>
            <div className={styles.progressLabel}>
                <span className={styles.progressCount}>
                    {progress.total_completed} / {progress.total_planned}{' '}
                    treinos
                </span>
                <span className={styles.progressPercent}>
                    {progress.percentage}%
                </span>
            </div>
            <div className={styles.progressTrack}>
                <div
                    className={styles.progressFill}
                    style={{ width: `${progress.percentage}%` }}
                />
            </div>
        </div>
    );
}
