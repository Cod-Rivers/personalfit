'use client';
import { useRouter, useParams } from 'next/navigation';
import MealPlanEditor from '@/components/features/MealPlanEditor';
import s from '../periodizacao/periodizacao.module.css';

export default function PersonalMealPlanPage() {
    const router = useRouter();
    const params = useParams<{ id: string }>();
    const studentId = params.id;

    return (
        <div className={s.page}>
            <div className={s.container}>
                <div className={s.header}>
                    <div>
                        <h1 className={s.headerTitle}>🍽️ Plano Alimentar</h1>
                        <p className={s.headerSub}>Registro e acompanhamento do plano de alimentação do aluno</p>
                    </div>
                    <button className={s.btnBack} onClick={() => router.back()}>
                        ← Voltar
                    </button>
                </div>

                <MealPlanEditor studentId={studentId} />
            </div>
        </div>
    );
}
