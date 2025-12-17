"use client";
import React from 'react';
import Image from 'next/image';

import './styles.css';
import { CreditCardPayment } from './paymentTypes/CreditCard';


const Payment: React.FC = () => {

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
                                <h5 className="card-title">Resumo do Pedido</h5>
                                <p className="card-text">Nome do Produto</p>
                                <p className="card-text">R$ 100,00</p>
                                <p className="card-text">Total: R$ 100,00</p>
                            </div>
                        </div>
                    </div>
                    <div className="col-12">
                        <CreditCardPayment />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Payment;
