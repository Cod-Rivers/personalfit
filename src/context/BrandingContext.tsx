'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { PersonalBranding, getPersonalBranding } from '@/libs/brandingService';

interface BrandingContextValue {
    branding: PersonalBranding | null;
    personalName: string | null;
    setBranding: (b: PersonalBranding | null) => void;
}

const BrandingContext = createContext<BrandingContextValue>({
    branding: null,
    personalName: null,
    setBranding: () => {},
});

export function useBranding() {
    return useContext(BrandingContext);
}

function applyBrandingVars(branding: PersonalBranding | null) {
    if (!branding) return; // sem branding: mantém as vars padrão do CSS intactas
    const root = document.documentElement;
    if (branding?.primary_color) {
        root.style.setProperty('--mint', branding.primary_color);
        root.style.setProperty(
            '--grad-mint',
            `linear-gradient(135deg, ${branding.primary_color}, ${branding.secondary_color ?? branding.primary_color})`,
        );
    }
    if (branding?.secondary_color) {
        root.style.setProperty('--coral', branding.secondary_color);
    }
}

export function BrandingProvider({ children }: { children: React.ReactNode }) {
    const [branding, setBrandingState] = useState<PersonalBranding | null>(
        null,
    );
    const [personalName, setPersonalName] = useState<string | null>(null);

    useEffect(() => {
        const token =
            typeof window !== 'undefined'
                ? localStorage.getItem('token')
                : null;
        if (!token) return;

        getPersonalBranding()
            .then(({ branding: b, personalName: name }) => {
                setBrandingState(b);
                setPersonalName(name);
                applyBrandingVars(b);
            })
            .catch(() => {
                // silently fail — branding is non-critical
            });
    }, []);

    const setBranding = (b: PersonalBranding | null) => {
        setBrandingState(b);
        applyBrandingVars(b);
    };

    return (
        <BrandingContext.Provider
            value={{ branding, personalName, setBranding }}
        >
            {children}
        </BrandingContext.Provider>
    );
}
