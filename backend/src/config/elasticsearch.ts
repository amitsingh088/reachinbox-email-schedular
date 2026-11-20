import { Client } from '@elastic/elasticsearch';
import { env } from './env';

let esClient: Client | null = null;

export const getElasticsearchClient = (): Client => {
  if (!esClient) {
    esClient = new Client({
      node: env.ELASTICSEARCH_URL,
    });
  }
  return esClient;
};

export const EMAIL_INDEX = 'emails';

export const initElasticsearch = async (): Promise<void> => {
  try {
    const client = getElasticsearchClient();
    const indexExists = await client.indices.exists({ index: EMAIL_INDEX });

    if (!indexExists) {
      await client.indices.create({
        index: EMAIL_INDEX,
        body: {
          mappings: {
            properties: {
              id: { type: 'keyword' },
              userId: { type: 'keyword' },
              sender: { type: 'keyword' },
              recipient: { type: 'keyword' },
              subject: { type: 'text', analyzer: 'standard' },
              body: { type: 'text', analyzer: 'standard' },
              status: { type: 'keyword' },
              scheduledAt: { type: 'date' },
              sentAt: { type: 'date' },
              createdAt: { type: 'date' },
              batchId: { type: 'keyword' },
            },
          },
        },
      });
      console.log('✅ Elasticsearch index "emails" created');
    }
  } catch (error) {
    console.warn('⚠️  Elasticsearch not available — search features disabled:', (error as Error).message);
  }
};
