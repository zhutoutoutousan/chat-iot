
from pathlib import Path
from typing import Dict, Any
import os
from dotenv import load_dotenv

# Lade Umgebungsvariablen
load_dotenv()

# Basis-Verzeichnisse
BASE_DIR = Path(__file__).parent.parent
DATA_SCHEMA_DIR = BASE_DIR / "data_schema"
DATA_DIR = BASE_DIR / "data"
LOG_DIR = BASE_DIR / "logs"

# Erstelle Log-Verzeichnis falls nicht vorhanden
LOG_DIR.mkdir(parents=True, exist_ok=True)

# Milvus Konfiguration
MILVUS_CONFIG = {
    "uri": "https://in03-75001f770ba89d7.serverless.gcp-us-west1.cloud.zilliz.com",
    "token": "033728c7d818447558dabf93f90691319cbce22d883932107b27a8761f1f68cea0b634a8ab723704addfed59ca776e2fe3518899",
    "db_name": "db_75001f770ba89d7",
    "timeout": 30  # Timeout in Sekunden
}

# Optimierte Logging-Konfiguration
LOG_CONFIG = {
    "handlers": [
        {
            "sink": "sys.stdout",
            "format": "<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan> - <level>{message}</level>",
            "level": "INFO",
            "colorize": True
        },
        {
            "sink": str(LOG_DIR / "etl_{time:YYYY-MM-DD}.log"),
            "format": "{time:YYYY-MM-DD HH:mm:ss} | {level: <8} | {name}:{function} | {message}",
            "level": "INFO",
            "rotation": "1 day",        # Neue Datei jeden Tag
            "retention": "3 days",      # Behalte nur Logs der letzten 3 Tage
            "compression": "zip",       # Komprimiere alte Logs
            "backtrace": False,         # Keine Stack Traces für bessere Lesbarkeit
            "diagnose": False,          # Keine diagnostischen Informationen
            "enqueue": True,            # Thread-sicher
            "serialize": False,         # Keine JSON-Serialisierung
            "encoding": "utf-8"
        }
    ]
}

# Vector-Dimensionen
VECTOR_DIM = 768

# Collection Konfigurationen
COLLECTION_CONFIGS: Dict[str, Dict[str, Any]] = {
    "biomasse_anlagen": {
        "schema_file": "AnlagenEegBiomasse.xsd",
        "vector_field": "vector",
        "dim": VECTOR_DIM,
        "data_dir": "biomasse",  # Unterverzeichnis für Biomasse-Daten
        "file_patterns": ["*Biomasse*.xml", "*Biogas*.xml", "*Biomethan*.xml"]
    },
    "solar_anlagen": {
        "schema_file": "AnlagenEegSolar.xsd",
        "vector_field": "vector",
        "dim": VECTOR_DIM,
        "data_dir": "solar",  # Unterverzeichnis für Solar-Daten
        "file_patterns": ["*Solar*.xml", "*Photovoltaik*.xml", "*PV*.xml"]
    },
    "wind_anlagen": {
        "schema_file": "AnlagenEegWind.xsd",
        "vector_field": "vector",
        "dim": VECTOR_DIM,
        "data_dir": "wind",  # Unterverzeichnis für Wind-Daten
        "file_patterns": ["*Wind*.xml", "*Onshore*.xml", "*Offshore*.xml"]
    },
    "wasser_anlagen": {
        "schema_file": "AnlagenEegWasser.xsd",
        "vector_field": "vector",
        "dim": VECTOR_DIM,
        "data_dir": "wasser",  # Unterverzeichnis für Wasser-Daten
        "file_patterns": ["*Wasser*.xml", "*Wasserkraft*.xml"]
    },
    "geothermie_anlagen": {
        "schema_file": "AnlagenEegGeothermieGrubengasDruckentspannung.xsd",
        "vector_field": "vector",
        "dim": VECTOR_DIM,
        "data_dir": "geothermie",  # Unterverzeichnis für Geothermie-Daten
        "file_patterns": ["*Geothermie*.xml", "*Grubengas*.xml", "*Druckentspannung*.xml"]
    },
    "netzanschlusspunkte": {
        "schema_file": "Netzanschlusspunkte.xsd",
        "vector_field": "vector",
        "dim": VECTOR_DIM,
        "data_dir": "netzanschlusspunkte",
        "file_patterns": ["*Netzanschlusspunkt*.xml", "*Lokation*.xml"]
    },
    "netze": {
        "schema_file": "Netze.xsd",
        "vector_field": "vector",
        "dim": VECTOR_DIM,
        "data_dir": "netze",
        "file_patterns": ["*Netz*.xml", "*Netze*.xml"]
    }
} 