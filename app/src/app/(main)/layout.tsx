"use client";

import { Sidebar } from "@/components/sidebar";
import { TopBar } from "@/components/topbar";
import { SearchProvider } from "@/lib/search-context";
import { ClinicProvider } from "@/lib/clinic-context";
import { SessionProvider } from "@/lib/session-context";

export default function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClinicProvider>
      <SearchProvider>
        <SessionProvider>
          <TopBar />
        <div className="flex flex-1 pt-14">
          <Sidebar />
          <div className="flex-1 flex flex-col min-w-0 md:pl-56 pb-14 md:pb-0">
            <main className="flex-1">{children}</main>
          </div>
        </div>
        </SessionProvider>
      </SearchProvider>
    </ClinicProvider>
  );
}
