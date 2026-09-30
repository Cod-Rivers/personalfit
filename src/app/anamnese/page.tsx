'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getToken } from '@/libs/session';

/**
 * /anamnese era a Triagem automática, que montava um treino pronto para o
 * aluno sem personal. Saiu do produto em 2026-09-29. A rota continua só para
 * links antigos (notificações, e-mails, favoritos) não darem 404: leva a
 * quem está logado para os treinos. A Anamnese do personal fica em
 * /anamnese-do-personal.
 */
export default function AnamneseRedirectPage() {
    const router = useRouter();

    useEffect(() => {
        router.replace(getToken() ? '/meus-treinos' : '/');
    }, [router]);

    return (
        <div className="p-6 text-center" style={{ color: 'var(--text-secondary)' }}>
            Carregando seus treinos...
        </div>
    );
}
