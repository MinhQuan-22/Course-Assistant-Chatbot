import { useEffect, useState } from 'react';
import {
  FileText,
  Upload,
  Trash2,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Search,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useAppDialog } from '@/contexts/DialogContext';

const API_BASE_URL = 'http://127.0.0.1:8000/api';

type DocumentItem = {
  id: number;
  name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  uploaded_by_id: number;
  uploaded_by_name?: string;
  status: 'ready' | 'processing' | 'error';
  uploaded_at: string;
};

const statusConfig = {
  ready: { label: 'Ready', icon: CheckCircle2, variant: 'default' as const },
  processing: { label: 'Processing', icon: Loader2, variant: 'secondary' as const },
  error: { label: 'Error', icon: AlertCircle, variant: 'destructive' as const },
};

export default function DocumentsPage() {
  const [docs, setDocs] = useState<DocumentItem[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);

  const { user, token } = useAuth();
  const { showAlert, showConfirm } = useAppDialog();
  const canUpload = user?.role === 'teacher' || user?.role === 'admin';

  // Helper check for ownership. Admins can delete anything, teachers can only delete their own
  const canDelete = (doc: DocumentItem) => {
    if (user?.role === 'admin') return true;
    if (user?.role === 'teacher' && String(doc.uploaded_by_id) === String(user.id)) return true;
    return false;
  };

  const fetchDocuments = async () => {
    try {
      const endpoint = (user?.role === 'teacher' || user?.role === 'admin')
        ? `${API_BASE_URL}/admin/documents/`
        : `${API_BASE_URL}/documents/`;

      const headers: Record<string, string> = {};
      if (token && (user?.role === 'teacher' || user?.role === 'admin')) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(endpoint, { headers });
      const data = await response.json();

      if (response.ok) {
        // /admin/documents/ returns { documents: [...], total: N }
        // /documents/ returns a plain array
        const list: DocumentItem[] = Array.isArray(data)
          ? data
          : Array.isArray(data.documents)
          ? data.documents
          : [];
        setDocs(list);
      } else {
        setDocs([]);
      }
    } catch {
      setDocs([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [user, token]); // re-run if auth token changes

  useEffect(() => {
    const hasProcessing = docs.some((doc) => doc.status === 'processing');
    if (!hasProcessing) return;

    const interval = setInterval(() => {
      fetchDocuments();
    }, 3000);

    return () => clearInterval(interval);
  }, [docs]);

  const handleFileUpload = async (file: File) => {
    if (!canUpload || !token) return;

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      // Removed: formData.append('uploaded_by', String(user.id));
      // The backend securely infers `uploaded_by` from the JWT now!

      const response = await fetch(`${API_BASE_URL}/admin/documents/upload/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      await fetchDocuments();
    } catch (e: any) {
      await showAlert(`Upload failed: ${e.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (docId: number) => {
    if (!(await showConfirm('Bạn có chắc xoá tài liệu này không?'))) return;
    try {
      const response = await fetch(`${API_BASE_URL}/admin/documents/${docId}/`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        fetchDocuments(); // Refresh
      } else {
        const data = await response.json();
        await showAlert(`Lỗi: ${data.error}`);
      }
    } catch (e: any) {
      await showAlert(`Xoá thất bại: ${e.message}`);
    }
  };

  const filtered = docs.filter((d) =>
    d.name.toLowerCase().includes(search.toLowerCase())
  );

  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="p-6 overflow-y-auto h-full">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Tài liệu môn học</h1>
            <p className="text-muted-foreground">
              {canUpload
                ? 'Quản lý tài liệu tri thức của môn học'
                : 'Xem tài liệu tri thức của môn học'}
            </p>
          </div>

          {canUpload && (
            <label>
              <input
                type="file"
                className="hidden"
                accept=".txt,.pdf,.docx"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file);
                }}
                disabled={isUploading}
              />
              <Button className="gap-2" disabled={isUploading} asChild>
                <span>
                  <Upload className="w-4 h-4" />
                  {isUploading ? 'Đang tải lên...' : 'Tải tài liệu lên'}
                </span>
              </Button>
            </label>
          )}
        </div>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Tìm kiếm tài liệu..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center p-8 text-muted-foreground">
            <Loader2 className="w-6 h-6 animate-spin mr-2" /> Đang tải dữ liệu...
          </div>
        ) : (
          <Card className="divide-y">
            {filtered.length === 0 ? (
              <div className="p-6 text-muted-foreground text-center">
                Không tìm thấy tài liệu nào.
              </div>
            ) : (
              filtered.map((doc) => {
                const st = statusConfig[doc.status] || statusConfig['error'];
                const StatusIcon = st.icon;

                return (
                  <div
                    key={doc.id}
                    className="flex items-center gap-4 p-4 hover:bg-muted/30 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5 text-primary" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">{doc.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatSize(doc.file_size)} ·{' '}
                        {new Date(doc.uploaded_at).toLocaleDateString('vi-VN')}
                        {doc.uploaded_by_name && ` · Bởi: ${doc.uploaded_by_name}`}
                      </p>
                    </div>

                    <Badge variant={st.variant} className="gap-1">
                      <StatusIcon
                        className={`w-3 h-3 ${
                          doc.status === 'processing' ? 'animate-spin' : ''
                        }`}
                      />
                      {st.label}
                    </Badge>

                    {canDelete(doc) && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => handleDelete(doc.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                );
              })
            )}
          </Card>
        )}
      </div>
    </div>
  );
}