'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getGlobalHistory, getSession } from '../actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ChevronLeft, History, Calendar, User, Search, ArrowRight } from 'lucide-react';
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
  const [searchQuery, setSearchQuery] = useState('');
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
      // Discard timezone indicators to treat database time as local
      const cleaned = dateStr.replace('Z', '').replace('T', ' ');
      const d = new Date(cleaned);
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

  // Filter history list based on search query
  const filteredHistory = historyList.filter((item) => {
    const q = searchQuery.toLowerCase();
    return (
      item.clientName.toLowerCase().includes(q) ||
      item.clientBusinessName.toLowerCase().includes(q) ||
      item.logText.toLowerCase().includes(q) ||
      (item.createdBy && item.createdBy.toLowerCase().includes(q))
    );
  });

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
          <div className="space-y-1">
            <CardTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <History className="h-5 w-5 text-slate-700" />
              Riwayat Aktivitas Global
            </CardTitle>
            <CardDescription className="text-sm text-slate-500">
              Menampilkan hingga 50 aktivitas dan pembaruan detail client terakhir. Klik aktivitas untuk melihat detail log client.
            </CardDescription>
          </div>

          {/* Search Bar */}
          <div className="relative mt-4">
            <Search className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-slate-400" />
            <Input 
              placeholder="Cari client, nama usaha, atau keterangan..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="text-base h-11 pl-11 bg-slate-50/50 border-slate-200/80 rounded-xl focus-visible:ring-1 shadow-sm"
            />
          </div>
        </CardHeader>

        <CardContent className="p-6">
          {filteredHistory.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-12">Tidak ada riwayat aktivitas yang cocok dengan pencarian.</p>
          ) : (
            <div className="relative border-l border-slate-150 pl-4.5 ml-2.5 space-y-6 py-2 text-xs">
              {filteredHistory.map((item) => (
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
                  
                  <div 
                    onClick={() => router.push(`/?openLogs=${item.clientId}`)}
                    className="text-slate-700 bg-slate-50/60 hover:bg-blue-50/40 hover:border-blue-200 p-3.5 rounded-xl border border-slate-100 transition-all cursor-pointer group flex flex-col gap-1 shadow-sm relative pr-10"
                    title="Klik untuk buka riwayat detail client ini"
                  >
                    <p className="font-bold text-slate-900 text-sm mb-1 group-hover:text-blue-700 transition-colors">
                      💼 {item.clientName} <span className="text-xs text-slate-400 font-normal">({item.clientBusinessName})</span>
                    </p>
                    <p className="leading-relaxed font-sans text-sm">{item.logText}</p>
                    
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all text-blue-600">
                      <ArrowRight className="h-4 w-4" />
                    </div>
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
