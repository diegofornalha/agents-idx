"""Módulo para geração de SEO para YouTube"""
import os
from ..llm.factory import LLMFactory
from ..llm.gemini import run_async

def generate_seo(transcription_text, style="professional"):
    """
    Gera SEO para YouTube com base em uma transcrição
    
    Args:
        transcription_text (str): Texto da transcrição
        style (str): Estilo do SEO (clickbait, professional, educational, neutral)
        
    Returns:
        dict: Dados de SEO (título, descrição, tags)
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
    
    # Gerar SEO
    seo_data = run_async(llm_client.generate_seo(transcription_text, style=style))
    
    if not seo_data:
        raise ValueError("Não foi possível gerar SEO.")
        
    return seo_data 