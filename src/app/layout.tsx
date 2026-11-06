import type { Metadata, Viewport } from "next";
import { PwaServiceWorker } from "@/components/navigation/PwaServiceWorker";
import { ThemeProvider } from "@/context/ThemeContext";
import { AudioProvider } from "@/context/AudioContext";
import { TouchHeartTrail } from "@/components/fx/TouchHeartTrail";
import { SystemGuardian } from "@/components/system/SystemGuardian";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cinnamelo — Ruang Kecil Kita ☁️🎀",
  description:
    "Minimalist Romantic Sanrio PWA untuk pasangan — Heartbeat Ripple, Secret Daily Prompts, Co-op Whiteboard, Realtime Chat & Panggilan, dan AI Memory Journal.",
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
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var m=localStorage.getItem('cinnamelo_theme_mode_v1');if(m==='dark'||(!m&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark')}else{document.documentElement.classList.remove('dark')}}catch(e){}})()`,
          }}
        />
      </head>
      <body className="min-h-dvh w-full max-w-full overflow-x-clip overflow-y-auto antialiased selection:bg-[#FECDD3]/60 selection:text-[#1E293B]">
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
