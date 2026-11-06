'use client';

import React from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PROVINCES, getCities } from '@/lib/regions';

const CLEAR = '__CLEAR__';

export function RegionFields({
  province,
  city,
  onChange,
}: {
  province: string;
  city: string;
  onChange: (province: string, city: string) => void;
}) {
  const cities = province ? getCities(province) : [];

  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="province" className="text-sm font-semibold text-slate-700">Provinsi</Label>
        <Select
          value={province}
          onValueChange={(val) => {
            if (!val) return;
            // Changing province resets the city selection.
            onChange(val === CLEAR ? '' : val, '');
          }}
        >
          <SelectTrigger id="province" className="text-base h-11 bg-slate-50/50 border-slate-200/80 rounded-xl">
            <SelectValue placeholder="Pilih Provinsi" />
          </SelectTrigger>
          <SelectContent>
            {province && <SelectItem value={CLEAR} className="text-sm text-slate-400">— Kosongkan —</SelectItem>}
            {PROVINCES.map((p) => (
              <SelectItem key={p} value={p} className="text-sm">{p}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="city" className="text-sm font-semibold text-slate-700">Kota / Kabupaten</Label>
        <Select
          value={city}
          disabled={!province}
          onValueChange={(val) => {
            if (!val) return;
            onChange(province, val === CLEAR ? '' : val);
          }}
        >
          <SelectTrigger id="city" className="text-base h-11 bg-slate-50/50 border-slate-200/80 rounded-xl disabled:opacity-60">
            <SelectValue placeholder={province ? 'Pilih Kota / Kabupaten' : 'Pilih provinsi dulu'} />
          </SelectTrigger>
          <SelectContent>
            {city && <SelectItem value={CLEAR} className="text-sm text-slate-400">— Kosongkan —</SelectItem>}
            {cities.map((c) => (
              <SelectItem key={c} value={c} className="text-sm">{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </>
  );
}
