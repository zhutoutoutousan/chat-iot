from pathlib import Path
from typing import List, Dict, Any
from loguru import logger
import fnmatch
from config import COLLECTION_CONFIGS, DATA_DIR, LOG_CONFIG
from xml_processor import XMLProcessor
from milvus_client import MilvusClient
from sentence_transformers import SentenceTransformer
import sys

def find_xml_files(data_dir: Path) -> List[Path]:
    """Findet alle XML-Dateien im Verzeichnis."""
    return list(data_dir.rglob("*.xml"))

def cleanup_collections(milvus_client: MilvusClient) -> None:
    """Löscht alle existierenden Collections für einen Neustart."""
    logger.info("Starte Bereinigung der Collections...")
    for collection_name in COLLECTION_CONFIGS.keys():
        try:
            milvus_client.delete_collection(collection_name)
            logger.info(f"Collection {collection_name} gelöscht")
        except Exception as e:
            logger.warning(f"Fehler beim Löschen der Collection {collection_name}: {str(e)}")

def process_collection(collection_name: str, config: Dict[str, Any], milvus_client: MilvusClient, embedding_model) -> None:
    """Verarbeitet eine einzelne Collection."""
    logger.info(f"Starte Verarbeitung für Collection: {collection_name}")
    
    # Initialisiere XML Processor mit Embedding Model
    xml_processor = XMLProcessor(embedding_model)
    
    # Finde alle XML-Dateien
    xml_files = find_xml_files(DATA_DIR)
    if not xml_files:
        logger.warning(f"Keine XML-Dateien gefunden")
        return
    
    logger.info(f"Gefundene XML-Dateien: {len(xml_files)}")
    
    # Verarbeite alle Dateien
    for xml_file in xml_files:
        try:
            # Prüfe ob die Datei dem Pattern entspricht
            if not any(fnmatch.fnmatch(xml_file.name, pattern) for pattern in config['file_patterns']):
                continue
                
            logger.info(f"Verarbeite {xml_file.name}...")
            processed_data = xml_processor.process_xml(xml_file)
            if processed_data:
                logger.info(f"Verarbeitete {len(processed_data)} Datensätze aus {xml_file.name}")
                # Speichere in Milvus
                milvus_client.insert_data(collection_name, processed_data)
                logger.success(f"Daten aus {xml_file.name} in {collection_name} gespeichert")
        except Exception as e:
            logger.error(f"Fehler bei der Verarbeitung von {xml_file.name}: {str(e)}")
            continue

def main():
    """Hauptfunktion der ETL-Pipeline."""
    logger.info("Starte ETL-Pipeline")
    
    # Initialisiere Embedding Model
    logger.info("Lade Embedding Model...")
    embedding_model = SentenceTransformer('all-mpnet-base-v2')
    
    # Initialisiere Milvus Client
    milvus_client = MilvusClient()
    
    # Bereinige existierende Collections
    cleanup_collections(milvus_client)
    
    # Verarbeite jede Collection
    for collection_name, config in COLLECTION_CONFIGS.items():
        try:
            process_collection(collection_name, config, milvus_client, embedding_model)
        except Exception as e:
            logger.error(f"Fehler bei der Verarbeitung von Collection {collection_name}: {str(e)}")
    
    logger.info("ETL-Pipeline abgeschlossen")

if __name__ == "__main__":
    # Entferne alle bestehenden Handler
    logger.remove()
    
    # Füge die konfigurierten Handler hinzu
    for handler in LOG_CONFIG["handlers"]:
        if handler["sink"] == "sys.stdout":
            handler["sink"] = sys.stdout
        logger.add(**handler)
    
    try:
        main()
    except Exception as e:
        logger.error(f"Kritischer Fehler in der ETL-Pipeline: {str(e)}")
        sys.exit(1) 