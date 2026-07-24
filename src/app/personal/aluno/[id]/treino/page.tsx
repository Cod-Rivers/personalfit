'use client';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { getStudentPlannings } from '@/libs/planningService';

export default function VerTreinoAlunoPage() {
    const router = useRouter();
    const params = useParams<{ id: string }>();
    const studentId = params.id;
    const [error, setError] = useState('');

    useEffect(() => {
        getStudentPlannings(studentId)
            .then((plannings) => {
                if (plannings.length === 0) {
                    router.replace(`/personal/aluno/${studentId}/periodizacao`);
                    return;
                }
                const active =
                    plannings.find((p) => p.status === 'active') ??
                    plannings[0];
                router.replace(
                    `/personal/aluno/${studentId}/periodizacao/${active.id}`,
                );
            })
            .catch((e: Error) => setError(e.message));
    }, [studentId, router]);

    if (error) {
        return (
            <div className="p-6 text-center text-red-600">
                Erro ao carregar treino do aluno: {error}
            </div>
        );
    }

    return (
        <div
            className="p-6 text-center"
            style={{ color: 'var(--text-primary)' }}
        >
            Carregando treino do aluno...
        </div>
    );
}
