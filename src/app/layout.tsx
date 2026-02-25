import './globals.css';
import { ClerkProvider } from '@clerk/nextjs';
import { dark } from '@clerk/themes';

export const metadata = {
    title: 'BetterYou Focus',
    description:
        'Sistema de alto rendimiento personal: focus, tareas, métricas.',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <ClerkProvider>
            <html lang="es">
                <body>{children}</body>
            </html>
        </ClerkProvider>
    );
}
