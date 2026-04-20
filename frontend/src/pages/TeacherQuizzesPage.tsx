import { useEffect, useState } from 'react';
import { BookOpen, Plus, Trash2, Edit3, Settings, Loader2, ArrowLeft, Send } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/contexts/AuthContext';
import { useAppDialog } from '@/contexts/DialogContext';

const API_BASE_URL = 'http://127.0.0.1:8000/api';

type Quiz = {
  id: number;
  title: string;
  subject_id: number | null;
  class_section_id: number | null;
  description: string;
  chapter_label: string;
  is_published: boolean;
  question_count: number;
};

type Question = {
  id: number;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: string;
  explanation: string;
};

export default function TeacherQuizzesPage() {
  const { token } = useAuth();
  const { showAlert, showConfirm } = useAppDialog();
  
  // State for List view
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // State for Detail/Builder view
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isDetailLoading, setIsDetailLoading] = useState(false);

  // Form states for creating quiz and questions
  const [newQuizTitle, setNewQuizTitle] = useState('');
  
  // States for AI Generate
  const [createMode, setCreateMode] = useState<'manual' | 'ai'>('manual');
  const [classSections, setClassSections] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedDocId, setSelectedDocId] = useState('');
  const [questionCount, setQuestionCount] = useState(5);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  
  // Create Question form
  const [newQuestion, setNewQuestion] = useState({
    question: '', option_a: '', option_b: '', option_c: '', option_d: '',
    correct_answer: 'A', explanation: ''
  });

  const fetchData = async () => {
    try {
      const [qzRes, csRes, docRes] = await Promise.all([
        fetch(`${API_BASE_URL}/teacher/quizzes/`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_BASE_URL}/admin/class-sections/`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_BASE_URL}/admin/documents/`, { headers: { 'Authorization': `Bearer ${token}` } })
      ]);
      
      if (qzRes.ok) { const d = await qzRes.json(); setQuizzes(d.quizzes || []); }
      if (csRes.ok) { const d = await csRes.json(); setClassSections(d || []); }
      if (docRes.ok) { const d = await docRes.json(); setDocuments(d.documents || []); }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchData();
  }, [token]);

  const handleCreateQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuizTitle.trim()) return;
    
    try {
      const res = await fetch(`${API_BASE_URL}/teacher/quizzes/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ title: newQuizTitle })
      });
      if (res.ok) {
        setNewQuizTitle('');
        fetchData();
      } else {
        const data = await res.json();
        await showAlert('Lỗi: ' + data.error);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateQuizAI = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuizTitle.trim() || !selectedClassId || !selectedDocId) {
      await showAlert("Vui lòng điền đủ Tên quiz, Lớp học và Tài liệu!");
      return;
    }
    setIsGeneratingAI(true);
    try {
      const res = await fetch(`${API_BASE_URL}/teacher/quizzes/generate-ai/`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newQuizTitle,
          class_section_id: selectedClassId,
          document_id: selectedDocId,
          question_count: questionCount
        })
      });
      const data = await res.json();
      if (res.ok) {
        await showAlert(data.message);
        setNewQuizTitle('');
        setSelectedClassId('');
        setSelectedDocId('');
        fetchData();
      } else {
        await showAlert('Lỗi AI: ' + data.error);
      }
    } catch (e) {
      console.error(e);
      await showAlert('Đã xảy ra lỗi khi gọi AI!');
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const loadQuizDetail = async (quiz: Quiz) => {
    setSelectedQuiz(quiz);
    setIsDetailLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/teacher/quizzes/${quiz.id}/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setQuestions(data.questions || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsDetailLoading(false);
    }
  };

  const handlePublishToggle = async (quiz: Quiz, published: boolean) => {
    try {
      const res = await fetch(`${API_BASE_URL}/teacher/quizzes/${quiz.id}/`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ is_published: published })
      });
      if (res.ok) {
        if (selectedQuiz?.id === quiz.id) {
          setSelectedQuiz({ ...selectedQuiz, is_published: published });
        }
        fetchData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteQuiz = async (id: number) => {
    if (!(await showConfirm('Bạn có chắc chắn muốn xóa bài kiểm tra này?'))) return;
    try {
      const res = await fetch(`${API_BASE_URL}/teacher/quizzes/${id}/`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        if (selectedQuiz?.id === id) setSelectedQuiz(null);
        fetchData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedQuiz) return;
    
    try {
      const res = await fetch(`${API_BASE_URL}/teacher/quizzes/${selectedQuiz.id}/questions/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newQuestion)
      });
      
      if (res.ok) {
        setNewQuestion({
          question: '', option_a: '', option_b: '', option_c: '', option_d: '',
          correct_answer: 'A', explanation: ''
        });
        loadQuizDetail(selectedQuiz); // Reload questions
        fetchData(); // Update question count in list
      } else {
        const data = await res.json();
        await showAlert('Lỗi thêm câu hỏi: ' + data.error);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteQuestion = async (qId: number) => {
    if (!selectedQuiz) return;
    if (!(await showConfirm('Xóa câu hỏi này?'))) return;
    try {
      const res = await fetch(`${API_BASE_URL}/teacher/quizzes/${selectedQuiz.id}/questions/${qId}/`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        loadQuizDetail(selectedQuiz);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // ================= RENDER =================

  if (selectedQuiz) {
    return (
      <div className="p-6 overflow-y-auto h-full w-full max-w-4xl mx-auto">
        <Button variant="ghost" onClick={() => setSelectedQuiz(null)} className="mb-4 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4 mr-2" /> Quay lại danh sách
        </Button>
        
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{selectedQuiz.title}</h1>
            <p className="text-muted-foreground mt-1 text-sm">Quản lý câu hỏi trắc nghiệm</p>
          </div>
          <div className="flex items-center gap-3 bg-muted/50 px-4 py-2 rounded-lg border">
            <Label htmlFor="publish-toggle" className="text-sm font-medium cursor-pointer">Xuất bản</Label>
            <Switch 
              id="publish-toggle" 
              checked={selectedQuiz.is_published}
              onCheckedChange={(c) => handlePublishToggle(selectedQuiz, c)}
            />
          </div>
        </div>

        {/* CÂU HỎI LIST */}
        <div className="space-y-4 mb-8">
          <h2 className="text-lg font-semibold border-b pb-2">Danh sách câu hỏi ({questions.length})</h2>
          {isDetailLoading ? (
            <div className="text-muted-foreground flex items-center"><Loader2 className="w-4 h-4 mr-2 animate-spin" />Đang tải...</div>
          ) : questions.length === 0 ? (
            <div className="text-muted-foreground italic bg-muted/30 p-4 rounded-lg border">Bài kiểm tra chưa có câu hỏi nào.</div>
          ) : (
            questions.map((q, idx) => (
              <Card key={q.id} className="p-4 relative hover:border-primary/50 transition-colors group">
                <Button 
                  variant="ghost" size="icon" 
                  className="absolute right-2 top-2 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive transition-all"
                  onClick={() => handleDeleteQuestion(q.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
                <div className="flex gap-3 items-start">
                  <div className="bg-primary/10 text-primary font-bold rounded-full w-8 h-8 flex items-center justify-center shrink-0">
                    {idx + 1}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-foreground mb-3">{q.question}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-muted-foreground">
                      <div className={`p-2 rounded border ${q.correct_answer === 'A' ? 'bg-success/10 border-success/30 text-success font-medium' : ''}`}>A. {q.option_a}</div>
                      <div className={`p-2 rounded border ${q.correct_answer === 'B' ? 'bg-success/10 border-success/30 text-success font-medium' : ''}`}>B. {q.option_b}</div>
                      <div className={`p-2 rounded border ${q.correct_answer === 'C' ? 'bg-success/10 border-success/30 text-success font-medium' : ''}`}>C. {q.option_c}</div>
                      <div className={`p-2 rounded border ${q.correct_answer === 'D' ? 'bg-success/10 border-success/30 text-success font-medium' : ''}`}>D. {q.option_d}</div>
                    </div>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>

        {/* THÊM CÂU HỎI MỚI form */}
        <Card className="p-5 border-dashed border-2">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2"><Plus className="w-5 h-5 text-primary" /> Thêm câu hỏi mới</h2>
          <form onSubmit={handleAddQuestion} className="space-y-4">
            <div className="space-y-2">
              <Label>Nội dung câu hỏi</Label>
              <Input 
                required 
                placeholder="VD: Mô hình Agile là gì?" 
                value={newQuestion.question}
                onChange={e => setNewQuestion({...newQuestion, question: e.target.value})}
              />
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Lựa chọn A</Label>
                <Input required value={newQuestion.option_a} onChange={e => setNewQuestion({...newQuestion, option_a: e.target.value})} />
              </div>
              <div className="space-y-1">
                <Label>Lựa chọn B</Label>
                <Input required value={newQuestion.option_b} onChange={e => setNewQuestion({...newQuestion, option_b: e.target.value})} />
              </div>
              <div className="space-y-1">
                <Label>Lựa chọn C</Label>
                <Input required value={newQuestion.option_c} onChange={e => setNewQuestion({...newQuestion, option_c: e.target.value})} />
              </div>
              <div className="space-y-1">
                <Label>Lựa chọn D</Label>
                <Input required value={newQuestion.option_d} onChange={e => setNewQuestion({...newQuestion, option_d: e.target.value})} />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 items-end pt-2">
              <div className="space-y-2 w-full sm:w-1/3">
                <Label>Đáp án đúng</Label>
                <select 
                  className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={newQuestion.correct_answer}
                  onChange={e => setNewQuestion({...newQuestion, correct_answer: e.target.value})}
                >
                  <option value="A">A</option>
                  <option value="B">B</option>
                  <option value="C">C</option>
                  <option value="D">D</option>
                </select>
              </div>
              <Button type="submit" className="w-full sm:w-auto"><Send className="w-4 h-4 mr-2" /> Lưu Câu Hỏi</Button>
            </div>
          </form>
        </Card>
      </div>
    );
  }

  // DANH SÁCH QUIZZES
  return (
    <div className="p-6 overflow-y-auto h-full w-full max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Quản lý Bài kiểm tra</h1>
        <p className="text-muted-foreground mt-1">Soạn thảo và xuất bản bài trắc nghiệm cho sinh viên</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* CREATE QUIZ COLUMN */}
        <div className="md:col-span-1">
          <Card className="p-5 sticky top-6 border-primary/20 bg-primary/5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-foreground">Tạo bài mới</h2>
              <div className="flex gap-2">
                <Button variant={createMode === 'manual' ? 'default' : 'outline'} size="sm" onClick={() => setCreateMode('manual')}>Cơ bản</Button>
                <Button variant={createMode === 'ai' ? 'default' : 'outline'} size="sm" onClick={() => setCreateMode('ai')}>Sinh AI</Button>
              </div>
            </div>

            {createMode === 'manual' && (
              <form onSubmit={handleCreateQuiz} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="quiz-title">Tên bài kiểm tra / Quiz</Label>
                  <Input 
                    id="quiz-title" 
                    placeholder="VD: Kiểm tra giữa kỳ môn NMLT" 
                    value={newQuizTitle}
                    onChange={(e) => setNewQuizTitle(e.target.value)}
                    className="bg-background"
                  />
                </div>
                <Button type="submit" className="w-full">Tạo nhanh</Button>
              </form>
            )}

            {createMode === 'ai' && (
              <form onSubmit={handleCreateQuizAI} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="quiz-title-ai">Tên bài kiểm tra</Label>
                  <Input 
                    id="quiz-title-ai" 
                    placeholder="VD: Trắc nghiệm Chương 1" 
                    value={newQuizTitle}
                    onChange={(e) => setNewQuizTitle(e.target.value)}
                    className="bg-background"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Lớp học</Label>
                  <select 
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    value={selectedClassId}
                    onChange={e => setSelectedClassId(e.target.value)}
                  >
                    <option value="">-- Chọn Lớp Học --</option>
                    {classSections.map(cs => (
                      <option key={cs.id} value={cs.id}>{cs.subject_name} ({cs.section_code})</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Tài liệu tham khảo</Label>
                  <select 
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring border-primary overflow-hidden"
                    style={{ whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}
                    value={selectedDocId}
                    onChange={e => setSelectedDocId(e.target.value)}
                  >
                    <option value="">-- Chọn Tài liệu (PDF/DOCX) --</option>
                    {documents.map(doc => (
                      <option key={doc.id} value={doc.id}>{doc.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Số lượng câu hỏi (từ tài liệu)</Label>
                  <Input 
                    type="number"
                    min="1"
                    max="15"
                    value={questionCount}
                    onChange={(e) => setQuestionCount(parseInt(e.target.value))}
                    className="bg-background"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isGeneratingAI}>
                  {isGeneratingAI ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Đang phân tích...</> : "Tạo bài bằng AI"}
                </Button>
              </form>
            )}
          </Card>
        </div>

        {/* LIST QUIZ COLUMN */}
        <div className="md:col-span-2 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <BookOpen className="w-5 h-5 text-muted-foreground"/>
            <h2 className="font-semibold text-lg">Danh sách đã tạo ({quizzes.length})</h2>
          </div>

          {isLoading ? (
            <div className="flex items-center text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin mr-2" /> Đang tải...</div>
          ) : quizzes.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground border-dashed">
              Bạn chưa tạo bài trắc nghiệm nào.
            </Card>
          ) : (
            quizzes.map((q) => (
              <Card key={q.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-primary/40 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-foreground truncate">{q.title}</h3>
                    {q.is_published ? (
                      <Badge variant="default" className="bg-success hover:bg-success/90">Đã xuất bản</Badge>
                    ) : (
                      <Badge variant="secondary">Bản nháp</Badge>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground flex items-center gap-2">
                    <span>{q.question_count} câu hỏi</span>
                    <span>•</span>
                    <span>{q.chapter_label || 'Chưa phân loại'}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button variant="outline" size="sm" onClick={() => loadQuizDetail(q)}>
                    <Edit3 className="w-4 h-4 mr-2" /> Soạn thảo
                  </Button>
                  <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" onClick={() => handleDeleteQuiz(q.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
