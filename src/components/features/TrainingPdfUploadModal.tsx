'use client';

import { useRef, useState } from 'react';
import axios from 'axios';
import { FiFileText, FiUploadCloud } from 'react-icons/fi';
import Modal from '@/components/system/Modal';
import {
    uploadTrainingPdf,
    createTrainingPdfImport,
    retryTrainingPdfImport,
    MAX_TRAINING_PDF_IMPORT_MB,
    type TrainingPdfImport,
} from '@/libs/trainingPdfImportService';
import TrainingPdfReviewScreen from './TrainingPdfReviewScreen';
import styles from './TrainingPdfUploadModal.module.css';

type Step = 'select' | 'uploading' | 'extracting' | 'review' | 'error';

interface Props {
    open: boolean;
    onClose: () => void;
    role: 'personal' | 'student';
    /** Presente = importação para um aluno vinculado (view do personal);
     * ausente = auto-importação do próprio aluno logado. */
    studentId?: string;
    studentName?: string;
    onApplied: (result: { macrocycleId: string }) => void;
}

export default function TrainingPdfUploadModal({
    open,
    onClose,
    role,
    studentId,
    studentName,
    onApplied,
}: Props) {
    const [step, setStep] = useState<Step>('select');
    const [file, setFile] = useState<File | null>(null);
    const [error, setError] = useState('');
    const [importData, setImportData] = useState<TrainingPdfImport | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    function reset() {
        setStep('select');
        setFile(null);
        setError('');
        setImportData(null);
    }

    function handleClose() {
        reset();
        onClose();
    }

    function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const f = e.target.files?.[0] ?? null;
        setError('');
        if (!f) {
            setFile(null);
            return;
        }
        if (f.type !== 'application/pdf' && !f.name.toLowerCase().endsWith('.pdf')) {
            setError('Apenas arquivos PDF são aceitos.');
            setFile(null);
            return;
        }
        if (f.size > MAX_TRAINING_PDF_IMPORT_MB * 1024 * 1024) {
            setError(`O arquivo excede o limite de ${MAX_TRAINING_PDF_IMPORT_MB}MB.`);
            setFile(null);
            return;
        }
        setFile(f);
    }

    async function handleUpload() {
        if (!file) return;
        setError('');
        setStep('uploading');
        try {
            const { pdf_key, file_name } = await uploadTrainingPdf(file, studentId);
            setStep('extracting');
            const created = await createTrainingPdfImport(pdf_key, file_name, studentId);
            setImportData(created);
            setStep(created.status === 'failed' ? 'error' : 'review');
            if (created.status === 'failed') {
                setError(created.error_message || 'Não foi possível extrair o treino do PDF.');
            }
        } catch (e) {
            if (axios.isAxiosError(e) && e.response?.status === 403) {
                const code = e.response.data?.code;
                if (code === 'training_pdf_import_limit_reached') {
                    setError(
                        'Limite mensal de importação de treino via PDF atingido. Tente novamente no próximo mês.',
                    );
                } else {
                    setError(e.response.data?.error || 'Acesso negado.');
                }
            } else {
                setError((e as Error).message ?? 'Erro ao enviar o PDF.');
            }
            setStep('select');
        }
    }

    async function handleRetry() {
        if (!importData) return;
        setError('');
        setStep('extracting');
        try {
            const updated = await retryTrainingPdfImport(importData.id, studentId);
            setImportData(updated);
            setStep(updated.status === 'failed' ? 'error' : 'review');
            if (updated.status === 'failed') {
                setError(updated.error_message || 'Não foi possível extrair o treino do PDF.');
            }
        } catch (e) {
            setError((e as Error).message ?? 'Erro ao tentar novamente.');
            setStep('error');
        }
    }

    return (
        <Modal
            open={open}
            onClose={handleClose}
            title={
                studentName
                    ? `Importar treino de PDF — ${studentName}`
                    : 'Importar treino de PDF'
            }
            closeOnBackdrop={step === 'select'}
        >
            {step === 'select' && (
                <div className={styles.selectStep}>
                    <p className={styles.helpText}>
                        Envie uma foto de caderno, planilha ou PDF de um plano de
                        treino de outra academia. A IA extrai os exercícios
                        automaticamente — você revisa e corrige antes de aplicar.
                        Limite de 1 importação por mês.
                    </p>

                    <button
                        type="button"
                        className={styles.dropZone}
                        onClick={() => inputRef.current?.click()}
                    >
                        <FiUploadCloud size={28} />
                        <span>
                            {file ? (
                                <>
                                    <FiFileText /> {file.name}
                                </>
                            ) : (
                                'Toque para escolher o arquivo PDF'
                            )}
                        </span>
                    </button>
                    <input
                        ref={inputRef}
                        type="file"
                        accept="application/pdf,.pdf"
                        onChange={handleFileChange}
                        className={styles.hiddenInput}
                    />

                    {error && <div className={styles.errorBox}>{error}</div>}

                    <div className={styles.footerActions}>
                        <button type="button" onClick={handleClose} className={styles.btnCancel}>
                            Cancelar
                        </button>
                        <button
                            type="button"
                            onClick={handleUpload}
                            disabled={!file}
                            className={styles.btnSubmit}
                        >
                            Enviar e extrair
                        </button>
                    </div>
                </div>
            )}

            {(step === 'uploading' || step === 'extracting') && (
                <div className={styles.loadingStep}>
                    <div className={styles.spinner} />
                    <p>
                        {step === 'uploading'
                            ? 'Enviando o arquivo...'
                            : 'Analisando o treino com IA — pode levar até 45s...'}
                    </p>
                </div>
            )}

            {step === 'error' && (
                <div className={styles.selectStep}>
                    <div className={styles.errorBox}>
                        {error || 'Não foi possível extrair o treino do PDF.'}
                    </div>
                    <div className={styles.footerActions}>
                        <button type="button" onClick={handleClose} className={styles.btnCancel}>
                            Fechar
                        </button>
                        <button type="button" onClick={handleRetry} className={styles.btnSubmit}>
                            Tentar novamente
                        </button>
                    </div>
                </div>
            )}

            {step === 'review' && importData && (
                <TrainingPdfReviewScreen
                    data={importData}
                    role={role}
                    studentId={studentId}
                    onCancel={handleClose}
                    onApplied={(result) => {
                        reset();
                        onApplied(result);
                    }}
                />
            )}
        </Modal>
    );
}
