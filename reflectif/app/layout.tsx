import type { Metadata, Viewport } from "next";
import { ClientLayout } from "@/components/ClientLayout";
import { DbHandlers } from "@/lib/db/handlers";
import { auth0 } from "@/lib/auth0";
import "./globals.css";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Reflectif | Emotional Intelligence AI",
  description: "A passive emotional intelligence layer for your conversations.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth0.getSession();
  const userId = session!.user.sub;
  const db = DbHandlers.getInstance();
  const conversations = db.listConversationAnalyses(userId);

  return (
    <html lang="en" className="dark">
      <body className={cn("min-h-screen bg-background font-sans antialiased text-foreground selection:bg-violet-500/30")}>
        <ClientLayout conversations={conversations}>
          {children}
        </ClientLayout>
      </body>
    </html>
  );
}
