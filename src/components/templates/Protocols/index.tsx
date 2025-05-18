"use client";
import Header from '@/components/organism/Header';
import React, { useEffect, useState } from 'react';

import './styles.css';
import Image from 'next/image';
import { IProtocol } from './interface';
import { useRouter } from 'next/navigation';


const TProtocols: React.FC = () => {
    const router = useRouter();
    const [trainings, setTrainings] = useState<IProtocol[]>([]);

    const getTrainings = () => {
        const user = localStorage.getItem("user");
        if (!user) return;

        const { trainings_progress } = JSON.parse(user);
        setTrainings(trainings_progress);
    }

    useEffect(getTrainings, []);
    return (
        <>
            <Header />
            <div className="container py-5">
                <div className="d-flex align-aitems-center gap-3">
                    <Image src="/assets/icons/weight-icon.png" alt="logo" width={60} height={24} style={{
                        marginTop: '12px',
                        marginBottom: '20px',
                    }} />
                    <h1>Meus treinos:</h1>
                </div>
                <div className="row g-4">
                    {trainings.map((protocol) => (
                        <div className="col-12 col-md-6" key={protocol.id} style={{ minHeight: "50px" }} onClick={() => router.push("/app/treino")}>
                            <div className="protocol_card py-4 px-3 bg-white text-black rounded">
                                <div className="card-body w-25 me-4">
                                    <h3 className="card-title">{protocol.reference}</h3>
                                    <p className="card-text h5 fw-normal text-muted text-truncate w-100">
                                    {protocol.exercise_logs.map(exercise => exercise.name).join(", ")}
                                    </p>
                                </div>
                                <div className="card-footer">
                                    <Image src="/assets/icons/chevron-right.png" alt="logo" width={24} height={34} />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </>
    );
};

export default TProtocols;
