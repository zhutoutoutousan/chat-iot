// Type declarations for external packages
interface LangGraphNode {
  addNode(name: string, fn: Function): LangGraphNode;
  addEdge(from: string, to: string): LangGraphNode;
  execute(input: any): Promise<any>;
}

interface ChatOpenAIConfig {
  modelName: string;
  temperature: number;
}

interface ChatOpenAIResponse {
  content: string;
}

interface ChatOpenAIInstance {
  invoke(prompt: string): Promise<ChatOpenAIResponse>;
}

interface WeaviateGraphQL {
  get(): {
    withNearText(config: { concepts: string[]; distance: number }): any;
    withLimit(limit: number): any;
    do(): Promise<{ data: { Get: { Data: any[] } } }>;
  };
}

interface WeaviateClientConfig {
  host: string;
  headers?: Record<string, string>;
}

interface WeaviateClientInstance {
  graphql: WeaviateGraphQL;
}

// Import types as any since we don't have proper type declarations
const LangGraph = require('@langchain/langgraph').LangGraph;
const ChatOpenAI = require('@langchain/openai').ChatOpenAI;
const WeaviateClient = require('weaviate-ts-client').WeaviateClient;
import { z } from 'zod';

// Zod schemas for request validation
const AnalysisRequestSchema = z.object({
  query: z.string().min(1, 'Query must not be empty'),
  dataContext: z.string().optional(),
  visualizationType: z.string().optional()
});

const NetworkDataSchema = z.object({
  mastrNummer: z.string().optional(),
  sparte: z.string().optional(),
  datumLetzteAktualisierung: z.string().optional(),
  networkDetails: z.record(z.any()).optional(),
  content: z.string().optional(),
  vector: z.array(z.number()).optional()
});

// Type declarations
export type AnalysisRequest = z.infer<typeof AnalysisRequestSchema>;

interface AnalysisResponse {
  relevantData: z.infer<typeof NetworkDataSchema>[];
  analysis: string;
  visualizationConfig: {
    type: string;
    config: Record<string, any>;
  };
}

interface StepInput extends AnalysisRequest {
  relevantData?: z.infer<typeof NetworkDataSchema>[];
  analysis?: string;
}

export class AnalysisOrchestrator {
  private dataSelectionAgent: ChatOpenAIInstance;
  private analysisAgent: ChatOpenAIInstance;
  private visualizationAgent: ChatOpenAIInstance;
  private weaviateClient: WeaviateClientInstance;
  private graph: LangGraphNode = {} as LangGraphNode;

  constructor() {
    this.dataSelectionAgent = new ChatOpenAI({
      modelName: 'gpt-4-turbo-preview',
      temperature: 0.2
    }) as ChatOpenAIInstance;

    this.analysisAgent = new ChatOpenAI({
      modelName: 'gpt-4-turbo-preview',
      temperature: 0.3
    }) as ChatOpenAIInstance;

    this.visualizationAgent = new ChatOpenAI({
      modelName: 'gpt-4-turbo-preview',
      temperature: 0.1
    }) as ChatOpenAIInstance;

    this.weaviateClient = new WeaviateClient({
      host: process.env.WEAVIATE_HOST || 'localhost',
      headers: { 'X-OpenAI-Api-Key': process.env.OPENAI_API_KEY || '' }
    }) as WeaviateClientInstance;

    this.initializeGraph();
  }

  private initializeGraph() {
    this.graph = new LangGraph() as unknown as LangGraphNode;
    this.graph
      .addNode('dataSelection', this.dataSelectionStep.bind(this))
      .addNode('analysis', this.analysisStep.bind(this))
      .addNode('visualization', this.visualizationStep.bind(this))
      .addEdge('dataSelection', 'analysis')
      .addEdge('analysis', 'visualization');
  }

  async processQuery(request: AnalysisRequest): Promise<AnalysisResponse> {
    try {
      // Validate request
      const validatedRequest = AnalysisRequestSchema.parse(request);
      
      // Execute graph
      const result = await this.graph.execute(validatedRequest);
      return result as AnalysisResponse;
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(`Invalid request: ${error.errors.map(e => e.message).join(', ')}`);
      }
      throw error;
    }
  }

  private async dataSelectionStep(input: StepInput) {
    try {
      // Query Weaviate for relevant data based on semantic search
      const result = await this.weaviateClient.graphql
        .get()
        .withNearText({
          concepts: [input.query],
          distance: 0.7
        })
        .withLimit(10)
        .do();

      const relevantData = result.data?.Get?.Data || [];

      // Validate data
      const validatedData = z.array(NetworkDataSchema).parse(relevantData);

      return {
        ...input,
        relevantData: validatedData
      };
    } catch (error) {
      console.error('Error in data selection step:', error);
      throw new Error('Failed to retrieve relevant data from the database');
    }
  }

  private async analysisStep(input: StepInput) {
    try {
      const analysisPrompt = `You are a data analysis expert. Analyze the following network data in the context of the user's query.
      
Query: "${input.query}"

Context: The data represents network infrastructure information with the following fields:
- mastrNummer: Unique identifier for network components
- sparte: Network sector or division
- datumLetzteAktualisierung: Last update timestamp
- networkDetails: Detailed network configuration

Data: ${JSON.stringify(input.relevantData, null, 2)}

Instructions:
1. Identify key patterns and trends in the data
2. Highlight any anomalies or interesting findings
3. Consider temporal aspects if relevant
4. Focus on insights relevant to the user's query
5. Keep the analysis clear and concise

Please provide your analysis:`;

      const analysis = await this.analysisAgent.invoke(analysisPrompt);

      return {
        ...input,
        analysis: analysis.content
      };
    } catch (error) {
      console.error('Error in analysis step:', error);
      throw new Error('Failed to analyze the data');
    }
  }

  private async visualizationStep(input: StepInput) {
    try {
      const vizPrompt = `You are a data visualization expert. Recommend the best visualization for the following analysis and data.

Analysis: ${input.analysis}

Data Sample: ${JSON.stringify(input.relevantData?.[0], null, 2)}

Available Visualization Types:
1. Line Chart - For temporal trends
2. Bar Chart - For categorical comparisons
3. Scatter Plot - For relationship analysis
4. Pie Chart - For part-to-whole relationships
5. Network Graph - For network topology visualization
6. Heat Map - For density or intensity visualization

Instructions:
1. Choose the most appropriate visualization type
2. Provide a detailed configuration object
3. Consider the data structure and analysis context
4. Ensure the visualization will be clear and informative
5. If multiple visualizations would be helpful, prioritize the most important one

Please respond with a JSON object in this format:
{
  "type": "visualization_type",
  "config": {
    // Visualization-specific configuration
  }
}`;

      const vizResponse = await this.visualizationAgent.invoke(vizPrompt);

      let visualizationConfig;
      try {
        visualizationConfig = JSON.parse(vizResponse.content);
      } catch (parseError) {
        console.error('Error parsing visualization config:', parseError);
        visualizationConfig = {
          type: 'bar',
          config: {
            data: input.relevantData,
            error: 'Failed to parse custom configuration'
          }
        };
      }

      return {
        ...input,
        visualizationConfig
      };
    } catch (error) {
      console.error('Error in visualization step:', error);
      throw new Error('Failed to generate visualization configuration');
    }
  }
} 