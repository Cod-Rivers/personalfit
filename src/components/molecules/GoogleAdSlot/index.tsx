'use client';

import { useEffect } from 'react';
import { useBranding } from '@/context/BrandingContext';
import { ADSENSE_CLIENT_ID, shouldShowAds } from '@/libs/adsense';

declare global {
    interface Window {
        adsbygoogle?: unknown[];
    }
}

// TODO: substituir pelo ID real da unidade de anúncio criada no painel do
// AdSense (Anúncios > Por unidade de anúncio > Criar unidade de display).
// Sem um data-ad-slot válido o bloco não é preenchido pelo Google.
const AD_SLOT_ID = 'REPLACE_WITH_AD_SLOT_ID';

const GoogleAdSlot: React.FC = () => {
    const { effectivePlanType } = useBranding();
    const visible = shouldShowAds(effectivePlanType);

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
            data-ad-slot={AD_SLOT_ID}
            data-ad-format="auto"
            data-full-width-responsive="true"
        />
    );
};

export default GoogleAdSlot;
