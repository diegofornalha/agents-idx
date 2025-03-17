"""Módulo para transcrição de áudio"""
import os
from ..llm.factory import LLMFactory
from ..llm.gemini import run_async

def transcribe_audio(audio_file):
    """
    Transcreve um arquivo de áudio usando serviços de IA
    
    Args:
        audio_file: Caminho para o arquivo de áudio
        
    Returns:
        str: Texto transcrito
    """
    # Usar o Gemini como provedor padrão
    llm_provider = "gemini"
    
    # Verificar se há uma chave API configurada
    if not LLMFactory.has_api_key(llm_provider):
        api_key = os.environ.get("GEMINI_API_KEY")
        if not api_key:
            raise ValueError(f"Chave API para {llm_provider} não encontrada. Configure a variável de ambiente GEMINI_API_KEY.")
    else:
        api_key = None  # Será obtida automaticamente pela factory
        
    # Criar cliente LLM
    llm_client = LLMFactory.create_llm(llm_provider, api_key)
    
    # Transcrever o áudio
    transcription = run_async(llm_client.transcribe_audio(audio_file))
    
    if not transcription:
        raise ValueError("Não foi possível obter uma transcrição.")
        
    return transcription 