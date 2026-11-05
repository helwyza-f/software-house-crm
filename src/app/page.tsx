'use client';

import React, { useState, useEffect } from 'react';
import { getSession, getDashboardStats, getGlobalHistory, logout } from './actions';
import { Card } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
  UserPlus,
  Activity,
  CheckCheck,
  Flame,
  Users2,
  Plus,
  History,
  Settings,
  Users,
  LogOut,
  User,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import Link from 'next/link';

interface Stats {
  newLeadsToday: number;
  followedUpToday: number;
  respondedToday: number;
  potentialHigh: number;
}

interface HistoryItem {
  id: number;
  clientId: number;
  logText: string;
  createdBy: string;
  createdAt: string;
  clientName: string;
  clientBusinessName: string;
}

export default function DashboardPage() {
  const [userSession, setUserSession] = useState<{ id: number; username: string; role: 'super_admin' | 'admin' | 'staff' } | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [recent, setRecent] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const todayLabel = new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  const loadData = async () => {
    setLoading(true);
    const [sessionRes, statsRes, historyRes] = await Promise.all([
      getSession(),
      getDashboardStats(todayStr),
      getGlobalHistory(8),
    ]);
    setUserSession(sessionRes);
    if (statsRes.success && statsRes.data) {
      setStats(statsRes.data);
    } else {
      toast.error(statsRes.error || 'Gagal memuat ringkasan');
    }
    if (historyRes.success && historyRes.data) {
      setRecent(historyRes.data as HistoryItem[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogout = async () => {
    await logout();
    toast.success('Berhasil keluar');
    window.location.href = '/login';
  };

  const formatDate = (dateInput: string) => {
    try {
      if (!dateInput) return '';
      let dateStr = String(dateInput);
      if (!dateStr.endsWith('Z') && !dateStr.includes('+')) {
        dateStr = dateStr.replace(' ', 'T') + 'Z';
      }
      return new Date(dateStr).toLocaleDateString('id-ID', {
        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
      });
    } catch {
      return '';
    }
  };

  const isAtLeastAdmin = userSession?.role === 'admin' || userSession?.role === 'super_admin';
  const isSuperAdmin = userSession?.role === 'super_admin';

  const cards = [
    {
      label: 'Lead Baru Hari Ini',
      hint: 'Data nasabah yang ditambahkan hari ini',
      value: stats?.newLeadsToday,
      icon: UserPlus,
      accent: 'text-blue-600 bg-blue-50',
    },
    {
      label: 'Di-follow Up Hari Ini',
      hint: 'Lead yang mendapat aktivitas baru hari ini',
      value: stats?.followedUpToday,
      icon: Activity,
      accent: 'text-violet-600 bg-violet-50',
    },
    {
      label: 'Merespon Hari Ini',
      hint: 'Lead yang ditandai telah merespon hari ini',
      value: stats?.respondedToday,
      icon: CheckCheck,
      accent: 'text-emerald-600 bg-emerald-50',
    },
    {
      label: 'Lead Potensial (High)',
      hint: 'Total lead dengan potensi High',
      value: stats?.potentialHigh,
      icon: Flame,
      accent: 'text-rose-600 bg-rose-50',
    },
  ];

  return (
    <div className="max-w-6xl mx-auto w-full px-4 py-6 md:py-10 flex-grow flex flex-col gap-6">

      {/* Header */}
      <header className="flex flex-col gap-2 pb-2 border-b border-slate-100">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Dashboard</h1>
            <p className="text-sm text-slate-500 capitalize">{todayLabel}</p>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-center flex-wrap">
            <div className="flex items-center gap-2 text-xs bg-slate-100 border border-slate-200/50 p-1 px-3 rounded-full text-slate-600 font-medium">
              <User className="h-3.5 w-3.5 text-slate-400" />
              <span>{userSession?.username} ({userSession?.role === 'super_admin' ? 'Super Admin' : (userSession?.role === 'admin' ? 'Admin' : 'Staff')})</span>
              <span className="text-slate-300">|</span>
              <button onClick={handleLogout} className="hover:text-rose-600 font-bold flex items-center gap-1 select-none">
                <LogOut className="h-3 w-3" /> Keluar
              </button>
            </div>

            <button
              onClick={loadData}
              title="Muat ulang"
              className={buttonVariants({ variant: 'outline', size: 'icon', className: 'rounded-full h-9 w-9 text-slate-600 hover:bg-slate-50 border-slate-200' })}
            >
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            </button>

            {isSuperAdmin && (
              <Link href="/users" title="Manajemen Akun" className={buttonVariants({ variant: 'outline', size: 'icon', className: 'rounded-full h-9 w-9 text-slate-600 hover:bg-slate-50 border-slate-200' })}>
                <Users className="h-4.5 w-4.5" />
              </Link>
            )}
            {isAtLeastAdmin && (
              <Link href="/settings" title="Konfigurasi" className={buttonVariants({ variant: 'outline', size: 'icon', className: 'rounded-full h-9 w-9 text-slate-600 hover:bg-slate-50 border-slate-200' })}>
                <Settings className="h-4.5 w-4.5" />
              </Link>
            )}
            <Link href="/history" title="Riwayat Aktivitas" className={buttonVariants({ variant: 'outline', size: 'icon', className: 'rounded-full h-9 w-9 text-slate-600 hover:bg-slate-50 border-slate-200' })}>
              <History className="h-4.5 w-4.5" />
            </Link>
            <Link href="/add" className={buttonVariants({ variant: 'default', size: 'sm', className: 'rounded-full shadow-sm text-sm' })}>
              <Plus className="h-4 w-4 mr-1" /> Client Baru
            </Link>
          </div>
        </div>
      </header>

      {/* KPI cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <Card key={c.label} className="border border-slate-100 shadow-sm rounded-2xl bg-white p-5 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className={cn("h-10 w-10 rounded-xl flex items-center justify-center", c.accent)}>
                  <Icon className="h-5 w-5" />
                </span>
              </div>
              <div>
                {loading && c.value === undefined ? (
                  <div className="h-8 w-14 rounded bg-slate-100 animate-pulse" />
                ) : (
                  <div className="text-3xl font-bold text-slate-900 tabular-nums">{c.value ?? 0}</div>
                )}
                <div className="text-sm font-semibold text-slate-700 mt-1">{c.label}</div>
                <div className="text-xs text-slate-400 mt-0.5 leading-snug">{c.hint}</div>
              </div>
            </Card>
          );
        })}
      </section>

      {/* Quick navigation */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link href="/clients" className="group">
          <Card className="border border-slate-100 shadow-sm rounded-2xl bg-white p-5 flex items-center justify-between hover:shadow-md hover:border-slate-200 transition-all h-full">
            <div className="flex items-center gap-3">
              <span className="h-10 w-10 rounded-xl bg-slate-900 text-white flex items-center justify-center">
                <Users2 className="h-5 w-5" />
              </span>
              <div>
                <div className="font-semibold text-slate-900 text-sm">Kelola Data Client</div>
                <div className="text-xs text-slate-400">Lihat, cari, dan ubah semua lead</div>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-slate-600 group-hover:translate-x-1 transition-all" />
          </Card>
        </Link>

        <Link href="/add" className="group">
          <Card className="border border-slate-100 shadow-sm rounded-2xl bg-white p-5 flex items-center justify-between hover:shadow-md hover:border-slate-200 transition-all h-full">
            <div className="flex items-center gap-3">
              <span className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Plus className="h-5 w-5" />
              </span>
              <div>
                <div className="font-semibold text-slate-900 text-sm">Tambah Client Baru</div>
                <div className="text-xs text-slate-400">Daftarkan lead baru ke sistem</div>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-slate-600 group-hover:translate-x-1 transition-all" />
          </Card>
        </Link>

        <Link href="/history" className="group">
          <Card className="border border-slate-100 shadow-sm rounded-2xl bg-white p-5 flex items-center justify-between hover:shadow-md hover:border-slate-200 transition-all h-full">
            <div className="flex items-center gap-3">
              <span className="h-10 w-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <History className="h-5 w-5" />
              </span>
              <div>
                <div className="font-semibold text-slate-900 text-sm">Riwayat Aktivitas</div>
                <div className="text-xs text-slate-400">Semua aktivitas terbaru</div>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-slate-600 group-hover:translate-x-1 transition-all" />
          </Card>
        </Link>
      </section>

      {/* Recent activity */}
      <section>
        <Card className="border border-slate-100 shadow-sm rounded-2xl bg-white">
          <div className="p-5 border-b border-slate-100/70 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900 flex items-center gap-2">
              <Activity className="h-4.5 w-4.5 text-slate-500" /> Aktivitas Terbaru
            </h2>
            <Link href="/history" className="text-xs font-semibold text-blue-600 hover:text-blue-700">Lihat semua</Link>
          </div>
          <div className="p-3">
            {recent.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8">{loading ? 'Memuat aktivitas...' : 'Belum ada aktivitas.'}</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {recent.map((item) => (
                  <li key={item.id}>
                    <Link
                      href={`/clients?openLogs=${item.clientId}`}
                      className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-slate-50 transition-colors"
                    >
                      <span className="h-2 w-2 rounded-full bg-slate-300 mt-2 shrink-0" />
                      <div className="min-w-0 flex-grow">
                        <div className="text-sm font-semibold text-slate-800 truncate">
                          {item.clientName} <span className="text-xs font-normal text-slate-400">({item.clientBusinessName})</span>
                        </div>
                        <div className="text-xs text-slate-500 truncate">{item.logText}</div>
                      </div>
                      <div className="text-[10px] text-slate-400 whitespace-nowrap shrink-0 pt-0.5">
                        {formatDate(item.createdAt)}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>
      </section>

      <footer className="text-center py-2">
        <p className="text-[10px] text-slate-400 font-mono">LeadManager v1.5 • PostgreSQL DB</p>
      </footer>
    </div>
  );
}
