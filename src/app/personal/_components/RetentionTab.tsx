'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    getRetentionOverview,
    type RetentionOverview,
    type RetentionStudent,
} from '@/libs/retentionService';
import { sendStudentReminder } from '@/libs/reminderService';
import s from './RetentionTab.module.css';

function daysLabel(st: RetentionStudent) {
    if (st.days_since_last < 0) return 'Nunca treinou';
    if (st.days_since_last === 0) return 'Treinou hoje';
    if (st.days_since_last === 1) return 'Há 1 dia';
    return `Há ${st.days_since_last} dias`;
}

export default function RetentionTab() {
    const router = useRouter();
    const [data, setData] = useState<RetentionOverview | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [remindingId, setRemindingId] = useState<string | null>(null);

    async function remind(studentId: string) {
        setRemindingId(studentId);
        try {
            await sendStudentReminder(studentId, 'workout');
            alert('Lembrete enviado! 💪');
        } catch {
            alert('Não foi possível enviar o lembrete agora.');
        } finally {
            setRemindingId(null);
        }
    }

    useEffect(() => {
        let alive = true;
        (async () => {
            try {
                const o = await getRetentionOverview();
                if (alive) setData(o);
            } catch {
                if (alive) setError('Não foi possível carregar o painel.');
            } finally {
                if (alive) setLoading(false);
            }
        })();
        return () => {
            alive = false;
        };
    }, []);

    if (loading) return <div className={s.loading}>Carregando…</div>;
    if (error) return <div className={s.empty}>{error}</div>;
    if (!data) return null;

    const atRisk = data.students.filter((st) => st.at_risk);
    const engagement =
        data.active_link > 0
            ? Math.round((data.training_now / data.active_link) * 100)
            : 0;

    return (
        <div className={s.wrap}>
            <div className={s.tiles}>
                <div className={s.tile}>
                    <div className={`${s.tileValue} ${s.accentActive}`}>
                        {data.active_link}
                    </div>
                    <div className={s.tileLabel}>Alunos ativos</div>
                </div>
                <div className={s.tile}>
                    <div className={s.tileValue}>{engagement}%</div>
                    <div className={s.tileLabel}>
                        Treinaram nos últimos 7 dias
                    </div>
                </div>
                <div className={s.tile}>
                    <div className={`${s.tileValue} ${s.accentRisk}`}>
                        {data.at_risk + data.never_trained}
                    </div>
                    <div className={s.tileLabel}>
                        Em risco (parados +{data.risk_days}d)
                    </div>
                </div>
                <div className={s.tile}>
                    <div className={s.tileValue}>{data.inactive_link}</div>
                    <div className={s.tileLabel}>Inativos / desvinculados</div>
                </div>
            </div>

            <h2 className={s.sectionTitle}>
                Alunos em risco de abandono ({atRisk.length})
            </h2>

            {atRisk.length === 0 ? (
                <div className={s.empty}>
                    🎉 Nenhum aluno ativo está parado há mais de{' '}
                    {data.risk_days} dias. Bom trabalho!
                </div>
            ) : (
                <div className={s.list}>
                    {atRisk.map((st) => (
                        <div
                            className={`${s.row} ${s.rowRisk}`}
                            key={st.id}
                        >
                            <div className={s.rowInfo}>
                                <div className={s.rowName}>{st.name}</div>
                                <div className={s.rowMeta}>
                                    {daysLabel(st)} · {st.workouts_last_30}{' '}
                                    treino(s) em 30 dias
                                </div>
                            </div>
                            <div className={s.actions}>
                                <span
                                    className={`${s.badge} ${
                                        st.days_since_last < 0
                                            ? s.badgeNever
                                            : s.badgeRisk
                                    }`}
                                >
                                    {st.days_since_last < 0
                                        ? 'Nunca treinou'
                                        : 'Em risco'}
                                </span>
                                <button
                                    className={s.btn}
                                    onClick={() => remind(st.id)}
                                    disabled={remindingId === st.id}
                                >
                                    {remindingId === st.id
                                        ? 'Enviando…'
                                        : '🔔 Lembrete'}
                                </button>
                                <button
                                    className={s.btn}
                                    onClick={() =>
                                        router.push(
                                            `/personal/aluno/${st.id}/treino`,
                                        )
                                    }
                                >
                                    Ver treino
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <h2 className={s.sectionTitle}>Todos os alunos</h2>
            <div className={s.list}>
                {data.students.map((st) => (
                    <div className={s.row} key={`all-${st.id}`}>
                        <div className={s.rowInfo}>
                            <div className={s.rowName}>{st.name}</div>
                            <div className={s.rowMeta}>
                                {daysLabel(st)} · {st.workouts_last_7} em 7d ·{' '}
                                {st.workouts_last_30} em 30d
                            </div>
                        </div>
                        <span
                            className={`${s.badge} ${
                                st.link_status === 'active'
                                    ? s.badgeOk
                                    : s.badgeNever
                            }`}
                        >
                            {st.link_status === 'active'
                                ? 'Ativo'
                                : st.link_status === 'pending'
                                  ? 'Pendente'
                                  : 'Inativo'}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}
