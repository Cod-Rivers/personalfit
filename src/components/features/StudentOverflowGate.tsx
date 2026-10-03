'use client';

import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useState,
} from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { FiClock, FiUsers } from 'react-icons/fi';
import { Api } from '@/libs/api';
import { useForegroundRefresh } from '@/hooks/useForegroundRefresh';
import { studentDisplayName, type Student } from '@/hooks/usePersonalStudents';
import {
    chooseStudentsToKeep,
    getStudentOverflow,
    type StudentOverflowStatus,
} from '@/libs/studentOverflowService';
import s from './StudentOverflowGate.module.css';

const StudentOverflowContext = createContext<StudentOverflowStatus | null>(
    null,
);

/** Status do excedente de alunos do free (null = sem ciclo ou ainda não
 * carregado). Usado pelo cartão do aluno para o selo "Em espera". */
export function useStudentOverflow(): StudentOverflowStatus | null {
    return useContext(StudentOverflowContext);
}

function fmtDate(iso?: string): string {
    return iso ? new Date(iso).toLocaleDateString('pt-BR') : '';
}

function extractErrorMessage(err: unknown, fallback: string): string {
    const data = (err as { response?: { data?: { error?: string } } })?.response
        ?.data;
    return data?.error || fallback;
}

/**
 * Trava do painel do personal no excedente de alunos do free: enquanto ele
 * não escolhe quem continua, só a tela de escolha aparece (o servidor também
 * recusa as alterações nos alunos). Depois da escolha, o painel avisa quantos
 * alunos estão em espera e até quando.
 *
 * Sem rede ou com erro na consulta, não trava nada: a trava é de plano, e o
 * servidor continua barrando as alterações.
 */
export default function StudentOverflowGate({
    children,
}: {
    children: React.ReactNode;
}) {
    const [status, setStatus] = useState<StudentOverflowStatus | null>(null);
    const pathname = usePathname();
    const router = useRouter();

    const load = useCallback(() => {
        if (!localStorage.getItem('token')) return;
        getStudentOverflow()
            .then(setStatus)
            .catch(() => {});
    }, []);

    useEffect(() => {
        load();
    }, [load]);
    // O ciclo muda com o painel aberto (o job abre o ciclo, o personal
    // assina o PRO em outro aparelho): busca de novo ao voltar ao app.
    useForegroundRefresh(load);

    if (status?.pending_choice) {
        return <StudentOverflowChoice status={status} onChosen={setStatus} />;
    }

    const standbyCount = status?.standby_student_ids.length ?? 0;
    return (
        <StudentOverflowContext.Provider value={status}>
            {standbyCount > 0 && pathname === '/personal' && (
                <div className={s.banner} role="status">
                    <FiClock size={20} aria-hidden="true" />
                    <div className={s.bannerText}>
                        <strong>
                            {standbyCount === 1
                                ? '1 aluno em espera'
                                : `${standbyCount} alunos em espera`}{' '}
                            até {fmtDate(status?.deadline)}
                        </strong>
                        <span>
                            Eles continuam treinando, mas você não altera nada
                            deles. Assine o PRO até lá para voltar a acompanhar
                            todos; senão, eles são desvinculados.
                        </span>
                    </div>
                    <button
                        type="button"
                        className={s.btnPrimary}
                        onClick={() => router.push('/pagamento?produto=pro')}
                    >
                        Assinar o PRO
                    </button>
                </div>
            )}
            {children}
        </StudentOverflowContext.Provider>
    );
}

function StudentOverflowChoice({
    status,
    onChosen,
}: {
    status: StudentOverflowStatus;
    onChosen: (s: StudentOverflowStatus) => void;
}) {
    const router = useRouter();
    const [students, setStudents] = useState<Student[] | null>(null);
    const [selected, setSelected] = useState<string[]>([]);
    const [confirming, setConfirming] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        Api.get<Student[]>('/students')
            .then((r) => setStudents(r.data ?? []))
            .catch(() => setError('Não foi possível carregar seus alunos.'));
    }, []);

    const limit = status.limit ?? 3;
    const total = students?.length ?? 0;
    const need = Math.min(limit, total);
    const deadline = fmtDate(status.deadline);
    const leaving = (students ?? []).filter((st) => !selected.includes(st.id));

    function toggle(id: string) {
        setSelected((prev) =>
            prev.includes(id)
                ? prev.filter((x) => x !== id)
                : prev.length < need
                  ? [...prev, id]
                  : prev,
        );
    }

    async function confirm() {
        setSaving(true);
        setError('');
        try {
            onChosen(await chooseStudentsToKeep(selected));
        } catch (e) {
            setError(
                extractErrorMessage(e, 'Não foi possível salvar a escolha.'),
            );
            setConfirming(false);
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className={s.screen}>
            <div className={s.card}>
                <span className={s.iconTile}>
                    <FiUsers size={22} aria-hidden="true" />
                </span>
                <h1 className={s.title}>
                    Escolha os {need || limit} alunos que continuam
                </h1>
                <p className={s.text}>
                    Sua conta está no plano gratuito, que inclui até {limit}{' '}
                    alunos, e você tem {total || 'mais'}. Escolha quem continua
                    com você. Os demais ficam <strong>em espera</strong> até{' '}
                    {deadline}: continuam treinando o plano atual, mas você não
                    altera nada deles. Se você assinar o PRO até lá, todos
                    voltam ao normal; senão, eles são desvinculados.
                </p>

                {error && <p className={s.error}>{error}</p>}

                {!confirming ? (
                    <>
                        <p className={s.counter}>
                            {selected.length} de {need} escolhidos · a escolha é
                            definitiva
                        </p>
                        <ul className={s.list}>
                            {(students ?? []).map((st) => {
                                const checked = selected.includes(st.id);
                                const disabled =
                                    !checked && selected.length >= need;
                                return (
                                    <li key={st.id}>
                                        <label
                                            className={`${s.option} ${checked ? s.optionChecked : ''}`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={checked}
                                                disabled={disabled}
                                                onChange={() => toggle(st.id)}
                                            />
                                            <span>{studentDisplayName(st)}</span>
                                        </label>
                                    </li>
                                );
                            })}
                        </ul>
                        <div className={s.actions}>
                            <button
                                type="button"
                                className={s.btnSecondary}
                                onClick={() =>
                                    router.push('/pagamento?produto=pro')
                                }
                            >
                                Assinar o PRO e manter todos
                            </button>
                            <button
                                type="button"
                                className={s.btnPrimary}
                                disabled={
                                    students === null ||
                                    selected.length !== need
                                }
                                onClick={() => setConfirming(true)}
                            >
                                Continuar
                            </button>
                        </div>
                    </>
                ) : (
                    <>
                        <p className={s.text}>
                            <strong>Vão para a espera até {deadline}:</strong>{' '}
                            {leaving.map((st) => studentDisplayName(st)).join(', ')}. Esta
                            escolha não pode ser desfeita.
                        </p>
                        <div className={s.actions}>
                            <button
                                type="button"
                                className={s.btnSecondary}
                                onClick={() => setConfirming(false)}
                                disabled={saving}
                            >
                                Voltar
                            </button>
                            <button
                                type="button"
                                className={s.btnPrimary}
                                onClick={confirm}
                                disabled={saving}
                            >
                                {saving ? 'Salvando...' : 'Confirmar escolha'}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
