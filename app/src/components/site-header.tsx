"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  href: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Staff", href: "/" },
  { label: "Track", href: "/track" },
  { label: "Display", href: "/device" },
  { label: "History", href: "/history" },
];

function NavLink({
  item,
  isActive,
  onItemClick,
}: {
  item: NavItem;
  isActive: boolean;
  onItemClick?: () => void;
}) {
  return (
    <Link
      href={item.href}
      onClick={onItemClick}
      className={cn(
        "rounded-full px-3 py-1.5 text-sm transition-colors",
        isActive
          ? "bg-canvas-soft font-medium text-ink"
          : "text-body hover:bg-canvas-soft/60 hover:text-ink",
      )}
      aria-current={isActive ? "page" : undefined}
    >
      {item.label}
    </Link>
  );
}

export function SiteHeader() {
  const pathname = usePathname();

  function isActive(href: string): boolean {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  }

  return (
    <header className="sticky top-0 z-50 h-16 border-b border-hairline bg-canvas/80 backdrop-blur-md">
      <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Left: Brand */}
        <Link
          href="/"
          className="text-sm font-semibold tracking-tight text-ink transition-opacity hover:opacity-80"
        >
          Dr. Token System
        </Link>

        {/* Desktop nav: center/right */}
        <nav
          className="hidden items-center gap-1 sm:flex"
          aria-label="Main navigation"
        >
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              isActive={isActive(item.href)}
            />
          ))}
        </nav>

        {/* Mobile nav: details/summary hamburger */}
        <details className="group relative sm:hidden">
          <summary
            className="flex cursor-pointer list-none items-center justify-center rounded-full p-2 text-body transition-colors hover:bg-canvas-soft/60 hover:text-ink"
            aria-label="Open navigation menu"
          >
            <Menu className="size-5" aria-hidden="true" />
          </summary>

          {/* Dropdown menu */}
          <div className="absolute right-0 top-full mt-2 w-48 overflow-hidden rounded-lg border border-hairline bg-canvas shadow-level-4">
            <nav className="flex flex-col gap-0.5 p-2" aria-label="Mobile navigation">
              {NAV_ITEMS.map((item) => (
                <NavLink
                  key={item.href}
                  item={item}
                  isActive={isActive(item.href)}
                />
              ))}
            </nav>
          </div>
        </details>
      </div>
    </header>
  );
}
