'use client';
import { useRouter, useParams } from 'next/navigation';
import EvolutionTimeline from '@/components/features/EvolutionTimeline';
import TrainingZonesCalculator from '@/components/features/TrainingZonesCalculator';
import s from '../periodizacao/periodizacao.module.css';

export default function PersonalEvolutionPage() {
    const router = useRouter();
    const params = useParams<{ id: string }>();
    const studentId = params.id;

    return (
        <div className={s.page}>
            <div className={s.container}>
                <div className={s.header}>
                    <div>
                        <h1 className={s.headerTitle}>📈 Evolução</h1>
                        <p className={s.headerSub}>Fotos e avaliação física do aluno ao longo do tempo</p>
                    </div>
                    <button className={s.btnBack} onClick={() => router.back()}>
                        ← Voltar
                    </button>
                </div>

                <TrainingZonesCalculator />
                <EvolutionTimeline studentId={studentId} />
            </div>
        </div>
    );
}
