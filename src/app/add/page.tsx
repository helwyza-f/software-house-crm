'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient, getCustomFields, getGlobalOptions } from '../actions';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';

export default function AddClientPage() {
  const router = useRouter();
  const [customFields, setCustomFields] = useState<string[]>([]);
  const [globalOptions, setGlobalOptions] = useState<{ businessTypes: string[], infoSources: string[] }>({ businessTypes: [], infoSources: [] });
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    businessName: '',
    address: '',
    category: 'Medium' as 'High' | 'Medium' | 'Low',
    businessType: '',
    infoSource: '',
    initialLog: '',
    customValues: {} as Record<string, string>
  });

  useEffect(() => {
    async function loadData() {
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
    }
    loadData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.phone || !formData.businessName) {
      toast.error('Nama, No HP, dan Nama Usaha wajib diisi');
      return;
    }

    setLoading(true);
    const res = await createClient({
      name: formData.name,
      phone: formData.phone,
      businessName: formData.businessName,
      address: formData.address,
      category: formData.category,
      businessType: formData.businessType,
      infoSource: formData.infoSource,
      customValues: JSON.stringify(formData.customValues)
    }, formData.initialLog);

    setLoading(false);
    if (res.success) {
      toast.success('Client baru berhasil didaftarkan');
      router.push('/');
    } else {
      toast.error(res.error || 'Gagal menambahkan client');
    }
  };

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
          <CardTitle className="text-xl font-bold text-slate-900">Tambah Client Baru</CardTitle>
          <CardDescription className="text-sm text-slate-500 mt-1">
            Masukkan detail calon client Anda untuk mulai merekam aktivitas progress.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 pt-0">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-semibold text-slate-700">Nama Client *</Label>
              <Input 
                id="name"
                placeholder="cth. Pak Budi" 
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className="text-base h-11 bg-slate-50/50 border-slate-200/80 rounded-xl focus-visible:ring-1"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-sm font-semibold text-slate-700">No HP (WhatsApp) *</Label>
              <Input 
                id="phone"
                placeholder="cth. 081234567890" 
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                required
                className="text-base h-11 bg-slate-50/50 border-slate-200/80 rounded-xl focus-visible:ring-1"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="business" className="text-sm font-semibold text-slate-700">Nama Usaha *</Label>
              <Input 
                id="business"
                placeholder="cth. PT Maju Bersama" 
                value={formData.businessName}
                onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                required
                className="text-base h-11 bg-slate-50/50 border-slate-200/80 rounded-xl focus-visible:ring-1"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address" className="text-sm font-semibold text-slate-700">Alamat Usaha</Label>
              <Input 
                id="address"
                placeholder="cth. Jl. Jendral Sudirman No. 10" 
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="text-base h-11 bg-slate-50/50 border-slate-200/80 rounded-xl focus-visible:ring-1"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="businessType" className="text-sm font-semibold text-slate-700">Jenis Usaha</Label>
              <Select 
                value={formData.businessType} 
                onValueChange={(val) => setFormData({ ...formData, businessType: val || '' })}
              >
                <SelectTrigger id="businessType" className="text-base h-11 bg-slate-50/50 border-slate-200/80 rounded-xl">
                  <SelectValue placeholder="Pilih Jenis Usaha" />
                </SelectTrigger>
                <SelectContent>
                  {globalOptions.businessTypes.map((type) => (
                    <SelectItem key={type} value={type} className="text-sm">{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="infoSource" className="text-sm font-semibold text-slate-700">Sumber Informasi</Label>
              <Select 
                value={formData.infoSource} 
                onValueChange={(val) => setFormData({ ...formData, infoSource: val || '' })}
              >
                <SelectTrigger id="infoSource" className="text-base h-11 bg-slate-50/50 border-slate-200/80 rounded-xl">
                  <SelectValue placeholder="Pilih Sumber Informasi" />
                </SelectTrigger>
                <SelectContent>
                  {globalOptions.infoSources.map((source) => (
                    <SelectItem key={source} value={source} className="text-sm">{source}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category" className="text-sm font-semibold text-slate-700">Kategori Potensi</Label>
              <Select 
                value={formData.category} 
                onValueChange={(val) => { if (val) setFormData({ ...formData, category: val as 'High' | 'Medium' | 'Low' }); }}
              >
                <SelectTrigger id="category" className="text-base h-11 bg-slate-50/50 border-slate-200/80 rounded-xl">
                  <SelectValue placeholder="Pilih Kategori" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="High" className="text-sm">🔥 High Potential</SelectItem>
                  <SelectItem value="Medium" className="text-sm">⚡ Medium Potential</SelectItem>
                  <SelectItem value="Low" className="text-sm">❄️ Low Potential</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Dynamic Custom Fields */}
            {customFields.map((field) => (
              <div key={field} className="space-y-2">
                <Label htmlFor={`custom-${field}`} className="text-sm font-semibold text-slate-700">{field} (Opsional)</Label>
                <Input 
                  id={`custom-${field}`}
                  placeholder={`Masukkan ${field}...`}
                  value={formData.customValues[field] || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    customValues: {
                      ...formData.customValues,
                      [field]: e.target.value
                    }
                  })}
                  className="text-base h-11 bg-slate-50/50 border-slate-200/80 rounded-xl focus-visible:ring-1"
                />
              </div>
            ))}

            <div className="space-y-2">
              <Label htmlFor="log" className="text-sm font-semibold text-slate-700">Keterangan / Log Awal</Label>
              <Textarea 
                id="log"
                placeholder="cth. Butuh website e-commerce & aplikasi android, budget sekitar 50jt..." 
                value={formData.initialLog}
                onChange={(e) => setFormData({ ...formData, initialLog: e.target.value })}
                className="text-base min-h-[100px] resize-none bg-slate-50/50 border-slate-200/80 rounded-xl focus-visible:ring-1"
              />
            </div>

            <Button type="submit" disabled={loading} className="w-full text-base h-11 rounded-xl shadow-sm mt-2">
              {loading ? 'Menyimpan...' : 'Simpan Client'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
