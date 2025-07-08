import unittest
from src.data.preprocessing import DocumentProcessor

class TestPreprocessing(unittest.TestCase):
    def setUp(self):
        self.processor = DocumentProcessor()
        self.test_text = "This is a test document. It contains multiple sentences. Some in English, andere auf Deutsch."
        
    def test_chunk_document(self):
        """Test document chunking"""
        chunk_size = 5
        overlap = 2
        chunks = self.processor.chunk_document(self.test_text, chunk_size, overlap)
        
        # Check if chunks are created
        self.assertGreater(len(chunks), 0)
        
        # Check overlap
        if len(chunks) > 1:
            words1 = set(chunks[0].split())
            words2 = set(chunks[1].split())
            overlap_words = len(words1.intersection(words2))
            self.assertGreaterEqual(overlap_words, overlap)
            
    def test_language_detection(self):
        """Test language detection"""
        # Test English
        eng_text = "This is an English text."
        lang = self.processor.detect_language(eng_text)
        self.assertEqual(lang, 'en')
        
        # Test German
        de_text = "Dies ist ein deutscher Text."
        lang = self.processor.detect_language(de_text)
        self.assertEqual(lang, 'de')
        
    def test_mastr_data_processing(self):
        """Test MaStR data processing"""
        test_data = {
            'id': '123',
            'name': 'Test Plant',
            'description': 'A test energy plant'
        }
        
        processed = self.processor.process_mastr_data(test_data)
        
        # Check required fields
        self.assertIn('id', processed)
        self.assertIn('name', processed)
        self.assertIn('description', processed)
        self.assertIn('combined_text', processed)
        self.assertIn('language', processed)
        self.assertIn('chunks', processed)
        self.assertIn('metadata', processed)
        
    def test_text_cleaning(self):
        """Test text cleaning"""
        dirty_text = "This is a  messy    text with@#$special chars!!!"
        cleaned = self.processor.clean_text(dirty_text)
        
        # Check cleaning
        self.assertNotIn('@', cleaned)
        self.assertNotIn('#', cleaned)
        self.assertNotIn('$', cleaned)
        self.assertNotIn('!!!', cleaned)
        
        # Check whitespace normalization
        self.assertNotIn('  ', cleaned)
        
    def test_document_processing(self):
        """Test general document processing"""
        metadata = {'source': 'test'}
        result = self.processor.process_document(self.test_text, metadata)
        
        # Check required fields
        self.assertIn('original_text', result)
        self.assertIn('cleaned_text', result)
        self.assertIn('language', result)
        self.assertIn('chunks', result)
        self.assertIn('metadata', result)
        
        # Check metadata preservation
        self.assertEqual(result['metadata']['source'], 'test')
        
if __name__ == '__main__':
    unittest.main() 