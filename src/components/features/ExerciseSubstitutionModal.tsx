'use client';

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { FiAlertCircle, FiRefreshCw } from 'react-icons/fi';
import Modal from '@/components/system/Modal';
import Button from '@/components/atoms/Button';
import ExerciseThumbnail from './ExerciseThumbnail';
import { ExerciseLog } from './types';
import {
    AISubstitutionAccessResponse,
    AnamnesisStatus,
    EQUIPMENT_OPTIONS,
    SubstitutionSource,
    SubstitutionSuggestion,
    SubstitutionTargetSource,
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
    | {
          kind: 'success';
          suggestions: SubstitutionSuggestion[];
          source: SubstitutionSource;
          anamnesisStatus: AnamnesisStatus;
          targetMuscleGroup?: string;
          targetSource?: SubstitutionTargetSource;
      }
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
            setStep({
                kind: 'success',
                suggestions: res.substitutos,
                source: res.source,
                anamnesisStatus: res.anamnesis_status ?? 'completa',
                targetMuscleGroup: res.target_muscle_group,
                targetSource: res.target_source,
            });
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
                        <Button variant="ghost" fullWidth onClick={onClose}>
                            Manter o exercício original
                        </Button>
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
                        <Button
                            variant="primary"
                            fullWidth
                            onClick={() => router.push('/pagamento?produto=ia-substituicao')}
                        >
                            Assinar
                        </Button>
                        <Button variant="ghost" fullWidth onClick={onClose}>
                            Manter o exercício original
                        </Button>
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
                        <Button
                            variant="primary"
                            fullWidth
                            disabled={
                                !selectedEquipment ||
                                (selectedEquipment === 'outro' && !customEquipment.trim())
                            }
                            onClick={handlePickEquipment}
                        >
                            Buscar alternativas
                        </Button>
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
                        {step.anamnesisStatus === 'ausente' && (
                            <div className={styles.anamnesisBanner}>
                                <p>
                                    Você ainda não preencheu a anamnese — estas sugestões
                                    são conservadoras por segurança. Preencher leva cerca
                                    de 3 minutos e melhora muito a recomendação.
                                </p>
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => router.push('/anamnese')}
                                >
                                    Preencher anamnese
                                </Button>
                            </div>
                        )}

                        {step.anamnesisStatus === 'sinalizada' && (
                            <div className={styles.anamnesisBanner}>
                                <p>
                                    Sua triagem de saúde indicou pontos de atenção — estas
                                    sugestões são conservadoras. Fale com seu personal antes
                                    de aumentar a intensidade.
                                </p>
                            </div>
                        )}

                        {step.source === 'biblioteca' && (
                            <p className={styles.fallbackNotice}>
                                Sugestões da biblioteca do app — a recomendação
                                personalizada está indisponível no momento.
                            </p>
                        )}

                        {step.source === 'fallback' && (
                            <p className={styles.fallbackNotice}>
                                Sugestões gerais — a recomendação personalizada está
                                indisponível no momento.
                            </p>
                        )}

                        {step.targetSource === 'desconhecido' && (
                            <p className={styles.fallbackNotice}>
                                Este exercício não tem grupo muscular definido na
                                prescrição — as sugestões são genéricas. Avise seu personal.
                            </p>
                        )}

                        <div className={styles.suggestionList}>
                            {step.suggestions.map((s, i) => (
                                <div key={i} className={styles.suggestionCard}>
                                    <div className={styles.suggestionHeader}>
                                        {(s.video_thumb || s.video_url) && (
                                            <ExerciseThumbnail
                                                name={s.nome_exercicio}
                                                videoThumb={s.video_thumb}
                                                videoUrl={s.video_url}
                                                width={56}
                                                height={56}
                                                captureFrame={false}
                                                lazyCapture
                                                className={styles.suggestionThumb}
                                            />
                                        )}
                                        <strong className={styles.suggestionName}>
                                            {s.nome_exercicio}
                                        </strong>
                                    </div>
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
                                    <Button
                                        variant="primary"
                                        fullWidth
                                        onClick={() => handleApply(s)}
                                    >
                                        Usar este exercício hoje
                                    </Button>
                                </div>
                            ))}
                        </div>
                        <Button variant="ghost" fullWidth onClick={onClose}>
                            Manter o exercício original
                        </Button>
                    </div>
                )}

                {step.kind === 'error' && (
                    <div className={styles.centered}>
                        <FiAlertCircle className={styles.infoIcon} />
                        <p>Não foi possível buscar alternativas agora.</p>
                        <Button
                            variant="primary"
                            fullWidth
                            leftIcon={<FiRefreshCw />}
                            onClick={() => setStep({ kind: 'pick-equipment' })}
                        >
                            Tentar novamente
                        </Button>
                        <Button variant="ghost" fullWidth onClick={onClose}>
                            Manter o exercício original
                        </Button>
                    </div>
                )}

                {step.kind === 'offline' && (
                    <div className={styles.centered}>
                        <FiAlertCircle className={styles.infoIcon} />
                        <p>Sem conexão — não é possível buscar alternativas agora.</p>
                        <Button variant="ghost" fullWidth onClick={onClose}>
                            Manter o exercício original
                        </Button>
                    </div>
                )}
            </div>
        </Modal>
    );
}
