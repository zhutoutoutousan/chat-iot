# MhatIoT Architecture

## Overview

MhatIoT is a modern IoT data analytics platform that provides a Google-like interface for querying and analyzing sensor data. The system is designed to be intuitive, responsive, and powerful, focusing on user experience while handling complex data processing under the hood.

## System Architecture

### High-Level Overview

```mermaid
%%{init: {'theme': 'base', 'themeVariables': { 'fontFamily': 'arial', 'fontSize': '16px', 'textColor': '#000000' }}}%%
graph TB
    UI[Web Interface] --> API[API Layer]
    API --> DP[Data Processing]
    API --> AO[Agent Orchestration]
    DP --> VDB[(Vector Database)]
    DP --> XML[XML Parser]
    AO --> Agents
    Agents --> VDB
    
    subgraph "Frontend Layer"
        UI
    end
    
    subgraph "Backend Services"
        API
        DP
        AO
    end
    
    subgraph "Data Layer"
        VDB
        XML
    end
    
    subgraph "AI Layer"
        Agents
    end

    style UI fill:#f9f,stroke:#333,stroke-width:2px,color:#000
    style API fill:#bbf,stroke:#333,stroke-width:2px,color:#000
    style DP fill:#dfd,stroke:#333,stroke-width:2px,color:#000
    style AO fill:#ffd,stroke:#333,stroke-width:2px,color:#000
    style VDB fill:#fff,stroke:#333,stroke-width:2px,color:#000
    style XML fill:#fff,stroke:#333,stroke-width:2px,color:#000
    style Agents fill:#fff,stroke:#333,stroke-width:2px,color:#000
```

## Component Details

### 1. Frontend Interface

The frontend is built with Next.js and follows Google's search interface design principles:

```mermaid
%%{init: {'theme': 'base', 'themeVariables': { 'fontFamily': 'arial', 'fontSize': '16px', 'textColor': '#000000' }}}%%
graph TD
    subgraph "User Interface Components"
        MI[Main Interface] --> |Centered Layout| SB[Search Bar]
        MI --> |Below Search| CB[Check Sensors Button]
        MI --> |Expandable| CR[Chat Results]
        
        SB --> |Left Icon| SI[Search Icon]
        SB --> |Right Icon| SD[Send Icon]
        
        CR --> |Dynamic| MSG[Messages]
        CR --> |Conditional| LD[Loading State]
    end

    style MI fill:#f9f,stroke:#333,stroke-width:2px,color:#000
    style SB fill:#bbf,stroke:#333,stroke-width:2px,color:#000
    style CB fill:#dfd,stroke:#333,stroke-width:2px,color:#000
    style CR fill:#ffd,stroke:#333,stroke-width:2px,color:#000
    style SI fill:#fff,stroke:#333,stroke-width:2px,color:#000
    style SD fill:#fff,stroke:#333,stroke-width:2px,color:#000
    style MSG fill:#fff,stroke:#333,stroke-width:2px,color:#000
    style LD fill:#fff,stroke:#333,stroke-width:2px,color:#000
```

Key Features:
- Centered, Google-like search interface
- Expandable chat interface
- Responsive design
- Smooth transitions and animations
- Loading states and feedback

### 2. Data Processing Pipeline

```mermaid
%%{init: {'theme': 'base', 'themeVariables': { 'fontFamily': 'arial', 'fontSize': '16px', 'textColor': '#000000' }}}%%
flowchart LR
    XML[XML Files] --> Parser[XML Parser]
    Parser --> Stream[Stream Processing]
    Stream --> Embed[OpenAI Embeddings]
    Embed --> Store[Weaviate Storage]
    
    subgraph "Processing Pipeline"
        Parser
        Stream
        Embed
    end
    
    subgraph "Storage"
        Store
    end

    style XML fill:#f9f,stroke:#333,stroke-width:2px,color:#000
    style Parser fill:#bbf,stroke:#333,stroke-width:2px,color:#000
    style Stream fill:#dfd,stroke:#333,stroke-width:2px,color:#000
    style Embed fill:#ffd,stroke:#333,stroke-width:2px,color:#000
    style Store fill:#fdf,stroke:#333,stroke-width:2px,color:#000
```

Components:
- XML Parser for handling large network data files
- Streaming processing for efficient memory usage
- Vector embeddings for semantic search
- Weaviate for vector storage and retrieval

### 3. Agent Orchestration

```mermaid
%%{init: {'theme': 'base', 'themeVariables': { 'fontFamily': 'arial', 'fontSize': '16px', 'textColor': '#000000' }}}%%
graph TB
    User[User Query] --> Orchestrator[Agent Orchestrator]
    Orchestrator --> DataAgent[Data Analysis Agent]
    Orchestrator --> SearchAgent[Search Agent]
    Orchestrator --> VisAgent[Visualization Agent]
    
    DataAgent --> Results[Results]
    SearchAgent --> Results
    VisAgent --> Results
    
    Results --> Response[User Response]

    style User fill:#f9f,stroke:#333,stroke-width:2px,color:#000
    style Orchestrator fill:#bbf,stroke:#333,stroke-width:2px,color:#000
    style DataAgent fill:#dfd,stroke:#333,stroke-width:2px,color:#000
    style SearchAgent fill:#ffd,stroke:#333,stroke-width:2px,color:#000
    style VisAgent fill:#fdf,stroke:#333,stroke-width:2px,color:#000
    style Results fill:#fff,stroke:#333,stroke-width:2px,color:#000
    style Response fill:#fff,stroke:#333,stroke-width:2px,color:#000
```

Features:
- LangGraph for agent workflow management
- Specialized agents for different tasks
- Zod schemas for data validation
- Semantic search capabilities

## Implementation Details

### Key Files and Their Roles

1. `client/app/page.tsx`
   - Main interface component
   - Google-inspired search UI
   - Chat interface integration

2. `client/lib/data-processor.ts`
   - XML parsing logic
   - Vector database operations
   - Stream processing implementation

3. `client/lib/agents/orchestrator.ts`
   - Agent workflow management
   - Query routing and processing
   - Response generation

### Technology Stack

```mermaid
%%{init: {'theme': 'base', 'themeVariables': { 'fontFamily': 'arial', 'fontSize': '16px', 'textColor': '#000000' }}}%%
graph TB
    subgraph "Frontend"
        Next[Next.js] --> React[React]
        React --> Tailwind[TailwindCSS]
        React --> ShadcnUI[shadcn/ui]
    end
    
    subgraph "Backend"
        Node[Node.js] --> LangGraph[LangGraph]
        Node --> OpenAI[OpenAI]
        Node --> Weaviate[Weaviate]
    end
    
    subgraph "Data Processing"
        XML[XML Parser] --> Stream[Stream Processing]
        Stream --> Vector[Vector Database]
    end

    style Next fill:#f9f,stroke:#333,stroke-width:2px,color:#000
    style React fill:#fff,stroke:#333,stroke-width:2px,color:#000
    style Tailwind fill:#fff,stroke:#333,stroke-width:2px,color:#000
    style ShadcnUI fill:#fff,stroke:#333,stroke-width:2px,color:#000
    style Node fill:#bbf,stroke:#333,stroke-width:2px,color:#000
    style LangGraph fill:#fff,stroke:#333,stroke-width:2px,color:#000
    style OpenAI fill:#fff,stroke:#333,stroke-width:2px,color:#000
    style Weaviate fill:#fff,stroke:#333,stroke-width:2px,color:#000
    style XML fill:#dfd,stroke:#333,stroke-width:2px,color:#000
    style Stream fill:#fff,stroke:#333,stroke-width:2px,color:#000
    style Vector fill:#fff,stroke:#333,stroke-width:2px,color:#000
```

## Error Handling and Reliability

- Type safety throughout the application
- Proper error handling in data processing
- Loading states and user feedback
- Fallback mechanisms for failed operations

## Future Considerations

1. Scaling the vector database for larger datasets
2. Adding more specialized AI agents
3. Implementing real-time sensor data updates
4. Enhanced visualization capabilities
5. User authentication and access control 