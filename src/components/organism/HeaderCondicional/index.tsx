'use client';
import { usePathname } from 'next/navigation';
import Header from '@/components/organism/Header';

const PUBLIC_PATHS = ['/', '/cadastro', '/esqueceu-senha'];

export default function HeaderCondicional() {
    const pathname = usePathname();

    const isPublic =
        PUBLIC_PATHS.includes(pathname) ||
        pathname.startsWith('/cadastro/') ||
        pathname.startsWith('/redefinir-senha/');

    if (isPublic) return null;

    return <Header />;
}
