import os
import uuid
from app.config import settings
from app.utils.logger import logger

class QdrantStore:
    def __init__(self):
        self.url = settings.QDRANT_URL
        self._client = None
        self.collection_name = "documents"

    @property
    def client(self):
        if self._client is None:
            logger.info(f"Connecting to Qdrant at {self.url}")
            from qdrant_client import QdrantClient
            self._client = QdrantClient(url=self.url)
        return self._client

    def recreate_collection(self, dimension: int):
        """Creates the Qdrant collection if it does not already exist."""
        try:
            from qdrant_client.models import VectorParams, Distance
            collections = self.client.get_collections().collections
            exists = any(c.name == self.collection_name for c in collections)
            
            if not exists:
                logger.info(f"Creating Qdrant collection '{self.collection_name}' with dimension {dimension}")
                self.client.create_collection(
                    collection_name=self.collection_name,
                    vectors_config=VectorParams(size=dimension, distance=Distance.COSINE)
                )
            else:
                logger.info(f"Qdrant collection '{self.collection_name}' already exists")
        except Exception as e:
            logger.error(f"Error checking/creating Qdrant collection: {str(e)}")
            raise

    def upsert_vectors(self, application_id: str, chunks: list[dict], embeddings: list[list[float]], doc_type: str = "CV"):
        """
        Upserts document chunks and their embeddings to Qdrant.
        """
        if not chunks or not embeddings:
            logger.warning("Empty chunks or embeddings for upsert", application_id=application_id)
            return
            
        dimension = len(embeddings[0])
        self.recreate_collection(dimension)
        
        from qdrant_client.models import PointStruct
        points = []
        for idx, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
            point_id = str(uuid.uuid4())
            points.append(PointStruct(
                id=point_id,
                vector=embedding,
                payload={
                    "application_id": application_id,
                    "content": chunk["content"],
                    "metadata": chunk["metadata"],
                    "doc_type": doc_type
                }
            ))
            
        self.client.upsert(
            collection_name=self.collection_name,
            points=points
        )
        logger.info(f"Successfully upserted {len(points)} vectors for application {application_id} ({doc_type}) to Qdrant")

    def search(self, query_text: str, application_id: str, top_k: int = 5) -> list[dict]:
        """
        Performs semantic similarity search on chunks of a specific application.
        """
        try:
            collections = self.client.get_collections().collections
            exists = any(c.name == self.collection_name for c in collections)
            if not exists:
                logger.warning(f"Qdrant collection '{self.collection_name}' does not exist, returning empty results")
                return []
        except Exception as e:
            logger.error(f"Error checking collections: {str(e)}")
            return []

        # Generate query embedding
        from app.pipeline.embedder import get_embedder
        embedder = get_embedder()
        query_vector = embedder.embed_query(query_text)

        # Setup filter by application_id
        from qdrant_client.models import Filter, FieldCondition, MatchValue
        qdrant_filter = Filter(
            must=[
                FieldCondition(
                    key="application_id",
                    match=MatchValue(value=application_id)
                )
            ]
        )
        
        logger.info(f"Searching semantic matches in Qdrant for application {application_id}")
        results = self.client.search(
            collection_name=self.collection_name,
            query_vector=query_vector,
            query_filter=qdrant_filter,
            limit=top_k
        )
        
        ret = []
        for r in results:
            ret.append({
                "content": r.payload.get("content"),
                "score": r.score,
                "metadata": r.payload.get("metadata", {})
            })
        return ret

    def delete_by_application(self, application_id: str):
        """
        Deletes all vector points associated with a specific application_id.
        """
        try:
            collections = self.client.get_collections().collections
            exists = any(c.name == self.collection_name for c in collections)
            if not exists:
                return
        except Exception:
            return

        from qdrant_client.models import Filter, FieldCondition, MatchValue
        self.client.delete(
            collection_name=self.collection_name,
            points_selector=Filter(
                must=[
                    FieldCondition(
                        key="application_id",
                        match=MatchValue(value=application_id)
                    )
                ]
            )
        )
        logger.info(f"Deleted vectors for application {application_id} from Qdrant")
