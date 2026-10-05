'use client';

import React from 'react';
import { FiClock } from 'react-icons/fi';
import { useBranding } from '@/context/BrandingContext';
import s from './meusTreinos.module.css';

/**
 * Aviso ao aluno quando o personal dele está no plano gratuito com mais
 * alunos do que o plano inclui (2026-10-02): enquanto o personal escolhe
 * quem continua ("pending") e, se o aluno ficou de fora, durante a espera
 * ("standby"). O aluno continua treinando nos dois casos. Vem do /branding.
 */
export default function StudentOverflowNotice() {
    const { studentOverflow } = useBranding();
    if (!studentOverflow) return null;

    const until = new Date(studentOverflow.until).toLocaleDateString('pt-BR');
    const limit = studentOverflow.limit ?? 3;

    return (
        <div className={s.overflowNotice} role="status">
            <FiClock size={20} aria-hidden="true" />
            <div>
                {studentOverflow.status === 'pending' ? (
                    <>
                        <p className={s.overflowTitle}>
                            Seu personal está escolhendo quem continua
                        </p>
                        <p className={s.overflowText}>
                            O plano gratuito do seu personal inclui até {limit}{' '}
                            alunos. Se você não estiver entre os escolhidos, o
                            seu acompanhamento fica em espera até {until}. Você
                            continua treinando normalmente.
                        </p>
                    </>
                ) : (
                    <>
                        <p className={s.overflowTitle}>
                            Seu acompanhamento está em espera até {until}
                        </p>
                        <p className={s.overflowText}>
                            O plano gratuito do seu personal inclui até {limit}{' '}
                            alunos, e você não está entre eles. Você continua
                            treinando o plano atual, mas ele não será alterado.
                            Se o seu personal assinar o Plus ou o PRO até{' '}
                            {until}, tudo continua normalmente; senão, o
                            vínculo com ele é encerrado.
                        </p>
                    </>
                )}
            </div>
        </div>
    );
}
