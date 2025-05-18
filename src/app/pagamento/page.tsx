"use client";
import React, { ReactNode, useState} from 'react';
import Image from 'next/image';

import './styles.css';
import { CreditCardPayment } from './paymentTypes/CreditCard';
import { PixPayment } from './paymentTypes/pix';
import { EPaymentTypes, TPaymentTypes } from './interface';


const Payment: React.FC = () => {

    const [currentPaymentType, setCurrentPaymentType] = useState<TPaymentTypes>(EPaymentTypes.CreditCard);

    const paymentTypes = {
        CreditCard: <CreditCardPayment />,
        Pix: <PixPayment />
    }

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
                <div className="row g-3 m-3 py-3">
                    <div className="col-12 col-md-6">
                        <div className="d-flex gap-3">
                            <button
                                className={`btn btn-${currentPaymentType != "CreditCard" ? "outline-" : ""}gold w-50`}
                                onClick={() => setCurrentPaymentType(EPaymentTypes.CreditCard)}
                            >
                                <h5>Cartão de Crédito</h5>
                                <div className="d-flex flex-column justify-content-center">
                                     <i className={`fa-solid fa-credit-card ${currentPaymentType != "CreditCard" ? "text-gold" : "text-white"} fa-2x`}></i>
                                </div>
                            </button>
                            <button
                                className={`btn btn-${currentPaymentType != "Pix" ? "outline-" : ""}gold w-50`}
                                onClick={() => setCurrentPaymentType(EPaymentTypes.Pix)}
                            >
                                <h5>Pix</h5>
                                <div className="d-flex flex-column justify-content-center">
                                    <i className={`fa-solid fa-qrcode ${currentPaymentType != "Pix" ? "text-gold" : "text-white"} fa-2x`}></i>
                                </div>
                            </button>
                        </div>
                        {paymentTypes[currentPaymentType]}
                    </div>
                    <div className="col-12 col-md-6 order-first order-md-last">
                        <div className="card">
                            <div className="card-body">
                                <h5 className="card-title">Resumo do Pedido</h5>
                                <p className="card-text">Nome do Produto</p>
                                <p className="card-text">R$ 100,00</p>
                                <p className="card-text">Total: R$ 100,00</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Payment;
