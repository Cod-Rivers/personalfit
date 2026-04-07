'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

const MOCK_USER = {
    id: 'demo-user',
    name: 'Demo Atleta',
    trainings_progress: [
        {
            id: 'tp-A',
            user_id: 'demo-user',
            training_id: 'training-A',
            reference: 'A - Peito e Tríceps',
            exercise_logs: [
                {
                    id: 'ex-A1',
                    name: 'Supino Reto com Barra',
                    series: [10, 10, 8],
                    variations: 'Supino Inclinado com Halteres',
                    video_url: '',
                    video_thumb: '',
                    timed: false,
                    weight: 60,
                    restTime: 90,
                    notes: 'Manter a escápula retraída durante o movimento',
                },
                {
                    id: 'ex-A2',
                    name: 'Crucifixo na Polia',
                    series: [12, 12, 12],
                    variations: 'Crucifixo com Halteres',
                    video_url: '',
                    video_thumb: '',
                    timed: false,
                    weight: 20,
                    restTime: 60,
                },
                {
                    id: 'ex-A3',
                    name: 'Tríceps Corda',
                    series: [15, 12, 12],
                    variations: 'Tríceps Francês',
                    video_url: '',
                    video_thumb: '',
                    timed: false,
                    weight: 25,
                    restTime: 60,
                },
                {
                    id: 'ex-A4',
                    name: 'Mergulho em Paralelas',
                    series: [10, 10, 10],
                    variations: 'Banco para Tríceps',
                    video_url: '',
                    video_thumb: '',
                    timed: false,
                    weight: 0,
                    restTime: 60,
                },
            ],
        },
        {
            id: 'tp-B',
            user_id: 'demo-user',
            training_id: 'training-B',
            reference: 'B - Costas e Bíceps',
            exercise_logs: [
                {
                    id: 'ex-B1',
                    name: 'Puxada Frontal',
                    series: [10, 10, 8],
                    variations: 'Puxada Fechada',
                    video_url: '',
                    video_thumb: '',
                    timed: false,
                    weight: 55,
                    restTime: 90,
                },
                {
                    id: 'ex-B2',
                    name: 'Remada Curvada com Barra',
                    series: [10, 10, 10],
                    variations: 'Remada Unilateral com Haltere',
                    video_url: '',
                    video_thumb: '',
                    timed: false,
                    weight: 50,
                    restTime: 90,
                },
                {
                    id: 'ex-B3',
                    name: 'Rosca Direta com Barra',
                    series: [12, 10, 10],
                    variations: 'Rosca Alternada',
                    video_url: '',
                    video_thumb: '',
                    timed: false,
                    weight: 30,
                    restTime: 60,
                },
                {
                    id: 'ex-B4',
                    name: 'Rosca Martelo',
                    series: [12, 12, 12],
                    variations: 'Rosca Concentrada',
                    video_url: '',
                    video_thumb: '',
                    timed: false,
                    weight: 14,
                    restTime: 60,
                },
            ],
        },
        {
            id: 'tp-C',
            user_id: 'demo-user',
            training_id: 'training-C',
            reference: 'C - Pernas',
            exercise_logs: [
                {
                    id: 'ex-C1',
                    name: 'Agachamento Livre',
                    series: [10, 10, 8],
                    variations: 'Leg Press 45°',
                    video_url: '',
                    video_thumb: '',
                    timed: false,
                    weight: 80,
                    restTime: 120,
                    notes: 'Joelhos alinhados com os pés',
                },
                {
                    id: 'ex-C2',
                    name: 'Leg Press 45°',
                    series: [12, 12, 10],
                    variations: 'Leg Press Horizontal',
                    video_url: '',
                    video_thumb: '',
                    timed: false,
                    weight: 100,
                    restTime: 90,
                },
                {
                    id: 'ex-C3',
                    name: 'Cadeira Extensora',
                    series: [15, 15, 12],
                    variations: 'Agachamento Bulgaro',
                    video_url: '',
                    video_thumb: '',
                    timed: false,
                    weight: 40,
                    restTime: 60,
                },
                {
                    id: 'ex-C4',
                    name: 'Mesa Flexora',
                    series: [12, 12, 12],
                    variations: 'Cadeira Flexora',
                    video_url: '',
                    video_thumb: '',
                    timed: false,
                    weight: 35,
                    restTime: 60,
                },
                {
                    id: 'ex-C5',
                    name: 'Panturrilha em Pé',
                    series: [20, 20, 20],
                    variations: 'Panturrilha Sentada',
                    video_url: '',
                    video_thumb: '',
                    timed: false,
                    weight: 60,
                    restTime: 45,
                },
            ],
        },
        {
            id: 'tp-D',
            user_id: 'demo-user',
            training_id: 'training-D',
            reference: 'D - Ombros e Abdômen',
            exercise_logs: [
                {
                    id: 'ex-D1',
                    name: 'Desenvolvimento com Halteres',
                    series: [10, 10, 10],
                    variations: 'Desenvolvimento Arnold',
                    video_url: '',
                    video_thumb: '',
                    timed: false,
                    weight: 22,
                    restTime: 90,
                },
                {
                    id: 'ex-D2',
                    name: 'Elevação Lateral',
                    series: [15, 12, 12],
                    variations: 'Elevação Lateral na Polia',
                    video_url: '',
                    video_thumb: '',
                    timed: false,
                    weight: 10,
                    restTime: 60,
                },
                {
                    id: 'ex-D3',
                    name: 'Prancha Abdominal',
                    series: [45, 45, 45],
                    variations: 'Prancha Lateral',
                    video_url: '',
                    video_thumb: '',
                    timed: true,
                    weight: 0,
                    restTime: 60,
                    notes: 'Séries em segundos',
                },
                {
                    id: 'ex-D4',
                    name: 'Abdominal Crunch',
                    series: [20, 20, 20],
                    variations: 'Abdominal na Polia',
                    video_url: '',
                    video_thumb: '',
                    timed: false,
                    weight: 0,
                    restTime: 45,
                },
            ],
        },
    ],
};

export default function DemoPage() {
    const router = useRouter();

    useEffect(() => {
        localStorage.setItem('user', JSON.stringify(MOCK_USER));
        localStorage.setItem('token', 'demo-token');
        router.push('/app');
    }, [router]);

    return (
        <div
            style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '100vh',
                background: '#1B3F7A',
                color: '#fff',
                fontFamily: 'sans-serif',
            }}
        >
            <div style={{ fontSize: 32, marginBottom: 12 }}>⚡</div>
            <p style={{ fontSize: 18, margin: 0 }}>Carregando área de treino…</p>
        </div>
    );
}
