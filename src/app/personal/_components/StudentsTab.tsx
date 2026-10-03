'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    FiActivity,
    FiEye,
    FiClipboard,
    FiCoffee,
    FiTrendingUp,
    FiDollarSign,
    FiHeart,
    FiMessageCircle,
    FiMail,
    FiFileText,
    FiCheck,
    FiWifiOff,
    FiLock,
} from 'react-icons/fi';
import AvatarUpload from '@/components/molecules/AvatarUpload';
import CountBadge from '@/components/atoms/CountBadge';
import Modal from '@/components/system/Modal';
import TrainingPdfUploadModal from '@/components/features/TrainingPdfUploadModal';
import LogWindowSettings from '@/components/features/LogWindowSettings';
import { usePersonalStudents, studentDisplayName } from '@/hooks/usePersonalStudents';
import { useStudentOverflow } from '@/components/features/StudentOverflowGate';
import { formatCpfInput } from '@/libs/formatters';
import {
    getPersonalAnamnesisSummary,
    type PersonalAnamnesisSummaryItem,
} from '@/libs/personalAnamnesisService';
import {
    getFinanceStudentsStatus,
    type FinanceStudentStatus,
} from '@/libs/studentInvoiceService';
import { BRL, fmtDate } from '@/libs/financeFormat';
import s from '../personal.module.css';

type StudentsState = ReturnType<typeof usePersonalStudents>;

interface Props {
    state: StudentsState;
    /** Comentários pós-treino não lidos, por aluno (selo "💬 2"). */
    unreadComments?: Record<string, number>;
}

export default function StudentsTab({ state, unreadComments }: Props) {
    // Excedente do free: selo "Em espera" nos alunos que ficaram de fora.
    const overflow = useStudentOverflow();
    const router = useRouter();
    const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
    const [pdfImportStudent, setPdfImportStudent] = useState<{
        id: string;
        name: string;
    } | null>(null);
    const [pdfImportPickerOpen, setPdfImportPickerOpen] = useState(false);
    const [passwordCopied, setPasswordCopied] = useState(false);
    const {
        students,
        loading,
        isOfflineData,
        modal,
        editForm,
        editId,
        unlinkTarget,
        submitting,
        error,
        preRegisterForm,
        preRegisterResult,
        openPreRegister,
        handlePreRegisterInput,
        submitPreRegister,
        openEdit,
        openUnlink,
        closeModal,
        handleEditInput,
        handleUpdate,
        handleUnlink,
        requestActivation,
        deactivate,
        toggleBusyId,
    } = state;

    // Selo da Anamnese do personal em cada aluno: uma chamada só para a
    // lista inteira (sem N+1). Falha só esconde o selo.
    const [anamnesisSummary, setAnamnesisSummary] = useState<
        Record<string, PersonalAnamnesisSummaryItem>
    >({});
    useEffect(() => {
        if (students.length === 0) return;
        let cancelled = false;
        getPersonalAnamnesisSummary()
            .then((summary) => {
                if (!cancelled) setAnamnesisSummary(summary);
            })
            .catch(() => {});
        return () => {
            cancelled = true;
        };
    }, [students.length]);

    // Selo financeiro em cada aluno (em dia, vence em breve, atrasado,
    // "Já paguei" para confirmar): também uma chamada só. Falha esconde.
    const [financeStatus, setFinanceStatus] = useState<
        Record<string, FinanceStudentStatus>
    >({});
    const [financeLocked, setFinanceLocked] = useState(false);
    useEffect(() => {
        if (students.length === 0) return;
        let cancelled = false;
        getFinanceStudentsStatus()
            .then(({ students: list, can_edit }) => {
                if (cancelled) return;
                setFinanceStatus(Object.fromEntries(list.map((x) => [x.student_id, x])));
                setFinanceLocked(!can_edit);
            })
            .catch(() => {});
        return () => {
            cancelled = true;
        };
    }, [students.length]);

    return (
        <>
            <div className={s.toolbar}>
                <h2 className={s.sectionTitle}>Meus Alunos</h2>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button
                        onClick={() => setPdfImportPickerOpen(true)}
                        className={s.btnAdd}
                        disabled={students.length === 0}
                        title={
                            students.length === 0
                                ? 'Cadastre um aluno primeiro'
                                : undefined
                        }
                        style={{
                            background: 'transparent',
                            border: '1px solid var(--border-subtle)',
                            color: 'var(--text-primary)',
                        }}
                    >
                        <FiFileText /> Importar Treino de PDF
                    </button>
                    <button
                        onClick={() => {
                            setPasswordCopied(false);
                            openPreRegister();
                        }}
                        className={s.btnAdd}
                    >
                        + Adicionar Aluno
                    </button>
                </div>
            </div>

            {modal === null && error && (
                <div className={s.errorMsg}>{error}</div>
            )}

            {/* Lista servida do cache local (ver personalCache.ts). Sem este
                aviso o personal não teria como saber que está olhando uma
                cópia — nem por que cadastrar/editar aluno falha agora. */}
            {isOfflineData && (
                <div className={s.offlineNotice}>
                    <FiWifiOff /> Sem conexão — mostrando a última lista de
                    alunos salva neste aparelho. Ela se atualiza sozinha
                    quando a internet voltar.
                </div>
            )}

            {loading ? (
                <p className={s.loading}>Carregando...</p>
            ) : students.length === 0 ? (
                <div className={s.empty}>
                    <div className={s.emptyIcon}><FiActivity /></div>
                    {typeof navigator !== 'undefined' && !navigator.onLine ? (
                        <>
                            <h3 className={s.emptyTitle}>Sem conexão</h3>
                            <p className={s.emptyText}>
                                Não foi possível carregar seus alunos e ainda
                                não há uma cópia salva neste aparelho. Abra
                                esta tela uma vez com internet para que ela
                                fique disponível offline.
                            </p>
                        </>
                    ) : (
                        <>
                            <h3 className={s.emptyTitle}>
                                Nenhum aluno cadastrado
                            </h3>
                            <p className={s.emptyText}>
                                Clique em &quot;+ Adicionar Aluno&quot; para
                                pré-cadastrar um aluno — ele recebe a senha de
                                acesso por e-mail.
                            </p>
                        </>
                    )}
                </div>
            ) : (
                <div className={s.studentList}>
                    {students.map((st) => (
                        <div key={st.id} className={s.studentCard}>
                            <div className={s.studentCardHead}>
                                <AvatarUpload
                                    current={st.avatar}
                                    name={studentDisplayName(st)}
                                    size={48}
                                    editable={false}
                                />
                                <div className={s.studentInfo}>
                                    <p className={s.studentName}>
                                        {studentDisplayName(st)}
                                        <span
                                            className={
                                                st.link_status === 'active'
                                                    ? s.badgeActive
                                                    : st.link_status ===
                                                        'pending'
                                                      ? s.badgeLinkPending
                                                      : s.badgeInactive
                                            }
                                        >
                                            {st.link_status === 'active'
                                                ? 'Ativo'
                                                : st.awaiting_consent
                                                  ? st.link_status === 'pending'
                                                      ? 'Aguardando o aluno aceitar'
                                                      : 'Pedido não aceito'
                                                  : st.link_status === 'pending'
                                                    ? 'Aguardando confirmação'
                                                    : 'Inativo'}
                                        </span>
                                        {overflow?.standby_student_ids.includes(
                                            st.id,
                                        ) && (
                                            <span
                                                className={s.badgeStandby}
                                                title="Você vê os dados, mas não altera nada deste aluno até assinar o PRO"
                                            >
                                                Em espera até{' '}
                                                {overflow.deadline
                                                    ? new Date(
                                                          overflow.deadline,
                                                      ).toLocaleDateString(
                                                          'pt-BR',
                                                      )
                                                    : ''}
                                            </span>
                                        )}
                                    </p>
                                    {st.awaiting_consent ? (
                                        <p className={s.studentMeta}>
                                            Os dados e o treino do aluno só
                                            aparecem depois que ele aceitar o
                                            pedido de vínculo.
                                        </p>
                                    ) : (
                                        <>
                                            <p className={s.studentMeta}>
                                                {st.email} · {st.cpf}
                                                {st.phone ? ` · ${st.phone}` : ''}
                                            </p>
                                            <FinanceChip status={financeStatus[st.id]} />
                                        </>
                                    )}

                                </div>
                                <button
                                    type="button"
                                    onClick={() =>
                                        setMenuOpenId((cur) =>
                                            cur === st.id ? null : st.id,
                                        )
                                    }
                                    className={s.kebabBtn}
                                    aria-haspopup="true"
                                    aria-expanded={menuOpenId === st.id}
                                    aria-label="Mais opções"
                                >
                                    ⋯
                                </button>
                                {menuOpenId === st.id && (
                                    <>
                                        <button
                                            type="button"
                                            className={s.kebabOverlay}
                                            aria-label="Fechar menu"
                                            onClick={() => setMenuOpenId(null)}
                                        />
                                        <div className={s.kebabMenu}>
                                            <button
                                                type="button"
                                                className={s.kebabMenuItem}
                                                disabled={
                                                    toggleBusyId !== null ||
                                                    st.link_status ===
                                                        'pending'
                                                }
                                                onClick={() => {
                                                    setMenuOpenId(null);
                                                    if (
                                                        st.link_status ===
                                                        'active'
                                                    ) {
                                                        deactivate(st);
                                                    } else {
                                                        requestActivation(st);
                                                    }
                                                }}
                                            >
                                                {toggleBusyId === st.id
                                                    ? 'Aguarde...'
                                                    : st.link_status ===
                                                        'active'
                                                      ? 'Desativar aluno'
                                                      : st.link_status ===
                                                          'pending'
                                                        ? 'Aguardando aluno...'
                                                        : st.awaiting_consent
                                                          ? 'Pedir vínculo de novo'
                                                          : 'Ativar aluno'}
                                            </button>
                                            <button
                                                type="button"
                                                className={s.kebabMenuItem}
                                                onClick={() => {
                                                    setMenuOpenId(null);
                                                    openUnlink(st);
                                                }}
                                            >
                                                {!st.awaiting_consent
                                                    ? 'Desvincular'
                                                    : st.link_status === 'pending'
                                                      ? 'Cancelar pedido'
                                                      : 'Remover da lista'}
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Pedido não aceito: nada do aluno abre (o
                                servidor recusa) — só o menu ⋯ com cancelar
                                ou pedir de novo. */}
                            {!st.awaiting_consent && (
                            <div className={s.studentCardBody}>
                                {/* Uma tela só para o treino do aluno: ver,
                                    ajustar qualquer exercício e finalizar a
                                    sessão. "Ver Treino" e "Acompanhar Treino"
                                    eram duas telas com metade das ações
                                    cada. */}
                                <button
                                    onClick={() =>
                                        router.push(
                                            `/personal/aluno/${st.id}/acompanhar`,
                                        )
                                    }
                                    className={s.ctaPrimary}
                                >
                                    <FiEye /> Treino do aluno
                                </button>

                                <div className={s.actionsGrid}>
                                    <button
                                        onClick={() =>
                                            router.push(
                                                `/personal/aluno/${st.id}/periodizacao`,
                                            )
                                        }
                                        className={s.gridAction}
                                        style={{
                                            borderColor: '#5bc0be',
                                            color: '#5bc0be',
                                        }}
                                    >
                                        <FiClipboard /> Prescrever Treino
                                    </button>
                                    <button
                                        onClick={() =>
                                            router.push(
                                                `/personal/aluno/${st.id}/plano-alimentar`,
                                            )
                                        }
                                        className={s.gridAction}
                                    >
                                        <FiCoffee /> Plano Alimentar
                                    </button>
                                    <button
                                        onClick={() =>
                                            router.push(
                                                `/personal/aluno/${st.id}/evolucao`,
                                            )
                                        }
                                        className={s.gridAction}
                                    >
                                        <FiTrendingUp /> Evolução
                                    </button>
                                    <button
                                        onClick={() =>
                                            router.push(
                                                `/personal/aluno/${st.id}/financeiro`,
                                            )
                                        }
                                        className={s.gridAction}
                                        style={{
                                            borderColor: '#2e9e77',
                                            color: '#2e9e77',
                                        }}
                                    >
                                        <FiDollarSign /> Financeiro
                                        {financeLocked && (
                                            <FiLock
                                                aria-label="Recurso PRO"
                                                style={{ marginLeft: 6 }}
                                            />
                                        )}
                                    </button>
                                    <button
                                        onClick={() =>
                                            router.push(
                                                `/personal/aluno/${st.id}/anamnese`,
                                            )
                                        }
                                        className={s.gridAction}
                                        style={{
                                            borderColor: '#e0a03c',
                                            color: '#e0a03c',
                                        }}
                                    >
                                        <FiHeart /> Anamnese
                                        {anamnesisSummary[st.id] && (
                                            <span
                                                style={{
                                                    marginLeft: 6,
                                                    padding: '1px 6px',
                                                    borderRadius: 999,
                                                    fontSize: '0.7rem',
                                                    background: 'rgba(224, 160, 60, 0.18)',
                                                }}
                                            >
                                                {anamnesisSummary[st.id].status === 'requested'
                                                    ? 'Pendente'
                                                    : 'Respondida'}
                                            </span>
                                        )}
                                    </button>
                                    <button
                                        onClick={() =>
                                            setPdfImportStudent({
                                                id: st.id,
                                                name: st.name,
                                            })
                                        }
                                        className={s.gridAction}
                                        style={{
                                            borderColor: '#5b8def',
                                            color: '#5b8def',
                                        }}
                                    >
                                        <FiFileText /> Importar PDF
                                    </button>
                                </div>

                                <div className={s.footLinks}>
                                    <button
                                        type="button"
                                        onClick={() => openEdit(st)}
                                        className={s.footLink}
                                    >
                                        Editar
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            router.push(
                                                `/personal/aluno/${st.id}/feedback`,
                                            )
                                        }
                                        className={s.footLink}
                                        style={{ color: '#8b5cf6' }}
                                    >
                                        <FiMessageCircle /> Feedback
                                    </button>
                                    {(unreadComments?.[st.id] ?? 0) > 0 && (
                                        <button
                                            type="button"
                                            onClick={() =>
                                                router.push(
                                                    `/personal/comentarios?aluno=${st.id}`,
                                                )
                                            }
                                            className={s.footLink}
                                            aria-label={`${unreadComments?.[st.id]} comentário(s) não lido(s)`}
                                        >
                                            <CountBadge
                                                count={unreadComments?.[st.id] ?? 0}
                                                label={`${unreadComments?.[st.id]} comentário(s) não lido(s)`}
                                                icon={<FiMessageCircle aria-hidden />}
                                            />
                                        </button>
                                    )}
                                </div>
                            </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* ── Pré-cadastro de Aluno ── */}
            <Modal
                open={modal === 'preregister'}
                onClose={closeModal}
                title="Adicionar Aluno"
                footer={
                    preRegisterResult ? (
                        <button onClick={closeModal} className={s.btnSubmit}>
                            Fechar
                        </button>
                    ) : (
                        <>
                            <button onClick={closeModal} className={s.btnCancel}>
                                Cancelar
                            </button>
                            <button
                                onClick={submitPreRegister}
                                disabled={submitting}
                                className={s.btnSubmit}
                            >
                                {submitting ? 'Cadastrando...' : 'Cadastrar'}
                            </button>
                        </>
                    )
                }
            >
                {error && <div className={s.errorMsg}>{error}</div>}
                {preRegisterResult ? (
                    <div className={s.inviteLinkBox}>
                        {preRegisterResult.linkRequested ? (
                            <p className={s.confirmText}>
                                <FiMail /> Esse e-mail já tem uma conta.
                                Enviamos um pedido de vínculo para{' '}
                                <span className={s.confirmName}>
                                    {preRegisterResult.email}
                                </span>{' '}
                                — o aluno vai aparecer como &quot;Aguardando
                                o aluno aceitar&quot; até aceitar o vínculo na
                                própria conta. Os dados e o treino dele só
                                aparecem para você depois do aceite.
                            </p>
                        ) : (
                            <>
                                <p className={s.confirmText}>
                                    <FiMail /> Aluno cadastrado! Enviamos a
                                    senha de acesso por e-mail para{' '}
                                    <span className={s.confirmName}>
                                        {preRegisterResult.email}
                                    </span>
                                    .
                                </p>
                                {!preRegisterResult.emailSent && (
                                    <p className={s.confirmText}>
                                        Não conseguimos confirmar a entrega
                                        do e-mail. Se o aluno não receber a
                                        senha, ele pode usar &quot;Esqueci
                                        minha senha&quot; na tela de login
                                        com o e-mail cadastrado.
                                    </p>
                                )}
                                {preRegisterResult.tempPassword && (
                                    <>
                                        <p className={s.confirmText}>
                                            Você também pode ajudar o aluno
                                            a entrar agora — essa senha só
                                            aparece nesta tela, uma vez:
                                        </p>
                                        <div
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 8,
                                            }}
                                        >
                                            <input
                                                readOnly
                                                value={
                                                    preRegisterResult.tempPassword
                                                }
                                                onFocus={(e) =>
                                                    e.target.select()
                                                }
                                                className={s.formInput}
                                                style={{
                                                    fontFamily: 'monospace',
                                                    letterSpacing: '0.5px',
                                                }}
                                            />
                                            <button
                                                type="button"
                                                onClick={async () => {
                                                    try {
                                                        await navigator.clipboard.writeText(
                                                            preRegisterResult.tempPassword!,
                                                        );
                                                        setPasswordCopied(
                                                            true,
                                                        );
                                                        setTimeout(
                                                            () =>
                                                                setPasswordCopied(
                                                                    false,
                                                                ),
                                                            2000,
                                                        );
                                                    } catch {
                                                        /* clipboard indisponível — o campo já permite copiar manualmente */
                                                    }
                                                }}
                                                className={s.btnSubmit}
                                                style={{
                                                    flexShrink: 0,
                                                    whiteSpace: 'nowrap',
                                                }}
                                            >
                                                {passwordCopied ? (
                                                    <>
                                                        <FiCheck /> Copiada!
                                                    </>
                                                ) : (
                                                    'Copiar'
                                                )}
                                            </button>
                                        </div>
                                    </>
                                )}
                            </>
                        )}
                    </div>
                ) : (
                    <>
                        <div className={s.formGroup}>
                            <label className={s.formLabel}>Nome</label>
                            <input
                                name="name"
                                value={preRegisterForm.name}
                                onChange={handlePreRegisterInput}
                                className={s.formInput}
                            />
                        </div>
                        <div className={s.formGroup}>
                            <label className={s.formLabel}>E-mail</label>
                            <input
                                name="email"
                                type="email"
                                value={preRegisterForm.email}
                                onChange={handlePreRegisterInput}
                                className={s.formInput}
                            />
                        </div>
                        <div className={s.formGroup}>
                            <label className={s.formLabel}>
                                Data de nascimento
                            </label>
                            <input
                                name="birth_date"
                                type="date"
                                value={preRegisterForm.birth_date}
                                onChange={handlePreRegisterInput}
                                className={s.formInput}
                            />
                        </div>
                        <div className={s.formGroup}>
                            <label className={s.formLabel}>Sexo</label>
                            <select
                                name="gender"
                                value={preRegisterForm.gender}
                                onChange={handlePreRegisterInput}
                                className={s.formInput}
                            >
                                <option value="">Selecione</option>
                                <option value="male">Masculino</option>
                                <option value="female">Feminino</option>
                                <option value="other">Outro</option>
                            </select>
                        </div>
                        <div className={s.formGroup}>
                            <label className={s.formLabel}>
                                CPF (opcional)
                            </label>
                            <input
                                name="cpf"
                                value={preRegisterForm.cpf}
                                onChange={(e) => {
                                    e.target.value = formatCpfInput(
                                        e.target.value,
                                    );
                                    handlePreRegisterInput(e);
                                }}
                                placeholder="Deixe em branco se não souber"
                                className={s.formInput}
                            />
                        </div>
                        <div className={s.formGroup}>
                            <label className={s.formLabel}>Telefone</label>
                            <input
                                name="phone"
                                value={preRegisterForm.phone}
                                onChange={handlePreRegisterInput}
                                className={s.formInput}
                            />
                        </div>
                    </>
                )}
            </Modal>

            {/* ── Edit Student Modal ── */}
            <Modal open={modal === 'edit'} onClose={closeModal} title="Editar Aluno"
                footer={
                    <>
                        <button onClick={closeModal} className={s.btnCancel}>
                            Cancelar
                        </button>
                        <button
                            onClick={handleUpdate}
                            disabled={submitting}
                            className={s.btnSubmit}
                        >
                            {submitting ? 'Salvando...' : 'Salvar'}
                        </button>
                    </>
                }
            >
                {error && <div className={s.errorMsg}>{error}</div>}
                <div className={s.formGroup}>
                    <label className={s.formLabel}>Nome</label>
                    <input
                        name="name"
                        value={editForm.name}
                        onChange={handleEditInput}
                        className={s.formInput}
                    />
                </div>
                <div className={s.formGroup}>
                    <label className={s.formLabel}>Telefone</label>
                    <input
                        name="phone"
                        value={editForm.phone}
                        onChange={handleEditInput}
                        className={s.formInput}
                    />
                </div>
                <div className={s.formGroup}>
                    <label className={s.formLabel}>Celular</label>
                    <input
                        name="mobile_phone"
                        value={editForm.mobile_phone}
                        onChange={handleEditInput}
                        className={s.formInput}
                    />
                </div>
                {/* Salva por conta própria (PUT /students/:id/log-window),
                    separado do restante do formulário — não entra em
                    editForm/handleUpdate. */}
                {editId && <LogWindowSettings studentId={editId} />}
            </Modal>

            {/* ── Unlink Student Modal ── */}
            <Modal
                open={modal === 'unlink' && !!unlinkTarget}
                onClose={closeModal}
                title={unlinkTarget?.awaiting_consent ? 'Cancelar pedido de vínculo' : 'Desvincular Aluno'}
                footer={
                    <>
                        <button onClick={closeModal} className={s.btnCancel}>
                            Voltar
                        </button>
                        <button
                            onClick={handleUnlink}
                            disabled={submitting}
                            className={s.btnSubmit}
                            style={{ background: 'var(--grad-coral)', color: '#fff' }}
                        >
                            {submitting
                                ? 'Aguarde...'
                                : unlinkTarget?.awaiting_consent
                                  ? 'Cancelar pedido'
                                  : 'Desvincular'}
                        </button>
                    </>
                }
            >
                {error && <div className={s.errorMsg}>{error}</div>}
                {unlinkTarget?.awaiting_consent ? (
                    <p className={s.confirmText}>
                        O pedido de vínculo para{' '}
                        <span className={s.confirmName}>
                            {unlinkTarget.email}
                        </span>{' '}
                        sai da sua lista. Se quiser, você pode pedir de novo
                        depois em &quot;+ Adicionar Aluno&quot;.
                    </p>
                ) : (
                    <>
                        <p className={s.confirmText}>
                            Tem certeza que deseja desvincular{' '}
                            <span className={s.confirmName}>
                                {unlinkTarget?.name}
                            </span>
                            ?
                        </p>
                        <p className={s.confirmText}>
                            A conta do aluno não é excluída — apenas o vínculo
                            com você. Sem um personal, o aluno passa a montar o
                            próprio treino.
                        </p>
                    </>
                )}
            </Modal>

            {/* ── Importar Treino de PDF: escolher aluno (área geral) ── */}
            <Modal
                open={pdfImportPickerOpen}
                onClose={() => setPdfImportPickerOpen(false)}
                title="Importar Treino de PDF — escolha o aluno"
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {students.filter((st) => !st.awaiting_consent).map((st) => (
                        <button
                            key={st.id}
                            type="button"
                            onClick={() => {
                                setPdfImportPickerOpen(false);
                                setPdfImportStudent({ id: st.id, name: st.name });
                            }}
                            className={s.footLink}
                            style={{
                                textAlign: 'left',
                                padding: '10px 8px',
                                borderRadius: 8,
                                border: '1px solid var(--border-subtle)',
                            }}
                        >
                            {st.name}
                        </button>
                    ))}
                </div>
            </Modal>

            {pdfImportStudent && (
                <TrainingPdfUploadModal
                    open={!!pdfImportStudent}
                    role="personal"
                    studentId={pdfImportStudent.id}
                    studentName={pdfImportStudent.name}
                    onClose={() => setPdfImportStudent(null)}
                    onApplied={(result) => {
                        const targetStudentId = pdfImportStudent.id;
                        setPdfImportStudent(null);
                        router.push(
                            `/personal/aluno/${targetStudentId}/periodizacao/${result.macrocycleId}?created=1`,
                        );
                    }}
                />
            )}
        </>
    );
}

/** Selo financeiro do aluno no card: só aparece quando há algo a dizer
 * (sem cobrança nenhuma, fica quieto). */
function FinanceChip({ status }: { status?: FinanceStudentStatus }) {
    if (!status || status.state === 'none') return null;
    const chip = (() => {
        switch (status.state) {
            case 'overdue':
                return {
                    text: `Atrasado há ${status.overdue_days ?? 0} dia${status.overdue_days === 1 ? '' : 's'} · ${BRL(status.overdue_amount ?? 0)}`,
                    bg: 'rgba(255, 107, 107, 0.15)',
                    color: 'var(--coral-dim)',
                };
            case 'awaiting':
                return { text: 'Informou pagamento · confirmar', bg: 'rgba(240, 165, 0, 0.16)', color: 'var(--amber-text)' };
            case 'due_today':
                return { text: `Vence hoje · ${BRL(status.next_amount ?? 0)}`, bg: 'rgba(240, 165, 0, 0.16)', color: 'var(--amber-text)' };
            case 'due_soon':
                return {
                    text: `Vence ${fmtDate(status.next_due_date)} · ${BRL(status.next_amount ?? 0)}`,
                    bg: 'var(--surface-3)',
                    color: 'var(--text-secondary)',
                };
            default:
                return { text: 'Mensalidade em dia', bg: 'var(--mint-glow)', color: 'var(--mint-text)' };
        }
    })();
    return (
        <span
            style={{
                display: 'inline-block',
                marginTop: 4,
                padding: '2px 10px',
                borderRadius: 999,
                fontSize: '0.75rem',
                fontWeight: 700,
                background: chip.bg,
                color: chip.color,
            }}
        >
            💵 {chip.text}
        </span>
    );
}
