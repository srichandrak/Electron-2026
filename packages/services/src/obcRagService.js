/**
 * OBC RAG Service - Static RAG service for Ontario Building Code documents
 * Runs in Electron main process for secure API key handling
 */

const { GoogleGenAI } = require('@google/genai');
const fs = require('fs').promises;
const path = require('path');

class OBCRagService {
  constructor() {
    this.ai = null;
    this.ragStoreName = null;
    this.isInitialized = false;
    // Default path - can be overridden via setDocsPath()
    this.OBC_DOCS_PATH = null;
    this.OBC_STORE_NAME = 'obc-2024-vol1-static';
  }

  /**
   * Set the path to OBC documents
   * Should be called before uploadOBCDocuments()
   */
  setDocsPath(docsPath) {
    this.OBC_DOCS_PATH = docsPath;
  }

  /**
   * Initialize the Gemini AI client with API key and optional pre-configured store
   * If no apiKey is provided, it will use process.env.GEMINI_API_KEY
   * If no fileSearchStoreName is provided, it will use process.env.FILE_SEARCH_STORE_NAME
   */
  initialize(apiKey = null, fileSearchStoreName = null) {
    // Use provided API key or fall back to environment variable
    const effectiveApiKey = apiKey || process.env.GEMINI_API_KEY;

    if (!effectiveApiKey) {
      throw new Error('API key is required (provide as parameter or set GEMINI_API_KEY in .env)');
    }

    this.ai = new GoogleGenAI({ apiKey: effectiveApiKey });

    // Use provided store name or fall back to environment variable
    const effectiveStoreName = fileSearchStoreName || process.env.FILE_SEARCH_STORE_NAME;

    if (effectiveStoreName) {
      this.ragStoreName = effectiveStoreName;
      this.isInitialized = true;
      console.log('✓ OBC RAG Service initialized with existing store:', effectiveStoreName);
    } else {
      console.log('OBC RAG Service initialized (no pre-configured store)');
    }
  }

  /**
   * Check if RAG store needs initialization
   */
  async needsInitialization() {
    // Check if we have a stored RAG store name
    return !this.ragStoreName || !this.isInitialized;
  }

  /**
   * Create or retrieve the static OBC RAG store
   */
  async setupStaticRagStore() {
    if (!this.ai) {
      throw new Error('Service not initialized. Call initialize(apiKey) first.');
    }

    try {
      // Try to create a new RAG store for OBC documents
      console.log('Creating OBC RAG store...');
      const ragStore = await this.ai.fileSearchStores.create({
        config: { displayName: this.OBC_STORE_NAME }
      });

      if (!ragStore.name) {
        throw new Error('Failed to create RAG store: name is missing');
      }

      this.ragStoreName = ragStore.name;
      console.log('OBC RAG store created:', this.ragStoreName);
      return this.ragStoreName;
    } catch (error) {
      console.error('Error creating RAG store:', error);
      throw error;
    }
  }

  /**
   * Upload all 12 OBC PDF documents to the RAG store
   */
  async uploadOBCDocuments(progressCallback = null) {
    if (!this.ragStoreName) {
      throw new Error('RAG store not created. Call setupStaticRagStore() first.');
    }

    if (!this.OBC_DOCS_PATH) {
      throw new Error('OBC docs path not set. Call setDocsPath() first.');
    }

    try {
      // Read all PDF files from the OBC directory
      const files = await fs.readdir(this.OBC_DOCS_PATH);
      const pdfFiles = files.filter(f => f.endsWith('.pdf')).sort();

      console.log(`Found ${pdfFiles.length} OBC PDF files to upload`);

      const totalFiles = pdfFiles.length;

      for (let i = 0; i < pdfFiles.length; i++) {
        const fileName = pdfFiles[i];
        const filePath = path.join(this.OBC_DOCS_PATH, fileName);

        if (progressCallback) {
          progressCallback({
            current: i,
            total: totalFiles,
            fileName,
            message: `Uploading ${fileName}...`
          });
        }

        console.log(`Uploading ${i + 1}/${totalFiles}: ${fileName}`);

        // Upload to RAG store using file path
        // The Gemini API accepts file path as string in Node.js
        let operation = await this.ai.fileSearchStores.uploadToFileSearchStore({
          file: filePath,
          fileSearchStoreName: this.ragStoreName,
          config: {
            displayName: fileName
          }
        });

        // Wait for upload to complete
        while (!operation.done) {
          await this.delay(3000);
          operation = await this.ai.operations.get({ operation });
        }

        console.log(`✓ Uploaded: ${fileName}`);
      }

      if (progressCallback) {
        progressCallback({
          current: totalFiles,
          total: totalFiles,
          fileName: '',
          message: 'All OBC documents uploaded successfully!'
        });
      }

      this.isInitialized = true;
      console.log('All OBC documents uploaded successfully');
      return true;
    } catch (error) {
      console.error('Error uploading OBC documents:', error);
      throw error;
    }
  }

  /**
   * Generate example questions based on OBC content
   */
  async generateExampleQuestions() {
    if (!this.ragStoreName) {
      throw new Error('RAG store not initialized');
    }

    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `You are provided with the Ontario Building Code 2024 Volume 1 (Division B Parts 1-12). Generate 8 practical example questions that users might ask about building code compliance, organized by common topics. Return the questions as a JSON array of strings. Focus on practical questions about residential construction, fire safety, structural requirements, and building envelope. Example format: ["What are the minimum ceiling heights for residential rooms?", "What fire rating is required between a garage and dwelling?"]`,
        config: {
          tools: [
            {
              fileSearch: {
                fileSearchStoreNames: [this.ragStoreName],
              }
            }
          ]
        }
      });

      let jsonText = response.text.trim();

      // Extract JSON from markdown code blocks if present
      const jsonMatch = jsonText.match(/```json\n([\s\S]*?)\n```/);
      if (jsonMatch && jsonMatch[1]) {
        jsonText = jsonMatch[1];
      } else {
        const firstBracket = jsonText.indexOf('[');
        const lastBracket = jsonText.lastIndexOf(']');
        if (firstBracket !== -1 && lastBracket !== -1) {
          jsonText = jsonText.substring(firstBracket, lastBracket + 1);
        }
      }

      const questions = JSON.parse(jsonText);
      console.log('Generated example questions:', questions);
      return Array.isArray(questions) ? questions : [];
    } catch (error) {
      console.error('Failed to generate example questions:', error);
      // Return fallback questions
      return [
        "What are the minimum ceiling heights for residential rooms?",
        "What fire rating is required between a garage and dwelling unit?",
        "What are the requirements for egress windows in basements?",
        "What is the minimum stair width for residential buildings?",
        "What are the insulation requirements for exterior walls?",
        "What are the requirements for smoke alarms in dwelling units?",
        "What is the maximum rise and minimum run for residential stairs?",
        "What are the guardrail height requirements for decks?"
      ];
    }
  }

  /**
   * Query the OBC documents
   */
  async query(question) {
    if (!this.ragStoreName) {
      throw new Error('RAG store not initialized');
    }

    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: question + " Please provide specific references to OBC sections and detailed requirements. DO NOT ask the user to consult the code directly - provide the information from the code in your response.",
        config: {
          tools: [
            {
              fileSearch: {
                fileSearchStoreNames: [this.ragStoreName],
              }
            }
          ]
        }
      });

      const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

      return {
        text: response.text,
        groundingChunks: groundingChunks,
      };
    } catch (error) {
      console.error('Query failed:', error);
      throw error;
    }
  }

  /**
   * Delete the RAG store (cleanup)
   */
  async deleteRagStore() {
    if (!this.ragStoreName) {
      return;
    }

    try {
      await this.ai.fileSearchStores.delete({
        name: this.ragStoreName,
        config: { force: true },
      });
      console.log('RAG store deleted:', this.ragStoreName);
      this.ragStoreName = null;
      this.isInitialized = false;
    } catch (error) {
      console.error('Error deleting RAG store:', error);
      throw error;
    }
  }

  /**
   * Get current status
   */
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      ragStoreName: this.ragStoreName,
      hasApiKey: !!this.ai
    };
  }

  /**
   * Utility delay function
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
module.exports = new OBCRagService();
