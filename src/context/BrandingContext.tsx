'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
    PersonalBranding,
    getPersonalBranding,
    type StudentOverflowNotice,
} from '@/libs/brandingService';

interface BrandingContextValue {
    branding: PersonalBranding | null;
    personalName: string | null;
    /** "free" | "pro" | null enquanto não carregado — ver getPersonalBranding. */
    effectivePlanType: string | null;
    /** Sem anúncios: PRO efetivo ou Aluno Plus (ver getPersonalBranding). */
    adFree: boolean;
    /** Aluno com o Aluno Plus ativo. */
    studentPlus: boolean;
    /** Aluno de personal no excedente do plano gratuito (ver
     * StudentOverflowNotice); null fora disso. */
    studentOverflow: StudentOverflowNotice | null;
    setBranding: (b: PersonalBranding | null) => void;
}

const BrandingContext = createContext<BrandingContextValue>({
    branding: null,
    personalName: null,
    effectivePlanType: null,
    adFree: false,
    studentPlus: false,
    studentOverflow: null,
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
    const [effectivePlanType, setEffectivePlanType] = useState<string | null>(
        null,
    );
    const [adFree, setAdFree] = useState(false);
    const [studentPlus, setStudentPlus] = useState(false);
    const [studentOverflow, setStudentOverflow] =
        useState<StudentOverflowNotice | null>(null);

    useEffect(() => {
        const token =
            typeof window !== 'undefined'
                ? localStorage.getItem('token')
                : null;
        if (!token) return;

        getPersonalBranding()
            .then(({ branding: b, personalName: name, effectivePlanType: plan, adFree: noAds, studentPlus: plus, studentOverflow: overflow }) => {
                setBrandingState(b);
                setPersonalName(name);
                setEffectivePlanType(plan);
                setAdFree(noAds);
                setStudentPlus(plus);
                setStudentOverflow(overflow);
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
            value={{ branding, personalName, effectivePlanType, adFree, studentPlus, studentOverflow, setBranding }}
        >
            {children}
        </BrandingContext.Provider>
    );
}
