'use client';

import { useRouter } from 'next/navigation';
import AvatarUpload from '@/components/molecules/AvatarUpload';
import Modal from '@/components/system/Modal';
import { usePersonalStudents } from '@/hooks/usePersonalStudents';
import s from '../personal.module.css';

type StudentsState = ReturnType<typeof usePersonalStudents>;

interface Props {
    state: StudentsState;
}

export default function StudentsTab({ state }: Props) {
    const router = useRouter();
    const {
        students,
        loading,
        modal,
        editForm,
        unlinkTarget,
        submitting,
        error,
        inviteLink,
        copied,
        openInvite,
        retryInvite,
        copyLink,
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
                <button onClick={openInvite} className={s.btnAdd}>
                    + Convidar Aluno
                </button>
            </div>

            {modal === null && error && (
                <div className={s.errorMsg}>{error}</div>
            )}

            {loading ? (
                <p className={s.loading}>Carregando...</p>
            ) : students.length === 0 ? (
                <div className={s.empty}>
                    <div className={s.emptyIcon}>🏋️</div>
                    <h3 className={s.emptyTitle}>Nenhum aluno cadastrado</h3>
                    <p className={s.emptyText}>
                        Clique em &quot;+ Convidar Aluno&quot; para gerar um
                        link de convite.
                    </p>
                </div>
            ) : (
                <div className={s.studentList}>
                    {students.map((st) => (
                        <div key={st.id} className={s.studentCard}>
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
                                                : st.link_status === 'pending'
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
                            <div className={s.studentActions}>
                                <button
                                    onClick={() =>
                                        router.push(
                                            `/personal/aluno/${st.id}/periodizacao`,
                                        )
                                    }
                                    className={s.btnAction}
                                    style={{
                                        borderColor: '#5bc0be',
                                        color: '#5bc0be',
                                    }}
                                >
                                    📋 Periodização
                                </button>
                                <button
                                    onClick={() =>
                                        st.link_status === 'active'
                                            ? deactivate(st)
                                            : requestActivation(st)
                                    }
                                    className={s.btnAction}
                                    disabled={
                                        toggleBusyId !== null ||
                                        st.link_status === 'pending'
                                    }
                                >
                                    {toggleBusyId === st.id
                                        ? 'Aguarde...'
                                        : st.link_status === 'active'
                                          ? 'Desativar'
                                          : st.link_status === 'pending'
                                            ? 'Aguardando aluno...'
                                            : 'Ativar'}
                                </button>
                                <button
                                    onClick={() => openEdit(st)}
                                    className={s.btnAction}
                                >
                                    Editar
                                </button>
                                <button
                                    onClick={() => openUnlink(st)}
                                    className={s.btnDanger}
                                >
                                    Desvincular
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* ── Invite Modal ── */}
            <Modal
                open={modal === 'invite'}
                onClose={closeModal}
                title="Convidar Aluno"
                footer={
                    submitting ? undefined : inviteLink ? (
                        <>
                            <button onClick={closeModal} className={s.btnCancel}>
                                Fechar
                            </button>
                            <button onClick={copyLink} className={s.btnSubmit}>
                                {copied ? '✓ Copiado!' : 'Copiar Link'}
                            </button>
                        </>
                    ) : undefined
                }
            >
                {error && <div className={s.errorMsg}>{error}</div>}
                {submitting ? (
                    <p className={s.loading}>Gerando link...</p>
                ) : inviteLink ? (
                    <>
                        <p className={s.confirmText}>
                            Envie este link para o aluno se cadastrar:
                        </p>
                        <div className={s.inviteLinkBox}>
                            <input
                                readOnly
                                value={inviteLink}
                                className={s.formInput}
                            />
                        </div>
                    </>
                ) : (
                    <>
                        <p className={s.confirmText}>
                            Tente gerar o link novamente.
                        </p>
                        <button onClick={retryInvite} className={s.btnSubmit}>
                            Tentar Novamente
                        </button>
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
                            style={{ background: '#e74c3c', color: '#fff' }}
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
        </>
    );
}
