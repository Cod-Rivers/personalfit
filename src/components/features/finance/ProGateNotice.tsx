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
    if (!canEdit) {
        return (
            <div className={s.proBanner} role="status">
                <FiLock aria-hidden="true" />
                <span>
                    <strong>O financeiro faz parte do PRO.</strong> Seu histórico
                    continua aqui para consulta e exportação, mas lançar
                    cobranças, registrar pagamentos, mensalidade automática e os
                    lembretes para os alunos precisam do PRO.{' '}
                    <Link href="/pagamento?produto=pro">Conhecer o PRO</Link>
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
                    o financeiro passa a fazer parte do PRO. Até lá, tudo
                    continua funcionando no seu plano.{' '}
                    <Link href="/pagamento?produto=pro">Conhecer o PRO</Link>
                </span>
            </div>
        );
    }
    return null;
}
