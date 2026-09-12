'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Api } from '@/libs/api';

const schema = z.object({
    email: z
        .string()
        .transform((val) => val.trim().toLowerCase())
        .refine((val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val), 'Informe um e-mail válido'),
});

type FormData = z.infer<typeof schema>;

/**
 * Formulário público do pedido de exclusão, para quem não consegue mais entrar
 * no app (desinstalou, perdeu a senha, trocou de telefone).
 *
 * A resposta é sempre a mesma, exista ou não cadastro para o e-mail: a página
 * é pública e não pode virar um oráculo de quem tem conta no Venafit. Quem
 * confirma a exclusão de fato é o link enviado por e-mail.
 */
export default function ExcluirContaForm() {
    const [sent, setSent] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<FormData>({ resolver: zodResolver(schema) });

    const submit = async (form: FormData) => {
        setLoading(true);
        setError('');
        try {
            await Api.post('/account-deletion-request', form);
            setSent(true);
        } catch (err: unknown) {
            const status = (err as { response?: { status?: number } })?.response
                ?.status;
            if (status === 429) {
                setError(
                    'Muitas tentativas seguidas. Espere alguns minutos e tente de novo.',
                );
            } else {
                setError(
                    'Não foi possível enviar seu pedido agora. Tente novamente em alguns instantes.',
                );
            }
        } finally {
            setLoading(false);
        }
    };

    if (sent) {
        return (
            <div className="alert alert-success mb-0">
                <p className="mb-1 fw-semibold">Pedido registrado.</p>
                <p className="mb-0">
                    Se este e-mail possuir cadastro no Venafit, você receberá
                    uma mensagem com um link para confirmar a exclusão. O link
                    vale por 1 hora e só pode ser usado uma vez. Nada é apagado
                    antes de você confirmar.
                </p>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit(submit)} noValidate>
            <label htmlFor="deletion-email" className="form-label">
                E-mail cadastrado
            </label>
            <div className="d-flex flex-wrap gap-2">
                <input
                    id="deletion-email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    className="form-control"
                    style={{ minWidth: 220, flex: '1 1 260px' }}
                    placeholder="voce@exemplo.com"
                    disabled={loading}
                    {...register('email')}
                />
                <button
                    className="btn btn-danger"
                    style={{ flexShrink: 0 }}
                    disabled={loading}
                >
                    {loading ? (
                        <>
                            <span className="spinner-border spinner-border-sm me-2" />
                            Enviando...
                        </>
                    ) : (
                        'Pedir exclusão'
                    )}
                </button>
            </div>
            {errors.email && (
                <small className="text-danger d-block mt-1">
                    {errors.email.message}
                </small>
            )}
            {error && <div className="alert alert-danger py-2 mt-3">{error}</div>}
        </form>
    );
}
