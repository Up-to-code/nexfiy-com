import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Lora } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

import { ThemeProvider } from "@/components/providers/theme-provider";
import { ConvexClientProvider } from "@/components/providers/convex-provider";
import { ToasterProvider } from "@/components/providers/toaster-provider";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const lora = Lora({ subsets: ["latin"], variable: "--font-lora" });
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.nexfiy.com"),
  title: {
    default: "Nexfiy — The connected workspace",
    template: "%s | Nexfiy",
  },
  description:
    "Write, structure, connect, and publish knowledge from one calm workspace built for people, APIs, and MCP tools.",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "Nexfiy",
    title: "Nexfiy — The connected workspace",
    description:
      "Pages, databases, APIs, and MCP tools in one calm connected workspace.",
    url: "/",
    images: [
      {
        url: "/social/opengraph.png",
        width: 1200,
        height: 630,
        alt: "Nexfiy connected workspace",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Nexfiy — The connected workspace",
    description:
      "Pages, databases, APIs, and MCP tools in one calm connected workspace.",
    images: ["/social/twitter-banner.png"],
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon-32.png", type: "image/png", sizes: "32x32" },
      { url: "/icon-192.png", type: "image/png", sizes: "192x192" },
      { url: "/icon-512.png", type: "image/png", sizes: "512x512" },
      {
        media: "(prefers-color-scheme: light)",
        url: "/logo.svg",
        href: "/logo.svg",
      },
      {
        media: "(prefers-color-scheme: dark)",
        url: "/logo-dark.svg",
        href: "/logo-dark.svg",
      },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  manifest: "/site.webmanifest",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className={`${inter.className} ${inter.variable} ${lora.variable} ${jetbrainsMono.variable}`}
      >
        <ConvexClientProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
            storageKey="nexfiy-theme-2"
          >
            <ToasterProvider />
            {children}
            <Analytics />
          </ThemeProvider>
        </ConvexClientProvider>
      </body>
    </html>
  );
}
