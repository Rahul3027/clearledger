/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, prefer-const, @typescript-eslint/no-empty-object-type, react/no-unescaped-entities */
import { redirect } from 'next/navigation';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import TestLoginForm from './test-login-form';

export default async function TestLoginPage() {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch (error) {}
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options });
          } catch (error) {}
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    redirect('/dashboard');
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-50">
      <div className="w-full max-w-md space-y-8 bg-white p-8 rounded-xl shadow-lg border border-slate-100">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 font-bold text-xl">
            CL
          </div>
          <h2 className="mt-6 text-3xl font-extrabold tracking-tight text-slate-900">
            ClearLedger Testing Gateway
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Enter test credentials to bypass SMTP email limits.
          </p>
        </div>
        
        <TestLoginForm />
        
        <div className="text-center text-xs text-slate-400 mt-4 border-t border-slate-100 pt-4">
          Development & QA environment access only.
        </div>
      </div>
    </div>
  );
}
