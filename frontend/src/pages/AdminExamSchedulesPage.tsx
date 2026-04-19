/**
 * AdminExamSchedulesPage – Quản lý lịch thi với Calendar thời gian thực
 * Features:
 *  - Calendar view (tháng) – các ngày có lịch thi được highlight
 *  - Click ngày → xem danh sách thi trong ngày đó
 *  - CRUD: Thêm / Sửa / Xóa lịch thi (chỉ sửa/xóa kỳ thi chưa qua)
 *  - Form: môn thi, lớp, loại kỳ, ngày giờ, phòng thi, ghi chú
 */
import { useEffect, useState, useMemo } from 'react';
import {
  ChevronLeft, ChevronRight, Plus, Pencil, Trash2, X,
  Check, Loader2, CalendarDays,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';

const API = 'http://127.0.0.1:8000/api';

// ─── Types ─────────────────────────────────────────────────────────────────────
interface Subject { id: number; code: string; name: string; }
interface ClassSectionItem { id: number; subject_id: number; section_name: string | null; section_code: string; subject_name: string; semester: string; academic_year: string; }
interface ExamSchedule {
  id: number;
  subject_id: number; subject_code: string; subject_name: string;
  class_section_id: number | null; class_section_name: string | null;
  exam_type: string;
  exam_date: string;
  start_time: string; end_time: string;
  room: string | null; note: string | null;
  created_at: string | null;
}

interface ExamForm {
  subject_id: string;
  class_section_id: string;
  exam_type: string;
  exam_date: string;
  start_time: string;
  end_time: string;
  room: string;
  note: string;
}
const emptyForm: ExamForm = {
  subject_id: '', class_section_id: '', exam_type: 'final',
  exam_date: '', start_time: '07:30', end_time: '09:30',
  room: '', note: '',
};

const EXAM_TYPE_LABELS: Record<string, string> = {
  midterm: 'Giữa kỳ', final: 'Cuối kỳ', makeup: 'Học lại', other: 'Khác',
};
const EXAM_TYPE_COLORS: Record<string, string> = {
  midterm: 'bg-yellow-500', final: 'bg-blue-600', makeup: 'bg-orange-500', other: 'bg-gray-400',
};

const MONTHS_VN = ['Tháng 1','Tháng 2','Tháng 3','Tháng 4','Tháng 5','Tháng 6',
                   'Tháng 7','Tháng 8','Tháng 9','Tháng 10','Tháng 11','Tháng 12'];
const DOW_VN = ['CN','T2','T3','T4','T5','T6','T7'];

// ─── Exam Form Modal ────────────────────────────────────────────────────────────
function ExamModal({
  initial, isEdit,
  subjects, sections,
  onSave, onClose, saving,
}: {
  initial: ExamForm; isEdit: boolean;
  subjects: Subject[]; sections: ClassSectionItem[];
  onSave: (f: ExamForm) => void; onClose: () => void; saving: boolean;
}) {
  const [form, setForm] = useState<ExamForm>(initial);
  const set = (k: keyof ExamForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const val = e.target.value;
    if (k === 'subject_id') {
      setForm(f => ({ ...f, subject_id: val, class_section_id: '' }));
    } else {
      setForm(f => ({ ...f, [k]: val }));
    }
  };

  const filteredSections = form.subject_id ? sections.filter(s => s.subject_id === +form.subject_id) : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-background rounded-2xl shadow-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold">{isEdit ? 'Sửa lịch thi' : 'Thêm lịch thi mới'}</h2>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="w-4 h-4" /></Button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium">Môn học *</label>
            <select value={form.subject_id} onChange={set('subject_id')}
              className="w-full border rounded-md px-3 py-2 text-sm bg-background mt-0.5">
              <option value="">-- Chọn môn --</option>
              {subjects.map(s => <option key={s.id} value={s.id}>{s.code} – {s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium">Lớp học phần</label>
            <select value={form.class_section_id} onChange={set('class_section_id')}
              className="w-full border rounded-md px-3 py-2 text-sm bg-background mt-0.5"
              disabled={!form.subject_id}>
              <option value="">-- Tất cả lớp --</option>
              {filteredSections.map(s => (
                <option key={s.id} value={s.id}>
                  {s.section_name || s.section_code} – {s.semester}/{s.academic_year}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium">Loại kỳ thi *</label>
            <select value={form.exam_type} onChange={set('exam_type')}
              className="w-full border rounded-md px-3 py-2 text-sm bg-background mt-0.5">
              <option value="midterm">Giữa kỳ</option>
              <option value="final">Cuối kỳ</option>
              <option value="makeup">Học lại</option>
              <option value="other">Khác</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium">Ngày thi *</label>
            <Input type="date" value={form.exam_date} onChange={set('exam_date')} min={new Date().toISOString().slice(0,10)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">Giờ bắt đầu *</label>
              <Input type="time" value={form.start_time} onChange={set('start_time')} />
            </div>
            <div>
              <label className="text-sm font-medium">Giờ kết thúc *</label>
              <Input type="time" value={form.end_time} onChange={set('end_time')} />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Phòng thi</label>
            <Input value={form.room} onChange={set('room')} placeholder="VD: A2.01" />
          </div>
          <div>
            <label className="text-sm font-medium">Ghi chú</label>
            <textarea
              value={form.note} onChange={set('note')}
              rows={2}
              placeholder="Ghi chú thêm..."
              className="w-full border rounded-md px-3 py-2 text-sm bg-background resize-none"
            />
          </div>
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

// ─── Calendar Grid ──────────────────────────────────────────────────────────────
function CalendarGrid({
  year, month, schedules, selectedDate, onSelectDate,
}: {
  year: number; month: number;
  schedules: ExamSchedule[];
  selectedDate: string | null;
  onSelectDate: (d: string) => void;
}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const examDates = useMemo(() => {
    const s = new Set<string>();
    schedules.forEach(e => s.add(e.exam_date));
    return s;
  }, [schedules]);

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDow = firstDay.getDay();

  const cells: (number | null)[] = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= lastDay.getDate(); d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const dateStr = (d: number) =>
    `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

  return (
    <div className="select-none">
      <div className="grid grid-cols-7 mb-1">
        {DOW_VN.map(d => (
          <div key={d} className="text-center text-xs text-muted-foreground font-medium py-2">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((d, i) => {
          if (d === null) return <div key={i} />;
          const ds = dateStr(d);
          const hasExam = examDates.has(ds);
          const cellDate = new Date(year, month, d);
          const isToday = cellDate.getTime() === today.getTime();
          const isSelected = ds === selectedDate;
          const isPast = cellDate < today;

          return (
            <button
              key={i}
              onClick={() => onSelectDate(ds)}
              className={[
                'relative rounded-lg h-12 flex flex-col items-center justify-center transition-all text-sm font-medium',
                isSelected
                  ? 'bg-primary text-primary-foreground shadow-md scale-105'
                  : isToday
                  ? 'bg-primary/10 text-primary border border-primary/30'
                  : hasExam
                  ? 'bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200/60 dark:bg-blue-900/20 dark:text-blue-300'
                  : isPast
                  ? 'text-muted-foreground/40 hover:bg-muted/20'
                  : 'hover:bg-muted/50',
              ].join(' ')}
            >
              {d}
              {hasExam && (
                <span className={`absolute bottom-1 block w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-blue-500'}`} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main ───────────────────────────────────────────────────────────────────────
export default function AdminExamSchedulesPage() {
  const { token } = useAuth();
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());

  const [schedules, setSchedules] = useState<ExamSchedule[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [sections, setSections] = useState<ClassSectionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [editExam, setEditExam] = useState<ExamSchedule | null>(null);
  const [saving, setSaving] = useState(false);

  const h = { Authorization: `Bearer ${token}` };

  const fetchSchedules = async () => {
    try {
      const m = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`;
      const res = await fetch(`${API}/admin/exam-schedules/?month=${m}`, { headers: h });
      const data = await res.json();
      if (res.ok) setSchedules(Array.isArray(data) ? data : []);
    } catch {}
  };

  useEffect(() => {
    Promise.all([
      fetch(`${API}/admin/subjects/`, { headers: h }),
      fetch(`${API}/admin/class-sections/`, { headers: h }),
    ]).then(async ([sr, cr]) => {
      const [sd, cd] = await Promise.all([sr.json(), cr.json()]);
      if (sr.ok) setSubjects(sd);
      if (cr.ok) setSections(cd);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchSchedules().finally(() => setLoading(false));
  }, [viewYear, viewMonth]);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const dayExams = useMemo(() =>
    selectedDate ? schedules.filter(e => e.exam_date === selectedDate) : [],
    [selectedDate, schedules]);

  const isPastExam = (exam: ExamSchedule) => {
    const examDate = new Date(exam.exam_date + 'T00:00:00');
    const todayClear = new Date(); todayClear.setHours(0, 0, 0, 0);
    return examDate < todayClear;
  };

  const handleCreate = async (form: ExamForm) => {
    if (!form.subject_id || !form.exam_date || !form.start_time || !form.end_time) {
      alert('Vui lòng nhập đầy đủ môn học, ngày và giờ thi!');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`${API}/admin/exam-schedules/`, {
        method: 'POST',
        headers: { ...h, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject_id: +form.subject_id,
          class_section_id: form.class_section_id ? +form.class_section_id : null,
          exam_type: form.exam_type,
          exam_date: form.exam_date,
          start_time: form.start_time,
          end_time: form.end_time,
          room: form.room || null,
          note: form.note || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Create failed');
      setShowModal(false);
      setSelectedDate(form.exam_date);
      fetchSchedules();
    } catch (e: any) { alert(e.message); }
    finally { setSaving(false); }
  };

  const handleUpdate = async (form: ExamForm) => {
    if (!editExam) return;
    setSaving(true);
    try {
      const res = await fetch(`${API}/admin/exam-schedules/${editExam.id}/`, {
        method: 'PATCH',
        headers: { ...h, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exam_type: form.exam_type,
          exam_date: form.exam_date,
          start_time: form.start_time,
          end_time: form.end_time,
          room: form.room || null,
          note: form.note || null,
          class_section_id: form.class_section_id ? +form.class_section_id : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Update failed');
      setEditExam(null);
      fetchSchedules();
    } catch (e: any) { alert(e.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (exam: ExamSchedule) => {
    if (!confirm(`Xoá lịch thi "${exam.subject_name}" ngày ${exam.exam_date}?`)) return;
    try {
      const res = await fetch(`${API}/admin/exam-schedules/${exam.id}/`, { method: 'DELETE', headers: h });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Delete failed');
      if (dayExams.length === 1) setSelectedDate(null);
      fetchSchedules();
    } catch (e: any) { alert(e.message); }
  };

  const buildEditForm = (e: ExamSchedule): ExamForm => ({
    subject_id: String(e.subject_id),
    class_section_id: e.class_section_id ? String(e.class_section_id) : '',
    exam_type: e.exam_type,
    exam_date: e.exam_date,
    start_time: e.start_time.slice(0, 5),
    end_time: e.end_time.slice(0, 5),
    room: e.room || '',
    note: e.note || '',
  });

  return (
    <div className="p-6 overflow-y-auto h-full">
      <div className="max-w-6xl mx-auto">

        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <CalendarDays className="w-6 h-6 text-primary" /> Lịch thi
            </h1>
            <p className="text-muted-foreground text-sm">Quản lý lịch thi theo tháng, thêm / sửa / xoá ca thi</p>
          </div>
          <Button onClick={() => { setEditExam(null); setShowModal(true); }} className="gap-2">
            <Plus className="w-4 h-4" /> Thêm lịch thi
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

          {/* Calendar */}
          <div className="lg:col-span-3">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-5">
                <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-muted transition-colors">
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div className="text-center">
                  <p className="text-lg font-bold">{MONTHS_VN[viewMonth]}</p>
                  <p className="text-sm text-muted-foreground">{viewYear}</p>
                </div>
                <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-muted transition-colors">
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>

              {loading ? (
                <div className="flex items-center justify-center h-48 text-muted-foreground gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Đang tải...
                </div>
              ) : (
                <CalendarGrid
                  year={viewYear}
                  month={viewMonth}
                  schedules={schedules}
                  selectedDate={selectedDate}
                  onSelectDate={setSelectedDate}
                />
              )}

              <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground border-t pt-3">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" /> Có lịch thi
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-primary/10 border border-primary/30 inline-block" /> Hôm nay
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-primary inline-block" /> Đang chọn
                </div>
              </div>
            </Card>
          </div>

          {/* Day detail */}
          <div className="lg:col-span-2 space-y-4">
            {selectedDate ? (
              <>
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold text-foreground">
                    {new Date(selectedDate + 'T00:00:00').toLocaleDateString('vi-VN', {
                      weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric',
                    })}
                  </h2>
                  <span className="text-xs text-muted-foreground">{dayExams.length} ca thi</span>
                </div>

                {dayExams.length === 0 ? (
                  <Card className="p-8 text-center text-muted-foreground text-sm">
                    Không có lịch thi trong ngày này.
                  </Card>
                ) : (
                  dayExams.map(exam => (
                    <Card key={exam.id} className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className={`w-2 h-2 rounded-full ${EXAM_TYPE_COLORS[exam.exam_type]}`} />
                            <Badge variant="outline" className="text-xs">{EXAM_TYPE_LABELS[exam.exam_type]}</Badge>
                          </div>
                          <p className="font-semibold text-foreground">{exam.subject_name}</p>
                          <p className="text-xs text-muted-foreground">{exam.subject_code}</p>
                          {exam.class_section_name && (
                            <p className="text-xs text-muted-foreground mt-0.5">Lớp: {exam.class_section_name}</p>
                          )}
                          <div className="mt-2 flex flex-wrap gap-2 text-xs">
                            <span className="bg-muted px-2 py-0.5 rounded">
                              🕐 {exam.start_time.slice(0,5)} – {exam.end_time.slice(0,5)}
                            </span>
                            {exam.room && (
                              <span className="bg-muted px-2 py-0.5 rounded">📍 {exam.room}</span>
                            )}
                          </div>
                          {exam.note && (
                            <p className="text-xs text-muted-foreground mt-1 italic">{exam.note}</p>
                          )}
                        </div>
                        {!isPastExam(exam) && (
                          <div className="flex gap-1 shrink-0">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditExam(exam)}>
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-destructive" onClick={() => handleDelete(exam)}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        )}
                        {isPastExam(exam) && (
                          <Badge variant="secondary" className="text-xs shrink-0">Đã qua</Badge>
                        )}
                      </div>
                    </Card>
                  ))
                )}
              </>
            ) : (
              <Card className="p-10 flex flex-col items-center justify-center text-center text-muted-foreground gap-3">
                <CalendarDays className="w-12 h-12 opacity-20" />
                <p className="text-sm">Chọn một ngày trên lịch<br />để xem danh sách thi</p>
              </Card>
            )}
          </div>
        </div>
      </div>

      {showModal && (
        <ExamModal
          initial={{ ...emptyForm, exam_date: selectedDate || '' }}
          isEdit={false}
          subjects={subjects}
          sections={sections}
          onSave={handleCreate}
          onClose={() => setShowModal(false)}
          saving={saving}
        />
      )}
      {editExam && (
        <ExamModal
          initial={buildEditForm(editExam)}
          isEdit={true}
          subjects={subjects}
          sections={sections}
          onSave={handleUpdate}
          onClose={() => setEditExam(null)}
          saving={saving}
        />
      )}
    </div>
  );
}
