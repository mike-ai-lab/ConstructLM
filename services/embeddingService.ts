import { DocumentChunk } from './documentChunkingService';

// Simple TF-IDF based embedding for local processing
export class LocalEmbeddingService {
  private vocabulary: Map<string, number> = new Map();
  private idf: Map<string, number> = new Map();
  private documents: string[] = [];

  // Preprocess text
  private preprocessText(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2);
  }

  // Build vocabulary and calculate IDF
  buildVocabulary(chunks: DocumentChunk[]): void {
    this.documents = chunks.map(chunk => chunk.content);
    const wordCounts = new Map<string, number>();
    
    // Count word occurrences across all documents
    this.documents.forEach(doc => {
      const words = new Set(this.preprocessText(doc));
      words.forEach(word => {
        wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
      });
    });

    // Build vocabulary (top 5000 most common words)
    const sortedWords = Array.from(wordCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5000);
    
    sortedWords.forEach(([word], index) => {
      this.vocabulary.set(word, index);
    });

    // Calculate IDF
    const totalDocs = this.documents.length;
    wordCounts.forEach((count, word) => {
      if (this.vocabulary.has(word)) {
        this.idf.set(word, Math.log(totalDocs / count));
      }
    });

    console.log(`[Embedding] Built vocabulary with ${this.vocabulary.size} words`);
  }

  // Generate TF-IDF vector
  generateEmbedding(text: string): number[] {
    const words = this.preprocessText(text);
    const tf = new Map<string, number>();
    
    // Calculate term frequency
    words.forEach(word => {
      tf.set(word, (tf.get(word) || 0) + 1);
    });

    // Normalize TF
    const maxTf = Math.max(...Array.from(tf.values()));
    tf.forEach((count, word) => {
      tf.set(word, count / maxTf);
    });

    // Generate vector
    const vector = new Array(this.vocabulary.size).fill(0);
    tf.forEach((tfValue, word) => {
      const index = this.vocabulary.get(word);
      const idfValue = this.idf.get(word);
      if (index !== undefined && idfValue !== undefined) {
        vector[index] = tfValue * idfValue;
      }
    });

    return vector;
  }

  // Calculate cosine similarity
  cosineSimilarity(vec1: number[], vec2: number[]): number {
    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < vec1.length; i++) {
      dotProduct += vec1[i] * vec2[i];
      norm1 += vec1[i] * vec1[i];
      norm2 += vec2[i] * vec2[i];
    }

    if (norm1 === 0 || norm2 === 0) return 0;
    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
  }
}

// Singleton instance
export const embeddingService = new LocalEmbeddingService();