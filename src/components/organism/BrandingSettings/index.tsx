'use client';
import React, { useEffect, useRef, useState } from 'react';
import { FiStar, FiX, FiCheck } from 'react-icons/fi';
import {
    UpdateBrandingPayload,
    updateBranding,
    getMyBranding,
} from '@/libs/brandingService';
import { useBranding } from '@/context/BrandingContext';
import {
    DEFAULT_SHOWCASE_THEME_ID,
    SHOWCASE_THEMES,
    buildShowcaseThemeVars,
    findShowcaseTheme,
} from '@/libs/showcaseThemes';
import styles from './BrandingSettings.module.css';

interface Props {
    planType: string;
}

const MAX_LOGO_BYTES = 2 * 1024 * 1024;

function fileToDataURI(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

export default function BrandingSettings({ planType }: Props) {
    const { setBranding } = useBranding();
    const isPro = planType === 'pro';

    const [logo, setLogo] = useState('');
    const [themeId, setThemeId] = useState(DEFAULT_SHOWCASE_THEME_ID);
    const [welcomeBanner, setWelcomeBanner] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!isPro) {
            setLoading(false);
            return;
        }
        getMyBranding()
            .then(({ branding }) => {
                if (branding) {
                    setLogo(branding.logo_base64 ?? '');
                    // Branding salvo antes das paletas existirem não tem
                    // theme_id: casa pela cor primária, e findShowcaseTheme cai
                    // no padrão se nenhuma bater.
                    setThemeId(
                        branding.theme_id ??
                            (SHOWCASE_THEMES.find(
                                (t) =>
                                    t.accent.toLowerCase() ===
                                    (branding.primary_color ?? '').toLowerCase(),
                            )?.id ??
                                DEFAULT_SHOWCASE_THEME_ID),
                    );
                    setWelcomeBanner(branding.welcome_banner ?? '');
                }
            })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, [isPro]);

    const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > MAX_LOGO_BYTES) {
            setError('Logo deve ter no máximo 2 MB.');
            return;
        }
        const dataURI = await fileToDataURI(file);
        setLogo(dataURI);
        setError('');
    };

    const removeLogo = () => {
        setLogo('');
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleSave = async () => {
        setSaving(true);
        setError('');
        setSuccess(false);
        try {
            const payload: UpdateBrandingPayload = {
                logo_base64: logo || undefined,
                theme_id: themeId,
                welcome_banner: welcomeBanner,
            };
            const saved = await updateBranding(payload);
            setBranding(saved);
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { error?: string } } })
                ?.response?.data?.error;
            setError(msg || 'Erro ao salvar. Tente novamente.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <p className={styles.loading}>Carregando...</p>;

    const themeVars = buildShowcaseThemeVars(findShowcaseTheme(themeId));

    return (
        <div className={styles.wrapper}>
            {/* Premium Gate Overlay */}
            {!isPro && (
                <div className={styles.gateOverlay}>
                    <div className={styles.gateBox}>
                        <span className={styles.gateIcon}><FiStar style={{ fill: 'currentColor' }} /></span>
                        <h3 className={styles.gateTitle}>Recurso Premium</h3>
                        <p className={styles.gateText}>
                            Personalize o visual do seu espaço para os alunos
                            com logo, cores e mensagem de boas-vindas
                            exclusivas.
                        </p>
                        <p className={styles.gateSub}>
                            Disponível no plano <strong>Pro</strong>.
                        </p>
                    </div>
                </div>
            )}

            <div className={!isPro ? styles.blurred : undefined}>
                {/* Logo */}
                <section className={styles.section}>
                    <h3 className={styles.sectionTitle}>Logo</h3>
                    <p className={styles.sectionDesc}>
                        Exibida no topo do app para seus alunos. JPG, PNG, WebP
                        ou SVG, máx. 2 MB.
                    </p>
                    <div className={styles.logoRow}>
                        {logo ? (
                            <div className={styles.logoPreview}>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={logo}
                                    alt="Logo preview"
                                    className={styles.logoImg}
                                />
                                <button
                                    onClick={removeLogo}
                                    className={styles.removeBtn}
                                    title="Remover logo"
                                >
                                    <FiX />
                                </button>
                            </div>
                        ) : (
                            <div className={styles.logoPlaceholder}>
                                <span>Nenhuma logo</span>
                            </div>
                        )}
                        <button
                            className={styles.uploadBtn}
                            onClick={() => fileInputRef.current?.click()}
                            disabled={!isPro}
                        >
                            {logo ? 'Trocar logo' : 'Fazer upload'}
                        </button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/svg+xml"
                            style={{ display: 'none' }}
                            onChange={handleLogoChange}
                        />
                    </div>
                </section>

                {/* Tema */}
                <section className={styles.section}>
                    <h3 className={styles.sectionTitle}>Tema</h3>
                    <p className={styles.sectionDesc}>
                        Escolha uma paleta: ela define as cores do app para seus
                        alunos e também a sua página de divulgação. As cores de
                        cartão, borda e texto são derivadas automaticamente,
                        garantindo contraste.
                    </p>
                    <div className={styles.themeRow}>
                        {SHOWCASE_THEMES.map((t) => (
                            <button
                                key={t.id}
                                type="button"
                                className={styles.themeOption}
                                onClick={() => setThemeId(t.id)}
                                disabled={!isPro}
                                aria-pressed={themeId === t.id}
                                title={t.label}
                            >
                                <span
                                    className={`${styles.themeSwatch} ${
                                        themeId === t.id
                                            ? styles.themeSwatchActive
                                            : ''
                                    }`}
                                    style={{
                                        background: `linear-gradient(135deg, ${t.accent} 50%, ${t.bg} 50%)`,
                                    }}
                                />
                                <span
                                    className={`${styles.themeLabel} ${
                                        themeId === t.id
                                            ? styles.themeLabelActive
                                            : ''
                                    }`}
                                >
                                    {t.label}
                                </span>
                            </button>
                        ))}
                    </div>
                </section>

                {/* Welcome Banner */}
                <section className={styles.section}>
                    <h3 className={styles.sectionTitle}>
                        Mensagem de Boas-vindas
                    </h3>
                    <p className={styles.sectionDesc}>
                        Texto exibido para os alunos ao entrar no app. Máx. 200
                        caracteres.
                    </p>
                    <textarea
                        className={styles.textarea}
                        value={welcomeBanner}
                        onChange={(e) => setWelcomeBanner(e.target.value)}
                        maxLength={200}
                        rows={3}
                        placeholder='Ex: "Bem-vindo ao treino da equipe João Silva Fitness! 💪"'
                        disabled={!isPro}
                    />
                    <span className={styles.charCount}>
                        {welcomeBanner.length}/200
                    </span>
                </section>

                {/* Preview */}
                <section className={styles.section}>
                    <h3 className={styles.sectionTitle}>Pré-visualização</h3>
                    <div
                        className={styles.preview}
                        style={
                            {
                                '--preview-primary': themeVars['--vt-accent'],
                                '--preview-secondary': themeVars['--vt-bg'],
                                // O texto do banner acompanha o fundo da paleta:
                                // fixá-lo em branco sumiria na paleta clara.
                                '--preview-banner-text':
                                    themeVars['--vt-text'],
                            } as React.CSSProperties
                        }
                    >
                        <div className={styles.previewHeader}>
                            {logo ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                    src={logo}
                                    alt="logo"
                                    className={styles.previewLogo}
                                />
                            ) : (
                                <span className={styles.previewLogoText}>
                                    Seu Logo
                                </span>
                            )}
                            <span className={styles.previewAppName}>
                                Venafit
                            </span>
                        </div>
                        {welcomeBanner && (
                            <div className={styles.previewBanner}>
                                {welcomeBanner}
                            </div>
                        )}
                    </div>
                </section>

                {/* Actions */}
                {error && <p className={styles.error}>{error}</p>}
                {success && (
                    <p className={styles.successMsg}>
                        <FiCheck /> Branding salvo com sucesso!
                    </p>
                )}
                <button
                    className={styles.saveBtn}
                    onClick={handleSave}
                    disabled={saving || !isPro}
                >
                    {saving ? 'Salvando...' : 'Salvar personalização'}
                </button>
            </div>
        </div>
    );
}
