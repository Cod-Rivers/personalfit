'use client';

import { useCallback, useEffect, useState } from 'react';
import { FiAward, FiBookOpen, FiShield, FiUsers } from 'react-icons/fi';
import Modal from '@/components/system/Modal';
import {
    awardPrize,
    listPoseDecks,
    setAntiFraud,
    setChallengeContent,
    setChallengeGroup,
    setPrize,
    validateGroupUrl,
    type CountPolicy,
    type PoseDeck,
} from '@/libs/studentChallengeAntiFraudService';
import type { StudentChallenge } from '@/libs/studentChallengeService';
import s from './challengeExtras.module.css';

type Section = 'antifraud' | 'prize' | 'content' | 'group';

interface Props {
    challenge: StudentChallenge;
    open: boolean;
    onClose: () => void;
    onSaved: () => void;
}

interface ExerciseRow {
    name: string;
    sets: string;
    reps: string;
    rest: string;
}

/**
 * Espelha ConfigWindowOpen do backend: a configuração do jogo fica aberta até
 * o FIM do primeiro dia. Comparar por instante (start_date à meia-noite <=
 * agora) trancava o antifraude no mesmo segundo em que o desafio nascia,
 * porque o formulário propõe "começa hoje".
 */
function hasStarted(c: StudentChallenge) {
    return c.start_date < new Date().toISOString().slice(0, 10);
}

/**
 * Configuração do pacote antifraude/motivação de um desafio, em quatro seções:
 * antifraude, prêmio, conteúdo exclusivo e grupo.
 *
 * Um modal só com seções, em vez de quatro modais: são todas configurações do
 * mesmo desafio, feitas na mesma sentada, e empilhar diálogos por assunto só
 * multiplicaria o caminho de volta.
 */
export default function ChallengeExtrasModal({
    challenge,
    open,
    onClose,
    onSaved,
}: Props) {
    const [section, setSection] = useState<Section>('antifraud');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [ok, setOk] = useState<string | null>(null);

    // ── Antifraude ──
    const [decks, setDecks] = useState<PoseDeck[]>([]);
    const [antiFraudOn, setAntiFraudOn] = useState(
        challenge.anti_fraud?.enabled ?? false,
    );
    const [deckId, setDeckId] = useState(challenge.anti_fraud?.deck_id ?? '');
    const [policy, setPolicy] = useState<CountPolicy>(
        challenge.anti_fraud?.count_policy ?? 'trust',
    );
    const [autoAccept, setAutoAccept] = useState(
        challenge.anti_fraud?.auto_accept_after_hours ?? 72,
    );

    // ── Prêmio ──
    const [prizeTitle, setPrizeTitle] = useState(challenge.prize?.title ?? '');
    const [prizeDesc, setPrizeDesc] = useState(
        challenge.prize?.description ?? '',
    );
    const [positions, setPositions] = useState(challenge.prize?.positions ?? 1);
    const [awardNote, setAwardNote] = useState('');

    // ── Conteúdo ──
    const [workoutTitle, setWorkoutTitle] = useState('');
    const [workoutDesc, setWorkoutDesc] = useState('');
    const [exercises, setExercises] = useState<ExerciseRow[]>([
        { name: '', sets: '', reps: '', rest: '' },
    ]);
    const [guideTitle, setGuideTitle] = useState('');
    const [guideBody, setGuideBody] = useState('');

    // ── Grupo ──
    const [groupUrl, setGroupUrl] = useState(challenge.group?.url ?? '');
    const [groupNote, setGroupNote] = useState(challenge.group?.note ?? '');

    const loadDecks = useCallback(async () => {
        try {
            setDecks(await listPoseDecks());
        } catch {
            // Sem baralhos (ou antifraude desligado no servidor): a seção
            // continua utilizável no modo "conferência sem pose".
            setDecks([]);
        }
    }, []);

    useEffect(() => {
        if (open && section === 'antifraud') void loadDecks();
    }, [open, section, loadDecks]);

    const run = async (fn: () => Promise<void>, successMsg: string) => {
        setSaving(true);
        setError(null);
        setOk(null);
        try {
            await fn();
            setOk(successMsg);
            onSaved();
        } catch {
            setError(
                'Não foi possível salvar. Confira os dados e tente de novo.',
            );
        } finally {
            setSaving(false);
        }
    };

    const started = hasStarted(challenge);

    return (
        <Modal
            open={open}
            onClose={onClose}
            title={`Configurar — ${challenge.name}`}
            footer={
                <button type="button" className={s.btnGhost} onClick={onClose}>
                    Fechar
                </button>
            }
        >
            <nav className={s.tabs}>
                <button
                    type="button"
                    className={section === 'antifraud' ? s.tabActive : s.tab}
                    onClick={() => setSection('antifraud')}
                >
                    <FiShield /> Antifraude
                </button>
                <button
                    type="button"
                    className={section === 'prize' ? s.tabActive : s.tab}
                    onClick={() => setSection('prize')}
                >
                    <FiAward /> Prêmio
                </button>
                <button
                    type="button"
                    className={section === 'content' ? s.tabActive : s.tab}
                    onClick={() => setSection('content')}
                >
                    <FiBookOpen /> Conteúdo
                </button>
                <button
                    type="button"
                    className={section === 'group' ? s.tabActive : s.tab}
                    onClick={() => setSection('group')}
                >
                    <FiUsers /> Grupo
                </button>
            </nav>

            {error && <div className={s.errorMsg}>{error}</div>}
            {ok && <div className={s.okMsg}>{ok}</div>}

            {section === 'antifraud' && (
                <section className={s.section}>
                    <p className={s.explain}>
                        Com o antifraude ligado, você confere as fotos de
                        check-in uma a uma e pode não aceitar a que parecer
                        indevida. Com um baralho escolhido, o sistema ainda
                        sorteia uma pose por dia e gera um código diferente para
                        cada aluno.
                    </p>
                    {started && (
                        <p className={s.warn}>
                            Este desafio já passou do primeiro dia. A
                            configuração de antifraude só pode ser mudada até o
                            fim do dia de início, para não invalidar os dias que
                            os alunos já registraram sob a regra anterior.
                        </p>
                    )}

                    <label className={s.checkRow}>
                        <input
                            type="checkbox"
                            checked={antiFraudOn}
                            disabled={started}
                            onChange={(e) => setAntiFraudOn(e.target.checked)}
                        />
                        Conferir as fotos deste desafio
                    </label>

                    {antiFraudOn && (
                        <>
                            <label className={s.label}>Baralho de poses</label>
                            <select
                                className={s.select}
                                value={deckId}
                                disabled={started}
                                onChange={(e) => setDeckId(e.target.value)}
                            >
                                <option value="">
                                    Sem pose (só conferir as fotos)
                                </option>
                                {decks.map((d) => (
                                    <option key={d.id} value={d.id}>
                                        {d.name}
                                        {d.is_platform ? '' : ' (seu baralho)'}
                                    </option>
                                ))}
                            </select>

                            <label className={s.label}>
                                Quando o dia passa a contar
                            </label>
                            <select
                                className={s.select}
                                value={policy}
                                disabled={started}
                                onChange={(e) =>
                                    setPolicy(e.target.value as CountPolicy)
                                }
                            >
                                <option value="trust">
                                    Assim que a foto chega (a recusa tira
                                    depois)
                                </option>
                                <option value="strict">
                                    Só depois de eu aceitar
                                </option>
                            </select>

                            {policy === 'strict' && (
                                <>
                                    <label className={s.label}>
                                        Aceitar sozinho depois de (horas)
                                    </label>
                                    <input
                                        type="number"
                                        className={s.input}
                                        min={1}
                                        max={336}
                                        value={autoAccept}
                                        disabled={started}
                                        onChange={(e) =>
                                            setAutoAccept(
                                                Number(e.target.value) || 72,
                                            )
                                        }
                                    />
                                    <p className={s.hint}>
                                        Se você ficar alguns dias sem conferir,
                                        a foto passa a contar sozinha. Sem esse
                                        prazo, uma viagem sua congelaria o
                                        desafio de todos os alunos.
                                    </p>
                                </>
                            )}
                        </>
                    )}

                    <div className={s.actions}>
                        <button
                            type="button"
                            className={s.btnPrimary}
                            disabled={saving || started}
                            onClick={() =>
                                void run(
                                    () =>
                                        setAntiFraud(challenge.id, {
                                            enabled: antiFraudOn,
                                            deck_id: deckId || undefined,
                                            count_policy: policy,
                                            auto_accept_after_hours: autoAccept,
                                        }),
                                    'Antifraude salvo.',
                                )
                            }
                        >
                            Salvar antifraude
                        </button>
                    </div>
                </section>
            )}

            {section === 'prize' && (
                <section className={s.section}>
                    <p className={s.explain}>
                        O prêmio aparece no convite e no mural. Quem entrega é
                        você — o app registra a promessa e cobra a entrega
                        quando o desafio terminar.
                    </p>

                    <label className={s.label}>O que o vencedor ganha</label>
                    <input
                        className={s.input}
                        maxLength={120}
                        placeholder="Ex.: 1 mês de acompanhamento grátis"
                        value={prizeTitle}
                        onChange={(e) => setPrizeTitle(e.target.value)}
                    />

                    <label className={s.label}>Detalhes (opcional)</label>
                    <textarea
                        className={s.textarea}
                        maxLength={1000}
                        value={prizeDesc}
                        onChange={(e) => setPrizeDesc(e.target.value)}
                    />

                    <label className={s.label}>Quantas colocações ganham</label>
                    <select
                        className={s.select}
                        value={positions}
                        onChange={(e) => setPositions(Number(e.target.value))}
                    >
                        <option value={1}>Só o campeão</option>
                        <option value={2}>1º e 2º</option>
                        <option value={3}>Pódio (1º, 2º e 3º)</option>
                    </select>

                    {started && (
                        <p className={s.hint}>
                            Com o desafio em andamento dá para melhorar o prêmio
                            (texto e número de premiados), nunca reduzir: quem
                            já está competindo contou com o que foi prometido.
                        </p>
                    )}

                    <p className={s.legal}>
                        O prêmio é por mérito, pela classificação do mural. Não
                        existe sorteio entre participantes, e a entrega é
                        responsabilidade sua, não da Venafit.
                    </p>

                    <div className={s.actions}>
                        {challenge.prize && !started && (
                            <button
                                type="button"
                                className={s.btnDanger}
                                disabled={saving}
                                onClick={() =>
                                    void run(
                                        () =>
                                            setPrize(challenge.id, {
                                                remove: true,
                                            }),
                                        'Prêmio removido.',
                                    )
                                }
                            >
                                Remover prêmio
                            </button>
                        )}
                        <button
                            type="button"
                            className={s.btnPrimary}
                            disabled={saving || prizeTitle.trim() === ''}
                            onClick={() =>
                                void run(
                                    () =>
                                        setPrize(challenge.id, {
                                            title: prizeTitle,
                                            description: prizeDesc,
                                            positions,
                                        }),
                                    'Prêmio salvo.',
                                )
                            }
                        >
                            Salvar prêmio
                        </button>
                    </div>

                    {challenge.prize?.delivery_pending && (
                        <div className={s.awardBox}>
                            <p className={s.awardTitle}>
                                Este desafio terminou e o prêmio ainda não foi
                                entregue.
                            </p>
                            <textarea
                                className={s.textarea}
                                maxLength={500}
                                placeholder="Como foi entregue (opcional)"
                                value={awardNote}
                                onChange={(e) => setAwardNote(e.target.value)}
                            />
                            <button
                                type="button"
                                className={s.btnPrimary}
                                disabled={saving}
                                onClick={() =>
                                    void run(
                                        () =>
                                            awardPrize(challenge.id, awardNote),
                                        'Entrega registrada. Os vencedores foram avisados.',
                                    )
                                }
                            >
                                Marcar prêmio como entregue
                            </button>
                        </div>
                    )}
                </section>
            )}

            {section === 'content' && (
                <section className={s.section}>
                    <p className={s.explain}>
                        Material exclusivo de quem participa. Quem só foi
                        convidado vê que existe, mas não vê o conteúdo — é o
                        argumento para aceitar o convite.
                    </p>

                    <h4 className={s.blockTitle}>Treino geral do desafio</h4>
                    <p className={s.hint}>
                        É material de leitura, o mesmo para todo mundo. Não
                        substitui nem altera o plano de treino de ninguém.
                    </p>
                    <input
                        className={s.input}
                        maxLength={120}
                        placeholder="Título (ex.: Circuito do desafio)"
                        value={workoutTitle}
                        onChange={(e) => setWorkoutTitle(e.target.value)}
                    />
                    <textarea
                        className={s.textarea}
                        maxLength={2000}
                        placeholder="Orientações gerais (opcional)"
                        value={workoutDesc}
                        onChange={(e) => setWorkoutDesc(e.target.value)}
                    />

                    {exercises.map((ex, i) => (
                        <div key={i} className={s.exerciseRow}>
                            <input
                                className={s.input}
                                placeholder="Exercício"
                                value={ex.name}
                                onChange={(e) =>
                                    setExercises((prev) =>
                                        prev.map((p, j) =>
                                            j === i
                                                ? { ...p, name: e.target.value }
                                                : p,
                                        ),
                                    )
                                }
                            />
                            <input
                                className={s.inputSmall}
                                placeholder="Séries"
                                value={ex.sets}
                                onChange={(e) =>
                                    setExercises((prev) =>
                                        prev.map((p, j) =>
                                            j === i
                                                ? { ...p, sets: e.target.value }
                                                : p,
                                        ),
                                    )
                                }
                            />
                            <input
                                className={s.inputSmall}
                                placeholder="Reps"
                                value={ex.reps}
                                onChange={(e) =>
                                    setExercises((prev) =>
                                        prev.map((p, j) =>
                                            j === i
                                                ? { ...p, reps: e.target.value }
                                                : p,
                                        ),
                                    )
                                }
                            />
                            <input
                                className={s.inputSmall}
                                placeholder="Descanso"
                                value={ex.rest}
                                onChange={(e) =>
                                    setExercises((prev) =>
                                        prev.map((p, j) =>
                                            j === i
                                                ? { ...p, rest: e.target.value }
                                                : p,
                                        ),
                                    )
                                }
                            />
                        </div>
                    ))}
                    <button
                        type="button"
                        className={s.btnGhost}
                        onClick={() =>
                            setExercises((prev) => [
                                ...prev,
                                { name: '', sets: '', reps: '', rest: '' },
                            ])
                        }
                    >
                        + Adicionar exercício
                    </button>

                    <h4 className={s.blockTitle}>Guia alimentar</h4>
                    <p className={s.legal}>
                        Material educativo, um só para o desafio inteiro. Não é
                        prescrição nutricional individual e não substitui a
                        consulta com nutricionista — evite cardápio por aluno e
                        metas de calorias individuais.
                    </p>
                    <input
                        className={s.input}
                        maxLength={120}
                        placeholder="Título do guia"
                        value={guideTitle}
                        onChange={(e) => setGuideTitle(e.target.value)}
                    />
                    <textarea
                        className={s.textareaTall}
                        maxLength={20000}
                        placeholder="Orientações gerais de hábitos, hidratação, lista de alimentos…"
                        value={guideBody}
                        onChange={(e) => setGuideBody(e.target.value)}
                    />

                    <div className={s.actions}>
                        <button
                            type="button"
                            className={s.btnPrimary}
                            disabled={saving}
                            onClick={() =>
                                void run(() => {
                                    const rows = exercises.filter(
                                        (e) => e.name.trim() !== '',
                                    );
                                    return setChallengeContent(challenge.id, {
                                        workout:
                                            workoutTitle.trim() && rows.length
                                                ? {
                                                      title: workoutTitle,
                                                      description: workoutDesc,
                                                      exercises: rows.map(
                                                          (r) => ({
                                                              name: r.name,
                                                              sets: r.sets,
                                                              reps: r.reps,
                                                              rest: r.rest,
                                                          }),
                                                      ),
                                                  }
                                                : undefined,
                                        nutrition_guide:
                                            guideTitle.trim() &&
                                            guideBody.trim()
                                                ? {
                                                      title: guideTitle,
                                                      body: guideBody,
                                                  }
                                                : undefined,
                                    });
                                }, 'Conteúdo salvo.')
                            }
                        >
                            Salvar conteúdo
                        </button>
                    </div>
                </section>
            )}

            {section === 'group' && (
                <section className={s.section}>
                    <p className={s.explain}>
                        Cole o link de convite do grupo de WhatsApp ou Telegram.
                        Ele aparece só para quem aceitou o desafio.
                    </p>
                    <p className={s.warn}>
                        A Venafit não modera esse grupo, e quem sair do desafio
                        continua lá dentro — tirar é trabalho manual seu.
                    </p>

                    <label className={s.label}>Link do grupo</label>
                    <input
                        className={s.input}
                        placeholder="https://chat.whatsapp.com/… ou https://t.me/…"
                        value={groupUrl}
                        onChange={(e) => setGroupUrl(e.target.value)}
                    />
                    {groupUrl.trim() !== '' &&
                        !validateGroupUrl(groupUrl).ok && (
                            <p className={s.warn}>
                                Só aceitamos links de convite do WhatsApp
                                (chat.whatsapp.com) e do Telegram (t.me).
                            </p>
                        )}

                    <label className={s.label}>Observação (opcional)</label>
                    <input
                        className={s.input}
                        maxLength={200}
                        placeholder="Ex.: regras no fixado do grupo"
                        value={groupNote}
                        onChange={(e) => setGroupNote(e.target.value)}
                    />

                    <div className={s.actions}>
                        {challenge.group && (
                            <button
                                type="button"
                                className={s.btnDanger}
                                disabled={saving}
                                onClick={() =>
                                    void run(
                                        () =>
                                            setChallengeGroup(challenge.id, {
                                                remove: true,
                                            }),
                                        'Link removido.',
                                    )
                                }
                            >
                                Remover link
                            </button>
                        )}
                        <button
                            type="button"
                            className={s.btnPrimary}
                            disabled={saving || !validateGroupUrl(groupUrl).ok}
                            onClick={() =>
                                void run(
                                    () =>
                                        setChallengeGroup(challenge.id, {
                                            url: groupUrl,
                                            note: groupNote,
                                        }),
                                    'Link do grupo salvo.',
                                )
                            }
                        >
                            Salvar link
                        </button>
                    </div>
                </section>
            )}
        </Modal>
    );
}
