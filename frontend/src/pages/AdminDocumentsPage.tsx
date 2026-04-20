/**
 * AdminDocumentsPage – Quản lý tài liệu knowledge-base (Admin only)
 * Features:
 *  - Filter by: môn học, trạng thái (processing/ready/error/archived), uploader, search text
 *  - View detail: file info + subject + uploader + upload time
 *  - Actions: archive (soft-remove from KB), reprocess (re-ingest), delete
 *  - Upload with subject & class section selection
 *  - Status badge với màu sắc rõ ràng
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  FileText, Upload, Trash2, RefreshCw, Archive,
  Search, ChevronDown, X, Loader2, Info, RotateCcw,
  Plus, BookOpen,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { useAuth } from '@/contexts/AuthContext';
import { useAppDialog } from '@/contexts/DialogContext';

const API = 'http://127.0.0.1:8000/api';

// ─── Types ──────────────────────────────────────────────────────────────────
interface Doc {
  id: number;
  name: string;
  file_type: string;
  file_size: number;
  file_size_display: string;
  status: 'processing' | 'ready' | 'error' | 'archived';
  subject_id: number | null;
  subject_name: string | null;
  class_section_id: number | null;
  class_section_name: string | null;
  uploaded_by_id: number;
  uploaded_by_name: string;
  uploaded_at: string;
}

interface Subject { id: number; name: string; code: string; }
interface ClassSection { id: number; section_code: string; subject_id: number; }
interface Uploader { id: number; name: string; }

// ─── Status badge ─────────────────────────────────────────────────────────────
const STATUS_META: Record<string, { label: string; class: string }> = {
  processing: { label: 'Đang xử lý', class: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
  ready:      { label: 'Sẵn sàng',   class: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' },
  error:      { label: 'Lỗi',        class: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' },
  archived:   { label: 'Đã lưu trữ', class: 'bg-gray-100 text-gray-500 dark:bg-gray-800/60 dark:text-gray-400' },
};

function StatusBadge({ status }: { status: string }) {
  const m = STATUS_META[status] ?? { label: status, class: 'bg-muted text-muted-foreground' };
  return (
    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${m.class}`}>
      {m.label}
    </span>
  );
}

// ─── Detail Panel ─────────────────────────────────────────────────────────────
function DetailPanel({ doc, onClose, onAction }: {
  doc: Doc;
  onClose: () => void;
  onAction: (docId: number, action: 'archive' | 'reprocess' | 'delete') => Promise<void>;
}) {
  const [acting, setActing] = useState(false);
  const { showConfirm } = useAppDialog();

  const act = async (action: 'archive' | 'reprocess' | 'delete') => {
    if (action === 'delete' && !(await showConfirm(`Xoá tài liệu "${doc.name}"?\nHành động này không thể hoàn tác.`))) return;
    setActing(true);
    await onAction(doc.id, action);
    setActing(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-background rounded-2xl shadow-2xl p-6 w-full max-w-md">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div>
              <h2 className="font-bold leading-tight">{doc.name}</h2>
              <p className="text-xs text-muted-foreground">{doc.file_type} · {doc.file_size_display}</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="w-4 h-4" /></Button>
        </div>

        <div className="space-y-2 text-sm mb-5">
          <Row label="Trạng thái"><StatusBadge status={doc.status} /></Row>
          <Row label="Môn học">{doc.subject_name ?? '—'}</Row>
          <Row label="Lớp học phần">{doc.class_section_name ?? '—'}</Row>
          <Row label="Người upload">{doc.uploaded_by_name}</Row>
          <Row label="Ngày upload">
            {doc.uploaded_at ? new Date(doc.uploaded_at).toLocaleString('vi-VN') : '—'}
          </Row>
        </div>

        <div className="border-t pt-4 flex flex-wrap gap-2">
          {doc.status !== 'archived' && (
            <Button variant="outline" className="gap-2 text-sm" disabled={acting} onClick={() => act('archive')}>
              {acting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Archive className="w-3.5 h-3.5" />}
              Lưu trữ
            </Button>
          )}
          {(doc.status === 'error' || doc.status === 'archived') && (
            <Button variant="outline" className="gap-2 text-sm" disabled={acting} onClick={() => act('reprocess')}>
              {acting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
              Xử lý lại
            </Button>
          )}
          <Button
            variant="outline"
            className="gap-2 text-sm text-destructive hover:text-destructive border-destructive/40"
            disabled={acting}
            onClick={() => act('delete')}
          >
            <Trash2 className="w-3.5 h-3.5" /> Xoá vĩnh viễn
          </Button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right">{children}</span>
    </div>
  );
}

// ─── Upload Modal ──────────────────────────────────────────────────────────────
function UploadModal({
  subjects, classSections, onClose, onDone,
}: {
  subjects: Subject[];
  classSections: ClassSection[];
  onClose: () => void;
  onDone: () => void;
}) {
  const { token } = useAuth();
  const { showAlert } = useAppDialog();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [subjectId, setSubjectId] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState('');

  const filteredSections = subjectId
    ? classSections.filter(cs => String(cs.subject_id) === subjectId)
    : classSections;

  const handleUpload = async () => {
    if (!file) { await showAlert('Vui lòng chọn file!'); return; }
    setUploading(true);
    setProgress('Đang upload...');
    const fd = new FormData();
    fd.append('file', file);
    if (subjectId) fd.append('subject_id', subjectId);
    if (sectionId) fd.append('class_section_id', sectionId);
    try {
      const res = await fetch(`${API}/admin/documents/upload/`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      setProgress('Upload thành công! Đang xử lý ingestion...');
      setTimeout(() => { onDone(); }, 1200);
    } catch (e: any) {
      await showAlert(e.message);
      setProgress('');
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-background rounded-2xl shadow-2xl p-6 w-full max-w-lg">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-bold text-lg flex items-center gap-2">
            <Upload className="w-5 h-5 text-primary" /> Upload tài liệu
          </h2>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="w-4 h-4" /></Button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium">File *</label>
            <div
              className="mt-1 border-2 border-dashed rounded-xl p-6 text-center cursor-pointer hover:border-primary/60 transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              {file
                ? <p className="text-sm font-medium">{file.name} ({(file.size / 1024).toFixed(1)} KB)</p>
                : <p className="text-sm text-muted-foreground">Nhấp để chọn file (PDF, DOCX, TXT…)</p>
              }
            </div>
            <input ref={fileRef} type="file" className="hidden"
              accept=".pdf,.doc,.docx,.txt,.xlsx,.pptx,.md"
              onChange={e => setFile(e.target.files?.[0] ?? null)}
            />
          </div>

          <div>
            <label className="text-sm font-medium">Môn học (tuỳ chọn)</label>
            <select
              value={subjectId}
              onChange={e => { setSubjectId(e.target.value); setSectionId(''); }}
              className="w-full mt-1 border rounded-md px-3 py-2 text-sm bg-background"
            >
              <option value="">-- Không gắn môn học --</option>
              {subjects.map(s => (
                <option key={s.id} value={String(s.id)}>{s.code} – {s.name}</option>
              ))}
            </select>
          </div>

          {subjectId && (
            <div>
              <label className="text-sm font-medium">Lớp học phần (tuỳ chọn)</label>
              <select
                value={sectionId}
                onChange={e => setSectionId(e.target.value)}
                className="w-full mt-1 border rounded-md px-3 py-2 text-sm bg-background"
              >
                <option value="">-- Không gắn lớp học phần --</option>
                {filteredSections.map(cs => (
                  <option key={cs.id} value={String(cs.id)}>{cs.section_code}</option>
                ))}
              </select>
            </div>
          )}

          {progress && (
            <div className="text-sm text-primary flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> {progress}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 mt-5">
          <Button variant="outline" onClick={onClose} disabled={uploading}>Huỷ</Button>
          <Button onClick={handleUpload} disabled={uploading}>
            {uploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
            Upload
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function AdminDocumentsPage() {
  const { token } = useAuth();
  const { showAlert, showConfirm } = useAppDialog();
  const h = { Authorization: `Bearer ${token}` };

  const [docs, setDocs] = useState<Doc[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classSections, setClassSections] = useState<ClassSection[]>([]);
  const [uploaders, setUploaders] = useState<Uploader[]>([]);

  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  // Filters
  const [search, setSearch] = useState('');
  const [filterSubject, setFilterSubject] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterUploader, setFilterUploader] = useState('');

  // UI state
  const [selectedDoc, setSelectedDoc] = useState<Doc | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const searchTimer = useRef<ReturnType<typeof setTimeout>>();

  // Fetch subjects & class sections for filters/upload
  useEffect(() => {
    fetch(`${API}/admin/subjects/`, { headers: h })
      .then(r => r.json())
      .then(d => setSubjects(d.subjects || d))
      .catch(() => {});
    fetch(`${API}/admin/class-sections/`, { headers: h })
      .then(r => r.json())
      .then(d => setClassSections(d.class_sections || d))
      .catch(() => {});
  }, []);

  const fetchDocs = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);

    const params = new URLSearchParams();
    if (search)          params.set('search', search);
    if (filterSubject)   params.set('subject_id', filterSubject);
    if (filterStatus)    params.set('status', filterStatus);
    if (filterUploader)  params.set('uploader_id', filterUploader);

    try {
      const res = await fetch(`${API}/admin/documents/?${params}`, { headers: h });
      const data = await res.json();
      if (res.ok) {
        const list: Doc[] = data.documents || [];
        setDocs(list);
        setTotal(data.total || list.length);

        // Build uploader list from docs (avoid asking for a separate endpoint)
        const seen = new Map<number, string>();
        list.forEach(d => seen.set(d.uploaded_by_id, d.uploaded_by_name));
        setUploaders(Array.from(seen.entries()).map(([id, name]) => ({ id, name })));
      }
    } catch {}
    finally { setLoading(false); setRefreshing(false); }
  }, [token, search, filterSubject, filterStatus, filterUploader]);

  // Debounced fetch on filter change
  useEffect(() => {
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => fetchDocs(), 300);
    return () => clearTimeout(searchTimer.current);
  }, [fetchDocs]);

  // Actions: archive / reprocess / delete
  const handleAction = async (docId: number, action: 'archive' | 'reprocess' | 'delete') => {
    try {
      if (action === 'delete') {
        const res = await fetch(`${API}/admin/documents/${docId}/`, { method: 'DELETE', headers: h });
        const d = await res.json();
        if (!res.ok) throw new Error(d.error || 'Delete failed');
      } else {
        const res = await fetch(`${API}/admin/documents/${docId}/`, {
          method: 'PATCH',
          headers: { ...h, 'Content-Type': 'application/json' },
          body: JSON.stringify({ action }),
        });
        const d = await res.json();
        if (!res.ok) throw new Error(d.error || `${action} failed`);
      }
      fetchDocs(true);
    } catch (e: any) { await showAlert(e.message); }
  };

  const resetFilters = () => {
    setSearch('');
    setFilterSubject('');
    setFilterStatus('');
    setFilterUploader('');
  };

  const hasFilter = search || filterSubject || filterStatus || filterUploader;

  return (
    <div className="p-6 overflow-y-auto h-full">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FileText className="w-6 h-6 text-primary" />
              Quản lý tài liệu
            </h1>
            <p className="text-muted-foreground text-sm">
              {total} tài liệu trong knowledge base
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="icon" onClick={() => fetchDocs(true)} disabled={refreshing} title="Làm mới">
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
            <Button onClick={() => setShowUpload(true)} className="gap-2">
              <Plus className="w-4 h-4" /> Upload tài liệu
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-4">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Tìm theo tên file..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 h-9 text-sm"
            />
          </div>

          <select
            value={filterSubject}
            onChange={e => setFilterSubject(e.target.value)}
            className="border rounded-md px-3 py-1.5 text-sm bg-background h-9"
          >
            <option value="">Tất cả môn học</option>
            {subjects.map(s => (
              <option key={s.id} value={String(s.id)}>{s.code} – {s.name}</option>
            ))}
          </select>

          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="border rounded-md px-3 py-1.5 text-sm bg-background h-9"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="processing">Đang xử lý</option>
            <option value="ready">Sẵn sàng</option>
            <option value="error">Lỗi</option>
            <option value="archived">Đã lưu trữ</option>
          </select>

          {uploaders.length > 0 && (
            <select
              value={filterUploader}
              onChange={e => setFilterUploader(e.target.value)}
              className="border rounded-md px-3 py-1.5 text-sm bg-background h-9"
            >
              <option value="">Tất cả người upload</option>
              {uploaders.map(u => (
                <option key={u.id} value={String(u.id)}>{u.name}</option>
              ))}
            </select>
          )}

          {hasFilter && (
            <Button variant="ghost" size="sm" onClick={resetFilters} className="gap-1 text-muted-foreground h-9">
              <X className="w-3.5 h-3.5" /> Xoá bộ lọc
            </Button>
          )}
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center h-48 text-muted-foreground gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Đang tải...
          </div>
        ) : docs.length === 0 ? (
          <Card className="p-12 flex flex-col items-center text-center text-muted-foreground gap-3">
            <FileText className="w-12 h-12 opacity-20" />
            <p className="text-sm">
              {hasFilter ? 'Không tìm thấy tài liệu phù hợp.' : 'Chưa có tài liệu nào. Hãy upload file đầu tiên!'}
            </p>
            {hasFilter && (
              <Button variant="outline" size="sm" onClick={resetFilters}>Xoá bộ lọc</Button>
            )}
          </Card>
        ) : (
          <div className="rounded-xl border overflow-hidden shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Tên file</TableHead>
                  <TableHead>Loại</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Môn học</TableHead>
                  <TableHead>Người upload</TableHead>
                  <TableHead>Ngày upload</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {docs.map(doc => (
                  <TableRow key={doc.id} className="hover:bg-muted/30">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                        <span className="font-medium text-sm truncate max-w-[200px]" title={doc.name}>
                          {doc.name}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground ml-6">{doc.file_size_display}</p>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">{doc.file_type}</Badge>
                    </TableCell>
                    <TableCell><StatusBadge status={doc.status} /></TableCell>
                    <TableCell className="text-sm">
                      {doc.subject_name
                        ? <span className="flex items-center gap-1"><BookOpen className="w-3 h-3 text-primary" />{doc.subject_name}</span>
                        : <span className="text-muted-foreground text-xs">—</span>
                      }
                    </TableCell>
                    <TableCell className="text-sm">{doc.uploaded_by_name}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {doc.uploaded_at ? new Date(doc.uploaded_at).toLocaleDateString('vi-VN') : '—'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelectedDoc(doc)} title="Chi tiết">
                          <Info className="w-3.5 h-3.5" />
                        </Button>
                        {doc.status !== 'archived' && (
                          <Button
                            variant="ghost" size="icon" className="h-7 w-7 hover:text-amber-600"
                            onClick={() => handleAction(doc.id, 'archive')} title="Lưu trữ"
                          >
                            <Archive className="w-3.5 h-3.5" />
                          </Button>
                        )}
                        {(doc.status === 'error' || doc.status === 'archived') && (
                          <Button
                            variant="ghost" size="icon" className="h-7 w-7 hover:text-blue-600"
                            onClick={() => handleAction(doc.id, 'reprocess')} title="Xử lý lại"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </Button>
                        )}
                        <Button
                          variant="ghost" size="icon" className="h-7 w-7 hover:text-destructive"
                          onClick={async () => {
                            if (!(await showConfirm(`Xoá "${doc.name}"?`))) return;
                            await handleAction(doc.id, 'delete');
                          }} title="Xoá"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Footer summary */}
        {!loading && docs.length > 0 && (
          <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
            {(['ready', 'processing', 'error', 'archived'] as const).map(status => {
              const count = docs.filter(d => d.status === status).length;
              if (!count) return null;
              return (
                <span key={status} className="flex items-center gap-1">
                  <StatusBadge status={status} />
                  <span>{count}</span>
                </span>
              );
            })}
          </div>
        )}
      </div>

      {/* Detail modal */}
      {selectedDoc && (
        <DetailPanel
          doc={selectedDoc}
          onClose={() => setSelectedDoc(null)}
          onAction={handleAction}
        />
      )}

      {/* Upload modal */}
      {showUpload && (
        <UploadModal
          subjects={subjects}
          classSections={classSections}
          onClose={() => setShowUpload(false)}
          onDone={() => { setShowUpload(false); fetchDocs(); }}
        />
      )}
    </div>
  );
}
