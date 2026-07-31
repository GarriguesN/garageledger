import type { Metadata, Viewport } from "next";
import "./globals.css";
import PinGate from "@/components/PinGate";
import { colors } from "@/design/tokens";

// El layout raíz ya no monta cabecera ni navbar: cada pantalla compone su
// propio <AppLayout> con la cabecera y la barra inferior que le tocan según
// el mockup (el garaje no tiene barra; el detalle del vehículo sí). Así se
// acabó el truco de añadir clases al <main> desde el navbar para cuadrar el
// padding inferior.

export const metadata: Metadata = {
  title: "GarageLedger",
  description: "Control de gastos de coche",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "GarageLedger",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: colors.background,
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/icons/favicon-32.png" sizes="32x32" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-180.png" />
      </head>
      <body className="min-h-dvh bg-background text-text antialiased">
        <PinGate>{children}</PinGate>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js');
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
