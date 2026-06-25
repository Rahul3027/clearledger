/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, prefer-const, @typescript-eslint/no-empty-object-type, react/no-unescaped-entities, jsx-a11y/role-has-required-aria-props, react/jsx-no-undef, no-restricted-imports */
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { Sidebar } from '@/components/layout/sidebar';
import { Topbar } from '@/components/layout/topbar';
import { withTenant } from '@/infrastructure/db/client';
import { entities } from '@/infrastructure/db/schema/entities';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) {
          return cookieStore.get(name)?.value;
        },
      },
    }
  );

  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    redirect('/login');
  }

  const email = user.email || 'user@example.com';
  const orgId = user.user_metadata?.org_id || 'Unknown Organization';

  let entitiesList: any[] = [];
  try {
    entitiesList = await withTenant(orgId, async (tx) => {
      return await tx.select().from(entities);
    });
  } catch (err) {
    console.error("Failed to fetch legal entities:", err);
  }

  const selectedEntityId = cookieStore.get("selected_entity_id")?.value || (entitiesList[0]?.id || null);
  const selectedTaxPeriod = cookieStore.get("selected_tax_period")?.value || "2026-06";

  return (
    <div className="flex h-screen bg-white overflow-hidden text-gray-900 font-sans">
      
      {/* Sidebar (Fixed on left) */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-white">
        
        {/* Topbar */}
        <Topbar 
          userEmail={email} 
          orgId={orgId} 
          entities={entitiesList}
          selectedEntityId={selectedEntityId}
          selectedTaxPeriod={selectedTaxPeriod}
        />

        {/* Scrollable Page Content */}
        <main className="flex-1 overflow-auto bg-[#FAFAFA]">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 h-full">
            {children}
          </div>
        </main>
      </div>

    </div>
  );
}

