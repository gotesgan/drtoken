import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Track Your Token — Dr. Token System",
  description: "Check your queue position",
};

export default function KioskLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <>{children}</>;
}
