import { useState } from 'react';
import { Search, Upload, UserPlus, MoreVertical } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const mockUsers = [
  { id: '1', name: 'Nguyễn Văn An', email: 'an.nguyen@student.edu.vn', role: 'student', courses: ['CS101', 'SE201'] },
  { id: '2', name: 'Trần Thị Bình', email: 'binh.tran@student.edu.vn', role: 'student', courses: ['CS101', 'DB301'] },
  { id: '3', name: 'Lê Hoàng Cường', email: 'cuong.le@student.edu.vn', role: 'student', courses: ['AI401'] },
  { id: '4', name: 'TS. Trần Minh Tuấn', email: 'tuan.tran@edu.vn', role: 'teacher', courses: ['CS101'] },
  { id: '5', name: 'ThS. Nguyễn Văn Hùng', email: 'hung.nguyen@edu.vn', role: 'teacher', courses: ['SE201'] },
];

const roleMap = { student: 'Sinh viên', teacher: 'Giáo viên', admin: 'Admin' };

export default function AdminUsersPage() {
  const [search, setSearch] = useState('');
  const filtered = mockUsers.filter((u) => u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-6 overflow-y-auto h-full">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Quản lý người dùng</h1>
            <p className="text-muted-foreground">Quản lý sinh viên và giáo viên</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2">
              <Upload className="w-4 h-4" />
              Import Excel
            </Button>
            <Button className="gap-2">
              <UserPlus className="w-4 h-4" />
              Thêm mới
            </Button>
          </div>
        </div>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Tìm kiếm người dùng..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>

        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tên</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Vai trò</TableHead>
                <TableHead>Môn học</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.name}</TableCell>
                  <TableCell className="text-muted-foreground">{u.email}</TableCell>
                  <TableCell>
                    <Badge variant={u.role === 'teacher' ? 'default' : 'secondary'}>
                      {roleMap[u.role as keyof typeof roleMap]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">{u.courses.map((c) => <Badge key={c} variant="outline" className="text-xs">{c}</Badge>)}</div>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="w-4 h-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>
    </div>
  );
}
