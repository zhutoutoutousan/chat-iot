from pymilvus import (
    connections,
    utility,
    FieldSchema,
    CollectionSchema,
    DataType,
    Collection,
    IndexType,
    MetricType
)

class MilvusClient:
    def __init__(self, host='localhost', port='19530'):
        self.host = host
        self.port = port
        self.collection = None
        self._connect()
        self._init_collection()
    
    def _connect(self):
        """Establish connection to Milvus server"""
        connections.connect(host=self.host, port=self.port)
    
    def _init_collection(self, collection_name="energy_vectors"):
        """Initialize collection with schema"""
        if utility.exists_collection(collection_name):
            self.collection = Collection(collection_name)
            return

        fields = [
            FieldSchema(name="id", dtype=DataType.INT64, is_primary=True, auto_id=True),
            FieldSchema(name="text", dtype=DataType.VARCHAR, max_length=65535),
            FieldSchema(name="embedding", dtype=DataType.FLOAT_VECTOR, dim=1024),
            FieldSchema(name="metadata", dtype=DataType.JSON)
        ]
        
        schema = CollectionSchema(fields=fields, description="Energy domain text embeddings")
        self.collection = Collection(name=collection_name, schema=schema)
        
        # Create IVF_FLAT index
        index_params = {
            "metric_type": MetricType.L2,
            "index_type": IndexType.IVF_FLAT,
            "params": {"nlist": 1024}
        }
        self.collection.create_index(field_name="embedding", index_params=index_params)
    
    def insert(self, texts, embeddings, metadata_list=None):
        """Insert documents and their embeddings"""
        if metadata_list is None:
            metadata_list = [{}] * len(texts)
            
        entities = [
            texts,
            embeddings.tolist(),
            metadata_list
        ]
        
        self.collection.insert(entities)
        self.collection.flush()
    
    def search(self, query_embedding, top_k=5, nprobe=16):
        """Search for similar vectors"""
        search_params = {
            "metric_type": MetricType.L2,
            "params": {"nprobe": nprobe}
        }
        
        self.collection.load()
        results = self.collection.search(
            data=[query_embedding.tolist()],
            anns_field="embedding",
            param=search_params,
            limit=top_k,
            output_fields=["text", "metadata"]
        )
        
        return results
    
    def delete(self, ids):
        """Delete vectors by ID"""
        expr = f"id in {ids}"
        self.collection.delete(expr)
        
    def close(self):
        """Close connection"""
        connections.disconnect(self.host) 