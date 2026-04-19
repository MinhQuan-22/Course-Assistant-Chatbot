import { useEffect, useState } from 'react';
import { MessageSquare, Clock, Trash2, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const API_BASE_URL = 'http://127.0.0.1:8000/api';

type ConversationItem = {
  id: number;
  title: string;
  user_id: number;
  last_message: string;
  updated_at: string;
  message_count: number;
};

export default function HistoryPage() {
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedConvId, setSelectedConvId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const savedUser = localStorage.getItem('user');
  const user = savedUser ? JSON.parse(savedUser) : null;

  useEffect(() => {
  const fetchConversations = async () => {
    const token = localStorage.getItem('token');

    if (!user?.id || !token) {
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/chat/conversations/`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.ok) {
        setConversations(data);
      } else {
        console.error('History error:', data);
        setConversations([]);
      }
    } catch (error) {
      console.error('History fetch failed:', error);
      setConversations([]);
    } finally {
      setIsLoading(false);
    }
  };

  fetchConversations();
}, [user?.id]);

  const handleOpenConversation = (conversationId: number) => {
    navigate(`/chat?conversation_id=${conversationId}`);
  };

  const handleDeleteClick = (e: React.MouseEvent, conversationId: number) => {
    e.stopPropagation();
    setSelectedConvId(conversationId);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedConvId) return;

    setIsDeleting(true);
    const token = localStorage.getItem('token');

    try {
      const response = await fetch(`${API_BASE_URL}/chat/conversations/${selectedConvId}/delete/`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        setConversations(conversations.filter((conv) => conv.id !== selectedConvId));
        setDeleteDialogOpen(false);
        setSelectedConvId(null);
      } else {
        console.error('Delete failed:', response.statusText);
      }
    } catch (error) {
      console.error('Delete error:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="p-6 overflow-y-auto h-full">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-foreground mb-1">Chat History</h1>
        <p className="text-muted-foreground mb-6">
          Review your previous conversations
        </p>

        {isLoading ? (
          <div className="text-muted-foreground">Loading conversations...</div>
        ) : conversations.length === 0 ? (
          <div className="text-muted-foreground">No conversations found.</div>
        ) : (
          <div className="space-y-3">
            {conversations.map((conv) => (
              <Card
                key={conv.id}
                className="p-4 hover:shadow-md transition-shadow cursor-pointer group"
                onClick={() => handleOpenConversation(conv.id)}
              >
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <MessageSquare className="w-4 h-4 text-primary" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-medium text-foreground truncate group-hover:text-primary transition-colors">
                        {conv.title || 'Untitled conversation'}
                      </h3>

                      <Button
                        variant="ghost"
                        size="icon"
                        className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive h-7 w-7"
                        onClick={(e) => handleDeleteClick(e, conv.id)}
                        disabled={isDeleting}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>

                    <p className="text-sm text-muted-foreground truncate">
                      {conv.last_message}
                    </p>

                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground/70">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(conv.updated_at).toLocaleDateString()}
                      </span>
                      <span>{conv.message_count} messages</span>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Conversation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this conversation? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex justify-end gap-3">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}