import { useEffect, useState } from 'react';
import { Settings, Key, Database, Cpu, Check, Loader2, RefreshCw } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/contexts/AuthContext';

const API = 'http://127.0.0.1:8000/api';

const DEFAULT_VALUES: Record<string, string> = {
  ai_model: 'gpt-3.5-turbo',
  streaming_enabled: 'true',
  memory_enabled: 'true',
  chunk_size: '500',
  chunk_overlap: '50',
  top_k_results: '5',
};

export default function AdminSettingsPage() {
  const { token } = useAuth();
  const h = { Authorization: `Bearer ${token}` };

  const [settings, setSettings] = useState<Record<string, string>>(DEFAULT_VALUES);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  // Load from backend
  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const r = await fetch(`${API}/admin/settings/`, { headers: h });
      const data = await r.json();
      if (r.ok) {
        setSettings({ ...DEFAULT_VALUES, ...data });
      } else {
        setError(data.error || 'Could not load settings');
      }
    } catch {
      setError('Cannot connect to server');
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  // Save to backend
  const save = async () => {
    setSaving(true);
    setSaved(false);
    setError('');
    try {
      const r = await fetch(`${API}/admin/settings/`, {
        method: 'POST',
        headers: { ...h, 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Save failed');
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e: any) {
      setError(e.message);
    }
    setSaving(false);
  };

  const set = (key: string, value: string) =>
    setSettings((prev) => ({ ...prev, [key]: value }));

  const bool = (key: string) => settings[key] === 'true';
  const toggleBool = (key: string) =>
    set(key, settings[key] === 'true' ? 'false' : 'true');

  if (loading) {
    return (
      <div className="p-6 flex items-center gap-2 text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" /> Đang tải cài đặt...
      </div>
    );
  }

  return (
    <div className="p-6 overflow-y-auto h-full">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Cài đặt hệ thống</h1>
            <p className="text-muted-foreground text-sm">Cấu hình AI model, API keys và các thiết lập khác</p>
          </div>
          <Button variant="ghost" size="icon" onClick={load} title="Tải lại">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>

        {error && (
          <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">{error}</div>
        )}

        {/* AI Model */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Cpu className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">Cấu hình AI Model</h2>
          </div>
          <div>
            <Label>Model mặc định</Label>
            <Select value={settings.ai_model} onValueChange={(v) => set('ai_model', v)}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo (Nhanh)</SelectItem>
                <SelectItem value="gpt-4">GPT-4 (Chính xác hơn)</SelectItem>
                <SelectItem value="gpt-4-turbo">GPT-4 Turbo</SelectItem>
                <SelectItem value="gemini-pro">Gemini Pro</SelectItem>
                <SelectItem value="llama3-local">Llama 3 (Local)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              Model hiện tại: <strong>{settings.ai_model}</strong>
            </p>
          </div>

          <div className="flex items-center justify-between py-1">
            <div>
              <Label>Streaming Response</Label>
              <p className="text-xs text-muted-foreground">Hiển thị câu trả lời từng từ một (SSE)</p>
            </div>
            <Switch checked={bool('streaming_enabled')} onCheckedChange={() => toggleBool('streaming_enabled')} />
          </div>

          <div className="flex items-center justify-between py-1">
            <div>
              <Label>Conversation Memory</Label>
              <p className="text-xs text-muted-foreground">Chatbot nhớ ngữ cảnh hội thoại trước đó</p>
            </div>
            <Switch checked={bool('memory_enabled')} onCheckedChange={() => toggleBool('memory_enabled')} />
          </div>
        </Card>

        {/* API Keys */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Key className="w-5 h-5 text-yellow-500" />
            <h2 className="text-lg font-semibold">API Keys</h2>
          </div>
          <div>
            <Label>OpenAI API Key</Label>
            <Input
              type="password"
              placeholder="sk-..."
              value={settings.openai_api_key || ''}
              onChange={(e) => set('openai_api_key', e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label>Google AI API Key</Label>
            <Input
              type="password"
              placeholder="AIza..."
              value={settings.google_ai_key || ''}
              onChange={(e) => set('google_ai_key', e.target.value)}
              className="mt-1"
            />
          </div>
        </Card>

        {/* Vector DB */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Database className="w-5 h-5 text-blue-500" />
            <h2 className="text-lg font-semibold">Vector Database (RAG)</h2>
          </div>
          <div>
            <Label>Chunk Size (tokens)</Label>
            <Input
              type="number"
              value={settings.chunk_size}
              onChange={(e) => set('chunk_size', e.target.value)}
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">Kích thước mỗi đoạn văn bản khi chia nhỏ</p>
          </div>
          <div>
            <Label>Chunk Overlap</Label>
            <Input
              type="number"
              value={settings.chunk_overlap}
              onChange={(e) => set('chunk_overlap', e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label>Top K Results</Label>
            <Input
              type="number"
              value={settings.top_k_results}
              onChange={(e) => set('top_k_results', e.target.value)}
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">Số đoạn văn bản liên quan nhất gửi cho LLM</p>
          </div>
        </Card>

        {/* Save */}
        <div className="flex items-center justify-end gap-3">
          {saved && (
            <span className="text-sm text-green-600 flex items-center gap-1">
              <Check className="w-4 h-4" /> Đã lưu thành công
            </span>
          )}
          <Button onClick={save} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Settings className="w-4 h-4 mr-2" />}
            Lưu cài đặt
          </Button>
        </div>
      </div>
    </div>
  );
}
