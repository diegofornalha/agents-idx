import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { AudioProcessor } from './audioProcessor';
import { GeminiClient } from './geminiClient';
import { WebviewManager } from './webviewManager';
import { TranscriptionResult } from './types';
import { GEMINI_API_KEY } from './config';
import { execSync, exec } from 'child_process';

export function activate(context: vscode.ExtensionContext): void {
  try {
    // Exibir mensagem de ativação da extensão
    console.log('Extensão "Agent for YouTuber" v0.1.5 ativada');

    // Criar instância do processador de áudio
    const audioProcessor = new AudioProcessor();
    const geminiClient = new GeminiClient(context);
    const webviewManager = new WebviewManager(context);

    // Registrar comandos
    context.subscriptions.push(
      vscode.commands.registerCommand('audioTranscription.convertTranscribeAndSEO', async (uri: vscode.Uri) => {
        try {
          // Iniciar progresso
          await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: `Processando "${path.basename(uri.fsPath)}"`,
            cancellable: true
          }, async (progress, token) => {
            token.onCancellationRequested(() => {
              vscode.window.showInformationMessage('Operação cancelada pelo usuário');
              return;
            });

            progress.report({ increment: 0, message: "Iniciando..." });
            
            // Etapa 1: Converter para MP3
            progress.report({ increment: 5, message: "Convertendo para MP3..." });
            const mp3Path = await audioProcessor.processAudio(uri.fsPath);
            if (!mp3Path) {
              vscode.window.showErrorMessage(`Falha ao converter para MP3.`);
              return;
            }
            progress.report({ increment: 30, message: "Conversão concluída!" });
            
            // Etapa 2: Transcrever o áudio
            progress.report({ increment: 5, message: "Transcrevendo o áudio..." });
            const transcription = await geminiClient.transcribeAudio(mp3Path);
            if (!transcription) {
              vscode.window.showErrorMessage(`Falha ao transcrever o áudio.`);
              return;
            }
            
            // Salvar a transcrição
            const transcriptionPath = mp3Path.replace('.mp3', '.txt');
            fs.writeFileSync(transcriptionPath, transcription);
            progress.report({ increment: 30, message: "Transcrição concluída!" });
            
            // Etapa 3: Gerar SEO
            progress.report({ increment: 5, message: "Gerando SEO..." });
            
            // Usar sempre o estilo clickbait sem mostrar seleção
            const selectedStyle = 'clickbait';
            
            // Gerar SEO com o estilo selecionado
            const seoData = await geminiClient.generateSEO(transcription, selectedStyle);
            if (!seoData) {
              vscode.window.showErrorMessage(`Falha ao gerar SEO.`);
              return;
            }
            
            // Criar um arquivo com os dados de SEO
            const seoPath = transcriptionPath.replace('.txt', '-seo.json');
            fs.writeFileSync(seoPath, JSON.stringify(seoData, null, 2));
            
            progress.report({ increment: 25, message: "SEO gerado com sucesso!" });
            
            // Abrir os arquivos gerados
            setTimeout(async () => {
              // Abrir o arquivo de transcrição
              let document = await vscode.workspace.openTextDocument(vscode.Uri.file(transcriptionPath));
              await vscode.window.showTextDocument(document);
              
              // Abrir o arquivo de SEO em outra aba
              document = await vscode.workspace.openTextDocument(vscode.Uri.file(seoPath));
              await vscode.window.showTextDocument(document, { viewColumn: vscode.ViewColumn.Beside });
            }, 500);
            
            progress.report({ increment: 5, message: "Concluído!" });
            
            // Resumo do título gerado
            vscode.window.showInformationMessage(`Título gerado: ${seoData.title}`);
          });
        } catch (error) {
          vscode.window.showErrorMessage(`Erro: ${error instanceof Error ? error.message : String(error)}`);
        }
      })
    );
  } catch (error) {
    console.error('Erro ao ativar a extensão:', error);
  }
}

export function deactivate(): void {
  console.log('Extensão "Agent for YouTuber" desativada');
} 