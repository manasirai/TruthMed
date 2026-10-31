import { Lock, Database, Eye, Trash2, Globe } from 'lucide-react';
import { Card } from '@/components/ui/Card';

export function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Privacy Policy</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Last updated: January 2024</p>
      </div>

      {[
        {
          icon: <Database className="w-5 h-5" />,
          title: 'What We Store',
          content: `When you submit a health claim, TruthMed stores:
• The claim text (anonymously  no account or identity is linked)
• The analysis result and verdict
• Source citations generated during analysis
• The timestamp of the analysis

We do not store your IP address in the fact-check database. We do not require registration or login for the basic fact-checking experience.`,
        },
        {
          icon: <Eye className="w-5 h-5" />,
          title: 'What We Do NOT Store',
          content: `• Personal health information about you
• Identifiers linking claims to individuals
• Payment information
• Browser fingerprints associated with claim content
• Passwords or authentication credentials`,
        },
        {
          icon: <Trash2 className="w-5 h-5" />,
          title: 'Data Retention',
          content: `Analysis history is retained for operational purposes and to support the history feature. We do not currently provide a self-service deletion tool. If you wish to request deletion of specific analysis records, contact the system administrator.

In a production deployment, implement a documented retention and deletion schedule appropriate to your jurisdiction.`,
        },
        {
          icon: <Lock className="w-5 h-5" />,
          title: 'Security',
          content: `API keys and other secrets are stored server-side only and never transmitted to the browser. Database access is controlled via the backend only. CORS is configured to only allow the frontend origin.

This is an open-source educational project. Deploy in a hardened environment and review the security notes in the README before exposing to the public internet.`,
        },
      ].map((section) => (
        <Card key={section.title}>
          <div className="flex items-center gap-2.5 mb-3">
            <span className="text-teal-600 dark:text-teal-400">{section.icon}</span>
            <h2 className="font-semibold text-sm text-gray-800 dark:text-gray-200">{section.title}</h2>
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-line">{section.content}</p>
        </Card>
      ))}
    </div>
  );
}
