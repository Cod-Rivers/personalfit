'use client';

import React, { useEffect, useState } from 'react';
import { isAxiosError } from 'axios';
import Modal from '@/components/system/Modal';
import {
    BRAZILIAN_STATES,
    DEFAULT_AUTHOR_DIRECT_SHARE,
    DEFAULT_AUTHOR_STORE_SHARE,
    getAuthorPhotoUploadUrl,
    updatePartnerAuthor,
    type AuthorRequest,
    type ReferralPartner,
} from '@/libs/referralPartnerService';
import { uploadToSignedUrl } from '@/libs/storeService';
import styles from './AdminReferralPartners.module.css';

/** Limites do perfil (sincronia com domain/referralpartner/author.go). */
const BIO_MAX = 600;

/**
 * Bloco "Autor" da loja de programas (Todo/PLANO_LOJA_DE_TREINOS.md §5.1 e
 * §5.8): perfil público, CREF conferido na consulta pública do CONFEF,
 * porcentagens do autor, Termo do Autor e foto. O autor usa o mesmo código,
 * o mesmo painel e o mesmo repasse da parceria.
 */
export default function AuthorBlockModal({
    partner,
    onClose,
    onSaved,
}: {
    partner: ReferralPartner | null;
    onClose: () => void;
    onSaved: () => void;
}) {
    const [form, setForm] = useState<AuthorRequest | null>(null);
    const [specialties, setSpecialties] = useState('');
    const [photoUrl, setPhotoUrl] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!partner) return;
        const a = partner.author;
        setForm({
            enabled: a?.enabled ?? false,
            public_name: a?.public_name ?? partner.name,
            bio: a?.bio ?? '',
            specialties: a?.specialties ?? [],
            cref: a?.cref ?? '',
            cref_state: a?.cref_state ?? 'SP',
            cref_verified: !!a?.cref_verified_at,
            store_share: a?.store_share ?? DEFAULT_AUTHOR_STORE_SHARE,
            direct_share: a?.direct_share ?? DEFAULT_AUTHOR_DIRECT_SHARE,
            terms_accepted: !!a?.terms_accepted_at,
            photo_key: a?.photo_key ?? '',
        });
        setSpecialties((a?.specialties ?? []).join(', '));
        setPhotoUrl(a?.photo_url ?? '');
        setError('');
    }, [partner]);

    if (!partner || !form) return null;

    const set = (patch: Partial<AuthorRequest>) =>
        setForm((f) => (f ? { ...f, ...patch } : f));

    const errorText = (err: unknown, fallback: string) =>
        (isAxiosError(err) &&
            (err.response?.data as { error?: string })?.error) ||
        fallback;

    const uploadPhoto = async (file: File | undefined) => {
        if (!file) return;
        setBusy(true);
        setError('');
        try {
            const up = await getAuthorPhotoUploadUrl(partner.id, file.type);
            await uploadToSignedUrl(up.upload_url, file);
            set({ photo_key: up.key });
            setPhotoUrl(up.public_url);
        } catch (err) {
            setError(
                errorText(
                    err,
                    'Não foi possível enviar a foto (JPG, PNG ou WebP, até 5 MB).',
                ),
            );
        } finally {
            setBusy(false);
        }
    };

    const save = async (e: React.FormEvent) => {
        e.preventDefault();
        setBusy(true);
        setError('');
        try {
            await updatePartnerAuthor(partner.id, {
                ...form,
                specialties: specialties
                    .split(',')
                    .map((x) => x.trim())
                    .filter(Boolean),
            });
            onSaved();
            onClose();
        } catch (err) {
            setError(
                errorText(err, 'Não foi possível salvar o bloco de autor.'),
            );
        } finally {
            setBusy(false);
        }
    };

    const verifiedAt = partner.author?.cref_verified_at;

    return (
        <Modal
            open
            onClose={onClose}
            title={`Autor na loja: ${partner.name}`}
            footer={
                <>
                    <button
                        type="button"
                        className={styles.btnCancel}
                        onClick={onClose}
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        form="authorBlockForm"
                        className={styles.btnSave}
                        disabled={busy}
                    >
                        {busy ? 'Salvando…' : 'Salvar'}
                    </button>
                </>
            }
        >
            {error && <div className={styles.errorMsg}>{error}</div>}
            <form id="authorBlockForm" className={styles.form} onSubmit={save}>
                {!partner.account_email && (
                    <p className={styles.hint}>
                        Para ligar a loja do autor, libere antes o painel do
                        parceiro para a conta de personal dele (botão
                        &quot;Painel&quot;).
                    </p>
                )}
                <label className={styles.row}>
                    <span className={styles.label}>
                        <input
                            type="checkbox"
                            checked={form.enabled}
                            onChange={(e) => set({ enabled: e.target.checked })}
                        />{' '}
                        Loja do autor ligada
                    </span>
                    <small className={styles.smallHint}>
                        Desligada, os programas dele saem da vitrine; a parceria
                        continua como está.
                    </small>
                </label>

                <div className={styles.row}>
                    <label className={styles.label} htmlFor="author_name">
                        Nome público
                    </label>
                    <input
                        id="author_name"
                        className={styles.input}
                        value={form.public_name}
                        maxLength={60}
                        onChange={(e) => set({ public_name: e.target.value })}
                        required
                    />
                </div>

                <div className={styles.row}>
                    <span className={styles.label}>CREF</span>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <input
                            className={styles.input}
                            placeholder="012345-G"
                            aria-label="Número do CREF com a categoria"
                            value={form.cref}
                            onChange={(e) => set({ cref: e.target.value })}
                            required
                        />
                        <select
                            className={styles.input}
                            aria-label="UF do CREF"
                            value={form.cref_state}
                            onChange={(e) =>
                                set({ cref_state: e.target.value })
                            }
                            style={{ maxWidth: 96 }}
                        >
                            {BRAZILIAN_STATES.map((uf) => (
                                <option key={uf} value={uf}>
                                    {uf}
                                </option>
                            ))}
                        </select>
                    </div>
                    <label className={styles.smallHint}>
                        <input
                            type="checkbox"
                            checked={form.cref_verified}
                            onChange={(e) =>
                                set({ cref_verified: e.target.checked })
                            }
                        />{' '}
                        Conferi o registro ativo na consulta pública do CONFEF
                        {verifiedAt &&
                            ` (conferido em ${new Date(verifiedAt).toLocaleDateString('pt-BR')})`}
                    </label>
                </div>

                <div className={styles.row}>
                    <span className={styles.label}>
                        Parte do autor (% do líquido)
                    </span>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <label className={styles.smallHint} style={{ flex: 1 }}>
                            Vitrine
                            <input
                                type="number"
                                className={styles.input}
                                min={0}
                                max={100}
                                step="0.5"
                                value={form.store_share}
                                onChange={(e) =>
                                    set({ store_share: Number(e.target.value) })
                                }
                            />
                        </label>
                        <label className={styles.smallHint} style={{ flex: 1 }}>
                            Venda direta (link ou código dele)
                            <input
                                type="number"
                                className={styles.input}
                                min={0}
                                max={100}
                                step="0.5"
                                value={form.direct_share}
                                onChange={(e) =>
                                    set({
                                        direct_share: Number(e.target.value),
                                    })
                                }
                            />
                        </label>
                    </div>
                    <small className={styles.smallHint}>
                        Ficam congeladas em cada venda: mudar agora não altera o
                        que já foi vendido.
                    </small>
                </div>

                <label className={styles.row}>
                    <span className={styles.label}>
                        <input
                            type="checkbox"
                            checked={form.terms_accepted}
                            onChange={(e) =>
                                set({ terms_accepted: e.target.checked })
                            }
                        />{' '}
                        Termo do Autor assinado
                    </span>
                    <small className={styles.smallHint}>
                        Sem o termo, nenhum programa dele é publicado.
                        {partner.author?.terms_accepted_at &&
                            (partner.author.terms_accepted_via === 'panel'
                                ? ` Aceito pelo autor no painel em ${new Date(partner.author.terms_accepted_at).toLocaleDateString('pt-BR')} (versão ${partner.author.terms_version}).`
                                : ` Registrado pela equipe em ${new Date(partner.author.terms_accepted_at).toLocaleDateString('pt-BR')}.`)}
                    </small>
                </label>

                <div className={styles.row}>
                    <label className={styles.label} htmlFor="author_bio">
                        Apresentação ({form.bio.length}/{BIO_MAX})
                    </label>
                    <textarea
                        id="author_bio"
                        className={styles.input}
                        rows={4}
                        maxLength={BIO_MAX}
                        value={form.bio}
                        onChange={(e) => set({ bio: e.target.value })}
                    />
                </div>

                <div className={styles.row}>
                    <label
                        className={styles.label}
                        htmlFor="author_specialties"
                    >
                        Especialidades (separadas por vírgula, até 6)
                    </label>
                    <input
                        id="author_specialties"
                        className={styles.input}
                        value={specialties}
                        onChange={(e) => setSpecialties(e.target.value)}
                    />
                </div>

                <div className={styles.row}>
                    <span className={styles.label}>Foto</span>
                    {photoUrl && (
                        <img
                            src={photoUrl}
                            alt=""
                            style={{
                                width: 72,
                                height: 72,
                                borderRadius: '50%',
                                objectFit: 'cover',
                            }}
                        />
                    )}
                    <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={(e) => void uploadPhoto(e.target.files?.[0])}
                        disabled={busy}
                    />
                    {form.photo_key && (
                        <button
                            type="button"
                            className={styles.btnCancel}
                            onClick={() => {
                                set({ photo_key: '' });
                                setPhotoUrl('');
                            }}
                        >
                            Tirar a foto
                        </button>
                    )}
                </div>
            </form>
        </Modal>
    );
}
