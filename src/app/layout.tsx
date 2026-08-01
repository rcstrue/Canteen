import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { Providers } from "@/components/providers";
import { ServiceWorkerRegistration } from "@/components/sw-registration";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "RCS Canteen – Stock & Cost Management",
  description:
    "Internal canteen management system for Dahej industrial contract — ingredient inventory, cost tracking, and budget management for ~600 employees.",
  keywords: [
    "RCS Canteen",
    "Stock Management",
    "Cost Management",
    "Dahej",
    "Canteen",
    "Inventory",
    "Budget",
  ],
  authors: [{ name: "RCS Canteen Team" }],
  manifest: "/manifest.json",
  applicationName: "RCS Canteen",
  appleWebApp: {
    capable: true,
    title: "RCS Canteen",
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.svg", sizes: "any", type: "image/svg+xml" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    shortcut: ["/favicon-32.png"],
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ea580c" },
    { media: "(prefers-color-scheme: dark)", color: "#1c1917" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <Providers>
          {children}
          <Toaster />
          <SonnerToaster position="top-right" richColors closeButton />
          <ServiceWorkerRegistration />
        </Providers>
      </body>
    </html>
  );
}
