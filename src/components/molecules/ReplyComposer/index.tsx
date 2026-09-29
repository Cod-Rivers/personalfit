'use client';

import React, { useState } from 'react';
import { FiSend } from 'react-icons/fi';
import Button from '@/components/atoms/Button';
import styles from './styles.module.css';

interface ReplyComposerProps {
    maxLength: number;
    placeholder: string;
    initialValue?: string;
    busy?: boolean;
    onSubmit: (text: string) => void;
    onCancel?: () => void;
    submitLabel?: string;
}

/** Texto curto com contador e botão de enviar (resposta ao comentário, nota
 * de decisão). */
export default function ReplyComposer({
    maxLength,
    placeholder,
    initialValue = '',
    busy,
    onSubmit,
    onCancel,
    submitLabel = 'Enviar',
}: ReplyComposerProps) {
    const [text, setText] = useState(initialValue);
    const trimmed = text.trim();
    return (
        <form
            className={styles.form}
            onSubmit={(e) => {
                e.preventDefault();
                if (trimmed) onSubmit(trimmed);
            }}
        >
            <textarea
                className={styles.textarea}
                value={text}
                maxLength={maxLength}
                placeholder={placeholder}
                onChange={(e) => setText(e.target.value)}
                disabled={busy}
                rows={3}
            />
            <div className={styles.footer}>
                <span className={styles.counter} aria-live="polite">
                    {text.length}/{maxLength}
                </span>
                <div className={styles.actions}>
                    {onCancel && (
                        <Button variant="ghost" size="sm" onClick={onCancel} disabled={busy}>
                            Cancelar
                        </Button>
                    )}
                    <Button type="submit" size="sm" isLoading={busy} disabled={!trimmed} leftIcon={<FiSend />}>
                        {submitLabel}
                    </Button>
                </div>
            </div>
        </form>
    );
}
