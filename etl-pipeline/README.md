# ETL-Pipeline für Milvus Datenbank

Diese ETL-Pipeline dient zum Laden von XML-Daten in die Milvus Vektordatenbank.

## Installation

1. Python-Umgebung erstellen:
```bash
python -m venv venv
source venv/bin/activate  # Linux/Mac
.\venv\Scripts\activate   # Windows
```

2. Abhängigkeiten installieren:
```bash
pip install -r requirements.txt
```

3. Umgebungsvariablen konfigurieren:
Erstellen Sie eine `.env` Datei mit folgenden Variablen:
```env
MILVUS_URI=http://localhost:19530
MILVUS_TOKEN=root:Milvus
MILVUS_DB_FILE=energy_db.milvus
```

Hinweis: Die Milvus URI muss mit `http://` oder `https://` beginnen.

## Verzeichnisstruktur

```
etl-pipeline/
├── config.py              # Konfigurationsdatei
├── milvus_client.py      # Milvus Client Wrapper
├── xml_processor.py      # XML Verarbeitung
├── main.py              # Hauptskript
├── requirements.txt     # Python Abhängigkeiten
└── README.md           # Diese Datei
```

## Verwendung

1. XML-Dateien im `data` Verzeichnis ablegen:
```
data/
├── biomasse/
│   └── anlagen_biomasse_anlagen.xml
├── solar/
│   └── anlagen_solar_anlagen.xml
└── wind/
    └── anlagen_wind_anlagen.xml
```

2. Pipeline ausführen:
```bash
python main.py
```

## Logging

Die Logs werden in zwei Orten gespeichert:
- Konsole (STDERR)
- `logs/etl_*.log` Dateien (mit täglicher Rotation)

## Fehlerbehandlung

1. XML-Validierungsfehler werden geloggt und die betroffene Datei übersprungen
2. Transformationsfehler werden geloggt und die Pipeline fortgesetzt
3. Kritische Fehler führen zum Abbruch der Pipeline

## Unterstützte Schemas

- AnlagenEegBiomasse.xsd
- AnlagenEegSolar.xsd
- AnlagenEegWind.xsd
- AnlagenEegWasser.xsd
- EinheitenGasErzeuger.xsd
- (weitere können in config.py hinzugefügt werden)

## Datenvalidierung

1. XML-Schema-Validierung
2. Datentyp-Konvertierung
3. Pflichtfeld-Prüfung
4. Referenzielle Integrität 