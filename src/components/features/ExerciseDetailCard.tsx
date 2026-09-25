'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import {
    FiImage,
    FiMusic,
    FiVideo,
    FiActivity,
    FiCheck,
    FiSave,
    FiChevronRight,
    FiAlertCircle,
    FiLock,
    FiPlus,
    FiPlay,
    FiRepeat,
    FiX,
} from 'react-icons/fi';
import { ExerciseLog } from './types';
import styles from './ExerciseDetailCard.module.css';
import Modal from '@/components/system/Modal';
import Button from '@/components/atoms/Button';
import SeriesTimer from '@/components/molecules/SeriesTimer';
import {
    isVideoExtension,
    isInstagramUrl,
    isTikTokUrl,
    snapToStandardAspectRatio,
    toEmbedUrl,
} from '@/libs/exerciseVideoService';
import {
    formatTechniqueSummary,
    groupTechniqueLabel,
} from '@/libs/trainingTechniques';
import {
    getExerciseAnnotation,
    saveExerciseAnnotation,
    getCachedAnnotationNote,
    setCachedAnnotationNote,
} from '@/libs/exerciseAnnotationService';
import {
    getExerciseWeight,
    saveExerciseWeight,
    getCachedWeight,
    setCachedWeight,
} from '@/libs/exerciseWeightService';
import { LoadSuggestion } from '@/libs/loadSuggestion';
import {
    MAX_SERIES_VALUE,
    MAX_SETS,
    formatSeries,
    fromSeriesDraft,
    seriesSignature,
    toSeriesDraft,
    type SeriesPrescriptionDraft,
    type SeriesPrescriptionPatch,
} from '@/libs/seriesPrescription';
import { PrescriptionQueuedOfflineError } from '@/libs/offline/prescriptionQueue';
import HelpTooltip from '@/components/atoms/HelpTooltip';
import TechniqueHelpTooltip from '@/components/molecules/TechniqueHelpTooltip';
import ExternalLink from '@/components/atoms/ExternalLink';
import { getGlossaryTerm } from '@/libs/glossaryContent';

interface ExerciseDetailCardProps {
    exercise: ExerciseLog;
    onClose?: () => void;
    /** Ajuste intrassessão de carga (%) sugerido pelo painel de autorregulação
     * do microciclo (ver microcycleAutoregulation.ts). Usado como fallback
     * simples (% sobre a carga prescrita) quando loadSuggestion não está
     * disponível — ex: treino sem periodização (fluxo legado /app/treino). */
    loadAdjustPct?: number;
    /** Sugestão completa do motor de carga (ver libs/loadSuggestion.ts),
     * combinando prescrição do personal com o histórico do aluno. Tem
     * prioridade sobre loadAdjustPct quando presente. */
    loadSuggestion?: LoadSuggestion;
    /** Próximo exercício do mesmo bloco de bi-set/triset/superset (mesmo
     * group_id), quando existir. Presente = este NÃO é o último exercício do
     * bloco, então não há descanso antes dele — troca o timer por um atalho
     * direto para o próximo. */
    nextInGroup?: ExerciseLog | null;
    /** Abre outro exercício no lugar deste (usado pelo atalho do bloco). */
    onSelectExercise?: (exercise: ExerciseLog) => void;
    /** Abre o fluxo de Substituição Inteligente de Exercícios para este
     * exercício. Opcional: o fluxo legado (/app/treino) também renderiza este
     * componente e não deve ganhar o botão. */
    onEquipmentUnavailable?: (exercise: ExerciseLog) => void;
    /** Modo de visualização do personal (ex: "ver treino" do aluno): oculta
     * edição de carga e anotações — essas telas são "/me/..." (escopadas no
     * usuário logado), então salvá-las aqui gravaria dados do personal, não
     * do aluno. */
    readOnly?: boolean;
    /** Presente só nas telas do personal (preview do editor de treinos e
     * "ver treino do aluno"): permite editar a carga PRESCRITA (plannedWeight)
     * direto pelo card, em vez de precisar fechar o preview e procurar o
     * campo "Carga" na prescrição do exercício. Grava onde o chamador mandar
     * (estado local do editor, ou a fase no servidor), nunca em
     * /me/exercise-weight — aquele endpoint é o registro do PRÓPRIO aluno,
     * não a prescrição do personal.
     *
     * Pode devolver Promise: o card mostra "salvando/salvo" e, se ela
     * rejeitar, o erro no lugar de fingir que gravou. */
    onPrescribeWeight?: (weightKg: number) => void | Promise<void>;
    /** Mesma ideia de onPrescribeWeight para a prescrição de SÉRIES (séries ×
     * repetições, séries × segundos, ou texto livre). Separado porque a carga
     * é um número só e as séries mexem em três campos do exercício
     * (series/series_label/timed) — ver libs/seriesPrescription.ts. */
    onPrescribeSeries?: (patch: SeriesPrescriptionPatch) => void | Promise<void>;
    /** Edição completa do exercício, renderizada dentro do card (só na tela do
     * treino do aluno, pelo personal). O card não sabe gravar a fase — quem
     * passa o editor é que sabe; ver ExerciseInlineEditor. */
    editor?: React.ReactNode;
    /** Trocar por outro exercício da biblioteca (personal, tela do treino do
     * aluno). Fica visível no topo, e não dentro do editor recolhido: é a
     * ação mais comum depois de séries e carga. */
    onReplace?: () => void;
    /** Presente quando o exercício faz parte de um bloco que roda como
     * circuito (CircuitTimer). O cronômetro fica no bloco, na lista — quem
     * abriu o card do 1º exercício não o via sem rolar a tela. O atalho
     * aparece no topo do card; quem chama fecha o card e dá o start. */
    onStartCircuit?: () => void;
}

const ExerciseDetailCard: React.FC<ExerciseDetailCardProps> = ({
    exercise,
    onClose,
    loadAdjustPct,
    loadSuggestion,
    nextInGroup,
    onSelectExercise,
    onEquipmentUnavailable,
    readOnly = false,
    onPrescribeWeight,
    onPrescribeSeries,
    editor,
    onReplace,
    onStartCircuit,
}) => {
    // --- Estados ---
    const [timerValue, setTimerValue] = useState<number>(
        exercise.restTime || 60,
    );
    const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
    const [isVideoPlayerOpen, setIsVideoPlayerOpen] = useState(false);
    const [videoAspectRatio, setVideoAspectRatio] = useState<number | null>(
        null,
    );
    const [thumbAspectRatio, setThumbAspectRatio] = useState<number | null>(
        null,
    );
    const [userAnnotations, setUserAnnotations] = useState<string>('');
    const [notesOpen, setNotesOpen] = useState(false);
    const [isSavingAnnotations, setIsSavingAnnotations] = useState(false);
    const [annotationsStatus, setAnnotationsStatus] = useState<
        'idle' | 'saved' | 'saved-offline' | 'error'
    >('idle');
    const [isWeightEditing, setIsWeightEditing] = useState<boolean>(false); // Novo estado para controlar a edição do peso
    const [weightValue, setWeightValue] = useState<number | string>(
        exercise.weight > 0 ? exercise.weight : '',
    ); // Novo estado para o valor do peso
    const [weightSaveStatus, setWeightSaveStatus] = useState<
        'idle' | 'saved' | 'saved-offline' | 'error'
    >('idle');
    // Edição da carga PRESCRITA no preview do personal (ver onPrescribeWeight).
    const [isPrescribedWeightEditing, setIsPrescribedWeightEditing] =
        useState<boolean>(false);
    const [prescribedWeightValue, setPrescribedWeightValue] = useState<
        number | string
    >(exercise.plannedWeight ?? '');
    // Edição da prescrição de SÉRIES pelo personal (ver onPrescribeSeries).
    const [isSeriesEditing, setIsSeriesEditing] = useState<boolean>(false);
    const [seriesDraft, setSeriesDraft] = useState<SeriesPrescriptionDraft>(() =>
        toSeriesDraft(exercise),
    );
    // Estado de uma gravação de prescrição (carga ou séries). Diferente de
    // weightSaveStatus, que é o registro de carga do próprio ALUNO.
    // 'saved-offline': sem rede, a edição foi gravada no IndexedDB do
    // aparelho e sincroniza sozinha quando a conexão voltar — NÃO é um erro
    // (ver PrescriptionQueuedOfflineError em libs/offline/prescriptionQueue.ts).
    const [prescriptionStatus, setPrescriptionStatus] = useState<
        'idle' | 'saving' | 'saved' | 'saved-offline' | 'error'
    >('idle');
    const [prescriptionError, setPrescriptionError] = useState('');
    // Tirar uma série pede confirmação (ver handleRemoveSetConfirmed).
    const [confirmRemoveSet, setConfirmRemoveSet] = useState(false);
    // Editor completo (prop `editor`): nasce recolhido — o uso de todo dia é
    // ajustar série e carga, e o formulário inteiro empurraria o resto do
    // card para baixo.
    const [editorOpen, setEditorOpen] = useState(false);
    // --- Efeitos ---
    Racional: useEffect(() => {
        // Lógica do cronômetro
        let interval: NodeJS.Timeout | null = null;
        if (isTimerRunning && timerValue > 0) {
            interval = setInterval(() => {
                setTimerValue((prevTime) => prevTime - 1);
            }, 1000);
        } else if (timerValue === 0 && isTimerRunning) {
            setIsTimerRunning(false);
            alert('Tempo de descanso finalizado!');
        }
        return () => {
            if (interval) {
                clearInterval(interval);
            }
        };
    }, [isTimerRunning, timerValue]);

    useEffect(() => {
        // Resetar o cronômetro ao mudar de exercício
        setTimerValue(exercise.restTime || 60);
        setIsTimerRunning(false);
        setThumbAspectRatio(null);
        setIsPrescribedWeightEditing(false);
        setPrescribedWeightValue(exercise.plannedWeight ?? '');
    }, [exercise.restTime, exercise.id, exercise.plannedWeight]);

    // Sincroniza o formulário de séries com a prescrição vigente. A chave é a
    // ASSINATURA do conteúdo, não a identidade do objeto: os chamadores
    // remontam o ExerciseLog a cada render, e depender da identidade zeraria o
    // que o personal está digitando. Assim o efeito só dispara quando a
    // prescrição de fato mudou — inclusive quando ela volta salva do servidor.
    const currentSeriesSignature = seriesSignature(exercise);
    useEffect(() => {
        setSeriesDraft(toSeriesDraft(exercise));
        setIsSeriesEditing(false);
        setConfirmRemoveSet(false);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [exercise.id, currentSeriesSignature]);

    useEffect(() => {
        // Modo somente leitura (personal vendo o treino do aluno): as notas
        // são "/me/exercise-notes" (escopadas no usuário logado), então nem
        // buscamos aqui — mostraria/gravaria dados do personal, não do aluno.
        if (readOnly) return;
        // Preenchimento otimista com o cache local (funciona offline e evita
        // "piscar" vazio enquanto a resposta do servidor não chega); o
        // servidor é a fonte da verdade e sobrescreve assim que responder.
        setAnnotationsStatus('idle');
        const cachedNote = getCachedAnnotationNote(exercise.id);
        setUserAnnotations(cachedNote);
        setNotesOpen(!!cachedNote);

        let cancelled = false;
        getExerciseAnnotation(exercise.id)
            .then((res) => {
                if (cancelled) return;
                setUserAnnotations(res.note ?? '');
                setCachedAnnotationNote(exercise.id, res.note ?? '');
                if (res.note) setNotesOpen(true);
            })
            .catch(() => {
                // Offline ou exercício ainda sem contrapartida no backend:
                // mantém o valor do cache local já aplicado acima.
            });
        return () => {
            cancelled = true;
        };
    }, [exercise.id, readOnly]);

    useEffect(() => {
        // Mesmo motivo do efeito de anotações acima: em modo somente leitura
        // não buscamos "/me/exercise-weight" (seria a preferência do
        // personal, não a do aluno). A carga prescrita (plannedWeight) é
        // exibida direto, sem chamada.
        if (readOnly) return;
        // Mesmo padrão otimista das anotações acima: cache local primeiro
        // (funciona offline e evita "piscar" vazio), servidor sobrescreve
        // assim que responder. Antes disso o campo só vivia em estado local
        // do React e se perdia ao fechar o card ou recarregar a página.
        setWeightSaveStatus('idle');
        const cachedWeight = getCachedWeight(exercise.id);
        if (cachedWeight != null) setWeightValue(cachedWeight);

        let cancelled = false;
        getExerciseWeight(exercise.id)
            .then((res) => {
                if (cancelled) return;
                if (res.weight_kg > 0) {
                    setWeightValue(res.weight_kg);
                    setCachedWeight(exercise.id, res.weight_kg);
                }
            })
            .catch(() => {
                // Offline ou ainda sem preferência salva no backend: mantém
                // o valor do cache local (ou o padrão vindo de exercise.weight).
            });
        return () => {
            cancelled = true;
        };
    }, [exercise.id, readOnly]);

    // --- Funções de Callback e Auxiliares ---
    const handleStartTimer = useCallback(() => {
        if (timerValue > 0) {
            setIsTimerRunning(true);
        }
    }, [timerValue]);

    const handlePauseTimer = useCallback(() => {
        setIsTimerRunning(false);
    }, []);

    const handleResetTimer = useCallback(() => {
        setIsTimerRunning(false);
        setTimerValue(exercise.restTime || 60);
    }, [exercise.restTime]);

    const formatTime = (timeInSeconds: number): string => {
        const minutes = Math.floor(timeInSeconds / 60);
        const seconds = timeInSeconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    };

    // --- Handlers de Eventos ---
    const handleOpenVideoPlayer = () => {
        if (exercise.video_url) {
            setIsVideoPlayerOpen(true);
        }
    };

    const handleCloseVideoPlayer = () => {
        setIsVideoPlayerOpen(false);
        setVideoAspectRatio(null);
    };

    const handleAnnotationsChange = (
        e: React.ChangeEvent<HTMLTextAreaElement>,
    ) => {
        // Função para atualizar as anotações
        setUserAnnotations(e.target.value);
    };

    const renderVideoModalContent = () => {
        if (!isVideoPlayerOpen) return null;

        // video_url já vem resolvido pela API como URL final pronta para tocar
        // (R2/CDN, ou link do YouTube/Vimeo/TikTok). embedUrl tem prioridade
        // quando aplicável; Instagram (e TikTok com link curto) só redireciona.
        const playUrl =
            embedUrl || isExternalRedirectOnly
                ? ''
                : exercise.video_url || '';

        if (isExternalRedirectOnly) {
            const platform = isInstagramUrl(exercise.video_url || '')
                ? 'Instagram'
                : 'TikTok';
            return (
                <div style={{ padding: '2rem', textAlign: 'center' }}>
                    <p style={{ color: '#ccc', marginBottom: '1rem' }}>
                        Este vídeo está hospedado no {platform}.
                    </p>
                    <ExternalLink
                        href={exercise.video_url}
                        className="btn btn-primary"
                    >
                        Ver no {platform} ↗
                    </ExternalLink>
                </div>
            );
        }

        if (playUrl) {
            return (
                <div
                    className={styles.videoPlayerContainer}
                    style={
                        videoAspectRatio != null
                            ? {
                                  paddingBottom: 0,
                                  height: 'auto',
                              }
                            : undefined
                    }
                >
                    {isVideoExtension(playUrl) ? (
                        <video
                            src={playUrl}
                            controls
                            autoPlay
                            muted
                            loop
                            playsInline
                            className={styles.videoIframe}
                            onLoadedMetadata={(e) => {
                                const { videoWidth, videoHeight } =
                                    e.currentTarget;
                                if (videoWidth && videoHeight) {
                                    setVideoAspectRatio(
                                        snapToStandardAspectRatio(
                                            videoWidth / videoHeight,
                                        ),
                                    );
                                }
                            }}
                            style={
                                videoAspectRatio != null
                                    ? {
                                          position: 'static',
                                          width: '100%',
                                          height: 'auto',
                                          maxHeight: '72vh',
                                          objectFit: 'contain',
                                          display: 'block',
                                      }
                                    : undefined
                            }
                        />
                    ) : (
                        <img
                            src={playUrl}
                            alt={exercise.name}
                            className={styles.videoIframe}
                            style={{ objectFit: 'contain' }}
                        />
                    )}
                </div>
            );
        }
        // Caso 2: YouTube / Vimeo
        if (embedUrl) {
            return (
                <div className={styles.videoPlayerContainer}>
                    <iframe
                        src={embedUrl}
                        title={`Vídeo para ${exercise.name}`}
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className={styles.videoIframe}
                    ></iframe>
                </div>
            );
        }
        return null;
    };

    const handleSaveAnnotations = async () => {
        // Cache local primeiro: garante que a anotação não se perde mesmo se
        // a chamada ao servidor falhar (offline) ou o usuário fechar o card
        // logo em seguida.
        setCachedAnnotationNote(exercise.id, userAnnotations);
        setIsSavingAnnotations(true);
        try {
            await saveExerciseAnnotation(exercise.id, userAnnotations);
            setAnnotationsStatus('saved');
        } catch (err) {
            if (axios.isAxiosError(err) && !err.response) {
                // Sem conexão: já está salvo localmente, só não sincronizou ainda.
                setAnnotationsStatus('saved-offline');
            } else {
                setAnnotationsStatus('error');
            }
        } finally {
            setIsSavingAnnotations(false);
            setTimeout(() => setAnnotationsStatus('idle'), 3000);
        }
    };

    // Sugestão de carga do "Controle do Microciclo (Autorregulação)": prefere
    // o motor completo (loadSuggestion, que combina prescrição + histórico do
    // aluno) e cai para o ajuste simples sobre a carga planejada quando ele
    // não está disponível (ex: treino sem periodização).
    const recommendedWeight = useMemo(() => {
        if (loadSuggestion) return loadSuggestion.suggestedKg;
        if (!exercise.plannedWeight || loadAdjustPct == null) return null;
        const adjusted = exercise.plannedWeight * (1 + loadAdjustPct / 100);
        return Math.round(adjusted * 2) / 2;
    }, [loadSuggestion, exercise.plannedWeight, loadAdjustPct]);

    const persistWeight = (weight: number) => {
        if (!(weight > 0)) return;
        // Cache local primeiro: garante que o valor não se perde mesmo se a
        // chamada ao servidor falhar (offline) ou o usuário fechar o card
        // logo em seguida (mesmo padrão de handleSaveAnnotations acima).
        setCachedWeight(exercise.id, weight);
        saveExerciseWeight(exercise.id, weight)
            .then(() => setWeightSaveStatus('saved'))
            .catch((err) => {
                if (axios.isAxiosError(err) && !err.response) {
                    setWeightSaveStatus('saved-offline');
                } else {
                    setWeightSaveStatus('error');
                }
            })
            .finally(() => {
                setTimeout(() => setWeightSaveStatus('idle'), 3000);
            });
    };

    const handleApplyRecommendedWeight = () => {
        if (recommendedWeight == null) return;
        setWeightValue(recommendedWeight);
        persistWeight(recommendedWeight);
    };

    // --- Lógica de Renderização ---
    if (!exercise) return null;

    const embedUrl = toEmbedUrl(exercise.video_url || '');
    // Instagram nunca é embutido; TikTok cai aqui quando o link é curto
    // (vm.tiktok.com) e não dá pra extrair o ID do vídeo para o embed.
    const isExternalRedirectOnly =
        !embedUrl &&
        !!exercise.video_url &&
        (isInstagramUrl(exercise.video_url) ||
            isTikTokUrl(exercise.video_url));
    //função de alteração da carga
    const handleWeightEditStart = () => {
        setIsWeightEditing(true);
    };

    const handleWeightEditEnd = () => {
        setIsWeightEditing(false);
        const numericWeight =
            typeof weightValue === 'number' ? weightValue : parseFloat(weightValue);
        if (Number.isFinite(numericWeight)) {
            persistWeight(numericWeight);
        }
    };

    const handleWeightKeyDown = (
        event: React.KeyboardEvent<HTMLInputElement>,
    ) => {
        if (event.key === 'Enter') {
            handleWeightEditEnd();
        }
    };

    /** Executa uma gravação de prescrição mostrando o andamento no card. O
     * callback pode ser síncrono (editor, que só mexe no estado local) ou
     * devolver Promise (ver treino do aluno, que grava no servidor). */
    const runPrescriptionSave = async (save: () => void | Promise<void>) => {
        setPrescriptionStatus('saving');
        setPrescriptionError('');
        try {
            await save();
            setPrescriptionStatus('saved');
            setTimeout(() => setPrescriptionStatus('idle'), 3000);
        } catch (err) {
            // Sem rede: a edição foi para a fila offline, não descartada —
            // ver PrescriptionQueuedOfflineError. Mostra o mesmo padrão
            // "salvo neste dispositivo" do resto do app, não um erro.
            if (err instanceof PrescriptionQueuedOfflineError) {
                setPrescriptionStatus('saved-offline');
                setTimeout(() => setPrescriptionStatus('idle'), 5000);
                return;
            }
            setPrescriptionStatus('error');
            setPrescriptionError(
                err instanceof Error && err.message
                    ? err.message
                    : 'Não foi possível salvar a prescrição. Tente novamente.',
            );
        }
    };

    const handlePrescribedWeightEditStart = () => {
        if (!onPrescribeWeight) return;
        setPrescribedWeightValue(exercise.plannedWeight ?? '');
        setPrescriptionStatus('idle');
        setIsPrescribedWeightEditing(true);
    };

    /** Confirma e salva. Chamado tanto pelo botão ✓ quanto pelo Enter —
     * o botão existe porque depender só de onBlur/Enter (como era antes)
     * falha em qualquer interação que feche o card sem passar por um dos
     * dois: tocar no X do modal ou no fundo dá blur (fecha o campo) mas não
     * garante que o clique de confirmação chegue a acontecer antes do card
     * desmontar, e no toque (a tela é usada na academia) não há "Enter". */
    const handlePrescribedWeightConfirm = () => {
        setIsPrescribedWeightEditing(false);
        const numericWeight =
            typeof prescribedWeightValue === 'number'
                ? prescribedWeightValue
                : parseFloat(prescribedWeightValue);
        if (Number.isFinite(numericWeight) && numericWeight >= 0) {
            // Campo intocado não vira requisição: abrir e fechar a carga por
            // engano não pode reescrever a fase inteira do aluno.
            if (numericWeight === exercise.plannedWeight) return;
            void runPrescriptionSave(() => onPrescribeWeight?.(numericWeight));
        }
    };

    const handlePrescribedWeightCancel = () => {
        setPrescribedWeightValue(exercise.plannedWeight ?? '');
        setIsPrescribedWeightEditing(false);
    };

    const handlePrescribedWeightKeyDown = (
        event: React.KeyboardEvent<HTMLInputElement>,
    ) => {
        if (event.key === 'Enter') handlePrescribedWeightConfirm();
        if (event.key === 'Escape') handlePrescribedWeightCancel();
    };

    const handleSeriesEditStart = () => {
        if (!onPrescribeSeries) return;
        setSeriesDraft(toSeriesDraft(exercise));
        setPrescriptionStatus('idle');
        setIsSeriesEditing(true);
    };

    const handleSeriesEditCancel = () => {
        setSeriesDraft(toSeriesDraft(exercise));
        setIsSeriesEditing(false);
    };

    const handleSeriesSave = () => {
        if (!onPrescribeSeries) return;
        const patch = fromSeriesDraft(seriesDraft);
        setIsSeriesEditing(false);
        // Mesmo motivo da carga: sem mudança, sem PUT.
        if (
            seriesSignature({
                series: patch.series,
                series_label: patch.series_label,
                timed: patch.timed,
            }) === currentSeriesSignature
        ) {
            return;
        }
        void runPrescriptionSave(() => onPrescribeSeries(patch));
    };

    const handleSeriesKeyDown = (
        event: React.KeyboardEvent<HTMLInputElement>,
    ) => {
        if (event.key === 'Enter') handleSeriesSave();
        if (event.key === 'Escape') handleSeriesEditCancel();
    };

    /* ── + / × de série ──
     * Só para prescrição em séries (N × reps ou N × segundos): texto livre
     * não tem "uma série" para acrescentar ou tirar. A série nova repete a
     * última — em 12/10/8, a quarta é 8, que é o que o personal faria à mão. */
    const currentSeries = exercise.series ?? [];
    const canStepSets =
        !!onPrescribeSeries &&
        !exercise.series_label &&
        currentSeries.length > 0;

    const handleAddSet = () => {
        if (!onPrescribeSeries || currentSeries.length >= MAX_SETS) return;
        setConfirmRemoveSet(false);
        const last = currentSeries[currentSeries.length - 1];
        void runPrescriptionSave(() =>
            onPrescribeSeries({
                series: [...currentSeries, last],
                timed: !!exercise.timed,
                series_label: undefined,
            }),
        );
    };

    const handleRemoveSetConfirmed = () => {
        setConfirmRemoveSet(false);
        if (!onPrescribeSeries || currentSeries.length <= 1) return;
        void runPrescriptionSave(() =>
            onPrescribeSeries({
                series: currentSeries.slice(0, -1),
                timed: !!exercise.timed,
                series_label: undefined,
            }),
        );
    };

    return (
        <>
            {/* Modal Principal do Exercício */}
            <Modal
                open={!!exercise}
                onClose={onClose ?? (() => {})}
                title={exercise.name}
            >
                <div>
                    <div className={styles.thumbnailSection}>
                        <div
                            onClick={handleOpenVideoPlayer}
                            className={styles.thumbnailLink}
                            style={{
                                cursor: exercise.video_url
                                    ? 'pointer'
                                    : 'default',
                                aspectRatio: thumbAspectRatio ?? undefined,
                            }}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ')
                                    handleOpenVideoPlayer();
                            }}
                        >
                            {exercise.video_url &&
                            !embedUrl &&
                            !isExternalRedirectOnly ? (
                                <>
                                    <video
                                        src={exercise.video_url}
                                        poster={
                                            exercise.video_thumb || undefined
                                        }
                                        autoPlay
                                        muted
                                        loop
                                        playsInline
                                        className={styles.thumbnailImage}
                                        style={{ objectFit: 'contain' }}
                                        onLoadedMetadata={(e) => {
                                            const { videoWidth, videoHeight } =
                                                e.currentTarget;
                                            if (videoWidth && videoHeight) {
                                                setThumbAspectRatio(
                                                    snapToStandardAspectRatio(
                                                        videoWidth /
                                                            videoHeight,
                                                    ),
                                                );
                                            }
                                        }}
                                    />
                                    <div className={styles.playBadge}>
                                        ▶ ver completo
                                    </div>
                                </>
                            ) : exercise.video_thumb ? (
                                <img
                                    src={exercise.video_thumb}
                                    alt={`Ver vídeo para ${exercise.name}`}
                                    className={styles.thumbnailImage}
                                    onError={(e) => {
                                        (
                                            e.target as HTMLImageElement
                                        ).style.display = 'none';
                                    }}
                                />
                            ) : exercise.video_url && isExternalRedirectOnly ? (
                                <div className={styles.thumbnailPlaceholder}>
                                    {isInstagramUrl(exercise.video_url) ? (
                                        <FiImage />
                                    ) : (
                                        <FiMusic />
                                    )}
                                </div>
                            ) : (
                                <div className={styles.thumbnailPlaceholder}>
                                    {exercise.video_url ? <FiVideo /> : <FiActivity />}
                                </div>
                            )}
                        </div>
                    </div>
                    <div className={styles.contentLayout}>
                        <div className={styles.detailsSection}>
                            <h3 className={styles.exerciseTitle}>
                                {exercise.name}
                            </h3>
                            {onStartCircuit && (
                                <div className={styles.circuitCallout}>
                                    <span>
                                        Este exercício faz parte de um{' '}
                                        <strong>circuito</strong>.
                                    </span>
                                    <button
                                        type="button"
                                        className={styles.circuitStartBtn}
                                        onClick={onStartCircuit}
                                    >
                                        <FiPlay /> Iniciar circuito
                                    </button>
                                </div>
                            )}
                            {onReplace && (
                                <button
                                    type="button"
                                    className={styles.replaceBtn}
                                    onClick={onReplace}
                                    title="Trocar por outro exercício da biblioteca, mantendo séries, carga e posição"
                                >
                                    <FiRepeat /> Trocar exercício
                                </button>
                            )}
                            {exercise.non_substitutable === true && (
                                <p
                                    className={styles.timedInfo}
                                    style={{
                                        background: 'rgba(255,107,107,0.12)',
                                        color: 'var(--coral, #ff6b6b)',
                                        border: '1px solid rgba(255,107,107,0.25)',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '0.3rem',
                                    }}
                                >
                                    <FiLock /> Não-substituível
                                    {exercise.non_substitutable_source ===
                                        'derivado' &&
                                        exercise.non_substitutable_reason &&
                                        ` · ${exercise.non_substitutable_reason}`}{' '}
                                    <HelpTooltip
                                        text={
                                            getGlossaryTerm('nao-substituivel')
                                                .short
                                        }
                                        href="/ajuda#glossario-nao-substituivel"
                                        label="Ajuda sobre não-substituível"
                                    />
                                </p>
                            )}
                            <div className={styles.detailRow}>
                                    <div
                                        className={
                                            isSeriesEditing
                                                ? `${styles.repet} ${styles.repetEditing}`
                                                : styles.repet
                                        }
                                    >
                                        <strong>Repetições:</strong>{' '}
                                        <HelpTooltip
                                            text={getGlossaryTerm('series-repeticoes').short}
                                            href="/ajuda#glossario-series-repeticoes"
                                            label="Ajuda sobre séries e repetições"
                                        />
                                        {onPrescribeSeries &&
                                        isSeriesEditing ? (
                                            <div
                                                className={styles.seriesEditRow}
                                            >
                                                {seriesDraft.mode === 'free' ? (
                                                    <>
                                                        <input
                                                            type="number"
                                                            autoFocus
                                                            min="1"
                                                            max={MAX_SETS}
                                                            value={
                                                                seriesDraft.sets
                                                            }
                                                            onChange={(e) =>
                                                                setSeriesDraft({
                                                                    ...seriesDraft,
                                                                    sets: e
                                                                        .target
                                                                        .value,
                                                                })
                                                            }
                                                            onKeyDown={
                                                                handleSeriesKeyDown
                                                            }
                                                            placeholder="Séries"
                                                            aria-label="Quantidade de séries (opcional — deixe em branco se o texto já descrever todas as séries)"
                                                            className={
                                                                styles.seriesNumInput
                                                            }
                                                        />
                                                        <span aria-hidden>
                                                            ×
                                                        </span>
                                                        <input
                                                            type="text"
                                                            value={
                                                                seriesDraft.free
                                                            }
                                                            onChange={(e) =>
                                                                setSeriesDraft({
                                                                    ...seriesDraft,
                                                                    free: e
                                                                        .target
                                                                        .value,
                                                                })
                                                            }
                                                            onKeyDown={
                                                                handleSeriesKeyDown
                                                            }
                                                            placeholder="Ex: 8 a 10"
                                                            aria-label="Descrição livre das séries"
                                                            className={
                                                                styles.seriesFreeInput
                                                            }
                                                        />
                                                    </>
                                                ) : (
                                                    <>
                                                        <input
                                                            type="number"
                                                            autoFocus
                                                            min="1"
                                                            max={MAX_SETS}
                                                            value={
                                                                seriesDraft.sets
                                                            }
                                                            onChange={(e) =>
                                                                setSeriesDraft({
                                                                    ...seriesDraft,
                                                                    sets: e
                                                                        .target
                                                                        .value,
                                                                })
                                                            }
                                                            onKeyDown={
                                                                handleSeriesKeyDown
                                                            }
                                                            aria-label="Quantidade de séries"
                                                            className={
                                                                styles.seriesNumInput
                                                            }
                                                        />
                                                        <span aria-hidden>×</span>
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            max={
                                                                MAX_SERIES_VALUE
                                                            }
                                                            value={
                                                                seriesDraft.value
                                                            }
                                                            onChange={(e) =>
                                                                setSeriesDraft({
                                                                    ...seriesDraft,
                                                                    value: e
                                                                        .target
                                                                        .value,
                                                                })
                                                            }
                                                            onKeyDown={
                                                                handleSeriesKeyDown
                                                            }
                                                            aria-label={
                                                                seriesDraft.mode ===
                                                                'time'
                                                                    ? 'Segundos por série'
                                                                    : 'Repetições por série'
                                                            }
                                                            className={
                                                                styles.seriesNumInput
                                                            }
                                                        />
                                                        <span
                                                            className={
                                                                styles.seriesUnit
                                                            }
                                                        >
                                                            {seriesDraft.mode ===
                                                            'time'
                                                                ? 'seg'
                                                                : 'reps'}
                                                        </span>
                                                    </>
                                                )}
                                                <button
                                                    type="button"
                                                    className={
                                                        styles.seriesEditConfirm
                                                    }
                                                    onClick={handleSeriesSave}
                                                    aria-label="Salvar séries"
                                                    title="Salvar"
                                                >
                                                    <FiCheck />
                                                </button>
                                                <button
                                                    type="button"
                                                    className={
                                                        styles.seriesEditCancel
                                                    }
                                                    onClick={
                                                        handleSeriesEditCancel
                                                    }
                                                    aria-label="Cancelar edição das séries"
                                                    title="Cancelar"
                                                >
                                                    <FiX />
                                                </button>
                                            </div>
                                        ) : onPrescribeSeries ? (
                                            <>
                                            <button
                                                type="button"
                                                className={styles.valueBoxBtn}
                                                onClick={handleSeriesEditStart}
                                                title="Alterar as séries prescritas"
                                            >
                                                <span>
                                                    {formatSeries(exercise)}
                                                </span>
                                                <svg
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    viewBox="0 0 24 24"
                                                    width="1em"
                                                    height="1em"
                                                    fill="currentColor"
                                                    className={styles.editIcon}
                                                    aria-hidden
                                                >
                                                    <path
                                                        fillRule="evenodd"
                                                        clipRule="evenodd"
                                                        d="M15.023 6.27l1.707 1.707-8.486 8.485-1.707-1.707 8.486-8.485zM13.5 4a1.5 1.5 0 011.06.44l6 6a1.5 1.5 0 010 2.12l-6 6a1.5 1.5 0 01-2.12 0l-6-6a1.5 1.5 0 010-2.12l6-6A1.5 1.5 0 0113.5 4zm-1.06 2.44l-6 6a.5.5 0 00.707.707L13.5 7.14a.5.5 0 00-.707-.707z"
                                                    />
                                                </svg>
                                            </button>
                                            {canStepSets &&
                                                (confirmRemoveSet ? (
                                                    <div
                                                        className={
                                                            styles.setStepConfirm
                                                        }
                                                        role="alertdialog"
                                                        aria-label="Confirmar remoção de série"
                                                    >
                                                        <span>
                                                            Remover a última
                                                            série?
                                                        </span>
                                                        <button
                                                            type="button"
                                                            className={
                                                                styles.setStepDanger
                                                            }
                                                            onClick={
                                                                handleRemoveSetConfirmed
                                                            }
                                                        >
                                                            Remover
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className={
                                                                styles.setStepCancel
                                                            }
                                                            onClick={() =>
                                                                setConfirmRemoveSet(
                                                                    false,
                                                                )
                                                            }
                                                        >
                                                            Cancelar
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div
                                                        className={
                                                            styles.setStepRow
                                                        }
                                                    >
                                                        <button
                                                            type="button"
                                                            className={
                                                                styles.setStepBtn
                                                            }
                                                            onClick={
                                                                handleAddSet
                                                            }
                                                            disabled={
                                                                currentSeries.length >=
                                                                    MAX_SETS ||
                                                                prescriptionStatus ===
                                                                    'saving'
                                                            }
                                                            aria-label="Adicionar uma série"
                                                            title="Adicionar uma série"
                                                        >
                                                            <FiPlus />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className={`${styles.setStepBtn} ${styles.setStepBtnRemove}`}
                                                            onClick={() =>
                                                                setConfirmRemoveSet(
                                                                    true,
                                                                )
                                                            }
                                                            disabled={
                                                                currentSeries.length <=
                                                                    1 ||
                                                                prescriptionStatus ===
                                                                    'saving'
                                                            }
                                                            aria-label="Remover uma série"
                                                            title="Remover uma série"
                                                        >
                                                            <FiX />
                                                        </button>
                                                    </div>
                                                ))}
                                            </>
                                        ) : (
                                            <div className={styles.valueBox}>
                                                <span>
                                                    {formatSeries(exercise)}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <strong>Peso (KG):</strong>{' '}
                                        <HelpTooltip
                                            text={getGlossaryTerm('carga').short}
                                            href="/ajuda#glossario-carga"
                                            label="Ajuda sobre carga"
                                        />
                                        <div
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                flexWrap: 'wrap',
                                                gap: '0.4rem',
                                            }}
                                        >
                                        {readOnly && onPrescribeWeight ? (
                                            isPrescribedWeightEditing ? (
                                                <div
                                                    className={
                                                        styles.seriesEditRow
                                                    }
                                                >
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        step="0.5"
                                                        className={
                                                            styles.seriesNumInput
                                                        }
                                                        value={
                                                            prescribedWeightValue
                                                        }
                                                        autoFocus
                                                        onChange={(e) =>
                                                            setPrescribedWeightValue(
                                                                e.target.value,
                                                            )
                                                        }
                                                        onKeyDown={
                                                            handlePrescribedWeightKeyDown
                                                        }
                                                        aria-label="Carga prescrita em kg"
                                                    />
                                                    <span
                                                        className={
                                                            styles.seriesUnit
                                                        }
                                                    >
                                                        kg
                                                    </span>
                                                    <button
                                                        type="button"
                                                        className={
                                                            styles.seriesEditConfirm
                                                        }
                                                        onClick={
                                                            handlePrescribedWeightConfirm
                                                        }
                                                        aria-label="Salvar carga prescrita"
                                                        title="Salvar"
                                                    >
                                                        <FiCheck />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className={
                                                            styles.seriesEditCancel
                                                        }
                                                        onClick={
                                                            handlePrescribedWeightCancel
                                                        }
                                                        aria-label="Cancelar edição da carga"
                                                        title="Cancelar"
                                                    >
                                                        <FiX />
                                                    </button>
                                                </div>
                                            ) : (
                                                <button
                                                    type="button"
                                                    className={
                                                        styles.valueBoxBtn
                                                    }
                                                    onClick={
                                                        handlePrescribedWeightEditStart
                                                    }
                                                    title="Alterar a carga prescrita"
                                                >
                                                    {prescribedWeightValue !== ''
                                                        ? `${prescribedWeightValue} kg (prescrito)`
                                                        : 'Sem carga prescrita'}
                                                    <svg
                                                        xmlns="http://www.w3.org/2000/svg"
                                                        viewBox="0 0 24 24"
                                                        width="1em"
                                                        height="1em"
                                                        fill="currentColor"
                                                        className={styles.editIcon}
                                                    >
                                                        <path
                                                            fillRule="evenodd"
                                                            clipRule="evenodd"
                                                            d="M15.023 6.27l1.707 1.707-8.486 8.485-1.707-1.707 8.486-8.485zM13.5 4a1.5 1.5 0 011.06.44l6 6a1.5 1.5 0 010 2.12l-6 6a1.5 1.5 0 01-2.12 0l-6-6a1.5 1.5 0 010-2.12l6-6A1.5 1.5 0 0113.5 4zm-1.06 2.44l-6 6a.5.5 0 00.707.707L13.5 7.14a.5.5 0 00-.707-.707z"
                                                        />
                                                    </svg>
                                                </button>
                                            )
                                        ) : readOnly ? (
                                            <span className={styles.valueBox}>
                                                {exercise.plannedWeight
                                                    ? `${exercise.plannedWeight} kg (prescrito)`
                                                    : 'Sem carga prescrita'}
                                            </span>
                                        ) : isWeightEditing ? (
                                            <input
                                                type="number"
                                                className={styles.valueBox}
                                                value={weightValue}
                                                onChange={(e) =>
                                                    setWeightValue(
                                                        e.target.value,
                                                    )
                                                }
                                                onBlur={handleWeightEditEnd} // Salvar ao perder o foco
                                                onKeyDown={handleWeightKeyDown} // Salvar ao pressionar Enter
                                            />
                                        ) : (
                                            <span
                                                className={styles.valueBox}
                                                onClick={handleWeightEditStart}
                                            >
                                                {weightValue !== ''
                                                    ? `${weightValue} kg`
                                                    : 'Peso'}
                                                {/* Renderizar o ícone de edição aqui */}
                                                <svg
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    viewBox="0 0 24 24"
                                                    width="1em"
                                                    height="1em"
                                                    fill="currentColor"
                                                    className={styles.editIcon}
                                                >
                                                    <path
                                                        fillRule="evenodd"
                                                        clipRule="evenodd"
                                                        d="M15.023 6.27l1.707 1.707-8.486 8.485-1.707-1.707 8.486-8.485zM13.5 4a1.5 1.5 0 011.06.44l6 6a1.5 1.5 0 010 2.12l-6 6a1.5 1.5 0 01-2.12 0l-6-6a1.5 1.5 0 010-2.12l6-6A1.5 1.5 0 0113.5 4zm-1.06 2.44l-6 6a.5.5 0 00.707.707L13.5 7.14a.5.5 0 00-.707-.707z"
                                                    />
                                                </svg>
                                            </span>
                                        )}
                                        {!readOnly && recommendedWeight != null && (
                                            <button
                                                type="button"
                                                className={styles.recommendedWeightChip}
                                                onClick={handleApplyRecommendedWeight}
                                                title={
                                                    loadSuggestion?.reason ??
                                                    'Sugestão baseada no Controle do Microciclo (Autorregulação)'
                                                }
                                            >
                                                Sugerido: {recommendedWeight} kg
                                            </button>
                                        )}
                                        </div>
                                        {weightSaveStatus !== 'idle' && (
                                            <p
                                                className={
                                                    weightSaveStatus === 'error'
                                                        ? styles.annotationsStatusError
                                                        : styles.annotationsStatus
                                                }
                                            >
                                                {weightSaveStatus === 'saved' && (
                                                    <>
                                                        <FiCheck /> Peso salvo.
                                                    </>
                                                )}
                                                {weightSaveStatus ===
                                                    'saved-offline' && (
                                                    <>
                                                        <FiSave /> Salvo neste dispositivo — sem conexão para sincronizar agora.
                                                    </>
                                                )}
                                                {weightSaveStatus === 'error' &&
                                                    'Não foi possível salvar o peso. Tente novamente.'}
                                            </p>
                                        )}
                                        {loadSuggestion?.abovePrescribed && (
                                            <p
                                                className="small"
                                                style={{
                                                    color: 'var(--coral, #ff6b6b)',
                                                    marginTop: '0.25rem',
                                                }}
                                            >
                                                Acima da carga prescrita pelo
                                                personal — considere revisar
                                                com ele.
                                            </p>
                                        )}
                                    </div>
                                </div>
                                {/* Sem este aviso a edição fica invisível: os
                                    dois campos parecem rótulos, e o lápis
                                    sozinho não diz que o valor é do ALUNO. */}
                                {(onPrescribeSeries || onPrescribeWeight) &&
                                    prescriptionStatus === 'idle' &&
                                    !isSeriesEditing &&
                                    !isPrescribedWeightEditing && (
                                        <p className={styles.prescriptionHint}>
                                            Toque{' '}
                                            {onPrescribeSeries
                                                ? 'nas séries ou na carga'
                                                : 'na carga'}{' '}
                                            para ajustar a prescrição do aluno.
                                        </p>
                                    )}
                                {/* Andamento da gravação da PRESCRIÇÃO (personal).
                                    Fica fora das duas colunas porque vale para
                                    séries e carga. */}
                                {prescriptionStatus !== 'idle' && (
                                    <p
                                        role={
                                            prescriptionStatus === 'error'
                                                ? 'alert'
                                                : 'status'
                                        }
                                        className={
                                            prescriptionStatus === 'error'
                                                ? styles.annotationsStatusError
                                                : styles.annotationsStatus
                                        }
                                    >
                                        {prescriptionStatus === 'saving' && (
                                            <>
                                                <FiSave /> Salvando prescrição...
                                            </>
                                        )}
                                        {prescriptionStatus === 'saved' && (
                                            <>
                                                <FiCheck /> Prescrição atualizada
                                                para o aluno.
                                            </>
                                        )}
                                        {prescriptionStatus === 'saved-offline' && (
                                            <>
                                                <FiSave /> Salvo neste
                                                dispositivo — sem conexão para
                                                enviar ao aluno agora. Será
                                                sincronizado automaticamente.
                                            </>
                                        )}
                                        {prescriptionStatus === 'error' && (
                                            <>
                                                <FiAlertCircle />{' '}
                                                {prescriptionError}
                                            </>
                                        )}
                                    </p>
                                )}
                                {onEquipmentUnavailable && (
                                    <button
                                        type="button"
                                        className={styles.watchVideoLink}
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            cursor: 'pointer',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '0.35rem',
                                            padding: 0,
                                            marginTop: '0.5rem',
                                        }}
                                        onClick={() => onEquipmentUnavailable(exercise)}
                                    >
                                        <FiAlertCircle /> Equipamento indisponível?
                                    </button>
                                )}
                                {exercise.variations && (
                                    <div className={styles.detailRow}>
                                        <p>
                                            <strong>Variações:</strong>{' '}
                                            <HelpTooltip
                                                text={getGlossaryTerm('variacoes').short}
                                                href="/ajuda#glossario-variacoes"
                                                label="Ajuda sobre variações"
                                            />{' '}
                                            {exercise.variations}
                                        </p>
                                    </div>
                                )}
                                {exercise.timed && (
                                    <>
                                        <p className={styles.timedInfo}>
                                            Controlado por tempo
                                        </p>
                                        {/* Contador regressivo por série, para
                                            o aluno e o personal — sem ele os
                                            dois cronometravam fora do app.
                                            key: outro exercício, contador novo. */}
                                        <SeriesTimer
                                            key={exercise.id}
                                            durations={(
                                                exercise.series ?? []
                                            ).filter((d) => d > 0)}
                                            exerciseName={exercise.name}
                                        />
                                    </>
                                )}
                                {exercise.video_url &&
                                    !exercise.video_thumb && (
                                        <p>
                                            <strong>Vídeo:</strong>{' '}
                                            <a
                                                href="#" // Poderia também abrir o player interno
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    handleOpenVideoPlayer();
                                                }}
                                                className={
                                                    styles.watchVideoLink
                                                }
                                            >
                                                Assistir exemplo
                                            </a>
                                        </p>
                                    )}
                                {/* Observações do Exercício (renomeado de Anotações) */}
                                {exercise.notes && (
                                    <div className={styles.notesSection}>
                                        <p>
                                            <strong>Observações:</strong>
                                        </p>
                                        <p>{exercise.notes}</p>
                                    </div>
                                )}
                                {/* Técnica de treinamento avançada marcada pelo personal */}
                                {exercise.technique && (
                                    <div className={styles.notesSection}>
                                        <p>
                                            <strong>Técnica:</strong>{' '}
                                            <TechniqueHelpTooltip
                                                technique={exercise.technique}
                                                params={exercise.technique_params}
                                            />
                                        </p>
                                        <p>
                                            {formatTechniqueSummary(
                                                exercise.technique,
                                                exercise.technique_params,
                                            )}
                                        </p>
                                    </div>
                                )}
                                {exercise.group_technique && (
                                    <div className={styles.notesSection}>
                                        <p>
                                            <strong>Combinação:</strong>{' '}
                                            <HelpTooltip
                                                text={getGlossaryTerm('combinacao').short}
                                                href="/ajuda#glossario-combinacao"
                                                label="Ajuda sobre combinação de exercícios"
                                            />
                                        </p>
                                        <p>
                                            {groupTechniqueLabel(
                                                exercise.group_technique,
                                            )}
                                        </p>
                                    </div>
                                )}
                                {/* Intensidade prescrita (% de 1RM, cadência,
                                    RPE). A carga em kg fica no topo do card. */}
                                {(exercise.loadPercentage ||
                                    exercise.tempoSeconds ||
                                    exercise.rpeTarget) && (
                                    <div className={styles.notesSection}>
                                        <p>
                                            <strong>Intensidade:</strong>
                                        </p>
                                        <ul className={styles.intensityList}>
                                            {exercise.loadPercentage ? (
                                                <li>
                                                    {exercise.loadPercentage}% de
                                                    1RM{' '}
                                                    <HelpTooltip
                                                        text={getGlossaryTerm('1rm').short}
                                                        href="/ajuda#glossario-1rm"
                                                        label="Ajuda sobre 1RM"
                                                    />
                                                </li>
                                            ) : null}
                                            {exercise.tempoSeconds ? (
                                                <li>
                                                    Cadência:{' '}
                                                    {exercise.tempoSeconds} s por
                                                    repetição{' '}
                                                    <HelpTooltip
                                                        text={getGlossaryTerm('cadencia').short}
                                                        href="/ajuda#glossario-cadencia"
                                                        label="Ajuda sobre cadência"
                                                    />
                                                </li>
                                            ) : null}
                                            {exercise.rpeTarget ? (
                                                <li>
                                                    Esforço alvo: RPE{' '}
                                                    {exercise.rpeTarget} de 10{' '}
                                                    <HelpTooltip
                                                        text={getGlossaryTerm('rpe').short}
                                                        href="/ajuda#glossario-rpe"
                                                        label="Ajuda sobre RPE"
                                                    />
                                                </li>
                                            ) : null}
                                        </ul>
                                    </div>
                                )}
                                {/* Instruções do personal trainer (campo comments) */}
                                {exercise.comments && (
                                    <div className={styles.notesSection}>
                                        <p>
                                            <strong>
                                                Instruções do Personal:
                                            </strong>
                                        </p>
                                        <p>{exercise.comments}</p>
                                    </div>
                                )}
                                {editor && (
                                    <div className={styles.collapsibleCard}>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setEditorOpen((v) => !v)
                                            }
                                            aria-expanded={editorOpen}
                                            className={styles.collapsibleToggle}
                                        >
                                            <span
                                                className={
                                                    styles.collapsibleTitle
                                                }
                                            >
                                                Editar tudo neste exercício
                                            </span>
                                            <span
                                                aria-hidden
                                                className={
                                                    editorOpen
                                                        ? styles.collapsibleChevronOpen
                                                        : styles.collapsibleChevron
                                                }
                                            >
                                                ▾
                                            </span>
                                        </button>
                                        {/* Sempre montado, só escondido: recolher
                                            não pode jogar fora o que o personal
                                            ainda não salvou. */}
                                        <div
                                            hidden={!editorOpen}
                                            className={styles.editorSection}
                                        >
                                            {editor}
                                        </div>
                                    </div>
                                )}
                                {/* Campo de Anotações do Usuário — omitido em modo somente
                                    leitura, são anotações do próprio aluno */}
                                {!readOnly && (
                                <div className={styles.collapsibleCard}>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setNotesOpen((v) => !v)
                                        }
                                        aria-expanded={notesOpen}
                                        className={styles.collapsibleToggle}
                                    >
                                        <span
                                            className={styles.collapsibleTitle}
                                        >
                                            Minhas Anotações
                                        </span>
                                        <span
                                            aria-hidden
                                            className={
                                                notesOpen
                                                    ? styles.collapsibleChevronOpen
                                                    : styles.collapsibleChevron
                                            }
                                        >
                                            ▾
                                        </span>
                                    </button>
                                    {notesOpen && (
                                        <div className={styles.collapsibleBody}>
                                            <textarea
                                                value={userAnnotations}
                                                onChange={
                                                    handleAnnotationsChange
                                                }
                                                className={
                                                    styles.userAnnotationsInput
                                                }
                                                placeholder="Adicione suas anotações aqui..."
                                            />
                                            <Button
                                                variant="primary"
                                                size="sm"
                                                isLoading={isSavingAnnotations}
                                                onClick={handleSaveAnnotations}
                                            >
                                                Salvar
                                            </Button>
                                            {annotationsStatus !== 'idle' && (
                                                <p
                                                    className={
                                                        annotationsStatus ===
                                                        'error'
                                                            ? styles.annotationsStatusError
                                                            : styles.annotationsStatus
                                                    }
                                                >
                                                    {annotationsStatus ===
                                                        'saved' && (
                                                        <>
                                                            <FiCheck /> Anotações salvas.
                                                        </>
                                                    )}
                                                    {annotationsStatus ===
                                                        'saved-offline' && (
                                                        <>
                                                            <FiSave /> Salvo neste dispositivo — sem conexão para sincronizar agora.
                                                        </>
                                                    )}
                                                    {annotationsStatus ===
                                                        'error' &&
                                                        'Não foi possível salvar. Tente novamente.'}
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </div>
                                )}
                                {/* Bloco de bi-set/triset/superset: sem descanso até o
                                    último exercício do bloco — troca o timer por um
                                    atalho direto para o próximo. */}
                                {nextInGroup ? (
                                    <div className={styles.restTimerSection}>
                                        <p className={styles.noRestNotice}>
                                            <strong>Sem descanso</strong> —
                                            siga direto para o próximo
                                            exercício do bloco.
                                        </p>
                                        <Button
                                            variant="primary"
                                            size="sm"
                                            rightIcon={<FiChevronRight />}
                                            onClick={() =>
                                                onSelectExercise?.(
                                                    nextInGroup,
                                                )
                                            }
                                        >
                                            Ir para {nextInGroup.name}
                                        </Button>
                                    </div>
                                ) : (
                                    (exercise.restTime ?? 0) > 0 && (
                                    <div className={styles.restTimerSection}>
                                        <div className={styles.timerDisplay}>
                                            <span
                                                className={styles.timerValue}
                                            >
                                                {formatTime(timerValue)}
                                            </span>
                                            <span
                                                className={styles.timerLabel}
                                            >
                                                Descanso entre exercícios{' '}
                                                <HelpTooltip
                                                    text={getGlossaryTerm('descanso').short}
                                                    href="/ajuda#glossario-descanso"
                                                    label="Ajuda sobre descanso entre exercícios"
                                                />
                                            </span>
                                        </div>
                                        <div className={styles.timerControls}>
                                            {!isTimerRunning &&
                                                timerValue > 0 && (
                                                    <Button
                                                        variant="primary"
                                                        size="sm"
                                                        onClick={
                                                            handleStartTimer
                                                        }
                                                    >
                                                        Iniciar
                                                    </Button>
                                                )}
                                            {isTimerRunning && (
                                                <Button
                                                    variant="primary"
                                                    size="sm"
                                                    onClick={handlePauseTimer}
                                                >
                                                    Pausar
                                                </Button>
                                            )}
                                            <Button
                                                variant="primary"
                                                size="sm"
                                                onClick={handleResetTimer}
                                            >
                                                Resetar
                                            </Button>
                                        </div>
                                    </div>
                                    )
                                )}
                            </div>
                        </div>
                    </div>
            </Modal>

            {/* Modal do Player de Vídeo */}
            <Modal open={isVideoPlayerOpen} onClose={handleCloseVideoPlayer}>
                {renderVideoModalContent()}
            </Modal>
        </>
    );
};

export default ExerciseDetailCard;
