import type { Metadata } from 'next';
import AjudaClient from './AjudaClient';

export const metadata: Metadata = {
    title: 'Central de Ajuda — Venafit',
};

export default function AjudaPage() {
    return <AjudaClient />;
}
