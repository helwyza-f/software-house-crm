'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getGlobalHistory, getSession } from '../actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronLeft, History, Calendar, User } from 'lucide-react';
import Link from 'next/link';

interface HistoryItem {
  id: number;
  clientId: number;
  logText: string;
  createdBy: string;
  createdAt: string;
  clientName: string;
  clientBusinessName: string;
}

export default function HistoryPage() {
  const router = useRouter();
  const [historyList, setHistoryList] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    const [historyRes, sessionRes] = await Promise.all([
      getGlobalHistory(50),
      getSession()
    ]);

    if (historyRes.success && historyRes.data) {
      setHistoryList(historyRes.data as HistoryItem[]);
    } else {
      router.push('/');
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr + 'Z');
      return d.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  if (loading) {
    return (
      <div className="max-w-xl mx-auto w-full px-4 py-12 flex justify-center items-center">
        <p className="text-sm text-slate-500 font-medium animate-pulse">Memuat riwayat aktivitas...</p>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto w-full px-4 py-6 md:py-10 flex-grow flex flex-col gap-4">
      {/* Back button */}
      <div>
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900 transition-colors font-medium">
          <ChevronLeft className="h-4 w-4" /> Kembali ke Dashboard
        </Link>
      </div>

      {/* History timeline Card */}
      <Card className="border border-slate-100 shadow-sm rounded-2xl bg-white">
        <CardHeader className="p-6 border-b border-slate-100/50">
          <CardTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <History className="h-5 w-5 text-slate-700" />
            Riwayat Aktivitas Global
          </CardTitle>
          <CardDescription className="text-sm text-slate-500 mt-1">
            Menampilkan hingga 50 aktivitas dan pembaruan detail client terakhir di dalam sistem.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          {historyList.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-12">Belum ada riwayat aktivitas yang tercatat.</p>
          ) : (
            <div className="relative border-l border-slate-150 pl-4.5 ml-2.5 space-y-6 py-2 text-xs">
              {historyList.map((item) => (
                <div key={item.id} className="relative">
                  {/* Timeline dot */}
                  <div className="absolute -left-[24px] top-1.5 h-2.5 w-2.5 bg-slate-400 rounded-full border-2 border-white" />
                  
                  <div className="flex justify-between items-center text-[10px] text-slate-400 font-medium mb-1.5">
                    <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {formatDate(item.createdAt)}</span>
                    {item.createdBy && (
                      <span className="font-semibold text-slate-500 flex items-center gap-1">
                        <User className="h-3 w-3" /> {item.createdBy}
                      </span>
                    )}
                  </div>
                  
                  <div className="text-slate-700 bg-slate-50/60 p-3.5 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors">
                    <p className="font-bold text-slate-900 text-sm mb-1">
                      💼 {item.clientName} <span className="text-xs text-slate-400 font-normal">({item.clientBusinessName})</span>
                    </p>
                    <p className="leading-relaxed font-sans text-sm">{item.logText}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
