'use client';

import { useState } from 'react';
import Link from 'next/link';
import { FiHeart } from 'react-icons/fi';
import Modal from '@/components/system/Modal';
import PersonalAnamnesisAnswers from '@/components/features/PersonalAnamnesisAnswers';
import {
    friendlyPersonalAnamnesisError,
    getStudentPersonalAnamnesis,
    type PersonalAnamnesisHistory,
} from '@/libs/personalAnamnesisService';
import s from './PersonalAnamnesisQuickView.module.css';

interface Props {
    studentId: string;
    className?: string;
}

/**
 * Botão "Ver anamnese" para o editor de treinos: abre as respostas mais
 * recentes da Anamnese do personal sem sair da tela — é ali que o personal
 * precisa delas para montar as séries.
 */
export default function PersonalAnamnesisQuickView({ studentId, className }: Props) {
    const [open, setOpen] = useState(false);
    const [history, setHistory] = useState<PersonalAnamnesisHistory | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function openModal() {
        setOpen(true);
        setLoading(true);
        setError(null);
        try {
            setHistory(await getStudentPersonalAnamnesis(studentId));
        } catch (err) {
            setError(friendlyPersonalAnamnesisError(err));
        } finally {
            setLoading(false);
        }
    }

    const latest = history?.submitted[0];
    const pagePath = `/personal/aluno/${studentId}/anamnese`;

    return (
        <>
            <button type="button" className={className} onClick={openModal}>
                <FiHeart aria-hidden /> Ver anamnese
            </button>
            <Modal open={open} onClose={() => setOpen(false)} title="Anamnese do aluno">
                {loading && <p className={s.muted}>Carregando…</p>}
                {!loading && error && <p className={s.error}>{error}</p>}
                {!loading && !error && history && (
                    latest ? (
                        <div className={s.body}>
                            <PersonalAnamnesisAnswers view={latest} />
                            <Link href={pagePath} className={s.link}>
                                Ver histórico completo
                            </Link>
                        </div>
                    ) : (
                        <div className={s.empty}>
                            <p className={s.emptyText}>
                                {history.pending
                                    ? 'O aluno ainda não respondeu a anamnese que você pediu.'
                                    : 'Este aluno ainda não respondeu a Anamnese do personal.'}
                            </p>
                            {history.legacy.length > 0 && (
                                <p className={s.muted}>
                                    Há respostas no formato antigo na página da anamnese.
                                </p>
                            )}
                            <Link href={pagePath} className={s.link}>
                                {history.pending ? 'Abrir página da anamnese' : 'Pedir ao aluno ou preencher agora'}
                            </Link>
                        </div>
                    )
                )}
            </Modal>
        </>
    );
}
