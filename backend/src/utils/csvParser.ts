/**
 * CSV / Text file parser for extracting email addresses.
 */

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

/**
 * Validate if a string is a valid email address.
 */
const isValidEmail = (email: string): boolean => {
  return EMAIL_REGEX.test(email.trim());
};

/**
 * Extract email addresses from a line of text.
 * Handles comma-separated, semicolon-separated, tab-separated, and newline-separated.
 */
const extractEmails = (text: string): string[] => {
  const emails: string[] = [];

  // Split by common delimiters: comma, semicolon, tab, newline, pipe
  const tokens = text.split(/[,;\t\n\r|]+/);

  for (const token of tokens) {
    const trimmed = token.trim().replace(/^["']|["']$/g, ''); // Remove surrounding quotes
    if (trimmed && isValidEmail(trimmed)) {
      emails.push(trimmed.toLowerCase());
    }
  }

  return emails;
};

/**
 * Parse a CSV or plain text file buffer to extract email addresses.
 * Returns an array of unique valid email addresses.
 */
export const parseEmailFile = (buffer: Buffer, mimetype: string): string[] => {
  const content = buffer.toString('utf-8');
  const allEmails: string[] = [];

  if (mimetype === 'text/csv' || mimetype === 'application/vnd.ms-excel') {
    // CSV parsing: split by lines, then extract emails from each line
    const lines = content.split(/\r?\n/);

    for (const line of lines) {
      if (!line.trim()) continue;

      // Try to find email addresses in each cell
      const cells = line.split(',');
      for (const cell of cells) {
        const trimmed = cell.trim().replace(/^["']|["']$/g, '');
        if (trimmed && isValidEmail(trimmed)) {
          allEmails.push(trimmed.toLowerCase());
        }
      }
    }
  } else {
    // Plain text: extract emails from the entire content
    const extracted = extractEmails(content);
    allEmails.push(...extracted);
  }

  // Return unique emails
  return [...new Set(allEmails)];
};
