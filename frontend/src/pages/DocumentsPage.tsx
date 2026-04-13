import { useState } from 'react';
import { FileText, Upload, Trash2, CheckCircle2, Loader2, AlertCircle, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Document } from '@/types';

const mockDocs: Document[] = [
  { id: '1', name: 'Slide_Chuong1_TongQuan_KTPM.pdf', type: 'PDF', size: 2800000, courseId: '1', courseName: 'Kỹ thuật Phần mềm', uploadedAt: new Date('2025-01-10'), uploadedBy: 'ThS. Nguyễn Văn Hùng', status: 'ready' },
  { id: '2', name: 'Slide_Chuong2_QuyTrinh.pdf', type: 'PDF', size: 3500000, courseId: '1', courseName: 'Kỹ thuật Phần mềm', uploadedAt: new Date('2025-01-15'), uploadedBy: 'ThS. Nguyễn Văn Hùng', status: 'ready' },
  { id: '3', name: 'Slide_Chuong3_YeuCau.pdf', type: 'PDF', size: 2100000, courseId: '1', courseName: 'Kỹ thuật Phần mềm', uploadedAt: new Date('2025-01-22'), uploadedBy: 'ThS. Nguyễn Văn Hùng', status: 'ready' },
  { id: '4', name: 'Slide_Chuong4_ThietKe.pdf', type: 'PDF', size: 4200000, courseId: '1', courseName: 'Kỹ thuật Phần mềm', uploadedAt: new Date('2025-02-01'), uploadedBy: 'ThS. Nguyễn Văn Hùng', status: 'ready' },
  { id: '5', name: 'Slide_Chuong5_DesignPatterns.pdf', type: 'PDF', size: 5100000, courseId: '1', courseName: 'Kỹ thuật Phần mềm', uploadedAt: new Date('2025-02-10'), uploadedBy: 'ThS. Nguyễn Văn Hùng', status: 'ready' },
  { id: '6', name: 'Giao_trinh_KTPM.pdf', type: 'PDF', size: 18000000, courseId: '1', courseName: 'Kỹ thuật Phần mềm', uploadedAt: new Date('2025-01-05'), uploadedBy: 'ThS. Nguyễn Văn Hùng', status: 'ready' },
  { id: '7', name: 'DeCuong_ChiTiet_SE201.docx', type: 'DOCX', size: 520000, courseId: '1', courseName: 'Kỹ thuật Phần mềm', uploadedAt: new Date('2025-01-03'), uploadedBy: 'ThS. Nguyễn Văn Hùng', status: 'ready' },
  { id: '8', name: 'Slide_Chuong6_Testing.pdf', type: 'PDF', size: 3300000, courseId: '1', courseName: 'Kỹ thuật Phần mềm', uploadedAt: new Date('2025-02-18'), uploadedBy: 'ThS. Nguyễn Văn Hùng', status: 'processing' },
];

const statusConfig = {
  ready: { label: 'Sẵn sàng', icon: CheckCircle2, variant: 'default' as const },
  processing: { label: 'Đang xử lý', icon: Loader2, variant: 'secondary' as const },
  error: { label: 'Lỗi', icon: AlertCircle, variant: 'destructive' as const },
};

export default function DocumentsPage() {
  const [docs] = useState(mockDocs);
  const [search, setSearch] = useState('');

  const filtered = docs.filter((d) => d.name.toLowerCase().includes(search.toLowerCase()));

  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="p-6 overflow-y-auto h-full">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Tài liệu – Kỹ thuật Phần mềm</h1>
            <p className="text-muted-foreground">Quản lý tài liệu môn học (Knowledge Base)</p>
          </div>
          <Button className="gap-2">
            <Upload className="w-4 h-4" />
            Upload tài liệu
          </Button>
        </div>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Tìm kiếm tài liệu..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>

        <Card className="divide-y">
          {filtered.map((doc) => {
            const st = statusConfig[doc.status];
            const StatusIcon = st.icon;
            return (
              <div key={doc.id} className="flex items-center gap-4 p-4 hover:bg-muted/30 transition-colors">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">{doc.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatSize(doc.size)} · {doc.uploadedAt.toLocaleDateString('vi-VN')}
                  </p>
                </div>
                <Badge variant={st.variant} className="gap-1">
                  <StatusIcon className={`w-3 h-3 ${doc.status === 'processing' ? 'animate-spin' : ''}`} />
                  {st.label}
                </Badge>
                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            );
          })}
        </Card>
      </div>
    </div>
  );
}
