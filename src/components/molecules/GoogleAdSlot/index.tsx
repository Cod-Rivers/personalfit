'use client';

import { useEffect, useState } from 'react';
import { useBranding } from '@/context/BrandingContext';
import {
    ADSENSE_CLIENT_ID,
    ADSENSE_SLOT_ID,
    isAdEnvironmentSafe,
    shouldShowAds,
} from '@/libs/adsense';

declare global {
    interface Window {
        adsbygoogle?: unknown[];
    }
}

const GoogleAdSlot: React.FC = () => {
    const { effectivePlanType } = useBranding();
    // Ver GoogleAdsense: o ambiente só é conhecido depois da montagem.
    const [environmentSafe, setEnvironmentSafe] = useState(false);

    useEffect(() => {
        setEnvironmentSafe(isAdEnvironmentSafe());
    }, []);

    // Sem ID de unidade configurado não há bloco manual (ver ADSENSE_SLOT_ID).
    const visible =
        environmentSafe &&
        ADSENSE_SLOT_ID !== '' &&
        shouldShowAds(effectivePlanType);

    useEffect(() => {
        if (!visible) return;
        try {
            (window.adsbygoogle = window.adsbygoogle || []).push({});
        } catch {
            // adsbygoogle.js ainda não carregou; o bloco simplesmente não preenche.
        }
    }, [visible]);

    if (!visible) return null;

    return (
        <ins
            className="adsbygoogle"
            style={{ display: 'block' }}
            data-ad-client={ADSENSE_CLIENT_ID}
            data-ad-slot={ADSENSE_SLOT_ID}
            data-ad-format="auto"
            data-full-width-responsive="true"
        />
    );
};

export default GoogleAdSlot;
