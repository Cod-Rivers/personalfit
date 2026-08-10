'use client';
import { Api } from '@/libs/api';
import { formatCpfInput } from '@/libs/formatters';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import {
    getRefreshToken,
    getToken,
    getUser,
    landingRouteFor,
    saveSession,
} from '@/libs/session';
import { isValidCpfChecksum } from '@/libs/validation/authSchemas';

// CPF só entra no formulário quando a conta ainda não tem um (ver
// CreateStudentHandler: o personal pode deixar em branco no pré-cadastro) —
// por isso o schema é montado dinamicamente conforme needsCpf.
function buildSchema(needsCpf: boolean) {
    return z
        .object({
            current_password: z.string().min(1, 'Informe a senha temporária'),
            new_password: z.string().min(6, 'Mínimo de 6 caracteres'),
            confirm_password: z.string(),
            cpf: z.string().optional(),
        })
        .refine((d) => d.new_password === d.confirm_password, {
            message: 'As senhas não coincidem',
            path: ['confirm_password'],
        })
        .superRefine((d, ctx) => {
            if (!needsCpf) return;
            const digits = (d.cpf ?? '').replace(/\D/g, '');
            if (!/^\d{11}$/.test(digits)) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: 'CPF deve conter 11 dígitos numéricos',
                    path: ['cpf'],
                });
            } else if (!isValidCpfChecksum(digits)) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: 'CPF inválido',
                    path: ['cpf'],
                });
            }
        });
}

type FormData = {
    current_password: string;
    new_password: string;
    confirm_password: string;
    cpf?: string;
};

export default function TrocarSenhaTemporariaPage() {
    const router = useRouter();

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [needsCpf, setNeedsCpf] = useState(false);

    useEffect(() => {
        if (!getToken()) {
            router.replace('/login');
            return;
        }
        setNeedsCpf(!getUser()?.cpf);
    }, [router]);

    const schema = useMemo(() => buildSchema(needsCpf), [needsCpf]);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<FormData>({ resolver: zodResolver(schema) });

    const submit = async (form: FormData) => {
        setLoading(true);
        setError('');
        const cpfDigits = form.cpf?.replace(/\D/g, '');
        try {
            await Api.post('/change-password', {
                current_password: form.current_password,
                new_password: form.new_password,
                cpf: needsCpf ? cpfDigits : undefined,
            });

            const token = getToken();
            const user = getUser();
            if (token && user) {
                const updatedUser = {
                    ...user,
                    must_change_password: false,
                    cpf: needsCpf ? cpfDigits : user.cpf,
                };
                saveSession(
                    token,
                    updatedUser,
                    getRefreshToken() ?? undefined,
                );
                router.replace(landingRouteFor(updatedUser));
            } else {
                router.replace('/login');
            }
        } catch (err: unknown) {
            const msg =
                (err as { response?: { data?: { error?: string } } })
                    ?.response?.data?.error ??
                'Não foi possível trocar a senha. Confira a senha temporária.';
            setError(msg);
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
                <h4 className="mb-2 fw-semibold">Troque sua senha</h4>
                <p className="text-muted mb-3">
                    Este é seu primeiro acesso. Por segurança, defina uma
                    nova senha para continuar
                    {needsCpf ? ' e complete seu CPF' : ''}.
                </p>

                <form
                    onSubmit={handleSubmit(submit)}
                    className="d-flex flex-column gap-3"
                >
                    <div>
                        <input
                            type="password"
                            className="form-control"
                            placeholder="Senha temporária (recebida por e-mail)"
                            {...register('current_password')}
                        />
                        {errors.current_password && (
                            <small className="text-danger">
                                {errors.current_password.message}
                            </small>
                        )}
                    </div>

                    <div>
                        <input
                            type="password"
                            className="form-control"
                            placeholder="Nova senha"
                            {...register('new_password')}
                        />
                        {errors.new_password && (
                            <small className="text-danger">
                                {errors.new_password.message}
                            </small>
                        )}
                    </div>

                    <div>
                        <input
                            type="password"
                            className="form-control"
                            placeholder="Confirmar nova senha"
                            {...register('confirm_password')}
                        />
                        {errors.confirm_password && (
                            <small className="text-danger">
                                {errors.confirm_password.message}
                            </small>
                        )}
                    </div>

                    {needsCpf && (
                        <div>
                            <input
                                className="form-control"
                                placeholder="CPF"
                                {...register('cpf', {
                                    onChange: (e) => {
                                        e.target.value = formatCpfInput(
                                            e.target.value,
                                        );
                                    },
                                })}
                            />
                            {errors.cpf && (
                                <small className="text-danger">
                                    {errors.cpf.message}
                                </small>
                            )}
                        </div>
                    )}

                    {error && (
                        <div className="alert alert-danger py-2">{error}</div>
                    )}

                    <button
                        className="btn btn-primary w-100"
                        disabled={loading}
                    >
                        {loading ? (
                            <span className="spinner-border spinner-border-sm" />
                        ) : (
                            'Trocar senha e continuar'
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}
