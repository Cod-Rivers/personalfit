'use client';

import { useEffect, useState } from 'react';
import Script from 'next/script';
import { useBranding } from '@/context/BrandingContext';
import {
    ADSENSE_CLIENT_ID,
    isAdEnvironmentSafe,
    shouldShowAds,
} from '@/libs/adsense';

export default function GoogleAdsense() {
    const { effectivePlanType } = useBranding();
    // Decidido só depois da montagem: se é o app nativo, e com qual ponte, não
    // dá para saber no servidor (ver isAdEnvironmentSafe).
    const [environmentSafe, setEnvironmentSafe] = useState(false);

    useEffect(() => {
        setEnvironmentSafe(isAdEnvironmentSafe());
    }, []);

    if (!environmentSafe || !shouldShowAds(effectivePlanType)) return null;

    return (
        <Script
            id="google-adsense"
            async
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT_ID}`}
            crossOrigin="anonymous"
            strategy="afterInteractive"
        />
    );
}
