import { useState, KeyboardEvent } from 'react';
import { Send, Paperclip } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  onSend: (message: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, disabled }: Props) {
  const [input, setInput] = useState('');

  const handleSend = () => {
    if (!input.trim() || disabled) return;
    onSend(input.trim());
    setInput('');
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="border-t bg-card p-4">
      <div className="max-w-3xl mx-auto flex items-end gap-2">
        <Button variant="ghost" size="icon" className="shrink-0 text-muted-foreground hover:text-foreground">
          <Paperclip className="w-5 h-5" />
        </Button>
        <div className="flex-1 relative">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question about the course..."
            disabled={disabled}
            rows={1}
            className="w-full resize-none rounded-xl border bg-background px-4 py-3 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground disabled:opacity-50 scrollbar-thin"
            style={{ minHeight: '44px', maxHeight: '120px' }}
          />
        </div>
        <Button
          onClick={handleSend}
          disabled={!input.trim() || disabled}
          size="icon"
          className="shrink-0 rounded-xl"
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
      <p className="text-[10px] text-muted-foreground/50 text-center mt-2">
        This chatbot uses RAG to answer based on course materials. Responses may not always be 100% accurate.
      </p>
    </div>
  );
}
