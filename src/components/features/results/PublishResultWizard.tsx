'use client';

import { useEffect, useMemo, useState } from 'react';
import { FiCamera, FiCrop, FiEyeOff } from 'react-icons/fi';
import Modal from '@/components/system/Modal';
import ImageCropper from '@/components/system/ImageCropper';
import {
    createResult,
    getResultEligibility,
    RESULT_ASPECT,
    RESULT_GOALS,
    RESULT_TERMS_VERSION,
    resultErrorMessage,
    type EligiblePhoto,
    type ResultCrop,
    type ResultEligibility,
    type ResultScope,
    type ResultShow,
} from '@/libs/resultService';
import HideAreaPicker from './HideAreaPicker';
import ResultTerms from './ResultTerms';
import { CroppedPhoto, shortMonth } from './ResultPhotos';
import s from './results.module.css';

type Side = 'before' | 'after';

interface Chosen {
    photo: EligiblePhoto;
    crop: ResultCrop;
    hide: ResultCrop | null;
}

const STEPS = ['Fotos', 'Recorte', 'O que mostrar', 'Revisar e autorizar'];
const MIN_VERIFIED_DAYS = 28;

const keyOf = (p: EligiblePhoto) => `${p.entry_id}:${p.photo_index}`;

function daysBetween(a: string, b: string): number {
    return Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000);
}

/** Recorte 4:5 centralizado, para quem não quiser ajustar. */
function centerCrop(w: number, h: number): ResultCrop {
    if (w / h > RESULT_ASPECT) {
        const cw = (h * RESULT_ASPECT) / w;
        return { x: (1 - cw) / 2, y: 0, w: cw, h: 1 };
    }
    const ch = w / RESULT_ASPECT / h;
    return { x: 0, y: (1 - ch) / 2, w: 1, h: ch };
}

/** Lê as dimensões da foto para o recorte inicial. Com prazo: uma foto que
 *  não carrega (URL assinada vencida, rede lenta) não pode travar a escolha —
 *  cai na foto inteira, e o aluno ajusta no passo do recorte. */
function loadCenterCrop(url: string, timeoutMs = 8000): Promise<ResultCrop> {
    return new Promise((resolve) => {
        const timer = setTimeout(() => resolve({ x: 0, y: 0, w: 1, h: 1 }), timeoutMs);
        const img = new Image();
        img.onload = () => {
            clearTimeout(timer);
            resolve(centerCrop(img.naturalWidth, img.naturalHeight));
        };
        img.onerror = () => {
            clearTimeout(timer);
            resolve({ x: 0, y: 0, w: 1, h: 1 });
        };
        img.src = url;
    });
}

interface Props {
    open: boolean;
    onClose: () => void;
    onPublished: () => void;
    /** Abre a câmera com guia (sem fotos suficientes). */
    onTakePhoto?: () => void;
}

/** Publicar um antes e depois a partir das fotos da Evolução. Nada é
 *  público antes da revisão da equipe. */
export default function PublishResultWizard({ open, onClose, onPublished, onTakePhoto }: Props) {
    const [info, setInfo] = useState<ResultEligibility | null>(null);
    const [loadError, setLoadError] = useState('');
    const [step, setStep] = useState(0);
    // As duas fotos escolhidas; a de data mais antiga é o antes.
    const [picked, setPicked] = useState<Chosen[]>([]);
    const sorted = [...picked].sort((a, b) => a.photo.date.localeCompare(b.photo.date));
    const before = sorted.length === 2 ? sorted[0] : (sorted[0] ?? null);
    const after = sorted.length === 2 ? sorted[1] : null;
    const [cropping, setCropping] = useState<Side | null>(null);
    const [hiding, setHiding] = useState<Side | null>(null);
    const [show, setShow] = useState<ResultShow>({ weight: false, body_fat: false, measurements: false, name: false });
    const [goal, setGoal] = useState('');
    const [caption, setCaption] = useState('');
    const [tagPersonal, setTagPersonal] = useState(false);
    const [scopeProgram, setScopeProgram] = useState(true);
    const [scopeAuthor, setScopeAuthor] = useState(false);
    const [birthDate, setBirthDate] = useState('');
    const [agree, setAgree] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!open) return;
        setStep(0);
        setPicked([]);
        setAgree(false);
        setError('');
        setLoadError('');
        setInfo(null);
        getResultEligibility()
            .then(setInfo)
            .catch((e) => setLoadError(resultErrorMessage(e, 'Não foi possível carregar suas fotos.')));
    }, [open]);

    const photos = info?.photos ?? [];
    const gapDays = before && after ? daysBetween(before.photo.uploaded_at, after.photo.uploaded_at) : 0;

    const choose = async (p: EligiblePhoto) => {
        // Tocar numa escolhida desmarca; no máximo duas.
        if (picked.some((c) => keyOf(c.photo) === keyOf(p))) {
            setPicked(picked.filter((c) => keyOf(c.photo) !== keyOf(p)));
            return;
        }
        if (picked.length >= 2) return;
        const crop = await loadCenterCrop(p.url);
        setPicked((prev) => (prev.length >= 2 ? prev : [...prev, { photo: p, crop, hide: null }]));
    };

    const canNext = useMemo(() => {
        if (step === 0) return !!before && !!after && before.photo.date < after.photo.date;
        if (step === 3) return agree && (info?.has_birth_date || !!birthDate);
        return true;
    }, [step, before, after, agree, info, birthDate]);

    const submit = async () => {
        if (!before || !after) return;
        setBusy(true);
        setError('');
        try {
            const scopes: ResultScope[] = ['mural'];
            if (scopeProgram) scopes.push('program');
            if (scopeAuthor) scopes.push('author');
            await createResult({
                before: { entry_id: before.photo.entry_id, photo_index: before.photo.photo_index, crop: before.crop, hide: before.hide },
                after: { entry_id: after.photo.entry_id, photo_index: after.photo.photo_index, crop: after.crop, hide: after.hide },
                caption,
                goal,
                show,
                tag_personal: tagPersonal,
                terms_version: RESULT_TERMS_VERSION,
                scopes,
                ...(info?.has_birth_date ? {} : { birth_date: birthDate }),
            });
            onPublished();
        } catch (e) {
            setError(resultErrorMessage(e, 'Não foi possível enviar. Tente de novo.'));
        } finally {
            setBusy(false);
        }
    };

    const chosenOf = (side: Side) => (side === 'before' ? before : after);
    const setChosen = (side: Side, v: Chosen) => {
        const target = chosenOf(side);
        if (!target) return;
        setPicked((prev) => prev.map((c) => (keyOf(c.photo) === keyOf(target.photo) ? v : c)));
    };

    const footer = info && info.is_adult && photos.length >= 2 && (
        <div className={s.actions}>
            {step > 0 && (
                <button type="button" className={s.btn} onClick={() => setStep(step - 1)} disabled={busy}>
                    Voltar
                </button>
            )}
            {step < 3 ? (
                <button type="button" className={s.btnPrimary} onClick={() => setStep(step + 1)} disabled={!canNext}>
                    Continuar
                </button>
            ) : (
                <button type="button" className={s.btnPrimary} onClick={submit} disabled={!canNext || busy}>
                    {busy ? 'Enviando…' : 'Enviar para revisão'}
                </button>
            )}
        </div>
    );

    return (
        <Modal open={open} onClose={onClose} title="Publicar antes e depois" footer={footer || undefined}>
            {loadError && <p className={s.error}>{loadError}</p>}
            {!info && !loadError && <p className={s.muted}>Carregando suas fotos…</p>}

            {info && !info.is_adult && (
                <div className={s.empty}>O mural de resultados é só para maiores de 18 anos.</div>
            )}

            {info && info.is_adult && photos.length < 2 && (
                <div className={s.section}>
                    <div className={s.empty}>
                        Você precisa de pelo menos duas fotos na Evolução, de datas diferentes: a de antes e a de
                        depois. Para o selo de resultado verificado, envie as duas com 4 semanas ou mais de
                        diferença.
                    </div>
                    {onTakePhoto && (
                        <button type="button" className={s.btnPrimary} onClick={onTakePhoto}>
                            <FiCamera aria-hidden="true" /> Tirar foto de hoje
                        </button>
                    )}
                </div>
            )}

            {info && info.is_adult && photos.length >= 2 && (
                <div className={s.section}>
                    <div className={s.steps} aria-label={`Passo ${step + 1} de ${STEPS.length}: ${STEPS[step]}`}>
                        {STEPS.map((label, i) => (
                            <span key={label} className={`${s.stepDot} ${i <= step ? s.stepDotOn : ''}`} />
                        ))}
                    </div>

                    {step === 0 && (
                        <>
                            <h3 className={s.sectionTitle}>Escolha a foto de antes e a de depois</h3>
                            <p className={s.muted}>
                                Toque em duas fotos. A mais antiga vira o antes. Use a mesma pose e o mesmo lugar
                                para a comparação ficar justa.
                            </p>
                            <div className={s.photoPicker}>
                                {photos.map((p) => {
                                    const on =
                                        (before && keyOf(before.photo) === keyOf(p)) ||
                                        (after && keyOf(after.photo) === keyOf(p));
                                    const tag =
                                        before && keyOf(before.photo) === keyOf(p)
                                            ? 'Antes'
                                            : after && keyOf(after.photo) === keyOf(p)
                                              ? 'Depois'
                                              : shortMonth(p.date);
                                    return (
                                        <button
                                            key={keyOf(p)}
                                            type="button"
                                            className={`${s.photoOption} ${on ? s.photoOptionOn : ''}`}
                                            onClick={() => choose(p)}
                                            disabled={!on && !!before && !!after}
                                            aria-pressed={!!on}
                                        >
                                            { }
                                            <img src={p.url} alt={`Foto de ${p.date}`} loading="lazy" />
                                            <span className={s.photoDate}>{tag}</span>
                                        </button>
                                    );
                                })}
                            </div>
                            {before && after && before.photo.date === after.photo.date && (
                                <p className={s.error}>Escolha fotos de datas diferentes.</p>
                            )}
                            {before && after && gapDays < MIN_VERIFIED_DAYS && (
                                <p className={`${s.badge} ${s.badgeWarn}`}>
                                    As fotos foram enviadas com menos de 4 semanas de diferença: a publicação sai sem
                                    o selo de resultado verificado e não aparece na página do programa da loja.
                                </p>
                            )}
                        </>
                    )}

                    {step === 1 && before && after && (
                        <>
                            <h3 className={s.sectionTitle}>Enquadre as fotos</h3>
                            <p className={s.muted}>
                                O recorte é o que aparece no mural. Você pode cortar o rosto ou marcar uma área para
                                sair coberta.
                            </p>
                            <div className={s.pair}>
                                {(['before', 'after'] as Side[]).map((side) => {
                                    const c = chosenOf(side)!;
                                    return (
                                        <div key={side} className={s.section}>
                                            <CroppedPhoto
                                                url={c.photo.url}
                                                crop={c.crop}
                                                hide={c.hide}
                                                alt={side === 'before' ? 'Antes' : 'Depois'}
                                                tag={side === 'before' ? 'Antes' : 'Depois'}
                                            />
                                            <button type="button" className={s.btn} onClick={() => setCropping(side)}>
                                                <FiCrop aria-hidden="true" /> Ajustar
                                            </button>
                                            <button type="button" className={s.btn} onClick={() => setHiding(side)}>
                                                <FiEyeOff aria-hidden="true" /> {c.hide ? 'Área coberta' : 'Esconder área'}
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    )}

                    {step === 2 && (
                        <>
                            <h3 className={s.sectionTitle}>O que mostrar</h3>
                            <p className={s.muted}>Tudo começa desligado. Os números saem da sua Evolução.</p>
                            <label className={s.check}>
                                <input type="checkbox" checked={show.name} onChange={(e) => setShow({ ...show, name: e.target.checked })} />
                                Mostrar meu primeiro nome ({info.first_name || 'nome'}). Desligado, aparece “Aluno(a) Venafit”.
                            </label>
                            <label className={s.check}>
                                <input type="checkbox" checked={show.weight} onChange={(e) => setShow({ ...show, weight: e.target.checked })} />
                                Diferença de peso
                            </label>
                            <label className={s.check}>
                                <input type="checkbox" checked={show.body_fat} onChange={(e) => setShow({ ...show, body_fat: e.target.checked })} />
                                Diferença de % de gordura
                            </label>
                            <label className={s.check}>
                                <input type="checkbox" checked={show.measurements} onChange={(e) => setShow({ ...show, measurements: e.target.checked })} />
                                Diferença das medidas (cintura, quadril…)
                            </label>
                            <label className={s.field}>
                                Objetivo
                                <select value={goal} onChange={(e) => setGoal(e.target.value)}>
                                    <option value="">Não informar</option>
                                    {RESULT_GOALS.map((g) => (
                                        <option key={g.value} value={g.value}>
                                            {g.label}
                                        </option>
                                    ))}
                                </select>
                            </label>
                            <label className={s.field}>
                                Conte como foi (opcional)
                                <textarea
                                    value={caption}
                                    maxLength={280}
                                    onChange={(e) => setCaption(e.target.value)}
                                    placeholder="Ex.: treinei 3 vezes por semana e ajustei a alimentação."
                                />
                                <span className={s.counter}>{caption.length}/280</span>
                            </label>
                            <label className={s.check}>
                                <input type="checkbox" checked={scopeProgram} onChange={(e) => setScopeProgram(e.target.checked)} />
                                Se eu fazia um programa da loja, mostrar meu resultado na página dele.
                            </label>
                            <label className={s.check}>
                                <input type="checkbox" checked={scopeAuthor} onChange={(e) => setScopeAuthor(e.target.checked)} />
                                O autor do programa pode divulgar meu resultado nas redes dele.
                            </label>
                            {info.has_personal && (
                                <label className={s.check}>
                                    <input type="checkbox" checked={tagPersonal} onChange={(e) => setTagPersonal(e.target.checked)} />
                                    Marcar meu personal (ele confirma se quer aparecer).
                                </label>
                            )}
                        </>
                    )}

                    {step === 3 && before && after && (
                        <>
                            <h3 className={s.sectionTitle}>Revise e autorize</h3>
                            <div className={s.pair}>
                                <CroppedPhoto url={before.photo.url} crop={before.crop} hide={before.hide} alt="Antes" tag={`Antes · ${shortMonth(before.photo.date)}`} />
                                <CroppedPhoto url={after.photo.url} crop={after.crop} hide={after.hide} alt="Depois" tag={`Depois · ${shortMonth(after.photo.date)}`} />
                            </div>
                            <ResultTerms />
                            {!info.has_birth_date && (
                                <label className={s.field}>
                                    Sua data de nascimento (o mural é só para maiores de 18 anos)
                                    <input type="date" value={birthDate} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setBirthDate(e.target.value)} />
                                </label>
                            )}
                            <label className={s.check}>
                                <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
                                Li o termo, tenho 18 anos ou mais, sou a pessoa das fotos e autorizo a publicação.
                            </label>
                            {error && <p className={s.error}>{error}</p>}
                        </>
                    )}
                </div>
            )}

            {cropping && chosenOf(cropping) && (
                <ImageCropper
                    src={chosenOf(cropping)!.photo.url}
                    aspect={RESULT_ASPECT}
                    title={cropping === 'before' ? 'Recorte do antes' : 'Recorte do depois'}
                    confirmLabel="Usar recorte"
                    onCancel={() => setCropping(null)}
                    onConfirmRect={(rect) => {
                        // Recorte novo invalida a área escondida (ela é relativa ao recorte).
                        setChosen(cropping, { ...chosenOf(cropping)!, crop: rect, hide: null });
                        setCropping(null);
                    }}
                />
            )}

            <Modal
                open={!!hiding}
                onClose={() => setHiding(null)}
                title="Esconder uma área"
                footer={
                    <div className={s.actions}>
                        <button type="button" className={s.btnPrimary} onClick={() => setHiding(null)}>
                            Pronto
                        </button>
                    </div>
                }
            >
                {hiding && chosenOf(hiding) && (
                    <div className={s.section}>
                        <p className={s.muted}>
                            Arraste o dedo sobre o rosto (ou o que quiser esconder). A área sai coberta na foto
                            publicada.
                        </p>
                        <HideAreaPicker
                            url={chosenOf(hiding)!.photo.url}
                            crop={chosenOf(hiding)!.crop}
                            value={chosenOf(hiding)!.hide}
                            alt={hiding === 'before' ? 'Antes' : 'Depois'}
                            onChange={(v) => setChosen(hiding, { ...chosenOf(hiding)!, hide: v })}
                        />
                    </div>
                )}
            </Modal>
        </Modal>
    );
}
