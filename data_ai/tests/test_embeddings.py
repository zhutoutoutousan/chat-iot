import unittest
import torch
import numpy as np
from src.models.embeddings import EnergyDomainEmbedding, DomainAdaptationLayer

class TestEmbeddings(unittest.TestCase):
    def setUp(self):
        self.model = EnergyDomainEmbedding()
        self.adapter = DomainAdaptationLayer(1024)
        self.test_input = "This is a test input for energy infrastructure."
        
    def test_embedding_dimensions(self):
        """Test if embeddings have correct dimensions"""
        with torch.no_grad():
            embedding = self.model(self.test_input)
        
        self.assertEqual(embedding.shape[-1], 1024)
        
    def test_batch_processing(self):
        """Test batch processing of texts"""
        test_batch = [self.test_input] * 3
        
        with torch.no_grad():
            embeddings = self.model.encode_batch(test_batch)
        
        self.assertEqual(embeddings.shape[0], 3)
        self.assertEqual(embeddings.shape[1], 1024)
        
    def test_domain_adaptation(self):
        """Test domain adaptation layer"""
        test_input = torch.randn(1, 1024)
        output = self.adapter(test_input)
        
        # Check shape preservation
        self.assertEqual(output.shape, test_input.shape)
        
        # Check residual connection
        diff = (output - test_input).abs().mean().item()
        self.assertGreater(diff, 0)  # Output should be different from input
        
    def test_model_training_mode(self):
        """Test model training/eval mode behavior"""
        # Test training mode
        self.model.train()
        self.assertTrue(self.model.training)
        
        # Test eval mode
        self.model.eval()
        self.assertFalse(self.model.training)
        
    def test_embedding_normalization(self):
        """Test if embeddings are properly normalized"""
        with torch.no_grad():
            embedding = self.model(self.test_input)
            norm = torch.norm(embedding).item()
        
        self.assertAlmostEqual(norm, 1.0, places=2)
        
if __name__ == '__main__':
    unittest.main() 