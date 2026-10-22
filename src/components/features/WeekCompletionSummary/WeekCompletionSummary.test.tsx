import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import WeekCompletionSummary from './index';

const done = {
    trainingRef: 'A',
    logId: 'log1',
    at: new Date(2026, 9, 20, 10),
    order: 1,
    repetition: 1,
};

describe('WeekCompletionSummary — desfazer', () => {
    it('pede confirmação antes de desfazer', async () => {
        const onUndo = vi.fn().mockResolvedValue(undefined);
        render(<WeekCompletionSummary completions={[done]} onUndo={onUndo} />);

        fireEvent.click(screen.getByText('desfazer'));
        expect(onUndo).not.toHaveBeenCalled();
        fireEvent.click(screen.getByText('Sim'));

        await waitFor(() => expect(onUndo).toHaveBeenCalledWith(done));
    });

    it('sem logId (ainda na fila offline) não oferece desfazer', () => {
        render(
            <WeekCompletionSummary
                completions={[{ ...done, logId: undefined }]}
                onUndo={vi.fn()}
            />,
        );
        expect(screen.queryByText('desfazer')).toBeNull();
    });

    it('lista pulados com desfazer', () => {
        render(
            <WeekCompletionSummary
                completions={[]}
                skipped={[{ ...done, trainingRef: 'B', logId: 'log2' }]}
                onUndo={vi.fn()}
            />,
        );
        expect(screen.getByText('Pulados nesta semana')).toBeInTheDocument();
        expect(screen.getByText('desfazer')).toBeInTheDocument();
    });

    it('mostra erro quando o desfazer falha', async () => {
        const onUndo = vi.fn().mockRejectedValue(new Error('rede'));
        render(<WeekCompletionSummary completions={[done]} onUndo={onUndo} />);
        fireEvent.click(screen.getByText('desfazer'));
        fireEvent.click(screen.getByText('Sim'));
        expect(await screen.findByRole('alert')).toBeInTheDocument();
    });
});
