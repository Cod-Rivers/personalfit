import { describe, expect, it } from 'vitest';
import { loginSchema, signUpSchema } from './authSchemas';

describe('loginSchema', () => {
    it('accepts a valid email/password pair', () => {
        const result = loginSchema.safeParse({
            email: 'aluno@venafit.com',
            password: '123456',
        });
        expect(result.success).toBe(true);
    });

    it('rejects an invalid email', () => {
        const result = loginSchema.safeParse({
            email: 'not-an-email',
            password: '123456',
        });
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error.issues[0].message).toBe('E-mail inválido');
        }
    });

    it('exige que a senha seja informada, mas não aplica política de complexidade no login', () => {
        // A política de complexidade é do cadastro; no login validamos apenas
        // presença para não bloquear senhas antigas. Uma senha curta é aceita.
        const short = loginSchema.safeParse({
            email: 'aluno@venafit.com',
            password: '123',
        });
        expect(short.success).toBe(true);

        const empty = loginSchema.safeParse({
            email: 'aluno@venafit.com',
            password: '',
        });
        expect(empty.success).toBe(false);
    });
});

describe('signUpSchema', () => {
    const validPayload = {
        name: 'Maria Silva',
        email: 'maria@venafit.com',
        phone: '11987654321',
        cpf: '12345678901',
        password: 'senha1234',
        confirm_password: 'senha1234',
    };

    it('accepts a fully valid signup payload', () => {
        const result = signUpSchema.safeParse(validPayload);
        expect(result.success).toBe(true);
    });

    it('rejects a name shorter than 2 characters', () => {
        const result = signUpSchema.safeParse({ ...validPayload, name: 'M' });
        expect(result.success).toBe(false);
    });

    it('accepts a CPF formatted with dots and dash, normalizing it to digits only', () => {
        const result = signUpSchema.safeParse({
            ...validPayload,
            cpf: '123.456.789-01',
        });
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.cpf).toBe('12345678901');
        }
    });

    it('accepts a CPF with stray spaces, normalizing it to digits only', () => {
        const result = signUpSchema.safeParse({
            ...validPayload,
            cpf: '123 456 789 01',
        });
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.cpf).toBe('12345678901');
        }
    });

    it('rejects a CPF that is not exactly 11 digits', () => {
        const tooShort = signUpSchema.safeParse({
            ...validPayload,
            cpf: '123456789',
        });
        expect(tooShort.success).toBe(false);
    });

    it('rejects a password shorter than 8 characters', () => {
        const result = signUpSchema.safeParse({
            ...validPayload,
            password: 'short1',
            confirm_password: 'short1',
        });
        expect(result.success).toBe(false);
    });

    it('rejects mismatched password confirmation and flags the confirm field', () => {
        const result = signUpSchema.safeParse({
            ...validPayload,
            confirm_password: 'differentPass1',
        });
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error.issues[0].path).toEqual([
                'confirm_password',
            ]);
            expect(result.error.issues[0].message).toBe(
                'As senhas não coincidem',
            );
        }
    });

    it('rejects a phone number shorter than 10 digits', () => {
        const result = signUpSchema.safeParse({
            ...validPayload,
            phone: '123456789',
        });
        expect(result.success).toBe(false);
    });
});
