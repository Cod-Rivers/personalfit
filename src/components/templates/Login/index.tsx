'use client';
import { useTranslations } from 'next-intl';
import React, { FC, useEffect, useState } from 'react';
import Input from '@/components/molecules/Input';
import Image from 'next/image';
import Link from 'next/link';
import './styles.css';
import { Api } from '@/libs/api';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, LoginFormData } from '@/libs/validation/authSchemas';
import { saveSession } from '@/libs/session';

const TLogin: FC = () => {
    const t = useTranslations('LoginPage');
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string>('');
    const [info, setInfo] = useState<string>('');

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<LoginFormData>({ resolver: zodResolver(loginSchema) });

    const login = async (form: LoginFormData) => {
        setLoading(true);
        setError('');
        try {
            const { data } = await Api.post('/login', form);
            if (data.error) {
                setError(data.error);
                return;
            }

            if (data.token) {
                if (data.dual_roles) {
                    sessionStorage.setItem(
                        'pending_auth',
                        JSON.stringify(data),
                    );
                    window.location.href = '/selecionar-perfil';
                    return;
                }
                saveSession(data.token, data.user);
                window.location.href =
                    data.user.role === 'admin' ||
                    data.user.role === 'content_editor'
                        ? '/admin'
                        : data.user.role === 'personal'
                          ? '/personal'
                          : '/app';
            }
        } catch {
            setError('Erro ao realizar login');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const params = new URLSearchParams(window.location.search);
        if (params.get('reason') === 'session_expired') {
            setInfo('Sua sessão expirou. Por favor, faça login novamente.');
        }
        if (params.get('reason') === 'password_reset') {
            setInfo(
                'Senha redefinida com sucesso! Faça login com a nova senha.',
            );
        }

        const token = localStorage.getItem('token');
        const stored = localStorage.getItem('user');
        if (token && stored) {
            const parsed = JSON.parse(stored);
            window.location.href =
                parsed.role === 'admin' || parsed.role === 'content_editor'
                    ? '/admin'
                    : parsed.role === 'personal'
                      ? '/personal'
                      : '/app';
        }
    }, []);

    return (
        <div className="login_main_container">
            <div className="login_box">
                <Image
                    src="/assets/images/logo.png"
                    alt="logo"
                    sizes="cover"
                    width={405}
                    height={192}
                />
                <h1>{t('title')}</h1>
                {info && (
                    <p className="w-100 alert alert-warning text-center">
                        ⚠️ {info}
                    </p>
                )}
                <form
                    onSubmit={handleSubmit(login)}
                    className="w-100 d-flex flex-column gap-4 my-3"
                >
                    <div>
                        <Input
                            placeholder={t('usermameInput')}
                            {...register('email')}
                        />
                        {errors.email && (
                            <small className="text-danger">
                                {errors.email.message}
                            </small>
                        )}
                    </div>
                    <div>
                        <Input
                            placeholder={t('passwordInput')}
                            type="password"
                            {...register('password')}
                        />
                        {errors.password && (
                            <small className="text-danger">
                                {errors.password.message}
                            </small>
                        )}
                    </div>
                    <button className="btn btn-gold" disabled={loading}>
                        {t('btn.login')}
                    </button>
                    <div className="w-100 d-flex flex-column align-items-center">
                        {loading && (
                            <span className="spinner-border spinner-border-sm"></span>
                        )}
                        {error && (
                            <p className="w-100 alert alert-danger text-center">
                                {error}
                            </p>
                        )}
                    </div>
                </form>
                <span>
                    Não tem conta? <Link href={`/cadastro`}>cadastre-se</Link>
                </span>
                <span className="mt-2">
                    <Link href="/esqueceu-senha">Esqueceu a senha?</Link>
                </span>
                <span className="mt-2">
                    <Link href="/recuperar-cadastro">
                        Já tem cadastro com esse CPF?
                    </Link>
                </span>
            </div>
        </div>
    );
};

export default TLogin;
