/**
 * StudentExamPage – Xem lịch thi cho Sinh viên
 * Chỉ hiển thị, không có chức năng Thêm / Sửa / Xóa.
 * Sử dụng API student/exam-schedules/ – chỉ trả về lịch thi các lớp mà sinh viên đăng ký.
 */
import { useEffect, useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Loader2, CalendarDays } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';

const API = 'http://127.0.0.1:8000/api';

// ─── Types ──────────────────────────────────────────────────────────────────
interface ExamSchedule {
  id: number;
  subject_id: number;
  subject_code: string;
  subject_name: string;
  class_section_id: number | null;
  class_section_name: string | null;
  exam_type: string;
  exam_date: string;
  start_time: string;
  end_time: string;
  room: string | null;
  note: string | null;
}

const EXAM_TYPE_LABELS: Record<string, string> = {
  midterm: 'Giữa kỳ',
  final:   'Cuối kỳ',
  makeup:  'Học lại / Bổ sung',
  other:   'Khác',
};
const EXAM_TYPE_COLORS: Record<string, string> = {
  midterm: 'bg-yellow-500',
  final:   'bg-blue-600',
  makeup:  'bg-orange-500',
  other:   'bg-gray-400',
};
const EXAM_TYPE_BADGE: Record<string, string> = {
  midterm: 'text-yellow-700 bg-yellow-100 border-yellow-300',
  final:   'text-blue-700   bg-blue-100   border-blue-300',
  makeup:  'text-orange-700 bg-orange-100 border-orange-300',
  other:   'text-gray-700   bg-gray-100   border-gray-300',
};

const MONTHS_VN = [
  'Tháng 1','Tháng 2','Tháng 3','Tháng 4','Tháng 5','Tháng 6',
  'Tháng 7','Tháng 8','Tháng 9','Tháng 10','Tháng 11','Tháng 12',
];
const DOW_VN = ['CN','T2','T3','T4','T5','T6','T7'];

// ─── Calendar Grid ───────────────────────────────────────────────────────────
function CalendarGrid({
  year, month, schedules, selectedDate, onSelectDate,
}: {
  year: number;
  month: number;
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

  const firstDay  = new Date(year, month, 1);
  const lastDay   = new Date(year, month + 1, 0);
  const startDow  = firstDay.getDay();

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
          const ds        = dateStr(d);
          const hasExam   = examDates.has(ds);
          const cellDate  = new Date(year, month, d);
          const isToday   = cellDate.getTime() === today.getTime();
          const isSelected = ds === selectedDate;
          const isPast    = cellDate < today;

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
                <span
                  className={`absolute bottom-1 block w-1.5 h-1.5 rounded-full ${
                    isSelected ? 'bg-white' : 'bg-blue-500'
                  }`}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main ────────────────────────────────────────────────────────────────────
export default function StudentExamPage() {
  const { token } = useAuth();
  const now = new Date();
  const [viewYear,  setViewYear]  = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());

  const [schedules,     setSchedules]     = useState<ExamSchedule[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [selectedDate,  setSelectedDate]  = useState<string | null>(null);

  const h = { Authorization: `Bearer ${token}` };

  const fetchSchedules = async () => {
    try {
      const m = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`;
      const res  = await fetch(`${API}/student/exam-schedules/?month=${m}`, { headers: h });
      const data = await res.json();
      if (res.ok) setSchedules(Array.isArray(data) ? data : []);
    } catch {}
  };

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
    const examDate  = new Date(exam.exam_date + 'T00:00:00');
    const todayClear = new Date(); todayClear.setHours(0, 0, 0, 0);
    return examDate < todayClear;
  };

  // Lịch thi sắp tới (từ hôm nay trở đi, toàn bộ tháng)
  const upcomingExams = useMemo(() => {
    const todayClear = new Date(); todayClear.setHours(0, 0, 0, 0);
    return schedules
      .filter(e => new Date(e.exam_date + 'T00:00:00') >= todayClear)
      .sort((a, b) => a.exam_date.localeCompare(b.exam_date));
  }, [schedules]);

  return (
    <div className="p-6 overflow-y-auto h-full">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <CalendarDays className="w-6 h-6 text-primary" /> Lịch thi của tôi
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Lịch thi các môn học bạn đang theo học trong kỳ này
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

          {/* Calendar – chiếm 3/5 */}
          <div className="lg:col-span-3">
            <Card className="p-6">
              {/* Month nav */}
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
                  <Loader2 className="w-4 h-4 animate-spin" /> Đang tải lịch thi...
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

              {/* Legend */}
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

            {/* Upcoming exams strip */}
            {upcomingExams.length > 0 && (
              <Card className="p-4 mt-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  📅 Kỳ thi sắp tới trong tháng
                </p>
                <div className="space-y-2">
                  {upcomingExams.map(exam => (
                    <button
                      key={exam.id}
                      onClick={() => setSelectedDate(exam.exam_date)}
                      className="w-full flex items-center gap-3 text-left px-3 py-2 rounded-lg hover:bg-muted/60 transition-colors"
                    >
                      <span className={`w-2 h-2 rounded-full shrink-0 ${EXAM_TYPE_COLORS[exam.exam_type]}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{exam.subject_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(exam.exam_date + 'T00:00:00').toLocaleDateString('vi-VN', {
                            weekday: 'short', day: '2-digit', month: '2-digit',
                          })} · {exam.start_time.slice(0, 5)} – {exam.end_time.slice(0, 5)}
                          {exam.room ? ` · Phòng ${exam.room}` : ''}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className={`text-xs shrink-0 ${EXAM_TYPE_BADGE[exam.exam_type]}`}
                      >
                        {EXAM_TYPE_LABELS[exam.exam_type]}
                      </Badge>
                    </button>
                  ))}
                </div>
              </Card>
            )}
          </div>

          {/* Day detail – chiếm 2/5 */}
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
                          {/* Badge + dot */}
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className={`w-2 h-2 rounded-full ${EXAM_TYPE_COLORS[exam.exam_type]}`} />
                            <Badge
                              variant="outline"
                              className={`text-xs ${EXAM_TYPE_BADGE[exam.exam_type]}`}
                            >
                              {EXAM_TYPE_LABELS[exam.exam_type]}
                            </Badge>
                            {isPastExam(exam) && (
                              <Badge variant="secondary" className="text-xs">Đã qua</Badge>
                            )}
                          </div>

                          {/* Môn học */}
                          <p className="font-semibold text-foreground">{exam.subject_name}</p>
                          <p className="text-xs text-muted-foreground">{exam.subject_code}</p>

                          {/* Lớp */}
                          {exam.class_section_name && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Lớp: {exam.class_section_name}
                            </p>
                          )}

                          {/* Giờ & Phòng */}
                          <div className="mt-2 flex flex-wrap gap-2 text-xs">
                            <span className="bg-muted px-2 py-0.5 rounded">
                              🕐 {exam.start_time.slice(0, 5)} – {exam.end_time.slice(0, 5)}
                            </span>
                            {exam.room && (
                              <span className="bg-muted px-2 py-0.5 rounded">📍 {exam.room}</span>
                            )}
                          </div>

                          {/* Ghi chú */}
                          {exam.note && (
                            <p className="text-xs text-muted-foreground mt-1.5 italic border-l-2 border-muted pl-2">
                              {exam.note}
                            </p>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))
                )}
              </>
            ) : (
              <Card className="p-10 flex flex-col items-center justify-center text-center text-muted-foreground gap-3">
                <CalendarDays className="w-12 h-12 opacity-20" />
                <p className="text-sm">Chọn một ngày trên lịch<br />để xem lịch thi của bạn</p>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
