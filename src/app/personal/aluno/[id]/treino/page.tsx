'use client';
import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

/**
 * Rota antiga do "Ver Treino". O treino do aluno agora é uma tela só
 * (../acompanhar) — esta fica viva só para links e notificações já enviados.
 */
export default function VerTreinoAlunoPage() {
    const router = useRouter();
    const params = useParams<{ id: string }>();

    useEffect(() => {
        router.replace(`/personal/aluno/${params.id}/acompanhar`);
    }, [params.id, router]);

    return (
        <div
            className="p-6 text-center"
            style={{ color: 'var(--text-primary)' }}
        >
            Carregando treino do aluno...
        </div>
    );
}
