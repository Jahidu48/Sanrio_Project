import type { Metadata, Viewport } from "next";
import { PwaServiceWorker } from "@/components/navigation/PwaServiceWorker";
import { ThemeProvider } from "@/context/ThemeContext";
import { AudioProvider } from "@/context/AudioContext";
import { TouchHeartTrail } from "@/components/fx/TouchHeartTrail";
import { SystemGuardian } from "@/components/system/SystemGuardian";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cinnamelo — Ruang Kecil Kita",
  description:
    "Ruang berdua bertema Sanrio untuk berkirim kabar, detak rindu, surat harian, papan gambar, dan catatan bersama.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Cinnamelo",
  },
  icons: {
    icon: "/icons/icon-192.svg",
    apple: "/icons/icon-192.svg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Fredoka:wght@600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var m=localStorage.getItem('cinnamelo_theme_mode_v1');if(m==='dark'||(!m&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark')}else{document.documentElement.classList.remove('dark')}}catch(e){}})()`,
          }}
        />
      </head>
      <body className="min-h-dvh w-full max-w-full overflow-x-clip antialiased selection:bg-[#FECDD3]/60 selection:text-[#2D232E]">
        <ThemeProvider>
          <AudioProvider>
            <PwaServiceWorker />
            <TouchHeartTrail />
            <SystemGuardian />
            {children}
          </AudioProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
