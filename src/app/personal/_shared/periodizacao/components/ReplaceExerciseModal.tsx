'use client';

import { useState } from 'react';
import { FiArrowDown, FiRepeat } from 'react-icons/fi';
import Modal from '@/components/system/Modal';
import ExerciseThumbnail from '@/components/features/ExerciseThumbnail';
import type { ExerciseLibraryItem } from '@/libs/planningService';
import ExercisePicker from './ExercisePicker';
import s from './ReplaceExerciseModal.module.css';

interface ExerciseLike {
    name: string;
    video_thumb?: string;
    video_url?: string;
}

/**
 * Trocar um exercício do treino do aluno por outro da biblioteca, em duas
 * etapas: escolher na lista e CONFIRMAR. Antes um toque na lista já gravava
 * a troca no plano do aluno — tocar no ícone de trocar sem querer e depois
 * num item ao rolar a lista trocava o exercício por descuido, e a troca não
 * tem desfazer (o exercício novo nasce com id novo).
 *
 * A confirmação mostra o que sai e o que entra, com miniatura: nomes de
 * variações ("Supino reto" × "Supino reto com halteres") são fáceis de
 * confundir só pelo texto. Voltar (botão do header, Escape ou "Escolher
 * outro") devolve à lista sem fechar — e a lista fica montada, só oculta,
 * enquanto a confirmação aparece: voltar não perde a busca nem o filtro.
 */
export default function ReplaceExerciseModal({
    current,
    onConfirm,
    onClose,
}: {
    /** Exercício que vai sair do treino. */
    current: ExerciseLike;
    onConfirm: (item: ExerciseLibraryItem) => void;
    onClose: () => void;
}) {
    const [chosen, setChosen] = useState<ExerciseLibraryItem | null>(null);
    const same = !!chosen && chosen.name.trim() === current.name.trim();

    return (
        <Modal
            open
            onClose={onClose}
            onBack={chosen ? () => setChosen(null) : undefined}
            title={chosen ? 'Confirmar troca?' : 'Trocar exercício'}
            footer={
                chosen ? (
                    <div className={s.actions}>
                        <button
                            type="button"
                            className={s.btnSecondary}
                            onClick={() => setChosen(null)}
                        >
                            Escolher outro
                        </button>
                        <button
                            type="button"
                            className={s.btnPrimary}
                            onClick={() => onConfirm(chosen)}
                        >
                            <FiRepeat aria-hidden="true" /> Trocar exercício
                        </button>
                    </div>
                ) : undefined
            }
        >
            {chosen && (
                <>
                    <div className={s.swap}>
                        <div className={`${s.item} ${s.itemOut}`}>
                            <ExerciseThumbnail
                                name={current.name}
                                videoThumb={current.video_thumb}
                                videoUrl={current.video_url}
                                width={64}
                                height={64}
                                borderRadius={8}
                                captureFrame={false}
                                lazyCapture
                            />
                            <div className={s.itemText}>
                                <span className={s.itemLabel}>Sai do treino</span>
                                <span className={s.itemName}>{current.name}</span>
                            </div>
                        </div>
                        <FiArrowDown className={s.arrow} aria-hidden="true" />
                        <div className={`${s.item} ${s.itemIn}`}>
                            <ExerciseThumbnail
                                name={chosen.name}
                                videoThumb={chosen.video_thumb}
                                videoUrl={chosen.video_url}
                                width={64}
                                height={64}
                                borderRadius={8}
                                captureFrame={false}
                                lazyCapture
                            />
                            <div className={s.itemText}>
                                <span className={s.itemLabel}>
                                    Entra no lugar
                                </span>
                                <span className={s.itemName}>{chosen.name}</span>
                            </div>
                        </div>
                    </div>
                    {same && (
                        <p className={s.warn}>
                            É o mesmo exercício que já está no treino.
                        </p>
                    )}
                    <p className={s.note}>
                        Séries, repetições, carga, descanso e a posição no
                        treino continuam as mesmas. A troca é gravada no plano
                        do aluno na hora.
                    </p>
                </>
            )}
            <div hidden={!!chosen}>
                <p className={s.context}>
                    Escolha o exercício que vai entrar no lugar de{' '}
                    <strong>{current.name}</strong>. Você confirma antes de
                    gravar.
                </p>
                <ExercisePicker onPick={setChosen} onClose={onClose} />
            </div>
        </Modal>
    );
}
