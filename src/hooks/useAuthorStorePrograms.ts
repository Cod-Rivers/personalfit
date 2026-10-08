'use client';

import { useCallback, useEffect, useState } from 'react';
import { fetchIsStoreAuthor } from '@/hooks/useOwnMediaUpload';
import {
    listMyStorePrograms,
    type AdminStoreProgram,
} from '@/libs/storeService';

/**
 * A conta é autora da loja, e os programas dela (Todo/PLANO_LOJA_DE_TREINOS.md,
 * fase 2): "Minha biblioteca" mostra a situação de cada treino que já foi
 * para a loja e oferece o envio. Quem não é autor recebe isAuthor false e
 * nenhuma chamada a mais.
 */
export function useAuthorStorePrograms(enabled: boolean) {
    const [isAuthor, setIsAuthor] = useState(false);
    const [programs, setPrograms] = useState<AdminStoreProgram[]>([]);

    const reload = useCallback(async () => {
        const author = await fetchIsStoreAuthor();
        setIsAuthor(author);
        if (!author) {
            setPrograms([]);
            return;
        }
        try {
            setPrograms(await listMyStorePrograms());
        } catch {
            setPrograms([]);
        }
    }, []);

    useEffect(() => {
        if (enabled) void reload();
    }, [enabled, reload]);

    return { isAuthor, programs, reload };
}
