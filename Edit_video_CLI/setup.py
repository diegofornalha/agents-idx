#!/usr/bin/env python3
"""Setup script para o Editor de Vídeo CLI"""

from setuptools import setup, find_packages

setup(
    name="edit_video_cli",
    version="0.1.0",
    packages=find_packages(),
    install_requires=[
        "click>=8.1.7",
        "rich>=13.7.0",
        "pydub>=0.25.1",
        "python-dotenv>=1.0.0",
        "requests>=2.31.0",
        "aiohttp>=3.9.1",
        "numpy>=1.24.3",
        "moviepy>=1.0.3",
        "ffmpeg-python>=0.2.0",
    ],
    entry_points={
        "console_scripts": [
            "edit-video=src.main:main",
        ],
    },
    python_requires=">=3.8",
    author="Diego Fornalha",
    author_email="youremail@example.com",
    description="CLI para edição de vídeo com transcrição e geração de SEO",
    keywords="video, editor, cli, transcription, seo",
    url="https://github.com/yourusername/edit_video_cli",
    classifiers=[
        "Programming Language :: Python :: 3",
        "License :: OSI Approved :: MIT License",
        "Operating System :: OS Independent",
    ],
) 