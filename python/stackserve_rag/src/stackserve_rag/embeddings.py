import json
import math
from pathlib import Path

from stackserve_rag.corpus import CORPUS_DIR, ROOT, IntegrityError, digest, read_bounded
from stackserve_rag.protocol import CORPUS_VERSION, Section

MODEL_DIR = ROOT / "models" / "minilm"
INDEX_PATH = ROOT / "index" / "provider.index"


def model_spec() -> dict:
    return json.loads(read_bounded(CORPUS_DIR / "model.json", 16_384))


def metadata(corpus_hash: str, sections: list[Section]) -> dict:
    return {
        "model": model_spec(),
        "corpus_version": CORPUS_VERSION,
        "corpus_hash": corpus_hash,
        "ids": [section.id for section in sections],
    }


class LocalModel:
    def __init__(self, directory: Path = MODEL_DIR):
        spec = model_spec()
        for name, record in spec["files"].items():
            raw = read_bounded(directory / name, record["bytes"])
            if len(raw) != record["bytes"] or digest(raw) != record["sha256"]:
                raise IntegrityError("model_file_hash_mismatch")
        import numpy as np
        import onnxruntime as ort
        from tokenizers import Tokenizer

        self.np = np
        self.tokenizer = Tokenizer.from_file(str(directory / "tokenizer.json"))
        self.tokenizer.enable_truncation(max_length=spec["max_tokens"])
        self.tokenizer.enable_padding(pad_id=0, pad_token="[PAD]")
        options = ort.SessionOptions()
        options.intra_op_num_threads = 1
        options.inter_op_num_threads = 1
        options.log_severity_level = 3
        self.session = ort.InferenceSession(
            str(directory / "model.onnx"), options, providers=["CPUExecutionProvider"]
        )
        self.dimension = spec["dimension"]

    def encode(self, texts: list[str]) -> list[list[float]]:
        np = self.np
        encoded = self.tokenizer.encode_batch(texts)
        inputs = {
            "input_ids": np.array([row.ids for row in encoded], dtype=np.int64),
            "attention_mask": np.array([row.attention_mask for row in encoded], dtype=np.int64),
            "token_type_ids": np.array([row.type_ids for row in encoded], dtype=np.int64),
        }
        hidden = self.session.run(None, inputs)[0]
        mask = inputs["attention_mask"][..., None]
        pooled = (hidden * mask).sum(axis=1) / mask.sum(axis=1)
        pooled /= np.maximum(np.linalg.norm(pooled, axis=1, keepdims=True), 1e-12)
        result = pooled.tolist()
        validate_vectors(result, len(texts), self.dimension)
        return result


def validate_vectors(vectors, count: int, dimension: int) -> None:
    if not isinstance(vectors, list) or len(vectors) != count:
        raise IntegrityError("index_vector_count_mismatch")
    for vector in vectors:
        if not isinstance(vector, list) or len(vector) != dimension:
            raise IntegrityError("index_dimension_mismatch")
        if any(type(value) not in (int, float) or not math.isfinite(value) for value in vector):
            raise IntegrityError("index_nonfinite_vector")
        if abs(sum(value * value for value in vector) - 1) > 1e-4:
            raise IntegrityError("index_vector_not_normalized")


class VectorSearch:
    def __init__(
        self,
        sections: list[Section],
        corpus_hash: str,
        index_path: Path = INDEX_PATH,
        model_dir: Path = MODEL_DIR,
    ):
        self.expected = metadata(corpus_hash, sections)
        self.index_path = index_path
        self.model_dir = model_dir
        self.model = None
        self.vectors = None
        self.fallback = None

    def prepare(self) -> None:
        if self.vectors is not None or self.fallback is not None:
            return
        try:
            index = json.loads(read_bounded(self.index_path, 2_000_000))
        except FileNotFoundError:
            self.fallback = "vector_index_unavailable"
            return
        if not isinstance(index, dict) or index.get("metadata") != self.expected:
            raise IntegrityError("model_dimension_or_index_version_mismatch")
        vectors = index.get("vectors")
        validate_vectors(vectors, len(self.expected["ids"]), self.expected["model"]["dimension"])
        try:
            self.model = LocalModel(self.model_dir)
        except FileNotFoundError:
            self.fallback = "local_model_unavailable"
            return
        except ImportError:
            self.fallback = "vector_runtime_unavailable"
            return
        self.vectors = dict(zip(self.expected["ids"], vectors, strict=True))

    def rank(self, query: str, sections: list[Section]) -> tuple[list[str] | None, str | None]:
        self.prepare()
        if self.fallback:
            return None, self.fallback
        query_vector = self.model.encode([query])[0]
        scores = {
            section.id: sum(
                a * b for a, b in zip(query_vector, self.vectors[section.id], strict=True)
            )
            for section in sections
        }
        return sorted(scores, key=lambda key: (-scores[key], key)), None


def build_index(sections: list[Section], corpus_hash: str, path: Path = INDEX_PATH) -> None:
    model = LocalModel()
    vectors = []
    for start in range(0, len(sections), 8):
        vectors.extend(
            model.encode(
                [f"{s.parent_context} {s.heading}. {s.text}" for s in sections[start : start + 8]]
            )
        )
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(".tmp")
    temporary.write_text(
        json.dumps({"metadata": metadata(corpus_hash, sections), "vectors": vectors})
    )
    temporary.replace(path)
