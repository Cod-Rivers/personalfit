'use client';
import React, { useEffect, useRef, useState } from 'react';
import {
    PersonalBranding,
    updateBranding,
    getMyBranding,
} from '@/libs/brandingService';
import { useBranding } from '@/context/BrandingContext';
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
    const [primaryColor, setPrimaryColor] = useState('#0ffcbe');
    const [secondaryColor, setSecondaryColor] = useState('#ff6b6b');
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
                    setPrimaryColor(branding.primary_color ?? '#0ffcbe');
                    setSecondaryColor(branding.secondary_color ?? '#ff6b6b');
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
            const payload: PersonalBranding = {
                logo_base64: logo || undefined,
                primary_color: primaryColor,
                secondary_color: secondaryColor,
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

    return (
        <div className={styles.wrapper}>
            {/* Premium Gate Overlay */}
            {!isPro && (
                <div className={styles.gateOverlay}>
                    <div className={styles.gateBox}>
                        <span className={styles.gateIcon}>⭐</span>
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
                                    ✕
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

                {/* Colors */}
                <section className={styles.section}>
                    <h3 className={styles.sectionTitle}>Cores</h3>
                    <p className={styles.sectionDesc}>
                        Defina as cores que substituirão as cores padrão da
                        plataforma para seus alunos.
                    </p>
                    <div className={styles.colorRow}>
                        <label className={styles.colorLabel}>
                            <span>Cor primária</span>
                            <div className={styles.colorInputWrapper}>
                                <input
                                    type="color"
                                    value={primaryColor}
                                    onChange={(e) =>
                                        setPrimaryColor(e.target.value)
                                    }
                                    disabled={!isPro}
                                    className={styles.colorPicker}
                                />
                                <span className={styles.colorHex}>
                                    {primaryColor}
                                </span>
                            </div>
                        </label>
                        <label className={styles.colorLabel}>
                            <span>Cor secundária</span>
                            <div className={styles.colorInputWrapper}>
                                <input
                                    type="color"
                                    value={secondaryColor}
                                    onChange={(e) =>
                                        setSecondaryColor(e.target.value)
                                    }
                                    disabled={!isPro}
                                    className={styles.colorPicker}
                                />
                                <span className={styles.colorHex}>
                                    {secondaryColor}
                                </span>
                            </div>
                        </label>
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
                                '--preview-primary': primaryColor,
                                '--preview-secondary': secondaryColor,
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
                        ✓ Branding salvo com sucesso!
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
