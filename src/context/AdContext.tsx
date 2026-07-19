'use client';

import React, {
    createContext,
    useContext,
    useEffect,
    useRef,
    useState,
} from 'react';
import { Advertisement, getAdsForDisplay } from '@/libs/advertisementService';

interface AdContextValue {
    ads: Advertisement[];
    canShowAds: boolean;
    topAds: Advertisement[];
    bottomAds: Advertisement[];
    currentTopAd: Advertisement | null;
    currentBottomAd: Advertisement | null;
}

const AdContext = createContext<AdContextValue>({
    ads: [],
    canShowAds: false,
    topAds: [],
    bottomAds: [],
    currentTopAd: null,
    currentBottomAd: null,
});

export function useAds() {
    return useContext(AdContext);
}

// Controla quais anúncios já foram exibidos na sessão (máx 2-3 por sessão)
const SESSION_AD_LIMIT = 3;
const sessionSeenAds = new Set<string>();

function pickSessionAd(
    pool: Advertisement[],
    seenKey: string,
): Advertisement | null {
    if (pool.length === 0) return null;
    // Filtra anúncios ainda não vistos nesta sessão
    const unseen = pool.filter(
        (ad) => !sessionSeenAds.has(`${seenKey}_${ad.id}`),
    );
    const candidates = unseen.length > 0 ? unseen : pool;
    const picked = candidates[Math.floor(Math.random() * candidates.length)];
    if (sessionSeenAds.size < SESSION_AD_LIMIT) {
        sessionSeenAds.add(`${seenKey}_${picked.id}`);
    }
    return picked;
}

export function AdProvider({ children }: { children: React.ReactNode }) {
    const [ads, setAds] = useState<Advertisement[]>([]);
    const [canShowAds, setCanShowAds] = useState(false);
    const fetchedRef = useRef(false);

    useEffect(() => {
        const token =
            typeof window !== 'undefined'
                ? localStorage.getItem('token')
                : null;
        if (!token || fetchedRef.current) return;
        fetchedRef.current = true;

        getAdsForDisplay()
            .then((res) => {
                setAds(res.advertisements ?? []);
                setCanShowAds(res.can_show_ads ?? false);
            })
            .catch(() => {
                // anúncios são não-críticos — falha silenciosa
            });
    }, []);

    const topAds = ads.filter((ad) => ad.placement === 'top' && ad.is_active);
    const bottomAds = ads.filter(
        (ad) => ad.placement === 'bottom' && ad.is_active,
    );

    const currentTopAd = canShowAds ? pickSessionAd(topAds, 'top') : null;
    const currentBottomAd = canShowAds
        ? pickSessionAd(bottomAds, 'bottom')
        : null;

    return (
        <AdContext.Provider
            value={{
                ads,
                canShowAds,
                topAds,
                bottomAds,
                currentTopAd,
                currentBottomAd,
            }}
        >
            {children}
        </AdContext.Provider>
    );
}
