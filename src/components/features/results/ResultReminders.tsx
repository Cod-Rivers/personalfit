'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FiCamera, FiX } from 'react-icons/fi';
import { listEvolutionEntries, type EvolutionEntry } from '@/libs/evolutionService';
import s from './results.module.css';

/**
 * Lembretes do mural de resultados dentro do app (o push sai do backend,
 * ver ResultReminderJob). Sem foto de "antes" não há antes e depois — e o
 * selo de verificado pede as duas fotos enviadas com 4 semanas ou mais de
 * diferença —, então o lembrete mais importante é o da primeira foto.
 */

const DAY = 86_400_000;
const EIGHT_WEEKS = 56 * DAY;
const DISMISS_PREFIX = 'vf_result_reminder_';

function dismissed(key: string): boolean {
    try {
        return window.localStorage.getItem(DISMISS_PREFIX + key) === '1';
    } catch {
        return false;
    }
}

function dismiss(key: string) {
    try {
        window.localStorage.setItem(DISMISS_PREFIX + key, '1');
    } catch {
        /* melhor-esforço */
    }
}

function photoTimes(entries: EvolutionEntry[]): number[] {
    return entries
        .filter((e) => (e.photo_urls?.length ?? 0) > 0)
        .map((e) => Date.parse(e.created_at))
        .filter((t) => !Number.isNaN(t))
        .sort((a, b) => a - b);
}

interface ReminderProps {
    title: string;
    children: React.ReactNode;
    action: React.ReactNode;
    onClose: () => void;
}

function Reminder({ title, children, action, onClose }: ReminderProps) {
    return (
        <div className={s.reminder} role="status">
            <FiCamera className={s.reminderIcon} aria-hidden="true" />
            <div className={s.reminderBody}>
                <p className={s.reminderTitle}>{title}</p>
                <p className={s.muted}>{children}</p>
                <div>{action}</div>
            </div>
            <button type="button" className={s.reminderClose} onClick={onClose} aria-label="Dispensar lembrete">
                <FiX />
            </button>
        </div>
    );
}

/** Lembrete na aba Resultados da Evolução: primeira foto, foto de hoje
 *  depois de 8 semanas. */
export function BeforePhotoReminder({
    entries,
    onTakePhoto,
}: {
    entries: EvolutionEntry[];
    onTakePhoto: () => void;
}) {
    // localStorage só existe no navegador: nada aparece antes de montar.
    const [mounted, setMounted] = useState(false);
    const [, rerender] = useState(0);
    useEffect(() => setMounted(true), []);
    if (!mounted) return null;
    const times = photoTimes(entries);
    const close = (k: string) => {
        dismiss(k);
        rerender((n) => n + 1);
    };

    if (times.length === 0 && !dismissed('first')) {
        return (
            <Reminder
                title="Tire sua foto de antes"
                onClose={() => close('first')}
                action={
                    <button type="button" className={s.btnPrimary} onClick={onTakePhoto}>
                        <FiCamera aria-hidden="true" /> Tirar foto agora
                    </button>
                }
            >
                Registre como você está hoje. Daqui a algumas semanas, o antes e depois mostra o quanto você mudou —
                a foto fica só com você, a não ser que decida publicar.
            </Reminder>
        );
    }
    const last = times[times.length - 1];
    if (times.length > 0 && Date.now() - last >= EIGHT_WEEKS && !dismissed(`today8w-${last}`)) {
        return (
            <Reminder
                title="Já são 8 semanas desde a última foto"
                onClose={() => close(`today8w-${last}`)}
                action={
                    <button type="button" className={s.btnPrimary} onClick={onTakePhoto}>
                        <FiCamera aria-hidden="true" /> Foto de hoje com guia
                    </button>
                }
            >
                Tire a foto de hoje na mesma pose e compare. A foto anterior aparece em transparência para ajudar.
            </Reminder>
        );
    }
    return null;
}

/** Lembrete em "Meus treinos" para quem comprou um programa da loja e ainda
 *  não tirou a foto de antes (até 60 dias depois da compra). */
export function StoreBeforePhotoReminder({
    planId,
    storeProgramId,
    boughtAt,
}: {
    planId: string;
    storeProgramId?: string;
    boughtAt?: string;
}) {
    const [show, setShow] = useState(false);
    const key = `store-${planId}`;

    useEffect(() => {
        let alive = true;
        const bought = boughtAt ? Date.parse(boughtAt) : NaN;
        if (!storeProgramId || Number.isNaN(bought) || Date.now() - bought > 60 * DAY || dismissed(key)) {
            setShow(false);
            return;
        }
        listEvolutionEntries()
            .then((entries) => {
                // Foto até 30 dias antes da compra ainda vale como "antes".
                const has = photoTimes(entries).some((t) => t >= bought - 30 * DAY);
                if (alive) setShow(!has);
            })
            .catch(() => alive && setShow(false));
        return () => {
            alive = false;
        };
    }, [storeProgramId, boughtAt, key]);

    if (!show) return null;
    return (
        <Reminder
            title="📸 Tire sua foto de antes"
            onClose={() => {
                dismiss(key);
                setShow(false);
            }}
            action={
                <Link href="/evolucao?aba=resultados&novo=foto" className={s.btnPrimary}>
                    <FiCamera aria-hidden="true" /> Tirar foto agora
                </Link>
            }
        >
            Você começou um programa novo. Registre como está hoje: no fim, o antes e depois mostra sua evolução e
            ganha o selo de resultado verificado.
        </Reminder>
    );
}
