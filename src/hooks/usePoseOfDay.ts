'use client';

import { useEffect, useState } from 'react';
import {
    getPoseOfDay,
    type PoseOfDay,
} from '@/libs/studentChallengeAntiFraudService';
import { listMyStudentChallenges } from '@/libs/studentChallengeService';

export interface ActivePose {
    challengeId: string;
    challengeName: string;
    pose: PoseOfDay;
}

/**
 * Descobre se o aluno precisa fazer alguma pose hoje e qual é.
 *
 * O hook busca por conta própria em vez de receber por prop porque o
 * check-in nasce dentro do fluxo de treino, que não sabe nada de desafio — e
 * fazer o desafio descer por prop atravessaria três telas sem ganho nenhum.
 *
 * Falha é SILENCIOSA e devolve "sem pose": sem rede, com o antifraude
 * desligado no servidor ou fora de qualquer desafio, o check-in precisa seguir
 * exatamente como antes. É o caso legítimo do registro offline, que o servidor
 * grava como "sem prova" e o personal confere depois.
 */
export function usePoseOfDay(enabled = true): {
    pose: ActivePose | null;
    loading: boolean;
} {
    const [pose, setPose] = useState<ActivePose | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!enabled) return;
        let cancelled = false;

        (async () => {
            setLoading(true);
            try {
                const challenges = await listMyStudentChallenges();
                const target = challenges.find(
                    (c) => c.status === 'active' && c.pose_required,
                );
                if (!target) return;

                const drawn = await getPoseOfDay(target.id);
                if (!cancelled) {
                    setPose({
                        challengeId: target.id,
                        challengeName: target.name,
                        pose: drawn,
                    });
                }
            } catch {
                // Sem pose hoje. Nunca bloqueia o check-in.
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [enabled]);

    return { pose, loading };
}
