"""Fábrica para criar instâncias de LLM"""
import os
from typing import Optional, Dict, Any
from dotenv import load_dotenv
from .gemini import GeminiClient

# Carregar variáveis de ambiente
load_dotenv()

class LLMFactory:
    """Fábrica para criar instâncias de LLM"""
    
    _providers = {
        "gemini": GeminiClient
    }
    
    @classmethod
    def create_llm(cls, provider: str = "gemini", api_key: Optional[str] = None):
        """
        Cria uma instância de LLM baseada no provedor
        
        Args:
            provider: Nome do provedor (gemini, etc)
            api_key: Chave de API (opcional)
            
        Returns:
            Uma instância do cliente LLM
        """
        provider = provider.lower()
        
        if provider not in cls._providers:
            raise ValueError(f"Provedor de LLM não suportado: {provider}")
        
        client_class = cls._providers[provider]
        return client_class(api_key=api_key)
    
    @classmethod
    def has_api_key(cls, provider: str = "gemini") -> bool:
        """
        Verifica se há uma chave API configurada para o provedor
        
        Args:
            provider: Nome do provedor
            
        Returns:
            True se a chave estiver configurada
        """
        provider = provider.lower()
        
        env_vars = {
            "gemini": "GEMINI_API_KEY"
        }
        
        env_var = env_vars.get(provider)
        if not env_var:
            return False
            
        return bool(os.environ.get(env_var))

    @staticmethod
    def get_available_providers():
        """Retorna a lista de provedores de LLM disponíveis"""
        return ["gemini"] 