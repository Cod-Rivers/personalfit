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
    const [role, setRole] = useState<'personal' | 'student'>('student');

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<SignUpFormData>({ resolver: zodResolver(signUpSchema) });

    const submit = async (form: SignUpFormData) => {
        setLoading(true);
        setError('');
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
            const { data } = await Api.post('/users', payload);

            if (data.error) {
                setError(data.error);
                return;
            }

            window.location.href = '/';
        } catch (error) {
            console.error(error);
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

                    <span className="alert-danger">{error}</span>
                    {loading && (
                        <span className="spinner-border spinner-border-sm"></span>
                    )}
                    <button className="btn btn-gold" disabled={loading}>
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
