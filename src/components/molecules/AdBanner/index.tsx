'use client';

import React from 'react';
import { Advertisement } from '@/libs/advertisementService';
import ExternalLink from '@/components/atoms/ExternalLink';
import {
    isVideoExtension,
    toTrustedEmbedUrl,
} from '@/libs/exerciseVideoService';
import { safeExternalHref } from '@/libs/safeLink';
import styles from './AdBanner.module.css';

interface AdBannerProps {
    ad: Advertisement;
    placement: 'top' | 'bottom';
}

/**
 * Mídia do anúncio próprio (criado pelo personal ou pelo admin).
 *
 * O `url` é digitado à mão, por isso nunca vira iframe cru: com o frame-src do
 * CSP aberto a https (exigência do AdSense, ver libs/csp.ts), um iframe com
 * qualquer URL colocaria uma página arbitrária — um formulário de login falso,
 * por exemplo — dentro da tela de todos os alunos daquele personal. Vídeo só
 * entra como embed de plataforma conhecida (YouTube/Vimeo/TikTok), em iframe
 * com sandbox, ou como arquivo de vídeo direto num <video>.
 */
function AdMedia({ ad }: { ad: Advertisement }) {
    const src = safeExternalHref(ad.url);
    if (!src) return null;

    if (ad.type === 'image') {
        return <img src={src} alt={ad.title} className={styles.media} />;
    }

    const embed = toTrustedEmbedUrl(src);
    if (embed) {
        return (
            <iframe
                src={embed}
                title={ad.title}
                className={styles.media}
                allow="autoplay; encrypted-media"
                allowFullScreen
                // allow-scripts + allow-same-origin: o player precisa dos dois, e
                // juntos são seguros aqui porque a origem do embed é outra (não
                // alcança esta página). allow-popups: "assistir no YouTube".
                sandbox="allow-scripts allow-same-origin allow-presentation allow-popups allow-popups-to-escape-sandbox"
                referrerPolicy="strict-origin-when-cross-origin"
                frameBorder="0"
            />
        );
    }

    if (isVideoExtension(src)) {
        return (
            <video
                src={src}
                className={styles.media}
                autoPlay
                muted
                loop
                playsInline
            />
        );
    }

    return null;
}

export default function AdBanner({ ad, placement }: AdBannerProps) {
    const content = (
        <div
            className={`${styles.banner} ${placement === 'bottom' ? styles.sticky : ''}`}
        >
            <span className={styles.label}>Publicidade</span>
            <AdMedia ad={ad} />
            {ad.title && <p className={styles.title}>{ad.title}</p>}
        </div>
    );

    if (ad.link) {
        return (
            <ExternalLink href={ad.link} className={styles.link}>
                {content}
            </ExternalLink>
        );
    }

    return content;
}
