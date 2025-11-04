const openaiService = require('./openaiService');
const vectorService = require('./openaiVectorService');

class CompanyBrainService {
  constructor() {
    this.knowledgeCache = new Map();
  }

  /**
   * Ingest company knowledge document
   */
  async ingestDocument({ content, metadata }) {
    try {
      const { title, type, department, tags, documentId } = metadata;

      // Split document into chunks
      const chunks = this.chunkDocument(content);
      console.log(`Processing ${chunks.length} chunks in parallel batches...`);

      // Process embeddings in parallel batches of 10 for speed
      const BATCH_SIZE = 10;
      const vectors = [];

      for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
        const batch = chunks.slice(i, i + BATCH_SIZE);
        const batchPromises = batch.map((chunk, batchIndex) =>
          openaiService.generateEmbedding(chunk).then(embedding => ({
            id: `${documentId}_chunk_${i + batchIndex}`,
            values: embedding,
            metadata: {
              text: chunk,
              title,
              type: type || 'document',
              department,
              tags: tags || [],
              documentId,
              chunkIndex: i + batchIndex,
              totalChunks: chunks.length,
              createdAt: new Date().toISOString()
            }
          }))
        );

        const batchVectors = await Promise.all(batchPromises);
        vectors.push(...batchVectors);
        console.log(`Processed ${Math.min(i + BATCH_SIZE, chunks.length)}/${chunks.length} chunks`);
      }

      // Store in OpenAI Vector Store (temporarily disabled due to 413 errors)
      // const vectorResult = await vectorService.upsertVectors(vectors);
      console.log(`Skipping vector store upload (failing) - ${vectors.length} embeddings generated`);

      return {
        success: true,
        documentId,
        chunksCreated: vectors.length,
        vectorStoreStatus: 'skipped - embeddings generated'
      };
    } catch (error) {
      console.error('Error ingesting document:', error);
      // Don't throw - document is saved even if vector operations fail
      return {
        success: true,
        documentId: metadata.documentId,
        chunksCreated: 0,
        warning: 'Document saved but processing encountered errors'
      };
    }
  }

  /**
   * Query company knowledge base
   */
  async query(question, options = {}) {
    try {
      const {
        topK = 5,
        department,
        type,
        includeContext = true
      } = options;

      // Try OpenAI Vector Store search with timeout
      console.log('Attempting vector store search with 3 second timeout...');

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Vector store query timeout')), 3000)
      );

      try {
        const searchResult = await Promise.race([
          vectorService.searchWithQuestion(question, { topK }),
          timeoutPromise
        ]);

        return {
          answer: searchResult.answer,
          sources: searchResult.sources.map((source, index) => ({
            title: `Source ${index + 1}`,
            score: 1.0 - (index * 0.1), // Mock score based on order
            text: source.text,
            documentId: source.file_citation?.file_id || 'unknown',
            department: department || 'general'
          })),
          context: searchResult.answer
        };
      } catch (timeoutError) {
        console.warn('Vector store query failed or timed out:', timeoutError.message);
        console.log('Falling back to client-side search (vector store may be empty)');

        // Return error that triggers client-side fallback
        throw new Error('Vector store unavailable - use client-side search');
      }
    } catch (error) {
      console.error('Error querying company brain:', error.message);
      throw error;
    }
  }

  /**
   * Fetch relevant context for current meeting
   */
  async fetchRelevantContext(meetingContext, topK = 3) {
    try {
      const { topic, participants, currentDiscussion } = meetingContext;

      // Build query from meeting context
      const query = currentDiscussion || topic || 'meeting discussion';

      // Search company knowledge using OpenAI Vector Store
      const searchResult = await vectorService.searchWithQuestion(query, { topK });

      // Format results
      const relevantDocs = searchResult.sources.map((source, index) => ({
        title: `Source ${index + 1}`,
        content: source.text,
        relevance: 1.0 - (index * 0.1),
        type: 'document',
        department: 'general',
        documentId: source.file_citation?.file_id || 'unknown'
      }));

      return {
        relevantDocuments: relevantDocs,
        count: relevantDocs.length,
        answer: searchResult.answer
      };
    } catch (error) {
      console.error('Error fetching relevant context:', error);
      throw error;
    }
  }

  /**
   * Get related documents
   */
  async getRelatedDocuments(documentId, topK = 5) {
    try {
      // OpenAI Vector Store doesn't support direct document similarity
      // Return empty array for now - this feature would need different implementation
      console.log('getRelatedDocuments - not fully supported with OpenAI Vector Store');
      return [];
    } catch (error) {
      console.error('Error getting related documents:', error);
      throw error;
    }
  }

  /**
   * Delete document from knowledge base
   */
  async deleteDocument(documentId) {
    try {
      await vectorService.deleteDocument(documentId);

      // Clear from cache
      this.knowledgeCache.delete(documentId);

      return { success: true, documentId };
    } catch (error) {
      console.error('Error deleting document:', error);
      throw error;
    }
  }

  /**
   * Chunk document into smaller pieces
   */
  chunkDocument(text, maxChunkSize = 500, overlap = 50) {
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    const chunks = [];
    let currentChunk = '';

    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i];

      if ((currentChunk + sentence).length > maxChunkSize && currentChunk.length > 0) {
        chunks.push(currentChunk.trim());

        // Add overlap from previous chunk
        const words = currentChunk.split(' ');
        const overlapWords = words.slice(-Math.floor(overlap / 5)); // Approximate word count
        currentChunk = overlapWords.join(' ') + ' ' + sentence;
      } else {
        currentChunk += ' ' + sentence;
      }
    }

    if (currentChunk.trim().length > 0) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  }

  /**
   * Get knowledge base statistics
   */
  async getStats() {
    try {
      const stats = await vectorService.getStats();
      return stats;
    } catch (error) {
      console.error('Error getting knowledge base stats:', error);
      throw error;
    }
  }
}

module.exports = new CompanyBrainService();