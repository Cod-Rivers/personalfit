import { describe, expect, it } from 'vitest';
import {
    billingWhatsappMessage,
    daysUntil,
    dueLabel,
    parseAmount,
    receivedCsv,
    todayISO,
    whatsappLink,
    whatsappNumber,
} from './financeFormat';
import type { FinanceCollectItem, Invoice } from './studentInvoiceService';

const inv = (over: Partial<Invoice> = {}): Invoice => ({
    id: '1',
    amount: 150,
    due_date: '2026-10-05',
    status: 'open',
    created_at: '2026-09-01T00:00:00Z',
    from_plan: false,
    reported_by_student: false,
    ...over,
});

describe('parseAmount', () => {
    it('aceita formato brasileiro e ponto decimal', () => {
        expect(parseAmount('150')).toBe(150);
        expect(parseAmount('150,50')).toBe(150.5);
        expect(parseAmount('1.234,50')).toBe(1234.5);
        expect(parseAmount('R$ 99.9')).toBe(99.9);
        expect(parseAmount('')).toBeNaN();
        expect(parseAmount('abc')).toBeNaN();
    });
});

describe('prazos', () => {
    it('conta dias pelo calendário', () => {
        expect(daysUntil('2026-10-05', '2026-10-05')).toBe(0);
        expect(daysUntil('2026-10-05', '2026-10-02')).toBe(3);
        expect(daysUntil('2026-10-05', '2026-10-10')).toBe(-5);
        // Virada de mês/horário de verão não quebra a conta.
        expect(daysUntil('2026-11-02', '2026-10-30')).toBe(3);
    });

    it('descreve o prazo', () => {
        expect(dueLabel(inv(), '2026-10-05')).toBe('Vence hoje');
        expect(dueLabel(inv(), '2026-10-04')).toBe('Vence amanhã');
        expect(dueLabel(inv(), '2026-10-06')).toBe('Atrasada há 1 dia');
        expect(dueLabel(inv({ status: 'paid' }), '2026-10-30')).toBe('Paga');
    });

    it('todayISO usa a data local, não a UTC', () => {
        expect(todayISO(new Date(2026, 9, 5, 23, 30))).toBe('2026-10-05');
    });
});

describe('WhatsApp', () => {
    it('normaliza o número brasileiro', () => {
        expect(whatsappNumber('(11) 98765-4321')).toBe('5511987654321');
        expect(whatsappNumber('+55 11 98765-4321')).toBe('5511987654321');
        expect(whatsappNumber('1234')).toBe('');
        expect(whatsappNumber(undefined)).toBe('');
    });

    it('monta a mensagem sem chave PIX e o link', () => {
        const msg = billingWhatsappMessage('Beto Silva', inv({ description: 'Mensalidade · out/2026' }), '2026-10-07');
        expect(msg).toContain('Olá, Beto!');
        expect(msg).toContain('venceu em 05/10/2026');
        expect(msg.toLowerCase()).not.toContain('pix');
        expect(whatsappLink('11987654321', msg)).toMatch(/^https:\/\/wa\.me\/5511987654321\?text=/);
        expect(whatsappLink('', msg)).toBeNull();
    });
});

describe('receivedCsv', () => {
    it('usa ; e vírgula decimal, com BOM, escapa e totaliza', () => {
        const items: FinanceCollectItem[] = [
            {
                invoice: inv({ status: 'paid', paid_at: '2026-10-03T15:00:00Z', paid_amount: 140, receipt_method: 'pix', payment_note: 'desconto; pontual' }),
                student_id: 's1',
                student_name: 'Beto "B" Silva',
                days_until_due: 0,
            },
            {
                invoice: inv({ id: '2', status: 'paid', paid_at: '2026-10-04T15:00:00Z', amount: 200 }),
                student_id: 's2',
                student_name: '',
                days_until_due: 0,
            },
        ];
        const csv = receivedCsv(items);
        expect(csv.startsWith('﻿')).toBe(true);
        const lines = csv.slice(1).split('\r\n');
        expect(lines[0].split(';')[0]).toBe('Data do recebimento');
        expect(lines[1]).toContain('"Beto ""B"" Silva"');
        expect(lines[1]).toContain('140,00');
        expect(lines[1]).toContain('"desconto; pontual"');
        expect(lines[2]).toContain('Aluno removido');
        expect(lines[3]).toBe('Total;;;;;340,00;;');
    });
});
