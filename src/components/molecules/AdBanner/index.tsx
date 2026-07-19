'use client';

import React from 'react';
import { Advertisement } from '@/libs/advertisementService';
import styles from './AdBanner.module.css';

interface AdBannerProps {
    ad: Advertisement;
    placement: 'top' | 'bottom';
}

export default function AdBanner({ ad, placement }: AdBannerProps) {
    const content = (
        <div
            className={`${styles.banner} ${placement === 'bottom' ? styles.sticky : ''}`}
        >
            <span className={styles.label}>Publicidade</span>
            {ad.type === 'image' ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={ad.url} alt={ad.title} className={styles.media} />
            ) : (
                <iframe
                    src={ad.url}
                    title={ad.title}
                    className={styles.media}
                    allow="autoplay; encrypted-media"
                    allowFullScreen
                    frameBorder="0"
                />
            )}
            {ad.title && <p className={styles.title}>{ad.title}</p>}
        </div>
    );

    if (ad.link) {
        return (
            <a
                href={ad.link}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.link}
            >
                {content}
            </a>
        );
    }

    return content;
}
