import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import PublishResultWizard from './PublishResultWizard';
import { createResult, getResultEligibility, type ResultEligibility } from '@/libs/resultService';

vi.mock('@/libs/resultService', async (orig) => ({
    ...(await orig<typeof import('@/libs/resultService')>()),
    getResultEligibility: vi.fn(),
    createResult: vi.fn(),
}));

// jsdom não carrega imagens: o Image falso "carrega" uma foto 800x1000 (4:5).
class FakeImage {
    naturalWidth = 800;
    naturalHeight = 1000;
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    set src(_: string) {
        setTimeout(() => this.onload?.(), 0);
    }
}

const eligibility: ResultEligibility = {
    photos: [
        { entry_id: 'e1', photo_index: 0, url: 'https://x/1.jpg', date: '2026-06-01', uploaded_at: '2026-06-01T10:00:00Z' },
        { entry_id: 'e2', photo_index: 0, url: 'https://x/2.jpg', date: '2026-09-01', uploaded_at: '2026-09-01T10:00:00Z' },
    ],
    first_name: 'Ana',
    has_birth_date: false,
    is_adult: true,
    terms_version: '2026-10-15',
    has_personal: true,
};

describe('PublishResultWizard', () => {
    const realImage = globalThis.Image;
    beforeEach(() => {
        globalThis.Image = FakeImage as unknown as typeof Image;
        vi.mocked(getResultEligibility).mockReset().mockResolvedValue(eligibility);
        vi.mocked(createResult).mockReset().mockResolvedValue({} as never);
    });
    afterEach(() => {
        globalThis.Image = realImage;
    });

    it('envia as fotos na ordem certa, o termo, a data de nascimento e só os usos marcados', async () => {
        const user = userEvent.setup();
        const onPublished = vi.fn();
        render(<PublishResultWizard open onClose={() => {}} onPublished={onPublished} />);

        // Escolhe a mais nova primeiro: ela vira o "depois" mesmo assim.
        await user.click(await screen.findByRole('button', { name: /Foto de 2026-09-01/ }));
        await user.click(screen.getByRole('button', { name: /Foto de 2026-06-01/ }));
        await user.click(screen.getByRole('button', { name: 'Continuar' }));
        await user.click(screen.getByRole('button', { name: 'Continuar' }));

        await user.click(screen.getByLabelText(/Diferença de peso/));
        await user.click(screen.getByLabelText(/mostrar meu resultado na página dele/));
        await user.click(screen.getByLabelText(/Marcar meu personal/));
        await user.click(screen.getByRole('button', { name: 'Continuar' }));

        const send = screen.getByRole('button', { name: 'Enviar para revisão' });
        expect(send).toBeDisabled();
        await user.click(screen.getByLabelText(/Li o termo/));
        expect(send).toBeDisabled(); // falta a data de nascimento
        await user.type(screen.getByLabelText(/data de nascimento/), '1990-05-01');
        await user.click(send);

        await waitFor(() => expect(onPublished).toHaveBeenCalled());
        const payload = vi.mocked(createResult).mock.calls[0][0];
        expect(payload.before.entry_id).toBe('e1');
        expect(payload.after.entry_id).toBe('e2');
        expect(payload.before.crop).toEqual({ x: 0, y: 0, w: 1, h: 1 });
        expect(payload.show).toEqual({ weight: true, body_fat: false, measurements: false, name: false });
        expect(payload.scopes).toEqual(['mural']);
        expect(payload.tag_personal).toBe(true);
        expect(payload.birth_date).toBe('1990-05-01');
        expect(payload.terms_version).toBe('2026-10-15');
    });

    it('menor de idade não publica', async () => {
        vi.mocked(getResultEligibility).mockResolvedValue({ ...eligibility, is_adult: false });
        render(<PublishResultWizard open onClose={() => {}} onPublished={() => {}} />);
        expect(await screen.findByText(/só para maiores de 18 anos/)).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Continuar' })).not.toBeInTheDocument();
    });
});
