'use client';

import { useCallback, useEffect, useState } from 'react';
import { FiCheck, FiTrash2, FiUpload } from 'react-icons/fi';
import { uploadToR2 } from '@/libs/adminService';
import {
    createPoseDeck,
    listPoseDecks,
    requestPoseUploadUrl,
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
 * Montagem do baralho de poses do antifraude do Desafio entre Alunos.
 *
 * Existe porque sem baralho a Pose do Dia simplesmente não acontece: o
 * antifraude fica limitado a conferir fotos, sem prova de presença. Um admin
 * cria aqui o baralho da PLATAFORMA, que é gratuito e serve a todos os
 * personais — é ele que tira a feature do papel, já que quase ninguém vai
 * produzir quinze imagens antes de criar o primeiro desafio.
 *
 * Um personal PRO que abra esta tela cria o próprio baralho; quem decide o
 * destino é o servidor, a partir de quem está autenticado.
 */
export default function PosesSection() {
    const [decks, setDecks] = useState<PoseDeck[]>([]);
    const [name, setName] = useState('');
    const [poses, setPoses] = useState<DraftPose[]>([]);
    const [label, setLabel] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [ok, setOk] = useState<string | null>(null);

    const load = useCallback(async () => {
        try {
            setDecks(await listPoseDecks());
        } catch {
            // A rota não existe com ADHERENCE_ANTIFRAUD_ENABLED desligado.
            setDecks([]);
        }
    }, []);

    useEffect(() => {
        void load();
    }, [load]);

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
        const draft: DraftPose = {
            id,
            label: trimmed,
            imageKey: '',
            previewUrl: URL.createObjectURL(file),
            uploading: true,
        };
        setPoses((prev) => [...prev, draft]);
        setLabel('');

        try {
            const { upload_url, image_key } = await requestPoseUploadUrl(
                id,
                file.type,
            );
            await uploadToR2(upload_url, file);
            setPoses((prev) =>
                prev.map((p) =>
                    p.id === id
                        ? { ...p, imageKey: image_key, uploading: false }
                        : p,
                ),
            );
        } catch {
            setError(`Não foi possível enviar a imagem de "${trimmed}".`);
            setPoses((prev) => prev.filter((p) => p.id !== id));
        }
    };

    const removePose = (id: string) => {
        setPoses((prev) => {
            const target = prev.find((p) => p.id === id);
            if (target) URL.revokeObjectURL(target.previewUrl);
            return prev.filter((p) => p.id !== id);
        });
    };

    const ready = poses.filter((p) => !p.uploading && p.imageKey !== '');
    const canSave =
        name.trim() !== '' &&
        ready.length >= MIN_POSES &&
        ready.length <= MAX_POSES &&
        ready.length === poses.length;

    const save = async () => {
        setSaving(true);
        setError(null);
        setOk(null);
        try {
            await createPoseDeck({
                name: name.trim(),
                poses: ready.map((p, i) => ({
                    id: p.id,
                    label: p.label,
                    image_key: p.imageKey,
                    order: i,
                })),
            });
            setOk('Baralho criado. Ele já aparece para os personais.');
            poses.forEach((p) => URL.revokeObjectURL(p.previewUrl));
            setPoses([]);
            setName('');
            await load();
        } catch {
            setError('Não foi possível criar o baralho.');
        } finally {
            setSaving(false);
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
                            aluno provar que a foto do check-in é de hoje.
                        </p>
                    </div>
                </header>

                <section className={s.card}>
                    <h2 className={s.cardTitle}>Baralhos existentes</h2>
                    {decks.length === 0 ? (
                        <p className={s.hint}>
                            Nenhum baralho ainda. Enquanto não houver um, o
                            antifraude funciona só no modo de conferir fotos,
                            sem pose.
                        </p>
                    ) : (
                        <ul className={s.deckList}>
                            {decks.map((d) => (
                                <li key={d.id} className={s.deckItem}>
                                    <span className={s.deckName}>{d.name}</span>
                                    <span className={s.deckMeta}>
                                        {d.is_platform
                                            ? 'Da plataforma'
                                            : 'Próprio'}{' '}
                                        · {d.poses.length} poses
                                    </span>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>

                <section className={s.card}>
                    <h2 className={s.cardTitle}>Novo baralho</h2>

                    {error && <div className={s.errorMsg}>{error}</div>}
                    {ok && <div className={s.okMsg}>{ok}</div>}

                    <label className={s.label}>Nome do baralho</label>
                    <input
                        className={s.input}
                        placeholder="Ex.: Poses básicas"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                    />

                    <label className={s.label}>Adicionar pose</label>
                    <p className={s.hint}>
                        Descreva a pose em poucas palavras e escolha a imagem. A
                        descrição é o que o aluno lê no check-in, e o que o
                        personal compara com a foto enviada.
                    </p>
                    <div className={s.addRow}>
                        <input
                            className={s.input}
                            placeholder="Ex.: braço direito erguido, palma aberta"
                            value={label}
                            onChange={(e) => setLabel(e.target.value)}
                        />
                        <label className={s.btnUpload}>
                            <FiUpload /> Imagem
                            <input
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                className={s.hiddenInput}
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) void addPose(file);
                                    e.target.value = '';
                                }}
                            />
                        </label>
                    </div>

                    <p className={s.counter}>
                        {ready.length} de {MIN_POSES} poses mínimas
                        {ready.length > MAX_POSES &&
                            ` — o máximo é ${MAX_POSES}`}
                    </p>

                    <div className={s.grid}>
                        {poses.map((p) => (
                            <figure key={p.id} className={s.poseCard}>
                                <img
                                    src={p.previewUrl}
                                    alt={p.label}
                                    className={s.poseImg}
                                />
                                <figcaption className={s.poseLabel}>
                                    {p.label}
                                </figcaption>
                                {p.uploading ? (
                                    <span className={s.uploading}>
                                        enviando…
                                    </span>
                                ) : (
                                    <button
                                        type="button"
                                        className={s.btnRemove}
                                        onClick={() => removePose(p.id)}
                                    >
                                        <FiTrash2 /> Remover
                                    </button>
                                )}
                            </figure>
                        ))}
                    </div>

                    <div className={s.actions}>
                        <button
                            type="button"
                            className={s.btnPrimary}
                            disabled={!canSave || saving}
                            onClick={() => void save()}
                        >
                            <FiCheck /> Criar baralho
                        </button>
                    </div>
                </section>
            </div>
        </div>
    );
}
