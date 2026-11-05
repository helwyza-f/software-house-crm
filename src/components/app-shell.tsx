'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';
import { logout } from '@/app/actions';
import {
  LayoutDashboard,
  Users2,
  History,
  Settings,
  Users,
  Plus,
  LogOut,
  Menu,
  X,
  ShieldCheck,
} from 'lucide-react';

type Session = { id: number; username: string; role: 'super_admin' | 'admin' | 'staff' } | null;

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  show: boolean;
}

function navItems(session: Session): NavItem[] {
  const admin = session?.role === 'admin' || session?.role === 'super_admin';
  const superAdmin = session?.role === 'super_admin';
  return [
    { href: '/', label: 'Dashboard', icon: LayoutDashboard, show: true },
    { href: '/clients', label: 'Daftar Client', icon: Users2, show: true },
    { href: '/history', label: 'Riwayat', icon: History, show: true },
    { href: '/settings', label: 'Konfigurasi', icon: Settings, show: admin },
    { href: '/users', label: 'Manajemen Akun', icon: Users, show: superAdmin },
  ].filter((i) => i.show);
}

function roleLabel(role?: string) {
  return role === 'super_admin' ? 'Super Admin' : role === 'admin' ? 'Admin' : 'Staff';
}

function SidebarContent({ session, onNavigate }: { session: Session; onNavigate?: () => void }) {
  const pathname = usePathname();
  const items = navItems(session);
  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));

  const handleLogout = async () => {
    await logout();
    window.location.href = '/login';
  };

  return (
    <div className="flex h-full flex-col gap-4 p-4">
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-1 pt-1">
        <span className="h-9 w-9 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0">
          <ShieldCheck className="h-5 w-5" />
        </span>
        <div className="leading-tight">
          <div className="font-bold text-slate-900">LeadManager</div>
          <div className="text-[10px] text-slate-400 font-medium">Bidtech CRM</div>
        </div>
      </div>

      <Link
        href="/add"
        onClick={onNavigate}
        className={buttonVariants({ variant: 'default', size: 'sm', className: 'rounded-xl shadow-sm justify-start gap-2 h-10' })}
      >
        <Plus className="h-4 w-4" /> Client Baru
      </Link>

      <nav className="flex flex-col gap-1">
        {items.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                active ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
              )}
            >
              <Icon className={cn('h-4.5 w-4.5', active ? 'text-white' : 'text-slate-400')} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto border-t border-slate-100 pt-3">
        <div className="flex items-center gap-2.5 px-1">
          <span className="h-9 w-9 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-semibold text-sm uppercase shrink-0">
            {session?.username?.charAt(0) || '?'}
          </span>
          <div className="min-w-0 flex-grow">
            <div className="text-sm font-semibold text-slate-900 truncate">{session?.username}</div>
            <div className="text-[11px] text-slate-400">{roleLabel(session?.role)}</div>
          </div>
          <button
            onClick={handleLogout}
            title="Keluar"
            className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors shrink-0"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function AppShell({ session, children }: { session: Session; children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex-grow flex min-h-0">
      {/* Desktop sidebar */}
      <aside className="hidden md:block w-64 shrink-0 border-r border-slate-200/70 bg-white sticky top-0 h-screen">
        <SidebarContent session={session} />
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-72 max-w-[82%] bg-white shadow-xl">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute right-3 top-3 h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100"
              title="Tutup"
            >
              <X className="h-4.5 w-4.5" />
            </button>
            <SidebarContent session={session} onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-grow flex flex-col min-w-0">
        {/* Mobile topbar */}
        <div className="md:hidden sticky top-0 z-30 flex items-center justify-between gap-2 border-b border-slate-200/70 bg-white/90 backdrop-blur px-4 h-14">
          <button
            onClick={() => setMobileOpen(true)}
            className="h-9 w-9 rounded-lg flex items-center justify-center text-slate-600 hover:bg-slate-100"
            title="Menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <span className="h-7 w-7 rounded-lg bg-slate-900 text-white flex items-center justify-center">
              <ShieldCheck className="h-4 w-4" />
            </span>
            <span className="font-bold text-slate-900 text-sm">LeadManager</span>
          </div>
          <Link
            href="/add"
            title="Client Baru"
            className="h-9 w-9 rounded-lg flex items-center justify-center bg-slate-900 text-white hover:bg-slate-800"
          >
            <Plus className="h-4.5 w-4.5" />
          </Link>
        </div>

        {children}
      </div>
    </div>
  );
}
