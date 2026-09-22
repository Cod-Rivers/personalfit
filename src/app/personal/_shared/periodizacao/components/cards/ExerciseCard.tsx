'use client';

import { FiPlay, FiRepeat } from 'react-icons/fi';
import ExerciseThumbnail from '@/components/features/ExerciseThumbnail';
import HelpTooltip from '@/components/atoms/HelpTooltip';
import { getGlossaryTerm } from '@/libs/glossaryContent';
import type { LocalExercise } from '../../lib/mesocycleTransforms';
import {
    EXERCISE_TABS,
    type ExerciseTab,
} from '../../lib/editorNavigation';
import {
    PrescriptionNumber,
    LoadPercentageWarning,
    MuscleGroupSelect,
    NonSubstitutableSelect,
    TechniqueBlock,
    TECHNIQUE_FIELD_MAP,
} from '../fields/PrescriptionFields';
import ExerciseVideoField from '../ExerciseVideoField';
import type { ResolvedVideoLink } from '@/libs/exerciseVideoService';
import s from '../../builder.module.css';

type UpdateField = keyof Omit<LocalExercise, '_id'>;

/**
 * Card de UM exercício, em três abas: Prescrição, Técnica e Mídia e notas.
 *
 * Prescrição junta volume (séries, descanso) e intensidade (carga, % de 1RM,
 * cadência, RPE). Eram duas abas, Série e Prescrição, sem nenhum campo de uma
 * depender da outra — e é justamente a relação entre elas que importa: as
 * séries dizem quanto, a intensidade diz com que peso e esforço. Separadas, o
 * personal prescrevia uma sem ver a outra. Técnica e Mídia quase nunca mudam
 * depois do primeiro cadastro.
 */
export default function ExerciseCard({
    exercise,
    tab,
    onTabChange,
    onUpdate,
    onSetVideo,
    onPreview,
    onReplace,
    resolveVideoLink,
    videoPlanHint,
    withoutQuickFields,
}: {
    exercise: LocalExercise;
    tab: ExerciseTab;
    onTabChange: (tab: ExerciseTab) => void;
    onUpdate: (field: UpdateField, value: string | boolean) => void;
    onSetVideo: (videoUrl: string, videoThumb: string) => void;
    /** Ausente = sem a miniatura clicável (ex.: o editor embutido no próprio
     * card do aluno, que já está mostrando o vídeo logo acima). */
    onPreview?: () => void;
    /** Troca por outro exercício da biblioteca mantendo posição e prescrição.
     * Ausente = sem botão (ex.: telas que não têm o picker). */
    onReplace?: () => void;
    /** Repassados ao campo de vídeo — ver ExerciseVideoField. Ausentes, valem
     * o endpoint e a regra de plano do personal. */
    resolveVideoLink?: (videoUrl: string) => Promise<ResolvedVideoLink>;
    videoPlanHint?: string;
    /** Sem séries e carga: quem usa já mostra os dois fora daqui (o card do
     * aluno, que edita os dois no topo). Mostrar o mesmo campo em dois lugares
     * era o que confundia. */
    withoutQuickFields?: boolean;
}) {
    const ex = exercise;
    const tabs = EXERCISE_TABS;

    const restField = (
        <div className={s.formGroup}>
            <label className={s.formLabel}>
                Descanso entre séries{' '}
                <HelpTooltip
                    text={getGlossaryTerm('descanso').short}
                    href="/ajuda#glossario-descanso"
                    label="Ajuda sobre descanso entre séries"
                />
            </label>
            <div className={s.seriesSubfieldRow}>
                <input
                    type="number"
                    min="0"
                    step="5"
                    value={ex.rest_seconds}
                    onChange={(e) =>
                        onUpdate('rest_seconds', e.target.value)
                    }
                    placeholder="90"
                    className={s.smallNumInput}
                    aria-label="Descanso em segundos"
                />
                <span className={s.seriesUnitLabel}>segundos</span>
            </div>
            <small className={s.fieldHint}>
                Alimenta o cronômetro de descanso do aluno.
            </small>
        </div>
    );

    return (
        <>
            <div className={s.exerciseCardHeader}>
                {onPreview && (
                    <button
                        type="button"
                        className={s.exerciseRowThumbBtn}
                        title={`Ver vídeo e detalhes de ${ex.name || 'exercício'}`}
                        aria-label={`Ver vídeo e detalhes de ${ex.name || 'exercício'}`}
                        onClick={onPreview}
                    >
                        <ExerciseThumbnail
                            name={ex.name || 'Exercício'}
                            videoThumb={ex.video_thumb}
                            videoUrl={ex.video_url}
                            width={56}
                            height={56}
                            borderRadius={10}
                            captureFrame={false}
                            lazyCapture
                        />
                        <span className={s.exerciseRowThumbPlay} aria-hidden>
                            <FiPlay />
                        </span>
                    </button>
                )}
                <input
                    value={ex.name}
                    onChange={(e) => onUpdate('name', e.target.value)}
                    placeholder="Nome do exercício"
                    className={s.formInput}
                    aria-label="Nome do exercício"
                />
                {onReplace && (
                    <button
                        type="button"
                        className={s.btnSmall}
                        onClick={onReplace}
                        title="Trocar por outro exercício da biblioteca, mantendo séries, carga e posição"
                    >
                        <FiRepeat /> Trocar
                    </button>
                )}
            </div>

            <div className={s.cardTabs} role="tablist">
                {tabs.map((t) => (
                    <button
                        key={t.id}
                        type="button"
                        role="tab"
                        aria-selected={tab === t.id}
                        className={tab === t.id ? s.cardTabActive : s.cardTab}
                        onClick={() => onTabChange(t.id)}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            {tab === 'prescricao' && !withoutQuickFields && (
                <>
                    <div className={s.formGroup}>
                        <label className={s.formLabel}>
                            Séries{' '}
                            <HelpTooltip
                                text={
                                    getGlossaryTerm('series-repeticoes').short
                                }
                                href="/ajuda#glossario-series-repeticoes"
                                label="Ajuda sobre séries e repetições"
                            />
                        </label>
                        <select
                            value={ex.series_mode}
                            onChange={(e) =>
                                onUpdate('series_mode', e.target.value)
                            }
                            className={s.formSelect}
                        >
                            <option value="reps">
                                Reps (séries × repetições)
                            </option>
                            <option value="time">Tempo (min/seg)</option>
                            <option value="free">Livre (texto)</option>
                        </select>

                        {ex.series_mode !== 'free' && (
                            <div className={s.seriesSubfieldRow}>
                                <input
                                    type="number"
                                    min="1"
                                    value={ex.series_sets}
                                    onChange={(e) =>
                                        onUpdate('series_sets', e.target.value)
                                    }
                                    placeholder="Séries"
                                    className={s.smallNumInput}
                                    aria-label="Quantidade de séries"
                                />
                                <span className={s.seriesTimesSign}>×</span>
                                <input
                                    type="number"
                                    min="1"
                                    value={ex.series_value}
                                    onChange={(e) =>
                                        onUpdate('series_value', e.target.value)
                                    }
                                    placeholder={
                                        ex.series_mode === 'time'
                                            ? 'Segundos'
                                            : 'Reps'
                                    }
                                    className={s.smallNumInput}
                                    aria-label={
                                        ex.series_mode === 'time'
                                            ? 'Segundos por série'
                                            : 'Repetições por série'
                                    }
                                />
                                <span className={s.seriesUnitLabel}>
                                    {ex.series_mode === 'time' ? 'seg' : 'reps'}
                                </span>
                            </div>
                        )}

                        {ex.series_mode === 'free' && (
                            <div style={{ marginTop: 8 }}>
                                <div className={s.seriesSubfieldRow}>
                                    <input
                                        type="number"
                                        min="1"
                                        value={ex.series_sets}
                                        onChange={(e) =>
                                            onUpdate(
                                                'series_sets',
                                                e.target.value,
                                            )
                                        }
                                        placeholder="Séries"
                                        className={s.smallNumInput}
                                        aria-label="Quantidade de séries (opcional)"
                                    />
                                    <span className={s.seriesTimesSign}>
                                        ×
                                    </span>
                                    <input
                                        value={ex.series_free}
                                        onChange={(e) =>
                                            onUpdate(
                                                'series_free',
                                                e.target.value,
                                            )
                                        }
                                        placeholder="Ex: 8 a 10 reps"
                                        className={s.formInput}
                                        aria-label="Descrição livre das séries"
                                    />
                                </div>
                                <small className={s.fieldHint}>
                                    Quantidade de séries é opcional aqui — só
                                    preencha se o texto acima descrever UMA
                                    série repetida (ex.: &ldquo;8 a 10
                                    reps&rdquo; × 3). Deixe em branco se o
                                    texto já descreve a progressão inteira
                                    (ex.: &ldquo;8 até a falha + 5 a 6 rep + 1
                                    a 3 rep&rdquo;).
                                </small>
                            </div>
                        )}
                    </div>
                </>
            )}

            {tab === 'prescricao' && restField}
            {tab === 'prescricao' && (
                <div className={s.prescriptionBody}>
                    {!withoutQuickFields && (
                        <PrescriptionNumber
                            label="Carga"
                            unit="kg"
                            min="0"
                            step="0.5"
                            value={ex.load_kg}
                            onChange={(v) => onUpdate('load_kg', v)}
                            helpId="carga"
                        />
                    )}
                    <PrescriptionNumber
                        label="% de 1RM"
                        unit="%"
                        min="0"
                        max="100"
                        value={ex.load_percentage}
                        onChange={(v) => onUpdate('load_percentage', v)}
                        helpId="1rm"
                    />
                    <LoadPercentageWarning
                        loadKg={ex.load_kg}
                        loadPercentage={ex.load_percentage}
                    />
                    <PrescriptionNumber
                        label="Cadência"
                        unit="seg"
                        min="0"
                        value={ex.tempo_seconds}
                        onChange={(v) => onUpdate('tempo_seconds', v)}
                        helpId="cadencia"
                    />
                    <PrescriptionNumber
                        label="RPE alvo"
                        unit="1-10"
                        min="1"
                        max="10"
                        value={ex.rpe_target}
                        onChange={(v) => onUpdate('rpe_target', v)}
                        helpId="rpe"
                    />
                </div>
            )}

            {tab === 'tecnica' && (
                <div className={s.prescriptionBody}>
                    <TechniqueBlock
                        technique={ex.technique}
                        onChangeTechnique={(v) => onUpdate('technique', v)}
                        getParamValue={(key) =>
                            ex[TECHNIQUE_FIELD_MAP[key]] as string
                        }
                        onChangeParam={(key, v) =>
                            onUpdate(TECHNIQUE_FIELD_MAP[key], v)
                        }
                    />
                    <NonSubstitutableSelect
                        value={ex.non_substitutable}
                        onChange={(v) => onUpdate('non_substitutable', v)}
                    />
                </div>
            )}

            {tab === 'midia' && (
                <>
                    <ExerciseVideoField
                        libraryLinked={!!ex.exercise_library_id}
                        videoUrl={ex.video_url}
                        videoThumb={ex.video_thumb}
                        onChange={onSetVideo}
                        resolveLink={resolveVideoLink}
                        planHint={videoPlanHint}
                    />

                    <div className={s.prescriptionBody}>
                        <MuscleGroupSelect
                            value={ex.muscle_group}
                            onChange={(v) => onUpdate('muscle_group', v)}
                        />
                    </div>

                    <div className={s.formGroup}>
                        <label className={s.formLabel}>Variações</label>
                        <input
                            value={ex.variations}
                            onChange={(e) =>
                                onUpdate('variations', e.target.value)
                            }
                            placeholder="Opcional"
                            className={s.formInput}
                        />
                    </div>

                    <div className={s.formGroup}>
                        <label className={s.formLabel}>Observações</label>
                        <textarea
                            value={ex.observations}
                            onChange={(e) =>
                                onUpdate('observations', e.target.value)
                            }
                            placeholder="Observações / instruções do personal (opcional)"
                            className={s.formInput}
                            rows={3}
                            style={{ resize: 'vertical' }}
                        />
                    </div>
                </>
            )}
        </>
    );
}
