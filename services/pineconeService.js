const { Pinecone } = require('@pinecone-database/pinecone');

class PineconeService {
  constructor() {
    this.client = null;
    this.index = null;
    this.indexName = process.env.PINECONE_INDEX_NAME || 'meeting-mind';
  }

  /**
   * Initialize Pinecone client and index
   */
  async initialize() {
    try {
      if (this.client) {
        return; // Already initialized
      }

      this.client = new Pinecone({
        apiKey: process.env.PINECONE_API_KEY,
      });

      // Get or create index
      const indexList = await this.client.listIndexes();
      const indexExists = indexList.indexes?.some(idx => idx.name === this.indexName);

      if (!indexExists) {
        console.log(`Creating Pinecone index: ${this.indexName}`);
        await this.client.createIndex({
          name: this.indexName,
          dimension: parseInt(process.env.VECTOR_DIMENSION) || 1536,
          metric: 'cosine',
          spec: {
            serverless: {
              cloud: 'aws',
              region: process.env.PINECONE_ENVIRONMENT || 'us-east-1'
            }
          }
        });

        // Wait for index to be ready
        await this.waitForIndexReady();
      }

      this.index = this.client.index(this.indexName);
      console.log('Pinecone initialized successfully');
    } catch (error) {
      console.error('Error initializing Pinecone:', error);
      throw error;
    }
  }

  /**
   * Wait for index to be ready
   */
  async waitForIndexReady(maxRetries = 30, delayMs = 2000) {
    for (let i = 0; i < maxRetries; i++) {
      try {
        const indexDescription = await this.client.describeIndex(this.indexName);
        if (indexDescription.status?.ready) {
          return true;
        }
      } catch (error) {
        console.log(`Waiting for index to be ready... (attempt ${i + 1}/${maxRetries})`);
      }
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
    throw new Error('Index creation timeout');
  }

  /**
   * Upsert a single vector
   */
  async upsertVector({ id, values, metadata }) {
    await this.ensureInitialized();

    try {
      await this.index.upsert([
        {
          id,
          values,
          metadata
        }
      ]);

      return { success: true, id };
    } catch (error) {
      console.error('Error upserting vector:', error);
      throw error;
    }
  }

  /**
   * Upsert multiple vectors
   */
  async upsertVectors(vectors) {
    await this.ensureInitialized();

    try {
      // Pinecone has a limit on batch size, so chunk the upserts
      const batchSize = 100;
      const batches = [];

      for (let i = 0; i < vectors.length; i += batchSize) {
        batches.push(vectors.slice(i, i + batchSize));
      }

      for (const batch of batches) {
        await this.index.upsert(batch);
      }

      return { success: true, count: vectors.length };
    } catch (error) {
      console.error('Error upserting vectors:', error);
      throw error;
    }
  }

  /**
   * Query vectors by similarity
   */
  async query({ vector, topK, filter, includeMetadata = true }) {
    await this.ensureInitialized();

    try {
      const queryRequest = {
        vector,
        topK: topK || 5,
        includeMetadata
      };

      if (filter) {
        queryRequest.filter = filter;
      }

      const results = await this.index.query(queryRequest);

      return results.matches || [];
    } catch (error) {
      console.error('Error querying vectors:', error);
      throw error;
    }
  }

  /**
   * Delete vectors by ID
   */
  async deleteVectors(ids) {
    await this.ensureInitialized();

    try {
      await this.index.deleteMany(ids);
      return { success: true, deletedCount: ids.length };
    } catch (error) {
      console.error('Error deleting vectors:', error);
      throw error;
    }
  }

  /**
   * Delete vectors by filter
   */
  async deleteByFilter(filter) {
    await this.ensureInitialized();

    try {
      await this.index.deleteMany({ filter });
      return { success: true };
    } catch (error) {
      console.error('Error deleting vectors by filter:', error);
      throw error;
    }
  }

  /**
   * Get index stats
   */
  async getStats() {
    await this.ensureInitialized();

    try {
      const stats = await this.index.describeIndexStats();
      return stats;
    } catch (error) {
      console.error('Error getting index stats:', error);
      throw error;
    }
  }

  /**
   * Fetch vectors by IDs
   */
  async fetchVectors(ids) {
    await this.ensureInitialized();

    try {
      const results = await this.index.fetch(ids);
      return results.records || {};
    } catch (error) {
      console.error('Error fetching vectors:', error);
      throw error;
    }
  }

  /**
   * Ensure client is initialized
   */
  async ensureInitialized() {
    if (!this.client || !this.index) {
      await this.initialize();
    }
  }
}

module.exports = new PineconeService();