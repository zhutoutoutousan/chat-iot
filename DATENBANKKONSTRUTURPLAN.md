# Datenbankkonstruktionsplan

## 1. Einführung
Dieser Plan beschreibt die Implementierung und Architektur unserer Datenbankinfrastruktur, mit besonderem Fokus auf die Vektordatenbank Milvus für KI-Anwendungen.

## 2. Vektordatenbank-Setup (Milvus)

### 2.1 Grundlegende Architektur
- **Deployment-Modus**: Kubernetes-basierte Produktionsumgebung
- **Skalierbarkeit**: Horizontale Skalierung für wachsende Datenmengen
- **Hochverfügbarkeit**: Multi-Node-Setup mit Replikation

### 2.2 Komponenten
1. **Milvus-Nodes**:
   - Query Nodes: Für Suchanfragen
   - Data Nodes: Für Datenspeicherung
   - Index Nodes: Für Indexverwaltung
   - Proxy Nodes: Für Load-Balancing

2. **Speicherebenen**:
   - Meta Storage: etcd
   - Object Storage: MinIO
   - Message Storage: Pulsar

## 2.3 Kollektionen-Schema

### 2.3.1 EEG-Anlagen Kollektionen

#### 2.3.1.1 Gemeinsame EEG-Anlagen Basisfelder
```python
eeg_anlagen_basisfelder = [
    {"name": "id", "type": "INT64", "is_primary": True},
    {"name": "vector", "type": "FLOAT_VECTOR", "dim": 768},
    {"name": "eeg_mastr_nummer", "type": "VARCHAR", "max_length": 64},
    {"name": "installierte_leistung", "type": "FLOAT"},
    {"name": "inbetriebnahmedatum", "type": "INT64"},  # Unix timestamp
    {"name": "netzanschlusspunkt_id", "type": "VARCHAR", "max_length": 64},
    {"name": "betreiber_id", "type": "VARCHAR", "max_length": 64},
    {"name": "genehmigungsdatum", "type": "INT64"},  # Unix timestamp
    {"name": "metadata", "type": "JSON"}
]

basis_indexes = [
    {"field_name": "vector", "index_type": "IVF_FLAT", "metric_type": "L2"},
    {"field_name": "eeg_mastr_nummer", "index_type": "HASH"},
    {"field_name": "installierte_leistung", "index_type": "RANGE"},
    {"field_name": "netzanschlusspunkt_id", "index_type": "HASH"},
    {"field_name": "betreiber_id", "index_type": "HASH"}
]
```

##### 2.3.1.1 Biomasse-Anlagen Kollektion
```python
biomasse_collection_config = {
    "name": "biomasse_anlagen",
    "fields": [
        {"name": "id", "type": "INT64", "is_primary": True},
        {"name": "vector", "type": "FLOAT_VECTOR", "dim": 768},
        {"name": "registrierungsdatum", "type": "INT64"},  # Unix timestamp
        {"name": "datum_letzte_aktualisierung", "type": "INT64"},  # Unix timestamp
        {"name": "eeg_inbetriebnahmedatum", "type": "INT64"},  # Unix timestamp
        {"name": "eeg_mastr_nummer", "type": "VARCHAR", "max_length": 64},
        {"name": "anlagenschluessel_eeg", "type": "VARCHAR", "max_length": 64},
        {"name": "installierte_leistung", "type": "FLOAT"},
        {"name": "ausschliessliche_verwendung_biomasse", "type": "BOOL"},
        {"name": "ausschreibung_zuschlag", "type": "BOOL"},
        {"name": "zuschlagsnummer", "type": "VARCHAR", "max_length": 64},
        {"name": "biogas_inanspruchnahme_flexi_praemie", "type": "BOOL"},
        {"name": "biogas_datum_inanspruchnahme_flexi_praemie", "type": "INT64"},  # Unix timestamp
        {"name": "biogas_leistungserhoehung", "type": "BOOL"},
        {"name": "biogas_datum_leistungserhoehung", "type": "INT64"},  # Unix timestamp
        {"name": "biogas_umfang_leistungserhoehung", "type": "FLOAT"},
        {"name": "biogas_gaserzeugungskapazitaet", "type": "FLOAT"},
        {"name": "biogas_hoechstbemessungsleistung", "type": "FLOAT"},
        {"name": "biomethane_erstmaliger_einsatz", "type": "INT64"},  # Unix timestamp
        {"name": "anlage_betriebsstatus", "type": "INT16"},
        {"name": "verknuepfte_einheiten_mastr_nummern", "type": "VARCHAR", "max_length": 256},
        {"name": "metadata", "type": "JSON"}
    ],
    "indexes": [
        {
            "field_name": "vector",
            "index_type": "IVF_FLAT",
            "metric_type": "L2",
            "params": {"nlist": 1024}
        },
        {
            "field_name": "eeg_mastr_nummer",
            "index_type": "HASH"
        },
        {
            "field_name": "installierte_leistung",
            "index_type": "RANGE"
        },
        {
            "field_name": "anlage_betriebsstatus",
            "index_type": "HASH"
        }
    ]
}
```

##### 2.3.1.2 Solar-Anlagen Kollektion
```python
solar_collection_config = {
    "name": "solar_anlagen",
    "fields": [
        {"name": "id", "type": "INT64", "is_primary": True},
        {"name": "vector", "type": "FLOAT_VECTOR", "dim": 768},
        {"name": "eeg_mastr_nummer", "type": "VARCHAR", "max_length": 64},
        {"name": "installierte_leistung", "type": "FLOAT"},
        {"name": "inbetriebnahmedatum", "type": "INT64"},  # Unix timestamp
        {"name": "lage", "type": "VARCHAR", "max_length": 32},  # Freiflaeche/Dachanlage/etc.
        {"name": "leistungsbegrenzung", "type": "BOOL"},
        {"name": "einstrahlungsgebiet", "type": "INT16"},
        {"name": "metadata", "type": "JSON"}
    ],
    "indexes": [
        {"field_name": "vector", "index_type": "IVF_FLAT", "metric_type": "L2"},
        {"field_name": "eeg_mastr_nummer", "index_type": "HASH"},
        {"field_name": "installierte_leistung", "index_type": "RANGE"}
    ]
}
```

##### 2.3.1.3 Wind-Anlagen Kollektion
```python
wind_collection_config = {
    "name": "wind_anlagen",
    "fields": [
        {"name": "id", "type": "INT64", "is_primary": True},
        {"name": "vector", "type": "FLOAT_VECTOR", "dim": 768},
        {"name": "eeg_mastr_nummer", "type": "VARCHAR", "max_length": 64},
        {"name": "installierte_leistung", "type": "FLOAT"},
        {"name": "inbetriebnahmedatum", "type": "INT64"},  # Unix timestamp
        {"name": "nabenhoehe", "type": "FLOAT"},
        {"name": "rotordurchmesser", "type": "FLOAT"},
        {"name": "hersteller", "type": "VARCHAR", "max_length": 128},
        {"name": "metadata", "type": "JSON"}
    ],
    "indexes": [
        {"field_name": "vector", "index_type": "IVF_FLAT", "metric_type": "L2"},
        {"field_name": "eeg_mastr_nummer", "index_type": "HASH"},
        {"field_name": "installierte_leistung", "index_type": "RANGE"}
    ]
}
```

##### 2.3.1.4 Wasser-Anlagen Kollektion
```python
wasser_collection_config = {
    "name": "wasser_anlagen",
    "fields": [
        {"name": "id", "type": "INT64", "is_primary": True},
        {"name": "vector", "type": "FLOAT_VECTOR", "dim": 768},
        {"name": "eeg_mastr_nummer", "type": "VARCHAR", "max_length": 64},
        {"name": "installierte_leistung", "type": "FLOAT"},
        {"name": "inbetriebnahmedatum", "type": "INT64"},  # Unix timestamp
        {"name": "art_wasserkraftanlage", "type": "VARCHAR", "max_length": 64},
        {"name": "mindestwasserfuehrung", "type": "FLOAT"},
        {"name": "metadata", "type": "JSON"}
    ],
    "indexes": [
        {"field_name": "vector", "index_type": "IVF_FLAT", "metric_type": "L2"},
        {"field_name": "eeg_mastr_nummer", "index_type": "HASH"},
        {"field_name": "installierte_leistung", "index_type": "RANGE"}
    ]
}
```

#### 2.3.1.5 Geothermie-Anlagen Kollektion
```python
geothermie_collection_config = {
    "name": "geothermie_anlagen",
    "fields": eeg_anlagen_basisfelder + [
        {"name": "tiefe_bohrung", "type": "FLOAT"},
        {"name": "temperatur_thermalwasser", "type": "FLOAT"},
        {"name": "art_geothermie", "type": "VARCHAR", "max_length": 32}
    ],
    "indexes": basis_indexes + [
        {"field_name": "art_geothermie", "index_type": "HASH"}
    ]
}
```

### 2.3.2 Einheiten Kollektionen

#### 2.3.2.1 Gemeinsame Einheiten Basisfelder
```python
einheiten_basisfelder = [
    {"name": "id", "type": "INT64", "is_primary": True},
    {"name": "vector", "type": "FLOAT_VECTOR", "dim": 768},
    {"name": "einheit_mastr_nummer", "type": "VARCHAR", "max_length": 64},
    {"name": "netzanschlusspunkt_id", "type": "VARCHAR", "max_length": 64},
    {"name": "einheittyp", "type": "VARCHAR", "max_length": 32},
    {"name": "status", "type": "VARCHAR", "max_length": 32},
    {"name": "metadata", "type": "JSON"}
]

einheiten_basis_indexes = [
    {"field_name": "vector", "index_type": "IVF_FLAT", "metric_type": "L2"},
    {"field_name": "einheit_mastr_nummer", "index_type": "HASH"},
    {"field_name": "netzanschlusspunkt_id", "index_type": "HASH"},
    {"field_name": "einheittyp", "index_type": "HASH"},
    {"field_name": "status", "index_type": "HASH"}
]
```

#### 2.3.2.2 Kernkraft-Einheiten Kollektion
```python
kernkraft_collection_config = {
    "name": "kernkraft_einheiten",
    "fields": einheiten_basisfelder + [
        {"name": "thermische_leistung", "type": "FLOAT"},
        {"name": "elektrische_leistung", "type": "FLOAT"},
        {"name": "reaktortyp", "type": "VARCHAR", "max_length": 64}
    ],
    "indexes": einheiten_basis_indexes
}
```

#### 2.3.2.3 Verbrennungs-Einheiten Kollektion
```python
verbrennung_collection_config = {
    "name": "verbrennung_einheiten",
    "fields": einheiten_basisfelder + [
        {"name": "feuerungswarmeleistung", "type": "FLOAT"},
        {"name": "hauptbrennstoff", "type": "VARCHAR", "max_length": 64},
        {"name": "weitere_brennstoffe", "type": "JSON"}
    ],
    "indexes": einheiten_basis_indexes + [
        {"field_name": "hauptbrennstoff", "index_type": "HASH"}
    ]
}
```

### 2.3.3 Gas-System Kollektionen

#### 2.3.3.1 Gas-Erzeuger Kollektion
```python
gas_erzeuger_collection_config = {
    "name": "gas_erzeuger",
    "fields": [
        {"name": "id", "type": "INT64", "is_primary": True},
        {"name": "vector", "type": "FLOAT_VECTOR", "dim": 768},
        {"name": "gas_erzeuger_id", "type": "VARCHAR", "max_length": 64},
        {"name": "erzeugungsart", "type": "VARCHAR", "max_length": 32},
        {"name": "kapazitaet", "type": "FLOAT"},
        {"name": "netzanschlusspunkt_id", "type": "VARCHAR", "max_length": 64}
    ],
    "indexes": [
        {"field_name": "vector", "index_type": "IVF_FLAT", "metric_type": "L2"},
        {"field_name": "gas_erzeuger_id", "index_type": "HASH"},
        {"field_name": "erzeugungsart", "index_type": "HASH"}
    ]
}
```

#### 2.3.3.2 Gas-Speicher Kollektion
```python
gas_speicher_collection_config = {
    "name": "gas_speicher",
    "fields": [
        {"name": "id", "type": "INT64", "is_primary": True},
        {"name": "vector", "type": "FLOAT_VECTOR", "dim": 768},
        {"name": "speicher_id", "type": "VARCHAR", "max_length": 64},
        {"name": "speichertyp", "type": "VARCHAR", "max_length": 32},
        {"name": "arbeitsgasvolumen", "type": "FLOAT"},
        {"name": "max_ausspeicherleistung", "type": "FLOAT"},
        {"name": "max_einspeicherleistung", "type": "FLOAT"}
    ],
    "indexes": [
        {"field_name": "vector", "index_type": "IVF_FLAT", "metric_type": "L2"},
        {"field_name": "speicher_id", "index_type": "HASH"},
        {"field_name": "speichertyp", "index_type": "HASH"}
    ]
}
```

### 2.3.4 Verwaltungsdaten Kollektionen

#### 2.3.4.1 Genehmigungen Kollektion
```python
genehmigungen_collection_config = {
    "name": "genehmigungen",
    "fields": [
        {"name": "id", "type": "INT64", "is_primary": True},
        {"name": "vector", "type": "FLOAT_VECTOR", "dim": 768},
        {"name": "genehmigung_id", "type": "VARCHAR", "max_length": 64},
        {"name": "einheit_id", "type": "VARCHAR", "max_length": 64},
        {"name": "genehmigungstyp", "type": "VARCHAR", "max_length": 32},
        {"name": "genehmigungsdatum", "type": "INT64"},  # Unix timestamp
        {"name": "behoerde", "type": "VARCHAR", "max_length": 128}
    ],
    "indexes": [
        {"field_name": "vector", "index_type": "IVF_FLAT", "metric_type": "L2"},
        {"field_name": "genehmigung_id", "index_type": "HASH"},
        {"field_name": "einheit_id", "index_type": "HASH"}
    ]
}
```

#### 2.3.4.2 Netze Kollektion
```python
netze_collection_config = {
    "name": "netze",
    "fields": [
        {"name": "id", "type": "INT64", "is_primary": True},
        {"name": "vector", "type": "FLOAT_VECTOR", "dim": 768},
        {"name": "netz_nummer", "type": "VARCHAR", "max_length": 64},
        {"name": "netzebene", "type": "INT16"},
        {"name": "spannungsebene", "type": "FLOAT"},
        {"name": "metadata", "type": "JSON"}
    ],
    "indexes": [
        {"field_name": "vector", "index_type": "IVF_FLAT", "metric_type": "L2"},
        {"field_name": "netz_nummer", "index_type": "HASH"},
        {"field_name": "netzebene", "index_type": "HASH"}
    ]
}
```

#### 2.3.4.3 Netzanschlusspunkte Kollektion
```python
netzanschlusspunkte_collection_config = {
    "name": "netzanschlusspunkte",
    "fields": [
        {"name": "id", "type": "INT64", "is_primary": True},
        {"name": "vector", "type": "FLOAT_VECTOR", "dim": 768},
        {"name": "anschlusspunkt_id", "type": "VARCHAR", "max_length": 64},
        {"name": "netz_nummer", "type": "VARCHAR", "max_length": 64},
        {"name": "geoposition", "type": "JSON"},  # Latitude/Longitude
        {"name": "metadata", "type": "JSON"}
    ],
    "indexes": [
        {"field_name": "vector", "index_type": "IVF_FLAT", "metric_type": "L2"},
        {"field_name": "anschlusspunkt_id", "index_type": "HASH"},
        {"field_name": "netz_nummer", "index_type": "HASH"}
    ]
}
```

#### 2.3.4.4 Marktakteure Kollektion
```python
marktakteure_collection_config = {
    "name": "marktakteure",
    "fields": [
        {"name": "id", "type": "INT64", "is_primary": True},
        {"name": "vector", "type": "FLOAT_VECTOR", "dim": 768},
        {"name": "akteur_mastr_nummer", "type": "VARCHAR", "max_length": 64},
        {"name": "marktfunktion", "type": "VARCHAR", "max_length": 64},
        {"name": "registerart", "type": "VARCHAR", "max_length": 32},
        {"name": "metadata", "type": "JSON"}
    ],
    "indexes": [
        {"field_name": "vector", "index_type": "IVF_FLAT", "metric_type": "L2"},
        {"field_name": "akteur_mastr_nummer", "index_type": "HASH"},
        {"name": "marktfunktion", "index_type": "HASH"}
    ]
}
```

#### 2.3.4.5 Sensor-Daten Kollektion
```python
sensor_collection_config = {
    "name": "sensor_data",
    "fields": [
        {"name": "id", "type": "INT64", "is_primary": True},
        {"name": "vector", "type": "FLOAT_VECTOR", "dim": 768},
        {"name": "timestamp", "type": "INT64"},
        {"name": "sensor_id", "type": "VARCHAR", "max_length": 64},
        {"name": "metadata", "type": "JSON"}
    ],
    "indexes": [
        {
            "field_name": "vector",
            "index_type": "IVF_FLAT",
            "metric_type": "L2",
            "params": {"nlist": 1024}
        }
    ]
}
```

### 2.4 Datenbeziehungen und Integrität

#### 2.4.1 Hierarchische Beziehungen
1. **Anlagen-Hierarchie**:
   ```mermaid
   graph TD
       A[Marktakteur] --> B[EEG-Anlage]
       B --> C[Einheit]
       C --> D[Netzanschlusspunkt]
       D --> E[Netz]
   ```

2. **Gas-System-Hierarchie**:
   ```mermaid
   graph TD
       A[Gas-Erzeuger] --> B[Netzanschlusspunkt]
       C[Gas-Speicher] --> B
       D[Gas-Verbraucher] --> B
       B --> E[Bilanzierungsgebiet]
   ```

#### 2.4.2 Validierungsregeln

1. **Technische Validierung**:
   - Leistungswerte müssen positiv sein
   - Datumsfelder müssen plausibel sein
   - Koordinaten müssen im gültigen Bereich liegen

2. **Geschäftsregeln**:
   - Jede Anlage muss einem aktiven Marktakteur zugeordnet sein
   - Netzanschlusspunkte müssen einem existierenden Netz zugeordnet sein
   - Genehmigungen müssen vor Inbetriebnahme vorliegen

3. **Datenqualität**:
   - Pflichtfelder müssen ausgefüllt sein
   - Referenzielle Integrität muss gewahrt sein
   - Eindeutige Identifikatoren müssen unique sein

### 2.5 XML-Schema Integration

#### 2.5.1 Transformationsregeln
```python
transformation_rules = {
    "date_fields": {
        "type": "date_to_unix_timestamp",
        "fields": ["inbetriebnahmedatum", "genehmigungsdatum"]
    },
    "boolean_fields": {
        "type": "string_to_bool",
        "mapping": {"0": False, "1": True}
    },
    "numeric_fields": {
        "type": "string_to_float",
        "fields": ["installierte_leistung", "kapazitaet"]
    }
}
```

#### 2.5.2 Fehlerbehandlung
1. **Validierungsfehler**:
   - Logging aller Fehler
   - Quarantäne für fehlerhafte Datensätze
   - Benachrichtigung bei kritischen Fehlern

2. **Datenqualitätsprüfung**:
   - Vollständigkeitsprüfung
   - Formatprüfung
   - Plausibilitätsprüfung

## 3. Produktionsarchitektur

### 3.1 Infrastruktur
- **Container-Orchestrierung**: Kubernetes
- **Service Mesh**: Istio
- **Monitoring**: Prometheus + Grafana
- **Logging**: ELK Stack (Elasticsearch, Logstash, Kibana)

### 3.2 Sicherheitskonzept
1. **Authentifizierung**:
   - JWT-basierte Authentifizierung
   - Role-Based Access Control (RBAC)
   - SSL/TLS-Verschlüsselung

2. **Datensicherheit**:
   - Verschlüsselte Datenübertragung
   - Regelmäßige Backups
   - Disaster Recovery Plan

### 3.3 Performance-Optimierung
1. **Indexierung**:
   - Automatische Index-Updates
   - Optimierte Suchparameter
   - Caching-Strategien

2. **Ressourcenmanagement**:
   - Automatische Skalierung
   - Load Balancing
   - Resource Quotas

## 4. Implementierungsplan

### 4.1 Phase 1: Grundaufbau
1. Kubernetes-Cluster-Setup
2. Milvus-Installation und Konfiguration
3. Basis-Monitoring-Setup

### 4.2 Phase 2: Datenintegration
1. Schema-Definition und -Migration
2. XML-Daten-Import-Pipeline
   - XML-Parsing
   - Schema-Validierung
   - Datentyp-Transformation
3. ETL-Pipeline-Implementierung
4. Initiale Datenladen

### 4.3 Phase 3: Optimierung
1. Performance-Tuning
2. Sicherheitsimplementierung
3. Monitoring-Verfeinerung

## 5. Wartung und Betrieb

### 5.1 Monitoring
- System-Metriken
- Query-Performance
- Ressourcenauslastung

### 5.2 Backup-Strategie
- Tägliche inkrementelle Backups
- Wöchentliche Vollbackups
- Monatliche Archivierung

### 5.3 Skalierungsrichtlinien
- Automatische horizontale Skalierung bei 70% CPU-Auslastung
- Manuelle Skalierung für geplante Lastspitzen
- Ressourcenplanung für langfristiges Wachstum

## 6. Dokumentation und Support

### 6.1 Technische Dokumentation
- Architekturdiagramme
- API-Dokumentation
- Betriebshandbücher

### 6.2 Support-Prozesse
- Incident-Management
- Change-Management
- Problem-Management

## 7. Risikomanagement

### 7.1 Identifizierte Risiken
- Datenverlust
- Performance-Engpässe
- Sicherheitsverletzungen

### 7.2 Mitigationsstrategien
- Redundante Systeme
- Performance-Monitoring
- Sicherheitsaudits

## 8. Kostenplanung

### 8.1 Infrastrukturkosten
- Kubernetes-Cluster
- Storage-Systeme
- Backup-Systeme

### 8.2 Betriebskosten
- Personal
- Lizenzen
- Support

## 9. Erfolgskriterien

### 9.1 Performance-KPIs
- Antwortzeiten < 100ms für 99% der Anfragen
- Verfügbarkeit > 99.9%
- Durchsatz > 1000 QPS

### 9.2 Qualitätskriterien
- Datengenauigkeit
- System-Stabilität
- Benutzerfreundlichkeit
