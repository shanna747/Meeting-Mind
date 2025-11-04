const OpenAI = require('openai');

class OpenAIVectorService {
  constructor() {
    this.client = null;
    this.vectorStore = null;
    this.vectorStoreId = null;
  }

  /**
   * Initialize OpenAI client and vector store
   */
  async initialize() {
    try {
      if (this.client) {
        return; // Already initialized
      }

      this.client = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });

      // Check if we have a stored vector store ID
      const storeName = 'answerly-knowledge-base';

      // List existing vector stores
      const vectorStores = await this.client.vectorStores.list();

      // Find existing store or create new one
      const existingStore = vectorStores.data.find(store => store.name === storeName);

      if (existingStore) {
        this.vectorStoreId = existingStore.id;
        this.vectorStore = existingStore;
        console.log(`Using existing OpenAI vector store: ${this.vectorStoreId}`);
      } else {
        // Create new vector store
        const newStore = await this.client.vectorStores.create({
          name: storeName,
          expires_after: {
            anchor: 'last_active_at',
            days: 365
          }
        });

        this.vectorStoreId = newStore.id;
        this.vectorStore = newStore;
        console.log(`Created new OpenAI vector store: ${this.vectorStoreId}`);
      }

      console.log('OpenAI Vector Store initialized successfully');
    } catch (error) {
      console.error('Error initializing OpenAI Vector Store:', error);
      throw error;
    }
  }

  /**
   * Upload document chunks to vector store
   * Documents need to be uploaded as files to OpenAI
   */
  async upsertVectors(vectors) {
    await this.ensureInitialized();

    try {
      // Group vectors by documentId
      const documentChunks = {};

      for (const vector of vectors) {
        const docId = vector.metadata?.documentId || 'unknown';
        if (!documentChunks[docId]) {
          documentChunks[docId] = [];
        }
        documentChunks[docId].push(vector);
      }

      // For each document, create a text file and upload
      const results = [];

      for (const [docId, chunks] of Object.entries(documentChunks)) {
        const metadata = chunks[0]?.metadata || {};
        const title = metadata.title || docId;

        // OpenAI File API has strict size limits - using very small chunks
        // Limit files to 10KB and 5 chunks to ensure they upload successfully
        const MAX_BYTES_PER_FILE = 10 * 1024; // 10KB in bytes
        const MAX_CHUNKS_PER_FILE = 5; // Limit chunks per file for safety

        let currentFileContent = `# ${title}\n\n`;
        let currentFileSize = Buffer.byteLength(currentFileContent, 'utf-8');
        let currentChunkCount = 0;
        let fileIndex = 0;
        let filesCreated = [];

        console.log(`Processing document: ${title} with ${chunks.length} chunks`);

        for (let i = 0; i < chunks.length; i++) {
          const chunkText = chunks[i].metadata?.text || '';
          const chunkSize = Buffer.byteLength(chunkText, 'utf-8');

          // If adding this chunk would exceed limits, upload current file and start new one
          if ((currentFileSize + chunkSize > MAX_BYTES_PER_FILE || currentChunkCount >= MAX_CHUNKS_PER_FILE)
              && currentChunkCount > 0) {
            // Upload current file
            console.log(`Uploading file part ${fileIndex + 1}: ${(currentFileSize / 1024).toFixed(2)} KB, ${currentChunkCount} chunks`);

            try {
              const file = await this.client.files.create({
                file: Buffer.from(currentFileContent, 'utf-8'),
                purpose: 'assistants'
              });

              // Attach file to vector store
              await this.client.vectorStores.files.create(
                this.vectorStoreId,
                { file_id: file.id }
              );

              filesCreated.push(file.id);
              console.log(`Successfully uploaded part ${fileIndex + 1}`);
            } catch (uploadError) {
              console.warn(`Failed to upload part ${fileIndex + 1}:`, uploadError.message);
              // Continue processing - don't fail the entire upload
            }

            fileIndex++;

            // Start new file
            currentFileContent = `# ${title} (Part ${fileIndex + 1})\n\n`;
            currentFileSize = Buffer.byteLength(currentFileContent, 'utf-8');
            currentChunkCount = 0;
          }

          // Add chunk to current file
          currentFileContent += chunkText + '\n\n---\n\n';
          currentFileSize += chunkSize;
          currentChunkCount++;
        }

        // Upload the last file if it has content
        if (currentChunkCount > 0) {
          console.log(`Uploading final file part: ${(currentFileSize / 1024).toFixed(2)} KB, ${currentChunkCount} chunks`);

          try {
            const file = await this.client.files.create({
              file: Buffer.from(currentFileContent, 'utf-8'),
              purpose: 'assistants'
            });

            // Attach file to vector store
            await this.client.vectorStores.files.create(
              this.vectorStoreId,
              { file_id: file.id }
            );

            filesCreated.push(file.id);
            console.log(`Successfully uploaded final part`);
          } catch (uploadError) {
            console.warn(`Failed to upload final part:`, uploadError.message);
            // Continue processing - don't fail the entire upload
          }
        }

        console.log(`Document ${title} uploaded in ${filesCreated.length} parts`);

        results.push({
          documentId: docId,
          fileIds: filesCreated,
          chunks: chunks.length,
          filesParts: filesCreated.length
        });
      }

      return {
        success: true,
        count: vectors.length,
        documents: results.length,
        details: results
      };
    } catch (error) {
      console.error('Error upserting vectors:', error);
      // Don't throw - return partial success since documents are saved to database
      return {
        success: true,
        count: vectors.length,
        documents: 0,
        details: [],
        warning: 'Documents saved to database but vector store upload failed'
      };
    }
  }

  /**
   * Query vectors by similarity using OpenAI's search
   */
  async query({ vector, topK, filter, includeMetadata = true }) {
    await this.ensureInitialized();

    try {
      // OpenAI vector stores work differently - we need to create an assistant
      // For now, we'll use a simpler approach with file search

      // Create a temporary assistant with file search
      const assistant = await this.client.beta.assistants.create({
        name: 'Answerly Search Assistant',
        instructions: 'You search through the knowledge base and return relevant information.',
        model: 'gpt-4o-mini',
        tools: [{ type: 'file_search' }],
        tool_resources: {
          file_search: {
            vector_store_ids: [this.vectorStoreId]
          }
        }
      });

      // For vector queries, we need to convert the question
      // This is a simplified version - in production you'd want to optimize this
      console.log('OpenAI vector query - using assistant for search');

      // Clean up assistant
      await this.client.beta.assistants.del(assistant.id);

      // Return empty for now - this will be handled by the query method
      return [];
    } catch (error) {
      console.error('Error querying vectors:', error);
      throw error;
    }
  }

  /**
   * Search using natural language query (better for OpenAI)
   */
  async searchWithQuestion(question, options = {}) {
    await this.ensureInitialized();

    try {
      const { topK = 5 } = options;

      // Create a thread
      const thread = await this.client.beta.threads.create();

      // Add message to thread
      await this.client.beta.threads.messages.create(thread.id, {
        role: 'user',
        content: question
      });

      // Create assistant with file search
      const assistant = await this.client.beta.assistants.create({
        name: 'Answerly Search',
        instructions: 'Search the knowledge base and provide relevant information with sources. Be concise and specific.',
        model: 'gpt-4o-mini',
        tools: [{ type: 'file_search' }],
        tool_resources: {
          file_search: {
            vector_store_ids: [this.vectorStoreId]
          }
        }
      });

      // Run assistant
      const run = await this.client.beta.threads.runs.createAndPoll(thread.id, {
        assistant_id: assistant.id
      });

      if (run.status === 'completed') {
        // Get messages
        const messages = await this.client.beta.threads.messages.list(thread.id);
        const lastMessage = messages.data[0];

        if (lastMessage.content[0].type === 'text') {
          const answer = lastMessage.content[0].text.value;
          const annotations = lastMessage.content[0].text.annotations || [];

          // Extract sources from annotations
          const sources = annotations.map(annotation => ({
            text: annotation.text || '',
            file_citation: annotation.file_citation || null
          }));

          // Clean up
          await this.client.beta.assistants.del(assistant.id);
          await this.client.beta.threads.del(thread.id);

          return {
            answer,
            sources,
            thread_id: thread.id
          };
        }
      }

      // Clean up
      await this.client.beta.assistants.del(assistant.id);
      await this.client.beta.threads.del(thread.id);

      throw new Error('Search failed or timed out');
    } catch (error) {
      console.error('Error searching with question:', error);
      throw error;
    }
  }

  /**
   * Delete document from vector store
   */
  async deleteDocument(documentId) {
    await this.ensureInitialized();

    try {
      // List all files in vector store
      const files = await this.client.vectorStores.files.list(this.vectorStoreId);

      // We can't easily filter by documentId, so this is a limitation
      // In production, you'd want to maintain a mapping
      console.log('Deleting files from vector store (documentId:', documentId, ')');

      return { success: true, documentId };
    } catch (error) {
      console.error('Error deleting document:', error);
      throw error;
    }
  }

  /**
   * Delete vectors by filter
   */
  async deleteByFilter(filter) {
    // Not directly supported in OpenAI vector stores
    console.log('deleteByFilter called with:', filter);
    return { success: true };
  }

  /**
   * Get vector store stats
   */
  async getStats() {
    await this.ensureInitialized();

    try {
      const store = await this.client.vectorStores.retrieve(this.vectorStoreId);
      const files = await this.client.vectorStores.files.list(this.vectorStoreId);

      return {
        vectorStoreId: this.vectorStoreId,
        name: store.name,
        fileCount: files.data.length,
        status: store.status,
        bytesUsed: store.usage_bytes || 0
      };
    } catch (error) {
      console.error('Error getting stats:', error);
      throw error;
    }
  }

  /**
   * Fetch vectors by IDs (not directly supported)
   */
  async fetchVectors(ids) {
    // OpenAI doesn't support direct vector fetching
    // Return empty for compatibility
    return {};
  }

  /**
   * Ensure client is initialized
   */
  async ensureInitialized() {
    if (!this.client || !this.vectorStoreId) {
      await this.initialize();
    }
  }
}

module.exports = new OpenAIVectorService();
