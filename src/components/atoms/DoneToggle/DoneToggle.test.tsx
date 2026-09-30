import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import DoneToggle from './index';

describe('DoneToggle', () => {
    it('é um checkbox com o nome do exercício no rótulo', () => {
        render(<DoneToggle checked={false} onChange={() => {}} exerciseName="Supino reto" />);
        const box = screen.getByRole('checkbox', { name: 'Marcar Supino reto como feito' });
        expect(box).not.toBeChecked();
    });

    it('marcado, anuncia que está feito', () => {
        render(<DoneToggle checked onChange={() => {}} exerciseName="Supino reto" />);
        expect(screen.getByRole('checkbox', { name: 'Supino reto feito — desmarcar' })).toBeChecked();
    });

    it('marca sem disparar o clique do card por baixo', () => {
        const onChange = vi.fn();
        const onOpen = vi.fn();
        render(
            <div onClick={onOpen}>
                <DoneToggle checked={false} onChange={onChange} exerciseName="Remada" />
            </div>,
        );
        fireEvent.click(screen.getByRole('checkbox'));
        expect(onChange).toHaveBeenCalledWith(true);
        expect(onOpen).not.toHaveBeenCalled();
    });

    it('teclas no checkbox não chegam ao card', () => {
        const onKeyDown = vi.fn();
        render(
            <div onKeyDown={onKeyDown}>
                <DoneToggle checked={false} onChange={() => {}} exerciseName="Remada" />
            </div>,
        );
        fireEvent.keyDown(screen.getByRole('checkbox'), { key: ' ' });
        expect(onKeyDown).not.toHaveBeenCalled();
    });

    it('a variante pill mostra o texto do estado', () => {
        const { rerender } = render(
            <DoneToggle size="pill" checked={false} onChange={() => {}} exerciseName="Remada" />,
        );
        expect(screen.getByText('Marcar como feito')).toBeInTheDocument();
        rerender(<DoneToggle size="pill" checked onChange={() => {}} exerciseName="Remada" />);
        expect(screen.getByText('Feito')).toBeInTheDocument();
    });
});
