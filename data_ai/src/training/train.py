import os
import yaml
import mlflow
import torch
from torch.optim import AdamW
from torch.utils.data import DataLoader, random_split
from tqdm import tqdm
import logging
from typing import Dict, Any

from ..models.embeddings import EnergyDomainEmbedding
from ..data.preprocessing import DocumentProcessor
from ..vector_db.milvus_client import MilvusClient
from ..utils.metrics import calculate_metrics

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class Trainer:
    def __init__(self, config_path: str):
        self.config = self._load_config(config_path)
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        self._setup_mlflow()
        
        # Initialize components
        self.model = EnergyDomainEmbedding(
            base_model=self.config['model']['base_model']
        ).to(self.device)
        
        self.processor = DocumentProcessor()
        self.db_client = MilvusClient(
            host=self.config['vector_db']['host'],
            port=self.config['vector_db']['port']
        )
        
        self.optimizer = AdamW(
            self.model.parameters(),
            lr=self.config['training']['learning_rate'],
            weight_decay=self.config['training']['weight_decay']
        )
        
    def _load_config(self, config_path: str) -> Dict[str, Any]:
        """Load configuration from YAML file"""
        with open(config_path, 'r') as f:
            return yaml.safe_load(f)
    
    def _setup_mlflow(self):
        """Configure MLflow tracking"""
        mlflow.set_tracking_uri(self.config['logging']['mlflow']['tracking_uri'])
        mlflow.set_experiment(self.config['logging']['mlflow']['experiment_name'])
    
    def prepare_data(self, texts, labels=None):
        """Prepare data for training"""
        processed_data = []
        for text in texts:
            processed = self.processor.process_document(text)
            processed_data.extend(processed['chunks'])
            
        # Create dataset
        dataset = torch.utils.data.TensorDataset(
            torch.tensor([1] * len(processed_data))  # Dummy labels for now
        )
        
        # Split dataset
        val_size = int(len(dataset) * self.config['training']['validation_split'])
        train_size = len(dataset) - val_size
        
        train_dataset, val_dataset = random_split(
            dataset, [train_size, val_size]
        )
        
        return train_dataset, val_dataset
    
    def train_epoch(self, train_loader):
        """Train for one epoch"""
        self.model.train()
        total_loss = 0
        
        with tqdm(train_loader, desc='Training') as pbar:
            for batch_idx, (data,) in enumerate(pbar):
                self.optimizer.zero_grad()
                
                # Forward pass
                embeddings = self.model(data)
                
                # Calculate loss (example: using cosine similarity)
                loss = torch.nn.functional.cosine_embedding_loss(
                    embeddings[:-1], embeddings[1:],
                    torch.ones(embeddings.size(0)-1).to(self.device)
                )
                
                # Backward pass
                loss.backward()
                self.optimizer.step()
                
                total_loss += loss.item()
                
                # Update progress bar
                pbar.set_postfix({'loss': loss.item()})
                
                # Log metrics
                if batch_idx % self.config['logging']['log_interval'] == 0:
                    mlflow.log_metric('batch_loss', loss.item())
        
        return total_loss / len(train_loader)
    
    def validate(self, val_loader):
        """Validate the model"""
        self.model.eval()
        total_loss = 0
        
        with torch.no_grad():
            for data, in val_loader:
                embeddings = self.model(data)
                loss = torch.nn.functional.cosine_embedding_loss(
                    embeddings[:-1], embeddings[1:],
                    torch.ones(embeddings.size(0)-1).to(self.device)
                )
                total_loss += loss.item()
        
        return total_loss / len(val_loader)
    
    def train(self, texts):
        """Main training loop"""
        # Prepare data
        train_dataset, val_dataset = self.prepare_data(texts)
        
        train_loader = DataLoader(
            train_dataset,
            batch_size=self.config['data']['batch_size'],
            shuffle=True
        )
        
        val_loader = DataLoader(
            val_dataset,
            batch_size=self.config['data']['batch_size']
        )
        
        # Training loop
        best_val_loss = float('inf')
        patience_counter = 0
        
        with mlflow.start_run():
            # Log parameters
            mlflow.log_params(self.config['model'])
            mlflow.log_params(self.config['training'])
            
            for epoch in range(self.config['training']['epochs']):
                logger.info(f"Epoch {epoch+1}/{self.config['training']['epochs']}")
                
                # Train
                train_loss = self.train_epoch(train_loader)
                mlflow.log_metric('train_loss', train_loss, step=epoch)
                
                # Validate
                val_loss = self.validate(val_loader)
                mlflow.log_metric('val_loss', val_loss, step=epoch)
                
                logger.info(f"Train Loss: {train_loss:.4f}, Val Loss: {val_loss:.4f}")
                
                # Early stopping
                if val_loss < best_val_loss:
                    best_val_loss = val_loss
                    patience_counter = 0
                    
                    # Save best model
                    if self.config['logging']['save_model']:
                        save_path = os.path.join(
                            self.config['logging']['save_dir'],
                            f'model_epoch_{epoch}.pt'
                        )
                        torch.save(self.model.state_dict(), save_path)
                        mlflow.log_artifact(save_path)
                else:
                    patience_counter += 1
                    
                if patience_counter >= self.config['training']['early_stopping_patience']:
                    logger.info("Early stopping triggered")
                    break
        
        return best_val_loss

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('--config', type=str, required=True,
                       help='Path to config file')
    args = parser.parse_args()
    
    trainer = Trainer(args.config)
    # Add your training data here
    texts = []  # Load your texts
    trainer.train(texts) 