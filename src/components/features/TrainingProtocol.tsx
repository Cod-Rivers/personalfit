'use client';

import React from 'react';
import Link from 'next/link';

import { TrainingProtocolProps } from './types';
import TrainingCard from './TrainingCard';
import styles from './TrainingProtocolList.module.css';
import { BsClipboardData } from 'react-icons/bs';

const TrainingProtocol: React.FC<TrainingProtocolProps> = ({
    protocolId,
    protocolNumber,
    trainings,
}) => {
    console.log('TrainingProtocol: Props recebidas', {
        protocolId,
        protocolNumber,
        trainings,
    });

    const handleBackButtonClick = () => {
        window.history.back();
    };

    return (
        <div className={styles.firstDiv}>
            <div className={styles.contentWrapper}>
                <div className={styles.header}>
                    <button
                        onClick={handleBackButtonClick}
                        className={styles.backButton}
                        aria-label="Voltar"
                    >
                        <BsClipboardData size={24} color="#eab308" />
                    </button>
                    <h1 className={styles.title}>
                        Meus treinos do protocolo {protocolNumber}:
                    </h1>
                </div>

                {trainings.length > 0 ? (
                    trainings.map((training) => (
                        <Link
                            href={`/treinamento/${protocolId}/${training.id}`}
                            key={training.id}
                            passHref
                        >
                            <div className={styles.protocolButton}>
                                <TrainingCard
                                    id={training.id}
                                    label={training.label}
                                />
                            </div>
                        </Link>
                    ))
                ) : (
                    <p className={styles.noTrainingsMessage}>
                        Nenhum treino encontrado para este protocolo.
                    </p>
                )}
            </div>
        </div>
    );
};

export default TrainingProtocol;
