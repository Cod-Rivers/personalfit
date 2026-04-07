import type { Metadata, Viewport } from 'next';
import { getLocale } from 'next-intl/server';
import { NextIntlClientProvider } from 'next-intl';
import 'bootstrap/dist/css/bootstrap.min.css';
import './css/globals.css';
import Footer from '@/components/organism/Footer';

export const viewport: Viewport = {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    themeColor: '#1B3F7A',
};

export const metadata: Metadata = {
    title: 'Personal Fit',
    description: 'Plataforma Team D Bom Fim',
    manifest: '/manifest.json',
    appleWebApp: {
        capable: true,
        statusBarStyle: 'black-translucent',
        title: 'Personal Fit',
    },
};

export default async function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    const locale = await getLocale();
    return (
        <html lang={locale}>
            <body className={`main_back`}>
                <NextIntlClientProvider>
                    <main className="app_content">{children}</main>
                    <Footer />
                </NextIntlClientProvider>

                <script
                    src="https://kit.fontawesome.com/e177edb816.js"
                    crossOrigin="anonymous"
                ></script>
                <script
                    src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"
                    crossOrigin="anonymous"
                ></script>
            </body>
        </html>
    );
}
