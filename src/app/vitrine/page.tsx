'use client';

/**
 * Vitrine do personal — tela inicial do aluno logo após o login, exibida
 * APENAS quando ele tem um personal vinculado que está no plano Pro e que
 * publicou a página. Em qualquer outro caso o aluno segue direto para o fluxo
 * atual (Meus Treinos / dashboard de protocolo).
 *
 * A decisão de exibir é do servidor: `GET /showcase` devolve `null` quando não
 * há personal, quando ele não é Pro ou quando a página está despublicada — o
 * cliente não conhece (nem deveria conhecer) o plano do personal.
 *
 * O personal dono abre esta mesma tela para editá-la: o lápis no canto superior
 * abre o painel com todos os campos e os interruptores de visibilidade.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FiArrowLeft, FiEdit2 } from 'react-icons/fi';
import { getStudentHomeRoute, getUser } from '@/libs/session';
import { getLinkedShowcase, Showcase } from '@/libs/showcaseService';
import { showcaseThemeStyle } from '@/libs/showcaseThemes';
import ShowcaseEditor from './_components/ShowcaseEditor';
import ShowcaseCard from './_components/ShowcaseCard';
import styles from './vitrine.module.css';

export default function VitrinePage() {
    const router = useRouter();
    const [showcase, setShowcase] = useState<Showcase | null>(null);
    const [loading, setLoading] = useState(true);
    const [editOpen, setEditOpen] = useState(false);

    // Para o aluno, o CTA leva ao hub de treinos dele. Para o personal — que
    // abre a mesma tela para editá-la — leva de volta ao painel, já que ele não
    // tem treinos próprios ali.
    const goToTreinos = useCallback(() => {
        router.push(
            getUser()?.role === 'personal' ? '/personal' : getStudentHomeRoute(),
        );
    }, [router]);

    useEffect(() => {
        const user = getUser();
        if (!user) {
            router.replace('/');
            return;
        }

        let cancelled = false;
        getLinkedShowcase()
            .then((sc) => {
                if (cancelled) return;
                if (!sc) {
                    // Sem vitrine para mostrar: fluxo atual, sem tela intermediária.
                    router.replace(
                        user.role === 'personal'
                            ? '/personal'
                            : getStudentHomeRoute(),
                    );
                    return;
                }
                setShowcase(sc);
                setLoading(false);
            })
            .catch(() => {
                if (cancelled) return;
                // A vitrine é divulgação, não conteúdo essencial: falha de rede
                // nunca deve prender o aluno longe dos treinos dele.
                router.replace(getStudentHomeRoute());
            });

        return () => {
            cancelled = true;
        };
    }, [router]);

    if (loading || !showcase) {
        return <div className={styles.loading}>Carregando…</div>;
    }

    const canEdit = !!showcase.can_edit;

    return (
        <div className={styles.page} style={showcaseThemeStyle(showcase.theme_id)}>
            <ShowcaseCard
                showcase={showcase}
                coverPlaceholder={
                    canEdit ? 'Adicione uma foto de capa no painel de edição' : ''
                }
                coverActions={
                    <>
                        {/*
                         * Só o personal tem para onde voltar: ele chega aqui
                         * pelo "Minha Página" do painel. Para o aluno esta É a
                         * tela inicial depois do login — um "voltar" ali não
                         * teria destino.
                         */}
                        {canEdit && (
                            <button
                                type="button"
                                className={styles.backBtn}
                                onClick={() => router.push('/personal')}
                                title="Voltar ao painel"
                            >
                                <FiArrowLeft size={15} />
                                <span>Voltar</span>
                            </button>
                        )}
                        {canEdit && (
                            <button
                                type="button"
                                className={styles.editBtn}
                                onClick={() => setEditOpen(true)}
                                aria-label="Editar esta página"
                                title="Editar esta página"
                            >
                                <FiEdit2 size={16} />
                            </button>
                        )}
                        <div className={styles.proBadge}>
                            <span className={styles.proDot} />
                            <span className={styles.proLabel}>PRO</span>
                        </div>
                    </>
                }
                notice={
                    canEdit &&
                    !showcase.enabled && (
                        <p className={styles.draftNotice}>
                            Esta página ainda está <strong>oculta</strong> para
                            seus alunos. Ative &ldquo;Publicar para meus
                            alunos&rdquo; no painel de edição quando quiser
                            exibi-la.
                        </p>
                    )
                }
            >
                <div className={styles.ctaWrap}>
                    <button
                        type="button"
                        className={styles.cta}
                        onClick={goToTreinos}
                    >
                        {/* O destino já muda por papel (painel x treinos);
                         * o rótulo precisa acompanhar, senão o personal lê
                         * "meus treinos" e cai no painel dele. */}
                        {canEdit ? 'Voltar ao painel' : 'Acessar meus treinos'}
                    </button>
                    <div className={styles.credit}>
                        Treinador · {showcase.personal_name} · powered by
                        Venafit
                    </div>
                </div>
            </ShowcaseCard>

            {canEdit && (
                <ShowcaseEditor
                    open={editOpen}
                    initial={showcase}
                    onClose={() => setEditOpen(false)}
                    onSaved={setShowcase}
                />
            )}
        </div>
    );
}
