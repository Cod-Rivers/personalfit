'use client';
import { Api } from '@/libs/api';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

const schema = z.object({
    cpf: z
        .string()
        .transform((val) => val.replace(/\D/g, ''))
        .refine((val) => /^\d{11}$/.test(val), 'CPF deve conter 11 dígitos numéricos'),
});

type FormData = z.infer<typeof schema>;

export default function RecuperarCadastroPage() {
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
            await Api.post('/recover-account', form);
            setSent(true);
        } catch {
            setError('Erro ao enviar. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-vh-100 d-flex justify-content-center align-items-center bg-light">
            <div
                className="card shadow p-4"
                style={{ maxWidth: 420, width: '100%' }}
            >
                <h4 className="mb-3 fw-semibold">Recuperar cadastro</h4>
                <p className="text-muted" style={{ fontSize: 14 }}>
                    Informe o CPF usado no cadastro. Se já existir uma conta
                    com esse CPF, enviaremos um e-mail com um link para
                    redefinir a senha e acessá-la.
                </p>

                {sent ? (
                    <div className="alert alert-success">
                        Se esse CPF possuir cadastro, você receberá um e-mail
                        com instruções para recuperar o acesso em breve.
                    </div>
                ) : (
                    <form
                        onSubmit={handleSubmit(submit)}
                        className="d-flex flex-column gap-3"
                    >
                        <div>
                            <input
                                type="text"
                                className="form-control"
                                placeholder="Seu CPF"
                                {...register('cpf')}
                            />
                            {errors.cpf && (
                                <small className="text-danger">
                                    {errors.cpf.message}
                                </small>
                            )}
                        </div>

                        {error && (
                            <div className="alert alert-danger py-2">
                                {error}
                            </div>
                        )}

                        <button
                            className="btn btn-primary w-100"
                            disabled={loading}
                        >
                            {loading ? (
                                <span className="spinner-border spinner-border-sm" />
                            ) : (
                                'Enviar link de recuperação'
                            )}
                        </button>
                    </form>
                )}

                <div className="mt-3 text-center">
                    <Link href="/">Voltar ao login</Link>
                </div>
            </div>
        </div>
    );
}
