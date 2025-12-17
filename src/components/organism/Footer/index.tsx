import React from 'react';
import styles from './Footer.module.css';

export default function Footer() {
    return (
        <footer className={styles.footer}>
            <div className="d-flex flex-column flex-md-row justify-content-center align-items-center gap-3 mb-3"></div>
            <div className="d-flex flex-column flex-md-row justify-content-center align-items-center gap-3">
                <p className={styles.copyright}>
                    © {new Date().getFullYear()} TeamDBOMFIM. Todos os direitos
                    reservados.
                </p>
                <p className={styles.contact}>
                    Reportar bugs / contato:{' '}
                    <a
                        href="mailto:Plataformateamdbomfim@gmail.com"
                        className={styles.link}
                    >
                        Plataformateamdbomfim@gmail.com
                    </a>
                </p>
                <div className={styles.social}>
                    <a
                        href="https://www.instagram.com/teamdbomfim"
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.link}
                        aria-label="Instagram Team DBOMFIM"
                    >
                        <i className="fab fa-instagram" aria-hidden="true"></i>
                        <span className={styles.socialText}>@teamdbomfim</span>
                    </a>
                </div>
            </div>
        </footer>
    );
}
