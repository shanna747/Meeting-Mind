const openaiService = require('./openaiService');
const pineconeService = require('./pineconeService');

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

      const vectors = [];
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const embedding = await openaiService.generateEmbedding(chunk);

        vectors.push({
          id: `${documentId}_chunk_${i}`,
          values: embedding,
          metadata: {
            text: chunk,
            title,
            type: type || 'document',
            department,
            tags: tags || [],
            documentId,
            chunkIndex: i,
            totalChunks: chunks.length,
            createdAt: new Date().toISOString()
          }
        });
      }

      // Store in Pinecone
      await pineconeService.upsertVectors(vectors);

      return {
        success: true,
        documentId,
        chunksCreated: vectors.length
      };
    } catch (error) {
      console.error('Error ingesting document:', error);
      throw error;
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

      // Generate embedding for the question
      const queryEmbedding = await openaiService.generateEmbedding(question);

      // Build filter
      const filter = {};
      if (department) filter.department = department;
      if (type) filter.type = type;

      // Search in Pinecone
      const results = await pineconeService.query({
        vector: queryEmbedding,
        topK,
        filter: Object.keys(filter).length > 0 ? filter : undefined,
        includeMetadata: true
      });

      if (!includeContext) {
        return { results };
      }

      // Build context from results
      const context = results
        .map(match => match.metadata?.text || '')
        .filter(text => text.length > 0)
        .join('\n\n---\n\n');

      // Generate answer using OpenAI
      const answer = await openaiService.answerWithContext(question, context);

      return {
        answer,
        sources: results.map(match => ({
          title: match.metadata?.title,
          score: match.score,
          text: match.metadata?.text,
          documentId: match.metadata?.documentId,
          department: match.metadata?.department
        })),
        context
      };
    } catch (error) {
      console.error('Error querying company brain:', error);
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

      // Search company knowledge
      const queryEmbedding = await openaiService.generateEmbedding(query);
      const results = await pineconeService.query({
        vector: queryEmbedding,
        topK,
        includeMetadata: true
      });

      // Format and rank results
      const relevantDocs = results
        .filter(match => match.score > 0.7) // Similarity threshold
        .map(match => ({
          title: match.metadata?.title,
          content: match.metadata?.text,
          relevance: match.score,
          type: match.metadata?.type,
          department: match.metadata?.department,
          documentId: match.metadata?.documentId
        }));

      return {
        relevantDocuments: relevantDocs,
        count: relevantDocs.length
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
      // Fetch the source document
      const sourceDoc = await pineconeService.fetchVectors([`${documentId}_chunk_0`]);

      if (!sourceDoc || Object.keys(sourceDoc).length === 0) {
        throw new Error('Document not found');
      }

      const sourceVector = Object.values(sourceDoc)[0];

      // Query for similar documents
      const results = await pineconeService.query({
        vector: sourceVector.values,
        topK: topK + 5, // Get extra to filter out same document
        includeMetadata: true,
        filter: {
          documentId: { $ne: documentId } // Exclude same document
        }
      });

      // Group by documentId and get unique documents
      const uniqueDocs = new Map();
      for (const match of results) {
        const docId = match.metadata?.documentId;
        if (docId && docId !== documentId && !uniqueDocs.has(docId)) {
          uniqueDocs.set(docId, {
            documentId: docId,
            title: match.metadata?.title,
            type: match.metadata?.type,
            department: match.metadata?.department,
            relevance: match.score
          });
        }
        if (uniqueDocs.size >= topK) break;
      }

      return Array.from(uniqueDocs.values());
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
      await pineconeService.deleteByFilter({ documentId });

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
      const stats = await pineconeService.getStats();
      return stats;
    } catch (error) {
      console.error('Error getting knowledge base stats:', error);
      throw error;
    }
  }
}

module.exports = new CompanyBrainService();