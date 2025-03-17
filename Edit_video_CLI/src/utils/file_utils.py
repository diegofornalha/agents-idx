"""Utilitários para manipulação de arquivos"""
import os
import json

def is_valid_audio(file_path):
    """
    Verifica se o arquivo é um formato de áudio suportado
    
    Args:
        file_path (str): Caminho para o arquivo
        
    Returns:
        bool: True se for um formato suportado
    """
    supported_extensions = ['.mp3', '.wav', '.m4a', '.ogg', '.flac']
    ext = os.path.splitext(file_path)[1].lower()
    return ext in supported_extensions

def save_json(data, file_path):
    """
    Salva dados em formato JSON
    
    Args:
        data (dict): Dados a serem salvos
        file_path (str): Caminho do arquivo de saída
    """
    with open(file_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False) 