'use client';

import React, { useState, useEffect, startTransition } from 'react';
import { 
  getClients, 
  getClientWithLogs, 
  deleteClient, 
  addClientLog,
  getCustomFields,
  ClientWithLogs
} from './actions';
import { Client } from '@/lib/db';
import { Card, CardContent, CardDescription, CardFooter, CardHeader } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { 
  Search, 
  Plus, 
  Phone, 
  Building2, 
  MapPin, 
  History, 
  Edit3, 
  Trash2, 
  User, 
  MessageSquarePlus, 
  Filter, 
  Calendar,
  Settings,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import Link from 'next/link';

export default function Dashboard() {
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  
  // Pagination states
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalClients, setTotalClients] = useState(0);
  const itemsPerPage = 12;

  // Custom global variables/fields list
  const [customFields, setCustomFields] = useState<string[]>([]);

  // Modals state
  const [isLogsOpen, setIsLogsOpen] = useState(false);
  const [deleteClientId, setDeleteClientId] = useState<number | null>(null);
  
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [selectedClientData, setSelectedClientData] = useState<ClientWithLogs | null>(null);
  const [newLogText, setNewLogText] = useState('');

  // Search Debounce Effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // Reset to page 1 on new search
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch clients function
  const fetchClients = () => {
    startTransition(async () => {
      const res = await getClients(debouncedSearch, categoryFilter, page, itemsPerPage);
      if (res.success && res.data) {
        setClients(res.data.clients);
        setTotalPages(res.data.pages);
        setTotalClients(res.data.total);
      } else {
        toast.error(res.error || 'Gagal memuat data client');
      }
    });
  };

  // Fetch custom fields list
  const fetchCustomFields = async () => {
    const res = await getCustomFields();
    if (res.success && res.data) {
      setCustomFields(res.data);
    }
  };

  useEffect(() => {
    fetchClients();
  }, [debouncedSearch, categoryFilter, page]);

  useEffect(() => {
    fetchCustomFields();
  }, []);

  // Load client logs
  const viewLogs = async (clientId: number) => {
    setSelectedClientId(clientId);
    const res = await getClientWithLogs(clientId);
    if (res.success && res.data) {
      setSelectedClientData(res.data);
      setIsLogsOpen(true);
    } else {
      toast.error(res.error || 'Gagal memuat log client');
    }
  };

  // Delete client handler
  const handleDelete = async (id: number) => {
    const res = await deleteClient(id);
    if (res.success) {
      toast.success('Client berhasil dihapus');
      fetchClients();
      if (isLogsOpen && selectedClientId === id) {
        setIsLogsOpen(false);
      }
    } else {
      toast.error(res.error || 'Gagal menghapus client');
    }
    setDeleteClientId(null);
  };

  // Add new log entry handler
  const handleAddLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClientId || !newLogText.trim()) return;

    const res = await addClientLog(selectedClientId, newLogText);
    if (res.success) {
      toast.success('Log aktivitas berhasil ditambahkan');
      setNewLogText('');
      // Reload logs dialog content
      const updated = await getClientWithLogs(selectedClientId);
      if (updated.success && updated.data) {
        setSelectedClientData(updated.data);
      }
      fetchClients();
    } else {
      toast.error(res.error || 'Gagal menambahkan log');
    }
  };

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case 'High':
        return <Badge className="bg-rose-500 hover:bg-rose-600 text-white font-medium px-2 py-0.5">High Potential</Badge>;
      case 'Medium':
        return <Badge className="bg-amber-500 hover:bg-amber-600 text-white font-medium px-2 py-0.5">Medium Potential</Badge>;
      case 'Low':
        return <Badge className="bg-sky-500 hover:bg-sky-600 text-white font-medium px-2 py-0.5">Low Potential</Badge>;
      default:
        return <Badge variant="secondary">{category}</Badge>;
    }
  };

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

  return (
    <div className="max-w-6xl mx-auto w-full px-4 py-6 md:py-10 flex-grow flex flex-col gap-6">
      
      {/* Header */}
      <header className="flex flex-col gap-1.5 pb-2">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">LeadManager</h1>
          <div className="flex items-center gap-1.5">
            <Link 
              href="/settings" 
              title="Konfigurasi Variabel"
              className={buttonVariants({ variant: 'outline', size: 'icon', className: 'rounded-full h-9 w-9 text-slate-600 hover:bg-slate-50 border-slate-200' })}
            >
              <Settings className="h-4.5 w-4.5" />
            </Link>
            <Link 
              href="/add"
              className={buttonVariants({ variant: 'default', size: 'sm', className: 'rounded-full shadow-sm text-sm' })}
            >
              <Plus className="h-4 w-4 mr-1" /> Client Baru
            </Link>
          </div>
        </div>
        <p className="text-sm text-slate-500">
          Kelola data calon client Software House dengan mudah.
        </p>
      </header>

      {/* Filter and Search Bar */}
      <section className="flex flex-col gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <Input 
            placeholder="Cari nama, usaha, no hp, alamat..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-white border-slate-200/80 rounded-xl focus-visible:ring-1 text-sm shadow-sm"
          />
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <span className="text-sm text-slate-400 flex items-center gap-1 mr-1">
            <Filter className="h-3 w-3" /> Potensi:
          </span>
          {[
            { value: 'ALL', label: 'Semua' },
            { value: 'High', label: 'High' },
            { value: 'Medium', label: 'Medium' },
            { value: 'Low', label: 'Low' },
          ].map((btn) => (
            <button
              key={btn.value}
              onClick={() => { setCategoryFilter(btn.value); setPage(1); }}
              className={`text-sm px-3.5 py-1.5 rounded-full font-medium transition-all ${
                categoryFilter === btn.value
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-100'
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </section>

      {/* Clients List */}
      <main className="flex-grow flex flex-col gap-6">
        {clients.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 border border-dashed border-slate-200 rounded-2xl bg-white text-center gap-3 max-w-md mx-auto w-full">
            <User className="h-10 w-10 text-slate-300" />
            <div className="space-y-1">
              <h3 className="font-semibold text-slate-900 text-sm">Belum ada client</h3>
              <p className="text-xs text-slate-500">
                Tidak ada data client potensial ditemukan. Silakan tambahkan data baru.
              </p>
            </div>
            <Link 
              href="/add"
              className={buttonVariants({ variant: 'default', size: 'sm', className: 'rounded-xl text-sm' })}
            >
              <Plus className="h-3.5 w-3.5 mr-1" /> Tambah Client
            </Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {clients.map((client) => {
                let customValuesObj: Record<string, string> = {};
                try {
                  customValuesObj = JSON.parse(client.customValues || '{}');
                } catch {}
                const filledCustoms = Object.entries(customValuesObj).filter(([_, val]) => val.trim());

                return (
                  <Card key={client.id} className="border border-slate-100 shadow-sm rounded-2xl bg-white hover:shadow-md transition-all flex flex-col justify-between">
                    <div>
                      <CardHeader className="p-4 pb-2.5 flex flex-row items-start justify-between gap-4 space-y-0">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-slate-900 text-base">{client.name}</span>
                            {getCategoryBadge(client.category)}
                          </div>
                          <CardDescription className="flex items-center gap-1.5 text-sm text-slate-600 font-medium">
                            <Building2 className="h-3.5 w-3.5 text-slate-400" /> {client.businessName}
                          </CardDescription>
                        </div>
                      </CardHeader>
                      
                      <CardContent className="px-4 py-0 pb-3 text-sm space-y-2 text-slate-500">
                        <div className="flex items-center gap-2">
                          <Phone className="h-3.5 w-3.5 text-slate-400" />
                          <a href={`tel:${client.phone}`} className="hover:underline text-slate-600 font-mono">
                            {client.phone}
                          </a>
                        </div>
                        {client.address && (
                          <div className="flex items-start gap-2">
                            <MapPin className="h-3.5 w-3.5 text-slate-400 mt-0.5" />
                            <span className="leading-relaxed">{client.address}</span>
                          </div>
                        )}

                        {/* Display dropdown selections */}
                        {(client.businessType || client.infoSource) && (
                          <div className="flex items-center gap-1.5 flex-wrap pt-1 mr-4">
                            {client.businessType && (
                              <Badge variant="outline" className="bg-slate-50 border-slate-200 text-slate-600 text-xs px-2 py-0.5 rounded-md font-sans">
                                💼 {client.businessType}
                              </Badge>
                            )}
                            {client.infoSource && (
                              <Badge variant="outline" className="bg-slate-50 border-slate-200 text-slate-600 text-xs px-2 py-0.5 rounded-md font-sans">
                                📢 {client.infoSource}
                              </Badge>
                            )}
                          </div>
                        )}

                        {/* Display Custom Fields */}
                        {filledCustoms.length > 0 && (
                          <div className="pt-2 border-t border-slate-100/80 mt-2 flex flex-col gap-1">
                            {filledCustoms.map(([label, val]) => (
                              <div key={label} className="flex justify-between items-center text-xs bg-slate-50 border border-slate-100/50 p-1.5 px-2 rounded-lg">
                                <span className="font-semibold text-slate-400 uppercase tracking-wider">{label}</span>
                                <span className="text-slate-700 font-medium">{val}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </div>
                    
                    <CardFooter className="px-4 py-3 bg-slate-50/50 rounded-b-2xl border-t border-slate-100/50 flex items-center justify-between">
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <Calendar className="h-3 w-3" /> Update: {formatDate(client.updatedAt)}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                          onClick={() => viewLogs(client.id)}
                          title="Log & Keterangan"
                        >
                          <History className="h-4 w-4" />
                        </Button>
                        <Link 
                          href={`/edit/${client.id}`}
                          className={buttonVariants({ variant: 'ghost', size: 'icon', className: 'h-8 w-8 text-slate-600 hover:text-amber-600 hover:bg-amber-50 rounded-lg' })}
                          title="Edit Data"
                        >
                          <Edit3 className="h-4 w-4" />
                        </Link>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                          onClick={() => setDeleteClientId(client.id)}
                          title="Hapus"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-slate-150 pt-4 pb-2 mt-2 text-xs text-slate-500">
                <span>
                  Menampilkan <strong>{Math.min((page - 1) * itemsPerPage + 1, totalClients)}</strong> sampai <strong>{Math.min(page * itemsPerPage, totalClients)}</strong> dari <strong>{totalClients}</strong> client
                </span>
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 rounded-lg text-xs"
                    onClick={() => setPage((p) => Math.max(p - 1, 1))}
                    disabled={page === 1}
                  >
                    <ChevronLeft className="h-4 w-4 mr-0.5" /> Prev
                  </Button>
                  <span className="font-medium text-slate-700 px-1">
                    Hal {page} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 rounded-lg text-xs"
                    onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                    disabled={page === totalPages}
                  >
                    Next <ChevronRight className="h-4 w-4 ml-0.5" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Footer Branding */}
      <footer className="text-center py-4">
        <p className="text-[10px] text-slate-400 font-mono">LeadManager v1.3 • PostgreSQL DB</p>
      </footer>

      {/* Client Interaction Logs Dialog */}
      <Dialog open={isLogsOpen} onOpenChange={setIsLogsOpen}>
        <DialogContent className="max-w-md rounded-2xl p-6 max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Log Aktivitas & Keterangan</DialogTitle>
            <DialogDescription className="text-sm">
              {selectedClientData?.name} ({selectedClientData?.businessName})
            </DialogDescription>
          </DialogHeader>

          {/* Add New Log Form */}
          <form onSubmit={handleAddLog} className="space-y-2 py-2 shrink-0">
            <Label htmlFor="new-log" className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tambah Log Aktivitas Baru</Label>
            <div className="flex gap-2">
              <Textarea 
                id="new-log"
                placeholder="Tulis log aktivitas baru di sini..." 
                value={newLogText}
                onChange={(e) => setNewLogText(e.target.value)}
                className="text-sm resize-none h-11 py-2 rounded-xl border-slate-200"
              />
              <Button type="submit" size="sm" className="h-11 px-3 shrink-0 rounded-xl">
                <MessageSquarePlus className="h-4.5 w-4.5" />
              </Button>
            </div>
          </form>

          {/* Timeline List */}
          <div className="flex-grow overflow-y-auto py-2 space-y-4 pr-1 scrollbar-thin">
            {selectedClientData?.logs && selectedClientData.logs.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">Belum ada log/keterangan yang tercatat.</p>
            ) : (
              <div className="relative border-l border-slate-150 pl-3 ml-2 space-y-4 py-1 text-xs">
                {selectedClientData?.logs.map((log) => (
                  <div key={log.id} className="relative">
                    {/* Timeline dot */}
                    <div className="absolute -left-[17px] top-1 h-2.5 w-2.5 rounded-full bg-slate-400 border-2 border-white" />
                    
                    <div className="flex justify-between items-center text-[10px] text-slate-400 font-medium mb-0.5">
                      <span>{formatDate(log.createdAt)}</span>
                    </div>
                    <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-100/60 font-sans">
                      {log.logText}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Shadcn AlertDialog for Delete Confirmation */}
      <AlertDialog open={!!deleteClientId} onOpenChange={(open) => !open && setDeleteClientId(null)}>
        <AlertDialogContent className="max-w-sm rounded-2xl p-6">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg">Konfirmasi Hapus</AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              Apakah Anda yakin ingin menghapus data client ini secara permanen? Seluruh riwayat log aktivitas client ini juga akan ikut terhapus dan tidak dapat dikembalikan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex flex-row items-center gap-2 justify-end mt-2">
            <AlertDialogCancel className="text-xs m-0" size="sm">Batal</AlertDialogCancel>
            <AlertDialogAction 
              variant="destructive" 
              size="sm" 
              className="text-xs bg-rose-600 hover:bg-rose-700 text-white" 
              onClick={() => deleteClientId && handleDelete(deleteClientId)}
            >
              Hapus Permanen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
