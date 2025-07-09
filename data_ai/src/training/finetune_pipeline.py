"""
Fine-tuning Pipeline for Energy Domain LLM

This script orchestrates the end-to-end process of data processing
and model fine-tuning for the energy infrastructure domain.
"""

import os
import logging
from pathlib import Path
import mlflow
from typing import Dict, List
import torch
from torch.utils.data import DataLoader, Dataset
import hydra
from omegaconf import DictConfig
import pandas as pd
from tqdm import tqdm

from ..data.xml_processor import XMLStreamProcessor, DatasetBuilder
from ..models.llm import EnergyDomainLLM, DomainFineTuner
from ..models.evaluation import LLMEvaluator

logger = logging.getLogger(__name__)

# Get project root directory
PROJECT_ROOT = Path(__file__).parent.parent.parent.parent.absolute()

class EnergyDataset(Dataset):
    """Dataset for energy domain text data"""
    
    def __init__(
        self,
        text_file: str,
        features_file: str,
        tokenizer,
        max_length: int = 512
    ):
        """
        Initialize dataset.
        
        Args:
            text_file: Path to text data file
            features_file: Path to features parquet file
            tokenizer: Tokenizer for text processing
            max_length: Maximum sequence length
        """
        # Load text data
        with open(text_file, 'r', encoding='utf-8') as f:
            self.texts = f.readlines()
        
        # Load features
        self.features = pd.read_parquet(features_file)
        
        self.tokenizer = tokenizer
        self.max_length = max_length
    
    def __len__(self) -> int:
        return len(self.texts)
    
    def __getitem__(self, idx: int) -> Dict:
        text = self.texts[idx].strip()
        features = self.features.iloc[idx].to_dict()
        
        # Tokenize text
        encoding = self.tokenizer(
            text,
            truncation=True,
            padding='max_length',
            max_length=self.max_length,
            return_tensors='pt'
        )
        
        # Convert features to tensor
        feature_tensor = torch.tensor([list(features.values())], dtype=torch.float)
        
        return {
            'input_ids': encoding['input_ids'].squeeze(),
            'attention_mask': encoding['attention_mask'].squeeze(),
            'features': feature_tensor.squeeze()
        }

class FineTuningPipeline:
    """Pipeline for data processing and model fine-tuning"""
    
    def __init__(self, config: DictConfig):
        """
        Initialize pipeline.
        
        Args:
            config: Hydra configuration
        """
        self.config = config
        
        # Setup paths with project root
        self.data_dir = PROJECT_ROOT / Path(config.data.input_dir)
        self.output_dir = PROJECT_ROOT / Path(config.data.output_dir)
        self.schema_path = PROJECT_ROOT / Path(config.data.schema_path)
        
        # Create directories if they don't exist
        self.data_dir.mkdir(parents=True, exist_ok=True)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.schema_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Initialize components
        self.xml_processor = XMLStreamProcessor(
            schema_path=str(self.schema_path),
            chunk_size=config.processing.chunk_size,
            num_workers=config.processing.num_workers
        )
        
        self.dataset_builder = DatasetBuilder(
            output_dir=str(self.output_dir / 'processed'),
            max_sequence_length=config.model.max_sequence_length
        )
        
        # Initialize model and training components
        self.model = EnergyDomainLLM(
            model_name=config.model.base_model,
            device=config.training.device,
            max_length=config.model.max_sequence_length
        )
        
        self.fine_tuner = DomainFineTuner(
            base_model=self.model,
            learning_rate=config.training.learning_rate,
            warmup_steps=config.training.warmup_steps
        )
        
        # Setup MLflow
        mlflow.set_tracking_uri(config.mlflow.tracking_uri)
        mlflow.set_experiment(config.mlflow.experiment_name)
    
    def process_data(self):
        """Process XML data and prepare for training"""
        logger.info("Starting data processing")
        
        # Process each XML file
        for xml_file in self.data_dir.glob('*.xml'):
            logger.info(f"Processing {xml_file}")
            
            # Stream and process elements
            for processed_data in self.xml_processor.stream_elements(
                str(xml_file),
                target_elements=self.config.data.target_elements
            ):
                self.dataset_builder.add_processed_data(processed_data)
            
            # Save processed data in chunks
            if len(self.dataset_builder.text_data) >= self.config.processing.save_chunk_size:
                self.dataset_builder.save_dataset(f"chunk_{xml_file.stem}")
                self.dataset_builder.clear()
        
        # Save any remaining data
        if len(self.dataset_builder.text_data) > 0:
            self.dataset_builder.save_dataset("final_chunk")
            self.dataset_builder.clear()
    
    def prepare_datasets(self) -> tuple[DataLoader, DataLoader]:
        """
        Prepare training and validation dataloaders.
        
        Returns:
            Tuple of (train_dataloader, val_dataloader)
        """
        # Get all processed files
        processed_dir = self.output_dir / 'processed'
        text_files = list(processed_dir.glob('*_text.txt'))
        feature_files = list(processed_dir.glob('*_features.parquet'))
        
        # Split into train/val
        train_size = int(len(text_files) * 0.8)
        train_text_files = text_files[:train_size]
        train_feature_files = feature_files[:train_size]
        val_text_files = text_files[train_size:]
        val_feature_files = feature_files[train_size:]
        
        # Create datasets
        train_dataset = EnergyDataset(
            train_text_files[0],  # Start with first chunk
            train_feature_files[0],
            self.model.tokenizer,
            self.config.model.max_sequence_length
        )
        
        val_dataset = EnergyDataset(
            val_text_files[0],
            val_feature_files[0],
            self.model.tokenizer,
            self.config.model.max_sequence_length
        )
        
        # Create dataloaders
        train_loader = DataLoader(
            train_dataset,
            batch_size=self.config.training.batch_size,
            shuffle=True,
            num_workers=self.config.training.dataloader_workers
        )
        
        val_loader = DataLoader(
            val_dataset,
            batch_size=self.config.training.batch_size,
            shuffle=False,
            num_workers=self.config.training.dataloader_workers
        )
        
        return train_loader, val_loader
    
    def train(self, train_loader: DataLoader, val_loader: DataLoader):
        """
        Run fine-tuning process.
        
        Args:
            train_loader: Training data loader
            val_loader: Validation data loader
        """
        logger.info("Starting fine-tuning process")
        
        with mlflow.start_run():
            # Log parameters
            mlflow.log_params({
                "model_name": self.config.model.base_model,
                "learning_rate": self.config.training.learning_rate,
                "batch_size": self.config.training.batch_size,
                "max_sequence_length": self.config.model.max_sequence_length
            })
            
            # Training loop
            for epoch in range(self.config.training.num_epochs):
                logger.info(f"Starting epoch {epoch+1}")
                
                # Train
                train_loss = self._train_epoch(train_loader)
                mlflow.log_metric("train_loss", train_loss, step=epoch)
                
                # Validate
                val_loss = self._validate_epoch(val_loader)
                mlflow.log_metric("val_loss", val_loss, step=epoch)
                
                # Save checkpoint
                self._save_checkpoint(epoch, train_loss, val_loss)
    
    def _train_epoch(self, train_loader: DataLoader) -> float:
        """Run one training epoch"""
        self.model.model.train()
        total_loss = 0
        
        for batch in tqdm(train_loader, desc="Training"):
            loss = self.fine_tuner.train_step(batch)
            total_loss += loss
        
        return total_loss / len(train_loader)
    
    def _validate_epoch(self, val_loader: DataLoader) -> float:
        """Run validation"""
        self.model.model.eval()
        total_loss = 0
        
        with torch.no_grad():
            for batch in tqdm(val_loader, desc="Validating"):
                outputs = self.model.model(**batch)
                total_loss += outputs.loss.item()
        
        return total_loss / len(val_loader)
    
    def _save_checkpoint(self, epoch: int, train_loss: float, val_loss: float):
        """Save model checkpoint"""
        checkpoint_dir = self.output_dir / 'checkpoints'
        checkpoint_dir.mkdir(exist_ok=True)
        
        checkpoint_path = checkpoint_dir / f"checkpoint_epoch_{epoch}.pt"
        torch.save({
            'epoch': epoch,
            'model_state_dict': self.model.model.state_dict(),
            'optimizer_state_dict': self.fine_tuner.optimizer.state_dict(),
            'train_loss': train_loss,
            'val_loss': val_loss
        }, checkpoint_path)
        
        mlflow.log_artifact(str(checkpoint_path))

@hydra.main(config_path="../config", config_name="finetune_config")
def main(config: DictConfig):
    """Main entry point for fine-tuning pipeline"""
    pipeline = FineTuningPipeline(config)
    
    # Process data if needed
    if config.processing.enabled:
        pipeline.process_data()
    
    # Prepare datasets
    train_loader, val_loader = pipeline.prepare_datasets()
    
    # Run training
    pipeline.train(train_loader, val_loader)

if __name__ == "__main__":
    main() 