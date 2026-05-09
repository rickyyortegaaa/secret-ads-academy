"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ListChecks,
  Mail,
  Settings,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";

import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { adminLogoutAction } from "@/app/actions/admin/auth";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/questions", label: "Preguntas", icon: ListChecks },
  { href: "/admin/whitelist", label: "Whitelist", icon: Mail },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

type AdminSidebarProps = {
  email: string;
};

export function AdminSidebar({ email }: AdminSidebarProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <>
      {/* Mobile menu button */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed top-4 left-4 z-40 inline-flex size-10 items-center justify-center rounded-full bg-card shadow-md lg:hidden"
        aria-label="Abrir menú"
      >
        <Menu className="size-5" />
      </button>

      {/* Backdrop on mobile */}
      {open ? (
        <button
          type="button"
          aria-label="Cerrar menú"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
        />
      ) : null}

      {/* Sidebar */}
      <aside
        className={[
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-white shadow-xl transition-transform lg:translate-x-0 lg:shadow-none",
          open ? "translate-x-0" : "-translate-x-full",
          "border-r",
        ].join(" ")}
      >
        <div className="flex h-16 items-center justify-between border-b px-4">
          <Link
            href="/admin"
            className="flex items-center gap-2"
            onClick={() => setOpen(false)}
          >
            <BrandLogo size={32} showWordmark={false} />
            <div className="leading-tight">
              <div className="text-sm font-semibold">Secret Ads</div>
              <div className="brand-text-gradient text-[10px] font-bold uppercase tracking-[0.2em]">
                Admin
              </div>
            </div>
          </Link>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="lg:hidden"
            aria-label="Cerrar menú"
          >
            <X className="size-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href, item.exact);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={[
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "brand-gradient text-white shadow-sm"
                    : "text-foreground/70 hover:bg-pink-50 hover:text-foreground",
                ].join(" ")}
              >
                <Icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t p-3">
          <div className="mb-3 rounded-lg bg-muted/40 px-3 py-2 text-xs">
            <div className="font-semibold text-foreground">Conectado como</div>
            <div className="truncate text-muted-foreground" title={email}>
              {email}
            </div>
          </div>
          <form action={adminLogoutAction}>
            <Button
              type="submit"
              variant="outline"
              size="sm"
              className="w-full justify-start gap-2"
            >
              <LogOut className="size-4" />
              Cerrar sesión
            </Button>
          </form>
        </div>
      </aside>
    </>
  );
}
