'use client';
import { useRouter, useParams } from 'next/navigation';
import { FiCoffee, FiArrowLeft } from 'react-icons/fi';
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
                        <h1 className={s.headerTitle}><FiCoffee /> Plano Alimentar</h1>
                        <p className={s.headerSub}>Registro e acompanhamento do plano de alimentação do aluno</p>
                    </div>
                    <button className={s.btnBack} onClick={() => router.back()}>
                        <FiArrowLeft /> Voltar
                    </button>
                </div>

                <MealPlanEditor studentId={studentId} />
            </div>
        </div>
    );
}
