import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, ArrowLeft, Mail, Lock } from 'lucide-react';

const API_BASE_URL = 'http://127.0.0.1:8000/api';

export default function ForgotPasswordPage() {
  const navigate = useNavigate();

  const [step, setStep] = useState<'email' | 'verify' | 'reset'>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSendOtp = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!email.trim()) {
      setError('Email is required');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/forgot-password/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to send OTP');
        setIsSubmitting(false);
        return;
      }

      setSuccess('OTP sent to your email');
      setStep('verify');
    } catch {
      setError('Cannot connect to the server');
    }

    setIsSubmitting(false);
  };

  const handleVerifyOtp = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!otp.trim()) {
      setError('OTP is required');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/verify-otp/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Invalid OTP');
        setIsSubmitting(false);
        return;
      }

      setSuccess('OTP verified successfully');
      setStep('reset');
    } catch {
      setError('Cannot connect to the server');
    }

    setIsSubmitting(false);
  };

  const handleResetPassword = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/reset-password/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp, new_password: newPassword }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to reset password');
        setIsSubmitting(false);
        return;
      }

      setSuccess('Password reset successfully! Redirecting to login...');
      setTimeout(() => navigate('/login'), 2000);
    } catch {
      setError('Cannot connect to the server');
    }

    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md animate-fade-in">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <img src="/logo.png" alt="logo" className="w-16 h-16 object-contain" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">3N Chatbot</h1>
          <p className="text-muted-foreground mt-1">
            AI Learning Assistant for Software Engineering
          </p>
        </div>

        <div className="bg-card rounded-xl border p-6 shadow-sm space-y-4">
          <h2 className="text-lg font-semibold text-card-foreground text-center">
            {step === 'email' && 'Reset Password'}
            {step === 'verify' && 'Verify OTP'}
            {step === 'reset' && 'Create New Password'}
          </h2>

          {/* Step 1: Email */}
          {step === 'email' && (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>

              {error && (
                <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">
                  {error}
                </div>
              )}

              {success && (
                <div className="text-sm text-green-600 bg-green-50 border border-green-200 rounded-md px-3 py-2">
                  {success}
                </div>
              )}

              <Button type="submit" className="w-full h-12 text-base gap-2" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Sending OTP...
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4" />
                    Send OTP
                  </>
                )}
              </Button>
            </form>
          )}

          {/* Step 2: Verify OTP */}
          {step === 'verify' && (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-md px-3 py-2 text-sm text-blue-700">
                OTP has been sent to <strong>{email}</strong>
              </div>

              <div className="space-y-2">
                <Label htmlFor="otp">Enter OTP</Label>
                <Input
                  id="otp"
                  placeholder="Enter 6-digit OTP"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  disabled={isSubmitting}
                />
              </div>

              {error && (
                <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">
                  {error}
                </div>
              )}

              {success && (
                <div className="text-sm text-green-600 bg-green-50 border border-green-200 rounded-md px-3 py-2">
                  {success}
                </div>
              )}

              <Button type="submit" className="w-full h-12 text-base gap-2" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  'Verify OTP'
                )}
              </Button>

              <Button
                type="button"
                variant="ghost"
                className="w-full gap-2"
                onClick={() => {
                  setStep('email');
                  setError('');
                  setSuccess('');
                }}
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
            </form>
          )}

          {/* Step 3: Reset Password */}
          {step === 'reset' && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  placeholder="At least 8 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>

              {error && (
                <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">
                  {error}
                </div>
              )}

              {success && ( 
                <div className="text-sm text-green-600 bg-green-50 border border-green-200 rounded-md px-3 py-2">
                  {success}
                </div>
              )}

              <Button type="submit" className="w-full h-12 text-base gap-2" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Resetting Password...
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    Reset Password
                  </>
                )}
              </Button>

              <Button
                type="button"
                variant="ghost"
                className="w-full gap-2"
                onClick={() => navigate('/login')}
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Login
              </Button>
            </form>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          RAG chatbot system for answering course-related questions
        </p>
      </div>
    </div>
  );
}
