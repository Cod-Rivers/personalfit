'use client';
import React from 'react';
import Image from 'next/image';

import './styles.css';
import { CreditCardPayment } from './paymentTypes/CreditCard';
import { PixPayment } from './paymentTypes/pix';

type PlanType = 'BIMONTHLY' | 'SEMIANNUALLY';

const Payment: React.FC = () => {
    const [selectedPlan, setSelectedPlan] =
        React.useState<PlanType>('BIMONTHLY');
    const plans = {
        BIMONTHLY: {
            name: 'Plano Bimestral',
            value: 79.9,
            cycle: 'BIMONTHLY' as const,
            description: 'Cobrança a cada 2 meses',
        },
        SEMIANNUALLY: {
            name: 'Plano Semestral',
            value: 209.9,
            cycle: 'SEMIANNUALLY' as const,
            description: 'Cobrança a cada 6 meses',
        },
    };

    return (
        <div className="container-box">
            <div className="main_box">
                <header className="m-3 d-flex align-items-center gap-4">
                    <Image
                        src="/assets/images/logo.png"
                        alt="logo"
                        sizes="cover"
                        width={150}
                        height={70}
                    />
                    <h1 className="h3 mt-2">Pagamento</h1>
                </header>
                <div className="col g-3 m-3 py-3">
                    <div className="col-12">
                        <div className="card">
                            <div className="card-body">
                                <h5 className="card-title mb-3">
                                    Escolha seu Plano
                                </h5>

                                {/* Seletor de Planos */}
                                <div className="row g-3 mb-4">
                                    <div className="col-12 col-md-6">
                                        <div
                                            className={`card h-100 cursor-pointer ${selectedPlan === 'BIMONTHLY' ? 'border-primary border-3' : ''}`}
                                            onClick={() =>
                                                setSelectedPlan('BIMONTHLY')
                                            }
                                            style={{ cursor: 'pointer' }}
                                        >
                                            <div className="card-body text-center">
                                                <input
                                                    type="radio"
                                                    name="plan"
                                                    checked={
                                                        selectedPlan ===
                                                        'BIMONTHLY'
                                                    }
                                                    onChange={() =>
                                                        setSelectedPlan(
                                                            'BIMONTHLY',
                                                        )
                                                    }
                                                    className="form-check-input me-2"
                                                />
                                                <h6 className="card-title">
                                                    Plano Bimestral
                                                </h6>
                                                <p className="h4 text-primary mb-2">
                                                    R$ 79,90
                                                </p>
                                                <p className="text-muted small mb-0">
                                                    A cada 2 meses
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="col-12 col-md-6">
                                        <div
                                            className={`card h-100 cursor-pointer ${selectedPlan === 'SEMIANNUALLY' ? 'border-primary border-3' : ''}`}
                                            onClick={() =>
                                                setSelectedPlan('SEMIANNUALLY')
                                            }
                                            style={{ cursor: 'pointer' }}
                                        >
                                            <div className="card-body text-center">
                                                <input
                                                    type="radio"
                                                    name="plan"
                                                    checked={
                                                        selectedPlan ===
                                                        'SEMIANNUALLY'
                                                    }
                                                    onChange={() =>
                                                        setSelectedPlan(
                                                            'SEMIANNUALLY',
                                                        )
                                                    }
                                                    className="form-check-input me-2"
                                                />
                                                <h6 className="card-title">
                                                    Plano Semestral
                                                </h6>
                                                <p className="h4 text-success mb-2">
                                                    R$ 209,90
                                                </p>
                                                <p className="text-muted small mb-1">
                                                    A cada 6 meses
                                                </p>
                                                <span className="badge bg-success">
                                                    Economia de 12%
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Resumo */}
                                <div className="border-top pt-3">
                                    <h6>Resumo do Pedido</h6>
                                    <div className="d-flex justify-content-between">
                                        <span>{plans[selectedPlan].name}</span>
                                        <strong>
                                            R${' '}
                                            {plans[selectedPlan].value.toFixed(
                                                2,
                                            )}
                                        </strong>
                                    </div>
                                    <div className="d-flex justify-content-between text-muted small">
                                        <span>
                                            {plans[selectedPlan].description}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="col-12">
                        <CreditCardPayment
                            planValue={plans[selectedPlan].value}
                            planCycle={plans[selectedPlan].cycle}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Payment;
