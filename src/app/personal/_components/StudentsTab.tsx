'use client';

import { useState } from 'react';
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
} from 'react-icons/fi';
import AvatarUpload from '@/components/molecules/AvatarUpload';
import Modal from '@/components/system/Modal';
import TrainingPdfUploadModal from '@/components/features/TrainingPdfUploadModal';
import { usePersonalStudents } from '@/hooks/usePersonalStudents';
import s from '../personal.module.css';

type StudentsState = ReturnType<typeof usePersonalStudents>;

interface Props {
    state: StudentsState;
}

export default function StudentsTab({ state }: Props) {
    const router = useRouter();
    const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
    const [pdfImportStudent, setPdfImportStudent] = useState<{
        id: string;
        name: string;
    } | null>(null);
    const [pdfImportPickerOpen, setPdfImportPickerOpen] = useState(false);
    const {
        students,
        loading,
        modal,
        editForm,
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
                    <button onClick={openPreRegister} className={s.btnAdd}>
                        + Adicionar Aluno
                    </button>
                </div>
            </div>

            {modal === null && error && (
                <div className={s.errorMsg}>{error}</div>
            )}

            {loading ? (
                <p className={s.loading}>Carregando...</p>
            ) : students.length === 0 ? (
                <div className={s.empty}>
                    <div className={s.emptyIcon}><FiActivity /></div>
                    <h3 className={s.emptyTitle}>Nenhum aluno cadastrado</h3>
                    <p className={s.emptyText}>
                        Clique em &quot;+ Adicionar Aluno&quot; para
                        pré-cadastrar um aluno — ele recebe a senha de
                        acesso por e-mail.
                    </p>
                </div>
            ) : (
                <div className={s.studentList}>
                    {students.map((st) => (
                        <div key={st.id} className={s.studentCard}>
                            <div className={s.studentCardHead}>
                                <AvatarUpload
                                    current={st.avatar}
                                    name={st.name}
                                    size={48}
                                    editable={false}
                                />
                                <div className={s.studentInfo}>
                                    <p className={s.studentName}>
                                        {st.name}
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
                                                : st.link_status === 'pending'
                                                  ? 'Aguardando confirmação'
                                                  : 'Inativo'}
                                        </span>
                                    </p>
                                    <p className={s.studentMeta}>
                                        {st.email} · {st.cpf}
                                        {st.phone ? ` · ${st.phone}` : ''}
                                    </p>
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
                                                Desvincular
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>

                            <div className={s.studentCardBody}>
                                <button
                                    onClick={() =>
                                        router.push(
                                            `/personal/aluno/${st.id}/treino`,
                                        )
                                    }
                                    className={s.ctaPrimary}
                                >
                                    <FiEye /> Ver Treino
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
                                        <FiClipboard /> Periodização
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
                                        <FiHeart /> Triagem/Anamnese
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
                                </div>
                            </div>
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
                                confirmação&quot; até aceitar o vínculo na
                                própria conta.
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
                            <label className={s.formLabel}>CPF</label>
                            <input
                                name="cpf"
                                value={preRegisterForm.cpf}
                                onChange={handlePreRegisterInput}
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
            </Modal>

            {/* ── Unlink Student Modal ── */}
            <Modal
                open={modal === 'unlink' && !!unlinkTarget}
                onClose={closeModal}
                title="Desvincular Aluno"
                footer={
                    <>
                        <button onClick={closeModal} className={s.btnCancel}>
                            Cancelar
                        </button>
                        <button
                            onClick={handleUnlink}
                            disabled={submitting}
                            className={s.btnSubmit}
                            style={{ background: 'var(--grad-coral)', color: '#fff' }}
                        >
                            {submitting ? 'Desvinculando...' : 'Desvincular'}
                        </button>
                    </>
                }
            >
                {error && <div className={s.errorMsg}>{error}</div>}
                <p className={s.confirmText}>
                    Tem certeza que deseja desvincular{' '}
                    <span className={s.confirmName}>
                        {unlinkTarget?.name}
                    </span>
                    ?
                </p>
                <p className={s.confirmText}>
                    A conta do aluno não é excluída — apenas o vínculo
                    com você. Sem um personal, o aluno passa a poder
                    gerar um treino próprio pela anamnese automática.
                </p>
            </Modal>

            {/* ── Importar Treino de PDF: escolher aluno (área geral) ── */}
            <Modal
                open={pdfImportPickerOpen}
                onClose={() => setPdfImportPickerOpen(false)}
                title="Importar Treino de PDF — escolha o aluno"
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {students.map((st) => (
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
