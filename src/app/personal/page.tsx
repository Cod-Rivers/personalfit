'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    FiUsers,
    FiTrendingUp,
    FiActivity,
    FiDroplet,
    FiSliders,
    FiSpeaker,
    FiCalendar,
    FiExternalLink,
    FiAward,
    FiBookOpen,
    FiGlobe,
    FiLock,
    FiRefreshCw,
} from 'react-icons/fi';

import { usePersonalStudents } from '@/hooks/usePersonalStudents';
import ScrollHint from '@/components/atoms/ScrollHint';
import HelpTooltip from '@/components/atoms/HelpTooltip';
import s from './personal.module.css';
import BrandingSettings from '@/components/organism/BrandingSettings';
import AutoregulationPolicySettings from '@/components/organism/AutoregulationPolicySettings';
import AISubstitutionSettings from '@/components/organism/AISubstitutionSettings';
import MyAdvertisements from '@/components/organism/MyAdvertisements';
import StudentsTab from './_components/StudentsTab';
import ExercisesTab from './_components/ExercisesTab';
import CiclosTab from './_components/CiclosTab';
import RetentionTab from './_components/RetentionTab';

interface UserData {
    id: string;
    name: string;
    email: string;
    role: string;
    plan_type?: string;
}

type Tab =
    | 'students'
    | 'retention'
    | 'exercises'
    | 'branding'
    | 'autoregulation'
    | 'ai-substitution'
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
            <ScrollHint />
            <div className={s.container}>
                {/* Page title */}
                <div className={s.header}>
                    <div>
                        <h1 className={s.headerTitle}>Área do Personal</h1>
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

                {/* Tab Bar — cada aba vem com o seu balão de ajuda ao lado.
                    O "?" é irmão do botão da aba (nunca filho): HelpTooltip
                    renderiza um <button>, e botão dentro de botão é HTML
                    inválido — o clique no "?" acabaria trocando de aba. */}
                <div className={s.tabBar}>
                    <span className={s.tabSlot}>
                        <button
                            className={tab === 'students' ? s.tabActive : s.tab}
                            onClick={() => setTab('students')}
                        >
                            <FiUsers className={s.tabIcon} />
                            Meus Alunos
                        </button>
                        <HelpTooltip
                            text="Seus alunos: pré-cadastrar, ativar ou desativar e abrir o painel de cada um (treinos, evolução, financeiro)."
                            href="/ajuda#convidar-alunos"
                            label="Ajuda sobre Meus Alunos"
                        />
                    </span>
                    <span className={s.tabSlot}>
                        <button
                            className={tab === 'retention' ? s.tabActive : s.tab}
                            onClick={() => setTab('retention')}
                        >
                            <FiTrendingUp className={s.tabIcon} />
                            Retenção
                        </button>
                        <HelpTooltip
                            text="Mostra quem está treinando pouco ou parou de registrar, para você agir antes de perder o aluno."
                            href="/ajuda#retencao"
                            label="Ajuda sobre Retenção"
                        />
                    </span>
                    <span className={s.tabSlot}>
                        <button
                            className={tab === 'exercises' ? s.tabActive : s.tab}
                            onClick={() => setTab('exercises')}
                        >
                            <FiActivity className={s.tabIcon} />
                            Meus Exercícios
                        </button>
                        <HelpTooltip
                            text="Seu acervo próprio de exercícios, com vídeo e instruções, para usar na montagem dos treinos."
                            href="/ajuda#exercicios"
                            label="Ajuda sobre Meus Exercícios"
                        />
                    </span>
                    <span className={s.tabSlot}>
                        <button
                            className={tab === 'branding' ? s.tabActive : s.tab}
                            onClick={() => setTab('branding')}
                        >
                            <FiDroplet className={s.tabIcon} />
                            Personalização
                        </button>
                        <HelpTooltip
                            text="Aplica a sua marca no app dos alunos: logo, cores e mensagem de boas-vindas. Recurso PRO."
                            href="/ajuda#personalizacao"
                            label="Ajuda sobre Personalização"
                        />
                    </span>
                    <span className={s.tabSlot}>
                        <button
                            className={
                                tab === 'autoregulation' ? s.tabActive : s.tab
                            }
                            onClick={() => setTab('autoregulation')}
                        >
                            <FiSliders className={s.tabIcon} />
                            Autorregulação
                        </button>
                        <HelpTooltip
                            text="Define o quanto o app ajusta a carga do treino conforme o sono, a dor e a prontidão que o aluno informa."
                            href="/ajuda#autorregulacao-config"
                            label="Ajuda sobre Autorregulação"
                        />
                    </span>
                    <span className={s.tabSlot}>
                        <button
                            className={
                                tab === 'ai-substitution' ? s.tabActive : s.tab
                            }
                            onClick={() => setTab('ai-substitution')}
                        >
                            <FiRefreshCw className={s.tabIcon} />
                            Substituição por IA
                        </button>
                        <HelpTooltip
                            text="Liga ou desliga a sugestão automática de exercícios alternativos quando falta equipamento ao aluno. Recurso PRO."
                            href="/ajuda#substituicao-ia"
                            label="Ajuda sobre Substituição por IA"
                        />
                    </span>
                    {planType === 'pro' && (
                        <span className={s.tabSlot}>
                            <button
                                className={tab === 'ads' ? s.tabActive : s.tab}
                                onClick={() => setTab('ads')}
                            >
                                <FiSpeaker className={s.tabIcon} />
                                Meus Anúncios
                            </button>
                            <HelpTooltip
                                text="Divulga o seu trabalho dentro do app dos seus alunos. Como assinante PRO, ninguém vê anúncios de terceiros."
                                href="/ajuda#anuncios"
                                label="Ajuda sobre Meus Anúncios"
                            />
                        </span>
                    )}
                    <span className={s.tabSlot}>
                        <button
                            className={s.tab}
                            onClick={() =>
                                router.push(
                                    planType === 'pro'
                                        ? '/personal/agenda'
                                        : '/pagamento?produto=pro',
                                )
                            }
                            title={
                                planType === 'pro'
                                    ? undefined
                                    : 'Recurso exclusivo do plano PRO'
                            }
                        >
                            <FiCalendar className={s.tabIcon} />
                            Agenda
                            {planType !== 'pro' && (
                                <FiLock className={s.tabLock} />
                            )}
                        </button>
                        <HelpTooltip
                            text="Seus atendimentos, a presença de cada sessão e a grade de horários que o aluno pode escolher. Recurso PRO."
                            href="/ajuda#agenda"
                            label="Ajuda sobre a Agenda"
                        />
                    </span>
                    <span className={s.tabSlot}>
                        <button
                            className={s.tab}
                            onClick={() =>
                                router.push(
                                    planType === 'pro'
                                        ? '/vitrine'
                                        : '/pagamento?produto=pro',
                                )
                            }
                            title={
                                planType === 'pro'
                                    ? 'Página de divulgação exibida aos seus alunos'
                                    : 'Recurso exclusivo do plano PRO'
                            }
                        >
                            <FiExternalLink className={s.tabIcon} />
                            Minha Página
                            {planType !== 'pro' && (
                                <FiLock className={s.tabLock} />
                            )}
                        </button>
                        <HelpTooltip
                            text="Sua vitrine: a tela que o aluno vê ao entrar no app, com bio, especialidades, resultados e redes. Recurso PRO."
                            href="/ajuda#minha-pagina"
                            label="Ajuda sobre Minha Página"
                        />
                    </span>
                    <span className={s.tabSlot}>
                        <button
                            className={s.tab}
                            onClick={() => router.push('/personal/desafios')}
                        >
                            <FiAward className={s.tabIcon} />
                            Desafios
                        </button>
                        <HelpTooltip
                            text="Cria campanhas de constância com link público, para engajar os alunos atuais e atrair novos."
                            href="/ajuda#desafios"
                            label="Ajuda sobre Desafios"
                        />
                    </span>
                    <span className={s.tabSlot}>
                        <button
                            className={tab === 'ciclos' ? s.tabActive : s.tab}
                            onClick={() => setTab('ciclos')}
                        >
                            <FiBookOpen className={s.tabIcon} />
                            Minha Periodização / Treinos
                        </button>
                        <HelpTooltip
                            text="Seus ciclos reutilizáveis: monte um modelo de treino uma vez e aplique em quantos alunos quiser."
                            href="/ajuda#periodizacao-biblioteca"
                            label="Ajuda sobre Minha Periodização / Treinos"
                        />
                    </span>
                    <span className={s.tabSlot}>
                        <button
                            className={
                                tab === '_publicTemplates' ? s.tabActive : s.tab
                            }
                            onClick={() => setTab('_publicTemplates')}
                        >
                            <FiGlobe className={s.tabIcon} />
                            Biblioteca Pública
                        </button>
                        <HelpTooltip
                            text="Ciclos prontos publicados no Venafit, que você copia para a sua biblioteca e adapta como quiser."
                            href="/ajuda#biblioteca-publica"
                            label="Ajuda sobre a Biblioteca Pública"
                        />
                    </span>
                </div>

                {tab === 'students' && (
                    <StudentsTab state={studentsState} />
                )}

                {tab === 'retention' && <RetentionTab />}

                {tab === 'exercises' && (
                    <ExercisesTab
                        planType={planType === 'pro' ? 'pro' : 'free'}
                    />
                )}

                {tab === 'branding' && (
                    <BrandingSettings planType={planType} />
                )}

                {tab === 'autoregulation' && <AutoregulationPolicySettings />}
                {tab === 'ai-substitution' && <AISubstitutionSettings />}

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
