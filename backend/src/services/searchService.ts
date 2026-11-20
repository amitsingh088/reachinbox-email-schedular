import { getElasticsearchClient, EMAIL_INDEX } from '../config/elasticsearch';
import prisma from '../config/database';

interface EmailDocument {
  id: string;
  userId: string;
  sender: string;
  recipient: string;
  subject: string;
  body: string;
  status: string;
  scheduledAt: string;
  sentAt?: string;
  createdAt: string;
  batchId?: string;
}

/**
 * Index an email document in Elasticsearch for search.
 */
export const indexEmail = async (email: EmailDocument): Promise<void> => {
  try {
    const client = getElasticsearchClient();
    await client.index({
      index: EMAIL_INDEX,
      id: email.id,
      document: email,
    });
  } catch (error) {
    console.warn('⚠️  Failed to index email in Elasticsearch:', (error as Error).message);
  }
};

/**
 * Update an email document in Elasticsearch.
 */
export const updateEmailIndex = async (id: string, updates: Partial<EmailDocument>): Promise<void> => {
  try {
    const client = getElasticsearchClient();
    await client.update({
      index: EMAIL_INDEX,
      id,
      doc: updates,
    });
  } catch (error) {
    console.warn('⚠️  Failed to update email in Elasticsearch:', (error as Error).message);
  }
};

/**
 * Search emails in Elasticsearch.
 */
export const searchEmails = async (
  query: string,
  userId?: string,
  from: number = 0,
  size: number = 20
): Promise<{ results: EmailDocument[]; total: number }> => {
  try {
    const client = getElasticsearchClient();

    const must: any[] = [
      {
        multi_match: {
          query,
          fields: ['subject^2', 'body', 'recipient', 'sender'],
          fuzziness: 'AUTO',
        },
      },
    ];

    if (userId) {
      must.push({ term: { userId } });
    }

    const response = await client.search({
      index: EMAIL_INDEX,
      body: {
        query: { bool: { must } },
        from,
        size,
        sort: [{ createdAt: { order: 'desc' } }],
      },
    });

    const hits = response.hits.hits;
    const total = typeof response.hits.total === 'number'
      ? response.hits.total
      : response.hits.total?.value || 0;

    return {
      results: hits.map((hit: any) => ({ id: hit._id, ...hit._source } as EmailDocument)),
      total,
    };
  } catch (error) {
    console.warn('⚠️  Elasticsearch search failed, falling back to database query:', (error as Error).message);
    try {
      const dbEmails = await prisma.email.findMany({
        where: {
          ...(userId ? { userId } : {}),
          OR: [
            { subject: { contains: query, mode: 'insensitive' } },
            { body: { contains: query, mode: 'insensitive' } },
            { recipient: { contains: query, mode: 'insensitive' } },
            { sender: { contains: query, mode: 'insensitive' } },
          ],
        },
        orderBy: { createdAt: 'desc' },
        skip: from,
        take: size,
      });

      return {
        results: dbEmails.map((e) => ({
          id: e.id,
          userId: e.userId,
          sender: e.sender,
          recipient: e.recipient,
          subject: e.subject,
          body: e.body,
          status: e.status,
          scheduledAt: e.scheduledAt.toISOString(),
          sentAt: e.sentAt?.toISOString(),
          createdAt: e.createdAt.toISOString(),
          batchId: e.batchId || undefined,
        })),
        total: dbEmails.length,
      };
    } catch (dbErr) {
      console.error('Database search fallback failed:', dbErr);
      return { results: [], total: 0 };
    }
  }
};
