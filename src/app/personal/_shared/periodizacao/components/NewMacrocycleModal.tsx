'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { FiCheck, FiFolder } from 'react-icons/fi';
import {
    applyTemplate,
    copyPlanFromStudent,
    createMacrocycle,
    getCopyablePlans,
    type CopyablePlan,
    getMyTemplates,
    getPublicTemplates,
    type MacrocycleResponse,
} from '@/libs/planningService';
import Modal from '@/components/system/Modal';
import { useCardStack } from '@/hooks/useCardStack';
import { localDateKey } from '@/libs/currentWeek';
import type { TrainingLabelPart } from '@/libs/trainingLabel';
import TrainingLabelPartsPicker from './TrainingLabelPartsPicker';
import {
    DURATION_SHORTCUTS_WEEKS,
    defaultPlanName,
    endDateForWeeks,
    matchingShortcut,
    planKindLabel,
    type PlanningMode,
} from '../lib/routineDefaults';
import s from '../builder.module.css';

const NOTES_MAX = 2000;

const schema = z
    .object({
        name: z.string().trim().min(1, 'Dê um nome ao treino'),
        goal: z.string().optional(),
        start_date: z.string().optional(),
        end_date: z.string().optional(),
        notes: z
            .string()
            .max(NOTES_MAX, `Use até ${NOTES_MAX} caracteres`)
            .optional(),
    })
    .refine(
        (data) =>
            !data.start_date ||
            !data.end_date ||
            data.end_date > data.start_date,
        {
            message: 'O término precisa ser depois do início',
            path: ['end_date'],
        },
    );
type FormValues = z.infer<typeof schema>;

type Origin = PlanningMode | 'library' | 'student';
type Step = 'mode' | 'details' | 'library' | 'student';

/* "Rotina" vem primeiro e já marcada: é o fluxo de ficha (dias da semana ou
 * A/B/C) que o personal conhece de outros apps. A periodização continua a um
 * toque, para quem planeja em blocos. */
const ORIGIN_OPTIONS: { origin: Origin; title: string; desc: string }[] = [
    {
        origin: 'simple',
        title: 'Treino simples',
        desc: 'Treinos por dia da semana (Segunda, Terça…) ou A/B/C, como uma ficha. O jeito mais rápido de montar.',
    },
    {
        origin: 'library',
        title: 'Copiar da biblioteca',
        desc: 'Comece de um treino que você já salvou (ou da biblioteca pública) e ajuste para este aluno.',
    },
    {
        origin: 'student',
        title: 'Copiar de outro aluno',
        desc: 'Use um treino que você já montou para outro aluno, sem precisar salvar na biblioteca antes.',
    },
    {
        origin: 'periodized',
        title: 'Periodização',
        desc: 'Fases com semanas de ajuste, RPE e deload. Para quem planeja o treino em blocos.',
    },
];

/**
 * "Nova rotina": primeiro COMO começar (rotina, cópia da biblioteca ou
 * periodização), depois os dados — já preenchidos, para o personal só
 * confirmar. Ao criar, quem chama leva direto para montar os treinos.
 */
export default function NewMacrocycleModal({
    studentId,
    onClose,
    onCreated,
}: {
    studentId: string;
    onClose: () => void;
    /** Recebe o plano recém-criado — quem navega é o chamador. */
    onCreated: (macro: MacrocycleResponse) => void;
}) {
    const stack = useCardStack<Step>('mode');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [origin, setOrigin] = useState<Origin>('simple');
    const planningMode: PlanningMode =
        origin === 'periodized' ? 'periodized' : 'simple';
    /** null = ainda não mexeu: segue o padrão do modo (dia da semana na
     * rotina, letra na periodização) quando o modo muda. */
    const [chosenParts, setChosenParts] = useState<TrainingLabelPart[] | null>(
        null,
    );
    const labelParts = useMemo<TrainingLabelPart[]>(
        () =>
            chosenParts ??
            (planningMode === 'simple' ? ['weekday'] : ['letter']),
        [chosenParts, planningMode],
    );
    const [archiveOnEnd, setArchiveOnEnd] = useState(false);

    const today = useMemo(() => new Date(), []);
    const {
        register,
        handleSubmit,
        setValue,
        watch,
        formState: { errors, dirtyFields },
    } = useForm<FormValues>({
        resolver: zodResolver(schema),
        defaultValues: {
            name: defaultPlanName('simple', today),
            goal: '',
            start_date: localDateKey(today),
            end_date: '',
            notes: '',
        },
    });

    // O nome sugerido acompanha o modo enquanto o personal não o editar.
    useEffect(() => {
        if (dirtyFields.name) return;
        setValue('name', defaultPlanName(planningMode, today));
    }, [planningMode, today, setValue, dirtyFields.name]);

    const startDate = watch('start_date') ?? '';
    const endDate = watch('end_date') ?? '';
    const notes = watch('notes') ?? '';
    const activeShortcut = matchingShortcut(startDate, endDate);

    const pickDuration = (weeks: number | null) => {
        const start = startDate || localDateKey(today);
        if (!startDate) setValue('start_date', start);
        setValue('end_date', weeks ? endDateForWeeks(start, weeks) : '', {
            shouldValidate: true,
        });
        if (!weeks) setArchiveOnEnd(false);
    };

    const onSubmit = useCallback(
        async (values: FormValues) => {
            setSubmitting(true);
            setError('');
            try {
                const macro = await createMacrocycle(studentId, {
                    name: values.name.trim(),
                    goal: values.goal?.trim() ?? '',
                    start_date: values.start_date || undefined,
                    end_date: values.end_date || undefined,
                    planning_mode: planningMode,
                    simple_day_label: labelParts.includes('number')
                        ? 'number'
                        : 'weekday',
                    training_label_parts: labelParts,
                    notes: values.notes?.trim() || undefined,
                    archive_on_end: !!values.end_date && archiveOnEnd,
                    mesocycles: [],
                });
                onCreated(macro);
            } catch (e: unknown) {
                setError(
                    (e as Error).message ?? 'Não foi possível criar o treino.',
                );
            } finally {
                setSubmitting(false);
            }
        },
        [studentId, planningMode, labelParts, archiveOnEnd, onCreated],
    );

    /* ── Biblioteca ── */
    const [own, setOwn] = useState<MacrocycleResponse[] | null>(null);
    const [publicTpls, setPublicTpls] = useState<MacrocycleResponse[]>([]);
    const [libraryError, setLibraryError] = useState('');
    const [selectedTemplateId, setSelectedTemplateId] = useState<
        string | null
    >(null);
    const [folderFilter, setFolderFilter] = useState<string | null>(null);

    const current = stack.current;

    useEffect(() => {
        if (current !== 'library' || own !== null) return;
        let alive = true;
        Promise.all([
            getMyTemplates(),
            getPublicTemplates().catch(() => [] as MacrocycleResponse[]),
        ])
            .then(([mine, pub]) => {
                if (!alive) return;
                setOwn(mine);
                // O que já é do personal não se repete na pública.
                const mineIds = new Set(mine.map((t) => t.id));
                setPublicTpls(pub.filter((t) => !mineIds.has(t.id)));
            })
            .catch(() => {
                if (!alive) return;
                setOwn([]);
                setLibraryError('Não foi possível carregar a biblioteca.');
            });
        return () => {
            alive = false;
        };
    }, [current, own]);

    const folders = useMemo(() => {
        const set = new Set<string>();
        (own ?? []).forEach((t) => t.folder && set.add(t.folder));
        return [...set].sort((a, b) => a.localeCompare(b, 'pt-BR'));
    }, [own]);

    const visibleOwn = useMemo(
        () =>
            (own ?? []).filter(
                (t) => folderFilter === null || t.folder === folderFilter,
            ),
        [own, folderFilter],
    );

    const copySelectedTemplate = useCallback(async () => {
        if (!selectedTemplateId) return;
        setSubmitting(true);
        setError('');
        try {
            const macro = await applyTemplate(studentId, selectedTemplateId);
            onCreated(macro);
        } catch (e: unknown) {
            const serverMsg = (
                e as { response?: { data?: { error?: string } } }
            )?.response?.data?.error;
            setError(serverMsg || 'Não foi possível copiar este treino.');
        } finally {
            setSubmitting(false);
        }
    }, [selectedTemplateId, studentId, onCreated]);

    /* ── Copiar de outro aluno ── */
    const [copyable, setCopyable] = useState<CopyablePlan[] | null>(null);
    const [copyableError, setCopyableError] = useState('');
    const [studentQuery, setStudentQuery] = useState('');
    const [selectedCopyId, setSelectedCopyId] = useState<string | null>(null);

    useEffect(() => {
        if (current !== 'student' || copyable !== null) return;
        let alive = true;
        getCopyablePlans(studentId)
            .then((list) => {
                if (alive) setCopyable(list);
            })
            .catch(() => {
                if (!alive) return;
                setCopyable([]);
                setCopyableError('Não foi possível carregar os treinos dos seus alunos.');
            });
        return () => {
            alive = false;
        };
    }, [current, copyable, studentId]);

    const visibleCopyable = useMemo(() => {
        const q = studentQuery.trim().toLocaleLowerCase('pt-BR');
        if (!q) return copyable ?? [];
        return (copyable ?? []).filter(
            (p) =>
                p.student_name.toLocaleLowerCase('pt-BR').includes(q) ||
                p.name.toLocaleLowerCase('pt-BR').includes(q),
        );
    }, [copyable, studentQuery]);

    const copySelectedFromStudent = useCallback(async () => {
        if (!selectedCopyId) return;
        setSubmitting(true);
        setError('');
        try {
            const macro = await copyPlanFromStudent(studentId, selectedCopyId);
            onCreated(macro);
        } catch (e: unknown) {
            const serverMsg = (
                e as { response?: { data?: { error?: string } } }
            )?.response?.data?.error;
            setError(serverMsg || 'Não foi possível copiar este treino.');
        } finally {
            setSubmitting(false);
        }
    }, [selectedCopyId, studentId, onCreated]);

    const renderTemplate = (t: MacrocycleResponse) => {
        const selected = selectedTemplateId === t.id;
        const trainings = (t.mesocycles ?? []).reduce(
            (sum, m) => sum + (m.trainings?.length ?? 0),
            0,
        );
        return (
            <li key={t.id}>
                <button
                    type="button"
                    aria-pressed={selected}
                    className={
                        selected ? s.templatePickItemOn : s.templatePickItem
                    }
                    onClick={() => setSelectedTemplateId(t.id)}
                >
                    <span className={s.templatePickName}>
                        {selected && <FiCheck aria-hidden />} {t.name}
                    </span>
                    <span className={s.templatePickMeta}>
                        {planKindLabel(t.planning_mode)} · {trainings} treino
                        {trainings === 1 ? '' : 's'}
                        {t.goal ? ` · ${t.goal}` : ''}
                    </span>
                </button>
            </li>
        );
    };

    /* ── Rodapé e título por etapa ── */
    const title =
        current === 'mode'
            ? 'Como você quer começar?'
            : current === 'library'
              ? 'Copiar da biblioteca'
              : current === 'student'
                ? 'Copiar de outro aluno'
                : `Dados da ${planKindLabel(planningMode).toLowerCase()}`;

    const footer =
        current === 'mode' ? (
            <button
                type="button"
                className={s.btnEdit}
                onClick={() =>
                    stack.push(
                        origin === 'library' || origin === 'student'
                            ? origin
                            : 'details',
                    )
                }
            >
                Continuar
            </button>
        ) : current === 'student' ? (
            <button
                type="button"
                className={s.btnEdit}
                disabled={!selectedCopyId || submitting}
                onClick={copySelectedFromStudent}
            >
                {submitting ? 'Copiando...' : 'Copiar este treino'}
            </button>
        ) : current === 'library' ? (
            <button
                type="button"
                className={s.btnEdit}
                disabled={!selectedTemplateId || submitting}
                onClick={copySelectedTemplate}
            >
                {submitting ? 'Copiando...' : 'Usar este treino'}
            </button>
        ) : (
            <button
                type="submit"
                form="new-macrocycle-form"
                className={s.btnEdit}
                disabled={submitting}
            >
                {submitting
                    ? 'Criando...'
                    : `Criar ${planKindLabel(planningMode).toLowerCase()}`}
            </button>
        );

    return (
        <Modal
            open
            onClose={onClose}
            onBack={current === 'mode' ? undefined : () => stack.pop()}
            title={title}
            footer={footer}
        >
            {current === 'mode' && (
                <>
                    <div className={s.choiceGrid}>
                        {ORIGIN_OPTIONS.map((opt) => (
                            <button
                                key={opt.origin}
                                type="button"
                                aria-pressed={origin === opt.origin}
                                onClick={() => setOrigin(opt.origin)}
                                className={
                                    origin === opt.origin
                                        ? s.choiceCardActive
                                        : s.choiceCard
                                }
                            >
                                <p className={s.choiceTitle}>{opt.title}</p>
                                <p className={s.choiceDesc}>{opt.desc}</p>
                            </button>
                        ))}
                    </div>

                    {origin !== 'library' && origin !== 'student' && (
                        <TrainingLabelPartsPicker
                            value={labelParts}
                            onChange={setChosenParts}
                        />
                    )}
                </>
            )}

            {current === 'student' && (
                <>
                    {error && (
                        <div className={s.errorMsg} role="alert">
                            {error}
                        </div>
                    )}
                    {copyable === null ? (
                        <p className={s.fieldHint}>Carregando...</p>
                    ) : copyableError ? (
                        <p className={s.errorMsg}>{copyableError}</p>
                    ) : copyable.length === 0 ? (
                        <p className={s.fieldHint}>
                            Você ainda não montou treino para outro aluno.
                            Volte e escolha &quot;Treino simples&quot; para
                            montar do zero.
                        </p>
                    ) : (
                        <>
                            <input
                                type="search"
                                className={s.formInput}
                                placeholder="Buscar pelo nome do aluno ou do treino"
                                aria-label="Buscar pelo nome do aluno ou do treino"
                                value={studentQuery}
                                onChange={(e) => setStudentQuery(e.target.value)}
                                style={{ marginBottom: 12 }}
                            />
                            {visibleCopyable.length === 0 ? (
                                <p className={s.fieldHint}>
                                    Nada encontrado com essa busca.
                                </p>
                            ) : (
                                <ul className={s.templatePickList}>
                                    {visibleCopyable.map((p) => {
                                        const selected = selectedCopyId === p.id;
                                        return (
                                            <li key={p.id}>
                                                <button
                                                    type="button"
                                                    aria-pressed={selected}
                                                    className={
                                                        selected
                                                            ? s.templatePickItemOn
                                                            : s.templatePickItem
                                                    }
                                                    onClick={() =>
                                                        setSelectedCopyId(p.id)
                                                    }
                                                >
                                                    <span className={s.templatePickName}>
                                                        {selected && <FiCheck aria-hidden />}{' '}
                                                        {p.student_name || 'Aluno'} · {p.name}
                                                    </span>
                                                    <span className={s.templatePickMeta}>
                                                        {planKindLabel(p.planning_mode)} ·{' '}
                                                        {p.trainings} treino
                                                        {p.trainings === 1 ? '' : 's'}
                                                        {p.goal ? ` · ${p.goal}` : ''}
                                                        {p.archived ? ' · arquivado' : ''}
                                                    </span>
                                                </button>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                            <p className={s.fieldHint}>
                                Este aluno recebe uma cópia: o que você
                                ajustar aqui não muda o treino do outro aluno.
                                As datas ficam em branco para você definir.
                            </p>
                        </>
                    )}
                </>
            )}

            {current === 'library' && (
                <>
                    {error && (
                        <div className={s.errorMsg} role="alert">
                            {error}
                        </div>
                    )}
                    {own === null ? (
                        <p className={s.fieldHint}>Carregando...</p>
                    ) : libraryError ? (
                        <p className={s.errorMsg}>{libraryError}</p>
                    ) : own.length === 0 && publicTpls.length === 0 ? (
                        <p className={s.fieldHint}>
                            A biblioteca ainda está vazia. Volte e escolha
                            &quot;Treino simples&quot; para montar do zero; depois,
                            &quot;Salvar na biblioteca&quot; guarda o treino
                            para os próximos alunos.
                        </p>
                    ) : (
                        <>
                            {folders.length > 0 && (
                                <div
                                    className={s.labelPartsChips}
                                    role="group"
                                    aria-label="Pastas"
                                    style={{ marginBottom: 12 }}
                                >
                                    {[null, ...folders].map((f) => (
                                        <button
                                            key={f ?? '__all'}
                                            type="button"
                                            aria-pressed={folderFilter === f}
                                            className={
                                                folderFilter === f
                                                    ? s.labelPartChipOn
                                                    : s.labelPartChip
                                            }
                                            onClick={() => setFolderFilter(f)}
                                        >
                                            {f ? (
                                                <>
                                                    <FiFolder aria-hidden /> {f}
                                                </>
                                            ) : (
                                                'Todas'
                                            )}
                                        </button>
                                    ))}
                                </div>
                            )}
                            {visibleOwn.length > 0 && (
                                <>
                                    <p className={s.labelPartsTitle}>
                                        Meus treinos
                                    </p>
                                    <ul className={s.templatePickList}>
                                        {visibleOwn.map(renderTemplate)}
                                    </ul>
                                </>
                            )}
                            {folderFilter === null && publicTpls.length > 0 && (
                                <>
                                    <p className={s.labelPartsTitle}>
                                        Biblioteca pública
                                    </p>
                                    <ul className={s.templatePickList}>
                                        {publicTpls.map(renderTemplate)}
                                    </ul>
                                </>
                            )}
                            <p className={s.fieldHint}>
                                O aluno recebe uma cópia: o que você ajustar
                                nele não muda o treino da biblioteca.
                            </p>
                        </>
                    )}
                </>
            )}

            {current === 'details' && (
                <form
                    id="new-macrocycle-form"
                    onSubmit={handleSubmit(onSubmit)}
                >
                    {error && (
                        <div className={s.errorMsg} role="alert">
                            {error}
                        </div>
                    )}

                    <div className={s.formGroup}>
                        <label className={s.formLabel} htmlFor="nr-name">
                            Nome
                        </label>
                        <input
                            id="nr-name"
                            {...register('name')}
                            className={s.formInput}
                        />
                        {errors.name && (
                            <small className={s.fieldError}>
                                {errors.name.message}
                            </small>
                        )}
                    </div>

                    <div className={s.formGroup}>
                        <label className={s.formLabel} htmlFor="nr-goal">
                            Objetivo (opcional)
                        </label>
                        <input
                            id="nr-goal"
                            {...register('goal')}
                            className={s.formInput}
                            placeholder="Ex.: hipertrofia, emagrecimento"
                        />
                    </div>

                    <div className={s.formRow}>
                        <div className={s.formGroup}>
                            <label className={s.formLabel} htmlFor="nr-start">
                                Início
                            </label>
                            <input
                                id="nr-start"
                                type="date"
                                {...register('start_date')}
                                className={s.formInput}
                            />
                        </div>
                        <div className={s.formGroup}>
                            <label className={s.formLabel} htmlFor="nr-end">
                                Término (opcional)
                            </label>
                            <input
                                id="nr-end"
                                type="date"
                                {...register('end_date', {
                                    onChange: (e) => {
                                        if (!e.target.value)
                                            setArchiveOnEnd(false);
                                    },
                                })}
                                className={s.formInput}
                            />
                            {errors.end_date && (
                                <small className={s.fieldError}>
                                    {errors.end_date.message}
                                </small>
                            )}
                        </div>
                    </div>

                    <div
                        className={s.labelPartsChips}
                        role="group"
                        aria-label="Duração"
                    >
                        {DURATION_SHORTCUTS_WEEKS.map((w) => (
                            <button
                                key={w}
                                type="button"
                                aria-pressed={activeShortcut === w}
                                className={
                                    activeShortcut === w
                                        ? s.labelPartChipOn
                                        : s.labelPartChip
                                }
                                onClick={() => pickDuration(w)}
                            >
                                {w} semanas
                            </button>
                        ))}
                        <button
                            type="button"
                            aria-pressed={!endDate}
                            className={
                                !endDate ? s.labelPartChipOn : s.labelPartChip
                            }
                            onClick={() => pickDuration(null)}
                        >
                            Sem término
                        </button>
                    </div>

                    {/* Botão com aria-pressed, não checkbox: o CSS global já
                        comeu o :checked dos checkboxes do app uma vez. */}
                    <button
                        type="button"
                        aria-pressed={archiveOnEnd}
                        disabled={!endDate}
                        className={
                            archiveOnEnd ? s.labelPartChipOn : s.labelPartChip
                        }
                        style={{ marginTop: 12 }}
                        onClick={() => setArchiveOnEnd((v) => !v)}
                    >
                        {archiveOnEnd && <FiCheck aria-hidden />}
                        Arquivar quando terminar
                    </button>
                    <small className={s.fieldHint}>
                        {endDate
                            ? 'Arquivado, o treino some do app do aluno e continua guardado com você.'
                            : 'Defina um término para poder arquivar sozinha.'}
                    </small>

                    <div className={s.formGroup} style={{ marginTop: 16 }}>
                        <label className={s.formLabel} htmlFor="nr-notes">
                            Observações para o aluno (opcional)
                        </label>
                        <textarea
                            id="nr-notes"
                            {...register('notes')}
                            className={s.formInput}
                            rows={3}
                            maxLength={NOTES_MAX}
                            placeholder="Ex.: aqueça 10 minutos antes de todo treino."
                        />
                        {errors.notes ? (
                            <small className={s.fieldError}>
                                {errors.notes.message}
                            </small>
                        ) : (
                            notes.length > NOTES_MAX * 0.9 && (
                                <small className={s.fieldHint}>
                                    {notes.length}/{NOTES_MAX}
                                </small>
                            )
                        )}
                    </div>
                </form>
            )}
        </Modal>
    );
}
