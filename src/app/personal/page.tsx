'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { usePersonalStudents } from '@/hooks/usePersonalStudents';
import s from './personal.module.css';
import BrandingSettings from '@/components/organism/BrandingSettings';
import MyAdvertisements from '@/components/organism/MyAdvertisements';
import StudentsTab from './_components/StudentsTab';
import ExercisesTab from './_components/ExercisesTab';
import CiclosTab from './_components/CiclosTab';

interface UserData {
    id: string;
    name: string;
    email: string;
    role: string;
    plan_type?: string;
}

type Tab =
    | 'students'
    | 'exercises'
    | 'branding'
    | 'ads'
    | 'ciclos'
    | '_publicTemplates';

export default function PersonalDashboard() {
    const router = useRouter();
    const [user, setUser] = useState<UserData | null>(null);
    const [tab, setTab] = useState<Tab>('students');
    const [planType, setPlanType] = useState<string>('free');

    /* ── Auth guard ── */
    useEffect(() => {
        const token = localStorage.getItem('token');
        const stored = localStorage.getItem('user');
        if (!token || !stored) {
            router.replace('/');
            return;
        }
        const parsed: UserData = JSON.parse(stored);
        if (parsed.role !== 'personal') {
            router.replace('/app');
            return;
        }
        setUser(parsed);
        setPlanType(parsed.plan_type ?? 'free');
    }, [router]);

    // Compartilhado entre a aba "Meus Alunos" e a aba "Ciclos" (select de
    // aluno no modal de aplicar ciclo).
    const studentsState = usePersonalStudents(!!user);

    if (!user) return null;

    const activeCount = studentsState.students.filter((s) => s.active).length;

    return (
        <div className={s.page}>
            <div className={s.container}>
                {/* Page title */}
                <div className={s.header}>
                    <div>
                        <h1 className={s.headerTitle}>💪 Área do Personal</h1>
                        <p className={s.headerSub}>Olá, {user.name}</p>
                    </div>
                </div>

                {/* Stats */}
                <div className={s.stats}>
                    <div className={s.statCard}>
                        <p className={s.statValue}>
                            {studentsState.students.length}
                        </p>
                        <p className={s.statLabel}>Total de Alunos</p>
                    </div>
                    <div className={s.statCard}>
                        <p className={s.statValue}>{activeCount}</p>
                        <p className={s.statLabel}>Ativos</p>
                    </div>
                </div>

                {/* Tab Bar */}
                <div className={s.tabBar}>
                    <button
                        className={tab === 'students' ? s.tabActive : s.tab}
                        onClick={() => setTab('students')}
                    >
                        Meus Alunos
                    </button>
                    <button
                        className={tab === 'exercises' ? s.tabActive : s.tab}
                        onClick={() => setTab('exercises')}
                    >
                        Meus Exercícios
                    </button>
                    <button
                        className={tab === 'branding' ? s.tabActive : s.tab}
                        onClick={() => setTab('branding')}
                    >
                        🎨 Personalização
                    </button>
                    {planType === 'pro' && (
                        <button
                            className={tab === 'ads' ? s.tabActive : s.tab}
                            onClick={() => setTab('ads')}
                        >
                            📢 Meus Anúncios
                        </button>
                    )}
                    <button
                        className={s.tab}
                        onClick={() => router.push('/personal/agenda')}
                    >
                        📅 Agenda
                    </button>
                    <button
                        className={tab === 'ciclos' ? s.tabActive : s.tab}
                        onClick={() => setTab('ciclos')}
                    >
                        📚 Minha Periodização / Treinos
                    </button>
                    <button
                        className={
                            tab === '_publicTemplates' ? s.tabActive : s.tab
                        }
                        onClick={() => setTab('_publicTemplates')}
                    >
                        🌐 Biblioteca Pública
                    </button>
                </div>

                {tab === 'students' && (
                    <StudentsTab state={studentsState} />
                )}

                {tab === 'exercises' && (
                    <ExercisesTab
                        planType={planType === 'pro' ? 'pro' : 'free'}
                    />
                )}

                {tab === 'branding' && (
                    <BrandingSettings planType={planType} />
                )}

                {tab === 'ads' && planType === 'pro' && <MyAdvertisements />}

                {tab === 'ciclos' && (
                    <CiclosTab
                        view="own"
                        students={studentsState.students}
                        planType={planType === 'pro' ? 'pro' : 'free'}
                    />
                )}

                {tab === '_publicTemplates' && (
                    <CiclosTab
                        view="public"
                        students={studentsState.students}
                        planType={planType === 'pro' ? 'pro' : 'free'}
                        onBack={() => setTab('ciclos')}
                    />
                )}
            </div>
        </div>
    );
}
