import numpy as np
from sklearn.metrics import precision_recall_fscore_support
from typing import Dict, List, Tuple
import torch
from torch.nn.functional import cosine_similarity

def calculate_similarity_matrix(embeddings1: torch.Tensor, embeddings2: torch.Tensor) -> torch.Tensor:
    """Calculate cosine similarity matrix between two sets of embeddings"""
    return cosine_similarity(embeddings1.unsqueeze(1), embeddings2.unsqueeze(0))

def calculate_retrieval_metrics(similarity_matrix: torch.Tensor, 
                              true_labels: torch.Tensor,
                              k_values: List[int]) -> Dict[str, float]:
    """Calculate retrieval metrics for different k values"""
    metrics = {}
    
    for k in k_values:
        # Get top-k indices
        _, top_k_indices = torch.topk(similarity_matrix, k, dim=1)
        
        # Calculate precision@k
        precision_at_k = []
        for i, indices in enumerate(top_k_indices):
            relevant = sum(1 for idx in indices if true_labels[idx] == true_labels[i])
            precision_at_k.append(relevant / k)
        
        metrics[f'precision@{k}'] = np.mean(precision_at_k)
        
    return metrics

def calculate_embedding_quality(embeddings: torch.Tensor) -> Dict[str, float]:
    """Calculate quality metrics for embeddings"""
    # Calculate statistics
    mean_norm = torch.norm(embeddings, dim=1).mean().item()
    std_norm = torch.norm(embeddings, dim=1).std().item()
    
    # Calculate cosine similarities between all pairs
    sim_matrix = calculate_similarity_matrix(embeddings, embeddings)
    
    # Calculate average similarity (excluding self-similarity)
    mask = torch.ones_like(sim_matrix) - torch.eye(sim_matrix.size(0))
    avg_similarity = (sim_matrix * mask).sum() / (mask.sum())
    
    return {
        'mean_norm': mean_norm,
        'std_norm': std_norm,
        'avg_similarity': avg_similarity.item()
    }

def calculate_language_metrics(predictions: List[str], 
                             ground_truth: List[str]) -> Dict[str, float]:
    """Calculate metrics for language detection"""
    precision, recall, f1, _ = precision_recall_fscore_support(
        ground_truth, predictions, average='weighted'
    )
    
    return {
        'precision': precision,
        'recall': recall,
        'f1': f1
    }

def calculate_chunk_metrics(chunks: List[str], 
                          original_text: str) -> Dict[str, float]:
    """Calculate metrics for document chunking"""
    # Calculate coverage
    total_words = len(original_text.split())
    words_in_chunks = sum(len(chunk.split()) for chunk in chunks)
    coverage = words_in_chunks / total_words
    
    # Calculate overlap
    overlap_words = 0
    for i in range(len(chunks)-1):
        words1 = set(chunks[i].split())
        words2 = set(chunks[i+1].split())
        overlap_words += len(words1.intersection(words2))
    
    avg_overlap = overlap_words / (len(chunks)-1) if len(chunks) > 1 else 0
    
    return {
        'coverage': coverage,
        'avg_overlap': avg_overlap,
        'num_chunks': len(chunks)
    }

def calculate_vector_db_metrics(query_times: List[float],
                              results: List[List[Tuple[int, float]]]) -> Dict[str, float]:
    """Calculate performance metrics for vector database queries"""
    # Query performance
    avg_query_time = np.mean(query_times)
    std_query_time = np.std(query_times)
    
    # Result statistics
    avg_similarity = np.mean([
        [sim for _, sim in batch_results]
        for batch_results in results
    ])
    
    return {
        'avg_query_time': avg_query_time,
        'std_query_time': std_query_time,
        'avg_similarity': avg_similarity
    }

def calculate_metrics(embeddings: torch.Tensor,
                     query_results: List[List[Tuple[int, float]]],
                     query_times: List[float],
                     chunks: List[str],
                     original_text: str,
                     predictions: List[str] = None,
                     ground_truth: List[str] = None,
                     k_values: List[int] = [1, 5, 10]) -> Dict[str, Dict[str, float]]:
    """Calculate all metrics"""
    metrics = {
        'embedding': calculate_embedding_quality(embeddings),
        'retrieval': calculate_retrieval_metrics(
            calculate_similarity_matrix(embeddings, embeddings),
            torch.arange(embeddings.size(0)),
            k_values
        ),
        'chunking': calculate_chunk_metrics(chunks, original_text),
        'vector_db': calculate_vector_db_metrics(query_times, query_results)
    }
    
    if predictions is not None and ground_truth is not None:
        metrics['language'] = calculate_language_metrics(predictions, ground_truth)
    
    return metrics 