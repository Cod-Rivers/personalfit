'use client';

import Script from 'next/script';
import { useBranding } from '@/context/BrandingContext';
import { ADSENSE_CLIENT_ID, shouldShowAds } from '@/libs/adsense';

export default function GoogleAdsense() {
    const { effectivePlanType } = useBranding();

    if (!shouldShowAds(effectivePlanType)) return null;

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
