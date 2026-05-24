from abc import ABC, abstractmethod
from app.config import settings
from app.utils.logger import logger

class BaseEmbedder(ABC):
    @abstractmethod
    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        """Generates embeddings for a list of document chunks."""
        pass
        
    @abstractmethod
    def embed_query(self, text: str) -> list[float]:
        """Generates embedding for a single query text."""
        pass

    @property
    @abstractmethod
    def dimension(self) -> int:
        """Returns the embedding vector dimension."""
        pass


class SentenceTransformerEmbedder(BaseEmbedder):
    def __init__(self, model_name: str = None):
        self.model_name = model_name or settings.EMBEDDING_MODEL
        self._model = None

    @property
    def model(self):
        if self._model is None:
            logger.info(f"Loading SentenceTransformer model: {self.model_name}")
            from sentence_transformers import SentenceTransformer
            self._model = SentenceTransformer(self.model_name)
        return self._model

    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        if not texts:
            return []
        embeddings = self.model.encode(texts, batch_size=32, show_progress_bar=False)
        return [e.tolist() for e in embeddings]

    def embed_query(self, text: str) -> list[float]:
        embedding = self.model.encode(text, show_progress_bar=False)
        return embedding.tolist()

    @property
    def dimension(self) -> int:
        # all-MiniLM-L6-v2 is 384 dimensions
        if "mini" in self.model_name.lower():
            return 384
        return 384


class OpenAIEmbedder(BaseEmbedder):
    def __init__(self, model_name: str = "text-embedding-ada-002"):
        self.model_name = model_name
        self.api_key = settings.OPENAI_API_KEY
        self._client = None

    @property
    def client(self):
        if self._client is None:
            logger.info("Initializing OpenAI client for embeddings")
            from openai import OpenAI
            self._client = OpenAI(api_key=self.api_key)
        return self._client

    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        if not texts:
            return []
        response = self.client.embeddings.create(
            input=texts,
            model=self.model_name
        )
        return [data.embedding for data in response.data]

    def embed_query(self, text: str) -> list[float]:
        response = self.client.embeddings.create(
            input=[text],
            model=self.model_name
        )
        return response.data[0].embedding

    @property
    def dimension(self) -> int:
        if "3-small" in self.model_name:
            return 1536
        return 1536


def get_embedder() -> BaseEmbedder:
    provider = settings.EMBEDDING_PROVIDER.lower()
    if provider == "openai":
        return OpenAIEmbedder()
    return SentenceTransformerEmbedder()
