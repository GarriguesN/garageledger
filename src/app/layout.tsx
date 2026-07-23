import type { Metadata, Viewport } from "next";
import "./globals.css";
import NavBar from "@/components/NavBar";
import TopBar from "@/components/TopBar";
import ThemeProvider from "@/components/ThemeProvider";
import PinGate from "@/components/PinGate";

export const metadata: Metadata = {
  title: "GarageLedger",
  description: "Control de gastos de coche",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "GarageLedger",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#c3423f",
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
      <body className="min-h-dvh flex flex-col">
        <div className="app-container">
          <ThemeProvider>
            <PinGate>
              <TopBar />
              <NavBar />
              <main className="flex-1 max-w-5xl w-full mx-auto px-4 pt-2 pb-[calc(3rem+env(safe-area-inset-bottom))] sm:pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:pt-2">
                {children}
              </main>
            </PinGate>
          </ThemeProvider>
        </div>
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
