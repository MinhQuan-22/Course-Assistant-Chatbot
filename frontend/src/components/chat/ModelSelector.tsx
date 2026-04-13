import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Cpu } from 'lucide-react';

const models = [
  { id: 'gpt-3.5', name: 'GPT-3.5 Turbo', desc: 'Nhanh' },
  { id: 'gpt-4', name: 'GPT-4', desc: 'Thông minh' },
  { id: 'gemini', name: 'Gemini Pro', desc: 'Google AI' },
  { id: 'llama3', name: 'Llama 3 (Local)', desc: 'Ollama' },
];

interface Props {
  value: string;
  onChange: (v: string) => void;
}

export function ModelSelector({ value, onChange }: Props) {
  return (
    <div className="flex items-center gap-2">
      <Cpu className="w-4 h-4 text-muted-foreground" />
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-[180px] h-8 text-xs border-dashed">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {models.map((m) => (
            <SelectItem key={m.id} value={m.id}>
              <span className="font-medium">{m.name}</span>
              <span className="ml-2 text-muted-foreground">({m.desc})</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
