import type { Metadata } from "next";
import { Sidebar } from "@/components/Sidebar";
import { DbHandlers } from "@/lib/db/handlers";
import "./globals.css";
import { cn } from "@/lib/utils";

const USER_ID = "usr_123";

export const metadata: Metadata = {
  title: "Reflectif | Emotional Intelligence AI",
  description: "A passive emotional intelligence layer for your conversations.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const db = DbHandlers.getInstance();
  const conversations = db.listConversationAnalyses(USER_ID);

  return (
    <html lang="en" className="dark">
      <body className={cn("min-h-screen bg-background font-sans antialiased text-foreground selection:bg-violet-500/30")}>
        <div className="flex min-h-screen">
          <Sidebar conversations={conversations} />
          <main className="flex-1 pl-64 transition-all duration-300 relative z-0">
            {/* Background ambient light effects */}
            <div className="fixed top-0 right-0 w-full h-[500px] bg-violet-500/10 blur-[120px] pointer-events-none rounded-full translate-x-1/2 -translate-y-1/2" />
            <div className="relative z-10 p-8 min-h-screen">
              {children}
            </div>
          </main>
        </div>
      </body>
    </html>
  );
}
