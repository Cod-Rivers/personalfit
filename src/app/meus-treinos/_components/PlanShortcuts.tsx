'use client';

import React from 'react';
import Link from 'next/link';
import {
    FiArrowRight,
    FiAward,
    FiCheckCircle,
    FiChevronRight,
    FiClock,
    FiEdit3,
    FiUploadCloud,
} from 'react-icons/fi';
import s from './meusTreinos.module.css';

function formatBRL(value: number): string {
    return value.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    });
}

interface PlanShortcutsProps {
    /** Aluno vinculado a um personal não monta nem importa treino: quem
     * prescreve é o personal. Só vê o histórico e a loja de planos. */
    hasPersonal: boolean;
    /** Preço do plano avulso da loja; null enquanto não carregou. */
    storePrice: number | null;
    onImportPdf: () => void;
    /** Estado vazio (sem plano ainda) não tem histórico para mostrar. */
    showHistory?: boolean;
    /** Loja de planos — escondida para aluno de personal PRO (ver
     * usePlanStoreHidden). */
    showStore: boolean;
}

/**
 * Atalhos abaixo dos treinos, separados por intenção: acompanhar o que já
 * fez, treinar por conta própria (só sem personal) e comprar um plano pronto.
 * Antes eram cinco linhas iguais, sem explicação — o aluno não sabia para que
 * servia cada uma.
 */
export default function PlanShortcuts({
    hasPersonal,
    storePrice,
    onImportPdf,
    showHistory = true,
    showStore,
}: PlanShortcutsProps) {
    if (!showHistory && hasPersonal && !showStore) return null;

    return (
        <div className={s.shortcuts}>
            {showHistory && (
                <nav className={s.group} aria-label="Seu progresso">
                    <Link href="/meus-treinos/historico" className={s.row}>
                        <span className={s.iconTile}>
                            <FiClock size={20} aria-hidden="true" />
                        </span>
                        <span className={s.rowText}>
                            <span className={s.rowTitle}>
                                Histórico de treinos
                            </span>
                            <span className={s.rowHint}>
                                Tudo o que você já registrou
                            </span>
                        </span>
                        <FiChevronRight
                            size={18}
                            aria-hidden="true"
                            className={s.rowChevron}
                        />
                    </Link>
                </nav>
            )}

            {!hasPersonal && (
                <nav className={s.group} aria-labelledby="own-training-title">
                    <p
                        id="own-training-title"
                        className={`${s.eyebrow} ${s.groupTitle}`}
                    >
                        Treinar por conta própria
                    </p>
                    <Link href="/meus-treinos/montar" className={s.row}>
                        <span className={`${s.iconTile} ${s.iconTileMint}`}>
                            <FiEdit3 size={20} aria-hidden="true" />
                        </span>
                        <span className={s.rowText}>
                            <span className={s.rowTitle}>Criar meu treino</span>
                            <span className={s.rowHint}>
                                Monte do seu jeito com os exercícios da
                                biblioteca
                            </span>
                        </span>
                        <FiChevronRight
                            size={18}
                            aria-hidden="true"
                            className={s.rowChevron}
                        />
                    </Link>
                    <button
                        type="button"
                        onClick={onImportPdf}
                        className={s.row}
                    >
                        <span className={`${s.iconTile} ${s.iconTileMint}`}>
                            <FiUploadCloud size={20} aria-hidden="true" />
                        </span>
                        <span className={s.rowText}>
                            <span className={s.rowTitle}>
                                Importar ficha em PDF
                            </span>
                            <span className={s.rowHint}>
                                Já tem um treino no papel? Ele vira treino no
                                app
                            </span>
                        </span>
                        <FiChevronRight
                            size={18}
                            aria-hidden="true"
                            className={s.rowChevron}
                        />
                    </button>
                </nav>
            )}

            {showStore && (
                <section className={s.store} aria-labelledby="plan-store-title">
                    <div className={s.storeHead}>
                        <span className={`${s.iconTile} ${s.iconTileAmber}`}>
                            <FiAward size={20} aria-hidden="true" />
                        </span>
                        <div>
                            <p className={s.storeEyebrow}>Loja de planos</p>
                            <h2 id="plan-store-title" className={s.storeTitle}>
                                Treine como os famosos
                            </h2>
                            <p className={s.storeText}>
                                Planos completos inspirados na rotina de grandes
                                atletas, prontos para começar hoje
                                {storePrice != null
                                    ? ` por ${formatBRL(storePrice)}`
                                    : ''}
                                .
                            </p>
                        </div>
                    </div>
                    <ul className={s.storePerks}>
                        <li className={s.storePerk}>
                            <FiCheckCircle size={14} aria-hidden="true" />
                            Plano completo
                        </li>
                        <li className={s.storePerk}>
                            <FiCheckCircle size={14} aria-hidden="true" />
                            Pronto para usar
                        </li>
                        <li className={s.storePerk}>
                            <FiCheckCircle size={14} aria-hidden="true" />
                            Pagamento único
                        </li>
                    </ul>
                    <Link
                        href="/meus-treinos/escolher-plano"
                        className={s.storeCta}
                    >
                        Conhecer os planos
                        <FiArrowRight size={18} aria-hidden="true" />
                    </Link>
                </section>
            )}
        </div>
    );
}
