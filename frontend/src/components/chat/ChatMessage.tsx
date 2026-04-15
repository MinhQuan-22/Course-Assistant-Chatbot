import ReactMarkdown from 'react-markdown';
import { ChatMessage as ChatMessageType } from '@/types';
import { Bot, User, FileText } from 'lucide-react';

interface Props {
  message: ChatMessageType;
}

export function ChatMessageBubble({ message }: Props) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex gap-3 animate-fade-in ${isUser ? 'flex-row-reverse' : ''}`}>
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
          isUser ? 'bg-primary' : 'bg-muted'
        }`}
      >
        {isUser ? (
          <User className="w-4 h-4 text-primary-foreground" />
        ) : (
          <Bot className="w-4 h-4 text-foreground" />
        )}
      </div>

      <div className={`max-w-[75%] space-y-2 ${isUser ? 'items-end' : 'items-start'}`}>
        <div className={`px-4 py-3 ${isUser ? 'chat-bubble-user' : 'chat-bubble-bot'}`}>
          {message.isStreaming && !message.content ? (
            <div className="flex gap-1 py-1">
              <span className="typing-dot w-2 h-2 rounded-full bg-muted-foreground" />
              <span className="typing-dot w-2 h-2 rounded-full bg-muted-foreground" />
              <span className="typing-dot w-2 h-2 rounded-full bg-muted-foreground" />
            </div>
          ) : (
            <div className="prose prose-sm max-w-none dark:prose-invert prose-p:my-1 prose-headings:my-2 prose-pre:bg-foreground/5 prose-pre:rounded-lg prose-code:text-primary">
              <ReactMarkdown>{message.content}</ReactMarkdown>
            </div>
          )}
        </div>

        {message.sources && message.sources.length > 0 && (
          <div className="space-y-1">
            {message.sources.map((source: any, i: number) => {
              const documentName =
                source.documentName || source.document_name || 'Unknown document';

              const page = source.page;
              const chunkIndex = source.chunk_index;

              return (
                <div
                  key={i}
                  className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2 animate-slide-in"
                >
                  <FileText className="w-3 h-3 mt-0.5 shrink-0" />
                  <span>
                    <strong>{documentName}</strong>
                    {page ? <> — Page {page}</> : null}
                    {!page && chunkIndex !== undefined ? <> — Chunk {chunkIndex}</> : null}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        <span className="text-[10px] text-muted-foreground/60 px-1">
          {message.timestamp.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      </div>
    </div>
  );
}