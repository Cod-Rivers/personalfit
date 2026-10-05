'use client';
import Link from 'next/link';
import { FiLock, FiClock } from 'react-icons/fi';
import s from './finance.module.css';

interface ProGateNoticeProps {
    canEdit: boolean;
    proGraceUntil?: string;
}

/** Aviso do gate PRO do financeiro. Sem o PRO (e sem carência) a tela fica
 * só de leitura: o histórico continua visível e exportável. Na carência,
 * avisa a data em que o financeiro passa a exigir o PRO. */
export default function ProGateNotice({ canEdit, proGraceUntil }: ProGateNoticeProps) {
    // O destino do link é o PLUS, não o PRO: desde 2026-10-05 o financeiro
    // está incluído no Plus, que é o plano mais barato que resolve o bloqueio
    // desta tela. Mandar para o PRO ofereceria o dobro do preço para
    // destravar o mesmo recurso.
    if (!canEdit) {
        return (
            <div className={s.proBanner} role="status">
                <FiLock aria-hidden="true" />
                <span>
                    <strong>O financeiro faz parte do plano Plus.</strong> Seu
                    histórico continua aqui para consulta e exportação, mas lançar
                    cobranças, registrar pagamentos, mensalidade automática e os
                    lembretes para os alunos precisam do Plus (ou do PRO).{' '}
                    <Link href="/pagamento?produto=personal-plus">Ver os planos</Link>
                </span>
            </div>
        );
    }
    if (proGraceUntil) {
        return (
            <div className={s.proBanner} role="status">
                <FiClock aria-hidden="true" />
                <span>
                    A partir de{' '}
                    <strong>{new Date(proGraceUntil).toLocaleDateString('pt-BR')}</strong>,
                    o financeiro passa a fazer parte dos planos pagos. Até lá, tudo
                    continua funcionando no seu plano.{' '}
                    <Link href="/pagamento?produto=personal-plus">Ver os planos</Link>
                </span>
            </div>
        );
    }
    return null;
}
