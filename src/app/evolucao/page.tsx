'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FiTrendingUp, FiArrowLeft } from 'react-icons/fi';
import EvolutionTabs from '@/components/features/EvolutionTabs';
import s from '../agendamentos/agendamentos.module.css';

interface UserData {
    id: string;
    name: string;
    role: string;
    has_personal?: boolean;
}

export default function MyEvolutionPage() {
    const router = useRouter();
    const [user, setUser] = useState<UserData | null>(null);

    useEffect(() => {
        const token = localStorage.getItem('token');
        const stored = localStorage.getItem('user');
        if (!token || !stored) {
            router.replace('/');
            return;
        }
        const parsed: UserData = JSON.parse(stored);
        // Uma conta admin/personal que também é aluna (has_personal) pode
        // acessar sua própria evolução, mesmo sem role=student.
        if (parsed.role !== 'student' && !parsed.has_personal) {
            router.replace('/app');
            return;
        }
        setUser(parsed);
    }, [router]);

    if (!user) return null;

    return (
        <div className={s.page}>
            <div className={s.container}>
                <div className={s.header}>
                    <div>
                        <h1 className={s.headerTitle}><FiTrendingUp /> Evolução</h1>
                        <p className={s.headerSub}>
                            Avaliação física e evolução de carga ao longo do
                            tempo
                        </p>
                    </div>
                    <button
                        className={s.btnBack}
                        onClick={() =>
                            router.push(
                                user.has_personal ? '/meus-treinos' : '/app',
                            )
                        }
                    >
                        <FiArrowLeft /> Voltar
                    </button>
                </div>

                <EvolutionTabs />
            </div>
        </div>
    );
}
