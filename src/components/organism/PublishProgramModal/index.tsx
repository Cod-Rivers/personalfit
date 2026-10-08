'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { isAxiosError } from 'axios';
import Modal from '@/components/system/Modal';
import HelpTooltip from '@/components/atoms/HelpTooltip';
import StoreListingFields from '@/components/organism/StoreListingFields';
import {
    authorProgramActions,
    checkStoreSource,
    createMyStoreProgram,
    EMPTY_LISTING,
    getAuthorStoreMeta,
    getMyStoreCoverUploadUrl,
    setMyStoreCover,
    submitMyStoreProgram,
    uploadToSignedUrl,
    type AdminStoreProgram,
    type AuthorStoreMeta,
    type ContentIssue,
    type StoreListing,
    type StoreSourceCheck,
} from '@/libs/storeService';
import s from './PublishProgramModal.module.css';

interface Props {
    open: boolean;
    onClose: () => void;
    /** Programa novo: o treino de "Minha biblioteca" que vai para a loja. */
    template?: { id: string; name: string };
    /** Programa que já existe: reenvio (rascunho ou recusado) ou alteração
     *  (aprovado). */
    program?: AdminStoreProgram;
    /** Chamado com o programa depois do envio (para a lista recarregar). */
    onDone: (p: AdminStoreProgram) => void;
}

const PRICE_CHANGE_DAYS = 30;

function money(v: number): string {
    return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/** A faixa de um programa publicado mudou há menos de 30 dias. */
function priceLocked(p?: AdminStoreProgram): boolean {
    if (!p?.price_changed_at || !p.published_at) return false;
    const since = Date.now() - new Date(p.price_changed_at).getTime();
    return since < PRICE_CHANGE_DAYS * 24 * 60 * 60 * 1000;
}

function apiData(err: unknown) {
    return isAxiosError(err)
        ? (err.response?.data as
              | { error?: string; code?: string; issues?: ContentIssue[] }
              | undefined)
        : undefined;
}

/**
 * O autor manda um treino para a loja (Todo/PLANO_LOJA_DE_TREINOS.md, fase
 * 2): a ficha, o preço, as checagens automáticas e o envio para a revisão.
 * Três modos: programa novo (a partir de um treino da biblioteca), reenvio
 * (rascunho ou recusado: leva o conteúdo atual do treino) e alteração de um
 * programa aprovado (a vitrine segue com a versão aprovada até a equipe
 * aprovar).
 */
export default function PublishProgramModal({
    open,
    onClose,
    template,
    program,
    onDone,
}: Props) {
    const mode = template
        ? 'create'
        : program
          ? authorProgramActions(program).submitMode
          : null;
    const sourceId = template?.id ?? program?.source_template_id;

    const [meta, setMeta] = useState<AuthorStoreMeta | null>(null);
    const [check, setCheck] = useState<StoreSourceCheck | null>(null);
    // A checagem prévia falhou (treino que não é da conta, rede): o envio
    // roda as mesmas checagens de novo no servidor.
    const [checkFailed, setCheckFailed] = useState(false);
    const [listing, setListing] = useState<StoreListing>(EMPTY_LISTING);
    const [tier, setTier] = useState('2990');
    const [coverKey, setCoverKey] = useState('');
    const [coverUrl, setCoverUrl] = useState('');
    const [includeContent, setIncludeContent] = useState(true);
    const [note, setNote] = useState('');
    const [removeFromLibrary, setRemoveFromLibrary] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [blockers, setBlockers] = useState<ContentIssue[]>([]);
    const [done, setDone] = useState(false);

    useEffect(() => {
        if (!open) return;
        setError('');
        setBlockers([]);
        setDone(false);
        setNote('');
        setRemoveFromLibrary(false);
        setIncludeContent(!!sourceId);
        setListing(
            program
                ? { ...program.listing }
                : { ...EMPTY_LISTING, title: template?.name ?? '' },
        );
        setTier(program?.price_tier ?? '2990');
        setCoverKey(program?.cover_key ?? '');
        setCoverUrl(program?.cover_url ?? '');
        setMeta(null);
        setCheck(null);
        setCheckFailed(false);
        getAuthorStoreMeta()
            .then(setMeta)
            .catch(() =>
                setError('Não foi possível abrir o envio. Tente de novo.'),
            );
        if (sourceId) {
            checkStoreSource(sourceId)
                .then(setCheck)
                .catch(() => setCheckFailed(true));
        }
    }, [open, program, template, sourceId]);

    if (!open) return null;

    const carriesContent = mode !== 'revision' || includeContent;
    const blocked = carriesContent && !!check?.blocked;
    const needsRemoval = mode === 'create' && !!check?.in_library;
    const canSend =
        !!meta?.can_publish &&
        !busy &&
        !!listing.title.trim() &&
        !blocked &&
        (!needsRemoval || removeFromLibrary);

    const uploadCover = async (file: File | undefined) => {
        if (!file || !program) return;
        setBusy(true);
        setError('');
        try {
            const up = await getMyStoreCoverUploadUrl(program.id, file.type);
            await uploadToSignedUrl(up.upload_url, file);
            if (mode === 'resubmit') {
                const p = await setMyStoreCover(program.id, up.key);
                onDone(p);
            }
            setCoverKey(up.key);
            setCoverUrl(up.public_url);
        } catch (err) {
            setError(
                apiData(err)?.error ||
                    'A capa não foi enviada. Use JPG, PNG ou WebP de até 5 MB.',
            );
        } finally {
            setBusy(false);
        }
    };

    const send = async (e: React.FormEvent) => {
        e.preventDefault();
        setBusy(true);
        setError('');
        setBlockers([]);
        try {
            const p =
                mode === 'create' && template
                    ? await createMyStoreProgram({
                          source_template_id: template.id,
                          listing,
                          price_tier: tier,
                          remove_source_from_library: removeFromLibrary,
                      })
                    : await submitMyStoreProgram(program!.id, {
                          listing,
                          price_tier: tier,
                          cover_key: coverKey,
                          include_content:
                              mode === 'revision' ? includeContent : true,
                          note: mode === 'revision' ? note : undefined,
                      });
            setDone(true);
            onDone(p);
        } catch (err) {
            const data = apiData(err);
            if (data?.issues) setBlockers(data.issues);
            if (data?.code === 'source_in_public_library') {
                setCheck((c) => ({
                    issues: c?.issues ?? [],
                    blocked: c?.blocked ?? false,
                    in_library: true,
                }));
            }
            setError(data?.error || 'Não foi possível enviar. Tente de novo.');
        } finally {
            setBusy(false);
        }
    };

    const title =
        mode === 'create'
            ? 'Vender na loja'
            : mode === 'revision'
              ? 'Alterar programa à venda'
              : 'Enviar para revisão';
    const issues = blockers.length ? blockers : (check?.issues ?? []);

    return (
        <Modal
            open={open}
            onClose={onClose}
            title={
                <>
                    {title}{' '}
                    <HelpTooltip
                        label="Ajuda sobre o envio para a loja"
                        text="A equipe revisa cada programa antes de ir à venda. Impede o envio: menos de 2 treinos, treino vazio, exercício sem vídeo ou com link do YouTube, Vimeo, Instagram ou TikTok. A descrição não pode prometer resultado."
                        href="/ajuda#loja-passo-a-passo"
                    />
                </>
            }
        >
            {done ? (
                <div className={s.form} aria-live="polite">
                    <div className={s.okMsg}>
                        {mode === 'revision'
                            ? 'Alteração enviada. A vitrine continua com a versão aprovada até a equipe revisar; a resposta chega por e-mail.'
                            : 'Programa enviado para revisão. A equipe responde por e-mail; a situação aparece no seu painel, em Meus programas.'}
                    </div>
                    <div className={s.actions}>
                        <Link href="/parceiro" className={s.btnGhost}>
                            Abrir o painel
                        </Link>
                        <button
                            type="button"
                            className={s.btnPrimary}
                            onClick={onClose}
                        >
                            Fechar
                        </button>
                    </div>
                </div>
            ) : !mode ? (
                <p className={s.hint}>
                    Este programa já está na fila de revisão. Cancele o envio no
                    painel para mudar alguma coisa.
                </p>
            ) : (
                <form className={s.form} onSubmit={send}>
                    {meta && !meta.can_publish && (
                        <div className={s.notice} role="status">
                            {!meta.cref_verified
                                ? 'O seu CREF ainda não foi conferido pela equipe.'
                                : 'Antes de enviar, aceite o Termo do Autor no seu painel.'}{' '}
                            <Link href="/parceiro">Abrir o painel</Link>
                        </div>
                    )}
                    {mode === 'revision' && (
                        <p className={s.hint}>
                            O programa continua à venda como está. A alteração
                            só entra na vitrine depois da revisão, e quem já
                            comprou fica com a versão que comprou.
                        </p>
                    )}
                    {program?.status === 'rejected' &&
                        program.rejection_reason && (
                            <div className={s.notice}>
                                <strong>Motivo da recusa:</strong>{' '}
                                {program.rejection_reason}
                            </div>
                        )}
                    {error && (
                        <div className={s.errorMsg} role="alert">
                            {error}
                        </div>
                    )}

                    {carriesContent && (
                        <section className={s.card}>
                            <h3 className={s.cardTitle}>Checagens do treino</h3>
                            {!sourceId ? (
                                <p className={s.hint}>
                                    O treino de origem não está mais em Minha
                                    biblioteca: vai o conteúdo que já está no
                                    programa.
                                </p>
                            ) : checkFailed && !blockers.length ? (
                                <p className={s.hint}>
                                    Não deu para conferir agora. As checagens
                                    rodam de novo no envio.
                                </p>
                            ) : !check && !blockers.length ? (
                                <p className={s.hint}>Conferindo…</p>
                            ) : issues.length === 0 ? (
                                <p className={s.hint}>
                                    Tudo certo: pelo menos 2 treinos, nenhum
                                    vazio e todo exercício com vídeo.
                                </p>
                            ) : (
                                <ul className={s.issues}>
                                    {issues.map((i, idx) => (
                                        <li
                                            key={idx}
                                            className={
                                                i.severity === 'block'
                                                    ? s.issueBlock
                                                    : s.issue
                                            }
                                        >
                                            {i.severity === 'block'
                                                ? 'Impede o envio: '
                                                : 'Aviso: '}
                                            {i.message}
                                        </li>
                                    ))}
                                </ul>
                            )}
                            {blocked && (
                                <p className={s.hint}>
                                    Ajuste o treino em Minha biblioteca
                                    (&ldquo;Montar treinos&rdquo;) e abra este
                                    envio de novo. Exercício que não existe no
                                    app: &ldquo;Criar exercício com meu
                                    vídeo&rdquo; no buscador do editor.
                                </p>
                            )}
                        </section>
                    )}

                    {needsRemoval && (
                        <label className={s.check}>
                            <input
                                type="checkbox"
                                checked={removeFromLibrary}
                                onChange={(e) =>
                                    setRemoveFromLibrary(e.target.checked)
                                }
                            />
                            <span>
                                Tirar este treino da biblioteca pública: ele
                                fica só com você. Um treino à venda não pode
                                ficar de graça para outros personais.
                            </span>
                        </label>
                    )}

                    {mode === 'revision' && (
                        <label className={s.check}>
                            <input
                                type="checkbox"
                                checked={includeContent}
                                disabled={!sourceId}
                                onChange={(e) =>
                                    setIncludeContent(e.target.checked)
                                }
                            />
                            <span>
                                Levar o conteúdo atual do treino (o que você
                                mudou em Minha biblioteca). Desmarcado, a
                                alteração é só da ficha, do preço ou da capa.
                            </span>
                        </label>
                    )}

                    <label className={s.field}>
                        <span className={s.label}>Preço</span>
                        <select
                            className={s.input}
                            value={tier}
                            disabled={
                                mode === 'revision' && priceLocked(program)
                            }
                            onChange={(e) => setTier(e.target.value)}
                        >
                            {(meta?.price_tiers ?? []).map((t) => (
                                <option key={t.id} value={t.id}>
                                    {money(t.value)}
                                </option>
                            ))}
                        </select>
                        <small className={s.hint}>
                            {mode === 'revision' && priceLocked(program)
                                ? 'O preço mudou há menos de 30 dias: por enquanto, fica como está.'
                                : 'Depois de publicado, o preço muda no máximo uma vez a cada 30 dias.'}
                        </small>
                    </label>

                    <StoreListingFields
                        listing={listing}
                        onChange={setListing}
                        showReviewHints
                    />

                    {program && (
                        <div className={s.field}>
                            <span className={s.label}>Capa (opcional)</span>
                            {coverUrl ? (
                                <img
                                    src={coverUrl}
                                    alt=""
                                    className={s.cover}
                                />
                            ) : (
                                <p className={s.hint}>
                                    Sem capa: a loja usa a imagem do primeiro
                                    exercício.
                                </p>
                            )}
                            <input
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                disabled={busy}
                                onChange={(e) =>
                                    void uploadCover(e.target.files?.[0])
                                }
                            />
                            {mode === 'revision' && (
                                <small className={s.hint}>
                                    A capa nova entra junto com a alteração.
                                </small>
                            )}
                        </div>
                    )}
                    {mode === 'create' && (
                        <p className={s.hint}>
                            A capa você envia depois, no painel. Até lá, a loja
                            usa a imagem do primeiro exercício.
                        </p>
                    )}

                    {mode === 'revision' && (
                        <label className={s.field}>
                            <span className={s.label}>
                                O que mudou? (para a equipe, {note.length}/500)
                            </span>
                            <textarea
                                className={s.input}
                                rows={2}
                                maxLength={500}
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                            />
                        </label>
                    )}

                    <p className={s.hint}>
                        Ao enviar, você confirma que o programa e os vídeos
                        seguem o{' '}
                        <Link href="/loja/termo-do-autor" target="_blank">
                            Termo do Autor
                        </Link>
                        .
                    </p>
                    <div className={s.actions}>
                        <button
                            type="button"
                            className={s.btnGhost}
                            onClick={onClose}
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className={s.btnPrimary}
                            disabled={!canSend}
                        >
                            {busy
                                ? 'Enviando…'
                                : mode === 'revision'
                                  ? 'Enviar alteração'
                                  : 'Enviar para revisão'}
                        </button>
                    </div>
                </form>
            )}
        </Modal>
    );
}
