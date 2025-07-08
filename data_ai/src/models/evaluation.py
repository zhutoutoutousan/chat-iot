"""
Model Evaluation Metrics Module

This module provides comprehensive evaluation metrics for both embedding models
and LLM performance in the energy infrastructure domain.
"""

import torch
import numpy as np
from typing import List, Dict, Union, Optional
from sklearn.metrics import precision_recall_fscore_support
from sklearn.metrics.pairwise import cosine_similarity
import time
import logging
from .llm import EnergyDomainLLM

logger = logging.getLogger(__name__)

class EmbeddingEvaluator:
    """Evaluator for embedding model performance"""
    
    def __init__(self):
        self.metrics_history = []
    
    def calculate_embedding_quality(
        self,
        embeddings: torch.Tensor,
        reference_embeddings: torch.Tensor
    ) -> Dict[str, float]:
        """
        Calculate quality metrics for embeddings.
        
        Args:
            embeddings: Generated embeddings
            reference_embeddings: Ground truth embeddings
            
        Returns:
            Dictionary of quality metrics
        """
        # Convert to numpy for calculations
        emb_np = embeddings.detach().cpu().numpy()
        ref_np = reference_embeddings.detach().cpu().numpy()
        
        # Calculate cosine similarity
        similarities = cosine_similarity(emb_np, ref_np)
        
        # Calculate metrics
        metrics = {
            "mean_similarity": float(np.mean(similarities)),
            "std_similarity": float(np.std(similarities)),
            "min_similarity": float(np.min(similarities)),
            "max_similarity": float(np.max(similarities))
        }
        
        return metrics
    
    def evaluate_clustering_quality(
        self,
        embeddings: torch.Tensor,
        labels: torch.Tensor
    ) -> Dict[str, float]:
        """
        Evaluate clustering quality of embeddings.
        
        Args:
            embeddings: Generated embeddings
            labels: Ground truth cluster labels
            
        Returns:
            Dictionary of clustering metrics
        """
        from sklearn.metrics import silhouette_score, calinski_harabasz_score
        
        emb_np = embeddings.detach().cpu().numpy()
        labels_np = labels.detach().cpu().numpy()
        
        metrics = {
            "silhouette_score": float(silhouette_score(emb_np, labels_np)),
            "calinski_harabasz_score": float(calinski_harabasz_score(emb_np, labels_np))
        }
        
        return metrics
    
    def evaluate_retrieval_performance(
        self,
        query_embeddings: torch.Tensor,
        document_embeddings: torch.Tensor,
        relevant_doc_indices: List[List[int]],
        k: int = 10
    ) -> Dict[str, float]:
        """
        Evaluate retrieval performance using embeddings.
        
        Args:
            query_embeddings: Query embeddings
            document_embeddings: Document embeddings
            relevant_doc_indices: Ground truth relevant document indices
            k: Number of top results to consider
            
        Returns:
            Dictionary of retrieval metrics
        """
        # Calculate similarities
        similarities = cosine_similarity(
            query_embeddings.detach().cpu().numpy(),
            document_embeddings.detach().cpu().numpy()
        )
        
        # Calculate metrics
        precision_at_k = []
        recall_at_k = []
        mrr = []  # Mean Reciprocal Rank
        
        for i, (sim_scores, relevant_docs) in enumerate(zip(similarities, relevant_doc_indices)):
            # Get top k predictions
            top_k_indices = np.argsort(sim_scores)[-k:][::-1]
            
            # Calculate precision and recall
            relevant_retrieved = len(set(top_k_indices) & set(relevant_docs))
            precision = relevant_retrieved / k
            recall = relevant_retrieved / len(relevant_docs)
            
            precision_at_k.append(precision)
            recall_at_k.append(recall)
            
            # Calculate MRR
            for rank, doc_id in enumerate(top_k_indices, 1):
                if doc_id in relevant_docs:
                    mrr.append(1.0 / rank)
                    break
            else:
                mrr.append(0.0)
        
        metrics = {
            "precision@k": float(np.mean(precision_at_k)),
            "recall@k": float(np.mean(recall_at_k)),
            "mrr": float(np.mean(mrr))
        }
        
        return metrics

class LLMEvaluator:
    """Evaluator for LLM performance"""
    
    def __init__(
        self,
        model: EnergyDomainLLM,
        reference_model: Optional[EnergyDomainLLM] = None
    ):
        """
        Initialize LLM evaluator.
        
        Args:
            model: Model to evaluate
            reference_model: Optional reference model for comparison
        """
        self.model = model
        self.reference_model = reference_model
        self.metrics_history = []
    
    def evaluate_response_quality(
        self,
        prompts: List[str],
        ground_truth: List[str]
    ) -> Dict[str, float]:
        """
        Evaluate quality of LLM responses.
        
        Args:
            prompts: Input prompts
            ground_truth: Ground truth responses
            
        Returns:
            Dictionary of quality metrics
        """
        from rouge import Rouge
        from nltk.translate.bleu_score import sentence_bleu
        
        rouge = Rouge()
        metrics = {
            "rouge_scores": [],
            "bleu_scores": [],
            "response_times": []
        }
        
        for prompt, truth in zip(prompts, ground_truth):
            # Measure response time
            start_time = time.time()
            response = self.model.generate_response(prompt)
            response_time = time.time() - start_time
            
            # Calculate ROUGE scores
            rouge_scores = rouge.get_scores(response, truth)[0]
            
            # Calculate BLEU score
            bleu_score = sentence_bleu(
                [truth.split()],
                response.split()
            )
            
            metrics["rouge_scores"].append(rouge_scores)
            metrics["bleu_scores"].append(bleu_score)
            metrics["response_times"].append(response_time)
        
        # Aggregate metrics
        aggregated_metrics = {
            "avg_rouge_1": float(np.mean([s["rouge-1"]["f"] for s in metrics["rouge_scores"]])),
            "avg_rouge_2": float(np.mean([s["rouge-2"]["f"] for s in metrics["rouge_scores"]])),
            "avg_rouge_l": float(np.mean([s["rouge-l"]["f"] for s in metrics["rouge_scores"]])),
            "avg_bleu": float(np.mean(metrics["bleu_scores"])),
            "avg_response_time": float(np.mean(metrics["response_times"]))
        }
        
        return aggregated_metrics
    
    def evaluate_domain_accuracy(
        self,
        domain_questions: List[str],
        domain_answers: List[str]
    ) -> Dict[str, float]:
        """
        Evaluate accuracy on domain-specific questions.
        
        Args:
            domain_questions: Domain-specific test questions
            domain_answers: Ground truth answers
            
        Returns:
            Dictionary of domain-specific metrics
        """
        metrics = {
            "correct_answers": 0,
            "partial_matches": 0,
            "domain_term_usage": 0
        }
        
        # Load domain-specific terminology
        domain_terms = self._load_domain_terms()
        
        for question, truth in zip(domain_questions, domain_answers):
            response = self.model.generate_response(question)
            
            # Check for exact matches
            if self._normalize_text(response) == self._normalize_text(truth):
                metrics["correct_answers"] += 1
            
            # Check for partial matches
            elif self._calculate_overlap(response, truth) > 0.5:
                metrics["partial_matches"] += 1
            
            # Check domain terminology usage
            metrics["domain_term_usage"] += self._count_domain_terms(response, domain_terms)
        
        total_questions = len(domain_questions)
        return {
            "accuracy": metrics["correct_answers"] / total_questions,
            "partial_match_rate": metrics["partial_matches"] / total_questions,
            "domain_term_density": metrics["domain_term_usage"] / total_questions
        }
    
    def evaluate_cross_lingual_performance(
        self,
        german_prompts: List[str],
        english_ground_truth: List[str]
    ) -> Dict[str, float]:
        """
        Evaluate cross-lingual performance (German-English).
        
        Args:
            german_prompts: Input prompts in German
            english_ground_truth: Ground truth responses in English
            
        Returns:
            Dictionary of cross-lingual metrics
        """
        from sacrebleu.metrics import BLEU
        bleu = BLEU()
        
        translations = []
        for prompt in german_prompts:
            response = self.model.generate_response(prompt)
            translations.append(response)
        
        bleu_score = bleu.corpus_score(translations, [english_ground_truth])
        
        return {
            "bleu_score": float(bleu_score.score),
            "translation_accuracy": float(self._calculate_translation_accuracy(
                translations, english_ground_truth))
        }
    
    def _normalize_text(self, text: str) -> str:
        """Normalize text for comparison."""
        return text.lower().strip()
    
    def _calculate_overlap(self, text1: str, text2: str) -> float:
        """Calculate text overlap ratio."""
        words1 = set(self._normalize_text(text1).split())
        words2 = set(self._normalize_text(text2).split())
        return len(words1 & words2) / len(words1 | words2)
    
    def _load_domain_terms(self) -> List[str]:
        """Load energy domain terminology."""
        # This would typically load from a curated list
        return [
            "renewable energy",
            "grid infrastructure",
            "power generation",
            "energy efficiency",
            "transmission",
            "distribution",
            "smart grid",
            "energy storage",
            "biomass",
            "sustainability"
        ]
    
    def _count_domain_terms(self, text: str, domain_terms: List[str]) -> int:
        """Count domain-specific terms in text."""
        text = self._normalize_text(text)
        return sum(1 for term in domain_terms if term in text)
    
    def _calculate_translation_accuracy(
        self,
        translations: List[str],
        ground_truth: List[str]
    ) -> float:
        """Calculate accuracy of translations."""
        correct = 0
        for trans, truth in zip(translations, ground_truth):
            # Simple overlap-based accuracy
            if self._calculate_overlap(trans, truth) > 0.7:
                correct += 1
        return correct / len(translations)

def calculate_performance_metrics(
    predictions: torch.Tensor,
    targets: torch.Tensor
) -> Dict[str, float]:
    """
    Calculate standard performance metrics.
    
    Args:
        predictions: Model predictions
        targets: Ground truth labels
        
    Returns:
        Dictionary of performance metrics
    """
    # Convert to numpy
    if torch.is_tensor(predictions):
        predictions = predictions.detach().cpu().numpy()
    if torch.is_tensor(targets):
        targets = targets.detach().cpu().numpy()
    
    # Calculate metrics
    precision, recall, f1, _ = precision_recall_fscore_support(
        targets,
        predictions,
        average='weighted'
    )
    
    return {
        "precision": float(precision),
        "recall": float(recall),
        "f1_score": float(f1)
    } 