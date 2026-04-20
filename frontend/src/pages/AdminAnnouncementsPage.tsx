/**
 * AdminAnnouncementsPage – Quản lý thông báo hệ thống (REALTIME via SSE)
 *
 * Realtime mechanism:
 *  - Kết nối SSE tới /api/admin/announcements/stream/?token=<jwt>
 *  - Server push: new_announcement event khi có thông báo mới
 *  - Server push: heartbeat event mỗi 15s kèm unread_count cập nhật
 *  - Auto-reconnect nếu SSE bị ngắt
 *
 * UX:
 *  - Thông báo mới nhất lên đầu, nhóm theo ngày
 *  - Unread: sáng + chấm xanh  |  Read: mờ
 *  - Badge số thông báo chưa đọc trên header
 *  - Mark as read on click, Mark all as read button
 *  - CRUD: Thêm / Sửa / Xoá thông báo
 *  - Toast notification khi có thông báo mới đến
 */
import {
  useEffect, useState, useCallback, useRef,
} from 'react';
import {
  Bell, BellOff, Plus, Pencil, Trash2, X, Check, Loader2,
  CheckCheck, RefreshCw, SignalHigh, SignalLow,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useAppDialog } from '@/contexts/DialogContext';

const API = 'http://127.0.0.1:8000/api';
const RECONNECT_DELAY_MS = 5000;

// ─── Types ──────────────────────────────────────────────────────────────────────
interface Announcement {
  id: number;
  title: string;
  content: string;
  target_role: string;
  subject_id: number | null;
  subject_name: string | null;
  created_by_id: number;
  created_by_name: string;
  is_active: boolean;
  published_at: string | null;
  expires_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  is_read: boolean;
}

interface AnnForm {
  title: string;
  content: string;
  target_role: string;
  is_active: boolean;
  expires_at: string;
}

const emptyForm: AnnForm = {
  title: '', content: '', target_role: 'all', is_active: true, expires_at: '',
};

const TARGET_LABELS: Record<string, string> = {
  all: 'Tất cả', student: 'Sinh viên', teacher: 'Giáo viên', admin: 'Admin',
};

type SSEStatus = 'connecting' | 'connected' | 'disconnected';

// ─── Toast component ──────────────────────────────────────────────────────────
function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-2">
      <div className="bg-primary text-primary-foreground rounded-xl shadow-2xl flex items-center gap-3 px-4 py-3 max-w-sm">
        <Bell className="w-4 h-4 shrink-0" />
        <p className="text-sm font-medium">{message}</p>
        <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 hover:bg-primary/20" onClick={onClose}>
          <X className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
}

// ─── Announcement Form Modal ────────────────────────────────────────────────────
function AnnModal({
  initial, isEdit, onSave, onClose, saving,
}: {
  initial: AnnForm; isEdit: boolean;
  onSave: (f: AnnForm) => void; onClose: () => void; saving: boolean;
}) {
  const [form, setForm] = useState<AnnForm>(initial);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-background rounded-2xl shadow-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary" />
            {isEdit ? 'Sửa thông báo' : 'Tạo thông báo mới'}
          </h2>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="w-4 h-4" /></Button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Tiêu đề *</label>
            <Input
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="Tiêu đề thông báo..."
              className="mt-0.5"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Nội dung *</label>
            <textarea
              value={form.content}
              onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
              rows={5}
              placeholder="Nội dung chi tiết của thông báo..."
              className="w-full border rounded-md px-3 py-2 text-sm bg-background resize-y mt-0.5"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Đối tượng nhận</label>
            <select
              value={form.target_role}
              onChange={e => setForm(f => ({ ...f, target_role: e.target.value }))}
              className="w-full border rounded-md px-3 py-2 text-sm bg-background mt-0.5"
            >
              <option value="all">Tất cả</option>
              <option value="student">Sinh viên</option>
              <option value="teacher">Giáo viên</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium">Hết hạn vào ngày (tuỳ chọn)</label>
            <Input
              type="date"
              value={form.expires_at}
              onChange={e => setForm(f => ({ ...f, expires_at: e.target.value }))}
              className="mt-0.5"
            />
          </div>
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="ann-active"
              checked={form.is_active}
              onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
              className="w-4 h-4"
            />
            <label htmlFor="ann-active" className="text-sm">Kích hoạt ngay (hiển thị cho người dùng)</label>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={onClose} disabled={saving}>Huỷ</Button>
          <Button onClick={() => onSave(form)} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
            {isEdit ? 'Lưu thay đổi' : 'Đăng thông báo'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Group by day ─────────────────────────────────────────────────────────────
function groupByDay(announcements: Announcement[]): [string, Announcement[]][] {
  const groups: Record<string, Announcement[]> = {};
  for (const ann of announcements) {
    const date = ann.created_at
      ? new Date(ann.created_at).toLocaleDateString('vi-VN', {
          weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric',
        })
      : 'Không rõ ngày';
    if (!groups[date]) groups[date] = [];
    groups[date].push(ann);
  }
  return Object.entries(groups);
}

// ─── Announcement Card ─────────────────────────────────────────────────────────
function AnnCard({ ann, onEdit, onDelete, onMarkRead }: {
  ann: Announcement;
  onEdit: () => void;
  onDelete: () => void;
  onMarkRead: () => void;
}) {
  return (
    <div
      className={[
        'group flex items-start gap-4 p-4 rounded-xl border transition-all cursor-pointer',
        ann.is_read
          ? 'bg-muted/30 opacity-60 hover:opacity-80 border-transparent'
          : 'bg-background border-primary/20 shadow-sm hover:shadow-md',
      ].join(' ')}
      onClick={!ann.is_read ? onMarkRead : undefined}
    >
      <div className={`mt-0.5 p-2 rounded-lg shrink-0 ${ann.is_read ? 'bg-muted' : 'bg-primary/10'}`}>
        {ann.is_read
          ? <BellOff className="w-4 h-4 text-muted-foreground" />
          : <Bell className="w-4 h-4 text-primary" />
        }
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          {!ann.is_read && <span className="w-2 h-2 rounded-full bg-primary shrink-0" />}
          <p className={`font-semibold truncate ${ann.is_read ? 'text-muted-foreground' : 'text-foreground'}`}>
            {ann.title}
          </p>
          <Badge variant="outline" className="text-xs shrink-0">
            {TARGET_LABELS[ann.target_role] || ann.target_role}
          </Badge>
          {!ann.is_active && <Badge variant="secondary" className="text-xs">Ẩn</Badge>}
        </div>
        <p className={`text-sm line-clamp-2 ${ann.is_read ? 'text-muted-foreground' : 'text-foreground/80'}`}>
          {ann.content}
        </p>
        <p className="text-xs text-muted-foreground mt-1.5">
          Bởi {ann.created_by_name}
          {ann.published_at
            ? ` · ${new Date(ann.published_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`
            : ''}
          {ann.subject_name && ` · ${ann.subject_name}`}
        </p>
      </div>

      <div className="hidden group-hover:flex items-center gap-1 shrink-0">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={e => { e.stopPropagation(); onEdit(); }}>
          <Pencil className="w-3.5 h-3.5" />
        </Button>
        <Button
          variant="ghost" size="icon" className="h-7 w-7 hover:text-destructive"
          onClick={e => { e.stopPropagation(); onDelete(); }}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}

// ─── SSE status indicator ──────────────────────────────────────────────────────
function SSEIndicator({ status }: { status: SSEStatus }) {
  const meta = {
    connecting:   { icon: <Loader2 className="w-3 h-3 animate-spin" />, text: 'Đang kết nối...', cls: 'text-amber-500' },
    connected:    { icon: <SignalHigh className="w-3 h-3" />,           text: 'Realtime',         cls: 'text-green-500' },
    disconnected: { icon: <SignalLow className="w-3 h-3" />,            text: 'Mất kết nối',      cls: 'text-red-500' },
  }[status];

  return (
    <span className={`flex items-center gap-1 text-[11px] font-medium ${meta.cls}`}>
      {meta.icon} {meta.text}
    </span>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function AdminAnnouncementsPage() {
  const { token } = useAuth();
  const { showAlert, showConfirm } = useAppDialog();
  const h = { Authorization: `Bearer ${token}` };

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [unreadCount, setUnreadCount]     = useState(0);
  const [loading, setLoading]             = useState(true);
  const [refreshing, setRefreshing]       = useState(false);
  const [sseStatus, setSseStatus]         = useState<SSEStatus>('connecting');

  const [showModal, setShowModal] = useState(false);
  const [editAnn, setEditAnn]     = useState<Announcement | null>(null);
  const [saving, setSaving]       = useState(false);

  const [toast, setToast] = useState<string | null>(null);

  const esRef = useRef<EventSource | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout>>();

  // ── Fetch initial list ────────────────────────────────────────────────────
  const fetchAnnouncements = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const res = await fetch(`${API}/admin/announcements/`, { headers: h });
      const data = await res.json();
      if (res.ok) {
        setAnnouncements(data.announcements || []);
        setUnreadCount(data.unread_count || 0);
      }
    } catch {}
    finally { setLoading(false); setRefreshing(false); }
  }, [token]);

  // ── SSE connection ────────────────────────────────────────────────────────
  const connectSSE = useCallback(() => {
    if (!token) return;
    esRef.current?.close();

    const url = `${API}/admin/announcements/stream/?token=${encodeURIComponent(token)}`;
    const es = new EventSource(url);
    esRef.current = es;
    setSseStatus('connecting');

    es.onopen = () => setSseStatus('connected');

    es.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);

        if (msg.type === 'connected') {
          setSseStatus('connected');
        }

        if (msg.type === 'new_announcement') {
          const ann: Announcement = msg.data;
          // Prepend new announcement to list (newest first)
          setAnnouncements(prev => [ann, ...prev]);
          if (!ann.is_read) {
            setUnreadCount(prev => prev + 1);
          }
          // Show toast
          setToast(`📢 ${ann.title}`);
        }

        if (msg.type === 'heartbeat') {
          setSseStatus('connected');
          if (typeof msg.unread_count === 'number') {
            setUnreadCount(msg.unread_count);
          }
        }

        if (msg.type === 'error') {
          console.error('[SSE] Server error:', msg.message);
        }
      } catch {}
    };

    es.onerror = () => {
      setSseStatus('disconnected');
      es.close();
      // Auto-reconnect after 5 seconds
      reconnectTimer.current = setTimeout(connectSSE, RECONNECT_DELAY_MS);
    };
  }, [token]);

  useEffect(() => {
    fetchAnnouncements();
    connectSSE();
    return () => {
      esRef.current?.close();
      clearTimeout(reconnectTimer.current);
    };
  }, [fetchAnnouncements, connectSSE]);

  // ── Mark single as read ──────────────────────────────────────────────────
  const handleMarkRead = async (ann: Announcement) => {
    if (ann.is_read) return;
    try {
      await fetch(`${API}/admin/announcements/${ann.id}/read/`, { method: 'POST', headers: h });
      setAnnouncements(prev => prev.map(a => a.id === ann.id ? { ...a, is_read: true } : a));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch {}
  };

  // ── Mark all as read ─────────────────────────────────────────────────────
  const handleMarkAllRead = async () => {
    try {
      await fetch(`${API}/admin/announcements/read-all/`, { method: 'POST', headers: h });
      setAnnouncements(prev => prev.map(a => ({ ...a, is_read: true })));
      setUnreadCount(0);
    } catch {}
  };

  // ── Create ──────────────────────────────────────────────────────────────
  const handleCreate = async (form: AnnForm) => {
    if (!form.title || !form.content) { await showAlert('Tiêu đề và nội dung không được để trống!'); return; }
    setSaving(true);
    try {
      const res = await fetch(`${API}/admin/announcements/`, {
        method: 'POST',
        headers: { ...h, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title, content: form.content,
          target_role: form.target_role, is_active: form.is_active,
          expires_at: form.expires_at || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Create failed');
      setShowModal(false);
      // SSE will push the new announcement automatically
      fetchAnnouncements(true);
    } catch (e: any) { await showAlert(e.message); }
    finally { setSaving(false); }
  };

  // ── Update ──────────────────────────────────────────────────────────────
  const handleUpdate = async (form: AnnForm) => {
    if (!editAnn) return;
    setSaving(true);
    try {
      const res = await fetch(`${API}/admin/announcements/${editAnn.id}/`, {
        method: 'PATCH',
        headers: { ...h, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title, content: form.content,
          target_role: form.target_role, is_active: form.is_active,
          expires_at: form.expires_at || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Update failed');
      setEditAnn(null);
      fetchAnnouncements(true);
    } catch (e: any) { await showAlert(e.message); }
    finally { setSaving(false); }
  };

  // ── Delete ──────────────────────────────────────────────────────────────
  const handleDelete = async (ann: Announcement) => {
    if (!(await showConfirm(`Xoá thông báo "${ann.title}"?`))) return;
    try {
      const res = await fetch(`${API}/admin/announcements/${ann.id}/`, { method: 'DELETE', headers: h });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Delete failed');
      fetchAnnouncements(true);
    } catch (e: any) { await showAlert(e.message); }
  };

  const buildEditForm = (a: Announcement): AnnForm => ({
    title: a.title, content: a.content, target_role: a.target_role,
    is_active: a.is_active, expires_at: a.expires_at ? a.expires_at.slice(0, 10) : '',
  });

  const grouped = groupByDay(announcements);

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="p-6 overflow-y-auto h-full">
      <div className="max-w-3xl mx-auto">

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Bell className="w-6 h-6 text-primary" />
              Thông báo
              {unreadCount > 0 && (
                <span className="ml-1 bg-primary text-primary-foreground text-xs font-bold px-2 py-0.5 rounded-full animate-pulse">
                  {unreadCount}
                </span>
              )}
            </h1>
            <div className="flex items-center gap-3 mt-1">
              <p className="text-muted-foreground text-sm">Quản lý và gửi thông báo đến sinh viên, giáo viên</p>
              <SSEIndicator status={sseStatus} />
            </div>
          </div>

          <div className="flex gap-2">
            {unreadCount > 0 && (
              <Button variant="outline" onClick={handleMarkAllRead} className="gap-2 text-sm">
                <CheckCheck className="w-4 h-4" /> Đánh dấu tất cả đã đọc
              </Button>
            )}
            <Button
              variant="ghost" size="icon"
              onClick={() => {
                fetchAnnouncements(true);
                connectSSE(); // reconnect SSE if needed
              }}
              disabled={refreshing}
              title="Làm mới + kết nối lại"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
            <Button onClick={() => { setEditAnn(null); setShowModal(true); }} className="gap-2">
              <Plus className="w-4 h-4" /> Thêm thông báo
            </Button>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center h-48 text-muted-foreground gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Đang tải thông báo...
          </div>
        ) : announcements.length === 0 ? (
          <Card className="p-12 flex flex-col items-center justify-center text-center text-muted-foreground gap-3">
            <Bell className="w-12 h-12 opacity-20" />
            <p className="text-sm">Chưa có thông báo nào.<br />Bấm "Thêm thông báo" để tạo mới.</p>
          </Card>
        ) : (
          <div className="space-y-6">
            {grouped.map(([day, anns]) => (
              <div key={day}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-xs font-medium text-muted-foreground bg-muted px-3 py-1 rounded-full">
                    {day}
                  </span>
                  <div className="h-px flex-1 bg-border" />
                </div>
                <div className="space-y-2">
                  {anns.map(ann => (
                    <AnnCard
                      key={ann.id}
                      ann={ann}
                      onEdit={() => setEditAnn(ann)}
                      onDelete={() => handleDelete(ann)}
                      onMarkRead={() => handleMarkRead(ann)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Summary */}
        {!loading && announcements.length > 0 && (
          <p className="mt-6 text-xs text-center text-muted-foreground">
            {announcements.length} thông báo · {unreadCount} chưa đọc ·{' '}
            {sseStatus === 'connected' ? '⚡ Kết nối realtime đang hoạt động' : '⚠️ Chưa kết nối realtime'}
          </p>
        )}
      </div>

      {/* Toast */}
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}

      {/* Modals */}
      {showModal && (
        <AnnModal
          initial={emptyForm} isEdit={false}
          onSave={handleCreate} onClose={() => setShowModal(false)} saving={saving}
        />
      )}
      {editAnn && (
        <AnnModal
          initial={buildEditForm(editAnn)} isEdit={true}
          onSave={handleUpdate} onClose={() => setEditAnn(null)} saving={saving}
        />
      )}
    </div>
  );
}
