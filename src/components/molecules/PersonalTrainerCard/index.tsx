'use client';

import React from 'react';
import { PersonalBranding } from '@/libs/brandingService';
import styles from './PersonalTrainerCard.module.css';

interface PersonalTrainerCardProps {
    branding: PersonalBranding | null;
    trainerName?: string;
}

function getInitials(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function PersonalTrainerCard({
    branding,
    trainerName,
}: PersonalTrainerCardProps) {
    if (!branding && !trainerName) return null;

    return (
        <div className={styles.card}>
            {branding?.logo_base64 ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                    src={branding.logo_base64}
                    alt={
                        trainerName
                            ? `Logo de ${trainerName}`
                            : 'Logo do Personal'
                    }
                    className={styles.logo}
                />
            ) : (
                trainerName && (
                    <div className={styles.avatar} aria-hidden="true">
                        {getInitials(trainerName)}
                    </div>
                )
            )}
            <div className={styles.info}>
                <span className={styles.eyebrow}>Seu personal</span>
                {trainerName && <p className={styles.name}>{trainerName}</p>}
                {branding?.welcome_banner && (
                    <p className={styles.banner}>{branding.welcome_banner}</p>
                )}
            </div>
        </div>
    );
}
