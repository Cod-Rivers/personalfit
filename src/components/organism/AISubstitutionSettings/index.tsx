'use client';
import React, { useEffect, useState } from 'react';
import { FiCheck, FiStar } from 'react-icons/fi';
import {
    getMyAISubstitutionSettings,
    updateAISubstitutionSettings,
} from '@/libs/aiSubstitutionAccessService';
import styles from './AISubstitutionSettings.module.css';

export default function AISubstitutionSettings() {
    const [isPro, setIsPro] = useState(false);
    const [enabled, setEnabled] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        getMyAISubstitutionSettings()
            .then((res) => {
                setIsPro(res.plan_type === 'pro');
                setEnabled(res.ai_substitution?.enabled ?? false);
            })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    const handleToggle = async (next: boolean) => {
        setEnabled(next);
        setSaving(true);
        setError('');
        setSuccess(false);
        try {
            const res = await updateAISubstitutionSettings(next);
            setEnabled(res.ai_substitution.enabled);
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        } catch (err: unknown) {
            setEnabled(!next);
            const msg = (err as { response?: { data?: { error?: string } } })
                ?.response?.data?.error;
            setError(msg || 'Erro ao salvar. Tente novamente.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <p className={styles.loading}>Carregando...</p>;

    return (
        <div className={styles.wrapper}>
            <section className={styles.section}>
                <h3 className={styles.sectionTitle}>
                    Substituição Inteligente de Exercícios
                </h3>
                <p className={styles.sectionDesc}>
                    Quando um aluno vinculado a você não conseguir usar o
                    equipamento prescrito, o app pode sugerir de 2 a 3
                    exercícios substitutos na hora, considerando o grupo
                    muscular, o objetivo do treino, o nível do aluno e
                    restrições relatadas. Você decide se oferece esse recurso
                    para os seus alunos.
                </p>

                {!isPro ? (
                    <div className={styles.gateBox}>
                        <span className={styles.gateIcon}>
                            <FiStar style={{ fill: 'currentColor' }} />
                        </span>
                        <p className={styles.gateText}>
                            Disponível no plano <strong>Pro</strong>.
                        </p>
                    </div>
                ) : (
                    <>
                        <label className={styles.toggleRow}>
                            <span className={styles.toggleLabel}>
                                {enabled
                                    ? 'Ativado para os alunos vinculados a você'
                                    : 'Desativado — seus alunos não veem essa opção'}
                            </span>
                            <button
                                type="button"
                                role="switch"
                                aria-checked={enabled}
                                className={
                                    enabled ? styles.switchOn : styles.switchOff
                                }
                                disabled={saving}
                                onClick={() => handleToggle(!enabled)}
                            >
                                <span className={styles.switchKnob} />
                            </button>
                        </label>
                        {error && <p className={styles.error}>{error}</p>}
                        {success && (
                            <p className={styles.successMsg}>
                                <FiCheck /> Preferência salva com sucesso!
                            </p>
                        )}
                    </>
                )}
            </section>
        </div>
    );
}
