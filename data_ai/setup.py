from setuptools import setup, find_packages

setup(
    name="data_ai",
    version="0.1.0",
    package_dir={"": "src"},
    packages=find_packages(where="src"),
    install_requires=[
        "torch>=2.0.0",
        "transformers>=4.30.0",
        "accelerate>=0.20.0",
        "bitsandbytes>=0.39.0",
        "sentencepiece>=0.1.99",
        "protobuf>=3.20.0",
        "lxml>=4.9.0",
        "xmlschema>=2.3.0",
        "pandas>=2.0.0",
        "pyarrow>=12.0.0",
        "tqdm>=4.65.0",
        "scikit-learn>=1.2.0",
        "nltk>=3.8.0",
        "rouge>=1.0.1",
        "sacrebleu>=2.3.0",
        "mlflow>=2.4.0",
        "hydra-core>=1.3.0",
        "omegaconf>=2.3.0",
    ],
    python_requires=">=3.8",
) 