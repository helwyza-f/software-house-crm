'use client';

import React, { useState, useEffect, startTransition } from 'react';
import { 
  getClients, 
  getClientWithLogs, 
  createClient, 
  updateClient, 
  deleteClient, 
  addClientLog,
  getCustomFields,
  saveCustomFields,
  ClientWithLogs
} from './actions';
import { Client } from '@/lib/db';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
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
  X
} from 'lucide-react';

export default function Dashboard() {
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  
  // Custom global variables/fields
  const [customFields, setCustomFields] = useState<string[]>([]);
  const [newFieldName, setNewFieldName] = useState('');

  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isLogsOpen, setIsLogsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  // Form states
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    businessName: '',
    address: '',
    category: 'Medium' as 'High' | 'Medium' | 'Low',
    initialLog: '',
    customValues: {} as Record<string, string>
  });
  
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [selectedClientData, setSelectedClientData] = useState<ClientWithLogs | null>(null);
  const [newLogText, setNewLogText] = useState('');

  // Fetch clients function
  const fetchClients = () => {
    startTransition(async () => {
      const res = await getClients(search, categoryFilter);
      if (res.success && res.data) {
        setClients(res.data);
      } else {
        toast.error(res.error || 'Gagal memuat data client');
      }
    });
  };

  // Fetch custom fields
  const fetchCustomFields = async () => {
    const res = await getCustomFields();
    if (res.success && res.data) {
      setCustomFields(res.data);
    }
  };

  useEffect(() => {
    fetchClients();
  }, [search, categoryFilter]);

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

  // Create client handler
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.phone || !formData.businessName) {
      toast.error('Nama, No HP, dan Nama Usaha wajib diisi');
      return;
    }

    const res = await createClient({
      name: formData.name,
      phone: formData.phone,
      businessName: formData.businessName,
      address: formData.address,
      category: formData.category,
      customValues: JSON.stringify(formData.customValues)
    }, formData.initialLog);

    if (res.success) {
      toast.success('Client baru berhasil didaftarkan');
      setIsAddOpen(false);
      resetForm();
      fetchClients();
    } else {
      toast.error(res.error || 'Gagal menambahkan client');
    }
  };

  // Edit client button handler
  const startEdit = (client: Client) => {
    setSelectedClientId(client.id);
    let parsedValues = {};
    try {
      parsedValues = JSON.parse(client.customValues || '{}');
    } catch {
      parsedValues = {};
    }
    setFormData({
      name: client.name,
      phone: client.phone,
      businessName: client.businessName,
      address: client.address,
      category: client.category,
      initialLog: '',
      customValues: parsedValues
    });
    setIsEditOpen(true);
  };

  // Update client handler
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClientId) return;

    const res = await updateClient(selectedClientId, {
      name: formData.name,
      phone: formData.phone,
      businessName: formData.businessName,
      address: formData.address,
      category: formData.category,
      customValues: JSON.stringify(formData.customValues)
    });

    if (res.success) {
      toast.success('Data client berhasil diupdate');
      setIsEditOpen(false);
      resetForm();
      fetchClients();
    } else {
      toast.error(res.error || 'Gagal mengupdate client');
    }
  };

  // Delete client handler
  const handleDelete = async (id: number) => {
    if (confirm('Apakah Anda yakin ingin menghapus client ini beserta semua lognya?')) {
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
    }
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

  // Add global custom field configuration
  const handleAddCustomField = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newFieldName.trim();
    if (!cleanName) return;

    if (customFields.includes(cleanName)) {
      toast.error('Variabel dengan nama ini sudah ada');
      return;
    }

    const updated = [...customFields, cleanName];
    const res = await saveCustomFields(updated);
    if (res.success) {
      setCustomFields(updated);
      setNewFieldName('');
      toast.success(`Variabel custom "${cleanName}" ditambahkan`);
    } else {
      toast.error(res.error || 'Gagal menambahkan variabel');
    }
  };

  // Delete global custom field configuration
  const handleRemoveCustomField = async (fieldToRemove: string) => {
    if (confirm(`Apakah Anda yakin ingin menghapus variabel "${fieldToRemove}"? Data tersimpan pada client lama tidak akan hilang, tapi variabel ini tidak akan muncul lagi di input form.`)) {
      const updated = customFields.filter(f => f !== fieldToRemove);
      const res = await saveCustomFields(updated);
      if (res.success) {
        setCustomFields(updated);
        toast.success(`Variabel "${fieldToRemove}" berhasil dihapus`);
      } else {
        toast.error('Gagal menghapus variabel');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      phone: '',
      businessName: '',
      address: '',
      category: 'Medium',
      initialLog: '',
      customValues: {}
    });
    setSelectedClientId(null);
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
            <Button 
              variant="outline" 
              size="icon" 
              className="rounded-full h-9 w-9 text-slate-600 hover:bg-slate-50 border-slate-200" 
              onClick={() => setIsSettingsOpen(true)}
              title="Konfigurasi Variabel"
            >
              <Settings className="h-4.5 w-4.5" />
            </Button>
            <Button 
              size="sm" 
              className="rounded-full shadow-sm" 
              onClick={() => { resetForm(); setIsAddOpen(true); }}
            >
              <Plus className="h-4 w-4 mr-1" /> Client Baru
            </Button>
          </div>
        </div>
        <p className="text-xs text-slate-500">
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
          <span className="text-xs text-slate-400 flex items-center gap-1 mr-1">
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
              onClick={() => setCategoryFilter(btn.value)}
              className={`text-xs px-3 py-1.5 rounded-full font-medium transition-all ${
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
      <main className="flex-grow">
        {clients.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 border border-dashed border-slate-200 rounded-2xl bg-white text-center gap-3 max-w-md mx-auto">
            <User className="h-10 w-10 text-slate-300" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-slate-700">Belum ada data client</p>
              <p className="text-xs text-slate-400 max-w-[240px]">
                Tambahkan client potensial pertama Anda untuk mulai mencatat.
              </p>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-1 text-xs" 
              onClick={() => { resetForm(); setIsAddOpen(true); }}
            >
              Tambah Client
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {clients.map((client) => {
              // Parse custom fields if any
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
                        <CardDescription className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
                          <Building2 className="h-3.5 w-3.5 text-slate-400" /> {client.businessName}
                        </CardDescription>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="px-4 py-0 pb-3 text-xs space-y-2 text-slate-500">
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

                      {/* Display Custom Fields */}
                      {filledCustoms.length > 0 && (
                        <div className="pt-2 border-t border-slate-100/80 mt-2 flex flex-col gap-1">
                          {filledCustoms.map(([label, val]) => (
                            <div key={label} className="flex justify-between items-center text-[10px] bg-slate-50 border border-slate-100/50 p-1 px-2 rounded-lg">
                              <span className="font-semibold text-slate-400 uppercase tracking-wider">{label}</span>
                              <span className="text-slate-700 font-medium">{val}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </div>
                  
                  <CardFooter className="px-4 py-3 bg-slate-50/50 rounded-b-2xl border-t border-slate-100/50 flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 flex items-center gap-1">
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
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-slate-600 hover:text-amber-600 hover:bg-amber-50 rounded-lg"
                        onClick={() => startEdit(client)}
                        title="Edit Data"
                      >
                        <Edit3 className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                        onClick={() => handleDelete(client.id)}
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
        )}
      </main>

      {/* Footer Branding */}
      <footer className="text-center py-4">
        <p className="text-[10px] text-slate-400 font-mono">LeadManager v1.1 • SQLite DB</p>
      </footer>

      {/* Add Client Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-sm rounded-2xl p-6 max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg">Tambah Client Baru</DialogTitle>
            <DialogDescription className="text-xs">
              Masukkan detail client potensial Anda untuk mulai merekam progress.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="add-name" className="text-xs">Nama Client *</Label>
              <Input 
                id="add-name"
                placeholder="cth. Pak Budi" 
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className="text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="add-phone" className="text-xs">No HP (WhatsApp) *</Label>
              <Input 
                id="add-phone"
                placeholder="cth. 081234567890" 
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                required
                className="text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="add-business" className="text-xs">Nama Usaha *</Label>
              <Input 
                id="add-business"
                placeholder="cth. PT Maju Bersama" 
                value={formData.businessName}
                onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                required
                className="text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="add-address" className="text-xs">Alamat</Label>
              <Input 
                id="add-address"
                placeholder="cth. Jl. Jendral Sudirman No. 10" 
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="add-category" className="text-xs">Kategori Potensi</Label>
              <Select 
                value={formData.category} 
                onValueChange={(val) => { if (val) setFormData({ ...formData, category: val as 'High' | 'Medium' | 'Low' }); }}
              >
                <SelectTrigger id="add-category" className="text-sm w-full">
                  <SelectValue placeholder="Pilih potensi" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="High" className="text-sm">🔥 High Potential</SelectItem>
                  <SelectItem value="Medium" className="text-sm">⚡ Medium Potential</SelectItem>
                  <SelectItem value="Low" className="text-sm">❄️ Low Potential</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Dynamic Custom Fields Inputs */}
            {customFields.map((field) => (
              <div key={field} className="space-y-1.5">
                <Label htmlFor={`add-custom-${field}`} className="text-xs">{field} (Opsional)</Label>
                <Input 
                  id={`add-custom-${field}`}
                  placeholder={`Masukkan ${field}...`}
                  value={formData.customValues[field] || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    customValues: {
                      ...formData.customValues,
                      [field]: e.target.value
                    }
                  })}
                  className="text-sm"
                />
              </div>
            ))}

            <div className="space-y-1.5">
              <Label htmlFor="add-log" className="text-xs">Keterangan / Log Awal</Label>
              <Textarea 
                id="add-log"
                placeholder="cth. Butuh website e-commerce & aplikasi android, budget sekitar 50jt..." 
                value={formData.initialLog}
                onChange={(e) => setFormData({ ...formData, initialLog: e.target.value })}
                className="text-sm resize-none h-20"
              />
            </div>
            <DialogFooter className="pt-2 text-left">
              <Button type="submit" className="w-full text-sm">Simpan Client</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Client Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-sm rounded-2xl p-6 max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg">Edit Data Client</DialogTitle>
            <DialogDescription className="text-xs">
              Perbarui detail client yang dipilih di bawah ini.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="edit-name" className="text-xs">Nama Client *</Label>
              <Input 
                id="edit-name"
                placeholder="Nama Client" 
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className="text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-phone" className="text-xs">No HP *</Label>
              <Input 
                id="edit-phone"
                placeholder="No HP" 
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                required
                className="text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-business" className="text-xs">Nama Usaha *</Label>
              <Input 
                id="edit-business"
                placeholder="Nama Usaha" 
                value={formData.businessName}
                onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                required
                className="text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-address" className="text-xs">Alamat</Label>
              <Input 
                id="edit-address"
                placeholder="Alamat" 
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-category" className="text-xs">Kategori Potensi</Label>
              <Select 
                value={formData.category} 
                onValueChange={(val) => { if (val) setFormData({ ...formData, category: val as 'High' | 'Medium' | 'Low' }); }}
              >
                <SelectTrigger id="edit-category" className="text-sm w-full">
                  <SelectValue placeholder="Pilih potensi" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="High" className="text-sm">🔥 High Potential</SelectItem>
                  <SelectItem value="Medium" className="text-sm">⚡ Medium Potential</SelectItem>
                  <SelectItem value="Low" className="text-sm">❄️ Low Potential</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Dynamic Custom Fields Inputs */}
            {customFields.map((field) => (
              <div key={field} className="space-y-1.5">
                <Label htmlFor={`edit-custom-${field}`} className="text-xs">{field} (Opsional)</Label>
                <Input 
                  id={`edit-custom-${field}`}
                  placeholder={`Masukkan ${field}...`}
                  value={formData.customValues[field] || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    customValues: {
                      ...formData.customValues,
                      [field]: e.target.value
                    }
                  })}
                  className="text-sm"
                />
              </div>
            ))}

            <DialogFooter className="pt-2 text-left">
              <Button type="submit" className="w-full text-sm">Update Client</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Logs History / Detail Dialog */}
      <Dialog open={isLogsOpen} onOpenChange={setIsLogsOpen}>
        <DialogContent className="max-w-sm rounded-2xl p-6 flex flex-col max-h-[85vh]">
          <DialogHeader className="shrink-0">
            <DialogTitle className="text-lg flex items-center justify-between">
              <span>Log Aktivitas</span>
              {selectedClientData && getCategoryBadge(selectedClientData.category)}
            </DialogTitle>
            <DialogDescription className="text-xs text-left">
              {selectedClientData?.name} ({selectedClientData?.businessName})
            </DialogDescription>
          </DialogHeader>

          {/* Add Log Form */}
          <form onSubmit={handleAddLog} className="space-y-2 py-2 shrink-0 border-b border-slate-100 pb-4">
            <Label htmlFor="new-log" className="text-xs font-semibold text-slate-700 flex items-center gap-1">
              <MessageSquarePlus className="h-3.5 w-3.5" /> Tambah Catatan Baru
            </Label>
            <div className="flex gap-2">
              <Input 
                id="new-log"
                placeholder="cth. Menghubungi via WA, tertarik follow up minggu depan..." 
                value={newLogText}
                onChange={(e) => setNewLogText(e.target.value)}
                required
                className="text-xs flex-grow"
              />
              <Button type="submit" size="sm" className="text-xs shrink-0">Kirim</Button>
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
                    <p className="text-slate-700 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-100/60 font-sans">
                      {log.logText}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Settings / Custom Fields Config Dialog */}
      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="max-w-sm rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg">Kustomisasi Variabel</DialogTitle>
            <DialogDescription className="text-xs">
              Tambahkan atau hapus variabel tambahan yang muncul secara global saat menginput data client.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            
            {/* Add Custom Field Form */}
            <form onSubmit={handleAddCustomField} className="space-y-2">
              <Label htmlFor="new-field" className="text-xs font-semibold text-slate-700">Nama Variabel Baru</Label>
              <div className="flex gap-2">
                <Input 
                  id="new-field"
                  placeholder="cth. Budget, Timeline, OS Target" 
                  value={newFieldName}
                  onChange={(e) => setNewFieldName(e.target.value)}
                  className="text-sm flex-grow"
                />
                <Button type="submit" size="sm" className="text-xs shrink-0">Tambah</Button>
              </div>
            </form>

            {/* List of Custom Fields */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-slate-700">Variabel Aktif Global</Label>
              {customFields.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-2 text-center bg-slate-50 rounded-lg border border-dashed">
                  Belum ada variabel kustom aktif.
                </p>
              ) : (
                <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
                  {customFields.map((field) => (
                    <div key={field} className="flex justify-between items-center p-2 bg-slate-50 border border-slate-100 rounded-lg text-xs">
                      <span className="font-medium text-slate-700">{field}</span>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6 text-slate-400 hover:text-rose-500 rounded-full"
                        onClick={() => handleRemoveCustomField(field)}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
          <DialogFooter className="pt-2">
            <Button onClick={() => setIsSettingsOpen(false)} className="w-full text-sm" variant="secondary">Tutup</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
