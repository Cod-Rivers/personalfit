'use client';

import React from 'react';
import { PersonalBranding } from '@/libs/brandingService';
import styles from './PersonalTrainerCard.module.css';

interface PersonalTrainerCardProps {
    branding: PersonalBranding | null;
    trainerName?: string;
}

export default function PersonalTrainerCard({
    branding,
    trainerName,
}: PersonalTrainerCardProps) {
    if (!branding && !trainerName) return null;

    const primaryColor = branding?.primary_color ?? 'var(--mint)';
    const secondaryColor = branding?.secondary_color ?? primaryColor;

    return (
        <div
            className={styles.card}
            style={{
                background: `linear-gradient(135deg, ${primaryColor}18, ${secondaryColor}10)`,
                borderColor: `${primaryColor}40`,
            }}
        >
            <div className={styles.inner}>
                {branding?.logo_base64 && (
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
                )}
                <div className={styles.info}>
                    {trainerName && (
                        <p
                            className={styles.name}
                            style={{ color: primaryColor }}
                        >
                            {trainerName}
                        </p>
                    )}
                    {branding?.welcome_banner && (
                        <p className={styles.banner}>
                            {branding.welcome_banner}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
