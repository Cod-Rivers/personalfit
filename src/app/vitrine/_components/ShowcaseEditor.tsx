'use client';

/**
 * Painel de edição da vitrine — tudo num lugar só, sem sair da tela.
 *
 * O estado é um rascunho local: nada vai ao servidor até "Salvar", e o
 * `initial` é reaplicado toda vez que o painel reabre, de modo que fechar sem
 * salvar realmente descarta as alterações. Uploads de imagem são a exceção
 * consciente — sobem na hora (para dar preview imediato) e a key só é
 * persistida no save.
 */

import React, { useEffect, useRef, useState } from 'react';
import Modal from '@/components/system/Modal';
import {
    Showcase,
    ShowcasePayload,
    ShowcaseSections,
    ShowcaseSlot,
    showcaseToPayload,
    updateMyShowcase,
    uploadShowcaseImage,
} from '@/libs/showcaseService';
import { SHOWCASE_THEMES } from '@/libs/showcaseThemes';
import styles from './ShowcaseEditor.module.css';

interface Props {
    open: boolean;
    initial: Showcase;
    onClose: () => void;
    onSaved: (updated: Showcase) => void;
}

const MAX_RESULTS = 12;

/** Interruptor de visibilidade de uma seção. */
function Toggle({
    label,
    checked,
    onChange,
}: {
    label: string;
    checked: boolean;
    onChange: (v: boolean) => void;
}) {
    return (
        <div className={styles.toggleRow}>
            <span className={styles.toggleLabel}>{label}</span>
            <button
                type="button"
                role="switch"
                aria-checked={checked}
                aria-label={label}
                onClick={() => onChange(!checked)}
                className={`${styles.toggle} ${checked ? styles.toggleOn : ''}`}
            >
                <span className={styles.knob} />
            </button>
        </div>
    );
}

/** Campo de imagem: preview + botão de troca. O upload é imediato. */
function ImageField({
    label,
    hint,
    url,
    round,
    slot,
    disabled,
    onUploaded,
    onClear,
}: {
    label: string;
    hint?: string;
    url: string;
    round?: boolean;
    slot: ShowcaseSlot;
    disabled?: boolean;
    onUploaded: (key: string, url: string) => void;
    onClear?: () => void;
}) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        // Zera o input para que reescolher o MESMO arquivo dispare o change.
        e.target.value = '';
        if (!file) return;

        setBusy(true);
        setError('');
        try {
            const { key, url: publicUrl } = await uploadShowcaseImage(
                file,
                slot,
            );
            onUploaded(key, publicUrl);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : 'Falha ao enviar a imagem.',
            );
        } finally {
            setBusy(false);
        }
    };

    const previewClass = `${styles.mediaPreview} ${round ? styles.mediaPreviewRound : ''}`;

    return (
        <div className={styles.group}>
            <span className={styles.label}>{label}</span>
            {hint && <span className={styles.hint}>{hint}</span>}
            <div className={styles.mediaRow}>
                {url ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={url} alt="" className={previewClass} />
                ) : (
                    <div className={`${previewClass} ${styles.mediaEmpty}`}>
                        sem imagem
                    </div>
                )}
                <button
                    type="button"
                    className={styles.smallBtn}
                    onClick={() => inputRef.current?.click()}
                    disabled={disabled || busy}
                >
                    {busy ? 'Enviando…' : url ? 'Trocar' : 'Enviar imagem'}
                </button>
                {url && onClear && (
                    <button
                        type="button"
                        className={styles.dangerBtn}
                        onClick={onClear}
                        disabled={disabled || busy}
                    >
                        Remover
                    </button>
                )}
                <input
                    ref={inputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    style={{ display: 'none' }}
                    onChange={handleFile}
                />
            </div>
            {error && <p className={styles.error}>{error}</p>}
        </div>
    );
}

export default function ShowcaseEditor({
    open,
    initial,
    onClose,
    onSaved,
}: Props) {
    const [draft, setDraft] = useState<ShowcasePayload>(() =>
        showcaseToPayload(initial),
    );
    // URLs de preview das imagens (o payload guarda só as keys).
    const [previews, setPreviews] = useState({
        cover: initial.cover_url,
        avatar: initial.avatar_url,
        testimonial: initial.testimonial_photo_url,
        announcement: initial.announcement_image_url,
        results: initial.results.map((r) => r.photo_url),
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    // Reabrir o painel descarta rascunho não salvo e volta ao estado do servidor.
    useEffect(() => {
        if (!open) return;
        setDraft(showcaseToPayload(initial));
        setPreviews({
            cover: initial.cover_url,
            avatar: initial.avatar_url,
            testimonial: initial.testimonial_photo_url,
            announcement: initial.announcement_image_url,
            results: initial.results.map((r) => r.photo_url),
        });
        setError('');
    }, [open, initial]);

    const set = <K extends keyof ShowcasePayload>(
        key: K,
        value: ShowcasePayload[K],
    ) => setDraft((d) => ({ ...d, [key]: value }));

    const setSection = (key: keyof ShowcaseSections, value: boolean) =>
        setDraft((d) => ({ ...d, sections: { ...d.sections, [key]: value } }));

    const addResult = () => {
        if (draft.results.length >= MAX_RESULTS) return;
        setDraft((d) => ({
            ...d,
            results: [...d.results, { photo_key: '', caption: '' }],
        }));
        setPreviews((p) => ({ ...p, results: [...p.results, ''] }));
    };

    const updateResult = (
        index: number,
        patch: Partial<{ photo_key: string; caption: string }>,
        previewUrl?: string,
    ) => {
        setDraft((d) => ({
            ...d,
            results: d.results.map((r, i) =>
                i === index ? { ...r, ...patch } : r,
            ),
        }));
        if (previewUrl !== undefined) {
            setPreviews((p) => ({
                ...p,
                results: p.results.map((u, i) =>
                    i === index ? previewUrl : u,
                ),
            }));
        }
    };

    const removeResult = (index: number) => {
        setDraft((d) => ({
            ...d,
            results: d.results.filter((_, i) => i !== index),
        }));
        setPreviews((p) => ({
            ...p,
            results: p.results.filter((_, i) => i !== index),
        }));
    };

    const handleSave = async () => {
        setSaving(true);
        setError('');
        try {
            // Resultados sem foto não têm o que exibir — descarta em vez de
            // deixar um card vazio no carrossel.
            const payload: ShowcasePayload = {
                ...draft,
                results: draft.results.filter((r) => !!r.photo_key),
            };
            const updated = await updateMyShowcase(payload);
            onSaved(updated);
            onClose();
        } catch (err) {
            const msg = (err as { response?: { data?: { error?: string } } })
                ?.response?.data?.error;
            setError(msg || 'Erro ao salvar. Tente novamente.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal
            open={open}
            onClose={onClose}
            title="Editar página"
            footer={
                <>
                    <button
                        type="button"
                        className={styles.cancelBtn}
                        onClick={onClose}
                        disabled={saving}
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        className={styles.saveBtn}
                        onClick={handleSave}
                        disabled={saving}
                    >
                        {saving ? 'Salvando…' : 'Salvar'}
                    </button>
                </>
            }
        >
            <div className={styles.form}>
                {error && <p className={styles.error}>{error}</p>}

                {/* ── Publicação ── */}
                <div className={styles.section}>
                    <Toggle
                        label="Publicar para meus alunos"
                        checked={draft.enabled}
                        onChange={(v) => set('enabled', v)}
                    />
                    <span className={styles.hint}>
                        Com isso desligado, seus alunos entram direto em Meus
                        Treinos, como hoje. O conteúdo abaixo continua salvo.
                    </span>
                </div>

                {/* ── Tema ── */}
                <div className={styles.group}>
                    <span className={styles.label}>Tema</span>
                    <span className={styles.hint}>
                        As cores de cartão, borda e texto são derivadas da
                        paleta escolhida, garantindo contraste.
                    </span>
                    <div className={styles.swatches}>
                        {SHOWCASE_THEMES.map((t) => (
                            <button
                                key={t.id}
                                type="button"
                                aria-label={t.label}
                                title={t.label}
                                aria-pressed={draft.theme_id === t.id}
                                onClick={() => set('theme_id', t.id)}
                                className={`${styles.swatch} ${
                                    draft.theme_id === t.id
                                        ? styles.swatchActive
                                        : ''
                                }`}
                                style={{
                                    background: `linear-gradient(135deg, ${t.accent} 50%, ${t.bg} 50%)`,
                                }}
                            />
                        ))}
                    </div>
                </div>

                {/* ── Marca ── */}
                <ImageField
                    label="Capa"
                    hint="Imagem de banner no topo da página."
                    url={previews.cover}
                    slot="capa"
                    onUploaded={(key, url) => {
                        set('cover_key', key);
                        setPreviews((p) => ({ ...p, cover: url }));
                    }}
                    onClear={() => {
                        set('cover_key', '');
                        setPreviews((p) => ({ ...p, cover: '' }));
                    }}
                />

                <ImageField
                    label="Foto de perfil"
                    hint="Se vazia, usamos a foto da sua conta."
                    url={previews.avatar}
                    round
                    slot="avatar"
                    onUploaded={(key, url) => {
                        set('avatar_key', key);
                        setPreviews((p) => ({ ...p, avatar: url }));
                    }}
                    onClear={() => {
                        set('avatar_key', '');
                        setPreviews((p) => ({ ...p, avatar: '' }));
                    }}
                />

                <div className={styles.group}>
                    <label className={styles.label} htmlFor="vt-tagline">
                        Frase de efeito
                    </label>
                    <input
                        id="vt-tagline"
                        className={styles.input}
                        value={draft.tagline}
                        maxLength={80}
                        placeholder="Ex: Treinador de Força & Performance"
                        onChange={(e) => set('tagline', e.target.value)}
                    />
                </div>

                {/* ── Bio ── */}
                <div className={styles.section}>
                    <Toggle
                        label="Mostrar bio"
                        checked={draft.sections.bio}
                        onChange={(v) => setSection('bio', v)}
                    />
                    {draft.sections.bio && (
                        <div className={styles.group}>
                            <textarea
                                className={styles.textarea}
                                rows={4}
                                maxLength={600}
                                value={draft.bio}
                                placeholder="Conte quem você é, sua metodologia e como acompanha seus alunos."
                                onChange={(e) => set('bio', e.target.value)}
                            />
                            <span className={styles.counter}>
                                {draft.bio.length}/600
                            </span>
                        </div>
                    )}
                </div>

                {/* ── Especialidades ── */}
                <div className={styles.section}>
                    <Toggle
                        label="Mostrar especialidades"
                        checked={draft.sections.specialties}
                        onChange={(v) => setSection('specialties', v)}
                    />
                    {draft.sections.specialties && (
                        <div className={styles.group}>
                            <span className={styles.hint}>
                                Separe por vírgula — cada item vira um chip.
                                Máximo de 8.
                            </span>
                            <input
                                className={styles.input}
                                value={draft.specialties}
                                maxLength={200}
                                placeholder="Hipertrofia, Powerlifting, Emagrecimento, Mobilidade"
                                onChange={(e) =>
                                    set('specialties', e.target.value)
                                }
                            />
                        </div>
                    )}
                </div>

                {/* ── Estatísticas ── */}
                <div className={styles.section}>
                    <Toggle
                        label="Mostrar estatísticas"
                        checked={draft.sections.stats}
                        onChange={(v) => setSection('stats', v)}
                    />
                    {draft.sections.stats && (
                        <div className={styles.grid3}>
                            <div className={styles.group}>
                                <span className={styles.label}>Alunos</span>
                                <div className={styles.computedStat}>
                                    {initial.stat_students || '—'}
                                </div>
                                <span className={styles.hint}>
                                    Calculado a partir dos seus alunos com
                                    vínculo ativo.
                                </span>
                            </div>
                            <div className={styles.group}>
                                <label
                                    className={styles.label}
                                    htmlFor="vt-stat-years"
                                >
                                    Anos
                                </label>
                                <input
                                    id="vt-stat-years"
                                    className={styles.input}
                                    value={draft.stat_years}
                                    maxLength={12}
                                    placeholder="8"
                                    onChange={(e) =>
                                        set('stat_years', e.target.value)
                                    }
                                />
                                <span className={styles.hint}>
                                    Anos de experiência — o único número desta
                                    seção que você preenche.
                                </span>
                            </div>
                            <div className={styles.group}>
                                <span className={styles.label}>Avaliação</span>
                                <div className={styles.computedStat}>
                                    {initial.stat_rating || '—'}
                                </div>
                                <span className={styles.hint}>
                                    Média das avaliações que seus alunos deram
                                    aos treinos.
                                </span>
                            </div>
                        </div>
                    )}
                </div>

                {/* ── Redes sociais ── */}
                <div className={styles.section}>
                    <Toggle
                        label="Mostrar redes sociais"
                        checked={draft.sections.social}
                        onChange={(v) => setSection('social', v)}
                    />
                    {draft.sections.social && (
                        <>
                            <span className={styles.hint}>
                                Cada ícone só aparece se você informar o
                                endereço. Use o link completo (https://…).
                            </span>
                            <div className={styles.group}>
                                <span className={styles.label}>Instagram</span>
                                <input
                                    className={styles.input}
                                    type="url"
                                    inputMode="url"
                                    value={draft.instagram_url}
                                    placeholder="https://instagram.com/seuperfil"
                                    onChange={(e) =>
                                        set('instagram_url', e.target.value)
                                    }
                                />
                            </div>
                            <div className={styles.group}>
                                <span className={styles.label}>YouTube</span>
                                <input
                                    className={styles.input}
                                    type="url"
                                    inputMode="url"
                                    value={draft.youtube_url}
                                    placeholder="https://youtube.com/@seucanal"
                                    onChange={(e) =>
                                        set('youtube_url', e.target.value)
                                    }
                                />
                            </div>
                            <div className={styles.group}>
                                <span className={styles.label}>WhatsApp</span>
                                <input
                                    className={styles.input}
                                    type="url"
                                    inputMode="url"
                                    value={draft.whatsapp_url}
                                    placeholder="https://wa.me/5511999999999"
                                    onChange={(e) =>
                                        set('whatsapp_url', e.target.value)
                                    }
                                />
                            </div>
                        </>
                    )}
                </div>

                {/* ── Resultados de alunos ── */}
                <div className={styles.section}>
                    <Toggle
                        label="Mostrar resultados de alunos"
                        checked={draft.sections.results}
                        onChange={(v) => setSection('results', v)}
                    />
                    {draft.sections.results && (
                        <>
                            <span className={styles.hint}>
                                Fotos de antes/depois com uma legenda curta.
                                Publique apenas fotos que o aluno autorizou.
                            </span>
                            {draft.results.map((r, i) => (
                                <div key={i} className={styles.resultRow}>
                                    {previews.results[i] ? (
                                        /* eslint-disable-next-line @next/next/no-img-element */
                                        <img
                                            src={previews.results[i]}
                                            alt=""
                                            className={styles.resultThumb}
                                        />
                                    ) : (
                                        <div
                                            className={`${styles.resultThumb} ${styles.mediaEmpty}`}
                                        >
                                            sem foto
                                        </div>
                                    )}
                                    <input
                                        className={styles.resultCaptionInput}
                                        value={r.caption}
                                        maxLength={40}
                                        placeholder="Ex: Bruna, 4 meses"
                                        onChange={(e) =>
                                            updateResult(i, {
                                                caption: e.target.value,
                                            })
                                        }
                                    />
                                    <ResultUploadButton
                                        index={i}
                                        hasPhoto={!!r.photo_key}
                                        onUploaded={(key, url) =>
                                            updateResult(
                                                i,
                                                { photo_key: key },
                                                url,
                                            )
                                        }
                                    />
                                    <button
                                        type="button"
                                        className={styles.dangerBtn}
                                        onClick={() => removeResult(i)}
                                    >
                                        Remover
                                    </button>
                                </div>
                            ))}
                            <button
                                type="button"
                                className={styles.smallBtn}
                                onClick={addResult}
                                disabled={draft.results.length >= MAX_RESULTS}
                            >
                                + Adicionar resultado
                            </button>
                        </>
                    )}
                </div>

                {/* ── Depoimento ── */}
                <div className={styles.section}>
                    <Toggle
                        label="Mostrar depoimento"
                        checked={draft.sections.testimonial}
                        onChange={(v) => setSection('testimonial', v)}
                    />
                    {draft.sections.testimonial && (
                        <>
                            <ImageField
                                label="Foto do aluno"
                                url={previews.testimonial}
                                round
                                slot="depoimento"
                                onUploaded={(key, url) => {
                                    set('testimonial_photo_key', key);
                                    setPreviews((p) => ({
                                        ...p,
                                        testimonial: url,
                                    }));
                                }}
                                onClear={() => {
                                    set('testimonial_photo_key', '');
                                    setPreviews((p) => ({
                                        ...p,
                                        testimonial: '',
                                    }));
                                }}
                            />
                            <div className={styles.group}>
                                <span className={styles.label}>Depoimento</span>
                                <textarea
                                    className={styles.textarea}
                                    rows={3}
                                    maxLength={300}
                                    value={draft.testimonial_text}
                                    placeholder="O que esse aluno diz sobre o seu acompanhamento."
                                    onChange={(e) =>
                                        set('testimonial_text', e.target.value)
                                    }
                                />
                            </div>
                            <div className={styles.group}>
                                <span className={styles.label}>Autor</span>
                                <input
                                    className={styles.input}
                                    value={draft.testimonial_author}
                                    maxLength={60}
                                    placeholder="Ex: Camila S., aluna há 1 ano"
                                    onChange={(e) =>
                                        set(
                                            'testimonial_author',
                                            e.target.value,
                                        )
                                    }
                                />
                            </div>
                        </>
                    )}
                </div>

                {/* ── Aviso / comercial ── */}
                <div className={styles.section}>
                    <span className={styles.label}>Aviso / anúncio</span>
                    <span className={styles.hint}>
                        Opcional, e em um formato só: texto ou imagem.
                    </span>
                    <div className={styles.typeToggle}>
                        {(
                            [
                                ['none', 'Nenhum'],
                                ['text', 'Texto'],
                                ['image', 'Imagem'],
                            ] as const
                        ).map(([value, label]) => (
                            <button
                                key={value}
                                type="button"
                                aria-pressed={draft.announcement_type === value}
                                className={
                                    draft.announcement_type === value
                                        ? styles.typeBtnActive
                                        : styles.typeBtn
                                }
                                onClick={() => set('announcement_type', value)}
                            >
                                {label}
                            </button>
                        ))}
                    </div>

                    {draft.announcement_type === 'text' && (
                        <div className={styles.group}>
                            <textarea
                                className={styles.textarea}
                                rows={2}
                                maxLength={200}
                                value={draft.announcement_text}
                                placeholder="Ex: Promoção de matrícula até dia 15"
                                onChange={(e) =>
                                    set('announcement_text', e.target.value)
                                }
                            />
                        </div>
                    )}

                    {draft.announcement_type === 'image' && (
                        <ImageField
                            label="Banner do aviso"
                            url={previews.announcement}
                            slot="aviso"
                            onUploaded={(key, url) => {
                                set('announcement_image_key', key);
                                setPreviews((p) => ({
                                    ...p,
                                    announcement: url,
                                }));
                            }}
                            onClear={() => {
                                set('announcement_image_key', '');
                                setPreviews((p) => ({
                                    ...p,
                                    announcement: '',
                                }));
                            }}
                        />
                    )}

                    {draft.announcement_type !== 'none' && (
                        <div className={styles.group}>
                            <span className={styles.label}>
                                Link ao clicar (opcional)
                            </span>
                            <input
                                className={styles.input}
                                type="url"
                                inputMode="url"
                                value={draft.announcement_url}
                                placeholder="https://…"
                                onChange={(e) =>
                                    set('announcement_url', e.target.value)
                                }
                            />
                        </div>
                    )}
                </div>
            </div>
        </Modal>
    );
}

/**
 * Botão de upload de uma foto de resultado. Cada linha tem seu próprio slot
 * (`resultado-N`), então a troca de foto de um item nunca sobrescreve a de
 * outro no bucket.
 */
function ResultUploadButton({
    index,
    hasPhoto,
    onUploaded,
}: {
    index: number;
    hasPhoto: boolean;
    onUploaded: (key: string, url: string) => void;
}) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [busy, setBusy] = useState(false);

    const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;
        setBusy(true);
        try {
            const { key, url } = await uploadShowcaseImage(
                file,
                `resultado-${index}` as ShowcaseSlot,
            );
            onUploaded(key, url);
        } catch {
            /* o erro já é visível pela foto que não trocou */
        } finally {
            setBusy(false);
        }
    };

    return (
        <>
            <button
                type="button"
                className={styles.smallBtn}
                onClick={() => inputRef.current?.click()}
                disabled={busy}
            >
                {busy ? 'Enviando…' : hasPhoto ? 'Trocar foto' : 'Enviar foto'}
            </button>
            <input
                ref={inputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                style={{ display: 'none' }}
                onChange={handleFile}
            />
        </>
    );
}
