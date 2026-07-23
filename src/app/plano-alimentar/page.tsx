'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import MealPlanEditor from '@/components/features/MealPlanEditor';
import s from '../agendamentos/agendamentos.module.css';

interface UserData {
    id: string;
    name: string;
    role: string;
    has_personal?: boolean;
}

export default function MyMealPlanPage() {
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
        // acessar seu próprio plano alimentar, mesmo sem role=student.
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
                        <h1 className={s.headerTitle}>🍽️ Plano Alimentar</h1>
                        <p className={s.headerSub}>
                            Seu plano de alimentação, registrado e acompanhado
                            ao longo do tempo
                        </p>
                    </div>
                </div>

                <MealPlanEditor />
            </div>
        </div>
    );
}
