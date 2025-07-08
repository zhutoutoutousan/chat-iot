import torch
import torch.nn as nn
from sentence_transformers import SentenceTransformer

class DomainAdaptationLayer(nn.Module):
    def __init__(self, input_dim):
        super().__init__()
        self.adapter = nn.Sequential(
            nn.Linear(input_dim, input_dim),
            nn.ReLU(),
            nn.Dropout(0.1),
            nn.Linear(input_dim, input_dim)
        )
        
    def forward(self, x):
        return self.adapter(x) + x  # Residual connection

class EnergyDomainEmbedding(nn.Module):
    def __init__(self, base_model='all-roberta-large-v1'):
        super().__init__()
        self.sbert = SentenceTransformer(base_model)
        self.domain_adapter = DomainAdaptationLayer(1024)
        
    def forward(self, text):
        # Get base embeddings
        with torch.no_grad():
            base_embedding = self.sbert.encode(text, convert_to_tensor=True)
        
        # Apply domain adaptation
        adapted_embedding = self.domain_adapter(base_embedding)
        return adapted_embedding
    
    def encode_batch(self, texts, batch_size=32):
        embeddings = []
        for i in range(0, len(texts), batch_size):
            batch = texts[i:i + batch_size]
            batch_embeddings = self.forward(batch)
            embeddings.extend(batch_embeddings)
        return torch.stack(embeddings) 