'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { login } from '../actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { ShieldCheck, User, Lock } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      toast.error('Username dan password wajib diisi');
      return;
    }

    setLoading(true);
    const res = await login(username, password);
    setLoading(false);

    if (res.success) {
      toast.success('Login berhasil! Selamat datang.');
      router.push('/');
      router.refresh();
    } else {
      toast.error(res.error || 'Gagal login');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50/50 p-4 w-full">
      <Card className="max-w-md w-full border border-slate-100 shadow-md rounded-2xl bg-white p-6">
        <CardHeader className="text-center p-0 pb-6">
          <div className="mx-auto h-12 w-12 rounded-full bg-slate-900 text-white flex items-center justify-center mb-3">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <CardTitle className="text-2xl font-bold text-slate-900 tracking-tight">LeadManager Login</CardTitle>
          <CardDescription className="text-sm text-slate-500 mt-1.5">
            Masuk untuk mengakses dasbor CRM Software House.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-0">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5 relative">
              <Label htmlFor="username" className="text-sm font-semibold text-slate-700">Username</Label>
              <div className="relative">
                <User className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-slate-400" />
                <Input 
                  id="username"
                  placeholder="Username" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  className="text-base h-11 pl-11 bg-slate-50/50 border-slate-200/80 rounded-xl focus-visible:ring-1"
                />
              </div>
            </div>

            <div className="space-y-1.5 relative">
              <Label htmlFor="password" className="text-sm font-semibold text-slate-700">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-slate-400" />
                <Input 
                  id="password"
                  type="password"
                  placeholder="Password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="text-base h-11 pl-11 bg-slate-50/50 border-slate-200/80 rounded-xl focus-visible:ring-1"
                />
              </div>
            </div>

            <Button type="submit" disabled={loading} className="w-full text-base h-11 rounded-xl shadow-sm mt-2">
              {loading ? 'Memproses...' : 'Masuk Dasbor'}
            </Button>
          </form>
          
          <div className="mt-6 border-t border-slate-100 pt-4 text-center">
            <p className="text-xs text-slate-400 font-medium">
              Hubungi Administrator jika belum terdaftar.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
