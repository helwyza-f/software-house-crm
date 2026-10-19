'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { getClientWithLogs, updateClient, changeClientStage, getCustomFields, getGlobalOptions } from '../../actions';
import { STAGES, LOST_REASONS } from '@/lib/stages';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';

interface EditProps {
  params: Promise<{ id: string }>;
}

export default function EditClientPage({ params }: EditProps) {
  const router = useRouter();
  const resolvedParams = use(params);
  const clientId = parseInt(resolvedParams.id, 10);

  const [customFields, setCustomFields] = useState<string[]>([]);
  const [globalOptions, setGlobalOptions] = useState<{ businessTypes: string[], infoSources: string[] }>({ businessTypes: [], infoSources: [] });
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    businessName: '',
    address: '',
    category: 'Medium' as 'High' | 'Medium' | 'Low',
    businessType: '',
    infoSource: '',
    customValues: {} as Record<string, string>
  });

  const [stageData, setStageData] = useState({ stage: 'Baru', dealValue: '', lostReason: '' });
  const [originalStage, setOriginalStage] = useState({ stage: 'Baru', dealValue: '', lostReason: '' });

  useEffect(() => {
    async function loadData() {
      // Load variables lists
      const [fieldsRes, optionsRes, clientRes] = await Promise.all([
        getCustomFields(),
        getGlobalOptions(),
        getClientWithLogs(clientId)
      ]);

      if (fieldsRes.success && fieldsRes.data) {
        setCustomFields(fieldsRes.data);
      }
      if (optionsRes.success && optionsRes.data) {
        setGlobalOptions(optionsRes.data);
      }

      if (clientRes.success && clientRes.data) {
        const client = clientRes.data;
        let parsedCustom = {};
        try {
          parsedCustom = JSON.parse(client.customValues || '{}');
        } catch {
          parsedCustom = {};
        }

        setFormData({
          name: client.name,
          phone: client.phone,
          businessName: client.businessName,
          address: client.address || '',
          category: client.category,
          businessType: client.businessType || '',
          infoSource: client.infoSource || '',
          customValues: parsedCustom
        });
        const loadedStage = {
          stage: client.stage || 'Baru',
          dealValue: client.dealValue != null ? String(Math.round(Number(client.dealValue))) : '',
          lostReason: client.lostReason || ''
        };
        setStageData(loadedStage);
        setOriginalStage(loadedStage);
      } else {
        toast.error(clientRes.error || 'Client tidak ditemukan');
        router.push('/');
      }
      setFetching(false);
    }

    if (clientId) {
      loadData();
    }
  }, [clientId, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.phone || !formData.businessName) {
      toast.error('Nama, No HP, dan Nama Usaha wajib diisi');
      return;
    }

    if (stageData.stage === 'Batal' && !stageData.lostReason.trim()) {
      toast.error('Alasan batal wajib diisi');
      return;
    }

    setLoading(true);
    const res = await updateClient(clientId, {
      name: formData.name,
      phone: formData.phone,
      businessName: formData.businessName,
      address: formData.address,
      category: formData.category,
      businessType: formData.businessType,
      infoSource: formData.infoSource,
      customValues: JSON.stringify(formData.customValues)
    });

    if (res.success) {
      const stageChanged =
        stageData.stage !== originalStage.stage ||
        (stageData.stage === 'Closing' && stageData.dealValue !== originalStage.dealValue) ||
        (stageData.stage === 'Batal' && stageData.lostReason.trim() !== originalStage.lostReason);

      if (stageChanged) {
        const stageRes = await changeClientStage(clientId, stageData.stage, {
          dealValue: stageData.dealValue ? parseInt(stageData.dealValue, 10) : null,
          lostReason: stageData.lostReason
        });
        if (!stageRes.success) {
          setLoading(false);
          toast.error(stageRes.error || 'Data tersimpan, tetapi stage gagal diubah');
          return;
        }
      }
    }

    setLoading(false);
    if (res.success) {
      toast.success('Data client berhasil diperbarui');
      router.push('/');
    } else {
      toast.error(res.error || 'Gagal memperbarui data client');
    }
  };

  if (fetching) {
    return (
      <div className="max-w-xl mx-auto w-full px-4 py-12 flex justify-center items-center">
        <p className="text-sm text-slate-500 font-medium animate-pulse">Memuat data client...</p>
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
          <CardTitle className="text-xl font-bold text-slate-900">Edit Data Client</CardTitle>
          <CardDescription className="text-sm text-slate-500 mt-1">
            Perbarui detail client yang Anda pilih di bawah ini.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 pt-0">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-semibold text-slate-700">Nama Client *</Label>
              <Input 
                id="name"
                placeholder="Nama Client" 
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
                placeholder="No HP" 
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
                placeholder="Nama Usaha" 
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
                placeholder="Alamat" 
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

            <div className="space-y-3 rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
              <div className="space-y-2">
                <Label htmlFor="stage" className="text-sm font-semibold text-slate-700">Stage</Label>
                <Select
                  value={stageData.stage}
                  onValueChange={(val) => { if (val) setStageData({ ...stageData, stage: val }); }}
                >
                  <SelectTrigger id="stage" className="text-base h-11 bg-white border-slate-200/80 rounded-xl">
                    <SelectValue placeholder="Pilih Stage" />
                  </SelectTrigger>
                  <SelectContent>
                    {STAGES.map((stg) => (
                      <SelectItem key={stg} value={stg} className="text-sm">{stg}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {stageData.stage === 'Closing' && (
                <div className="space-y-2">
                  <Label htmlFor="dealValue" className="text-sm font-semibold text-slate-700">Nilai Deal (Rp, opsional)</Label>
                  <Input
                    id="dealValue"
                    inputMode="numeric"
                    placeholder="contoh: 15.000.000"
                    value={stageData.dealValue ? Number(stageData.dealValue).toLocaleString('id-ID') : ''}
                    onChange={(e) => setStageData({ ...stageData, dealValue: e.target.value.replace(/\D/g, '') })}
                    className="text-base h-11 bg-white border-slate-200/80 rounded-xl focus-visible:ring-1"
                  />
                </div>
              )}

              {stageData.stage === 'Batal' && (
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-slate-700">Alasan Batal *</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {LOST_REASONS.filter((r) => r !== 'Lainnya').map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setStageData({ ...stageData, lostReason: r })}
                        className={cn(
                          'text-xs px-2.5 py-1 rounded-full border transition-colors',
                          stageData.lostReason === r ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        )}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                  <Input
                    placeholder="Atau tulis alasan lain..."
                    value={stageData.lostReason}
                    onChange={(e) => setStageData({ ...stageData, lostReason: e.target.value })}
                    className="text-base h-11 bg-white border-slate-200/80 rounded-xl focus-visible:ring-1"
                  />
                </div>
              )}
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

            <Button type="submit" disabled={loading} className="w-full text-base h-11 rounded-xl shadow-sm mt-2">
              {loading ? 'Menyimpan...' : 'Perbarui Client'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
