import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { spawn } from 'child_process';
import { TranscriptionSettings } from './types';
import * as cp from 'child_process';
import { promisify } from 'util';

export class AudioProcessor {
  private settings: TranscriptionSettings;
  private exec = promisify(cp.exec);

  constructor() {
    // Inicialização do processador de áudio
    const config = vscode.workspace.getConfiguration('audioTranscription.transcription');
    this.settings = {
      minSilence: config.get('minSilence') || 500,
      silenceThreshold: config.get('silenceThreshold') || -30,
      language: config.get('language') || 'pt-BR',
      segments: config.get('segments') || true
    };
    
    // Verificar se o ffmpeg está disponível
    this.checkFfmpeg();
  }
  
  /**
   * Verifica se o ffmpeg está instalado no sistema
   */
  private async checkFfmpeg(): Promise<void> {
    try {
      await this.exec('ffmpeg -version');
    } catch (error) {
      vscode.window.showErrorMessage(
        'FFmpeg não encontrado. Para usar esta extensão, você precisa instalar o FFmpeg. ' +
        'Visite https://ffmpeg.org/download.html para instruções de instalação.'
      );
    }
  }

  /**
   * Processa um arquivo de áudio ou vídeo, convertendo para MP3 se necessário
   * @param filePath Caminho para o arquivo a ser processado
   * @returns Caminho para o arquivo MP3 resultante ou false se falhar
   */
  public async processAudio(filePath: string): Promise<string | false> {
    try {
      // Verificar se o arquivo existe
      if (!fs.existsSync(filePath)) {
        vscode.window.showErrorMessage(`Arquivo não encontrado: ${filePath}`);
        return false;
      }

      // Verificar a extensão do arquivo
      const fileExt = path.extname(filePath).toLowerCase();
      
      // Se já for MP3, retornar o caminho diretamente
      if (fileExt === '.mp3') {
        return filePath;
      }
      
      // Verificar se é um formato de áudio ou vídeo suportado
      const supportedAudioFormats = ['.m4a', '.wav', '.ogg', '.flac'];
      const supportedVideoFormats = ['.mp4', '.avi', '.mov', '.mkv', '.webm'];
      const isVideo = supportedVideoFormats.includes(fileExt);
      const isAudio = supportedAudioFormats.includes(fileExt);
      
      if (!isAudio && !isVideo) {
        vscode.window.showErrorMessage(`Formato não suportado: ${fileExt}`);
        return false;
      }
      
      // Processar o arquivo de acordo com o tipo
      if (isVideo) {
        const mp3Path = await this.extractAudioFromVideo(filePath);
        if (!mp3Path) {
          return false;
        }
        return mp3Path;
      } else {
        return this.convertToMp3(filePath);
      }
    } catch (error) {
      vscode.window.showErrorMessage(`Erro ao processar o arquivo: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }

  /**
   * Extrai o áudio de um arquivo de vídeo para MP3
   * @param videoFilePath Caminho para o arquivo de vídeo
   * @returns Caminho para o arquivo MP3 resultante ou false se falhar
   */
  public async extractAudioFromVideo(videoFilePath: string): Promise<string | false> {
    try {
      // Verificar se o arquivo existe
      if (!fs.existsSync(videoFilePath)) {
        vscode.window.showErrorMessage(`Arquivo de vídeo não encontrado: ${videoFilePath}`);
        return false;
      }

      // Gerar caminho para o arquivo MP3 de saída
      const mp3FilePath = videoFilePath.replace(/\.[^.]+$/, '.mp3');
      
      // Executar ffmpeg para extrair o áudio
      await this.exec(`ffmpeg -i "${videoFilePath}" -q:a 0 -map a "${mp3FilePath}" -y`);
      
      // Verificar se o arquivo foi criado
      if (!fs.existsSync(mp3FilePath)) {
        throw new Error('Falha ao extrair o áudio do vídeo. Arquivo MP3 não foi criado.');
      }
      
      vscode.window.showInformationMessage(`Áudio extraído com sucesso: ${mp3FilePath}`);
      return mp3FilePath;
    } catch (error) {
      vscode.window.showErrorMessage(`Erro ao extrair áudio: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }

  /**
   * Converte um arquivo de áudio para MP3
   * @param audioFilePath Caminho para o arquivo de áudio a ser convertido
   * @returns Caminho para o arquivo MP3 resultante ou false se falhar
   */
  public async convertToMp3(audioFilePath: string): Promise<string | false> {
    try {
      // Verificar se o arquivo existe
      if (!fs.existsSync(audioFilePath)) {
        vscode.window.showErrorMessage(`Arquivo de áudio não encontrado: ${audioFilePath}`);
        return false;
      }

      // Verificar se já é MP3
      if (path.extname(audioFilePath).toLowerCase() === '.mp3') {
        return audioFilePath;
      }

      // Gerar caminho para o arquivo MP3 de saída
      const mp3FilePath = audioFilePath.replace(/\.[^.]+$/, '.mp3');
      
      // Executar ffmpeg para converter o áudio
      await this.exec(`ffmpeg -i "${audioFilePath}" -codec:a libmp3lame -qscale:a 2 "${mp3FilePath}" -y`);
      
      // Verificar se o arquivo foi criado
      if (!fs.existsSync(mp3FilePath)) {
        throw new Error('Falha ao converter o áudio. Arquivo MP3 não foi criado.');
      }
      
      vscode.window.showInformationMessage(`Áudio convertido com sucesso: ${mp3FilePath}`);
      return mp3FilePath;
    } catch (error) {
      vscode.window.showErrorMessage(`Erro ao converter áudio: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }
  
  /**
   * Detecta e marca períodos de silêncio no áudio
   * Útil para criar timestamps para a transcrição
   */
  public async detectSilence(_filePath: string): Promise<number[]> {
    // Versão simplificada - implementação real usaria ffmpeg silencedetect
    vscode.window.showInformationMessage('Detectando silêncio no áudio...');
    return [];
  }
} 