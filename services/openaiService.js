const OpenAI = require('openai');

class OpenAIService {
  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    this.model = process.env.OPENAI_MODEL || 'gpt-4-turbo-preview';
    this.embeddingModel = process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small';
  }

  /**
   * Generate embedding for text
   */
  async generateEmbedding(text) {
    try {
      const response = await this.client.embeddings.create({
        model: this.embeddingModel,
        input: text,
        encoding_format: 'float'
      });

      return response.data[0].embedding;
    } catch (error) {
      console.error('Error generating embedding:', error);
      throw error;
    }
  }

  /**
   * Generate embeddings for multiple texts
   */
  async generateEmbeddings(texts) {
    try {
      const response = await this.client.embeddings.create({
        model: this.embeddingModel,
        input: texts,
        encoding_format: 'float'
      });

      return response.data.map(item => item.embedding);
    } catch (error) {
      console.error('Error generating embeddings:', error);
      throw error;
    }
  }

  /**
   * Generate chat completion
   */
  async generateCompletion(messages, options = {}) {
    try {
      const response = await this.client.chat.completions.create({
        model: options.model || this.model,
        messages,
        temperature: options.temperature || 0.7,
        max_tokens: options.maxTokens || 1000,
        ...options
      });

      return response.choices[0].message.content;
    } catch (error) {
      console.error('Error generating completion:', error);
      throw error;
    }
  }

  /**
   * Generate streaming completion
   */
  async generateStreamingCompletion(messages, options = {}) {
    try {
      const stream = await this.client.chat.completions.create({
        model: options.model || this.model,
        messages,
        temperature: options.temperature || 0.7,
        max_tokens: options.maxTokens || 1000,
        stream: true,
        ...options
      });

      return stream;
    } catch (error) {
      console.error('Error generating streaming completion:', error);
      throw error;
    }
  }

  /**
   * Summarize text
   */
  async summarizeText(text, options = {}) {
    try {
      const messages = [
        {
          role: 'system',
          content: 'You are a helpful assistant that creates concise, accurate summaries.'
        },
        {
          role: 'user',
          content: `Summarize the following text:\n\n${text}`
        }
      ];

      return await this.generateCompletion(messages, options);
    } catch (error) {
      console.error('Error summarizing text:', error);
      throw error;
    }
  }

  /**
   * Extract action items from text
   */
  async extractActionItems(text) {
    try {
      const messages = [
        {
          role: 'system',
          content: 'You are a helpful assistant that extracts action items from meeting transcripts. Return action items as a JSON array with fields: task, assignee (if mentioned), and priority.'
        },
        {
          role: 'user',
          content: `Extract action items from this transcript:\n\n${text}`
        }
      ];

      const response = await this.generateCompletion(messages, {
        temperature: 0.3
      });

      // Try to parse as JSON, fallback to text
      try {
        return JSON.parse(response);
      } catch {
        return { actionItems: response };
      }
    } catch (error) {
      console.error('Error extracting action items:', error);
      throw error;
    }
  }

  /**
   * Answer question based on context
   */
  async answerWithContext(question, context, options = {}) {
    try {
      const messages = [
        {
          role: 'system',
          content: 'You are a helpful AI assistant that answers questions based on provided context. If the answer is not in the context, say so.'
        },
        {
          role: 'user',
          content: `Context:\n${context}\n\nQuestion: ${question}`
        }
      ];

      return await this.generateCompletion(messages, options);
    } catch (error) {
      console.error('Error answering with context:', error);
      throw error;
    }
  }

  /**
   * Generate meeting insights
   */
  async generateMeetingInsights(transcript) {
    try {
      const messages = [
        {
          role: 'system',
          content: 'You are an AI assistant that analyzes meeting transcripts and provides actionable insights including key decisions, discussion topics, and next steps.'
        },
        {
          role: 'user',
          content: `Analyze this meeting transcript and provide insights:\n\n${transcript}`
        }
      ];

      return await this.generateCompletion(messages, {
        maxTokens: 1500
      });
    } catch (error) {
      console.error('Error generating meeting insights:', error);
      throw error;
    }
  }

  /**
   * Check if API key is configured
   */
  isConfigured() {
    return !!process.env.OPENAI_API_KEY;
  }
}

module.exports = new OpenAIService();