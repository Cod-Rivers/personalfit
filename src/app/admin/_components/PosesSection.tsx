'use client';

import { useCallback, useEffect, useState } from 'react';
import {
    FiCheck,
    FiEdit2,
    FiEyeOff,
    FiPlus,
    FiRefreshCw,
    FiTrash2,
    FiUpload,
    FiX,
} from 'react-icons/fi';
import { uploadToR2 } from '@/libs/adminService';
import {
    createPoseDeck,
    deletePoseDeck,
    listPoseDecks,
    requestPoseUploadUrl,
    updatePoseDeck,
    type PoseDeck,
} from '@/libs/studentChallengeAntiFraudService';
import s from './posesSection.module.css';

/** Limites do domínio (`MinDeckPoses`/`MaxDeckPoses`). Repetidos aqui só para
 * o formulário avisar antes de mandar — quem recusa de verdade é o servidor. */
const MIN_POSES = 8;
const MAX_POSES = 20;

interface DraftPose {
    id: string;
    label: string;
    imageKey: string;
    /** Prévia local (blob) enquanto a carta ainda não foi salva; para carta já
     * salva, é a URL assinada que veio do servidor. */
    previewUrl: string;
    uploading: boolean;
}

/** Converte o rótulo em um id estável e seguro para virar nome de arquivo.
 * O servidor sanitiza de novo; isto é só para o id nascer legível. */
function slugify(label: string): string {
    return label
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 40);
}

/**
 * Montagem e manutenção dos baralhos de poses do antifraude.
 *
 * Sem baralho, a Pose do Dia não acontece e o antifraude fica limitado a
 * conferir fotos, sem prova de presença. Um admin monta aqui o baralho da
 * PLATAFORMA, gratuito e disponível a todos os personais — é ele que tira a
 * feature do papel, já que quase ninguém vai produzir quinze imagens antes de
 * criar o primeiro desafio. Um personal PRO monta o próprio pelo mesmo
 * caminho; quem separa os dois destinos é o servidor.
 *
 * Dá para ter QUANTOS baralhos quiser: cada desafio escolhe um na configuração
 * do antifraude.
 *
 * O que pode ser editado depois depende de o baralho já estar em uso, e a
 * razão é o sorteio: o TAMANHO do baralho entra no cálculo da carta do dia.
 * Corrigir um rótulo ou trocar uma imagem não muda carta nenhuma e vale
 * sempre; acrescentar ou remover carta muda, e por isso trava assim que um
 * desafio que usa o baralho começa. Nesse caso a saída é aposentar o baralho e
 * montar outro.
 */
export default function PosesSection() {
    const [decks, setDecks] = useState<PoseDeck[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [ok, setOk] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    /** null = nenhum formulário aberto; 'new' = criando; id = editando. */
    const [editing, setEditing] = useState<string | null>(null);
    const [name, setName] = useState('');
    const [poses, setPoses] = useState<DraftPose[]>([]);
    const [label, setLabel] = useState('');

    const load = useCallback(async () => {
        setLoading(true);
        try {
            setDecks(await listPoseDecks());
        } catch {
            // A rota não existe com ADHERENCE_ANTIFRAUD_ENABLED desligado.
            setDecks([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void load();
    }, [load]);

    const current = decks.find((d) => d.id === editing) ?? null;
    const canEditPoses =
        editing === 'new' || (current?.editability?.can_edit_poses ?? true);

    const closeForm = () => {
        poses.forEach((p) => {
            if (p.previewUrl.startsWith('blob:'))
                URL.revokeObjectURL(p.previewUrl);
        });
        setEditing(null);
        setPoses([]);
        setName('');
        setLabel('');
    };

    const startNew = () => {
        closeForm();
        setEditing('new');
    };

    const startEdit = (deck: PoseDeck) => {
        closeForm();
        setEditing(deck.id);
        setName(deck.name);
        setPoses(
            deck.poses.map((p) => ({
                id: p.id,
                label: p.label,
                imageKey: '',
                previewUrl: p.image_url ?? '',
                uploading: false,
            })),
        );
    };

    /** Sobe a imagem e devolve a key. Usado tanto na carta nova quanto na
     * troca de imagem de uma carta existente. */
    const upload = async (poseId: string, file: File) => {
        const { upload_url, image_key } = await requestPoseUploadUrl(
            poseId,
            file.type,
        );
        await uploadToR2(upload_url, file);
        return image_key;
    };

    const addPose = async (file: File) => {
        const trimmed = label.trim();
        if (!trimmed) {
            setError('Descreva a pose antes de escolher a imagem.');
            return;
        }
        const id = slugify(trimmed);
        if (!id) {
            setError('A descrição precisa ter letras ou números.');
            return;
        }
        if (poses.some((p) => p.id === id)) {
            setError('Já existe uma pose com essa descrição.');
            return;
        }

        setError(null);
        setPoses((prev) => [
            ...prev,
            {
                id,
                label: trimmed,
                imageKey: '',
                previewUrl: URL.createObjectURL(file),
                uploading: true,
            },
        ]);
        setLabel('');

        try {
            const key = await upload(id, file);
            setPoses((prev) =>
                prev.map((p) =>
                    p.id === id ? { ...p, imageKey: key, uploading: false } : p,
                ),
            );
        } catch {
            setError(`Não foi possível enviar a imagem de "${trimmed}".`);
            setPoses((prev) => prev.filter((p) => p.id !== id));
        }
    };

    /** Troca a imagem de uma carta que já existe, mantendo id e rótulo. */
    const replaceImage = async (poseId: string, file: File) => {
        setError(null);
        setPoses((prev) =>
            prev.map((p) => (p.id === poseId ? { ...p, uploading: true } : p)),
        );
        try {
            const key = await upload(poseId, file);
            const preview = URL.createObjectURL(file);
            setPoses((prev) =>
                prev.map((p) =>
                    p.id === poseId
                        ? {
                              ...p,
                              imageKey: key,
                              previewUrl: preview,
                              uploading: false,
                          }
                        : p,
                ),
            );
        } catch {
            setError('Não foi possível trocar a imagem.');
            setPoses((prev) =>
                prev.map((p) =>
                    p.id === poseId ? { ...p, uploading: false } : p,
                ),
            );
        }
    };

    const removePose = (id: string) => {
        setPoses((prev) => {
            const target = prev.find((p) => p.id === id);
            if (target?.previewUrl.startsWith('blob:')) {
                URL.revokeObjectURL(target.previewUrl);
            }
            return prev.filter((p) => p.id !== id);
        });
    };

    const uploadingAny = poses.some((p) => p.uploading);
    const countOk = poses.length >= MIN_POSES && poses.length <= MAX_POSES;
    const canSave = name.trim() !== '' && countOk && !uploadingAny && !busy;

    const save = async () => {
        setBusy(true);
        setError(null);
        setOk(null);
        try {
            if (editing === 'new') {
                await createPoseDeck({
                    name: name.trim(),
                    poses: poses.map((p, i) => ({
                        id: p.id,
                        label: p.label,
                        image_key: p.imageKey,
                        order: i,
                    })),
                });
                setOk('Baralho criado. Ele já aparece para os personais.');
            } else if (current) {
                // Rótulos e troca de imagem valem sempre. O conjunto só vai
                // junto quando a edição de cartas está liberada — mandá-lo com
                // o baralho em uso seria pedir um 409 sem necessidade.
                const labels: Record<string, string> = {};
                const replaceImages: Record<string, string> = {};
                poses.forEach((p) => {
                    labels[p.id] = p.label;
                    if (p.imageKey) replaceImages[p.id] = p.imageKey;
                });
                await updatePoseDeck(current.id, {
                    name: name.trim(),
                    labels,
                    replace_images: replaceImages,
                    poses: canEditPoses
                        ? poses.map((p, i) => ({
                              id: p.id,
                              label: p.label,
                              image_key: p.imageKey,
                              order: i,
                          }))
                        : undefined,
                });
                setOk('Baralho atualizado.');
            }
            closeForm();
            await load();
        } catch {
            setError('Não foi possível salvar o baralho.');
        } finally {
            setBusy(false);
        }
    };

    const retire = async (deck: PoseDeck) => {
        setBusy(true);
        setError(null);
        setOk(null);
        try {
            await updatePoseDeck(deck.id, { active: !deck.active });
            setOk(
                deck.active
                    ? 'Baralho aposentado. Some da lista de escolha; quem já usa continua funcionando.'
                    : 'Baralho reativado.',
            );
            await load();
        } catch {
            setError('Não foi possível mudar o estado do baralho.');
        } finally {
            setBusy(false);
        }
    };

    const remove = async (deck: PoseDeck) => {
        if (
            !confirm(
                `Excluir o baralho "${deck.name}"? Isso não pode ser desfeito.`,
            )
        ) {
            return;
        }
        setBusy(true);
        setError(null);
        setOk(null);
        try {
            await deletePoseDeck(deck.id);
            setOk('Baralho excluído.');
            if (editing === deck.id) closeForm();
            await load();
        } catch {
            setError(
                'Não foi possível excluir. Um baralho já usado por algum desafio só pode ser aposentado.',
            );
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className={s.page}>
            <div className={s.container}>
                <header className={s.header}>
                    <div>
                        <h1 className={s.title}>Baralhos de poses</h1>
                        <p className={s.sub}>
                            As poses que o sistema sorteia, uma por dia, para o
                            aluno provar que a foto do check-in é de hoje. Você
                            pode manter vários baralhos: cada desafio escolhe um
                            na configuração do antifraude.
                        </p>
                    </div>
                    <button className={s.btnPrimary} onClick={startNew}>
                        <FiPlus /> Novo baralho
                    </button>
                </header>

                {error && <div className={s.errorMsg}>{error}</div>}
                {ok && <div className={s.okMsg}>{ok}</div>}

                <section className={s.card}>
                    <h2 className={s.cardTitle}>Baralhos existentes</h2>
                    {loading ? (
                        <p className={s.hint}>Carregando…</p>
                    ) : decks.length === 0 ? (
                        <p className={s.hint}>
                            Nenhum baralho ainda. Enquanto não houver um, o
                            antifraude funciona só no modo de conferir fotos,
                            sem pose.
                        </p>
                    ) : (
                        <ul className={s.deckList}>
                            {decks.map((d) => {
                                const e = d.editability;
                                const mine = !!e;
                                return (
                                    <li key={d.id} className={s.deckItem}>
                                        <div className={s.deckInfo}>
                                            <span className={s.deckName}>
                                                {d.name}
                                                {!d.active && (
                                                    <span
                                                        className={s.retiredTag}
                                                    >
                                                        aposentado
                                                    </span>
                                                )}
                                            </span>
                                            <span className={s.deckMeta}>
                                                {d.is_platform
                                                    ? 'Da plataforma'
                                                    : 'Próprio'}{' '}
                                                · {d.poses.length} poses
                                                {e && e.used_by_challenges > 0
                                                    ? ` · em ${e.used_by_challenges} desafio(s)`
                                                    : ''}
                                            </span>
                                            {e && !e.can_edit_poses && (
                                                <span className={s.deckWarn}>
                                                    Já há desafio em andamento
                                                    com este baralho: dá para
                                                    corrigir textos e trocar
                                                    imagens, mas não acrescentar
                                                    nem remover poses.
                                                </span>
                                            )}
                                        </div>
                                        {mine && (
                                            <div className={s.deckActions}>
                                                <button
                                                    className={s.btnGhost}
                                                    onClick={() => startEdit(d)}
                                                    disabled={busy}
                                                >
                                                    <FiEdit2 /> Editar
                                                </button>
                                                <button
                                                    className={s.btnGhost}
                                                    onClick={() =>
                                                        void retire(d)
                                                    }
                                                    disabled={busy}
                                                >
                                                    {d.active ? (
                                                        <>
                                                            <FiEyeOff />{' '}
                                                            Aposentar
                                                        </>
                                                    ) : (
                                                        <>
                                                            <FiRefreshCw />{' '}
                                                            Reativar
                                                        </>
                                                    )}
                                                </button>
                                                {e?.can_delete && (
                                                    <button
                                                        className={s.btnRemove}
                                                        onClick={() =>
                                                            void remove(d)
                                                        }
                                                        disabled={busy}
                                                    >
                                                        <FiTrash2 /> Excluir
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </section>

                {editing && (
                    <section className={s.card}>
                        <div className={s.formHead}>
                            <h2 className={s.cardTitle}>
                                {editing === 'new'
                                    ? 'Novo baralho'
                                    : `Editando: ${current?.name ?? ''}`}
                            </h2>
                            <button className={s.btnGhost} onClick={closeForm}>
                                <FiX /> Fechar
                            </button>
                        </div>

                        <label className={s.label}>Nome do baralho</label>
                        <input
                            className={s.input}
                            placeholder="Ex.: Poses básicas"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />

                        {canEditPoses ? (
                            <>
                                <label className={s.label}>
                                    Adicionar pose
                                </label>
                                <p className={s.hint}>
                                    Descreva a pose em poucas palavras e escolha
                                    a imagem. A descrição é o que o aluno lê no
                                    check-in, e o que você compara com a foto
                                    enviada.
                                </p>
                                <div className={s.addRow}>
                                    <input
                                        className={s.input}
                                        placeholder="Ex.: braço direito erguido, palma aberta"
                                        value={label}
                                        onChange={(e) =>
                                            setLabel(e.target.value)
                                        }
                                    />
                                    <label className={s.btnUpload}>
                                        <FiUpload /> Imagem
                                        <input
                                            type="file"
                                            accept="image/jpeg,image/png,image/webp"
                                            className={s.hiddenInput}
                                            onChange={(e) => {
                                                const file =
                                                    e.target.files?.[0];
                                                if (file) void addPose(file);
                                                e.target.value = '';
                                            }}
                                        />
                                    </label>
                                </div>
                            </>
                        ) : (
                            <p className={s.warn}>
                                Este baralho já está em uso por um desafio que
                                começou. Dá para corrigir a descrição e trocar a
                                imagem de cada pose, mas acrescentar ou remover
                                mudaria qual pose vale hoje para quem ainda não
                                registrou o treino. Para mudar o conjunto,
                                aposente este baralho e monte outro.
                            </p>
                        )}

                        <p className={s.counter}>
                            {poses.length} pose(s) · mínimo {MIN_POSES}, máximo{' '}
                            {MAX_POSES}
                        </p>

                        <div className={s.grid}>
                            {poses.map((p) => (
                                <figure key={p.id} className={s.poseCard}>
                                    {p.previewUrl ? (
                                        <img
                                            src={p.previewUrl}
                                            alt={p.label}
                                            className={s.poseImg}
                                        />
                                    ) : (
                                        <div className={s.poseImgMissing}>
                                            sem imagem
                                        </div>
                                    )}
                                    <input
                                        className={s.poseLabelInput}
                                        value={p.label}
                                        onChange={(ev) =>
                                            setPoses((prev) =>
                                                prev.map((q) =>
                                                    q.id === p.id
                                                        ? {
                                                              ...q,
                                                              label: ev.target
                                                                  .value,
                                                          }
                                                        : q,
                                                ),
                                            )
                                        }
                                    />
                                    {p.uploading ? (
                                        <span className={s.uploading}>
                                            enviando…
                                        </span>
                                    ) : (
                                        <div className={s.poseActions}>
                                            <label className={s.btnMini}>
                                                <FiUpload /> Trocar
                                                <input
                                                    type="file"
                                                    accept="image/jpeg,image/png,image/webp"
                                                    className={s.hiddenInput}
                                                    onChange={(ev) => {
                                                        const file =
                                                            ev.target
                                                                .files?.[0];
                                                        if (file) {
                                                            void replaceImage(
                                                                p.id,
                                                                file,
                                                            );
                                                        }
                                                        ev.target.value = '';
                                                    }}
                                                />
                                            </label>
                                            {canEditPoses && (
                                                <button
                                                    type="button"
                                                    className={s.btnRemove}
                                                    onClick={() =>
                                                        removePose(p.id)
                                                    }
                                                >
                                                    <FiTrash2 /> Remover
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </figure>
                            ))}
                        </div>

                        <div className={s.actions}>
                            <button
                                type="button"
                                className={s.btnPrimary}
                                disabled={!canSave}
                                onClick={() => void save()}
                            >
                                <FiCheck />{' '}
                                {editing === 'new'
                                    ? 'Criar baralho'
                                    : 'Salvar alterações'}
                            </button>
                        </div>
                    </section>
                )}
            </div>
        </div>
    );
}
