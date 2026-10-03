'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { FiLock } from 'react-icons/fi';
import { getMyLockedPlans, type LockedPlan } from '@/libs/planningService';
import s from './meusTreinos.module.css';

function formatBRL(value: number): string {
    return value.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    });
}

/**
 * Oferta para manter o plano que o personal montou e que ficou bloqueado
 * quando o aluno foi desvinculado no fim da espera do plano gratuito do
 * personal (2026-10-03). Mesmo produto e preço do plano avulso; a compra
 * passa pela tela de pagamento com `produto=plano&planId=`.
 *
 * Sem rede ou sem plano bloqueado, não mostra nada.
 */
export default function LockedPlansOffer() {
    const [plans, setPlans] = useState<LockedPlan[]>([]);

    useEffect(() => {
        getMyLockedPlans()
            .then(setPlans)
            .catch(() => {});
    }, []);

    if (plans.length === 0) return null;

    return (
        <>
            {plans.map((plan) => (
                <section
                    key={plan.id}
                    className={s.lockedOffer}
                    aria-label={`Plano bloqueado: ${plan.name}`}
                >
                    <span className={`${s.iconTile} ${s.iconTileAmber}`}>
                        <FiLock size={20} aria-hidden="true" />
                    </span>
                    <div className={s.lockedOfferText}>
                        <p className={s.overflowTitle}>
                            {plan.name || 'Plano do seu personal'} está
                            bloqueado
                        </p>
                        <p className={s.overflowText}>
                            O vínculo com o seu personal foi encerrado e o
                            treino montado por ele ficou bloqueado. Você pode
                            mantê-lo, com tudo o que já registrou, até{' '}
                            {new Date(plan.purge_at).toLocaleDateString(
                                'pt-BR',
                            )}
                            . Depois disso ele é apagado.
                        </p>
                    </div>
                    <Link
                        href={`/pagamento?produto=plano&planId=${plan.id}`}
                        className={s.storeCta}
                    >
                        Manter este plano por {formatBRL(plan.value)}
                    </Link>
                </section>
            ))}
        </>
    );
}
