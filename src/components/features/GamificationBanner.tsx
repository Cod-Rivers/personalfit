'use client';
import { useEffect, useState } from 'react';
import {
    getGamification,
    type Gamification,
} from '@/libs/gamificationService';
import s from './GamificationBanner.module.css';

export default function GamificationBanner() {
    const [data, setData] = useState<Gamification | null>(null);

    useEffect(() => {
        let alive = true;
        (async () => {
            try {
                const g = await getGamification();
                if (alive) setData(g);
            } catch {
                /* silencioso: banner some se não carregar */
            }
        })();
        return () => {
            alive = false;
        };
    }, []);

    // Não mostra nada até o aluno ter pelo menos 1 treino.
    if (!data || data.total_workouts === 0) return null;

    const unlocked = data.achievements.filter((a) => a.unlocked);
    const nextLocked = data.achievements.find((a) => !a.unlocked);

    return (
        <div className={s.banner}>
            <div className={s.top}>
                <div className={s.streak}>
                    <span className={s.streakNum}>
                        🔥 {data.current_streak_weeks}
                    </span>
                    <span className={s.streakLabel}>
                        {data.current_streak_weeks === 1
                            ? 'semana seguida'
                            : 'semanas seguidas'}
                    </span>
                </div>
                <div className={s.metrics}>
                    <div className={s.metric}>
                        <div className={s.metricNum}>
                            {data.workouts_this_week}
                        </div>
                        <div className={s.metricLabel}>esta semana</div>
                    </div>
                    <div className={s.metric}>
                        <div className={s.metricNum}>{data.total_workouts}</div>
                        <div className={s.metricLabel}>treinos no total</div>
                    </div>
                    <div className={s.metric}>
                        <div className={s.metricNum}>
                            {data.longest_streak_weeks}
                        </div>
                        <div className={s.metricLabel}>recorde (semanas)</div>
                    </div>
                </div>
            </div>

            {unlocked.length > 0 && (
                <>
                    <p className={s.title}>Conquistas</p>
                    <div className={s.achievements}>
                        {unlocked.map((a) => (
                            <span
                                className={s.chip}
                                key={a.code}
                                title={a.description}
                            >
                                🏅 {a.title}
                            </span>
                        ))}
                        {nextLocked && (
                            <span
                                className={`${s.chip} ${s.chipLocked}`}
                                title={nextLocked.description}
                            >
                                🔒 {nextLocked.title}
                            </span>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
