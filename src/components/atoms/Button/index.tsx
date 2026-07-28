import React, { forwardRef } from 'react';
import styles from './Button.module.css';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'warning' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

const FILLED_VARIANTS: ButtonVariant[] = ['primary', 'danger', 'warning'];

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
    size?: ButtonSize;
    fullWidth?: boolean;
    isLoading?: boolean;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    (
        {
            variant = 'primary',
            size = 'md',
            fullWidth = false,
            isLoading = false,
            leftIcon,
            rightIcon,
            disabled,
            type = 'button',
            className,
            children,
            ...rest
        },
        ref,
    ) => {
        const classes = [
            styles.button,
            styles[variant],
            styles[size],
            FILLED_VARIANTS.includes(variant) && styles.filled,
            fullWidth && styles.fullWidth,
            className,
        ]
            .filter(Boolean)
            .join(' ');

        return (
            <button
                {...rest}
                ref={ref}
                type={type}
                className={classes}
                disabled={disabled || isLoading}
                aria-busy={isLoading || undefined}
            >
                <span className={isLoading ? `${styles.content} ${styles.contentHidden}` : styles.content}>
                    {leftIcon}
                    {children}
                    {rightIcon}
                </span>
                {isLoading && (
                    <span className={styles.spinnerWrap} aria-hidden="true">
                        <span className={styles.spinner} />
                    </span>
                )}
            </button>
        );
    },
);

Button.displayName = 'Button';

export default Button;
