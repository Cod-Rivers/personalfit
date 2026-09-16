'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getToken } from '@/libs/session';

/**
 * /app era a home do aluno SEM personal, e lia o sistema legado
 * (`trainings_progress`, embutido no objeto do usuário) — uma vitrine de
 * protocolos de onde não havia como registrar treino nenhum. Todo aluno passou
 * a usar /meus-treinos, que é onde vivem o registro de séries, o check-in, a
 * fila offline e o histórico.
 *
 * A rota continua existindo porque muita tela ainda manda o aluno para "/app"
 * como home, e links antigos (inclusive fora do app) apontam para cá.
 *
 * O destino depende do token de propósito: várias dessas telas usam "/app"
 * justamente como "você não está logado". Redirecionar cego para /meus-treinos
 * criaria um laço — /meus-treinos devolve quem não tem token para /app.
 */
export default function AppPage() {
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
