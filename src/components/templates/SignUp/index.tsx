'use client';
import { useTranslations } from 'next-intl';
import React, { FC, useState } from 'react';
import Input from '@/components/molecules/Input';
import Image from 'next/image';
import Link from 'next/link';
import './styles.css';
import { Api } from '@/libs/api';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { signUpSchema, SignUpFormData } from '@/libs/validation/authSchemas';

const TSignUp: FC = () => {
    const t = useTranslations('SignUpPage');
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string>('');
    const [cpfConflict, setCpfConflict] = useState<boolean>(false);
    const [role, setRole] = useState<'personal' | 'student'>('student');
    const [acceptedTerms, setAcceptedTerms] = useState<boolean>(false);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<SignUpFormData>({ resolver: zodResolver(signUpSchema) });

    const submit = async (form: SignUpFormData) => {
        if (!acceptedTerms) {
            setError('É necessário aceitar a Política de Privacidade para continuar.');
            return;
        }
        setLoading(true);
        setError('');
        setCpfConflict(false);
        const payload = {
            name: form.name,
            email: form.email,
            phone: form.phone,
            mobile: form.phone,
            cpf: form.cpf,
            password: form.password,
            role,
        };

        try {
            await Api.post('/users', payload);
            window.location.href = '/';
        } catch (error: unknown) {
            const responseData = (
                error as {
                    response?: { data?: { code?: string; error?: string } };
                }
            )?.response?.data;
            if (responseData?.code === 'cpf_already_registered') {
                setCpfConflict(true);
            }
            setError(
                responseData?.error ||
                    'Não foi possível concluir o cadastro. Tente novamente.',
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login_main_container">
            <div className="login_box">
                <Image
                    src="/assets/images/logo.png"
                    alt="logo"
                    sizes="cover"
                    width={200}
                    height={95}
                />
                <h1>{t('title')}</h1>
                <form
                    onSubmit={handleSubmit(submit)}
                    className="w-100 d-flex flex-column gap-4 my-3"
                >
                    <div>
                        <Input
                            placeholder={t('nameInput')}
                            {...register('name')}
                        />
                        {errors.name && (
                            <small className="text-danger">
                                {errors.name.message}
                            </small>
                        )}
                    </div>
                    <div>
                        <Input
                            placeholder={t('emailInput')}
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
                            placeholder={t('phoneInput')}
                            {...register('phone')}
                        />
                        {errors.phone && (
                            <small className="text-danger">
                                {errors.phone.message}
                            </small>
                        )}
                    </div>
                    <div>
                        <Input
                            placeholder={t('cpfInput')}
                            {...register('cpf')}
                        />
                        {errors.cpf && (
                            <small className="text-danger">
                                {errors.cpf.message}
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
                    <div>
                        <Input
                            placeholder={t('passwordConfirmInput')}
                            type="password"
                            {...register('confirm_password')}
                        />
                        {errors.confirm_password && (
                            <small className="text-danger">
                                {errors.confirm_password.message}
                            </small>
                        )}
                    </div>

                    <div className="d-flex gap-3">
                        <div
                            className={`flex-fill text-center py-3 rounded border ${
                                role === 'student'
                                    ? 'border-warning bg-warning bg-opacity-10 fw-bold'
                                    : 'border-secondary'
                            }`}
                            style={{ cursor: 'pointer' }}
                            onClick={() => setRole('student')}
                        >
                            🏃 Aluno
                        </div>
                        <div
                            className={`flex-fill text-center py-3 rounded border ${
                                role === 'personal'
                                    ? 'border-warning bg-warning bg-opacity-10 fw-bold'
                                    : 'border-secondary'
                            }`}
                            style={{ cursor: 'pointer' }}
                            onClick={() => setRole('personal')}
                        >
                            💪 Personal Trainer
                        </div>
                    </div>
                    <p
                        style={{
                            textAlign: 'center',
                            fontSize: 12,
                            color: '#aaa',
                            margin: 0,
                        }}
                    >
                        Perfil selecionado:{' '}
                        <strong>
                            {role === 'personal'
                                ? '💪 Personal Trainer'
                                : '🏃 Aluno'}
                        </strong>
                    </p>

                    <div className="form-check">
                        <input
                            className="form-check-input"
                            type="checkbox"
                            id="accept-terms"
                            checked={acceptedTerms}
                            onChange={(e) => setAcceptedTerms(e.target.checked)}
                        />
                        <label className="form-check-label" htmlFor="accept-terms" style={{ fontSize: 13 }}>
                            Li e aceito a{' '}
                            <Link href="/politica-privacidade" target="_blank">
                                Política de Privacidade
                            </Link>{' '}
                            e autorizo o tratamento dos meus dados pessoais.
                        </label>
                    </div>

                    {error && (
                        <span className="alert-danger">
                            {error}
                            {cpfConflict && (
                                <>
                                    {' '}
                                    <Link href="/recuperar-cadastro">
                                        Recuperar cadastro
                                    </Link>
                                </>
                            )}
                        </span>
                    )}
                    {loading && (
                        <span className="spinner-border spinner-border-sm"></span>
                    )}
                    <button className="btn btn-gold" disabled={loading || !acceptedTerms}>
                        {t('btn.signup')}
                    </button>
                </form>
                <span>
                    Já tem conta? <Link href={`/`}>fazer o login</Link>
                </span>
            </div>
        </div>
    );
};

export default TSignUp;
