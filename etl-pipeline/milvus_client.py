from typing import Dict, Any, List, Optional
from pymilvus import connections, Collection, FieldSchema, CollectionSchema, DataType, utility, MilvusException
from loguru import logger
from config import MILVUS_CONFIG

class MilvusClient:
    def __init__(self):
        """Initialisiert die Verbindung zu Milvus."""
        try:
            connections.connect(
                alias="default",
                uri=MILVUS_CONFIG["uri"],
                token=MILVUS_CONFIG["token"],
                db_name=MILVUS_CONFIG["db_name"],
                timeout=MILVUS_CONFIG["timeout"]
            )
            logger.info("Milvus Client initialisiert")
        except Exception as e:
            logger.error(f"Fehler bei der Initialisierung des Milvus Clients: {str(e)}")
            raise

    def _get_default_schema(self, collection_name: str) -> List[Dict[str, Any]]:
        """Erstellt ein Standard-Schema für eine Collection basierend auf dem Kollektionstyp."""
        base_fields = [
            {
                "name": "id",
                "type": "INT64",
                "is_primary": True
            },
            {
                "name": "vector",
                "type": "FLOAT_VECTOR",
                "dim": 768
            },
            {
                "name": "registrierungsdatum",
                "type": "INT64"
            },
            {
                "name": "datum_letzte_aktualisierung",
                "type": "INT64"
            },
            {
                "name": "eeg_inbetriebnahmedatum",
                "type": "INT64"
            },
            {
                "name": "eeg_mastr_nummer",
                "type": "VARCHAR",
                "max_length": 64
            },
            {
                "name": "anlagenschluessel_eeg",
                "type": "VARCHAR",
                "max_length": 64
            },
            {
                "name": "installierte_leistung",
                "type": "FLOAT"
            },
            {
                "name": "netzanschlusspunkt_id",
                "type": "VARCHAR",
                "max_length": 64
            },
            {
                "name": "betreiber_id",
                "type": "VARCHAR",
                "max_length": 64
            },
            {
                "name": "genehmigungsdatum",
                "type": "INT64"
            },
            {
                "name": "metadata",
                "type": "JSON"
            }
        ]
        return base_fields

    def _fix_field_type(self, error_msg: str, field_schemas: List[FieldSchema]) -> List[FieldSchema]:
        """Korrigiert Feldtypen basierend auf Fehlermeldungen."""
        try:
            # Extrahiere Feldname und erwarteten Typ aus der Fehlermeldung
            if "type (Float) of field" in error_msg and "type(DataType_Double)" in error_msg:
                field_name = error_msg.split("field (")[1].split(")")[0]
                logger.info(f"Korrigiere Feldtyp für {field_name} von FLOAT zu DOUBLE")
                
                # Erstelle neue Liste mit korrigierten Schemas
                fixed_schemas = []
                for schema in field_schemas:
                    if schema.name == field_name:
                        # Kopiere die Parameter vom originalen Schema
                        params = {
                            "name": schema.name,
                            "is_primary": schema.is_primary,
                            "description": schema.description,
                            "dtype": DataType.DOUBLE,  # Ändere zu DOUBLE
                        }
                        if hasattr(schema, "nullable"):
                            params["nullable"] = schema.nullable
                        if hasattr(schema, "default_value"):
                            params["default_value"] = float(schema.default_value)  # Konvertiere zu float für DOUBLE
                        fixed_schemas.append(FieldSchema(**params))
                    else:
                        fixed_schemas.append(schema)
                return fixed_schemas
            
            # JSON Felder unterstützen keine Default-Werte
            elif "type not support default_value, type:JSON" in error_msg:
                field_name = error_msg.split("name:")[1].split(":")[0].strip()
                logger.info(f"Entferne default_value für JSON-Feld {field_name}")
                
                fixed_schemas = []
                for schema in field_schemas:
                    if schema.name == field_name:
                        # Kopiere die Parameter ohne default_value
                        params = {
                            "name": schema.name,
                            "is_primary": schema.is_primary,
                            "description": schema.description,
                            "dtype": DataType.JSON,
                        }
                        if hasattr(schema, "nullable"):
                            params["nullable"] = schema.nullable
                        fixed_schemas.append(FieldSchema(**params))
                    else:
                        fixed_schemas.append(schema)
                return fixed_schemas
            
            return field_schemas
        except Exception as e:
            logger.error(f"Fehler bei der Typkorrektur: {str(e)}")
            return field_schemas

    def create_collection(self, collection_name: str, fields: Optional[List[Dict[str, Any]]] = None, retry_count: int = 0) -> None:
        """Erstellt eine neue Collection in Milvus."""
        try:
            if utility.has_collection(collection_name):
                logger.info(f"Collection {collection_name} existiert bereits")
                return

            # Verwende Standard-Schema wenn keins angegeben
            if fields is None:
                fields = self._get_default_schema(collection_name)

            field_schemas = []
            for field in fields:
                field_type = field["type"].upper()
                is_primary = field.get("is_primary", False)
                
                # Base parameters
                base_params = {
                    "name": field["name"],
                    "is_primary": is_primary,
                    "description": field.get("description", ""),
                }

                # Only add nullable for regular fields
                # (not primary key and not vector fields)
                if not is_primary and field_type != "FLOAT_VECTOR":
                    base_params["nullable"] = True
                
                if field_type == "FLOAT_VECTOR":
                    # Vector fields cannot be nullable and don't support default values
                    field_schemas.append(
                        FieldSchema(
                            **base_params,
                            dtype=DataType.FLOAT_VECTOR,
                            dim=field["dim"]
                        )
                    )
                elif field_type == "VARCHAR":
                    params = {**base_params, "dtype": DataType.VARCHAR, "max_length": field.get("max_length", 256)}
                    if not is_primary:
                        params["default_value"] = ""
                    field_schemas.append(FieldSchema(**params))
                elif field_type == "INT64":
                    params = {**base_params, "dtype": DataType.INT64}
                    if not is_primary:
                        params["default_value"] = 0
                    field_schemas.append(FieldSchema(**params))
                elif field_type == "FLOAT":
                    params = {**base_params, "dtype": DataType.DOUBLE}  # Verwende DOUBLE statt FLOAT
                    if not is_primary:
                        params["default_value"] = 0.0
                    field_schemas.append(FieldSchema(**params))
                elif field_type == "BOOL":
                    params = {**base_params, "dtype": DataType.BOOL}
                    if not is_primary:
                        params["default_value"] = False
                    field_schemas.append(FieldSchema(**params))
                elif field_type == "JSON":
                    # JSON fields don't support default values
                    field_schemas.append(
                        FieldSchema(
                            **base_params,
                            dtype=DataType.JSON
                        )
                    )

                # Enable dynamic fields for the collection
                schema = CollectionSchema(
                    fields=field_schemas,
                    enable_dynamic_field=True,
                    description=f"Collection for {collection_name} with dynamic fields enabled"
                )
                collection = Collection(name=collection_name, schema=schema)
                
                # Erstelle Index für Vektorsuche
                index_params = {
                    "metric_type": "L2",
                    "index_type": "IVF_FLAT",
                    "params": {"nlist": 1024}
                }
                collection.create_index(field_name="vector", index_params=index_params)
                logger.success(f"Collection {collection_name} erfolgreich erstellt und indexiert")

        except MilvusException as e:
            if retry_count < 3:  # Maximal 3 Versuche
                logger.warning(f"Milvus-Fehler beim Erstellen der Collection: {str(e)}")
                # Versuche Feldtypen zu korrigieren
                fixed_schemas = self._fix_field_type(str(e), field_schemas)
                if fixed_schemas != field_schemas:
                    logger.info("Versuche erneut mit korrigierten Feldtypen")
                    # Lösche fehlgeschlagene Collection falls sie existiert
                    if utility.has_collection(collection_name):
                        utility.drop_collection(collection_name)
                    # Erstelle neue Collection mit korrigierten Schemas
                    schema = CollectionSchema(
                        fields=fixed_schemas,
                        enable_dynamic_field=True,
                        description=f"Collection for {collection_name} with dynamic fields enabled"
                    )
                    collection = Collection(name=collection_name, schema=schema)
                    collection.create_index(field_name="vector", index_params=index_params)
                    logger.success(f"Collection {collection_name} erfolgreich mit korrigierten Typen erstellt")
                    return
                else:
                    # Wenn keine Korrekturen gefunden wurden, versuche es erneut
                    self.create_collection(collection_name, fields, retry_count + 1)
            else:
                logger.error(f"Fehler beim Erstellen der Collection {collection_name} nach mehreren Versuchen: {str(e)}")
                raise
        except Exception as e:
            logger.error(f"Fehler beim Erstellen der Collection {collection_name}: {str(e)}")
            raise

    def insert_data(self, collection_name: str, data: List[Dict[str, Any]]) -> None:
        """Fügt Daten in eine Collection ein."""
        try:
            # Überprüfe ob Collection existiert
            if not utility.has_collection(collection_name):
                logger.error(f"Collection {collection_name} existiert nicht")
                return

            # Formatiere die Daten für Milvus-Insert
            formatted_data = []
            for item in data:
                # Stelle sicher, dass alle erforderlichen Felder vorhanden sind
                if "vector" not in item:
                    logger.warning(f"Überspringe Datensatz ohne Vektor: {item}")
                    continue

                # Konvertiere numpy arrays zu Listen wenn nötig
                if hasattr(item["vector"], "tolist"):
                    item["vector"] = item["vector"].tolist()

                # Stelle sicher dass der Vektor die richtige Dimension hat
                if not isinstance(item["vector"], list):
                    logger.warning(f"Überspringe Datensatz mit ungültigem Vektorformat: {item}")
                    continue

                # Füge den formatierten Datensatz hinzu
                formatted_data.append(item)

            if not formatted_data:
                logger.warning("Keine gültigen Datensätze zum Einfügen gefunden")
                return

            # Führe Insert in Batches durch
            batch_size = 1000
            for i in range(0, len(formatted_data), batch_size):
                batch = formatted_data[i:i + batch_size]
                
                try:
                    # Hole Collection
                    collection = Collection(collection_name)
                    
                    # Führe Insert durch
                    insert_result = collection.insert(batch)
                    
                    logger.info(f"Batch {i//batch_size + 1} erfolgreich eingefügt: {len(batch)} Datensätze")
                    logger.debug(f"Insert Result: {insert_result}")
                    
                except MilvusException as e:
                    logger.error(f"Fehler beim Einfügen von Batch {i//batch_size + 1}: {str(e)}")
                    # Versuche den nächsten Batch trotz Fehler
                    continue

            logger.success(f"Insgesamt {len(formatted_data)} Datensätze in {collection_name} eingefügt")

        except MilvusException as e:
            logger.error(f"Fehler beim Einfügen der Daten in {collection_name}: {str(e)}")
            raise
        except Exception as e:
            logger.error(f"Unerwarteter Fehler beim Einfügen der Daten: {str(e)}")
            raise

    def search(self, collection_name: str, vector: List[float], 
               limit: int = 10, filter_expr: Optional[str] = None) -> List[Dict[str, Any]]:
        """Führt eine Vektorsuche in der Collection durch."""
        try:
            if not utility.has_collection(collection_name):
                logger.error(f"Collection {collection_name} existiert nicht")
                return []

            collection = Collection(collection_name)
            collection.load()

            search_params = {
                "metric_type": "L2",
                "params": {"nprobe": 10}
            }

            results = collection.search(
                data=[vector],
                anns_field="vector",
                param=search_params,
                limit=limit,
                expr=filter_expr
            )

            hits = []
            for hit in results[0]:
                hits.append({
                    "id": hit.id,
                    "distance": hit.distance,
                    "score": hit.score
                })

            return hits

        except Exception as e:
            logger.error(f"Fehler bei der Suche in {collection_name}: {str(e)}")
            return []
        finally:
            try:
                collection.release()
            except:
                pass

    def delete_collection(self, collection_name: str) -> None:
        """Löscht eine Collection."""
        try:
            if utility.has_collection(collection_name):
                utility.drop_collection(collection_name)
                logger.info(f"Collection {collection_name} gelöscht")
        except Exception as e:
            logger.error(f"Fehler beim Löschen der Collection {collection_name}: {str(e)}")
            raise 

    def __del__(self):
        """Schließt die Verbindung zu Milvus."""
        try:
            connections.disconnect("default")
            logger.info("Milvus Verbindung geschlossen")
        except Exception as e:
            logger.error(f"Fehler beim Schließen der Milvus Verbindung: {str(e)}") 