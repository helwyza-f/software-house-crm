'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  getCustomFields, 
  saveCustomFields, 
  getGlobalOptions, 
  addGlobalOption, 
  deleteGlobalOption 
} from '../actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { ChevronLeft, X } from 'lucide-react';
import Link from 'next/link';

export default function SettingsPage() {
  const router = useRouter();
  const [customFields, setCustomFields] = useState<string[]>([]);
  const [newFieldName, setNewFieldName] = useState('');

  const [globalOptions, setGlobalOptions] = useState<{ businessTypes: string[], infoSources: string[] }>({ businessTypes: [], infoSources: [] });
  const [newBusinessType, setNewBusinessType] = useState('');
  const [newInfoSource, setNewInfoSource] = useState('');

  const [loading, setLoading] = useState(true);

  const loadAllSettings = async () => {
    const [fieldsRes, optionsRes] = await Promise.all([
      getCustomFields(),
      getGlobalOptions()
    ]);
    if (fieldsRes.success && fieldsRes.data) {
      setCustomFields(fieldsRes.data);
    }
    if (optionsRes.success && optionsRes.data) {
      setGlobalOptions(optionsRes.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadAllSettings();
  }, []);

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

  const handleRemoveCustomField = async (fieldToRemove: string) => {
    if (confirm(`Apakah Anda yakin ingin menghapus variabel "${fieldToRemove}"? Data tersimpan pada client lama tidak akan hilang, tapi variabel ini tidak akan muncul lagi di input form.`)) {
      const updated = customFields.filter(f => f !== fieldToRemove);
      const res = await saveCustomFields(updated);
      if (res.success) {
        setCustomFields(updated);
        toast.success(`Variabel "${fieldToRemove}" berhasil dihapus`);
      } else {
        toast.error(res.error || 'Gagal menghapus variabel');
      }
    }
  };

  const handleAddOption = async (e: React.FormEvent, type: 'businessType' | 'infoSource') => {
    e.preventDefault();
    const value = type === 'businessType' ? newBusinessType.trim() : newInfoSource.trim();
    if (!value) return;

    const res = await addGlobalOption(type, value);
    if (res.success) {
      if (type === 'businessType') {
        setGlobalOptions(prev => ({ ...prev, businessTypes: res.data || [] }));
        setNewBusinessType('');
      } else {
        setGlobalOptions(prev => ({ ...prev, infoSources: res.data || [] }));
        setNewInfoSource('');
      }
      toast.success(`Opsi "${value}" berhasil ditambahkan`);
    } else {
      toast.error(res.error || 'Gagal menambahkan opsi');
    }
  };

  const handleDeleteOption = async (type: 'businessType' | 'infoSource', value: string) => {
    const res = await deleteGlobalOption(type, value);
    if (res.success) {
      if (type === 'businessType') {
        setGlobalOptions(prev => ({ ...prev, businessTypes: res.data || [] }));
      } else {
        setGlobalOptions(prev => ({ ...prev, infoSources: res.data || [] }));
      }
      toast.success(`Opsi "${value}" berhasil dihapus`);
    } else {
      toast.error(res.error || 'Gagal menghapus opsi');
    }
  };

  if (loading) {
    return (
      <div className="max-w-xl mx-auto w-full px-4 py-12 flex justify-center items-center">
        <p className="text-sm text-slate-500 font-medium animate-pulse">Memuat konfigurasi...</p>
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

      <Card className="border border-slate-100 shadow-sm rounded-2xl bg-white">
        <CardHeader className="p-6">
          <CardTitle className="text-xl font-bold text-slate-900">Kustomisasi CRM</CardTitle>
          <CardDescription className="text-sm text-slate-500 mt-1">
            Kelola variabel tambahan dan opsi menu dropdown global secara real-time.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 pt-0 space-y-6 divide-y divide-slate-100">
          
          {/* Section 1: Custom Fields */}
          <div className="space-y-4 pb-2">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5 pt-2">⚙️ Variabel Tambahan (Teks)</h3>
            <form onSubmit={handleAddCustomField} className="space-y-2">
              <Label htmlFor="new-field" className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Nama Variabel Baru</Label>
              <div className="flex gap-2">
                <Input 
                  id="new-field"
                  placeholder="cth. Budget, Timeline, OS Target" 
                  value={newFieldName}
                  onChange={(e) => setNewFieldName(e.target.value)}
                  className="text-base h-11 bg-slate-50/50 border-slate-200/80 rounded-xl focus-visible:ring-1"
                />
                <Button type="submit" className="text-sm h-11 px-5 rounded-xl shrink-0">Tambah</Button>
              </div>
            </form>
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Daftar Variabel Aktif</Label>
              {customFields.length === 0 ? (
                <p className="text-sm text-slate-400 italic py-3 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  Belum ada variabel kustom aktif.
                </p>
              ) : (
                <div className="space-y-2">
                  {customFields.map((field) => (
                    <div key={field} className="flex justify-between items-center p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm">
                      <span className="font-medium text-slate-700">{field}</span>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-50"
                        onClick={() => handleRemoveCustomField(field)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Section 2: Business Type Options */}
          <div className="space-y-4 pt-5 pb-2">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">💼 Opsi Jenis Usaha</h3>
            <form onSubmit={(e) => handleAddOption(e, 'businessType')} className="space-y-2">
              <Label htmlFor="new-bus-type" className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tambah Opsi Baru</Label>
              <div className="flex gap-2">
                <Input 
                  id="new-bus-type"
                  placeholder="cth. Retail, F&B, Manufacture" 
                  value={newBusinessType}
                  onChange={(e) => setNewBusinessType(e.target.value)}
                  className="text-base h-11 bg-slate-50/50 border-slate-200/80 rounded-xl focus-visible:ring-1"
                />
                <Button type="submit" className="text-sm h-11 px-5 rounded-xl shrink-0">Tambah</Button>
              </div>
            </form>
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Opsi Aktif</Label>
              <div className="space-y-2">
                {globalOptions.businessTypes.map((type) => (
                  <div key={type} className="flex justify-between items-center p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm">
                    <span className="font-medium text-slate-700">{type}</span>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-50"
                      onClick={() => handleDeleteOption('businessType', type)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Section 3: Info Source Options */}
          <div className="space-y-4 pt-5">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">📢 Opsi Sumber Informasi</h3>
            <form onSubmit={(e) => handleAddOption(e, 'infoSource')} className="space-y-2">
              <Label htmlFor="new-info-src" className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tambah Opsi Baru</Label>
              <div className="flex gap-2">
                <Input 
                  id="new-info-src"
                  placeholder="cth. TikTok, Banner, Event" 
                  value={newInfoSource}
                  onChange={(e) => setNewInfoSource(e.target.value)}
                  className="text-base h-11 bg-slate-50/50 border-slate-200/80 rounded-xl focus-visible:ring-1"
                />
                <Button type="submit" className="text-sm h-11 px-5 rounded-xl shrink-0">Tambah</Button>
              </div>
            </form>
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Opsi Aktif</Label>
              <div className="space-y-2">
                {globalOptions.infoSources.map((source) => (
                  <div key={source} className="flex justify-between items-center p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm">
                    <span className="font-medium text-slate-700">{source}</span>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-50"
                      onClick={() => handleDeleteOption('infoSource', source)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </CardContent>
      </Card>
    </div>
  );
}
