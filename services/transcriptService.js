const openaiService = require('./openaiService');
const pineconeService = require('./pineconeService');

class TranscriptService {
  constructor() {
    this.currentTranscript = [];
    this.processingQueue = [];
  }

  /**
   * Ingest a new transcript chunk
   * @param {Object} chunk - Transcript chunk with text, timestamp, speaker
   */
  async ingestChunk(chunk) {
    const { text, timestamp, speaker, meetingId } = chunk;

    // Add to current transcript
    this.currentTranscript.push({
      text,
      timestamp,
      speaker,
      meetingId,
      id: `${meetingId}_${Date.now()}`
    });

    // Process and store in vector database
    await this.processAndStore(chunk);

    return {
      success: true,
      chunkId: this.currentTranscript[this.currentTranscript.length - 1].id
    };
  }

  /**
   * Process transcript chunk and store in vector database
   */
  async processAndStore(chunk) {
    try {
      const { text, timestamp, speaker, meetingId } = chunk;

      // Generate embedding using OpenAI
      const embedding = await openaiService.generateEmbedding(text);

      // Store in Pinecone with metadata
      await pineconeService.upsertVector({
        id: `${meetingId}_${timestamp}`,
        values: embedding,
        metadata: {
          text,
          timestamp,
          speaker,
          meetingId,
          type: 'transcript',
          createdAt: new Date().toISOString()
        }
      });

      return { success: true };
    } catch (error) {
      console.error('Error processing transcript chunk:', error);
      throw error;
    }
  }

  /**
   * Ingest full transcript at once
   */
  async ingestFullTranscript(transcript) {
    const { text, meetingId, metadata } = transcript;

    // Split into chunks for better vector storage
    const chunks = this.splitTranscript(text);

    const results = [];
    for (let i = 0; i < chunks.length; i++) {
      const chunk = {
        text: chunks[i],
        timestamp: metadata?.timestamp || Date.now(),
        speaker: metadata?.speaker || 'Unknown',
        meetingId,
        chunkIndex: i
      };

      const result = await this.ingestChunk(chunk);
      results.push(result);
    }

    return {
      success: true,
      chunksProcessed: results.length,
      meetingId
    };
  }

  /**
   * Split transcript into manageable chunks
   */
  splitTranscript(text, maxChunkSize = 500) {
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    const chunks = [];
    let currentChunk = '';

    for (const sentence of sentences) {
      if ((currentChunk + sentence).length > maxChunkSize && currentChunk.length > 0) {
        chunks.push(currentChunk.trim());
        currentChunk = sentence;
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
   * Get current transcript
   */
  getCurrentTranscript(meetingId) {
    if (meetingId) {
      return this.currentTranscript.filter(chunk => chunk.meetingId === meetingId);
    }
    return this.currentTranscript;
  }

  /**
   * Clear transcript for a meeting
   */
  clearTranscript(meetingId) {
    if (meetingId) {
      this.currentTranscript = this.currentTranscript.filter(
        chunk => chunk.meetingId !== meetingId
      );
    } else {
      this.currentTranscript = [];
    }
  }

  /**
   * Search transcript by query
   */
  async searchTranscript(query, meetingId, topK = 5) {
    try {
      // Generate embedding for query
      const queryEmbedding = await openaiService.generateEmbedding(query);

      // Search in Pinecone
      const filter = meetingId ? { meetingId, type: 'transcript' } : { type: 'transcript' };
      const results = await pineconeService.query({
        vector: queryEmbedding,
        topK,
        filter,
        includeMetadata: true
      });

      return results;
    } catch (error) {
      console.error('Error searching transcript:', error);
      throw error;
    }
  }
}

module.exports = new TranscriptService();