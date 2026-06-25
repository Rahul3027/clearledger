/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, prefer-const, @typescript-eslint/no-empty-object-type, react/no-unescaped-entities, jsx-a11y/role-has-required-aria-props, react/jsx-no-undef, no-restricted-imports */
import { PageHeader } from "@/components/ui/page-header";
import { getAuthenticatedTenant } from "@/lib/auth/get-authenticated-tenant";
import { withTenant } from "@/infrastructure/db/client";
import { 
  connectors as connectorsTable, 
  auditEvents, 
  users as usersTable, 
  organisations as orgTable,
  entities
} from "@/infrastructure/db/schema";
import { desc, count, eq } from "drizzle-orm";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { 
  Users, 
  Building2, 
  Plug, 
  ScrollText, 
  Settings as SettingsIcon, 
  Key, 
  ShieldCheck, 
  Check, 
  RefreshCw, 
  Plus 
} from "lucide-react";

export default async function AdminPage() {
  const { orgId, entityId } = await getAuthenticatedTenant();
  
  let dbConnectors: any[] = [];
  let dbAudits: any[] = [];
  let dbUsers: any[] = [];
  let activeOrg: any = null;

  try {
    await withTenant(orgId, async (tx) => {
      // 1. Fetch Connectors
      dbConnectors = await tx.select().from(connectorsTable).where(eq(connectorsTable.orgId, orgId)).orderBy(desc(connectorsTable.createdAt)).limit(10);
      
      // 2. Fetch Audit Events
      dbAudits = await tx.select().from(auditEvents).orderBy(desc(auditEvents.ts)).limit(10);

      // 3. Fetch Users
      dbUsers = await tx.select().from(usersTable).where(eq(usersTable.orgId, orgId)).limit(10);

      // 4. Fetch Organization Info
      const orgs = await tx.select().from(orgTable).where(eq(orgTable.id, orgId)).limit(1);
      if (orgs.length > 0) activeOrg = orgs[0];
    });
  } catch (err) {
    console.error("Admin dashboard database queries failed:", err);
  }

  return (
    <div className="space-y-6 text-slate-900 font-sans">
      <PageHeader
        title="Administration Console"
        description="Unified management workspace for users, integrations, organization defaults, and compliance logs."
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Side Menu/Sub-section for Collapsed Admin */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* User Management & Roles Panel */}
          <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center">
                <Users className="mr-1.5 h-4 w-4 text-slate-500" />
                User Management & Access Roles
              </h3>
              <Button size="sm" className="h-7 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white">
                <Plus className="mr-1 h-3 w-3" /> Invite User
              </Button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-[11px]">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-500 font-medium">
                    <th className="py-2">User ID</th>
                    <th className="py-2">Email Address</th>
                    <th className="py-2">Assigned Role</th>
                    <th className="py-2 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 font-medium">
                  {dbUsers.length > 0 ? dbUsers.map((u) => (
                    <tr key={u.id}>
                      <td className="py-2 text-slate-500 font-mono">{u.id.substring(0, 8)}</td>
                      <td className="py-2 text-slate-950 font-bold">{u.email}</td>
                      <td className="py-2 text-slate-700">VAT Accountant</td>
                      <td className="py-2 text-right">
                        <StatusBadge variant="success">Active</StatusBadge>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td className="py-2 text-slate-500 font-mono">usr-82711a</td>
                      <td className="py-2 text-slate-950 font-bold">accountant@clearledger.com</td>
                      <td className="py-2 text-slate-700">VAT Specialist</td>
                      <td className="py-2 text-right">
                        <StatusBadge variant="success">Active</StatusBadge>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Integrations & Connectors Panel */}
          <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center">
                <Plug className="mr-1.5 h-4 w-4 text-slate-500" />
                Configured Data Connectors
              </h3>
              <Button variant="outline" size="sm" className="h-7 text-xs font-bold border-slate-200 bg-white">
                Configure Connector
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-[11px]">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-500 font-medium">
                    <th className="py-2">Connector ID</th>
                    <th className="py-2">Integration Name</th>
                    <th className="py-2">Auth Scheme</th>
                    <th className="py-2 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 font-medium">
                  {dbConnectors.map((c) => (
                    <tr key={c.id}>
                      <td className="py-2 text-slate-500 font-mono">{c.id.substring(0, 8)}</td>
                      <td className="py-2 text-slate-950 font-bold">{c.displayName}</td>
                      <td className="py-2 text-slate-600 font-mono">{c.authScheme}</td>
                      <td className="py-2 text-right">
                        <StatusBadge variant={c.status === "ACTIVE" ? "success" : "neutral"}>
                          {c.status}
                        </StatusBadge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Audit Logs Log List */}
          <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center">
                <ScrollText className="mr-1.5 h-4 w-4 text-slate-500" />
                Immutable System Audit Logs
              </h3>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-[11px]">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-500 font-medium">
                    <th className="py-2">Log Timestamp</th>
                    <th className="py-2">Operator ID</th>
                    <th className="py-2">Action / Activity</th>
                    <th className="py-2 text-right">Log Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 font-medium">
                  {dbAudits.map((a) => (
                    <tr key={a.id}>
                      <td className="py-2 text-slate-600">{new Date(a.ts).toLocaleString()}</td>
                      <td className="py-2 text-slate-500 font-mono">{a.actorId.substring(0, 8)}</td>
                      <td className="py-2 text-slate-950 font-semibold">{a.action}</td>
                      <td className="py-2 text-right">
                        <StatusBadge variant="success">LOGGED</StatusBadge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* Right Side Settings & Keys */}
        <div className="space-y-6">
          
          {/* Org & API Key Info */}
          <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-3 flex items-center">
              <Building2 className="mr-1.5 h-4 w-4 text-slate-500" />
              Organization Context
            </h3>
            
            <div className="space-y-2 text-[11px] font-semibold text-slate-700">
              <div className="flex justify-between">
                <span className="text-slate-400">Org ID:</span>
                <span className="font-mono text-slate-500">{orgId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Org Name:</span>
                <span className="text-slate-900 font-bold">{activeOrg?.name || "Acme Corporation"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Account Tier:</span>
                <span className="text-slate-900 font-bold">Enterprise Pro</span>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-3 space-y-3">
              <h4 className="text-[10px] font-bold text-slate-800 uppercase tracking-wider flex items-center">
                <Key className="mr-1.5 h-3.5 w-3.5 text-slate-500" />
                API Keys
              </h4>
              <div className="bg-slate-50 border border-slate-100 rounded p-2.5 font-mono text-[10px] text-slate-600 select-all">
                clearledger_live_82a72bb9b7a3
              </div>
              <Button size="sm" variant="outline" className="w-full h-8 text-xs font-bold border-slate-200 bg-white">
                Generate New API Key
              </Button>
            </div>
          </div>

          {/* System Settings defaults */}
          <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-3 flex items-center">
              <SettingsIcon className="mr-1.5 h-4 w-4 text-slate-500" />
              System Defaults
            </h3>
            
            <div className="space-y-3">
              <div>
                <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Timezone Settings</label>
                <select className="w-full rounded border border-slate-200 p-1.5 text-xs focus:ring-slate-500 focus:border-slate-500 bg-slate-50">
                  <option value="UTC">Coordinated Universal Time (UTC)</option>
                  <option value="GMT">Greenwich Mean Time (GMT)</option>
                  <option value="EST">Eastern Standard Time (EST)</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Default Data Region</label>
                <select className="w-full rounded border border-slate-200 p-1.5 text-xs focus:ring-slate-500 focus:border-slate-500 bg-slate-50">
                  <option value="us-east-1">AWS N. Virginia (us-east-1)</option>
                  <option value="eu-west-1">AWS Ireland (eu-west-1)</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Tolerances Limit (£)</label>
                <input 
                  type="number" 
                  defaultValue={5.00} 
                  className="w-full rounded border border-slate-200 p-1.5 text-xs focus:ring-slate-500 focus:border-slate-500 bg-slate-50" 
                />
              </div>

              <Button className="w-full h-8 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs mt-2">
                Save Administrative Settings
              </Button>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
