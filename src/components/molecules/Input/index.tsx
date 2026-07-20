import React, { forwardRef, useState } from 'react';
import { FiEye, FiEyeOff } from 'react-icons/fi';
import { IInputProps } from './types';
import styles from './styles.module.css';

const Input = forwardRef<HTMLInputElement, IInputProps>((props, ref) => {
    const [visible, setVisible] = useState(false);
    const { type, ...rest } = props;

    if (type !== 'password') {
        return (
            <input
                {...props}
                ref={ref}
                className="form-control form-control-lg input-form"
            />
        );
    }

    return (
        <div className={styles.passwordWrapper}>
            <input
                {...rest}
                ref={ref}
                type={visible ? 'text' : 'password'}
                className="form-control form-control-lg input-form"
            />
            <button
                type="button"
                className={styles.toggleButton}
                onClick={() => setVisible((v) => !v)}
                aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}
                tabIndex={-1}
            >
                {visible ? <FiEyeOff /> : <FiEye />}
            </button>
        </div>
    );
});

Input.displayName = 'Input';

export default Input;
