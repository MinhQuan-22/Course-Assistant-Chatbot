import { FormEvent, useState } from 'react';
import { CredentialResponse, GoogleLogin } from '@react-oauth/google';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, LogIn } from 'lucide-react';

export default function LoginPage() {
  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const goAfterLogin = () => {
    const savedUser = localStorage.getItem('user');
    if (!savedUser) {
      setError('Could not load user information');
      return;
    }

    const parsedUser = JSON.parse(savedUser);
    if (parsedUser.role === 'admin') {
      navigate('/admin');
    } else if (parsedUser.role === 'teacher') {
      navigate('/documents');
    } else {
      navigate('/chat');
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    const result = await login({ identifier, password });

    setIsSubmitting(false);

    if (!result.success) {
      setError(result.message || 'Login failed');
      return;
    }

    goAfterLogin();
  };

  const handleGoogleSuccess = async (credentialResponse: CredentialResponse) => {
    setError('');

    if (!credentialResponse.credential) {
      setError('Google credential not received');
      return;
    }

    setIsSubmitting(true);

    const result = await loginWithGoogle(credentialResponse.credential);

    setIsSubmitting(false);

    if (!result.success) {
      setError(result.message || 'Google login failed');
      return;
    }

    goAfterLogin();
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
          <h2 className="text-lg font-semibold text-card-foreground text-center">Sign in</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="identifier">Username or Email</Label>
              <Input
                id="identifier"
                placeholder="Enter your username or email"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isSubmitting}
              />
            </div>

            {error && (
              <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full h-12 text-base gap-2" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  Sign in
                </>
              )}
            </Button>
          </form>

          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-card px-2 text-muted-foreground">or</span>
            </div>
          </div>

          <div className="flex justify-center">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => setError('Google login failed')}
            />
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          RAG chatbot system for answering course-related questions
        </p>
      </div>
    </div>
  );
}