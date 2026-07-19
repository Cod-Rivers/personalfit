import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { getLocale } from 'next-intl/server';
import { NextIntlClientProvider } from 'next-intl';
import { ThemeProvider } from '@/context/ThemeContext';
import { BrandingProvider } from '@/context/BrandingContext';
import { AdProvider } from '@/context/AdContext';
import Footer from '@/components/organism/Footer';
import HeaderCondicional from '@/components/organism/HeaderCondicional';
import FCMProvider from '@/components/FCMProvider';
import ServiceWorkerRegistrar from '@/components/system/ServiceWorkerRegistrar';
import 'bootstrap/dist/css/bootstrap.min.css';
import './css/globals.css';

const inter = Inter({
    subsets: ['latin'],
    weight: ['400', '500', '600', '700'],
    variable: '--font-inter',
    display: 'swap',
});

export const metadata: Metadata = {
    title: 'Venafit Tela de Login',
};

export default async function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    const locale = await getLocale();
    return (
        <html
            lang={locale}
            data-theme="light"
            className={inter.variable}
            suppressHydrationWarning
        >
            <head>
                {/* Previne flash do tema errado antes da hidratação */}
                <script
                    dangerouslySetInnerHTML={{
                        __html: `(function(){try{var t=localStorage.getItem('theme');if(t)document.documentElement.setAttribute('data-theme',t);}catch(e){}})();`,
                    }}
                />
            </head>
            <body className={`main_back`}>
                <NextIntlClientProvider>
                    <ServiceWorkerRegistrar />
                    <ThemeProvider>
                        <BrandingProvider>
                            <AdProvider>
                                <FCMProvider>
                                    <HeaderCondicional />
                                    <main className="main-content">
                                        {children}
                                    </main>
                                    <Footer />
                                </FCMProvider>
                            </AdProvider>
                        </BrandingProvider>
                    </ThemeProvider>
                </NextIntlClientProvider>
                {/* eslint-disable-next-line @next/next/no-sync-scripts */}
                <script
                    src="https://kit.fontawesome.com/e177edb816.js"
                    crossOrigin="anonymous"
                ></script>
                {/* eslint-disable-next-line @next/next/no-sync-scripts */}
                <script
                    src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"
                    crossOrigin="anonymous"
                ></script>
            </body>
        </html>
    );
}
