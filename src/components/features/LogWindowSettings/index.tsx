'use client';

import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import HelpTooltip from '@/components/atoms/HelpTooltip';
import { useToast } from '@/components/system/Toast';
import { getGlossaryTerm } from '@/libs/glossaryContent';
import {
    LOG_WINDOW_DEFAULT,
    LOG_WINDOW_LABELS,
    LOG_WINDOW_VALUES,
    formatLogWindowForDisplay,
    type LogWindow,
} from '@/libs/logWindow';
import {
    getStudentLogWindow,
    updateStudentLogWindow,
} from '@/libs/logWindowService';
import styles from './styles.module.css';

interface Props {
    studentId: string;
}

// União discriminada em vez de "loading"/"value" soltos: o valor só existe
// depois que a leitura termina, e o componente nunca precisa checar
// combinações impossíveis (ex. isDefault sem value ainda carregado).
type ReadState =
    | { kind: 'loading' }
    | { kind: 'ready'; value: LogWindow; isDefault: boolean };

/**
 * Seletor da janela de registro de treino de UM aluno vinculado — só o
 * personal enxerga e edita isto (o aluno nunca altera a própria janela,
 * RN-08). Consome PUT /students/:id/log-window.
 *
 * A leitura inicial degrada silenciosamente para o default (48h) em caso de
 * erro: hoje o backend não tem uma rota GET simétrica ao PUT para o personal
 * consultar a janela de um aluno específico (só GET /me/log-window, que é do
 * próprio aluno) — ver a nota em logWindowService.ts. Sem essa rota, todo GET
 * daqui volta 404, e mostrar isso como "erro de leitura" alarmaria o
 * personal por um comportamento esperado hoje.
 */
export default function LogWindowSettings({ studentId }: Props) {
    const [state, setState] = useState<ReadState>({ kind: 'loading' });
    const [saving, setSaving] = useState(false);
    const { showSuccess, showError, ToastSlot } = useToast();

    useEffect(() => {
        let cancelled = false;
        setState({ kind: 'loading' });
        getStudentLogWindow(studentId)
            .then((res) => {
                if (cancelled) return;
                setState({
                    kind: 'ready',
                    value: res.log_window,
                    isDefault: res.is_default,
                });
            })
            .catch(() => {
                if (cancelled) return;
                setState({
                    kind: 'ready',
                    value: LOG_WINDOW_DEFAULT,
                    isDefault: true,
                });
            });
        return () => {
            cancelled = true;
        };
    }, [studentId]);

    const handleChange = useCallback(
        async (next: LogWindow) => {
            if (state.kind !== 'ready' || saving) return;
            const previous = state;
            // Otimista: o aluno não vê esta tela, então não há risco de
            // "confirmar antes da hora" pra ele — só o personal, que está
            // olhando o próprio clique.
            setState({ kind: 'ready', value: next, isDefault: false });
            setSaving(true);
            try {
                const res = await updateStudentLogWindow(studentId, next);
                setState({
                    kind: 'ready',
                    value: res.log_window,
                    isDefault: res.is_default,
                });
                showSuccess('Janela de registro atualizada.');
            } catch (err) {
                setState(previous);
                if (axios.isAxiosError(err) && !err.response) {
                    showError(
                        'Sem conexão com o servidor — tente novamente.',
                    );
                } else {
                    showError(
                        'Não foi possível salvar a janela de registro.',
                    );
                }
            } finally {
                setSaving(false);
            }
        },
        [state, saving, studentId, showSuccess, showError],
    );

    if (state.kind === 'loading') {
        return (
            <div className={styles.wrap}>
                <p className={styles.loading}>Carregando janela de registro...</p>
            </div>
        );
    }

    return (
        <div className={styles.wrap}>
            <label className={styles.label}>
                Janela de registro{' '}
                <HelpTooltip
                    text={getGlossaryTerm('janela-de-registro').short}
                    href="/ajuda#glossario-janela-de-registro"
                    label="Ajuda sobre janela de registro"
                />
            </label>
            <select
                className={styles.select}
                value={state.value}
                disabled={saving}
                onChange={(e) => handleChange(e.target.value as LogWindow)}
            >
                {LOG_WINDOW_VALUES.map((value) => (
                    <option key={value} value={value}>
                        {LOG_WINDOW_LABELS[value]}
                    </option>
                ))}
            </select>
            <p className={styles.hint}>
                {saving
                    ? 'Salvando...'
                    : `Atual: ${formatLogWindowForDisplay(state.value, state.isDefault)}`}
            </p>
            {ToastSlot}
        </div>
    );
}
