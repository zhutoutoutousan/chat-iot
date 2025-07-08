"""
LLM Integration and Fine-tuning Module

This module provides integration with Vicuna-13B and implements domain-specific fine-tuning
capabilities for energy infrastructure analysis.
"""

import torch
import torch.nn as nn
from transformers import AutoModelForCausalLM, AutoTokenizer
from typing import List, Dict, Optional, Union
import logging

logger = logging.getLogger(__name__)

class EnergyDomainLLM:
    def __init__(
        self,
        model_name: str = "lmsys/vicuna-13b-v1.5",
        device: str = "cuda" if torch.cuda.is_available() else "cpu",
        max_length: int = 2048
    ):
        """
        Initialize the Energy Domain LLM with Vicuna-13B base model.
        
        Args:
            model_name: Base model identifier
            device: Computing device (cuda/cpu)
            max_length: Maximum sequence length
        """
        self.device = device
        self.max_length = max_length
        
        logger.info(f"Loading model {model_name} on {device}")
        self.tokenizer = AutoTokenizer.from_pretrained(model_name)
        self.model = AutoModelForCausalLM.from_pretrained(
            model_name,
            torch_dtype=torch.float16 if device == "cuda" else torch.float32,
            device_map="auto" if device == "cuda" else None
        )
        
    def generate_response(
        self,
        prompt: str,
        max_new_tokens: int = 512,
        temperature: float = 0.7,
        top_p: float = 0.9
    ) -> str:
        """
        Generate response for energy domain queries.
        
        Args:
            prompt: Input text
            max_new_tokens: Maximum number of tokens to generate
            temperature: Sampling temperature
            top_p: Nucleus sampling parameter
            
        Returns:
            Generated response text
        """
        inputs = self.tokenizer(prompt, return_tensors="pt", truncation=True, 
                              max_length=self.max_length).to(self.device)
        
        outputs = self.model.generate(
            **inputs,
            max_new_tokens=max_new_tokens,
            temperature=temperature,
            top_p=top_p,
            do_sample=True,
            pad_token_id=self.tokenizer.eos_token_id
        )
        
        return self.tokenizer.decode(outputs[0], skip_special_tokens=True)

class DomainFineTuner:
    def __init__(
        self,
        base_model: EnergyDomainLLM,
        learning_rate: float = 1e-5,
        warmup_steps: int = 100
    ):
        """
        Fine-tuning manager for energy domain adaptation.
        
        Args:
            base_model: Base EnergyDomainLLM instance
            learning_rate: Learning rate for fine-tuning
            warmup_steps: Number of warmup steps
        """
        self.model = base_model
        self.learning_rate = learning_rate
        self.warmup_steps = warmup_steps
        
        # Setup optimizer with weight decay
        self.optimizer = torch.optim.AdamW(
            self.model.model.parameters(),
            lr=learning_rate,
            weight_decay=0.01
        )
        
        # Setup scheduler
        self.scheduler = torch.optim.lr_scheduler.LinearLR(
            self.optimizer,
            start_factor=1.0,
            end_factor=0.0,
            total_iters=warmup_steps
        )

    def prepare_training_data(
        self,
        texts: List[str],
        labels: List[str]
    ) -> Dict[str, torch.Tensor]:
        """
        Prepare data for fine-tuning.
        
        Args:
            texts: List of input texts
            labels: List of target outputs
            
        Returns:
            Dictionary of tensors for training
        """
        encodings = self.model.tokenizer(
            texts,
            truncation=True,
            padding=True,
            max_length=self.model.max_length,
            return_tensors="pt"
        )
        
        label_encodings = self.model.tokenizer(
            labels,
            truncation=True,
            padding=True,
            max_length=self.model.max_length,
            return_tensors="pt"
        )
        
        return {
            "input_ids": encodings["input_ids"].to(self.model.device),
            "attention_mask": encodings["attention_mask"].to(self.model.device),
            "labels": label_encodings["input_ids"].to(self.model.device)
        }

    def train_step(
        self,
        batch: Dict[str, torch.Tensor]
    ) -> float:
        """
        Perform one training step.
        
        Args:
            batch: Dictionary containing training data
            
        Returns:
            Loss value for the step
        """
        self.optimizer.zero_grad()
        
        outputs = self.model.model(
            input_ids=batch["input_ids"],
            attention_mask=batch["attention_mask"],
            labels=batch["labels"]
        )
        
        loss = outputs.loss
        loss.backward()
        
        # Gradient clipping
        torch.nn.utils.clip_grad_norm_(self.model.model.parameters(), 1.0)
        
        self.optimizer.step()
        self.scheduler.step()
        
        return loss.item()

    def fine_tune(
        self,
        train_texts: List[str],
        train_labels: List[str],
        num_epochs: int = 3,
        batch_size: int = 4,
        validation_data: Optional[Dict[str, List[str]]] = None
    ) -> Dict[str, List[float]]:
        """
        Fine-tune the model on energy domain data.
        
        Args:
            train_texts: Training input texts
            train_labels: Training target texts
            num_epochs: Number of training epochs
            batch_size: Batch size for training
            validation_data: Optional validation dataset
            
        Returns:
            Dictionary containing training and validation losses
        """
        logger.info("Starting fine-tuning process")
        training_stats = {
            "train_losses": [],
            "val_losses": [] if validation_data else None
        }
        
        for epoch in range(num_epochs):
            # Training
            self.model.model.train()
            total_train_loss = 0
            num_batches = 0
            
            for i in range(0, len(train_texts), batch_size):
                batch_texts = train_texts[i:i + batch_size]
                batch_labels = train_labels[i:i + batch_size]
                
                batch = self.prepare_training_data(batch_texts, batch_labels)
                loss = self.train_step(batch)
                
                total_train_loss += loss
                num_batches += 1
            
            avg_train_loss = total_train_loss / num_batches
            training_stats["train_losses"].append(avg_train_loss)
            
            # Validation
            if validation_data:
                self.model.model.eval()
                total_val_loss = 0
                num_val_batches = 0
                
                with torch.no_grad():
                    for i in range(0, len(validation_data["texts"]), batch_size):
                        batch_texts = validation_data["texts"][i:i + batch_size]
                        batch_labels = validation_data["labels"][i:i + batch_size]
                        
                        batch = self.prepare_training_data(batch_texts, batch_labels)
                        outputs = self.model.model(**batch)
                        
                        total_val_loss += outputs.loss.item()
                        num_val_batches += 1
                
                avg_val_loss = total_val_loss / num_val_batches
                training_stats["val_losses"].append(avg_val_loss)
            
            logger.info(f"Epoch {epoch+1}/{num_epochs} - "
                       f"Train Loss: {avg_train_loss:.4f}" +
                       (f" - Val Loss: {avg_val_loss:.4f}" if validation_data else ""))
        
        return training_stats

class CustomLossFunction(nn.Module):
    """
    Custom loss function for energy domain adaptation.
    Combines cross-entropy with domain-specific regularization.
    """
    def __init__(self, alpha: float = 0.1):
        super().__init__()
        self.alpha = alpha
        self.base_loss = nn.CrossEntropyLoss()
    
    def forward(
        self,
        predictions: torch.Tensor,
        targets: torch.Tensor,
        domain_labels: Optional[torch.Tensor] = None
    ) -> torch.Tensor:
        """
        Compute the custom loss.
        
        Args:
            predictions: Model predictions
            targets: Ground truth labels
            domain_labels: Optional domain-specific labels
            
        Returns:
            Combined loss value
        """
        base_loss = self.base_loss(predictions, targets)
        
        if domain_labels is not None:
            # Add domain adaptation regularization
            domain_loss = self.base_loss(predictions, domain_labels)
            return base_loss + self.alpha * domain_loss
        
        return base_loss 