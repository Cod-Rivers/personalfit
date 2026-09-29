import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

const cached = {
    log_window: '48h',
    is_default: true,
    photo_enabled: false,
    comments_enabled: true,
    ai_report_enabled: true,
    personal_name: 'Ana',
    fetchedAt: new Date().toISOString(),
};

vi.mock('@/libs/logWindowService', () => ({
    getCachedMyLogWindow: () => cached,
    // Offline: a busca falha e a tela fica com o cache.
    getMyLogWindow: () => Promise.reject(new Error('offline')),
    isCheckInPhotoEnabled: (c: { photo_enabled?: boolean } | null) => c?.photo_enabled !== false,
    isCheckInCommentEnabled: (c: { comments_enabled?: boolean } | null) => c?.comments_enabled !== false,
}));

const sessionUser = { has_personal: true };
vi.mock('@/libs/session', () => ({ getUser: () => sessionUser }));
vi.mock('@/hooks/usePoseOfDay', () => ({ usePoseOfDay: () => ({ pose: null }) }));

import WorkoutCheckIn from './WorkoutCheckIn';

function renderCheckIn(props: Partial<React.ComponentProps<typeof WorkoutCheckIn>> = {}) {
    const onConfirm = vi.fn();
    render(
        <WorkoutCheckIn
            plannedDate={new Date().toISOString().slice(0, 10)}
            loading={false}
            error={null}
            onConfirm={onConfirm}
            onCancel={() => {}}
            {...props}
        />,
    );
    return onConfirm;
}

describe('WorkoutCheckIn — comentário ao personal', () => {
    beforeEach(() => {
        sessionUser.has_personal = true;
        window.localStorage.clear();
    });

    it('aluno com personal vê o comentário endereçado pelo nome, com o aviso de IA', () => {
        renderCheckIn();
        expect(screen.getByText('Mensagem para Ana')).toBeInTheDocument();
        expect(screen.getByText(/relatório de acompanhamento, que usa IA/)).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Como foi o treino? Ana lê todos os comentários.')).toBeInTheDocument();
    });

    it('um toque num chip já vai no corpo da sessão', () => {
        const onConfirm = renderCheckIn();
        fireEvent.click(screen.getByRole('button', { name: 'Gostei do treino' }));
        fireEvent.click(screen.getByRole('button', { name: /Enviar e concluir/ }));
        expect(onConfirm).toHaveBeenCalledTimes(1);
        expect(onConfirm.mock.calls[0][0].comment).toEqual({ tags: ['gostei'] });
    });

    it('dor abre as regiões e só manda região junto de dor', () => {
        const onConfirm = renderCheckIn();
        fireEvent.click(screen.getByRole('button', { name: 'Senti dor' }));
        fireEvent.click(screen.getByRole('button', { name: 'Joelho' }));
        fireEvent.click(screen.getByRole('button', { name: /Enviar e concluir/ }));
        expect(onConfirm.mock.calls[0][0].comment).toEqual({ tags: ['dor'], pain_regions: ['joelho'] });
    });

    it('as observações do formulário viram o começo do comentário', () => {
        const onConfirm = renderCheckIn({ initialCommentText: '  ombro incomodou  ' });
        fireEvent.click(screen.getByRole('button', { name: /Enviar e concluir/ }));
        expect(onConfirm.mock.calls[0][0].comment).toEqual({ text: 'ombro incomodou' });
    });

    it('sem comentário conclui normalmente, sem campo no corpo', () => {
        const onConfirm = renderCheckIn();
        fireEvent.click(screen.getByRole('button', { name: /^Concluir$/ }));
        expect(onConfirm).toHaveBeenCalledTimes(1);
        expect(onConfirm.mock.calls[0][0].comment).toBeUndefined();
    });

    it('lembrete leve: o primeiro toque avisa, o segundo conclui', () => {
        window.localStorage.setItem('venafit:comment-nudge', JSON.stringify({ emptyStreak: 3 }));
        const onConfirm = renderCheckIn();
        fireEvent.click(screen.getByRole('button', { name: /^Concluir$/ }));
        expect(onConfirm).not.toHaveBeenCalled();
        expect(screen.getByRole('status')).toHaveTextContent('Um toque num dos botões acima já ajuda Ana');
        fireEvent.click(screen.getByRole('button', { name: /Concluir sem comentário/ }));
        expect(onConfirm).toHaveBeenCalledTimes(1);
    });

    it('aluno sem personal não vê o comentário', () => {
        sessionUser.has_personal = false;
        const onConfirm = renderCheckIn();
        expect(screen.queryByText(/Mensagem para/)).not.toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: /Confirmar/ }));
        expect(onConfirm.mock.calls[0][0].comment).toBeUndefined();
    });

    it('modo assistido (personal com o aparelho) não mostra o comentário', () => {
        renderCheckIn({ assisted: true, studentName: 'Bia' });
        expect(screen.queryByText(/Mensagem para/)).not.toBeInTheDocument();
    });

    it('pergunta contextual: recorde vence', () => {
        renderCheckIn({
            commentContext: { recordExercise: 'Supino', avgRpe: 9.5, daysSinceLastWorkout: 10, firstTimeExercise: null },
        });
        expect(screen.getByPlaceholderText('Bateu recorde no Supino! Conta pra Ana como foi.')).toBeInTheDocument();
    });
});
