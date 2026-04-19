import { useEffect, useRef, useState } from 'react';
import {
  Search, Upload, UserPlus, Pencil, Trash2, X, Check, Loader2,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { useAuth } from '@/contexts/AuthContext';

const API = 'http://127.0.0.1:8000/api';

// ─── Types ────────────────────────────────────────────────────────────────────

type Role = 'student' | 'teacher' | 'admin';

interface TeacherProfile { teacher_code: string; department: string | null; title: string | null; }
interface StudentProfile { student_code: string; major: string | null; cohort_year: number | null; class_name: string | null; }

interface AdminUser {
  id: number;
  name: string;
  username: string | null;
  email: string;
  role: Role;
  is_active: boolean;
  created_at: string | null;
  profile?: TeacherProfile | StudentProfile;
}

interface UserForm {
  name: string;
  username: string;
  email: string;
  password: string;
  role: Role;
  // teacher fields
  teacher_code: string;
  department: string;
  title: string;
  // student fields
  student_code: string;
  major: string;
  cohort_year: string;
  class_name: string;
}

const emptyForm: UserForm = {
  name: '', username: '', email: '', password: '', role: 'student',
  teacher_code: '', department: '', title: '',
  student_code: '', major: '', cohort_year: '', class_name: '',
};

const roleLabel: Record<Role, string> = { student: 'Sinh viên', teacher: 'Giáo viên', admin: 'Admin' };
const roleBadge: Record<Role, 'default' | 'secondary' | 'outline'> = {
  admin: 'default', teacher: 'secondary', student: 'outline',
};

// ─── Import Result Modal ───────────────────────────────────────────────────────

function ImportResultModal({
  result,
  onClose,
}: {
  result: { success: number; failed: number; errors: { row: number; error: string }[] };
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-background rounded-xl shadow-xl p-6 w-full max-w-lg max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Kết quả Import Excel</h2>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="w-4 h-4" /></Button>
        </div>
        <p className="text-sm mb-3">
          ✅ <strong>{result.success}</strong> tài khoản tạo thành công.
          {result.failed > 0 && (
            <> &nbsp;❌ <strong>{result.failed}</strong> dòng bị lỗi.</>
          )}
        </p>
        {result.errors.length > 0 && (
          <div className="overflow-y-auto text-sm border rounded-md divide-y">
            {result.errors.map((e) => (
              <div key={e.row} className="px-3 py-2">
                <span className="font-medium text-destructive">Dòng {e.row}</span>: {e.error}
              </div>
            ))}
          </div>
        )}
        <Button className="mt-4 self-end" onClick={onClose}>Đóng</Button>
      </div>
    </div>
  );
}

// ─── User Modal (Add / Edit) ──────────────────────────────────────────────────

function UserModal({
  initial,
  isEdit,
  onSave,
  onClose,
  saving,
}: {
  initial: UserForm;
  isEdit: boolean;
  onSave: (data: UserForm) => void;
  onClose: () => void;
  saving: boolean;
}) {
  const [form, setForm] = useState<UserForm>(initial);
  const set = (k: keyof UserForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-background rounded-xl shadow-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold">{isEdit ? 'Chỉnh sửa người dùng' : 'Thêm người dùng mới'}</h2>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="w-4 h-4" /></Button>
        </div>

        <div className="space-y-3">
          {/* Base fields */}
          <div>
            <label className="text-sm font-medium">Họ tên *</label>
            <Input value={form.name} onChange={set('name')} placeholder="Nguyễn Văn A" />
          </div>
          <div>
            <label className="text-sm font-medium">Username</label>
            <Input value={form.username} onChange={set('username')} placeholder="nguyen.vana" />
          </div>
          <div>
            <label className="text-sm font-medium">Email *</label>
            <Input value={form.email} onChange={set('email')} type="email" placeholder="a@tdtu.edu.vn" />
          </div>
          <div>
            <label className="text-sm font-medium">Mật khẩu {isEdit ? '(để trống = giữ nguyên)' : '*'}</label>
            <Input value={form.password} onChange={set('password')} type="password" placeholder="••••••" />
          </div>
          <div>
            <label className="text-sm font-medium">Vai trò *</label>
            <select
              value={form.role}
              onChange={set('role')}
              className="w-full border rounded-md px-3 py-2 text-sm bg-background mt-0.5"
            >
              <option value="student">Sinh viên</option>
              <option value="teacher">Giáo viên</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          {/* Teacher-specific fields */}
          {form.role === 'teacher' && (
            <div className="border rounded-md p-3 space-y-2 bg-muted/30">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Thông tin giáo viên</p>
              <div>
                <label className="text-sm font-medium">Mã giáo viên {!isEdit && '*'}</label>
                <Input value={form.teacher_code} onChange={set('teacher_code')} placeholder="GV001" />
              </div>
              <div>
                <label className="text-sm font-medium">Khoa / Bộ môn</label>
                <Input value={form.department} onChange={set('department')} placeholder="Công nghệ Thông tin" />
              </div>
              <div>
                <label className="text-sm font-medium">Chức danh</label>
                <Input value={form.title} onChange={set('title')} placeholder="Giảng viên" />
              </div>
            </div>
          )}

          {/* Student-specific fields */}
          {form.role === 'student' && (
            <div className="border rounded-md p-3 space-y-2 bg-muted/30">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Thông tin sinh viên</p>
              <div>
                <label className="text-sm font-medium">Mã sinh viên {!isEdit && '*'}</label>
                <Input value={form.student_code} onChange={set('student_code')} placeholder="SV00001" />
              </div>
              <div>
                <label className="text-sm font-medium">Ngành học</label>
                <Input value={form.major} onChange={set('major')} placeholder="Kỹ thuật Phần mềm" />
              </div>
              <div>
                <label className="text-sm font-medium">Khóa học (năm)</label>
                <Input value={form.cohort_year} onChange={set('cohort_year')} type="number" placeholder="2023" />
              </div>
              <div>
                <label className="text-sm font-medium">Lớp</label>
                <Input value={form.class_name} onChange={set('class_name')} placeholder="SE23A" />
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={onClose} disabled={saving}>Huỷ</Button>
          <Button onClick={() => onSave(form)} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
            Lưu
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminUsersPage() {
  const { token } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<Role | 'all'>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showAddModal, setShowAddModal] = useState(false);
  const [editUser, setEditUser] = useState<AdminUser | null>(null);
  const [saving, setSaving] = useState(false);

  const importRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<null | {
    success: number; failed: number; errors: { row: number; error: string }[];
  }>(null);

  const headers = { Authorization: `Bearer ${token}` };

  // ── Fetch users ──────────────────────────────────────────────────────────────
  const fetchUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const url = roleFilter !== 'all'
        ? `${API}/admin/users/?role=${roleFilter}`
        : `${API}/admin/users/`;
      const res = await fetch(url, { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Fetch failed');
      setUsers(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, [roleFilter]);

  // ── Create user ──────────────────────────────────────────────────────────────
  const handleCreate = async (form: UserForm) => {
    if (!form.name || !form.email || !form.password) {
      alert('Vui lòng nhập đầy đủ Họ tên, Email và Mật khẩu!');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`${API}/admin/users/`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Create failed');
      setShowAddModal(false);
      fetchUsers();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  };

  // ── Update user ──────────────────────────────────────────────────────────────
  const handleUpdate = async (form: UserForm) => {
    if (!editUser) return;
    setSaving(true);
    try {
      const body: any = { name: form.name, username: form.username, email: form.email, role: form.role };
      if (form.password) body.password = form.password;
      // Profile fields
      if (form.role === 'teacher') {
        if (form.teacher_code) body.teacher_code = form.teacher_code;
        if (form.department) body.department = form.department;
        if (form.title) body.title = form.title;
      } else if (form.role === 'student') {
        if (form.student_code) body.student_code = form.student_code;
        if (form.major) body.major = form.major;
        if (form.cohort_year) body.cohort_year = parseInt(form.cohort_year);
        if (form.class_name) body.class_name = form.class_name;
      }
      const res = await fetch(`${API}/admin/users/${editUser.id}/`, {
        method: 'PATCH',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Update failed');
      setEditUser(null);
      fetchUsers();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  };

  // ── Delete user ──────────────────────────────────────────────────────────────
  const handleDelete = async (u: AdminUser) => {
    if (!confirm(`Xoá tài khoản "${u.name}" (${u.email})? Thao tác này không thể hoàn tác.`)) return;
    try {
      const res = await fetch(`${API}/admin/users/${u.id}/`, { method: 'DELETE', headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Delete failed');
      fetchUsers();
    } catch (e: any) {
      alert(e.message);
    }
  };

  // ── Toggle active ─────────────────────────────────────────────────────────────
  const handleToggleActive = async (u: AdminUser) => {
    try {
      const res = await fetch(`${API}/admin/users/${u.id}/`, {
        method: 'PATCH',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !u.is_active }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Update failed');
      fetchUsers();
    } catch (e: any) {
      alert(e.message);
    }
  };

  // ── Import Excel ─────────────────────────────────────────────────────────────
  const handleImport = async (file: File) => {
    setImporting(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(`${API}/admin/import-excel/users/`, { method: 'POST', headers, body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Import failed');
      // data.success / data.failed / data.errors  (corrected mapping)
      setImportResult({
        success: data.success ?? 0,
        failed: data.failed ?? 0,
        errors: data.errors ?? [],
      });
      fetchUsers();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setImporting(false);
      if (importRef.current) importRef.current.value = '';
    }
  };

  // Build initial form from existing user when editing
  const buildEditForm = (u: AdminUser): UserForm => {
    const base: UserForm = {
      name: u.name, username: u.username || '', email: u.email, password: '', role: u.role,
      teacher_code: '', department: '', title: '',
      student_code: '', major: '', cohort_year: '', class_name: '',
    };
    if (u.role === 'teacher' && u.profile) {
      const tp = u.profile as TeacherProfile;
      base.teacher_code = tp.teacher_code || '';
      base.department   = tp.department || '';
      base.title        = tp.title || '';
    } else if (u.role === 'student' && u.profile) {
      const sp = u.profile as StudentProfile;
      base.student_code = sp.student_code || '';
      base.major        = sp.major || '';
      base.cohort_year  = sp.cohort_year ? String(sp.cohort_year) : '';
      base.class_name   = sp.class_name || '';
    }
    return base;
  };

  // ── Filtered list ─────────────────────────────────────────────────────────────
  const filtered = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      (u.username || '').toLowerCase().includes(search.toLowerCase()),
  );

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 overflow-y-auto h-full">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Quản lý người dùng</h1>
            <p className="text-muted-foreground text-sm">Quản lý tài khoản sinh viên, giáo viên và admin</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {/* Import Excel */}
            <label>
              <input
                ref={importRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleImport(f);
                }}
                disabled={importing}
              />
              <Button variant="outline" className="gap-2 cursor-pointer" asChild disabled={importing}>
                <span>
                  {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  Import Excel
                </span>
              </Button>
            </label>

            {/* Add user */}
            <Button className="gap-2" onClick={() => setShowAddModal(true)}>
              <UserPlus className="w-4 h-4" />
              Thêm mới
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Tìm tên, email, username..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as any)}
            className="border rounded-md px-3 py-2 text-sm bg-background"
          >
            <option value="all">Tất cả vai trò</option>
            <option value="student">Sinh viên</option>
            <option value="teacher">Giáo viên</option>
            <option value="admin">Admin</option>
          </select>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 p-3 rounded-md bg-destructive/10 text-destructive text-sm">{error}</div>
        )}

        {/* Table */}
        <Card>
          {loading ? (
            <div className="p-8 text-center text-muted-foreground flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Đang tải...
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Họ tên</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Vai trò</TableHead>
                  <TableHead>Mã số</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead className="text-right">Hành động</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-10">
                      Không tìm thấy người dùng nào.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((u) => {
                    const profileCode = u.role === 'teacher'
                      ? (u.profile as TeacherProfile | undefined)?.teacher_code
                      : u.role === 'student'
                      ? (u.profile as StudentProfile | undefined)?.student_code
                      : null;
                    return (
                      <TableRow key={u.id}>
                        <TableCell className="font-medium">{u.name}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">{u.username || '—'}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">{u.email}</TableCell>
                        <TableCell>
                          <Badge variant={roleBadge[u.role]}>{roleLabel[u.role]}</Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {profileCode || '—'}
                        </TableCell>
                        <TableCell>
                          <button
                            onClick={() => handleToggleActive(u)}
                            className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
                              u.is_active
                                ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                                : 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100'
                            }`}
                          >
                            {u.is_active ? 'Hoạt động' : 'Vô hiệu'}
                          </button>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-foreground"
                              onClick={() => setEditUser(u)}
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              onClick={() => handleDelete(u)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          )}
        </Card>

        {/* Count */}
        {!loading && (
          <p className="mt-3 text-xs text-muted-foreground text-right">
            Tổng: {filtered.length} / {users.length} người dùng
          </p>
        )}
      </div>

      {/* Modals */}
      {showAddModal && (
        <UserModal
          initial={emptyForm}
          isEdit={false}
          onSave={handleCreate}
          onClose={() => setShowAddModal(false)}
          saving={saving}
        />
      )}
      {editUser && (
        <UserModal
          initial={buildEditForm(editUser)}
          isEdit={true}
          onSave={handleUpdate}
          onClose={() => setEditUser(null)}
          saving={saving}
        />
      )}
      {importResult && (
        <ImportResultModal result={importResult} onClose={() => setImportResult(null)} />
      )}
    </div>
  );
}
