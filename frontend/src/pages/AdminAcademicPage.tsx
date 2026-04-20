/**
 * AdminAcademicPage – Quản lý học vụ cho Admin
 * Tabs: Môn học | Lớp học | Phân công GV | Ghi danh SV
 */
import { useEffect, useRef, useState } from 'react';
import {
  BookOpen, LayoutGrid, UserCheck, GraduationCap,
  Plus, Pencil, Trash2, X, Check, Loader2, ChevronDown, Upload,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { useAuth } from '@/contexts/AuthContext';
import { useAppDialog } from '@/contexts/DialogContext';

const API = 'http://127.0.0.1:8000/api';

type Tab = 'subjects' | 'sections' | 'assignments' | 'enrollments';

// ─── Modal helper ────────────────────────────────────────────────────────────

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-background rounded-xl shadow-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold">{title}</h2>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="w-4 h-4" /></Button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-sm font-medium block mb-1">{label}</label>
      {children}
    </div>
  );
}

// ─── Shared Import Component ──────────────────────────────────────────────────

function ExcelImportButton({ token, entity, onImportSuccess }: { token: string, entity: string, onImportSuccess: () => void }) {
  const [importing, setImporting] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);
  const { showAlert } = useAppDialog();

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(`${API}/admin/import-excel/${entity}/`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Import failed');
      
      const errMsgs = data.errors?.length ? `\nLỗi:\n${data.errors.map((e:any)=>`Dòng ${e.row}: ${e.error}`).join('\n')}` : '';
      await showAlert(`Import hoàn tất!\nThành công: ${data.success}\nThất bại: ${data.failed}${errMsgs}`);
      
      onImportSuccess();
    } catch (err: any) {
      await showAlert(`Import lỗi: ${err.message}`);
    } finally {
      setImporting(false);
      if (importRef.current) importRef.current.value = '';
    }
  };

  return (
    <>
      <input type="file" accept=".xlsx,.xls" className="hidden" ref={importRef} onChange={handleImport} />
      <Button variant="outline" size="sm" onClick={() => importRef.current?.click()} disabled={importing}>
        {importing ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Upload className="w-4 h-4 mr-1" />}
        Import Excel
      </Button>
    </>
  );
}

// ─── SUBJECTS TAB ─────────────────────────────────────────────────────────────

interface Subject {
  id: number; code: string; name: string; description: string | null;
  credits: number | null; is_active: boolean;
}

function SubjectsTab({ token }: { token: string }) {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<Subject | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ code: '', name: '', description: '', credits: '', is_active: true });
  const h = { Authorization: `Bearer ${token}` };
  const { showAlert, showConfirm } = useAppDialog();

  const load = async () => {
    setLoading(true);
    const r = await fetch(`${API}/admin/subjects/`, { headers: h });
    if (r.ok) setSubjects(await r.json());
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => {
    setEditItem(null);
    setForm({ code: '', name: '', description: '', credits: '', is_active: true });
    setShowModal(true);
  };

  const openEdit = (s: Subject) => {
    setEditItem(s);
    setForm({ code: s.code, name: s.name, description: s.description || '', credits: s.credits?.toString() || '', is_active: s.is_active });
    setShowModal(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      const body = { ...form, credits: form.credits ? parseInt(form.credits) : null };
      const url = editItem ? `${API}/admin/subjects/${editItem.id}/` : `${API}/admin/subjects/`;
      const method = editItem ? 'PATCH' : 'POST';
      const r = await fetch(url, { method, headers: { ...h, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      setShowModal(false);
      load();
    } catch (e: any) { await showAlert(e.message); }
    setSaving(false);
  };

  const del = async (s: Subject) => {
    if (!(await showConfirm(`Xóa môn "${s.name}"?`))) return;
    await fetch(`${API}/admin/subjects/${s.id}/`, { method: 'DELETE', headers: h });
    load();
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-muted-foreground">{subjects.length} môn học</p>
        <div className="flex gap-2">
          <ExcelImportButton token={token} entity="subjects" onImportSuccess={load} />
          <Button size="sm" onClick={openAdd}><Plus className="w-4 h-4 mr-1" />Thêm môn học</Button>
        </div>
      </div>
      <Card>
        <Table>
          <TableHeader><TableRow>
            <TableHead>Mã</TableHead><TableHead>Tên môn học</TableHead>
            <TableHead>Số tín chỉ</TableHead><TableHead>Trạng thái</TableHead>
            <TableHead className="text-right">Hành động</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8"><Loader2 className="w-4 h-4 animate-spin inline mr-2" />Đang tải...</TableCell></TableRow>
            ) : subjects.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Chưa có môn học nào.</TableCell></TableRow>
            ) : subjects.map(s => (
              <TableRow key={s.id}>
                <TableCell className="font-mono font-bold text-primary">{s.code}</TableCell>
                <TableCell>
                  <p className="font-medium">{s.name}</p>
                  {s.description && <p className="text-xs text-muted-foreground truncate max-w-xs">{s.description}</p>}
                </TableCell>
                <TableCell>{s.credits ?? '—'}</TableCell>
                <TableCell><Badge variant={s.is_active ? 'default' : 'secondary'}>{s.is_active ? 'Hoạt động' : 'Tạm dừng'}</Badge></TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(s)}><Pencil className="w-3.5 h-3.5" /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-destructive" onClick={() => del(s)}><Trash2 className="w-3.5 h-3.5" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {showModal && (
        <Modal title={editItem ? 'Sửa môn học' : 'Thêm môn học mới'} onClose={() => setShowModal(false)}>
          <div className="space-y-3">
            <Field label="Mã môn *"><Input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="SE101" disabled={!!editItem} /></Field>
            <Field label="Tên môn học *"><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Kỹ thuật Phần mềm" /></Field>
            <Field label="Mô tả"><Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></Field>
            <Field label="Số tín chỉ"><Input type="number" value={form.credits} onChange={e => setForm(f => ({ ...f, credits: e.target.value }))} /></Field>
            <Field label="Trạng thái">
              <select value={form.is_active ? 'true' : 'false'} onChange={e => setForm(f => ({ ...f, is_active: e.target.value === 'true' }))} className="w-full border rounded-md px-3 py-2 text-sm bg-background">
                <option value="true">Hoạt động</option>
                <option value="false">Tạm dừng</option>
              </select>
            </Field>
          </div>
          <div className="flex justify-end gap-2 mt-5">
            <Button variant="outline" onClick={() => setShowModal(false)} disabled={saving}>Huỷ</Button>
            <Button onClick={save} disabled={saving}>{saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Check className="w-4 h-4 mr-1" />}Lưu</Button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── CLASS SECTIONS TAB ───────────────────────────────────────────────────────

interface Section {
  id: number; subject_id: number; subject_code: string; subject_name: string;
  section_code: string; semester: string; academic_year: string;
  section_name: string | null; status: string; teacher_name: string | null; student_count: number;
}

function SectionsTab({ token }: { token: string }) {
  const [sections, setSections] = useState<Section[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterSubjectId, setFilterSubjectId] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<Section | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ subject_id: '', section_code: '', semester: 'HK1', academic_year: '2024-2025', section_name: '', status: 'active' });
  const h = { Authorization: `Bearer ${token}` };
  const { showAlert, showConfirm } = useAppDialog();

  const load = async () => {
    setLoading(true);
    const url = filterSubjectId ? `${API}/admin/class-sections/?subject_id=${filterSubjectId}` : `${API}/admin/class-sections/`;
    const [rS, rSub] = await Promise.all([fetch(url, { headers: h }), fetch(`${API}/admin/subjects/`, { headers: h })]);
    if (rS.ok) setSections(await rS.json());
    if (rSub.ok) setSubjects(await rSub.json());
    setLoading(false);
  };

  useEffect(() => { load(); }, [filterSubjectId]);

  const openAdd = () => {
    setEditItem(null);
    setForm({ subject_id: subjects[0]?.id.toString() || '', section_code: '', semester: 'HK1', academic_year: '2024-2025', section_name: '', status: 'active' });
    setShowModal(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      const body = editItem
        ? { section_name: form.section_name, status: form.status }
        : { ...form, subject_id: parseInt(form.subject_id) };
      const url = editItem ? `${API}/admin/class-sections/${editItem.id}/` : `${API}/admin/class-sections/`;
      const method = editItem ? 'PATCH' : 'POST';
      const r = await fetch(url, { method, headers: { ...h, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      setShowModal(false); load();
    } catch (e: any) { await showAlert(e.message); }
    setSaving(false);
  };

  const del = async (cs: Section) => {
    if (!(await showConfirm(`Xóa lớp "${cs.section_name || cs.section_code}"?`))) return;
    await fetch(`${API}/admin/class-sections/${cs.id}/`, { method: 'DELETE', headers: h });
    load();
  };

  const statusBadge = (s: string) => s === 'active' ? 'default' : 'secondary';

  return (
    <div>
      <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
        <select value={filterSubjectId} onChange={e => setFilterSubjectId(e.target.value)} className="border rounded-md px-3 py-2 text-sm bg-background">
          <option value="">Tất cả môn học</option>
          {subjects.map(s => <option key={s.id} value={s.id}>{s.code} – {s.name}</option>)}
        </select>
        <div className="flex gap-2">
          <ExcelImportButton token={token} entity="class_sections" onImportSuccess={load} />
          <Button size="sm" onClick={openAdd}><Plus className="w-4 h-4 mr-1" />Thêm lớp học</Button>
        </div>
      </div>
      <Card>
        <Table>
          <TableHeader><TableRow>
            <TableHead>Lớp / Mã</TableHead><TableHead>Môn học</TableHead>
            <TableHead>Học kỳ</TableHead><TableHead>GV phụ trách</TableHead>
            <TableHead>SV</TableHead><TableHead>Trạng thái</TableHead>
            <TableHead className="text-right">Hành động</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8"><Loader2 className="w-4 h-4 animate-spin inline mr-2" />Đang tải...</TableCell></TableRow>
            ) : sections.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Chưa có lớp học nào.</TableCell></TableRow>
            ) : sections.map(cs => (
              <TableRow key={cs.id}>
                <TableCell><p className="font-medium">{cs.section_name || cs.section_code}</p><p className="text-xs text-muted-foreground">{cs.section_code}</p></TableCell>
                <TableCell><span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{cs.subject_code}</span> {cs.subject_name}</TableCell>
                <TableCell className="text-sm">{cs.semester} / {cs.academic_year}</TableCell>
                <TableCell className="text-sm">{cs.teacher_name || <span className="text-muted-foreground italic">Chưa phân công</span>}</TableCell>
                <TableCell>{cs.student_count}</TableCell>
                <TableCell><Badge variant={statusBadge(cs.status)}>{cs.status === 'active' ? 'Đang mở' : cs.status}</Badge></TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditItem(cs); setForm({ ...form, section_name: cs.section_name || '', status: cs.status }); setShowModal(true); }}><Pencil className="w-3.5 h-3.5" /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-destructive" onClick={() => del(cs)}><Trash2 className="w-3.5 h-3.5" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {showModal && (
        <Modal title={editItem ? 'Sửa lớp học' : 'Thêm lớp học mới'} onClose={() => setShowModal(false)}>
          <div className="space-y-3">
            {!editItem && <>
              <Field label="Môn học *">
                <select value={form.subject_id} onChange={e => setForm(f => ({ ...f, subject_id: e.target.value }))} className="w-full border rounded-md px-3 py-2 text-sm bg-background">
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.code} – {s.name}</option>)}
                </select>
              </Field>
              <Field label="Mã lớp *"><Input value={form.section_code} onChange={e => setForm(f => ({ ...f, section_code: e.target.value }))} placeholder="01" /></Field>
              <Field label="Học kỳ *"><Input value={form.semester} onChange={e => setForm(f => ({ ...f, semester: e.target.value }))} placeholder="HK1" /></Field>
              <Field label="Năm học *"><Input value={form.academic_year} onChange={e => setForm(f => ({ ...f, academic_year: e.target.value }))} placeholder="2024-2025" /></Field>
            </>}
            <Field label="Tên lớp"><Input value={form.section_name} onChange={e => setForm(f => ({ ...f, section_name: e.target.value }))} placeholder="SE23A" /></Field>
            <Field label="Trạng thái">
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className="w-full border rounded-md px-3 py-2 text-sm bg-background">
                <option value="active">Đang mở</option>
                <option value="closed">Đã đóng</option>
                <option value="archived">Lưu trữ</option>
              </select>
            </Field>
          </div>
          <div className="flex justify-end gap-2 mt-5">
            <Button variant="outline" onClick={() => setShowModal(false)} disabled={saving}>Huỷ</Button>
            <Button onClick={save} disabled={saving}>{saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Check className="w-4 h-4 mr-1" />}Lưu</Button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── TEACHING ASSIGNMENTS TAB ─────────────────────────────────────────────────

interface TeacherProfile { id: number; name: string; teacher_code: string; department: string | null; }
interface Assignment { id: number; class_section_id: number; section_name: string; subject_name: string; teacher_profile_id: number; teacher_name: string; teacher_code: string; }

function AssignmentsTab({ token }: { token: string }) {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [teachers, setTeachers] = useState<TeacherProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ class_section_id: '', teacher_profile_id: '' });
  const h = { Authorization: `Bearer ${token}` };
  const { showAlert, showConfirm } = useAppDialog();

  const load = async () => {
    setLoading(true);
    const [rA, rS, rT] = await Promise.all([
      fetch(`${API}/admin/teaching-assignments/`, { headers: h }),
      fetch(`${API}/admin/class-sections/`, { headers: h }),
      fetch(`${API}/admin/teacher-profiles/`, { headers: h }),
    ]);
    if (rA.ok) setAssignments(await rA.json());
    if (rS.ok) setSections(await rS.json());
    if (rT.ok) setTeachers(await rT.json());
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    setSaving(true);
    try {
      const r = await fetch(`${API}/admin/teaching-assignments/`, {
        method: 'POST',
        headers: { ...h, 'Content-Type': 'application/json' },
        body: JSON.stringify({ class_section_id: parseInt(form.class_section_id), teacher_profile_id: parseInt(form.teacher_profile_id) }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      setShowModal(false); load();
    } catch (e: any) { await showAlert(e.message); }
    setSaving(false);
  };

  const del = async (a: Assignment) => {
    if (!(await showConfirm(`Gỡ phân công GV khỏi lớp "${a.section_name}"?`))) return;
    await fetch(`${API}/admin/teaching-assignments/${a.id}/`, { method: 'DELETE', headers: h });
    load();
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-muted-foreground">{assignments.length} phân công</p>
        <div className="flex gap-2">
          <ExcelImportButton token={token} entity="teaching_assignments" onImportSuccess={load} />
          <Button size="sm" onClick={() => { setForm({ class_section_id: sections[0]?.id.toString() || '', teacher_profile_id: teachers[0]?.id.toString() || '' }); setShowModal(true); }}>
            <Plus className="w-4 h-4 mr-1" />Phân công giáo viên
          </Button>
        </div>
      </div>
      <Card>
        <Table>
          <TableHeader><TableRow>
            <TableHead>Lớp học</TableHead><TableHead>Môn học</TableHead>
            <TableHead>Giáo viên</TableHead><TableHead>Mã GV</TableHead>
            <TableHead className="text-right">Hành động</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8"><Loader2 className="w-4 h-4 animate-spin inline mr-2" />Đang tải...</TableCell></TableRow>
            ) : assignments.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Chưa có phân công nào.</TableCell></TableRow>
            ) : assignments.map(a => (
              <TableRow key={a.id}>
                <TableCell className="font-medium">{a.section_name}</TableCell>
                <TableCell>{a.subject_name}</TableCell>
                <TableCell>{a.teacher_name}</TableCell>
                <TableCell className="font-mono text-sm">{a.teacher_code}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-destructive" onClick={() => del(a)}><Trash2 className="w-3.5 h-3.5" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {showModal && (
        <Modal title="Phân công giáo viên dạy lớp" onClose={() => setShowModal(false)}>
          <div className="space-y-3">
            <Field label="Lớp học *">
              <select value={form.class_section_id} onChange={e => setForm(f => ({ ...f, class_section_id: e.target.value }))} className="w-full border rounded-md px-3 py-2 text-sm bg-background">
                {sections.map(s => <option key={s.id} value={s.id}>{s.section_name || s.section_code} – {s.subject_name}</option>)}
              </select>
            </Field>
            <Field label="Giáo viên *">
              <select value={form.teacher_profile_id} onChange={e => setForm(f => ({ ...f, teacher_profile_id: e.target.value }))} className="w-full border rounded-md px-3 py-2 text-sm bg-background">
                {teachers.map(t => <option key={t.id} value={t.id}>{t.teacher_code} – {t.name}</option>)}
              </select>
            </Field>
          </div>
          <div className="flex justify-end gap-2 mt-5">
            <Button variant="outline" onClick={() => setShowModal(false)} disabled={saving}>Huỷ</Button>
            <Button onClick={save} disabled={saving}>{saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Check className="w-4 h-4 mr-1" />}Phân công</Button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── ENROLLMENTS TAB ──────────────────────────────────────────────────────────

interface StudentProfile { id: number; name: string; student_code: string; }
interface EnrollmentItem { id: number; class_section_id: number; section_name: string; subject_name: string; student_profile_id: number; student_name: string; student_code: string; status: string; enrolled_at: string; }

function EnrollmentsTab({ token }: { token: string }) {
  const [enrollments, setEnrollments] = useState<EnrollmentItem[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [filterSectionId, setFilterSectionId] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ class_section_id: '', student_profile_id: '' });
  const h = { Authorization: `Bearer ${token}` };
  const { showAlert, showConfirm } = useAppDialog();

  const load = async () => {
    setLoading(true);
    const url = filterSectionId
      ? `${API}/admin/enrollments/?section_id=${filterSectionId}`
      : `${API}/admin/enrollments/`;
    const [rE, rS, rSt] = await Promise.all([
      fetch(url, { headers: h }),
      fetch(`${API}/admin/class-sections/`, { headers: h }),
      fetch(`${API}/admin/student-profiles/`, { headers: h }),
    ]);
    if (rE.ok) setEnrollments(await rE.json());
    if (rS.ok) setSections(await rS.json());
    if (rSt.ok) setStudents(await rSt.json());
    setLoading(false);
  };

  useEffect(() => { load(); }, [filterSectionId]);

  const save = async () => {
    setSaving(true);
    try {
      const r = await fetch(`${API}/admin/enrollments/`, {
        method: 'POST',
        headers: { ...h, 'Content-Type': 'application/json' },
        body: JSON.stringify({ class_section_id: parseInt(form.class_section_id), student_profile_id: parseInt(form.student_profile_id) }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      setShowModal(false); load();
    } catch (e: any) { await showAlert(e.message); }
    setSaving(false);
  };

  const del = async (e: EnrollmentItem) => {
    if (!(await showConfirm(`Xoá ghi danh của "${e.student_name}" khỏi lớp "${e.section_name}"?`))) return;
    await fetch(`${API}/admin/enrollments/${e.id}/`, { method: 'DELETE', headers: h });
    load();
  };

  return (
    <div>
      <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
        <select value={filterSectionId} onChange={e => setFilterSectionId(e.target.value)} className="border rounded-md px-3 py-2 text-sm bg-background">
          <option value="">Tất cả lớp học</option>
          {sections.map(s => <option key={s.id} value={s.id}>{s.section_name || s.section_code} – {s.subject_name}</option>)}
        </select>
        <div className="flex gap-2">
          <ExcelImportButton token={token} entity="enrollments" onImportSuccess={load} />
          <Button size="sm" onClick={() => { setForm({ class_section_id: sections[0]?.id.toString() || '', student_profile_id: students[0]?.id.toString() || '' }); setShowModal(true); }}>
            <Plus className="w-4 h-4 mr-1" />Ghi danh sinh viên
          </Button>
        </div>
      </div>
      <Card>
        <Table>
          <TableHeader><TableRow>
            <TableHead>Sinh viên</TableHead><TableHead>Mã SV</TableHead>
            <TableHead>Lớp học</TableHead><TableHead>Môn học</TableHead>
            <TableHead>Trạng thái</TableHead><TableHead>Ngày ghi danh</TableHead>
            <TableHead className="text-right">Hành động</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8"><Loader2 className="w-4 h-4 animate-spin inline mr-2" />Đang tải...</TableCell></TableRow>
            ) : enrollments.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Chưa có ghi danh nào.</TableCell></TableRow>
            ) : enrollments.map(e => (
              <TableRow key={e.id}>
                <TableCell className="font-medium">{e.student_name}</TableCell>
                <TableCell className="font-mono text-sm">{e.student_code}</TableCell>
                <TableCell>{e.section_name}</TableCell>
                <TableCell>{e.subject_name}</TableCell>
                <TableCell><Badge variant={e.status === 'enrolled' ? 'default' : 'secondary'}>{e.status === 'enrolled' ? 'Đang học' : e.status === 'dropped' ? 'Đã rút' : 'Hoàn thành'}</Badge></TableCell>
                <TableCell className="text-sm text-muted-foreground">{new Date(e.enrolled_at).toLocaleDateString('vi-VN')}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-destructive" onClick={() => del(e)}><Trash2 className="w-3.5 h-3.5" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {showModal && (
        <Modal title="Ghi danh sinh viên vào lớp" onClose={() => setShowModal(false)}>
          <div className="space-y-3">
            <Field label="Lớp học *">
              <select value={form.class_section_id} onChange={e => setForm(f => ({ ...f, class_section_id: e.target.value }))} className="w-full border rounded-md px-3 py-2 text-sm bg-background">
                {sections.map(s => <option key={s.id} value={s.id}>{s.section_name || s.section_code} – {s.subject_name}</option>)}
              </select>
            </Field>
            <Field label="Sinh viên *">
              <select value={form.student_profile_id} onChange={e => setForm(f => ({ ...f, student_profile_id: e.target.value }))} className="w-full border rounded-md px-3 py-2 text-sm bg-background">
                {students.map(s => <option key={s.id} value={s.id}>{s.student_code} – {s.name}</option>)}
              </select>
            </Field>
          </div>
          <div className="flex justify-end gap-2 mt-5">
            <Button variant="outline" onClick={() => setShowModal(false)} disabled={saving}>Huỷ</Button>
            <Button onClick={save} disabled={saving}>{saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Check className="w-4 h-4 mr-1" />}Ghi danh</Button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
  { key: 'subjects',     label: 'Môn học',           icon: BookOpen },
  { key: 'sections',     label: 'Lớp học',            icon: LayoutGrid },
  { key: 'assignments',  label: 'Phân công GV',       icon: UserCheck },
  { key: 'enrollments',  label: 'Ghi danh SV',        icon: GraduationCap },
];

export default function AdminAcademicPage() {
  const { token } = useAuth();
  const [tab, setTab] = useState<Tab>('subjects');

  return (
    <div className="p-6 overflow-y-auto h-full">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Quản lý Học vụ</h1>
          <p className="text-muted-foreground text-sm">Môn học, lớp học, phân công giảng dạy và ghi danh sinh viên</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px
                ${tab === t.key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'}`}
            >
              <t.icon className="w-4 h-4" />
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {tab === 'subjects'    && <SubjectsTab    token={token!} />}
        {tab === 'sections'    && <SectionsTab    token={token!} />}
        {tab === 'assignments' && <AssignmentsTab token={token!} />}
        {tab === 'enrollments' && <EnrollmentsTab token={token!} />}
      </div>
    </div>
  );
}
