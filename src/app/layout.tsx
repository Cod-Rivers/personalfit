import type { Metadata } from "next";
import { getLocale } from "next-intl/server";
import { NextIntlClientProvider } from "next-intl";
import 'bootstrap/dist/css/bootstrap.min.css'
import "./css/globals.css";

export const metadata: Metadata = {
  title: "Personal Fit Tela de Login"
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
            {children}
        </NextIntlClientProvider>
        <script src="https://kit.fontawesome.com/e177edb816.js" crossOrigin="anonymous"></script>
      <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js" crossOrigin="anonymous"></script>
      </body>
    </html>
  );
}
