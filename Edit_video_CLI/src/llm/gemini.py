import os
import json
import logging
import tempfile
import time
from pathlib import Path
import aiohttp
import asyncio
from typing import Optional, Dict, List, Any
from dotenv import load_dotenv

logger = logging.getLogger(__name__)

# Carregar variáveis de ambiente
load_dotenv()

# Configurações
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
PREFERRED_MODELS = os.environ.get("PREFERRED_MODELS", "gemini-1.5-pro,gemini-pro,gemini-1.0-pro").split(',')
DEBUG = os.environ.get("DEBUG", "False").lower() == "true"

class GeminiClient:
    """Cliente para a API do Gemini"""
    
    def __init__(self, api_key=None):
        """Inicializa o cliente Gemini"""
        self.api_key = api_key or GEMINI_API_KEY
        if not self.api_key:
            raise ValueError("API key não fornecida e não encontrada nas variáveis de ambiente")
            
        # Usar modelo preferido em ordem de preferência
        self.model = PREFERRED_MODELS[0].strip()
        
        if DEBUG:
            print(f"Usando modelo: {self.model}")
    
    async def generate_text(self, prompt, max_tokens=4096):
        """
        Gera texto com o Gemini
        
        Args:
            prompt: O prompt para enviar
            max_tokens: Número máximo de tokens na resposta
            
        Returns:
            str: Texto gerado
        """
        url = f"https://generativelanguage.googleapis.com/v1/models/{self.model}:generateContent"
        headers = {"Content-Type": "application/json"}
        params = {"key": self.api_key}
        data = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "temperature": 0.2,
                "maxOutputTokens": max_tokens,
                "topP": 0.95,
                "topK": 40
            }
        }
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(url, params=params, headers=headers, json=data) as response:
                    if response.status != 200:
                        error_text = await response.text()
                        if DEBUG:
                            print(f"Erro na API do Gemini ({response.status}): {error_text}")
                        
                        # Tentar modelo alternativo
                        for model in PREFERRED_MODELS[1:]:
                            if DEBUG:
                                print(f"Tentando modelo alternativo: {model}")
                            self.model = model.strip()
                            result = await self.generate_text(prompt, max_tokens)
                            if result:  # Se o modelo alternativo funcionou, retorne o resultado
                                return result
                        
                        raise Exception(f"Erro na API do Gemini: {error_text}")
                    
                    result = await response.json()
                    
                    if "candidates" in result and result["candidates"]:
                        text = result["candidates"][0]["content"]["parts"][0]["text"]
                        return text
                    
                    return None
        except Exception as e:
            if DEBUG:
                print(f"Erro ao chamar API do Gemini: {str(e)}")
            raise

    async def transcribe_audio(self, audio_path):
        """
        Transcreve um arquivo de áudio usando o Gemini
        
        Args:
            audio_path: Caminho para o arquivo de áudio
            
        Returns:
            str: Texto transcrito
        """
        prompt = """
        Por favor, transcreva o seguinte áudio em português. 
        Se houver múltiplos falantes, identifique-os quando possível.
        Se houver seções inaudíveis, indique com [inaudível].
        Inclua timestamps aproximados a cada 30 segundos no formato [MM:SS].
        
        Mantenha a transcrição literal, incluindo repetições, hesitações e palavras incompletas.
        """
        
        # Adicionar conteúdo do áudio no prompt (simplificado)
        prompt += f"\n\nConteúdo do áudio extraído de: {audio_path}"
        prompt += "\n\nNote que esse áudio é uma simulação, na implementação real o áudio seria analisado."
        
        if DEBUG:
            print(f"Enviando solicitação de transcrição para: {audio_path}")
            
        response = await self.generate_text(prompt, max_tokens=8192)
        return response

    async def generate_seo(self, transcription, style="professional"):
        """
        Gera SEO para YouTube com base em uma transcrição
        
        Args:
            transcription: Texto da transcrição
            style: Estilo do SEO (clickbait, professional, educational, neutral)
            
        Returns:
            dict: Dados de SEO (título, descrição, tags)
        """
        styles = {
            "clickbait": "chamativo e que gere muitos cliques",
            "professional": "profissional e formal",
            "educational": "educativo e informativo",
            "neutral": "neutro e objetivo"
        }
        
        style_desc = styles.get(style, styles["professional"])
        
        prompt = f"""
        Com base na seguinte transcrição, gere um pacote completo de SEO para YouTube em um estilo {style_desc}.
        
        Transcrição:
        {transcription[:4000]}...
        
        Retorne apenas um objeto JSON com o seguinte formato:
        {{
            "title": "Título do vídeo (máximo 100 caracteres)",
            "description": "Descrição completa para o vídeo, incluindo timestamps e call to action",
            "tags": ["tag1", "tag2", "tag3", "..."] (máximo 15 tags relevantes)
        }}
        
        Não inclua nenhum texto além do JSON. Retorne o JSON válido sem formatação adicional.
        """
        
        if DEBUG:
            print(f"Gerando SEO com estilo: {style}")
            
        response = await self.generate_text(prompt, max_tokens=4096)
        
        try:
            # Limpar a resposta se necessário
            json_str = response
            if "```json" in json_str:
                json_str = json_str.split("```json")[1].split("```")[0].strip()
            elif "```" in json_str:
                json_str = json_str.split("```")[1].split("```")[0].strip()
                
            return json.loads(json_str)
        except Exception as e:
            if DEBUG:
                print(f"Erro ao processar JSON de SEO: {str(e)}")
                print(f"Resposta recebida: {response}")
            raise Exception(f"Falha ao processar resposta de SEO: {str(e)}")

    async def analyze_content(self, transcription: str) -> Dict[str, Any]:
        """Analisa o conteúdo da transcrição para extrair insights"""
        logger.info("Analisando conteúdo da transcrição")
        
        # Limitar o tamanho da transcrição
        limited_transcription = transcription[:15000]
        
        # Prompt para análise de conteúdo
        prompt = """
        Analise a transcrição a seguir e extraia os seguintes insights:
        
        1. Tópicos principais abordados
        2. Palavras-chave importantes
        3. Sentimento geral (positivo, negativo, neutro)
        4. Sugestões para melhorar o conteúdo
        5. Possíveis timestamps para os momentos mais importantes
        
        RETORNE APENAS UM OBJETO JSON com a seguinte estrutura:
        {
            "topics": ["tópico 1", "tópico 2", "..."],
            "keywords": ["palavra1", "palavra2", "..."],
            "sentiment": "positivo|negativo|neutro",
            "suggestions": ["sugestão 1", "sugestão 2", "..."],
            "important_moments": [
                {"time": "MM:SS", "description": "Descrição do momento"}
            ]
        }
        
        TRANSCRIÇÃO:
        """
        
        prompt += limited_transcription
        
        # Semelhante à função de SEO, mas com prompt diferente
        url = f"https://generativelanguage.googleapis.com/v1/models/{self.model}:generateContent"
        
        headers = {"Content-Type": "application/json"}
        params = {"key": self.api_key}
        data = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "temperature": 0.3,
                "maxOutputTokens": 4096
            }
        }
        
        # Fazer a requisição (código semelhante ao de generate_seo)
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(url, params=params, headers=headers, json=data) as response:
                    if response.status != 200:
                        error_text = await response.text()
                        logger.error(f"Erro na API Gemini: {response.status} - {error_text}")
                        raise Exception(f"Erro na API: {response.status} - {error_text}")
                    
                    result = await response.json()
                    
                    # Extrair a análise
                    if 'candidates' in result and len(result['candidates']) > 0:
                        candidate = result['candidates'][0]
                        if 'content' in candidate and 'parts' in candidate['content']:
                            parts = candidate['content']['parts']
                            response_text = "".join(part.get('text', '') for part in parts)
                            
                            # Extrair o JSON da resposta
                            try:
                                # Encontrar e extrair o objeto JSON
                                import re
                                json_match = re.search(r'```json\s*(.*?)\s*```', response_text, re.DOTALL)
                                
                                if json_match:
                                    json_str = json_match.group(1)
                                else:
                                    # Tentar encontrar o objeto JSON sem os delimitadores de código
                                    json_match = re.search(r'(\{.*\})', response_text, re.DOTALL)
                                    if json_match:
                                        json_str = json_match.group(1)
                                    else:
                                        json_str = response_text
                                
                                # Analisar o JSON
                                analysis_data = json.loads(json_str)
                                
                                logger.info(f"Análise de conteúdo concluída")
                                return analysis_data
                            
                            except (json.JSONDecodeError, ValueError) as e:
                                logger.error(f"Erro ao analisar JSON da resposta: {e}")
                                return {
                                    "error": str(e),
                                    "raw_response": response_text[:500]
                                }
                    
                    logger.error(f"Formato de resposta inesperado: {result}")
                    raise Exception("Formato de resposta inesperado da API Gemini")
            
        except Exception as e:
            logger.error(f"Erro ao chamar API do Gemini: {str(e)}")
            raise

# Função auxiliar para executar tarefas assíncronas
def run_async(coroutine):
    """Executa uma corotina de forma síncrona"""
    return asyncio.run(coroutine) 