'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  getUsers, 
  createUserAccount, 
  updateUserAccount, 
  deleteUserAccount,
  getSession
} from '../actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { ChevronLeft, Trash2, Edit3, Plus, UserPlus, Key, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

interface UserData {
  id: number;
  username: string;
  role: 'super_admin' | 'admin' | 'staff';
  canViewAll: boolean;
  createdAt: string;
}

export default function UserManagementPage() {
  const router = useRouter();
  const [users, setUsers] = useState<UserData[]>([]);
  const [currentUser, setCurrentUser] = useState<{ id: number; username: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Form states
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'admin' | 'staff' | 'super_admin'>('staff');
  const [canViewAll, setCanViewAll] = useState(true);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);

  const loadData = async () => {
    setLoading(true);
    const [usersRes, sessionRes] = await Promise.all([
      getUsers(),
      getSession()
    ]);

    if (usersRes.success && usersRes.data) {
      setUsers(usersRes.data as UserData[]);
    } else {
      toast.error(usersRes.error || 'Gagal memuat daftar pengguna');
      router.push('/');
    }

    if (sessionRes) {
      setCurrentUser({ id: sessionRes.id, username: sessionRes.username });
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUsername = username.trim().toLowerCase();
    if (!cleanUsername) return;

    setActionLoading(true);
    if (editingUserId) {
      // Update existing account
      const res = await updateUserAccount(editingUserId, cleanUsername, password || null, role, canViewAll);
      if (res.success) {
        toast.success(`Akun "${cleanUsername}" berhasil diperbarui`);
        resetForm();
        loadData();
      } else {
        toast.error(res.error || 'Gagal memperbarui akun');
      }
    } else {
      // Create new account
      if (!password) {
        toast.error('Password wajib diisi untuk akun baru');
        setActionLoading(false);
        return;
      }
      const res = await createUserAccount(cleanUsername, password, role, canViewAll);
      if (res.success) {
        toast.success(`Akun "${cleanUsername}" berhasil dibuat`);
        resetForm();
        loadData();
      } else {
        toast.error(res.error || 'Gagal membuat akun');
      }
    }
    setActionLoading(false);
  };

  const handleEdit = (user: UserData) => {
    setEditingUserId(user.id);
    setUsername(user.username);
    setPassword('');
    setRole(user.role);
    setCanViewAll(user.canViewAll !== false);
  };

  const handleDelete = async (id: number, uName: string) => {
    if (currentUser?.id === id) {
      toast.error('Anda tidak dapat menghapus akun Anda sendiri yang sedang aktif');
      return;
    }

    if (confirm(`Apakah Anda yakin ingin menghapus akun "${uName}" secara permanen?`)) {
      setActionLoading(true);
      const res = await deleteUserAccount(id);
      if (res.success) {
        toast.success(`Akun "${uName}" berhasil dihapus`);
        loadData();
      } else {
        toast.error(res.error || 'Gagal menghapus akun');
      }
      setActionLoading(false);
    }
  };

  const resetForm = () => {
    setEditingUserId(null);
    setUsername('');
    setPassword('');
    setRole('staff');
    setCanViewAll(true);
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  const getRoleBadge = (r: string) => {
    switch (r) {
      case 'super_admin':
        return <Badge className="bg-purple-600 text-white font-medium px-2 py-0.5">Super Admin</Badge>;
      case 'admin':
        return <Badge className="bg-blue-600 text-white font-medium px-2 py-0.5">Admin</Badge>;
      case 'staff':
        return <Badge className="bg-slate-500 text-white font-medium px-2 py-0.5">Staff</Badge>;
      default:
        return <Badge variant="secondary">{r}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="max-w-xl mx-auto w-full px-4 py-12 flex justify-center items-center">
        <p className="text-sm text-slate-500 font-medium animate-pulse">Memuat manajemen akun...</p>
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

      {/* Account form Card */}
      <Card className="border border-slate-100 shadow-sm rounded-2xl bg-white">
        <CardHeader className="p-6">
          <CardTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-slate-700" />
            {editingUserId ? 'Edit Akun Pengguna' : 'Tambah Akun Baru'}
          </CardTitle>
          <CardDescription className="text-sm text-slate-500 mt-1">
            {editingUserId 
              ? `Perbarui username, role, atau ubah password untuk akun terpilih.`
              : 'Daftarkan admin atau staff baru ke dalam sistem crm.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 pt-0">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="username" className="text-sm font-semibold text-slate-700">Username *</Label>
              <Input 
                id="username"
                placeholder="cth. budi_staff" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="text-base h-11 bg-slate-50/50 border-slate-200/80 rounded-xl focus-visible:ring-1"
              />
            </div>
            
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm font-semibold text-slate-700">
                {editingUserId ? 'Password Baru (Kosongkan jika tetap)' : 'Password *'}
              </Label>
              <Input 
                id="password"
                type="password"
                placeholder={editingUserId ? 'Masukkan password baru jika ingin diganti' : 'Minimal 6 karakter'} 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required={!editingUserId}
                className="text-base h-11 bg-slate-50/50 border-slate-200/80 rounded-xl focus-visible:ring-1"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="role" className="text-sm font-semibold text-slate-700">Role Hak Akses *</Label>
              <Select 
                value={role} 
                onValueChange={(val) => { if (val) setRole(val as 'admin' | 'staff' | 'super_admin'); }}
              >
                <SelectTrigger id="role" className="text-base h-11 bg-slate-50/50 border-slate-200/80 rounded-xl">
                  <SelectValue placeholder="Pilih Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="staff" className="text-sm">Staff (Terbatas, read-only + input log)</SelectItem>
                  <SelectItem value="admin" className="text-sm">Admin (Bisa edit client & settings)</SelectItem>
                  <SelectItem value="super_admin" className="text-sm">Super Admin (Akses penuh + kelola akun)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {role !== 'super_admin' && (
              <div className="flex items-center gap-2 pt-1.5 pb-1">
                <input 
                  type="checkbox" 
                  id="canViewAll" 
                  checked={canViewAll} 
                  onChange={(e) => setCanViewAll(e.target.checked)}
                  className="h-4.5 w-4.5 rounded border-slate-350 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                <Label htmlFor="canViewAll" className="text-sm font-semibold text-slate-700 cursor-pointer">
                  Dapat Melihat Semua Client (Kolaborasi)
                </Label>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={actionLoading} className="flex-grow text-base h-11 rounded-xl shadow-sm">
                {editingUserId ? 'Simpan Pembaruan' : 'Buat Akun'}
              </Button>
              {editingUserId && (
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={resetForm}
                  className="text-base h-11 px-5 rounded-xl"
                >
                  Batal
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Users list Card */}
      <Card className="border border-slate-100 shadow-sm rounded-2xl bg-white">
        <CardHeader className="p-6">
          <CardTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <User className="h-5 w-5 text-slate-700" />
            Daftar Pengguna Aktif
          </CardTitle>
          <CardDescription className="text-sm text-slate-500 mt-1">
            Menampilkan seluruh akun yang terdaftar dalam sistem CRM.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 pt-0">
          <div className="space-y-3">
            {users.map((user) => (
              <div key={user.id} className="flex justify-between items-center p-3 bg-slate-50 border border-slate-100 rounded-xl text-sm">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800">{user.username}</span>
                    {getRoleBadge(user.role)}
                    {user.role !== 'super_admin' && (
                      user.canViewAll !== false ? (
                        <Badge variant="outline" className="text-[10px] border-emerald-200 bg-emerald-50 text-emerald-700">Akses Semua Client</Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] border-amber-200 bg-amber-50 text-amber-700">Hanya Client Sendiri</Badge>
                      )
                    )}
                    {currentUser?.id === user.id && (
                      <span className="text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded font-mono font-bold">Aktif</span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400 font-medium">Terdaftar: {formatDate(user.createdAt)}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-slate-500 hover:text-amber-600 rounded-lg hover:bg-amber-50"
                    onClick={() => handleEdit(user)}
                    title="Edit Akun"
                  >
                    <Edit3 className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-50"
                    disabled={currentUser?.id === user.id}
                    onClick={() => handleDelete(user.id, user.username)}
                    title={currentUser?.id === user.id ? 'Tidak bisa menghapus diri sendiri' : 'Hapus Akun'}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
