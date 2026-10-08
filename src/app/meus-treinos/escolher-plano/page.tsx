'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** A loja de planos "estilo famosos" virou a loja de programas
 *  (Todo/PLANO_LOJA_DE_TREINOS.md §5.6). O endereço antigo continua
 *  existindo para os atalhos e links já salvos. */
export default function EscolherPlanoRedirect() {
    const router = useRouter();
    useEffect(() => {
        router.replace('/loja');
    }, [router]);
    return null;
}
