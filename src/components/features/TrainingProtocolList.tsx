'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { TrainingProtocolListProps } from './types';
import TrainingCard from './TrainingCard';
import styles from './TrainingProtocolList.module.css';
import { BsClipboardData } from 'react-icons/bs';

const TrainingProtocolList: React.FC<TrainingProtocolListProps> = ({
    protocolId,
    protocolNumber,
    trainings,
}) => {
    const router = useRouter();
    const handleBackButtonClick = () => {
        router.push('/treinamento');
    };

    return (
        <div className="container ml-auto mr-auto sm:p-6 bg-gray-50 min-h-screen relative flex:center">
            <div className="pl-auto pr-auto">
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

export default TrainingProtocolList;
