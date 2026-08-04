'use client';

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { FiAlertCircle, FiRefreshCw } from 'react-icons/fi';
import Modal from '@/components/system/Modal';
import { ExerciseLog } from './types';
import {
    AISubstitutionAccessResponse,
    EQUIPMENT_OPTIONS,
    SubstitutionSuggestion,
    getAISubstitutionAccess,
    requestExerciseSubstitutions,
} from '@/libs/aiSubstitutionAccessService';
import styles from './ExerciseSubstitutionModal.module.css';

interface ExerciseSubstitutionModalProps {
    open: boolean;
    exercise: ExerciseLog;
    planningId: string;
    trainingId: string;
    onClose: () => void;
    onApply: (suggestion: SubstitutionSuggestion) => void;
}

type Step =
    | { kind: 'checking-access' }
    | { kind: 'blocked_by_personal' }
    | { kind: 'subscription_required'; price?: number }
    | { kind: 'pick-equipment' }
    | { kind: 'loading' }
    | { kind: 'success'; suggestions: SubstitutionSuggestion[]; source: 'ia' | 'cache' | 'fallback' }
    | { kind: 'error' }
    | { kind: 'offline' };

function formatBRL(value: number): string {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function ExerciseSubstitutionModal({
    open,
    exercise,
    planningId,
    trainingId,
    onClose,
    onApply,
}: ExerciseSubstitutionModalProps) {
    const router = useRouter();
    const [step, setStep] = useState<Step>({ kind: 'checking-access' });
    const [selectedEquipment, setSelectedEquipment] = useState('');
    const [customEquipment, setCustomEquipment] = useState('');

    useEffect(() => {
        if (!open) return;
        setStep({ kind: 'checking-access' });
        setSelectedEquipment('');
        setCustomEquipment('');

        getAISubstitutionAccess()
            .then((access: AISubstitutionAccessResponse) => {
                if (access.allowed) {
                    setStep({ kind: 'pick-equipment' });
                } else if (access.reason === 'blocked_by_personal') {
                    setStep({ kind: 'blocked_by_personal' });
                } else {
                    setStep({ kind: 'subscription_required', price: access.price });
                }
            })
            .catch((err) => {
                if (axios.isAxiosError(err) && !err.response) {
                    setStep({ kind: 'offline' });
                } else {
                    setStep({ kind: 'error' });
                }
            });
    }, [open]);

    const handlePickEquipment = async () => {
        const equipment =
            selectedEquipment === 'outro' ? customEquipment.trim() : selectedEquipment;
        if (!equipment) return;

        setStep({ kind: 'loading' });
        try {
            const res = await requestExerciseSubstitutions({
                planning_id: planningId,
                training_id: trainingId,
                exercise_id: exercise.id,
                unavailable_equipment: equipment,
            });
            setStep({ kind: 'success', suggestions: res.substitutos, source: res.source });
        } catch (err) {
            if (axios.isAxiosError(err) && !err.response) {
                setStep({ kind: 'offline' });
            } else if (
                axios.isAxiosError(err) &&
                err.response?.data?.code === 'ai_substitution_not_offered_by_personal'
            ) {
                setStep({ kind: 'blocked_by_personal' });
            } else if (
                axios.isAxiosError(err) &&
                err.response?.data?.code === 'ai_substitution_subscription_required'
            ) {
                setStep({ kind: 'subscription_required' });
            } else {
                setStep({ kind: 'error' });
            }
        }
    };

    const handleApply = (suggestion: SubstitutionSuggestion) => {
        onApply(suggestion);
        onClose();
    };

    return (
        <Modal open={open} onClose={onClose} title="Equipamento indisponível?">
            <div className={styles.container}>
                {step.kind === 'checking-access' && (
                    <div className={styles.centered}>
                        <div className={styles.spinner} />
                        <p>Verificando disponibilidade…</p>
                    </div>
                )}

                {step.kind === 'blocked_by_personal' && (
                    <div className={styles.centered}>
                        <FiAlertCircle className={styles.infoIcon} />
                        <p>
                            Seu personal ainda não habilitou as sugestões de exercícios
                            por IA. Fale com ele se quiser usar esse recurso.
                        </p>
                        <button className={styles.secondaryBtn} onClick={onClose}>
                            Manter o exercício original
                        </button>
                    </div>
                )}

                {step.kind === 'subscription_required' && (
                    <div className={styles.centered}>
                        <FiAlertCircle className={styles.infoIcon} />
                        <p>
                            Sugestões inteligentes de exercícios substitutos, geradas na
                            hora com base no seu treino e no seu nível.
                        </p>
                        {step.price != null && (
                            <p className={styles.price}>
                                {formatBRL(step.price)}/mês
                            </p>
                        )}
                        <button
                            className={styles.primaryBtn}
                            onClick={() => router.push('/pagamento?produto=ia-substituicao')}
                        >
                            Assinar
                        </button>
                        <button className={styles.secondaryBtn} onClick={onClose}>
                            Manter o exercício original
                        </button>
                    </div>
                )}

                {step.kind === 'pick-equipment' && (
                    <div>
                        <p className={styles.prompt}>
                            Qual equipamento está indisponível agora?
                        </p>
                        <div className={styles.chips}>
                            {EQUIPMENT_OPTIONS.map((opt) => (
                                <button
                                    key={opt}
                                    type="button"
                                    className={
                                        selectedEquipment === opt
                                            ? styles.chipSelected
                                            : styles.chip
                                    }
                                    onClick={() => setSelectedEquipment(opt)}
                                >
                                    {opt}
                                </button>
                            ))}
                        </div>
                        {selectedEquipment === 'outro' && (
                            <input
                                type="text"
                                className={styles.customInput}
                                placeholder="Qual equipamento?"
                                value={customEquipment}
                                onChange={(e) => setCustomEquipment(e.target.value)}
                            />
                        )}
                        <button
                            className={styles.primaryBtn}
                            disabled={
                                !selectedEquipment ||
                                (selectedEquipment === 'outro' && !customEquipment.trim())
                            }
                            onClick={handlePickEquipment}
                        >
                            Buscar alternativas
                        </button>
                    </div>
                )}

                {step.kind === 'loading' && (
                    <div className={styles.centered}>
                        <div className={styles.spinner} />
                        <p>Buscando alternativas…</p>
                    </div>
                )}

                {step.kind === 'success' && (
                    <div>
                        {step.source === 'fallback' && (
                            <p className={styles.fallbackNotice}>
                                Sugestões gerais — a recomendação personalizada está
                                indisponível no momento.
                            </p>
                        )}
                        <div className={styles.suggestionList}>
                            {step.suggestions.map((s, i) => (
                                <div key={i} className={styles.suggestionCard}>
                                    <strong className={styles.suggestionName}>
                                        {s.nome_exercicio}
                                    </strong>
                                    <div className={styles.badges}>
                                        <span className={styles.badge}>
                                            {s.grupo_muscular}
                                        </span>
                                        {s.equipamento_necessario && (
                                            <span className={styles.badge}>
                                                {s.equipamento_necessario}
                                            </span>
                                        )}
                                        <span className={styles.badge}>
                                            {s.nivel_recomendado}
                                        </span>
                                    </div>
                                    {s.justificativa && (
                                        <p className={styles.justification}>
                                            {s.justificativa}
                                        </p>
                                    )}
                                    <button
                                        className={styles.primaryBtn}
                                        onClick={() => handleApply(s)}
                                    >
                                        Usar este exercício hoje
                                    </button>
                                </div>
                            ))}
                        </div>
                        <button className={styles.secondaryBtn} onClick={onClose}>
                            Manter o exercício original
                        </button>
                    </div>
                )}

                {step.kind === 'error' && (
                    <div className={styles.centered}>
                        <FiAlertCircle className={styles.infoIcon} />
                        <p>Não foi possível buscar alternativas agora.</p>
                        <button
                            className={styles.primaryBtn}
                            onClick={() => setStep({ kind: 'pick-equipment' })}
                        >
                            <FiRefreshCw /> Tentar novamente
                        </button>
                        <button className={styles.secondaryBtn} onClick={onClose}>
                            Manter o exercício original
                        </button>
                    </div>
                )}

                {step.kind === 'offline' && (
                    <div className={styles.centered}>
                        <FiAlertCircle className={styles.infoIcon} />
                        <p>Sem conexão — não é possível buscar alternativas agora.</p>
                        <button className={styles.secondaryBtn} onClick={onClose}>
                            Manter o exercício original
                        </button>
                    </div>
                )}
            </div>
        </Modal>
    );
}
