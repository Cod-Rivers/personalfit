'use client';

import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useState,
} from 'react';
import { useForegroundRefresh } from '@/hooks/useForegroundRefresh';
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

/** Volta as cores às do CSS (constants.css): tira o que applyBrandingVars
 * gravou inline. */
function clearBrandingVars() {
    const root = document.documentElement;
    root.style.removeProperty('--mint');
    root.style.removeProperty('--grad-mint');
    root.style.removeProperty('--coral');
}

function applyBrandingVars(branding: PersonalBranding | null) {
    // Limpa antes: sem branding (o personal saiu do PRO com o app aberto) as
    // cores voltam ao padrão, e uma marca nova não herda cor da anterior.
    clearBrandingVars();
    if (!branding) return;
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

    const load = useCallback(() => {
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

    useEffect(() => {
        load();
    }, [load]);
    // O plano do personal muda com o app aberto (PRO ↔ free, espera do
    // excedente): busca de novo ao voltar ao app (ver useForegroundRefresh).
    useForegroundRefresh(load);

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
