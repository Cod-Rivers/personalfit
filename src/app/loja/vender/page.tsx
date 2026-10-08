'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { isAxiosError } from 'axios';
import { FiAward } from 'react-icons/fi';
import FollowUpPage from '@/components/templates/FollowUpPage';
import { getToken, getUser } from '@/libs/session';
import {
    APPLICATION_LIMITS,
    BR_STATES,
    getMyAuthorApplication,
    submitAuthorApplication,
    type AuthorApplicationForm,
    type MyAuthorApplication,
} from '@/libs/storeService';
import s from './vender.module.css';

const EMPTY_FORM: AuthorApplicationForm = {
    public_name: '',
    cref: '',
    cref_state: '',
    phone: '',
    bio: '',
    specialties: [],
    pitch: '',
    links: '',
    desired_code: '',
};

function fmtDate(iso?: string): string {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString('pt-BR');
}

/** "Hipertrofia, glúteos" → ["Hipertrofia", "glúteos"] (até o limite). */
function parseSpecialties(raw: string): string[] {
    return raw
        .split(',')
        .map((x) => x.trim())
        .filter(Boolean)
        .slice(0, APPLICATION_LIMITS.specialties);
}

/**
 * "Vender seus treinos" (Todo/PLANO_LOJA_DE_TREINOS.md, fase 2): como a loja
 * funciona para o profissional e a candidatura a autor. A equipe confere o
 * CREF e responde por e-mail; aprovado, o autor aceita o termo no painel e
 * publica a partir de "Minha biblioteca".
 */
export default function VenderTreinosPage() {
    // Pública (fase 3): é o link de recrutamento de autores. Sem login,
    // explica e leva ao cadastro; a candidatura pede conta de personal.
    const [session, setSession] = useState<{ role?: string } | null>(null);
    const [checking, setChecking] = useState(true);
    useEffect(() => {
        setSession(getToken() ? getUser() : null);
        setChecking(false);
    }, []);
    const isPersonal = session?.role === 'personal';
    const [mine, setMine] = useState<MyAuthorApplication | null>(null);
    const [form, setForm] = useState<AuthorApplicationForm>(EMPTY_FORM);
    const [specialties, setSpecialties] = useState('');
    const [reapplying, setReapplying] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [loadError, setLoadError] = useState('');

    const load = useCallback(async () => {
        setLoadError('');
        try {
            setMine(await getMyAuthorApplication());
        } catch {
            setLoadError(
                'Não foi possível carregar a sua candidatura. Tente de novo em instantes.',
            );
        }
    }, []);

    useEffect(() => {
        if (!checking && isPersonal) void load();
    }, [checking, isPersonal, load]);

    if (checking) return null;

    const set = (patch: Partial<AuthorApplicationForm>) =>
        setForm((f) => ({ ...f, ...patch }));

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setBusy(true);
        setError('');
        try {
            await submitAuthorApplication({
                ...form,
                specialties: parseSpecialties(specialties),
            });
            setReapplying(false);
            await load();
        } catch (err) {
            const data = isAxiosError(err)
                ? (err.response?.data as { error?: string; code?: string })
                : undefined;
            setError(
                data?.code === 'referral_code_taken'
                    ? 'Esse código já é de outro parceiro. Escolha outro, ou deixe em branco para o sistema sortear.'
                    : data?.error ||
                          'Não foi possível enviar a candidatura. Tente de novo.',
            );
        } finally {
            setBusy(false);
        }
    };

    const app = mine?.application;
    const showForm =
        isPersonal &&
        mine &&
        !mine.is_author &&
        (!app || (app.status === 'rejected' && reapplying));

    return (
        <FollowUpPage
            title="Vender seus treinos"
            icon={<FiAward aria-hidden />}
            subtitle="Para profissionais de Educação Física com CREF ativo"
        >
            <section className={s.section} aria-labelledby="como">
                <h2 id="como" className={s.h2}>
                    Como funciona
                </h2>
                <ol className={s.steps}>
                    <li>
                        <strong>Candidatura.</strong> Você manda o seu CREF e
                        conta o que pretende vender. A equipe confere o registro
                        na consulta pública do CONFEF e responde por e-mail.
                    </li>
                    <li>
                        <strong>Termo do Autor.</strong> Aprovado, você lê e
                        aceita o termo no seu painel de parceiro.
                    </li>
                    <li>
                        <strong>Publicação.</strong> Em Minha biblioteca, use
                        &ldquo;Vender na loja&rdquo; no treino que você quer
                        vender: escreva a ficha, escolha o preço e envie. A
                        equipe revisa e avisa por e-mail.
                    </li>
                </ol>
                <ul className={s.facts}>
                    <li>
                        Você fica com <strong>70% do líquido</strong> nas vendas
                        pela vitrine e com <strong>85%</strong> quando o
                        comprador chega pelo seu link ou código.
                    </li>
                    <li>
                        Não precisa ser PRO. Exercício que não existe no app
                        você grava e envia com o seu vídeo.
                    </li>
                    <li>
                        Você acompanha as vendas no painel, sem nenhum dado
                        pessoal de quem comprou.
                    </li>
                </ul>
                <p className={s.muted}>
                    Leia o{' '}
                    <Link href="/loja/termo-do-autor">Termo do Autor</Link>{' '}
                    antes de se candidatar.
                </p>
            </section>

            {!session ? (
                <section className={s.card}>
                    <p className={s.muted}>
                        A candidatura é feita com uma conta de personal no
                        Venafit.
                    </p>
                    <div className={s.actions}>
                        <Link
                            href="/cadastro?redirect=%2Floja%2Fvender"
                            className={s.btnPrimary}
                        >
                            Criar conta de personal
                        </Link>
                        <Link
                            href="/?redirect=%2Floja%2Fvender"
                            className={s.btnGhost}
                        >
                            Já tenho conta: entrar
                        </Link>
                    </div>
                </section>
            ) : !isPersonal ? (
                <p className={s.notice}>
                    A candidatura é feita com uma conta de personal no Venafit.
                    Entre com a sua conta de personal, ou crie uma, para se
                    candidatar.
                </p>
            ) : loadError ? (
                <div className={s.error} role="alert">
                    {loadError}
                </div>
            ) : !mine ? (
                <p className={s.muted}>Carregando…</p>
            ) : mine.is_author ? (
                <section className={s.card} aria-live="polite">
                    <h2 className={s.h2}>Você já é autor da loja</h2>
                    <p className={s.muted}>
                        Aceite o Termo do Autor e acompanhe seus programas no
                        painel. Para publicar, use &ldquo;Vender na loja&rdquo;
                        em Minha biblioteca.
                    </p>
                    <div className={s.actions}>
                        <Link href="/parceiro" className={s.btnPrimary}>
                            Abrir o painel
                        </Link>
                        <Link
                            href="/personal?tab=ciclos"
                            className={s.btnGhost}
                        >
                            Minha biblioteca
                        </Link>
                    </div>
                </section>
            ) : app?.status === 'pending' ? (
                <section className={s.card} aria-live="polite">
                    <h2 className={s.h2}>Candidatura em análise</h2>
                    <p className={s.muted}>
                        Recebemos a sua candidatura em {fmtDate(app.created_at)}{' '}
                        (CREF {app.cref}/{app.cref_state}). A equipe confere o
                        registro e responde no e-mail desta conta.
                    </p>
                </section>
            ) : app?.status === 'rejected' && !reapplying ? (
                <section className={s.card} aria-live="polite">
                    <h2 className={s.h2}>Candidatura não aprovada</h2>
                    <p className={s.muted}>
                        Resposta da equipe em {fmtDate(app.reviewed_at)}:
                    </p>
                    <blockquote className={s.quote}>
                        {app.rejection_reason}
                    </blockquote>
                    <div className={s.actions}>
                        <button
                            type="button"
                            className={s.btnPrimary}
                            onClick={() => {
                                setForm({
                                    ...EMPTY_FORM,
                                    public_name: app.public_name,
                                    cref: app.cref,
                                    cref_state: app.cref_state,
                                    bio: app.bio ?? '',
                                    pitch: app.pitch,
                                    links: app.links ?? '',
                                });
                                setSpecialties(app.specialties.join(', '));
                                setReapplying(true);
                            }}
                        >
                            Candidatar-se de novo
                        </button>
                    </div>
                </section>
            ) : null}

            {showForm && (
                <form className={s.form} onSubmit={submit}>
                    <h2 className={s.h2}>Candidatura</h2>
                    {error && (
                        <div className={s.error} role="alert">
                            {error}
                        </div>
                    )}
                    <label className={s.field}>
                        <span className={s.label}>
                            Nome público (como aparece na loja) *
                        </span>
                        <input
                            className={s.input}
                            value={form.public_name}
                            maxLength={APPLICATION_LIMITS.publicName}
                            onChange={(e) =>
                                set({ public_name: e.target.value })
                            }
                            required
                        />
                    </label>
                    <div className={s.twoCols}>
                        <label className={s.field}>
                            <span className={s.label}>CREF *</span>
                            <input
                                className={s.input}
                                value={form.cref}
                                placeholder="012345-G"
                                maxLength={10}
                                autoCapitalize="characters"
                                onChange={(e) => set({ cref: e.target.value })}
                                required
                            />
                        </label>
                        <label className={s.field}>
                            <span className={s.label}>UF do CREF *</span>
                            <select
                                className={s.input}
                                value={form.cref_state}
                                onChange={(e) =>
                                    set({ cref_state: e.target.value })
                                }
                                required
                            >
                                <option value="">—</option>
                                {BR_STATES.map((uf) => (
                                    <option key={uf} value={uf}>
                                        {uf}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label className={s.field}>
                            <span className={s.label}>Telefone (opcional)</span>
                            <input
                                className={s.input}
                                type="tel"
                                inputMode="tel"
                                value={form.phone}
                                maxLength={30}
                                onChange={(e) => set({ phone: e.target.value })}
                            />
                        </label>
                    </div>
                    <label className={s.field}>
                        <span className={s.label}>
                            O que você pretende vender? * ({form.pitch.length}/
                            {APPLICATION_LIMITS.pitch})
                        </span>
                        <textarea
                            className={s.input}
                            rows={4}
                            minLength={APPLICATION_LIMITS.pitchMin}
                            maxLength={APPLICATION_LIMITS.pitch}
                            value={form.pitch}
                            placeholder="Ex.: programas de hipertrofia para iniciantes, 3x por semana, na academia."
                            onChange={(e) => set({ pitch: e.target.value })}
                            required
                        />
                    </label>
                    <label className={s.field}>
                        <span className={s.label}>
                            Especialidades (separadas por vírgula, até{' '}
                            {APPLICATION_LIMITS.specialties})
                        </span>
                        <input
                            className={s.input}
                            value={specialties}
                            placeholder="Hipertrofia, emagrecimento, glúteos"
                            onChange={(e) => setSpecialties(e.target.value)}
                        />
                    </label>
                    <label className={s.field}>
                        <span className={s.label}>
                            Apresentação na loja ({form.bio.length}/
                            {APPLICATION_LIMITS.bio})
                        </span>
                        <textarea
                            className={s.input}
                            rows={3}
                            maxLength={APPLICATION_LIMITS.bio}
                            value={form.bio}
                            onChange={(e) => set({ bio: e.target.value })}
                        />
                    </label>
                    <label className={s.field}>
                        <span className={s.label}>
                            Instagram, site ou portfólio (opcional)
                        </span>
                        <input
                            className={s.input}
                            value={form.links}
                            maxLength={APPLICATION_LIMITS.links}
                            onChange={(e) => set({ links: e.target.value })}
                        />
                    </label>
                    {!mine?.is_partner && (
                        <label className={s.field}>
                            <span className={s.label}>
                                Código para o seu link de divulgação (opcional)
                            </span>
                            <input
                                className={s.input}
                                value={form.desired_code}
                                placeholder="ANATREINOS"
                                maxLength={20}
                                autoCapitalize="characters"
                                onChange={(e) =>
                                    set({ desired_code: e.target.value })
                                }
                            />
                            <small className={s.muted}>
                                De 4 a 20 letras ou números. Depois de criado, o
                                código não muda. Em branco, o sistema sorteia
                                um.
                            </small>
                        </label>
                    )}
                    <div className={s.actions}>
                        <button
                            type="submit"
                            className={s.btnPrimary}
                            disabled={busy}
                        >
                            {busy ? 'Enviando…' : 'Enviar candidatura'}
                        </button>
                        {reapplying && (
                            <button
                                type="button"
                                className={s.btnGhost}
                                onClick={() => setReapplying(false)}
                            >
                                Cancelar
                            </button>
                        )}
                    </div>
                </form>
            )}
        </FollowUpPage>
    );
}
