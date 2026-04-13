import { Settings, Key, Database, Cpu } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

export default function AdminSettingsPage() {
  return (
    <div className="p-6 overflow-y-auto h-full">
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Cài đặt hệ thống</h1>
          <p className="text-muted-foreground">Cấu hình AI model, API keys và các thiết lập khác</p>
        </div>

        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Cpu className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Cấu hình AI Model</h2>
          </div>
          <div className="space-y-3">
            <div>
              <Label>Model mặc định</Label>
              <Select defaultValue="gpt-3.5">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="gpt-3.5">GPT-3.5 Turbo</SelectItem>
                  <SelectItem value="gpt-4">GPT-4</SelectItem>
                  <SelectItem value="gemini">Gemini Pro</SelectItem>
                  <SelectItem value="llama3">Llama 3 (Local)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Streaming Response</Label>
                <p className="text-xs text-muted-foreground">Hiển thị câu trả lời từng từ một</p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Conversation Memory</Label>
                <p className="text-xs text-muted-foreground">Chatbot nhớ ngữ cảnh hội thoại</p>
              </div>
              <Switch defaultChecked />
            </div>
          </div>
        </Card>

        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Key className="w-5 h-5 text-warning" />
            <h2 className="text-lg font-semibold text-foreground">API Keys</h2>
          </div>
          <div>
            <Label>OpenAI API Key</Label>
            <Input type="password" placeholder="sk-..." defaultValue="sk-••••••••••••••••" />
          </div>
          <div>
            <Label>Google AI API Key</Label>
            <Input type="password" placeholder="AIza..." />
          </div>
        </Card>

        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Database className="w-5 h-5 text-accent" />
            <h2 className="text-lg font-semibold text-foreground">Vector Database</h2>
          </div>
          <div>
            <Label>Chunk Size</Label>
            <Input type="number" defaultValue="500" />
            <p className="text-xs text-muted-foreground mt-1">Kích thước mỗi đoạn văn bản khi chia nhỏ (tokens)</p>
          </div>
          <div>
            <Label>Chunk Overlap</Label>
            <Input type="number" defaultValue="50" />
          </div>
          <div>
            <Label>Top K Results</Label>
            <Input type="number" defaultValue="5" />
            <p className="text-xs text-muted-foreground mt-1">Số đoạn văn bản liên quan nhất để gửi cho LLM</p>
          </div>
        </Card>

        <div className="flex justify-end">
          <Button>Lưu cài đặt</Button>
        </div>
      </div>
    </div>
  );
}
