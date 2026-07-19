import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Input from './index';

describe('Input', () => {
    it('renders with the styling classes the rest of the app relies on', () => {
        render(<Input placeholder="E-mail" />);
        const input = screen.getByPlaceholderText('E-mail');
        expect(input).toBeInTheDocument();
        expect(input).toHaveClass(
            'form-control',
            'form-control-lg',
            'input-form',
        );
    });

    it('forwards arbitrary input props such as type and value changes', async () => {
        const user = userEvent.setup();
        const handleChange = vi.fn();
        render(
            <Input
                placeholder="Senha"
                type="password"
                onChange={handleChange}
            />,
        );

        const input = screen.getByPlaceholderText('Senha');
        expect(input).toHaveAttribute('type', 'password');

        await user.type(input, 'segredo');
        expect(handleChange).toHaveBeenCalled();
    });
});
