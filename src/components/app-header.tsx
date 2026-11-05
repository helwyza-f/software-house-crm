'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button, buttonVariants } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { logout } from '@/app/actions';
import {
  LayoutDashboard,
  Users2,
  History,
  Settings,
  Users,
  Plus,
  LogOut,
  User,
  Menu,
} from 'lucide-react';

type Session = { id: number; username: string; role: 'super_admin' | 'admin' | 'staff' } | null;

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  show: boolean;
}

export function AppHeader({
  title,
  subtitle,
  session,
  extra,
}: {
  title: string;
  subtitle?: string;
  session: Session;
  extra?: React.ReactNode;
}) {
  const pathname = usePathname();
  const isAtLeastAdmin = session?.role === 'admin' || session?.role === 'super_admin';
  const isSuperAdmin = session?.role === 'super_admin';

  const roleLabel = session?.role === 'super_admin' ? 'Super Admin' : session?.role === 'admin' ? 'Admin' : 'Staff';

  const items: NavItem[] = [
    { href: '/', label: 'Dashboard', icon: LayoutDashboard, show: true },
    { href: '/clients', label: 'Daftar Client', icon: Users2, show: true },
    { href: '/history', label: 'Riwayat Aktivitas', icon: History, show: true },
    { href: '/settings', label: 'Konfigurasi', icon: Settings, show: isAtLeastAdmin },
    { href: '/users', label: 'Manajemen Akun', icon: Users, show: isSuperAdmin },
  ].filter((i) => i.show);

  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));

  const handleLogout = async () => {
    await logout();
    window.location.href = '/login';
  };

  return (
    <header className="flex flex-col gap-3 pb-3 border-b border-slate-100">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 truncate">{title}</h1>
          {subtitle && <p className="text-xs sm:text-sm text-slate-500">{subtitle}</p>}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {extra}

          {/* Desktop inline nav */}
          <nav className="hidden md:flex items-center gap-1.5">
            {items.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={item.label}
                  className={buttonVariants({
                    variant: 'outline',
                    size: 'icon',
                    className: cn(
                      'rounded-full h-9 w-9 border-slate-200',
                      active ? 'bg-slate-900 text-white hover:bg-slate-800 border-slate-900' : 'text-slate-600 hover:bg-slate-50'
                    ),
                  })}
                >
                  <Icon className="h-4.5 w-4.5" />
                </Link>
              );
            })}
          </nav>

          <Link
            href="/add"
            title="Client Baru"
            className={buttonVariants({ variant: 'default', size: 'sm', className: 'rounded-full shadow-sm text-sm' })}
          >
            <Plus className="h-4 w-4 sm:mr-1" /> <span className="hidden sm:inline">Client Baru</span>
          </Link>

          {/* Mobile menu */}
          <Popover>
            <PopoverTrigger
              title="Menu"
              className={buttonVariants({ variant: 'outline', size: 'icon', className: 'md:hidden rounded-full h-9 w-9 text-slate-600 hover:bg-slate-50 border-slate-200' })}
            >
              <Menu className="h-4.5 w-4.5" />
            </PopoverTrigger>
            <PopoverContent align="end" className="w-60 p-2 rounded-2xl border border-slate-100 shadow-xl bg-white">
              <div className="flex items-center gap-2 px-2 py-2 mb-1 border-b border-slate-100">
                <span className="h-8 w-8 rounded-full bg-slate-900 text-white flex items-center justify-center shrink-0">
                  <User className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-slate-900 truncate">{session?.username}</div>
                  <div className="text-xs text-slate-400">{roleLabel}</div>
                </div>
              </div>
              <nav className="flex flex-col">
                {items.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        'flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-sm font-medium transition-colors',
                        active ? 'bg-slate-100 text-slate-900' : 'text-slate-600 hover:bg-slate-50'
                      )}
                    >
                      <Icon className="h-4 w-4 text-slate-400" /> {item.label}
                    </Link>
                  );
                })}
              </nav>
              <div className="border-t border-slate-100 mt-1 pt-1">
                <Button
                  variant="ghost"
                  onClick={handleLogout}
                  className="w-full justify-start gap-2.5 px-2.5 py-2 h-auto rounded-xl text-sm font-medium text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                >
                  <LogOut className="h-4 w-4" /> Keluar
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Desktop user chip */}
      <div className="hidden md:flex items-center gap-2 text-xs bg-slate-100 border border-slate-200/50 p-1 px-3 rounded-full text-slate-600 font-medium self-start">
        <User className="h-3.5 w-3.5 text-slate-400" />
        <span>{session?.username} ({roleLabel})</span>
        <span className="text-slate-300">|</span>
        <button onClick={handleLogout} className="hover:text-rose-600 font-bold flex items-center gap-1 select-none">
          <LogOut className="h-3 w-3" /> Keluar
        </button>
      </div>
    </header>
  );
}
