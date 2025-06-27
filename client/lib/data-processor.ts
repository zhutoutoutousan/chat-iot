import { createReadStream } from 'fs';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';

// Type declarations for external packages
interface XMLParserOptions {
  ignoreAttributes?: boolean;
  parseAttributeValue?: boolean;
  parseTagValue?: boolean;
  preserveOrder?: boolean;
}

interface WeaviateClientConfig {
  host: string;
  port?: number;
  headers?: Record<string, string>;
}

interface WeaviateSchema {
  class: string;
  properties: Array<{
    name: string;
    dataType: string[];
  }>;
  vectorizer: string;
}

// Simplified type declarations for the required classes
class XMLParser {
  constructor(options: XMLParserOptions) {}
  parse(xml: string): any {}
}

class WeaviateClient {
  schema: {
    classCreator: () => {
      withClass: (schema: WeaviateSchema) => {
        do: () => Promise<void>;
      };
    };
  } = {
    classCreator: () => ({
      withClass: () => ({
        do: () => Promise.resolve()
      })
    })
  };

  batch: {
    objectsBatcher: () => {
      withObject: (obj: any) => void;
      do: () => Promise<any>;
    };
  } = {
    objectsBatcher: () => ({
      withObject: () => {},
      do: () => Promise.resolve({})
    })
  };

  constructor(config: WeaviateClientConfig) {}
}

class OpenAIEmbeddings {
  constructor(config: { modelName: string }) {}
  embedDocuments(texts: string[]): Promise<number[][]> {
    return Promise.resolve([[]]);
  }
}

// Utility function to chunk arrays
function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

// Add type declarations for the document structure
interface NetworkDocument {
  mastrNummer?: string;
  sparte?: string;
  datumLetzteAktualisierung?: string;
  networkDetails?: Record<string, any>;
  content?: string;
  vector?: number[];
}

export class DataProcessor {
  private weaviateClient: WeaviateClient;
  private xmlParser: XMLParser;
  private embeddings: OpenAIEmbeddings;

  constructor() {
    this.weaviateClient = new WeaviateClient({
      host: process.env.WEAVIATE_HOST || 'localhost',
      port: parseInt(process.env.WEAVIATE_PORT || '8080'),
      headers: { 'X-OpenAI-Api-Key': process.env.OPENAI_API_KEY || '' }
    });
    
    this.xmlParser = new XMLParser({
      ignoreAttributes: false,
      parseAttributeValue: true,
      parseTagValue: true,
      preserveOrder: true
    });

    this.embeddings = new OpenAIEmbeddings({
      modelName: 'text-embedding-3-small'
    });

    this.initializeSchema();
  }

  private async initializeSchema() {
    const schemaConfig = {
      class: 'NetworkData',
      properties: [
        { name: 'mastrNummer', dataType: ['string'] },
        { name: 'sparte', dataType: ['string'] },
        { name: 'datumLetzteAktualisierung', dataType: ['date'] },
        { name: 'networkDetails', dataType: ['text'] },
        { name: 'content', dataType: ['text'] }
      ],
      vectorizer: 'text2vec-openai'
    };

    try {
      await this.weaviateClient.schema.classCreator().withClass(schemaConfig).do();
    } catch (error) {
      // Schema might already exist, which is fine
      console.log('Schema initialization completed');
    }
  }

  async processXMLFile(filePath: string, chunkSize: number = 1000) {
    try {
      const fileStream = createReadStream(filePath, { encoding: 'utf-8' });
      let buffer = '';
      
      const processChunks = async function* (this: DataProcessor, source: Readable) {
        for await (const chunk of source) {
          buffer += chunk;
          const documents = this.extractDocuments(buffer);
          
          if (documents.length >= chunkSize) {
            yield documents;
            buffer = '';
          }
        }
        
        if (buffer) {
          yield this.extractDocuments(buffer);
        }
      };

      const processDocuments = async function* (this: DataProcessor, documents: AsyncIterable<NetworkDocument[]>) {
        for await (const batch of documents) {
          const vectorized = await this.vectorizeAndStore(batch);
          yield vectorized;
        }
      };

      await pipeline(
        fileStream,
        processChunks.bind(this),
        processDocuments.bind(this)
      );

    } catch (error) {
      console.error('Error processing XML file:', error);
      throw error;
    }
  }

  private async vectorizeAndStore(documents: NetworkDocument[]) {
    const batches = chunk(documents, 100);
    const results = [];
    
    for (const batch of batches) {
      const vectors = await this.generateEmbeddings(batch);
      const stored = await this.storeInWeaviate(vectors);
      results.push(...stored);
    }

    return results;
  }

  private async generateEmbeddings(documents: NetworkDocument[]) {
    const texts = documents.map(doc => {
      const content = [
        doc.mastrNummer,
        doc.sparte,
        doc.datumLetzteAktualisierung,
        JSON.stringify(doc.networkDetails)
      ].filter(Boolean).join(' ');
      
      return { ...doc, content };
    });

    const embeddings = await Promise.all(
      texts.map(async (doc) => {
        const [vector] = await this.embeddings.embedDocuments([doc.content || '']);
        return { ...doc, vector };
      })
    );

    return embeddings;
  }

  private async storeInWeaviate(vectors: NetworkDocument[]) {
    const batcher = this.weaviateClient.batch.objectsBatcher();
    
    vectors.forEach(item => {
      batcher.withObject({
        class: 'NetworkData',
        properties: {
          mastrNummer: item.mastrNummer,
          sparte: item.sparte,
          datumLetzteAktualisierung: item.datumLetzteAktualisierung,
          networkDetails: item.networkDetails,
          content: item.content
        },
        vector: item.vector
      });
    });

    const result = await batcher.do();
    return result;
  }

  private extractDocuments(xmlString: string): NetworkDocument[] {
    try {
      const parsed = this.xmlParser.parse(xmlString);
      // Handle the preserved order format
      const documents = Array.isArray(parsed) ? parsed : [parsed];
      return documents.map(doc => this.flattenDocument(doc));
    } catch (error) {
      console.error('Error parsing XML:', error);
      return [];
    }
  }

  private flattenDocument(doc: any): NetworkDocument {
    // Convert the preserved order format to a flat object
    const flat: NetworkDocument = {};
    
    const flatten = (obj: any) => {
      if (Array.isArray(obj)) {
        obj.forEach(item => {
          if (item['#text']) {
            flat[item['#name'] as keyof NetworkDocument] = item['#text'];
          } else {
            flatten(item);
          }
        });
      }
    };

    flatten(doc);
    return flat;
  }
} 