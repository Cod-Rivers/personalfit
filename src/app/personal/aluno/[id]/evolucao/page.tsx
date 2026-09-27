'use client';
import { useRouter, useParams } from 'next/navigation';
import { FiTrendingUp, FiArrowLeft } from 'react-icons/fi';
import EvolutionTabs from '@/components/features/EvolutionTabs';
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
                        <h1 className={s.headerTitle}><FiTrendingUp /> Evolução</h1>
                        <p className={s.headerSub}>Avaliação física e evolução de carga do aluno ao longo do tempo</p>
                    </div>
                    <button className={s.btnBack} onClick={() => router.back()}>
                        <FiArrowLeft /> Voltar
                    </button>
                </div>

                <EvolutionTabs studentId={studentId} />
            </div>
        </div>
    );
}
