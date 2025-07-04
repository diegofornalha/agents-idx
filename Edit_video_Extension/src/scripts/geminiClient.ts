import * as vscode from 'vscode';
import axios from 'axios';
import * as fs from 'fs';
import { GEMINI_API_KEY } from './config';

export class GeminiClient {
  private context: vscode.ExtensionContext;
  private baseUrl = 'https://generativelanguage.googleapis.com/v1beta';
  private preferredModels: string[] = ['gemini-1.5-pro', 'gemini-pro', 'gemini-1.0-pro'];
  private currentModelIndex = 0;
  private apiKey: string;
  private transcriptionLanguage: string;
  
  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    
    // Configuração de modelos preferenciais
    const config = vscode.workspace.getConfiguration('audioTranscription');
    const preferredModelsConfig = config.get<string>('gemini.preferredModels');
    if (preferredModelsConfig) {
      this.preferredModels = preferredModelsConfig.split(',').map(m => m.trim());
    }

    // Obter a API key do arquivo de configuração
    this.apiKey = GEMINI_API_KEY;
    
    // Configurações
    this.transcriptionLanguage = config.get('transcription.language') || 'pt-BR';
  }
  
  /**
   * Obtém o modelo atual a ser usado
   */
  get currentModel(): string {
    return this.preferredModels[this.currentModelIndex];
  }
  
  /**
   * Tenta usar o próximo modelo disponível
   * @returns true se há outro modelo disponível, false caso contrário
   */
  private tryNextModel(): boolean {
    if (this.currentModelIndex < this.preferredModels.length - 1) {
      this.currentModelIndex++;
      return true;
    }
    return false;
  }
  
  /**
   * Reseta o índice para o primeiro modelo
   */
  private resetModelIndex(): void {
    this.currentModelIndex = 0;
  }
  
  /**
   * Transcreve o conteúdo de um arquivo de áudio MP3
   * @param filePath Caminho do arquivo de áudio
   * @returns Texto transcrito ou null se falhou
   */
  public async transcribeAudio(filePath: string): Promise<string | null> {
    try {
      // Obter o conteúdo do arquivo como base64
      const audioBuffer = fs.readFileSync(filePath);
      const audioBase64 = audioBuffer.toString('base64');
      
      // Log para indicar progresso
      vscode.window.showInformationMessage(`Enviando áudio para transcrição (${Math.round(audioBuffer.length / 1024)} KB)`);
      
      // Reset model index before starting
      this.resetModelIndex();
      
      // Tentar cada modelo disponível
      let transcription = '';
      let success = false;
      let lastError: Error | null = null;
      
      while (!success) {
        try {
          const model = this.currentModel;
          vscode.window.showInformationMessage(`Tentando transcrever com modelo: ${model}`);
          
          // Modelo Gemini API para transcrição
          const url = `${this.baseUrl}/models/${model}:generateContent?key=${this.apiKey}`;
          
          const response = await axios.post(url, {
            contents: [
              {
                role: 'user',
                parts: [
                  {
                    inlineData: {
                      mimeType: 'audio/mp3',
                      data: audioBase64
                    }
                  },
                  {
                    text: `Por favor, transcreva este áudio em ${this.transcriptionLanguage}. Formate o texto de maneira limpa e legível, com parágrafos adequados. Inclua apenas a transcrição, sem comentários adicionais.`
                  }
                ]
              }
            ],
            generationConfig: {
              temperature: 0.2,
              topP: 0.8,
              topK: 40
            }
          });

          if (response.data.candidates && response.data.candidates.length > 0) {
            transcription = response.data.candidates[0].content.parts[0].text;
            vscode.window.showInformationMessage(`Transcrição concluída com sucesso (${transcription.length} caracteres)`);
            success = true;
          } else {
            throw new Error('Resposta da API sem conteúdo válido');
          }
        } catch (error: any) {
          lastError = error instanceof Error ? error : new Error(String(error));
          console.error('Erro na transcrição:', error);
          
          if (!this.tryNextModel()) {
            // Não há mais modelos para tentar
            break;
          }
          
          // Aviso que estamos tentando outro modelo
          vscode.window.showInformationMessage(`Tentando com modelo alternativo: ${this.currentModel}`);
        }
      }
      
      if (!success) {
        if (axios.isAxiosError(lastError) && lastError.response) {
          vscode.window.showErrorMessage(`Erro da API Gemini: ${JSON.stringify(lastError.response.data)}`);
        } else {
          vscode.window.showErrorMessage(`Erro ao transcrever: ${lastError instanceof Error ? lastError.message : String(lastError)}`);
        }
        return null;
      }
      
      return transcription;
    } catch (error: any) {
      console.error('Erro ao transcrever áudio:', error);
      vscode.window.showErrorMessage(`Erro ao transcrever: ${error.message || 'Erro desconhecido'}`);
      
      if (error.response?.data?.error?.message) {
        vscode.window.showErrorMessage(`API Gemini: ${error.response.data.error.message}`);
      }
      
      return null;
    }
  }

  /**
   * Gera SEO para YouTube a partir de uma transcrição
   * @param transcription Texto da transcrição
   * @param style Estilo de SEO (clickbait, educational)
   * @returns Objeto com título, descrição e tags ou null se houver falha
   */
  public async generateSEO(transcription: string, style = 'clickbait'): Promise<any | null> {
    try {
      const styles: {[key: string]: string} = {
        clickbait: 'atraente e popular, com títulos chamativos que geram muitos cliques',
        educational: 'educacional e detalhado, focado em fornecer valor informativo'
      };
      
      const selectedStyle = styles[style] || styles.clickbait;
      
      // Limitar o tamanho da transcrição para evitar erros de tamanho
      const maxLength = 16000;
      const truncatedTranscription = transcription.length > maxLength 
        ? transcription.substring(0, maxLength) + '... (texto truncado devido ao tamanho)'
        : transcription;
      
      vscode.window.showInformationMessage(`Gerando SEO com estilo: ${style}`);
      
      // Reset model index before starting
      this.resetModelIndex();
      
      // Tentar cada modelo disponível
      let seoData: any = null;
      let success = false;
      let lastError: Error | null = null;
      
      while (!success) {
        try {
          const model = this.currentModel;
          vscode.window.showInformationMessage(`Tentando gerar SEO com modelo: ${model}`);
          
          // Modelo Gemini API para geração de SEO
          const url = `${this.baseUrl}/models/${model}:generateContent?key=${this.apiKey}`;
          
          const response = await axios.post(url, {
            contents: [
              {
                role: 'user',
                parts: [
                  {
                    text: `Baseado nesta transcrição, gere um título, descrição e tags para YouTube. O estilo deve ser ${selectedStyle}. 
                    
Transcrição:
${truncatedTranscription}

Responda APENAS com um objeto JSON válido no seguinte formato, sem explicações adicionais:
{
  "title": "Título atraente para o vídeo, máximo 60 caracteres",
  "description": "Descrição envolvente com 1-2 parágrafos e call to action",
  "tags": ["tag1", "tag2", "tag3", ... ] // 7-10 tags relevantes
}
`
                  }
                ]
              }
            ],
            generationConfig: {
              temperature: 0.7,
              topP: 0.9,
              topK: 40
            }
          });

          if (response.data.candidates && response.data.candidates.length > 0) {
            const seoText = response.data.candidates[0].content.parts[0].text;
            
            // Extrai o objeto JSON da resposta
            const jsonMatch = seoText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              seoData = JSON.parse(jsonMatch[0]);
              vscode.window.showInformationMessage(`SEO gerado com sucesso! Título: "${seoData.title.substring(0, 30)}..."`);
              success = true;
            } else {
              throw new Error('Formato de resposta inválido');
            }
          } else {
            throw new Error('Resposta da API sem conteúdo válido');
          }
        } catch (error: any) {
          lastError = error instanceof Error ? error : new Error(String(error));
          console.error('Erro na geração de SEO:', error);
          
          if (!this.tryNextModel()) {
            // Não há mais modelos para tentar
            break;
          }
          
          // Aviso que estamos tentando outro modelo
          vscode.window.showInformationMessage(`Tentando com modelo alternativo: ${this.currentModel}`);
        }
      }
      
      if (!success) {
        if (axios.isAxiosError(lastError) && lastError.response) {
          vscode.window.showErrorMessage(`Erro da API Gemini: ${JSON.stringify(lastError.response.data)}`);
        } else {
          vscode.window.showErrorMessage(`Erro ao gerar SEO: ${lastError instanceof Error ? lastError.message : String(lastError)}`);
        }
        return null;
      }
      
      return seoData;
    } catch (error: any) {
      console.error('Erro ao gerar SEO:', error);
      vscode.window.showErrorMessage(`Erro ao gerar SEO: ${error.message || 'Erro desconhecido'}`);
      
      if (error.response?.data?.error?.message) {
        vscode.window.showErrorMessage(`API Gemini: ${error.response.data.error.message}`);
      }
      
      return null;
    }
  }
} 