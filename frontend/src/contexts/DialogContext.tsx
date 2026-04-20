import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AlertCircle, Info, HelpCircle } from 'lucide-react';

type DialogOptions = {
  title?: string;
  message: string;
  isConfirm?: boolean;
  onConfirm?: () => void;
  onCancel?: () => void;
};

interface DialogContextType {
  showAlert: (message: string, title?: string) => Promise<void>;
  showConfirm: (message: string, title?: string) => Promise<boolean>;
}

const DialogContext = createContext<DialogContextType | undefined>(undefined);

export function DialogProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<DialogOptions | null>(null);

  const showAlert = useCallback((message: string, title: string = 'Thông báo') => {
    return new Promise<void>((resolve) => {
      setOptions({
        title,
        message,
        isConfirm: false,
        onConfirm: () => {
          setOpen(false);
          resolve();
        },
      });
      setOpen(true);
    });
  }, []);

  const showConfirm = useCallback((message: string, title: string = 'Xác nhận') => {
    return new Promise<boolean>((resolve) => {
      setOptions({
        title,
        message,
        isConfirm: true,
        onConfirm: () => {
          setOpen(false);
          resolve(true);
        },
        onCancel: () => {
          setOpen(false);
          resolve(false);
        },
      });
      setOpen(true);
    });
  }, []);

  // Thay đổi icon tuỳ vào loại dialog
  const isError = options?.message?.toLowerCase().includes('lỗi') || options?.message?.toLowerCase().includes('thất bại');
  const Icon = options?.isConfirm ? HelpCircle : (isError ? AlertCircle : Info);
  const iconColor = options?.isConfirm ? 'text-blue-500' : (isError ? 'text-destructive' : 'text-primary');

  return (
    <DialogContext.Provider value={{ showAlert, showConfirm }}>
      {children}
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-xl">
              <Icon className={`w-6 h-6 ${iconColor}`} />
              {options?.title}
            </AlertDialogTitle>
            <AlertDialogDescription className="whitespace-pre-wrap pt-2 text-base">
              {options?.message}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4">
            {options?.isConfirm && (
              <AlertDialogCancel onClick={options?.onCancel} className="mt-0">
                Hủy bỏ
              </AlertDialogCancel>
            )}
            <AlertDialogAction
              onClick={options?.onConfirm}
              className={isError && !options?.isConfirm ? 'bg-destructive hover:bg-destructive/90 text-destructive-foreground' : ''}
            >
              {options?.isConfirm ? 'Đồng ý' : 'Đóng'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DialogContext.Provider>
  );
}

export const useAppDialog = () => {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error('useAppDialog must be used within a DialogProvider');
  }
  return context;
};
