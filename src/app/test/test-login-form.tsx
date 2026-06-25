/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, prefer-const, @typescript-eslint/no-empty-object-type */
"use client";

import { useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function TestLoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        throw authError;
      }

      // Successful login will write cookies and trigger redirection
      window.location.href = '/dashboard';
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form className="mt-8 space-y-6" onSubmit={handleLogin}>
      <div className="space-y-4 rounded-md shadow-sm">
        <div>
          <Label htmlFor="test-email">Email address</Label>
          <Input
            id="test-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="mt-1"
            placeholder="test@clearledger.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isLoading}
          />
        </div>
        
        <div>
          <Label htmlFor="test-password">Password</Label>
          <Input
            id="test-password"
            name="password"
            type="password"
            required
            className="mt-1"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isLoading}
          />
        </div>
      </div>

      {error && (
        <div className="text-sm text-red-600 font-medium bg-red-50 p-3 rounded-md border border-red-100">
          {error}
        </div>
      )}

      <div>
        <Button
          type="submit"
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
          disabled={isLoading}
        >
          {isLoading ? 'Signing in...' : 'Sign In with Password'}
        </Button>
      </div>
    </form>
  );
}
