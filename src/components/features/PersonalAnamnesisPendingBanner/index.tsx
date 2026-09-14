'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FiChevronRight, FiClipboard } from 'react-icons/fi';
import {
    getMyPendingPersonalAnamnesis,
    type MyPendingPersonalAnamnesis,
} from '@/libs/personalAnamnesisService';
import s from './PersonalAnamnesisPendingBanner.module.css';

/**
 * Aviso de Anamnese do personal pendente na tela inicial do aluno. Sem ele o
 * aluno só descobria a solicitação pelo push — e quem nega notificações nunca
 * ficava sabendo. Falha de rede (ex.: offline) só esconde o aviso.
 */
export default function PersonalAnamnesisPendingBanner() {
    const [pending, setPending] = useState<MyPendingPersonalAnamnesis | null>(null);

    useEffect(() => {
        let cancelled = false;
        getMyPendingPersonalAnamnesis()
            .then((result) => {
                if (!cancelled) setPending(result);
            })
            .catch(() => {
                /* aviso é opcional */
            });
        return () => {
            cancelled = true;
        };
    }, []);

    if (!pending) return null;

    return (
        <Link href="/anamnese-do-personal" className={s.banner}>
            <FiClipboard className={s.icon} aria-hidden />
            <span className={s.text}>
                <strong className={s.title}>
                    {pending.personal_name?.trim() || 'Seu personal'} pediu sua anamnese
                </strong>
                <span className={s.sub}>
                    Responda para ele montar seus treinos. Leva cerca de 5 minutos.
                </span>
            </span>
            <FiChevronRight className={s.chevron} aria-hidden />
        </Link>
    );
}
