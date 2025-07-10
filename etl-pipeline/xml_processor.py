import numpy as np
from typing import Dict, Any, List, Optional
from loguru import logger
import xml.etree.ElementTree as ET
from datetime import datetime
import json

class XMLProcessor:
    def __init__(self, embedding_model):
        self.embedding_model = embedding_model
        # Get dimension from model
        self.vector_dim = self.embedding_model.get_sentence_embedding_dimension()
        logger.info(f"Initialisiere XMLProcessor mit Embedding-Dimension: {self.vector_dim}")

    def generate_embedding(self, text: str) -> List[float]:
        """Generiert einen Embedding-Vektor für den gegebenen Text."""
        try:
            # Stelle sicher, dass wir einen nicht-leeren String haben
            if not text or not isinstance(text, str):
                logger.warning(f"Ungültiger Text für Embedding: {text}")
                # Generiere einen Null-Vektor mit korrekter Dimension
                return [0.0] * self.vector_dim

            # Generiere Embedding
            embedding = self.embedding_model.encode(text)
            
            # Konvertiere zu Liste und normalisiere wenn nötig
            if hasattr(embedding, "tolist"):
                embedding = embedding.tolist()
            
            # Validiere Dimension
            if len(embedding) != self.vector_dim:
                logger.error(f"Kritischer Fehler: Unerwartete Embedding-Dimension: {len(embedding)}, erwarte {self.vector_dim}")
                raise ValueError(f"Embedding-Dimension stimmt nicht überein: {len(embedding)} != {self.vector_dim}")

            return embedding

        except Exception as e:
            logger.error(f"Fehler bei der Embedding-Generierung: {str(e)}")
            raise  # Re-raise the exception to handle it in the calling function

    def process_xml(self, xml_file: str) -> List[Dict[str, Any]]:
        """Verarbeitet eine XML-Datei und extrahiert die relevanten Daten."""
        try:
            tree = ET.parse(xml_file)
            root = tree.getroot()
            
            processed_data = []
            for i, element in enumerate(root):
                try:
                    # Extrahiere alle Text-Daten für Embedding
                    text_data = []
                    for child in element.iter():
                        if child.text and child.text.strip():
                            text_data.append(f"{child.tag}: {child.text.strip()}")
                    
                    # Generiere Embedding aus kombiniertem Text
                    combined_text = " ".join(text_data)
                    vector = self.generate_embedding(combined_text)

                    # Erstelle Basis-Datensatz
                    data_item = {
                        "id": i + 1,  # Eindeutige ID
                        "vector": vector,  # Embedding-Vektor
                        "metadata": {}  # Für zusätzliche Metadaten
                    }

                    # Verarbeite alle Attribute und Unterelemente
                    for child in element:
                        if child.text and child.text.strip():
                            # Konvertiere Werte in passende Datentypen
                            value = self._convert_value(child.text.strip())
                            data_item[child.tag.lower()] = value

                            # Speichere Original-Wert in Metadaten
                            data_item["metadata"][child.tag] = child.text.strip()

                    processed_data.append(data_item)
                    
                    if (i + 1) % 100 == 0:
                        logger.info(f"{i + 1} Datensätze verarbeitet")

                except Exception as e:
                    logger.error(f"Fehler bei der Verarbeitung von Element {i}: {str(e)}")
                    continue

            logger.success(f"XML-Verarbeitung abgeschlossen: {len(processed_data)} Datensätze erstellt")
            return processed_data

        except Exception as e:
            logger.error(f"Fehler beim Parsen der XML-Datei {xml_file}: {str(e)}")
            raise

    def _convert_value(self, value: str) -> Any:
        """Konvertiert Strings in passende Datentypen."""
        try:
            # Versuche als Int
            return int(value)
        except ValueError:
            try:
                # Versuche als Float
                return float(value)
            except ValueError:
                # Versuche als Boolean
                if value.lower() in ['true', '1', 'yes', 'ja']:
                    return True
                elif value.lower() in ['false', '0', 'no', 'nein']:
                    return False
                
                # Versuche als Datum
                try:
                    return int(datetime.strptime(value, "%Y-%m-%d").timestamp())
                except ValueError:
                    # Behalte als String
                    return value 