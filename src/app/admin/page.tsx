'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { isAxiosError } from 'axios';
import s from './admin.module.css';
import * as adminService from '@/libs/adminService';
import * as videoService from '@/libs/exerciseVideoService';
import AdminAdvertisements from '@/components/organism/AdminAdvertisements';
import AdminReferralPartners from '@/components/organism/AdminReferralPartners';
import AdminProtocols from '@/components/organism/AdminProtocols';
import Modal from '@/components/system/Modal';
import {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
} from 'recharts';

type Section =
    | 'metrics'
    | 'templates'
    | 'ratings'
    | 'exercises'
    | 'notifications'
    | 'logs'
    | 'users'
    | 'ads'
    | 'referral-partners'
    | 'protocols'
    | 'relatorios'
    | 'diagnostics';

interface UserData {
    id: string;
    name: string;
    email: string;
    role: string;
}

export default function AdminDashboard() {
    const router = useRouter();
    const [user, setUser] = useState<UserData | null>(null);
    const [section, setSection] = useState<Section>('metrics');
    const [menuOpen, setMenuOpen] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem('token');
        const stored = localStorage.getItem('user');
        if (!token || !stored) {
            router.replace('/');
            return;
        }
        const parsed: UserData = JSON.parse(stored);
        if (parsed.role !== 'admin' && parsed.role !== 'content_editor') {
            router.replace('/');
            return;
        }
        setUser(parsed);
        if (parsed.role !== 'admin') {
            setSection('templates');
        }
    }, [router]);

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        router.replace('/');
    };

    if (!user) return null;

    const isFullAdmin = user.role === 'admin';

    const allNavItems: {
        key: Section;
        label: string;
        icon: string;
        fullAdminOnly?: boolean;
    }[] = [
        { key: 'metrics', label: 'Dashboard', icon: '📊', fullAdminOnly: true },
        { key: 'templates', label: 'Templates', icon: '📋' },
        { key: 'ratings', label: 'Avaliações', icon: '⭐' },
        { key: 'exercises', label: 'Exercícios', icon: '🏋️' },
        {
            key: 'notifications',
            label: 'Notificações',
            icon: '🔔',
            fullAdminOnly: true,
        },
        { key: 'logs', label: 'Logs', icon: '📝', fullAdminOnly: true },
        { key: 'users', label: 'Usuários', icon: '👥', fullAdminOnly: true },
        { key: 'ads', label: 'Anúncios', icon: '📢', fullAdminOnly: true },
        {
            key: 'referral-partners',
            label: 'Parceiros de Indicação',
            icon: '🤝',
            fullAdminOnly: true,
        },
        {
            key: 'protocols',
            label: 'Protocolos de Treino',
            icon: '🏋️‍♂️',
            fullAdminOnly: true,
        },
        {
            key: 'relatorios',
            label: 'Relatórios BI',
            icon: '📈',
            fullAdminOnly: true,
        },
        {
            key: 'diagnostics',
            label: 'Diagnóstico',
            icon: '🩺',
            fullAdminOnly: true,
        },
    ];
    const navItems = allNavItems.filter(
        (item) => isFullAdmin || !item.fullAdminOnly,
    );

    return (
        <div className={s.page}>
            <header className={s.mobileTopbar}>
                <button
                    className={s.mobileMenuBtn}
                    onClick={() => setMenuOpen(true)}
                    aria-label="Abrir menu"
                    aria-expanded={menuOpen}
                >
                    ☰
                </button>
                <h1 className={s.mobileTopbarTitle}>⚙️ Admin</h1>
            </header>

            {menuOpen && (
                <div
                    className={s.backdrop}
                    onClick={() => setMenuOpen(false)}
                    aria-hidden="true"
                />
            )}

            <nav
                className={`${s.sidebar} ${menuOpen ? s.sidebarOpen : ''}`}
            >
                <div className={s.sidebarHeader}>
                    <h2 className={s.sidebarTitle}>⚙️ Admin</h2>
                    <p className={s.sidebarSub}>
                        {user.name}
                        {!isFullAdmin && ' · Editor de Conteúdo'}
                    </p>
                </div>
                <ul className={s.navList}>
                    {navItems.map((item) => (
                        <li
                            key={item.key}
                            className={
                                section === item.key
                                    ? s.navItemActive
                                    : s.navItem
                            }
                            onClick={() => {
                                setSection(item.key);
                                setMenuOpen(false);
                            }}
                        >
                            {item.icon} {item.label}
                        </li>
                    ))}
                </ul>
                <div className={s.sidebarFooter}>
                    <button onClick={logout} className={s.btnLogout}>
                        Sair
                    </button>
                </div>
            </nav>

            <main className={s.main}>
                {section === 'metrics' && <MetricsSection />}
                {section === 'templates' && (
                    <TemplatesSection canManageUsers={isFullAdmin} />
                )}
                {section === 'ratings' && <RatingsSection />}
                {section === 'exercises' && <ExercisesSection />}
                {section === 'notifications' && <NotificationsSection />}
                {section === 'logs' && <LogsSection />}
                {section === 'users' && <UsersSection currentUserId={user.id} />}
                {section === 'ads' && <AdminAdvertisements />}
                {section === 'referral-partners' && (
                    <AdminReferralPartners />
                )}
                {section === 'protocols' && <AdminProtocols />}
                {section === 'relatorios' && <RelatoriosSection />}
                {section === 'diagnostics' && <DiagnosticsSection />}
            </main>
        </div>
    );
}

/* ═══════════════════════════════════════════════
   METRICS SECTION
   ═══════════════════════════════════════════════ */
function MetricsSection() {
    const [metrics, setMetrics] = useState<adminService.MetricsResponse | null>(
        null,
    );
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        adminService
            .getMetrics()
            .then(setMetrics)
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <p className={s.loading}>Carregando métricas...</p>;
    if (!metrics)
        return <p className={s.loading}>Erro ao carregar métricas.</p>;

    const cards = [
        { label: 'Total Usuários', value: metrics.total_users },
        { label: 'Personais', value: metrics.total_personals },
        { label: 'Alunos', value: metrics.total_students },
        { label: 'Admins', value: metrics.total_admins },
        { label: 'Templates', value: metrics.total_templates },
    ];

    return (
        <>
            <div className={s.sectionHeader}>
                <h1 className={s.sectionTitle}>📊 Dashboard</h1>
                <div className={s.btnGroup}>
                    <button
                        onClick={() =>
                            adminService.exportCSV('users', 'usuarios.csv')
                        }
                        className={s.btnOutline}
                    >
                        📥 Exportar Usuários
                    </button>
                    <button
                        onClick={() =>
                            adminService.exportCSV('ratings', 'avaliacoes.csv')
                        }
                        className={s.btnOutline}
                    >
                        📥 Exportar Avaliações
                    </button>
                </div>
            </div>
            <div className={s.statsGrid}>
                {cards.map((c) => (
                    <div key={c.label} className={s.statCard}>
                        <p className={s.statValue}>{c.value}</p>
                        <p className={s.statLabel}>{c.label}</p>
                    </div>
                ))}
            </div>
        </>
    );
}

/* ═══════════════════════════════════════════════
   TEMPLATES SECTION
   ═══════════════════════════════════════════════ */
function TemplatesSection({ canManageUsers }: { canManageUsers: boolean }) {
    const [templates, setTemplates] = useState<adminService.TemplateResponse[]>(
        [],
    );
    const [pending, setPending] = useState<adminService.TemplateResponse[]>(
        [],
    );
    const [tab, setTab] = useState<'library' | 'pending'>('library');
    const [sortBy, setSortBy] = useState<'recent' | 'usage'>('recent');
    const [users, setUsers] = useState<adminService.UserListItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [showAssign, setShowAssign] = useState<string | null>(null);
    const [name, setName] = useState('');
    const [goal, setGoal] = useState('');
    const [isPublic, setIsPublic] = useState(true);
    const [personalId, setPersonalId] = useState('');
    const [studentId, setStudentId] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [busyId, setBusyId] = useState<string | null>(null);
    const [error, setError] = useState('');

    const fetchTemplates = useCallback(async () => {
        try {
            setTemplates(await adminService.getTemplates());
        } catch {
            setTemplates([]);
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchPending = useCallback(async () => {
        try {
            setPending(await adminService.getPendingTemplates());
        } catch {
            setPending([]);
        }
    }, []);

    useEffect(() => {
        fetchTemplates();
        fetchPending();
        if (canManageUsers) {
            adminService
                .getUsers()
                .then(setUsers)
                .catch(() => setUsers([]));
        }
    }, [fetchTemplates, fetchPending, canManageUsers]);

    const personals = users.filter((u) => u.role === 'personal');
    const students = users.filter((u) => u.role === 'student');

    const sortedTemplates = [...templates].sort((a, b) =>
        sortBy === 'usage'
            ? b.usage_count - a.usage_count
            : new Date(b.created_at).getTime() -
              new Date(a.created_at).getTime(),
    );

    const handleApprove = async (id: string) => {
        setBusyId(id);
        try {
            await adminService.approveTemplate(id);
            await Promise.all([fetchPending(), fetchTemplates()]);
        } catch {
            alert('Erro ao aprovar template.');
        } finally {
            setBusyId(null);
        }
    };

    const handleReject = async (id: string) => {
        const reason = window.prompt(
            'Motivo da rejeição (opcional, visível para o personal):',
            '',
        );
        if (reason === null) return; // cancelado
        setBusyId(id);
        try {
            await adminService.rejectTemplate(id, reason);
            await Promise.all([fetchPending(), fetchTemplates()]);
        } catch {
            alert('Erro ao rejeitar template.');
        } finally {
            setBusyId(null);
        }
    };

    // Dias desde a submissão de um template pendente — só um indicador visual
    // para o admin priorizar revisões antigas; não há rejeição automática.
    const daysPending = (createdAt: string) =>
        Math.floor(
            (Date.now() - new Date(createdAt).getTime()) /
                (1000 * 60 * 60 * 24),
        );

    const handleToggleFeatured = async (
        id: string,
        currentlyFeatured: boolean,
    ) => {
        setBusyId(id);
        try {
            await adminService.setTemplateFeatured(id, !currentlyFeatured);
            await fetchTemplates();
        } catch {
            alert('Erro ao atualizar destaque.');
        } finally {
            setBusyId(null);
        }
    };

    const handleCreate = async () => {
        if (!name.trim()) return;
        setSubmitting(true);
        setError('');
        try {
            await adminService.createTemplate({ name, goal, is_public: isPublic });
            setShowCreate(false);
            setName('');
            setGoal('');
            setIsPublic(true);
            fetchTemplates();
        } catch {
            setError('Erro ao criar template.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await adminService.deleteTemplate(id);
            fetchTemplates();
        } catch {
            /* silent */
        }
    };

    const handleAssign = async () => {
        if (!personalId.trim() || !studentId.trim() || !showAssign) return;
        setSubmitting(true);
        setError('');
        try {
            await adminService.assignTemplate(
                showAssign,
                personalId,
                studentId,
            );
            setShowAssign(null);
            setPersonalId('');
            setStudentId('');
            alert('Template atribuído com sucesso!');
        } catch {
            setError('Erro ao atribuir template.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <>
            <div className={s.sectionHeader}>
                <h1 className={s.sectionTitle}>📋 Templates de Macrociclo</h1>
                <button
                    onClick={() => setShowCreate(true)}
                    className={s.btnPrimary}
                >
                    + Novo Template
                </button>
            </div>

            <div className={s.btnGroup} style={{ marginBottom: 16 }}>
                <button
                    onClick={() => setTab('library')}
                    className={tab === 'library' ? s.btnPrimary : s.btnOutline}
                >
                    Biblioteca
                </button>
                <button
                    onClick={() => setTab('pending')}
                    className={tab === 'pending' ? s.btnPrimary : s.btnOutline}
                >
                    Pendentes de revisão
                    {pending.length > 0 ? ` (${pending.length})` : ''}
                </button>
                {tab === 'library' && (
                    <select
                        value={sortBy}
                        onChange={(e) =>
                            setSortBy(e.target.value as 'recent' | 'usage')
                        }
                        className={s.formSelect}
                        style={{ marginLeft: 'auto', width: 'auto' }}
                    >
                        <option value="recent">Mais recentes</option>
                        <option value="usage">Mais usados</option>
                    </select>
                )}
            </div>

            {tab === 'library' ? (
                loading ? (
                    <p className={s.loading}>Carregando...</p>
                ) : sortedTemplates.length === 0 ? (
                    <div className={s.empty}>
                        <div className={s.emptyIcon}>📋</div>
                        <h3 className={s.emptyTitle}>
                            Nenhum template criado
                        </h3>
                        <p className={s.emptyText}>
                            Crie templates genéricos para reutilizar com
                            alunos.
                        </p>
                    </div>
                ) : (
                    sortedTemplates.map((t) => (
                        <div key={t.id} className={s.card}>
                            <div className={s.cardHeader}>
                                <div>
                                    <h3 className={s.cardTitle}>
                                        {t.featured && '⭐ '}
                                        {t.name}{' '}
                                        {t.created_by_admin ? (
                                            <span className={s.badgeInfo}>
                                                equipe
                                            </span>
                                        ) : (
                                            <span className={s.badgeSuccess}>
                                                compartilhado
                                            </span>
                                        )}
                                    </h3>
                                    <p className={s.cardMeta}>
                                        {t.goal || 'Sem objetivo definido'} ·{' '}
                                        {t.mesocycles?.length || 0} mesociclos
                                        {' · '}
                                        {t.usage_count || 0} uso
                                        {t.usage_count === 1 ? '' : 's'}
                                        {!t.created_by_admin &&
                                            t.owner_name && (
                                                <>
                                                    {' '}
                                                    · por {t.owner_name}
                                                    {t.owner_role
                                                        ? ` (${t.owner_role})`
                                                        : ''}
                                                </>
                                            )}
                                    </p>
                                </div>
                                <div className={s.btnGroup}>
                                    <button
                                        onClick={() =>
                                            handleToggleFeatured(
                                                t.id,
                                                t.featured,
                                            )
                                        }
                                        disabled={busyId === t.id}
                                        className={`${s.btnOutline} ${s.btnSmall}`}
                                        title={
                                            t.featured
                                                ? 'Remover destaque'
                                                : 'Destacar na biblioteca pública'
                                        }
                                    >
                                        {t.featured
                                            ? '⭐ Destacado'
                                            : '☆ Destacar'}
                                    </button>
                                    {!t.created_by_admin && (
                                        <button
                                            onClick={() => handleReject(t.id)}
                                            disabled={busyId === t.id}
                                            className={`${s.btnDanger} ${s.btnSmall}`}
                                            title="Remove o ciclo da biblioteca pública; o personal pode reenviar para revisão editando-o novamente"
                                        >
                                            ✕ Revogar
                                        </button>
                                    )}
                                    {canManageUsers && (
                                        <button
                                            onClick={() =>
                                                setShowAssign(t.id)
                                            }
                                            className={`${s.btnOutline} ${s.btnSmall}`}
                                        >
                                            Atribuir
                                        </button>
                                    )}
                                    <button
                                        onClick={() => handleDelete(t.id)}
                                        className={`${s.btnDanger} ${s.btnSmall}`}
                                    >
                                        Excluir
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )
            ) : pending.length === 0 ? (
                <div className={s.empty}>
                    <div className={s.emptyIcon}>✅</div>
                    <h3 className={s.emptyTitle}>
                        Nenhum template pendente
                    </h3>
                    <p className={s.emptyText}>
                        Templates que personal trainers marcarem como
                        públicos aparecem aqui para revisão.
                    </p>
                </div>
            ) : (
                pending.map((t) => (
                    <div key={t.id} className={s.card}>
                        <div className={s.cardHeader}>
                            <div>
                                <h3 className={s.cardTitle}>
                                    {t.name}{' '}
                                    <span className={s.badgeWarning}>
                                        pendente
                                    </span>
                                    {daysPending(t.created_at) > 60 && (
                                        <span
                                            className={s.badgeDanger}
                                            title="Pendente há mais de 60 dias"
                                        >
                                            {' '}
                                            {daysPending(t.created_at)} dias
                                        </span>
                                    )}
                                </h3>
                                <p className={s.cardMeta}>
                                    {t.goal || 'Sem objetivo definido'} ·{' '}
                                    {t.mesocycles?.length || 0} mesociclos
                                    {t.owner_name && (
                                        <>
                                            {' '}
                                            · por {t.owner_name}
                                            {t.owner_role
                                                ? ` (${t.owner_role})`
                                                : ''}
                                        </>
                                    )}
                                </p>
                            </div>
                            <div className={s.btnGroup}>
                                <button
                                    onClick={() => handleApprove(t.id)}
                                    disabled={busyId === t.id}
                                    className={`${s.btnPrimary} ${s.btnSmall}`}
                                >
                                    ✓ Aprovar
                                </button>
                                <button
                                    onClick={() => handleReject(t.id)}
                                    disabled={busyId === t.id}
                                    className={`${s.btnDanger} ${s.btnSmall}`}
                                >
                                    ✕ Rejeitar
                                </button>
                            </div>
                        </div>
                    </div>
                ))
            )}

            <Modal
                open={showCreate}
                onClose={() => setShowCreate(false)}
                title="Novo Template"
                footer={
                    <>
                        <button
                            onClick={() => setShowCreate(false)}
                            className={s.btnOutline}
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleCreate}
                            className={s.btnPrimary}
                            disabled={submitting}
                        >
                            {submitting ? 'Criando...' : 'Criar'}
                        </button>
                    </>
                }
            >
                {error && <p className={s.errorMsg}>{error}</p>}
                <div className={s.formGroup}>
                    <label className={s.formLabel}>Nome</label>
                    <input
                        className={s.formInput}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Nome do template"
                    />
                </div>
                <div className={s.formGroup}>
                    <label className={s.formLabel}>Objetivo</label>
                    <input
                        className={s.formInput}
                        value={goal}
                        onChange={(e) => setGoal(e.target.value)}
                        placeholder="Objetivo do macrociclo"
                    />
                </div>
                <div className={s.formGroup}>
                    <label
                        className={s.formLabel}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            cursor: 'pointer',
                        }}
                    >
                        <input
                            type="checkbox"
                            checked={isPublic}
                            onChange={(e) =>
                                setIsPublic(e.target.checked)
                            }
                        />
                        Visível na biblioteca pública de templates
                        (personal trainers podem usá-lo)
                    </label>
                </div>
            </Modal>

            <Modal
                open={!!showAssign}
                onClose={() => setShowAssign(null)}
                title="Atribuir Template a Aluno"
                footer={
                    <>
                        <button
                            onClick={() => setShowAssign(null)}
                            className={s.btnOutline}
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleAssign}
                            className={s.btnPrimary}
                            disabled={submitting}
                        >
                            {submitting ? 'Atribuindo...' : 'Atribuir'}
                        </button>
                    </>
                }
            >
                {error && <p className={s.errorMsg}>{error}</p>}
                <div className={s.formGroup}>
                    <label className={s.formLabel}>Personal</label>
                    <select
                        className={s.formSelect}
                        value={personalId}
                        onChange={(e) => setPersonalId(e.target.value)}
                    >
                        <option value="">Selecione um personal...</option>
                        {personals.map((p) => (
                            <option key={p.id} value={p.id}>
                                {p.name} ({p.email})
                            </option>
                        ))}
                    </select>
                </div>
                <div className={s.formGroup}>
                    <label className={s.formLabel}>Aluno</label>
                    <select
                        className={s.formSelect}
                        value={studentId}
                        onChange={(e) => setStudentId(e.target.value)}
                    >
                        <option value="">Selecione um aluno...</option>
                        {students.map((st) => (
                            <option key={st.id} value={st.id}>
                                {st.name} ({st.email})
                            </option>
                        ))}
                    </select>
                </div>
            </Modal>
        </>
    );
}

/* ═══════════════════════════════════════════════
   RATINGS SECTION
   ═══════════════════════════════════════════════ */
function RatingsSection() {
    const [ratings, setRatings] = useState<adminService.RatingResponse[]>([]);
    const [topRated, setTopRated] = useState<
        adminService.RatingAggregationResponse[]
    >([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([adminService.getRatings(), adminService.getTopRated()])
            .then(([r, t]) => {
                setRatings(r);
                setTopRated(t);
            })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    const renderStars = (n: number) => '★'.repeat(n) + '☆'.repeat(5 - n);

    const handlePromote = async (id: string) => {
        try {
            await adminService.promoteToTemplate(id);
            alert('Macrociclo promovido a template!');
        } catch {
            alert('Erro ao promover.');
        }
    };

    if (loading) return <p className={s.loading}>Carregando...</p>;

    return (
        <>
            <div className={s.sectionHeader}>
                <h1 className={s.sectionTitle}>⭐ Avaliações</h1>
            </div>

            {topRated.length > 0 && (
                <>
                    <h2 style={{ fontSize: '1.1rem', marginBottom: 16 }}>
                        🏆 Mais Bem Avaliados
                    </h2>
                    <div className={s.statsGrid}>
                        {topRated.map((t) => (
                            <div key={t.target_id} className={s.statCard}>
                                <p className={`${s.stars} ${s.starsAvg}`}>
                                    {t.avg_stars.toFixed(1)} ★
                                </p>
                                <p className={s.statLabel}>
                                    {t.count} avaliações
                                </p>
                                <button
                                    onClick={() => handlePromote(t.target_id)}
                                    className={`${s.btnOutline} ${s.btnSmall}`}
                                    style={{ marginTop: 8 }}
                                >
                                    Promover a Template
                                </button>
                            </div>
                        ))}
                    </div>
                </>
            )}

            <h2 style={{ fontSize: '1.1rem', margin: '24px 0 16px' }}>
                Todas as Avaliações
            </h2>
            {ratings.length === 0 ? (
                <div className={s.empty}>
                    <div className={s.emptyIcon}>⭐</div>
                    <h3 className={s.emptyTitle}>Nenhuma avaliação ainda</h3>
                    <p className={s.emptyText}>
                        As avaliações dos alunos aparecerão aqui.
                    </p>
                </div>
            ) : (
                <table className={s.table}>
                    <thead>
                        <tr>
                            <th>Estrelas</th>
                            <th>Tipo</th>
                            <th>Comentário</th>
                            <th>Data</th>
                        </tr>
                    </thead>
                    <tbody>
                        {ratings.map((r) => (
                            <tr key={r.id}>
                                <td>
                                    <span className={s.stars}>
                                        {renderStars(r.stars)}
                                    </span>
                                </td>
                                <td>{r.target_type}</td>
                                <td>{r.comment || '—'}</td>
                                <td>
                                    {new Date(r.created_at).toLocaleDateString(
                                        'pt-BR',
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </>
    );
}

/* ═══════════════════════════════════════════════
   EXERCISES SECTION
   ═══════════════════════════════════════════════ */
function ExercisesSection() {
    const [exercises, setExercises] = useState<
        adminService.ExerciseLibraryItem[]
    >([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [modalMode, setModalMode] = useState<'none' | 'create' | 'edit'>(
        'none',
    );
    const [editTarget, setEditTarget] =
        useState<adminService.ExerciseLibraryItem | null>(null);
    const [form, setForm] = useState({
        name: '',
        muscle_group: '',
        category: '',
        video_url: '',
        description: '',
        tags: '',
    });
    const [uploadMode, setUploadMode] = useState<'youtube' | 'upload'>(
        'youtube',
    );
    const [mediaFile, setMediaFile] = useState<File | null>(null);
    const [mediaPreview, setMediaPreview] = useState<string>('');
    const [uploadProgress, setUploadProgress] = useState(0);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const apiBase = process.env.NEXT_PUBLIC_API_URL ?? '';

    const fetchExercises = useCallback(async (q?: string) => {
        try {
            setExercises(await adminService.getExercises(q));
        } catch {
            setExercises([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchExercises();
    }, [fetchExercises]);

    const handleSearch = () => {
        setLoading(true);
        fetchExercises(search);
    };

    const openCreate = () => {
        setEditTarget(null);
        setForm({
            name: '',
            muscle_group: '',
            category: '',
            video_url: '',
            description: '',
            tags: '',
        });
        setUploadMode('youtube');
        setMediaFile(null);
        setMediaPreview('');
        setUploadProgress(0);
        setError('');
        setModalMode('create');
    };

    const openEdit = (ex: adminService.ExerciseLibraryItem) => {
        setEditTarget(ex);
        setForm({
            name: ex.name,
            muscle_group: ex.muscle_group,
            category: ex.category,
            video_url: ex.video_url,
            description: ex.description,
            tags: ex.tags?.join(', ') ?? '',
        });
        // video_url já vem resolvido pela API como URL pública final (R2/CDN);
        // qualquer coisa que não seja um link externo suportado é um arquivo hospedado.
        const isExternalLink =
            !!ex.video_url &&
            videoService.isSupportedExternalVideoUrl(ex.video_url);
        const isUpload = !!ex.video_url && !isExternalLink;
        setUploadMode(isUpload ? 'upload' : 'youtube');
        setMediaFile(null);
        setUploadProgress(0);
        setError('');
        setModalMode('edit');
        setMediaPreview(isUpload ? ex.video_url : (ex.video_thumb ?? ''));
    };

    const closeModal = () => {
        setModalMode('none');
        setEditTarget(null);
        setMediaFile(null);
        setMediaPreview('');
        setUploadProgress(0);
        setError('');
    };

    const handleMediaChange = async (
        e: React.ChangeEvent<HTMLInputElement>,
    ) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const validationError = await videoService.validateMediaFile(file);
        if (validationError) {
            setError(validationError);
            return;
        }
        setError('');
        setMediaFile(file);
        if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
            setMediaPreview(URL.createObjectURL(file));
        }
    };

    const handleCreate = async () => {
        if (!form.name.trim()) return;
        setSubmitting(true);
        setError('');
        try {
            const created = await adminService.createExercise({
                name: form.name,
                muscle_group: form.muscle_group,
                category: form.category,
                video_url: uploadMode === 'youtube' ? form.video_url : '',
                description: form.description,
                tags: form.tags
                    ? form.tags.split(',').map((t) => t.trim())
                    : [],
            });
            if (uploadMode === 'upload' && mediaFile) {
                setUploadProgress(1);
                const { upload_url, object_path } =
                    await adminService.requestExerciseUploadUrl(
                        created.id,
                        mediaFile,
                    );
                await adminService.uploadToR2(
                    upload_url,
                    mediaFile,
                    setUploadProgress,
                );
                await adminService.confirmExerciseVideo(
                    created.id,
                    object_path,
                );
            } else if (uploadMode === 'youtube' && form.video_url) {
                await adminService
                    .setExerciseVideoUrl(created.id, form.video_url)
                    .catch(() => {
                        /* video_url já salvo no create */
                    });
            }
            closeModal();
            fetchExercises();
        } catch {
            setError('Erro ao criar exercício.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleUpdate = async () => {
        if (!editTarget || !form.name.trim()) return;
        setSubmitting(true);
        setError('');

        // Etapa 1: salvar metadados
        try {
            await adminService.updateExercise(editTarget.id, {
                name: form.name,
                muscle_group: form.muscle_group,
                category: form.category,
                description: form.description,
                tags: form.tags
                    ? form.tags.split(',').map((t) => t.trim())
                    : [],
            });
        } catch (err) {
            const msg = isAxiosError(err)
                ? (err.response?.data?.error ?? err.message)
                : 'Erro ao salvar os dados do exercício.';
            setError(msg);
            setSubmitting(false);
            return;
        }

        // Etapa 2: upload de mídia (independente dos metadados)
        if (uploadMode === 'upload' && mediaFile) {
            try {
                setUploadProgress(1);
                const { upload_url, object_path } =
                    await adminService.requestExerciseUploadUrl(
                        editTarget.id,
                        mediaFile,
                    );
                await adminService.uploadToR2(
                    upload_url,
                    mediaFile,
                    setUploadProgress,
                );
                await adminService.confirmExerciseVideo(
                    editTarget.id,
                    object_path,
                );
            } catch (err) {
                const msg = isAxiosError(err)
                    ? (err.response?.data?.error ?? err.message)
                    : String(err);
                setError(`Dados salvos! Erro no upload do arquivo: ${msg}`);
                setSubmitting(false);
                return;
            }
        } else if (uploadMode === 'youtube' && form.video_url) {
            try {
                await adminService.setExerciseVideoUrl(
                    editTarget.id,
                    form.video_url,
                );
            } catch (err) {
                const msg = isAxiosError(err)
                    ? (err.response?.data?.error ?? err.message)
                    : 'Erro ao salvar URL do vídeo.';
                setError(msg);
                setSubmitting(false);
                return;
            }
        }

        setSubmitting(false);
        closeModal();
        fetchExercises();
    };

    const handleDelete = async (id: string) => {
        try {
            await adminService.deleteExercise(id);
            fetchExercises();
        } catch {
            /* silent */
        }
    };

    return (
        <>
            <div className={s.sectionHeader}>
                <h1 className={s.sectionTitle}>🏋️ Biblioteca de Exercícios</h1>
                <button onClick={openCreate} className={s.btnPrimary}>
                    + Novo Exercício
                </button>
            </div>

            <div className={s.searchBar}>
                <input
                    className={s.searchInput}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar exercícios..."
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
                <button onClick={handleSearch} className={s.btnOutline}>
                    Buscar
                </button>
            </div>

            {loading ? (
                <p className={s.loading}>Carregando...</p>
            ) : exercises.length === 0 ? (
                <div className={s.empty}>
                    <div className={s.emptyIcon}>🏋️</div>
                    <h3 className={s.emptyTitle}>
                        Nenhum exercício encontrado
                    </h3>
                    <p className={s.emptyText}>
                        Adicione exercícios à biblioteca.
                    </p>
                </div>
            ) : (
                exercises.map((ex) => (
                    <div key={ex.id} className={s.card}>
                        <div className={s.cardHeader}>
                            <div
                                style={{
                                    display: 'flex',
                                    gap: 16,
                                    alignItems: 'center',
                                }}
                            >
                                {ex.video_thumb && (
                                    <Image
                                        src={
                                            ex.video_thumb.startsWith('http')
                                                ? ex.video_thumb
                                                : `${apiBase}${ex.video_thumb}`
                                        }
                                        alt={ex.name}
                                        className={s.exerciseThumb}
                                        width={80}
                                        height={60}
                                    />
                                )}
                                <div>
                                    <h3 className={s.cardTitle}>{ex.name}</h3>
                                    <p className={s.cardMeta}>
                                        {ex.muscle_group}
                                        {ex.category
                                            ? ` · ${ex.category}`
                                            : ''}
                                    </p>
                                </div>
                            </div>
                            <div className={s.btnGroup}>
                                <button
                                    onClick={() => openEdit(ex)}
                                    className={`${s.btnOutline} ${s.btnSmall}`}
                                >
                                    Editar
                                </button>
                                <button
                                    onClick={() => handleDelete(ex.id)}
                                    className={`${s.btnDanger} ${s.btnSmall}`}
                                >
                                    Excluir
                                </button>
                            </div>
                        </div>
                    </div>
                ))
            )}

            <Modal
                open={modalMode !== 'none'}
                onClose={closeModal}
                title={
                    modalMode === 'create'
                        ? 'Novo Exercício'
                        : 'Editar Exercício'
                }
                footer={
                    <>
                        <button
                            onClick={closeModal}
                            className={s.btnOutline}
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={
                                modalMode === 'create'
                                    ? handleCreate
                                    : handleUpdate
                            }
                            className={s.btnPrimary}
                            disabled={submitting}
                        >
                            {submitting
                                ? modalMode === 'create'
                                    ? 'Criando...'
                                    : 'Salvando...'
                                : modalMode === 'create'
                                  ? 'Criar'
                                  : 'Salvar'}
                        </button>
                    </>
                }
            >
                {error && <p className={s.errorMsg}>{error}</p>}
                <div className={s.formGroup}>
                    <label className={s.formLabel}>Nome</label>
                    <input
                        className={s.formInput}
                        value={form.name}
                        onChange={(e) =>
                            setForm({ ...form, name: e.target.value })
                        }
                        placeholder="Nome do exercício"
                    />
                </div>
                <div className={s.formGroup}>
                    <label className={s.formLabel}>
                        Grupo Muscular
                    </label>
                    <input
                        className={s.formInput}
                        value={form.muscle_group}
                        onChange={(e) =>
                            setForm({
                                ...form,
                                muscle_group: e.target.value,
                            })
                        }
                        placeholder="Ex: Peito, Costas, Pernas..."
                    />
                </div>
                <div className={s.formGroup}>
                    <label className={s.formLabel}>Categoria</label>
                    <input
                        className={s.formInput}
                        value={form.category}
                        onChange={(e) =>
                            setForm({
                                ...form,
                                category: e.target.value,
                            })
                        }
                        placeholder="Ex: Isolador, Composto..."
                    />
                </div>
                <div className={s.formGroup}>
                    <label className={s.formLabel}>Mídia</label>
                    <div className={s.btnGroup} style={{ marginBottom: 8 }}>
                        <button
                            type="button"
                            onClick={() => setUploadMode('youtube')}
                            className={
                                uploadMode === 'youtube'
                                    ? s.btnPrimary
                                    : s.btnOutline
                            }
                        >
                            🔗 Link (YouTube/Vimeo/TikTok/Instagram)
                        </button>
                        <button
                            type="button"
                            onClick={() => setUploadMode('upload')}
                            className={
                                uploadMode === 'upload'
                                    ? s.btnPrimary
                                    : s.btnOutline
                            }
                        >
                            ⬆️ Upload de arquivo
                        </button>
                    </div>
                    {uploadMode === 'youtube' ? (
                        <>
                            <input
                                className={s.formInput}
                                value={form.video_url}
                                onChange={(e) =>
                                    setForm({
                                        ...form,
                                        video_url: e.target.value,
                                    })
                                }
                                placeholder="https://youtube.com/watch?v=..."
                            />
                            <small className="text-muted d-block mt-1">
                                Links do Instagram abrem em uma nova
                                aba (não é possível embutir o
                                player).
                            </small>
                        </>
                    ) : (
                        <>
                            {mediaPreview &&
                                (mediaPreview
                                    .split('?')[0]
                                    .match(/\.(mp4|webm|mov|avi)$/i) ? (
                                    <video
                                        src={mediaPreview}
                                        controls
                                        className="w-100 mb-2"
                                        style={{
                                            maxHeight: 180,
                                            borderRadius: 6,
                                        }}
                                    />
                                ) : (
                                    <Image
                                        src={mediaPreview}
                                        alt="Preview"
                                        className={
                                            s.exerciseThumbPreview
                                        }
                                        width={120}
                                        height={90}
                                    />
                                ))}
                            <input
                                type="file"
                                accept={
                                    videoService.ACCEPTED_UPLOAD_EXTENSIONS
                                }
                                className={s.formInput}
                                onChange={handleMediaChange}
                                style={{ paddingTop: 8 }}
                            />
                            <small className="text-muted">
                                Máximo:{' '}
                                {videoService.MAX_UPLOAD_BYTES /
                                    1024 /
                                    1024}
                                MB. Até{' '}
                                {
                                    videoService.MAX_UPLOAD_DURATION_SECONDS
                                }
                                s de vídeo. Formatos: MP4, WebM, JPG,
                                PNG, WebP
                            </small>
                            {uploadProgress > 0 &&
                                uploadProgress < 100 && (
                                    <div className="progress mt-2">
                                        <div
                                            className="progress-bar progress-bar-striped progress-bar-animated"
                                            style={{
                                                width: `${uploadProgress}%`,
                                            }}
                                        >
                                            {uploadProgress}%
                                        </div>
                                    </div>
                                )}
                        </>
                    )}
                </div>
                <div className={s.formGroup}>
                    <label className={s.formLabel}>Descrição</label>
                    <textarea
                        className={s.formTextarea}
                        value={form.description}
                        onChange={(e) =>
                            setForm({
                                ...form,
                                description: e.target.value,
                            })
                        }
                    />
                </div>
                <div className={s.formGroup}>
                    <label className={s.formLabel}>
                        Tags (separadas por vírgula)
                    </label>
                    <input
                        className={s.formInput}
                        value={form.tags}
                        onChange={(e) =>
                            setForm({ ...form, tags: e.target.value })
                        }
                        placeholder="força, equilíbrio, cardio"
                    />
                </div>
            </Modal>
        </>
    );
}

/* ═══════════════════════════════════════════════
   NOTIFICATIONS SECTION
   ═══════════════════════════════════════════════ */
function NotificationsSection() {
    const [notifications, setNotifications] = useState<
        adminService.NotificationResponse[]
    >([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({
        title: '',
        message: '',
        type: 'info',
        user_id: '',
    });
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const fetchNotifications = useCallback(async () => {
        try {
            setNotifications(await adminService.getAdminNotifications());
        } catch {
            setNotifications([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchNotifications();
    }, [fetchNotifications]);

    const handleSend = async () => {
        if (!form.title.trim() || !form.message.trim()) return;
        setSubmitting(true);
        setError('');
        try {
            await adminService.sendNotification({
                title: form.title,
                message: form.message,
                type: form.type,
                user_id: form.user_id || undefined,
            });
            setShowForm(false);
            setForm({ title: '', message: '', type: 'info', user_id: '' });
            fetchNotifications();
        } catch {
            setError('Erro ao enviar notificação.');
        } finally {
            setSubmitting(false);
        }
    };

    const typeBadge = (t: string) => {
        switch (t) {
            case 'warning':
                return s.badgeWarning;
            case 'success':
                return s.badgeSuccess;
            default:
                return s.badgeInfo;
        }
    };

    return (
        <>
            <div className={s.sectionHeader}>
                <h1 className={s.sectionTitle}>🔔 Notificações</h1>
                <button
                    onClick={() => setShowForm(true)}
                    className={s.btnPrimary}
                >
                    + Enviar Notificação
                </button>
            </div>

            {loading ? (
                <p className={s.loading}>Carregando...</p>
            ) : notifications.length === 0 ? (
                <div className={s.empty}>
                    <div className={s.emptyIcon}>🔔</div>
                    <h3 className={s.emptyTitle}>Nenhuma notificação</h3>
                    <p className={s.emptyText}>
                        Envie notificações para usuários.
                    </p>
                </div>
            ) : (
                notifications.map((n) => (
                    <div key={n.id} className={s.card}>
                        <div className={s.cardHeader}>
                            <div>
                                <h3 className={s.cardTitle}>
                                    {n.title}{' '}
                                    <span className={typeBadge(n.type)}>
                                        {n.type}
                                    </span>
                                </h3>
                                <p className={s.cardMeta}>{n.message}</p>
                            </div>
                            <span
                                style={{
                                    fontSize: '0.78rem',
                                    color: '#8892b0',
                                }}
                            >
                                {new Date(n.created_at).toLocaleDateString(
                                    'pt-BR',
                                )}
                            </span>
                        </div>
                    </div>
                ))
            )}

            <Modal
                open={showForm}
                onClose={() => setShowForm(false)}
                title="Enviar Notificação"
                footer={
                    <>
                        <button
                            onClick={() => setShowForm(false)}
                            className={s.btnOutline}
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleSend}
                            className={s.btnPrimary}
                            disabled={submitting}
                        >
                            {submitting ? 'Enviando...' : 'Enviar'}
                        </button>
                    </>
                }
            >
                {error && <p className={s.errorMsg}>{error}</p>}
                <div className={s.formGroup}>
                    <label className={s.formLabel}>Título *</label>
                    <input
                        className={s.formInput}
                        value={form.title}
                        onChange={(e) =>
                            setForm({ ...form, title: e.target.value })
                        }
                    />
                </div>
                <div className={s.formGroup}>
                    <label className={s.formLabel}>Mensagem *</label>
                    <textarea
                        className={s.formTextarea}
                        value={form.message}
                        onChange={(e) =>
                            setForm({
                                ...form,
                                message: e.target.value,
                            })
                        }
                    />
                </div>
                <div className={s.formRow}>
                    <div className={s.formGroup}>
                        <label className={s.formLabel}>Tipo</label>
                        <select
                            className={s.formSelect}
                            value={form.type}
                            onChange={(e) =>
                                setForm({
                                    ...form,
                                    type: e.target.value,
                                })
                            }
                        >
                            <option value="info">Info</option>
                            <option value="warning">Aviso</option>
                            <option value="success">Sucesso</option>
                        </select>
                    </div>
                    <div className={s.formGroup}>
                        <label className={s.formLabel}>
                            User ID (vazio = broadcast)
                        </label>
                        <input
                            className={s.formInput}
                            value={form.user_id}
                            onChange={(e) =>
                                setForm({
                                    ...form,
                                    user_id: e.target.value,
                                })
                            }
                            placeholder="Deixe vazio para todos"
                        />
                    </div>
                </div>
            </Modal>
        </>
    );
}

/* ═══════════════════════════════════════════════
   LOGS SECTION
   ═══════════════════════════════════════════════ */
function LogsSection() {
    const [data, setData] = useState<adminService.PaginatedAuditLogs | null>(
        null,
    );
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);

    const fetchLogs = useCallback(async (p: number) => {
        setLoading(true);
        try {
            setData(await adminService.getAuditLogs(p));
        } catch {
            setData(null);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchLogs(page);
    }, [page, fetchLogs]);

    return (
        <>
            <div className={s.sectionHeader}>
                <h1 className={s.sectionTitle}>📝 Logs de Auditoria</h1>
            </div>

            {loading ? (
                <p className={s.loading}>Carregando...</p>
            ) : !data || data.logs.length === 0 ? (
                <div className={s.empty}>
                    <div className={s.emptyIcon}>📝</div>
                    <h3 className={s.emptyTitle}>Nenhum log registrado</h3>
                </div>
            ) : (
                <>
                    <table className={s.table}>
                        <thead>
                            <tr>
                                <th>Ação</th>
                                <th>Recurso</th>
                                <th>Usuário</th>
                                <th>Detalhes</th>
                                <th>Data</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.logs.map((l) => (
                                <tr key={l.id}>
                                    <td>
                                        <span className={s.badgeInfo}>
                                            {l.action}
                                        </span>
                                    </td>
                                    <td>{l.resource}</td>
                                    <td>{l.user_email}</td>
                                    <td
                                        style={{
                                            maxWidth: 300,
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap',
                                        }}
                                    >
                                        {l.details}
                                    </td>
                                    <td>
                                        {new Date(l.created_at).toLocaleString(
                                            'pt-BR',
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <div className={s.pagination}>
                        <button
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            className={s.btnOutline}
                            disabled={page <= 1}
                        >
                            ← Anterior
                        </button>
                        <span className={s.pageInfo}>
                            Página {data.page} de {data.total_pages}
                        </span>
                        <button
                            onClick={() => setPage((p) => p + 1)}
                            className={s.btnOutline}
                            disabled={page >= data.total_pages}
                        >
                            Próxima →
                        </button>
                    </div>
                </>
            )}
        </>
    );
}

/* ═══════════════════════════════════════════════
   USERS SECTION
   ═══════════════════════════════════════════════ */
function UsersSection({ currentUserId }: { currentUserId: string }) {
    const [users, setUsers] = useState<adminService.UserListItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [busyId, setBusyId] = useState<string | null>(null);
    const [error, setError] = useState('');

    const fetchUsers = useCallback(async () => {
        try {
            setUsers(await adminService.getUsers());
        } catch {
            setUsers([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const roleBadge = (role: string) => {
        switch (role) {
            case 'admin':
                return s.badgeDanger;
            case 'personal':
                return s.badgeInfo;
            case 'student':
                return s.badgeSuccess;
            default:
                return s.badgeWarning;
        }
    };

    const handleRoleChange = async (id: string, role: string) => {
        setError('');
        setBusyId(id);
        try {
            await adminService.updateUserRole(id, role);
            await fetchUsers();
        } catch (err) {
            const msg = isAxiosError(err)
                ? (err.response?.data?.error ?? err.message)
                : 'Erro ao alterar a role do usuário.';
            setError(msg);
        } finally {
            setBusyId(null);
        }
    };

    const handleToggleActive = async (id: string, active: boolean) => {
        setError('');
        setBusyId(id);
        try {
            await adminService.setUserActive(id, !active);
            await fetchUsers();
        } catch (err) {
            const msg = isAxiosError(err)
                ? (err.response?.data?.error ?? err.message)
                : 'Erro ao alterar o status do usuário.';
            setError(msg);
        } finally {
            setBusyId(null);
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (
            !confirm(
                `Excluir a conta de "${name}"? Os dados pessoais serão anonimizados (LGPD) e não podem ser recuperados.`,
            )
        )
            return;
        setError('');
        setBusyId(id);
        try {
            await adminService.deleteUser(id);
            await fetchUsers();
        } catch (err) {
            const msg = isAxiosError(err)
                ? (err.response?.data?.error ?? err.message)
                : 'Erro ao excluir usuário.';
            setError(msg);
        } finally {
            setBusyId(null);
        }
    };

    const filtered = users.filter((u) => {
        const q = search.trim().toLowerCase();
        if (!q) return true;
        return (
            u.name.toLowerCase().includes(q) ||
            u.email.toLowerCase().includes(q)
        );
    });

    return (
        <>
            <div className={s.sectionHeader}>
                <h1 className={s.sectionTitle}>👥 Usuários</h1>
            </div>

            <div className={s.searchBar}>
                <input
                    className={s.searchInput}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar por nome ou email..."
                />
            </div>

            {error && <p className={s.errorMsg}>{error}</p>}

            {loading ? (
                <p className={s.loading}>Carregando...</p>
            ) : filtered.length === 0 ? (
                <div className={s.empty}>
                    <div className={s.emptyIcon}>👥</div>
                    <h3 className={s.emptyTitle}>Nenhum usuário encontrado</h3>
                </div>
            ) : (
                <table className={s.table}>
                    <thead>
                        <tr>
                            <th>Nome</th>
                            <th>Email</th>
                            <th>Role</th>
                            <th>Status</th>
                            <th>Criado em</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map((u) => {
                            const isSelf = u.id === currentUserId;
                            const isBusy = busyId === u.id;
                            return (
                                <tr key={u.id}>
                                    <td>{u.name}</td>
                                    <td>{u.email}</td>
                                    <td>
                                        <span className={roleBadge(u.role)}>
                                            {u.role}
                                        </span>
                                    </td>
                                    <td>
                                        {u.active ? (
                                            <span className={s.badgeSuccess}>
                                                Ativo
                                            </span>
                                        ) : (
                                            <span className={s.badgeDanger}>
                                                Inativo
                                            </span>
                                        )}
                                    </td>
                                    <td>
                                        {new Date(
                                            u.created_at,
                                        ).toLocaleDateString('pt-BR')}
                                    </td>
                                    <td>
                                        <div
                                            className={s.btnGroup}
                                            style={{ flexWrap: 'wrap' }}
                                        >
                                            <select
                                                className={s.formSelect}
                                                value={u.role}
                                                disabled={isSelf || isBusy}
                                                title={
                                                    isSelf
                                                        ? 'Não é possível alterar sua própria role'
                                                        : 'Alterar role'
                                                }
                                                onChange={(e) =>
                                                    handleRoleChange(
                                                        u.id,
                                                        e.target.value,
                                                    )
                                                }
                                                style={{
                                                    padding: '4px 8px',
                                                    fontSize: '0.8rem',
                                                }}
                                            >
                                                <option value="student">
                                                    student
                                                </option>
                                                <option value="personal">
                                                    personal
                                                </option>
                                                <option value="content_editor">
                                                    content_editor
                                                </option>
                                                <option value="admin">
                                                    admin
                                                </option>
                                            </select>
                                            <button
                                                onClick={() =>
                                                    handleToggleActive(
                                                        u.id,
                                                        u.active,
                                                    )
                                                }
                                                disabled={
                                                    (isSelf && u.active) ||
                                                    isBusy
                                                }
                                                className={`${s.btnOutline} ${s.btnSmall}`}
                                                title={
                                                    isSelf && u.active
                                                        ? 'Não é possível desativar sua própria conta'
                                                        : undefined
                                                }
                                            >
                                                {u.active
                                                    ? 'Desativar'
                                                    : 'Ativar'}
                                            </button>
                                            <button
                                                onClick={() =>
                                                    handleDelete(u.id, u.name)
                                                }
                                                disabled={isSelf || isBusy}
                                                className={`${s.btnDanger} ${s.btnSmall}`}
                                                title={
                                                    isSelf
                                                        ? 'Não é possível excluir sua própria conta'
                                                        : undefined
                                                }
                                            >
                                                Excluir
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            )}
        </>
    );
}
/* ═══════════════════════════════════════════════
   RELATORIOS BI SECTION
   ═══════════════════════════════════════════════ */
function RelatoriosSection() {
    const [summary, setSummary] =
        useState<adminService.PlatformEventLogSummary | null>(null);
    const [events, setEvents] = useState<adminService.PlatformEventLog[]>([]);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [loading, setLoading] = useState(true);
    const [loadingTable, setLoadingTable] = useState(false);
    const [error, setError] = useState('');

    const today = new Date();
    const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const [from, setFrom] = useState(firstOfMonth.toISOString().slice(0, 10));
    const [to, setTo] = useState(today.toISOString().slice(0, 10));
    const [typeFilter, setTypeFilter] = useState('');
    const [personalFilter, setPersonalFilter] = useState('');
    const [personals, setPersonals] = useState<adminService.UserListItem[]>(
        [],
    );
    const [page, setPage] = useState(1);
    const pageSize = 15;

    useEffect(() => {
        adminService
            .getUsers()
            .then((all) => setPersonals(all.filter((u) => u.role === 'personal')))
            .catch(() => setPersonals([]));
    }, []);

    const fetchSummary = useCallback(
        async (f: string, t: string, personalId: string) => {
            try {
                const data = await adminService.getSubscriptionSummary({
                    from: f,
                    to: t,
                    personal_id: personalId || undefined,
                });
                setSummary(data);
            } catch {
                setError('Erro ao carregar resumo.');
            }
        },
        [],
    );

    const fetchEvents = useCallback(
        async (
            f: string,
            t: string,
            type: string,
            personalId: string,
            pg: number,
        ) => {
            setLoadingTable(true);
            try {
                const res = await adminService.getSubscriptionEvents({
                    from: f,
                    to: t,
                    type: type || undefined,
                    personal_id: personalId || undefined,
                    page: pg,
                    page_size: pageSize,
                });
                setEvents(res.data ?? []);
                setTotal(res.total);
                setTotalPages(res.total_pages);
            } catch {
                setError('Erro ao carregar eventos.');
            } finally {
                setLoadingTable(false);
            }
        },
        [],
    );

    const load = useCallback(() => {
        setLoading(true);
        setError('');
        Promise.all([
            fetchSummary(from, to, personalFilter),
            fetchEvents(from, to, typeFilter, personalFilter, page),
        ]).finally(() => setLoading(false));
    }, [
        from,
        to,
        typeFilter,
        personalFilter,
        page,
        fetchSummary,
        fetchEvents,
    ]);

    useEffect(() => {
        load();
    }, [load]);

    const applyFilters = () => {
        setPage(1);
        load();
    };

    const kpis = summary
        ? [
              {
                  label: 'Assinaturas',
                  value: summary.total_subscriptions,
                  color: '#0d6efd',
              },
              {
                  label: 'Cancelamentos',
                  value: summary.total_cancellations,
                  color: '#dc3545',
              },
              {
                  label: 'Crescimento Líquido',
                  value: summary.net_growth,
                  color: summary.net_growth >= 0 ? '#198754' : '#dc3545',
              },
              {
                  label: 'Churn Rate',
                  value: `${summary.churn_rate.toFixed(1)}%`,
                  color: '#fd7e14',
              },
          ]
        : [];

    return (
        <>
            <div className={s.sectionHeader}>
                <h1 className={s.sectionTitle}>
                    📈 Relatórios BI — Assinaturas
                </h1>
            </div>

            {/* Filtros */}
            <div className="d-flex flex-wrap align-items-end gap-3 mb-4">
                <div>
                    <label
                        className="form-label fw-semibold"
                        style={{ fontSize: '0.82rem', color: '#8892b0' }}
                    >
                        De
                    </label>
                    <input
                        type="date"
                        className="form-control form-control-sm"
                        style={{
                            background: '#1a2035',
                            color: '#ccd6f6',
                            border: '1px solid #2d3a5e',
                        }}
                        value={from}
                        onChange={(e) => setFrom(e.target.value)}
                    />
                </div>
                <div>
                    <label
                        className="form-label fw-semibold"
                        style={{ fontSize: '0.82rem', color: '#8892b0' }}
                    >
                        Até
                    </label>
                    <input
                        type="date"
                        className="form-control form-control-sm"
                        style={{
                            background: '#1a2035',
                            color: '#ccd6f6',
                            border: '1px solid #2d3a5e',
                        }}
                        value={to}
                        onChange={(e) => setTo(e.target.value)}
                    />
                </div>
                <div>
                    <label
                        className="form-label fw-semibold"
                        style={{ fontSize: '0.82rem', color: '#8892b0' }}
                    >
                        Tipo
                    </label>
                    <select
                        className="form-select form-select-sm"
                        style={{
                            background: '#1a2035',
                            color: '#ccd6f6',
                            border: '1px solid #2d3a5e',
                        }}
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                    >
                        <option value="">Todos</option>
                        <option value="subscription">Assinaturas</option>
                        <option value="cancellation">Cancelamentos</option>
                    </select>
                </div>
                <div>
                    <label
                        className="form-label fw-semibold"
                        style={{ fontSize: '0.82rem', color: '#8892b0' }}
                    >
                        Personal Trainer
                    </label>
                    <select
                        className="form-select form-select-sm"
                        style={{
                            background: '#1a2035',
                            color: '#ccd6f6',
                            border: '1px solid #2d3a5e',
                            minWidth: 180,
                        }}
                        value={personalFilter}
                        onChange={(e) => setPersonalFilter(e.target.value)}
                    >
                        <option value="">Todos os personals</option>
                        {personals.map((p) => (
                            <option key={p.id} value={p.id}>
                                {p.name}
                            </option>
                        ))}
                    </select>
                </div>
                <button onClick={applyFilters} className={s.btnPrimary}>
                    Aplicar
                </button>
            </div>

            {error && <div className="alert alert-danger py-2">{error}</div>}

            {loading ? (
                <div className="text-center py-4">
                    <div
                        className="spinner-border"
                        style={{ color: '#64ffda' }}
                    />
                </div>
            ) : (
                <>
                    {/* KPI Cards */}
                    <div className={s.statsGrid} style={{ marginBottom: 32 }}>
                        {kpis.map((k) => (
                            <div key={k.label} className={s.statCard}>
                                <p
                                    className={s.statValue}
                                    style={{ color: k.color, fontSize: '2rem' }}
                                >
                                    {k.value}
                                </p>
                                <p className={s.statLabel}>{k.label}</p>
                            </div>
                        ))}
                    </div>

                    {/* Gráfico de barras */}
                    {summary &&
                        summary.daily_counts &&
                        summary.daily_counts.length > 0 && (
                            <div
                                className={s.card}
                                style={{ marginBottom: 32, padding: 24 }}
                            >
                                <h2
                                    style={{
                                        fontSize: '1rem',
                                        color: '#ccd6f6',
                                        marginBottom: 16,
                                    }}
                                >
                                    Evolução Diária
                                </h2>
                                <ResponsiveContainer width="100%" height={260}>
                                    <BarChart
                                        data={summary.daily_counts}
                                        margin={{
                                            top: 4,
                                            right: 16,
                                            left: 0,
                                            bottom: 4,
                                        }}
                                    >
                                        <CartesianGrid
                                            strokeDasharray="3 3"
                                            stroke="#2d3a5e"
                                        />
                                        <XAxis
                                            dataKey="date"
                                            tick={{
                                                fill: '#8892b0',
                                                fontSize: 11,
                                            }}
                                            tickFormatter={(d) => d.slice(5)}
                                        />
                                        <YAxis
                                            tick={{
                                                fill: '#8892b0',
                                                fontSize: 11,
                                            }}
                                            allowDecimals={false}
                                        />
                                        <Tooltip
                                            contentStyle={{
                                                background: '#1a2035',
                                                border: '1px solid #2d3a5e',
                                                borderRadius: 8,
                                            }}
                                            labelStyle={{ color: '#ccd6f6' }}
                                            itemStyle={{ color: '#ccd6f6' }}
                                        />
                                        <Legend
                                            wrapperStyle={{
                                                color: '#8892b0',
                                                fontSize: 12,
                                            }}
                                        />
                                        <Bar
                                            dataKey="subscriptions"
                                            name="Assinaturas"
                                            fill="#0d6efd"
                                            radius={[4, 4, 0, 0]}
                                        />
                                        <Bar
                                            dataKey="cancellations"
                                            name="Cancelamentos"
                                            fill="#dc3545"
                                            radius={[4, 4, 0, 0]}
                                        />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        )}

                    {/* Tabela de eventos */}
                    <h2
                        style={{
                            fontSize: '1rem',
                            color: '#ccd6f6',
                            marginBottom: 12,
                        }}
                    >
                        Eventos ({total} no total)
                    </h2>
                    {loadingTable ? (
                        <div className="text-center py-3">
                            <div
                                className="spinner-border spinner-border-sm"
                                style={{ color: '#64ffda' }}
                            />
                        </div>
                    ) : events.length === 0 ? (
                        <div className={s.empty}>
                            <div className={s.emptyIcon}>📋</div>
                            <h3 className={s.emptyTitle}>
                                Nenhum evento no período
                            </h3>
                            <p className={s.emptyText}>
                                Altere os filtros de data.
                            </p>
                        </div>
                    ) : (
                        <>
                            <table className={s.table}>
                                <thead>
                                    <tr>
                                        <th>Tipo</th>
                                        <th>Nome</th>
                                        <th>Email</th>
                                        <th>Pagamento</th>
                                        <th>Data</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {events.map((ev) => (
                                        <tr key={ev.id}>
                                            <td>
                                                <span
                                                    className={
                                                        ev.event_type ===
                                                        'subscription'
                                                            ? s.badgeSuccess
                                                            : s.badgeDanger
                                                    }
                                                >
                                                    {ev.event_type ===
                                                    'subscription'
                                                        ? 'Assinatura'
                                                        : 'Cancelamento'}
                                                </span>
                                            </td>
                                            <td>{ev.user_name}</td>
                                            <td>{ev.user_email}</td>
                                            <td>{ev.payment_method || '—'}</td>
                                            <td>
                                                {new Date(
                                                    ev.created_at,
                                                ).toLocaleDateString('pt-BR')}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            {/* Paginação */}
                            {totalPages > 1 && (
                                <div className="d-flex justify-content-center align-items-center gap-2 mt-3">
                                    <button
                                        className={s.btnOutline}
                                        disabled={page <= 1}
                                        onClick={() => setPage((p) => p - 1)}
                                    >
                                        ← Anterior
                                    </button>
                                    <span
                                        style={{
                                            color: '#8892b0',
                                            fontSize: '0.85rem',
                                        }}
                                    >
                                        {page} / {totalPages}
                                    </span>
                                    <button
                                        className={s.btnOutline}
                                        disabled={page >= totalPages}
                                        onClick={() => setPage((p) => p + 1)}
                                    >
                                        Próxima →
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </>
            )}
        </>
    );
}

/* ═══════════════════════════════════════════════
   DIAGNÓSTICO — busca e correção manual de
   inconsistências (vínculos, cadastros, assinaturas)
   ═══════════════════════════════════════════════ */
function DiagnosticsSection() {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<adminService.DiagnosticsUserItem[]>(
        [],
    );
    const [searching, setSearching] = useState(false);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [detail, setDetail] = useState<adminService.UserDiagnostics | null>(
        null,
    );
    const [detailLoading, setDetailLoading] = useState(false);
    const [error, setError] = useState('');
    const [actionBusy, setActionBusy] = useState(false);
    const [relinkPersonalId, setRelinkPersonalId] = useState('');
    const [subStatus, setSubStatus] = useState('');

    const handleSearch = async () => {
        if (!query.trim()) return;
        setSearching(true);
        setError('');
        try {
            const data = await adminService.searchDiagnosticsUsers(
                query.trim(),
            );
            setResults(data);
        } catch {
            setError('Erro ao buscar usuários.');
        } finally {
            setSearching(false);
        }
    };

    const loadDetail = useCallback(async (id: string) => {
        setSelectedId(id);
        setDetailLoading(true);
        setError('');
        setRelinkPersonalId('');
        try {
            const data = await adminService.getUserDiagnostics(id);
            setDetail(data);
            setSubStatus(data.subscription?.status ?? '');
        } catch {
            setError('Erro ao carregar diagnóstico do usuário.');
            setDetail(null);
        } finally {
            setDetailLoading(false);
        }
    }, []);

    const withBusy = async (action: () => Promise<void>) => {
        setActionBusy(true);
        setError('');
        try {
            await action();
            if (selectedId) await loadDetail(selectedId);
        } catch {
            setError('Erro ao executar ação. Tente novamente.');
        } finally {
            setActionBusy(false);
        }
    };

    const handleRelink = () => {
        if (!selectedId || !relinkPersonalId.trim()) return;
        withBusy(() =>
            adminService.relinkStudent(selectedId, relinkPersonalId.trim()),
        );
    };

    const handleUnlink = () => {
        if (!selectedId) return;
        withBusy(() => adminService.unlinkStudentDiagnostics(selectedId));
    };

    const handleDeleteProfile = (profileId: string) => {
        withBusy(() => adminService.deleteStudentProfile(profileId));
    };

    const handleResync = () => {
        if (!selectedId) return;
        withBusy(async () => {
            await adminService.resyncSubscription(selectedId);
        });
    };

    const handleUpdateSubStatus = () => {
        if (!detail?.subscription || !subStatus) return;
        withBusy(() =>
            adminService.updateSubscriptionStatus(
                detail.subscription!.id,
                subStatus,
            ),
        );
    };

    return (
        <>
            <div className={s.sectionHeader}>
                <h1 className={s.sectionTitle}>
                    🩺 Diagnóstico de Usuários
                </h1>
            </div>

            <div className={s.searchBar}>
                <input
                    className={s.searchInput}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Buscar por nome, email ou CPF..."
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
                <button
                    onClick={handleSearch}
                    className={s.btnOutline}
                    disabled={searching}
                >
                    {searching ? 'Buscando...' : 'Buscar'}
                </button>
            </div>

            {error && <p className={s.errorMsg}>{error}</p>}

            {results.length > 0 && (
                <div style={{ marginBottom: 24 }}>
                    {results.map((u) => (
                        <div
                            key={u.id}
                            className={s.card}
                            onClick={() => loadDetail(u.id)}
                            style={{
                                cursor: 'pointer',
                                borderColor:
                                    selectedId === u.id
                                        ? 'var(--amber, #f0a500)'
                                        : undefined,
                            }}
                        >
                            <div className={s.cardHeader}>
                                <div>
                                    <h3 className={s.cardTitle}>
                                        {u.name}{' '}
                                        <span className={s.badgeInfo}>
                                            {u.role}
                                        </span>
                                        {!u.active && (
                                            <span className={s.badgeDanger}>
                                                inativo
                                            </span>
                                        )}
                                    </h3>
                                    <p className={s.cardMeta}>
                                        {u.email} · {u.cpf || 'sem CPF'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {detailLoading && <p className={s.loading}>Carregando...</p>}

            {detail && !detailLoading && (
                <div className={s.card} style={{ display: 'block' }}>
                    <h3 className={s.cardTitle} style={{ marginBottom: 12 }}>
                        Conta
                    </h3>
                    <p className={s.cardMeta}>
                        {detail.user.name} ({detail.user.role}) ·{' '}
                        {detail.user.email}
                        <br />
                        CPF: {detail.user.cpf || '—'} · Tel:{' '}
                        {detail.phone || '—'} · Cel:{' '}
                        {detail.mobile_phone || '—'}
                        <br />
                        Plano: {detail.user.plan_type || '—'} · Status:{' '}
                        {detail.user.active ? 'Ativo' : 'Inativo'} · Criado
                        em {detail.created_at}
                    </p>

                    {detail.user.role === 'student' && (
                        <>
                            <h3
                                className={s.cardTitle}
                                style={{ marginTop: 20, marginBottom: 12 }}
                            >
                                Vínculos
                                {(detail.profiles?.length ?? 0) > 1 && (
                                    <span
                                        className={s.badgeWarning}
                                        style={{ marginLeft: 8 }}
                                    >
                                        {detail.profiles?.length} perfis —
                                        possível duplicata
                                    </span>
                                )}
                            </h3>
                            {(detail.profiles ?? []).map((p) => (
                                <div
                                    key={p.id}
                                    className={s.cardMeta}
                                    style={{
                                        marginBottom: 8,
                                        paddingBottom: 8,
                                        borderBottom:
                                            '1px solid var(--border-mid, #333)',
                                    }}
                                >
                                    Perfil {p.id.slice(-6)} · status:{' '}
                                    <strong>{p.link_status}</strong> · personal:{' '}
                                    {p.personal_name
                                        ? `${p.personal_name} (${p.personal_email})`
                                        : 'nenhum'}
                                    <br />
                                    <button
                                        className={`${s.btnDanger} ${s.btnSmall}`}
                                        style={{ marginTop: 4 }}
                                        disabled={actionBusy}
                                        onClick={() =>
                                            handleDeleteProfile(p.id)
                                        }
                                    >
                                        Remover este perfil
                                    </button>
                                </div>
                            ))}

                            <div className={s.formGroup}>
                                <label className={s.formLabel}>
                                    Vincular a outro personal (ID)
                                </label>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <input
                                        className={s.formInput}
                                        value={relinkPersonalId}
                                        onChange={(e) =>
                                            setRelinkPersonalId(
                                                e.target.value,
                                            )
                                        }
                                        placeholder="ID do personal"
                                    />
                                    <button
                                        className={s.btnPrimary}
                                        disabled={
                                            actionBusy ||
                                            !relinkPersonalId.trim()
                                        }
                                        onClick={handleRelink}
                                    >
                                        Vincular
                                    </button>
                                    <button
                                        className={s.btnOutline}
                                        disabled={actionBusy}
                                        onClick={handleUnlink}
                                    >
                                        Desvincular
                                    </button>
                                </div>
                            </div>
                        </>
                    )}

                    {detail.user.role === 'personal' && (
                        <>
                            <h3
                                className={s.cardTitle}
                                style={{ marginTop: 20, marginBottom: 12 }}
                            >
                                Alunos vinculados ({detail.roster_count ?? 0})
                            </h3>
                            {(detail.roster ?? []).map((st) => (
                                <p key={st.id} className={s.cardMeta}>
                                    {st.name} — {st.email}
                                </p>
                            ))}
                        </>
                    )}

                    <h3
                        className={s.cardTitle}
                        style={{ marginTop: 20, marginBottom: 12 }}
                    >
                        Assinatura
                    </h3>
                    {detail.subscription ? (
                        <>
                            <p className={s.cardMeta}>
                                Status: {detail.subscription.status} · R$
                                {detail.subscription.value} /{' '}
                                {detail.subscription.cycle} ·{' '}
                                {detail.subscription.billing_type}
                            </p>
                            <div
                                style={{
                                    display: 'flex',
                                    gap: 8,
                                    alignItems: 'center',
                                }}
                            >
                                <select
                                    className={s.formSelect}
                                    value={subStatus}
                                    onChange={(e) =>
                                        setSubStatus(e.target.value)
                                    }
                                    style={{ width: 'auto' }}
                                >
                                    {[
                                        'UNKNOWN',
                                        'PENDING',
                                        'ACTIVE',
                                        'CANCELED',
                                        'EXPIRED',
                                        'SUSPENDED',
                                    ].map((st) => (
                                        <option key={st} value={st}>
                                            {st}
                                        </option>
                                    ))}
                                </select>
                                <button
                                    className={s.btnOutline}
                                    disabled={actionBusy}
                                    onClick={handleUpdateSubStatus}
                                >
                                    Salvar status
                                </button>
                            </div>
                        </>
                    ) : (
                        <p className={s.cardMeta}>
                            Nenhuma assinatura encontrada localmente.
                        </p>
                    )}
                    <button
                        className={s.btnOutline}
                        style={{ marginTop: 8 }}
                        disabled={actionBusy}
                        onClick={handleResync}
                    >
                        {actionBusy ? 'Aguarde...' : 'Resincronizar com Asaas'}
                    </button>
                </div>
            )}
        </>
    );
}
