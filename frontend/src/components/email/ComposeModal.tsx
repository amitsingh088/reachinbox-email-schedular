import { useState, useRef } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { scheduleEmails } from '../../services/api';

interface ComposeModalProps {
  onClose: () => void;
  onScheduled: () => void;
}

export default function ComposeModal({ onClose, onScheduled }: ComposeModalProps) {
  const [sender, setSender] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [delayBetween, setDelayBetween] = useState(2);
  const [hourlyLimit, setHourlyLimit] = useState(50);
  const [file, setFile] = useState<File | null>(null);
  const [parsedCount, setParsedCount] = useState<number>(0);
  const [manualRecipients, setManualRecipients] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
      const matches = text.match(emailRegex) || [];
      const unique = [...new Set(matches)];
      setParsedCount(unique.length);
    };
    reader.readAsText(f);
  };

  const handleSubmit = async () => {
    setError(null);

    // Build recipients from manual input
    const manualList = manualRecipients
      .split(/[,\n]+/)
      .map((s) => s.trim())
      .filter((s) => s.includes('@'));

    if (manualList.length === 0 && !file) {
      setError('Please add at least one recipient or upload a file.');
      return;
    }
    if (!sender || !subject || !body || !scheduledAt) {
      setError('Please fill in all required fields.');
      return;
    }

    setLoading(true);
    try {
      await scheduleEmails(
        {
          sender,
          recipients: manualList,
          subject,
          body,
          scheduledAt: new Date(scheduledAt).toISOString(),
          delayBetweenMs: delayBetween * 1000,
          hourlyLimit,
        },
        file || undefined
      );
      setSuccess(true);
      setTimeout(onScheduled, 1500);
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Failed to schedule emails. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const footer = (
    <>
      <Button variant="secondary" onClick={onClose} disabled={loading}>
        Cancel
      </Button>
      <Button variant="primary" onClick={handleSubmit} loading={loading} disabled={success}>
        {success ? 'Scheduled!' : 'Schedule Emails'}
      </Button>
    </>
  );

  return (
    <Modal title="Compose New Email" onClose={onClose} footer={footer}>
      {success ? (
        <div className="flex flex-col items-center py-8 text-center animate-fade-in">
          <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mb-4">
            <CheckCircle className="w-7 h-7 text-green-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Emails Scheduled!</h3>
          <p className="text-sm text-gray-500">Your emails have been queued for delivery.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <Input
            label="Sender Email *"
            type="email"
            placeholder="you@example.com"
            value={sender}
            onChange={(e) => setSender(e.target.value)}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Recipients (one per line or comma-separated)
            </label>
            <textarea
              className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none transition-all resize-none"
              rows={3}
              placeholder={"alice@example.com\nbob@example.com"}
              value={manualRecipients}
              onChange={(e) => setManualRecipients(e.target.value)}
            />
          </div>

          {/* File upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Or Upload CSV / Text File
            </label>
            <div
              onClick={() => fileRef.current?.click()}
              className="flex items-center justify-center gap-2 px-4 py-6 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-primary-400 hover:bg-primary-50/50 transition-all"
            >
              <input
                ref={fileRef}
                type="file"
                accept=".csv,.txt"
                className="hidden"
                onChange={handleFileChange}
              />
              {file ? (
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <FileText className="w-5 h-5 text-primary-600" />
                  <span className="font-medium">{file.name}</span>
                  <span className="text-gray-400">•</span>
                  <span className="text-primary-600 font-semibold">{parsedCount} emails detected</span>
                </div>
              ) : (
                <div className="flex flex-col items-center text-gray-400">
                  <Upload className="w-6 h-6 mb-1" />
                  <span className="text-sm">Click to upload CSV or TXT</span>
                </div>
              )}
            </div>
          </div>

          <Input
            label="Subject *"
            placeholder="Email subject line"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Body *</label>
            <textarea
              className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none transition-all resize-none"
              rows={5}
              placeholder="Write your email body here… (HTML supported)"
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </div>

          <Input
            label="Scheduled Start Time *"
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Delay Between (seconds)"
              type="number"
              min={0}
              value={delayBetween}
              onChange={(e) => setDelayBetween(Number(e.target.value))}
            />
            <Input
              label="Hourly Limit"
              type="number"
              min={1}
              value={hourlyLimit}
              onChange={(e) => setHourlyLimit(Number(e.target.value))}
            />
          </div>
        </div>
      )}
    </Modal>
  );
}
