import React from 'react';
import { motion } from 'framer-motion';
import { Shield, Check, X } from 'lucide-react';
import { ROLE_PERMISSIONS, UserRole } from '../types/auth';

const roleLabels: Record<UserRole, string> = {
  [UserRole.ADMIN]: 'Admin',
  [UserRole.RESELLER]: 'Reseller / Broker',
  [UserRole.SUPPORT]: 'Support',
};

const roleColors: Record<UserRole, string> = {
  [UserRole.ADMIN]: 'bg-violet-100 text-violet-800',
  [UserRole.RESELLER]: 'bg-amber-100 text-amber-800',
  [UserRole.SUPPORT]: 'bg-sky-100 text-sky-800',
};

const allResources = Array.from(
  new Set(
    Object.values(ROLE_PERMISSIONS).flatMap((perms) => perms.map((p) => p.resource))
  )
).sort();

const allActions = Array.from(
  new Set(
    Object.values(ROLE_PERMISSIONS).flatMap((perms) => perms.flatMap((p) => p.actions))
  )
).sort();

function hasPermission(role: UserRole, resource: string, action: string): boolean {
  const perms = ROLE_PERMISSIONS[role] ?? [];
  const entry = perms.find((p) => p.resource === resource);
  return entry?.actions.includes(action) ?? false;
}

const PermissionsPage: React.FC = () => {
  const roles = Object.values(UserRole);

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-2 rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
      >
        <div className="flex items-center gap-3">
          <Shield className="h-7 w-7 text-primary-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Role Permissions</h1>
            <p className="text-sm text-gray-500">
              Read-only matrix from <code className="text-xs bg-gray-100 px-1 rounded">ROLE_PERMISSIONS</code> in{' '}
              <code className="text-xs bg-gray-100 px-1 rounded">types/auth.ts</code>
            </p>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-x-auto"
      >
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="px-4 py-3 text-left font-semibold text-gray-700">Resource</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">Action</th>
              {roles.map((role) => (
                <th key={role} className="px-4 py-3 text-center font-semibold text-gray-700">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${roleColors[role]}`}>
                    {roleLabels[role]}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {allResources.flatMap((resource) =>
              allActions
                .filter((action) => roles.some((r) => hasPermission(r, resource, action)))
                .map((action) => (
                  <tr key={`${resource}-${action}`} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="px-4 py-2.5 font-medium text-gray-900 capitalize">{resource}</td>
                    <td className="px-4 py-2.5 text-gray-600 capitalize">{action}</td>
                    {roles.map((role) => (
                      <td key={role} className="px-4 py-2.5 text-center">
                        {hasPermission(role, resource, action) ? (
                          <Check className="inline h-4 w-4 text-green-600" />
                        ) : (
                          <X className="inline h-4 w-4 text-gray-300" />
                        )}
                      </td>
                    ))}
                  </tr>
                ))
            )}
          </tbody>
        </table>
      </motion.div>

      <div className="grid gap-4 md:grid-cols-3">
        {roles.map((role, i) => (
          <motion.section
            key={role}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.05 }}
            className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm"
          >
            <h2 className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold mb-3 ${roleColors[role]}`}>
              {roleLabels[role]}
            </h2>
            <ul className="space-y-2 text-sm text-gray-600">
              {(ROLE_PERMISSIONS[role] ?? []).map((perm) => (
                <li key={perm.resource}>
                  <span className="font-medium text-gray-900 capitalize">{perm.resource}</span>
                  <span className="text-gray-400"> — </span>
                  {perm.actions.join(', ')}
                </li>
              ))}
            </ul>
          </motion.section>
        ))}
      </div>
    </div>
  );
};

export default PermissionsPage;
