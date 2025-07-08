import unittest
import torch
import numpy as np
from src.vector_db.milvus_client import MilvusClient

class TestVectorDB(unittest.TestCase):
    def setUp(self):
        self.client = MilvusClient()
        self.test_texts = [
            "Test document 1",
            "Test document 2",
            "Test document 3"
        ]
        self.test_embeddings = torch.randn(3, 1024)
        self.test_metadata = [
            {'source': 'test1'},
            {'source': 'test2'},
            {'source': 'test3'}
        ]
        
    def test_connection(self):
        """Test database connection"""
        # Connection should be established in setUp
        self.assertIsNotNone(self.client.collection)
        
    def test_insert(self):
        """Test vector insertion"""
        # Insert test data
        self.client.insert(
            texts=self.test_texts,
            embeddings=self.test_embeddings,
            metadata_list=self.test_metadata
        )
        
        # Verify insertion
        self.assertGreater(self.client.collection.num_entities, 0)
        
    def test_search(self):
        """Test vector search"""
        # Insert test data first
        self.client.insert(
            texts=self.test_texts,
            embeddings=self.test_embeddings,
            metadata_list=self.test_metadata
        )
        
        # Search with first embedding
        query_embedding = self.test_embeddings[0]
        results = self.client.search(query_embedding, top_k=2)
        
        # Check results
        self.assertEqual(len(results), 1)  # One query
        self.assertEqual(len(results[0]), 2)  # top_k=2
        
    def test_delete(self):
        """Test vector deletion"""
        # Insert test data
        self.client.insert(
            texts=self.test_texts,
            embeddings=self.test_embeddings,
            metadata_list=self.test_metadata
        )
        
        # Get initial count
        initial_count = self.client.collection.num_entities
        
        # Delete one entry
        self.client.delete([1])
        
        # Verify deletion
        final_count = self.client.collection.num_entities
        self.assertEqual(final_count, initial_count - 1)
        
    def test_search_params(self):
        """Test search parameter configurations"""
        # Insert test data
        self.client.insert(
            texts=self.test_texts,
            embeddings=self.test_embeddings,
            metadata_list=self.test_metadata
        )
        
        query_embedding = self.test_embeddings[0]
        
        # Test different nprobe values
        results1 = self.client.search(query_embedding, top_k=2, nprobe=8)
        results2 = self.client.search(query_embedding, top_k=2, nprobe=16)
        
        # Results might be different with different nprobe values
        self.assertIsNotNone(results1)
        self.assertIsNotNone(results2)
        
    def tearDown(self):
        """Clean up after tests"""
        self.client.close()
        
if __name__ == '__main__':
    unittest.main() 