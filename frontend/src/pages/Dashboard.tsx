import { useState, useEffect } from 'react';
import { Plus, Calendar, Send, Search, X } from 'lucide-react';
import Header from '../components/layout/Header';
import { Button } from '../components/ui/Button';
import { Table } from '../components/ui/Table';
import { Badge } from '../components/ui/Badge';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { EmptyState } from '../components/ui/EmptyState';
import ScheduledEmails from '../components/email/ScheduledEmails';
import SentEmails from '../components/email/SentEmails';
import ComposeModal from '../components/email/ComposeModal';
import { getStats, searchEmails } from '../services/api';
import type { EmailStats, Email } from '../types';
import { format } from 'date-fns';

type Tab = 'scheduled' | 'sent';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<Tab>('scheduled');
  const [composeOpen, setComposeOpen] = useState(false);
  const [stats, setStats] = useState<EmailStats>({ scheduled: 0, sent: 0, failed: 0 });
  const [refreshKey, setRefreshKey] = useState(0);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Email[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchExecuted, setSearchExecuted] = useState(false);

  useEffect(() => {
    getStats().then(setStats).catch(console.error);
  }, [refreshKey]);

  const handleScheduled = () => {
    setRefreshKey((k) => k + 1);
    setComposeOpen(false);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setSearchExecuted(false);
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    setSearchExecuted(true);
    try {
      const results = await searchEmails(searchQuery.trim());
      setSearchResults(results);
    } catch (err) {
      console.error('Search error:', err);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchExecuted(false);
    setSearchResults([]);
  };

  const tabs: { key: Tab; label: string; icon: React.ReactNode; count: number }[] = [
    { key: 'scheduled', label: 'Scheduled', icon: <Calendar className="w-4 h-4" />, count: stats.scheduled },
    { key: 'sent', label: 'Sent', icon: <Send className="w-4 h-4" />, count: stats.sent },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Scheduled', value: stats.scheduled, color: 'bg-blue-500' },
            { label: 'Sent', value: stats.sent, color: 'bg-green-500' },
            { label: 'Failed', value: stats.failed, color: 'bg-red-500' },
          ].map((s) => (
            <div
              key={s.label}
              className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-500">{s.label}</span>
                <div className={`w-2.5 h-2.5 rounded-full ${s.color}`} />
              </div>
              <p className="mt-2 text-3xl font-bold text-gray-900">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Search bar */}
        <div className="mb-6">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search emails by subject, body, or recipient (Elasticsearch)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 shadow-sm"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={clearSearch}
                  className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <Button type="submit" variant="secondary" loading={isSearching}>
              Search
            </Button>
          </form>
        </div>

        {/* Tab bar + compose button */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex bg-white rounded-lg border border-gray-200 p-1">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => {
                  clearSearch();
                  setActiveTab(tab.key);
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                  activeTab === tab.key && !searchExecuted
                    ? 'bg-primary-600 text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                {tab.icon}
                {tab.label}
                <span
                  className={`ml-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                    activeTab === tab.key && !searchExecuted
                      ? 'bg-white/20 text-white'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          <Button variant="primary" onClick={() => setComposeOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Compose New Email
          </Button>
        </div>

        {/* Content */}
        {searchExecuted ? (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Search Results for &quot;{searchQuery}&quot; ({searchResults.length})
              </h2>
              <button
                onClick={clearSearch}
                className="text-sm text-primary-600 hover:underline"
              >
                Back to all emails
              </button>
            </div>
            {isSearching ? (
              <div className="flex justify-center py-16">
                <LoadingSpinner size="lg" />
              </div>
            ) : searchResults.length === 0 ? (
              <EmptyState
                icon={<Search className="w-8 h-8 text-gray-400" />}
                title="No emails found"
                description="Try a different search query."
              />
            ) : (
              <Table headers={['Recipient', 'Subject', 'Scheduled / Sent Time', 'Status']}>
                {searchResults.map((email) => (
                  <tr key={email.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-gray-900 font-medium">{email.recipient}</td>
                    <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">{email.subject}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {email.sentAt
                        ? `Sent: ${format(new Date(email.sentAt), 'MMM d, yyyy h:mm a')}`
                        : `Scheduled: ${format(new Date(email.scheduledAt), 'MMM d, yyyy h:mm a')}`}
                    </td>
                    <td className="px-6 py-4">
                      <Badge status={email.status} />
                    </td>
                  </tr>
                ))}
              </Table>
            )}
          </div>
        ) : activeTab === 'scheduled' ? (
          <ScheduledEmails refreshKey={refreshKey} />
        ) : (
          <SentEmails refreshKey={refreshKey} />
        )}
      </main>

      {composeOpen && (
        <ComposeModal onClose={() => setComposeOpen(false)} onScheduled={handleScheduled} />
      )}
    </div>
  );
}
