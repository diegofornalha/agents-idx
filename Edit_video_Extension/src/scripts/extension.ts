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
  console.log('Extensão "Agent for YouTuber" v0.0.2 ativada');

  // Criar instância do processador de áudio
  const audioProcessor = new AudioProcessor();
  const geminiClient = new GeminiClient(context);
  const webviewManager = new WebviewManager(context);

  // Registrar comandos
  context.subscriptions.push(
    vscode.commands.registerCommand('audioTranscription.convertTranscribeAndSEO', async (uri: vscode.Uri) => {
      try {
        vscode.window.showInformationMessage(`Iniciando processamento de "${path.basename(uri.fsPath)}"...`);
        
        // Etapa 1: Converter para MP3
        vscode.window.showInformationMessage(`Convertendo para MP3...`);
        const mp3Path = await audioProcessor.processAudio(uri.fsPath);
        if (!mp3Path) {
          vscode.window.showErrorMessage(`Falha ao converter para MP3.`);
          return;
        }
        vscode.window.showInformationMessage(`Conversão para MP3 concluída: ${path.basename(mp3Path)}`);
        
        // Etapa 2: Transcrever o áudio
        vscode.window.showInformationMessage(`Transcrevendo o áudio...`);
        const transcription = await geminiClient.transcribeAudio(mp3Path);
        if (!transcription) {
          vscode.window.showErrorMessage(`Falha ao transcrever o áudio.`);
          return;
        }
        
        // Salvar a transcrição
        const transcriptionPath = mp3Path.replace('.mp3', '.txt');
        fs.writeFileSync(transcriptionPath, transcription);
        vscode.window.showInformationMessage(`Transcrição concluída e salva em: ${path.basename(transcriptionPath)}`);
        
        // Etapa 3: Gerar SEO
        vscode.window.showInformationMessage(`Gerando SEO...`);
        
        // Mostrar um dropdown para selecionar o estilo de SEO
        const seoStyles = [
          { label: 'Clickbait', description: 'Títulos impactantes e chamativos', value: 'clickbait' },
          { label: 'Educational', description: 'Conteúdo educacional e informativo', value: 'educational' }
        ];
        
        // Determinar o estilo padrão
        const config = vscode.workspace.getConfiguration('audioTranscription');
        const defaultStyle = config.get<string>('seo.defaultStyle') || 'clickbait';
        
        // Encontrar o item padrão
        const defaultItem = seoStyles.find(item => item.value === defaultStyle) || seoStyles[0];
        
        // Exibir o QuickPick
        const selectedStyle = await vscode.window.showQuickPick(seoStyles, {
          placeHolder: 'Selecione o estilo de SEO para YouTube',
          title: 'Estilo de SEO para YouTube',
          ignoreFocusOut: true
        });
        
        // Se o usuário cancelou, abortar esta etapa
        if (!selectedStyle) {
          vscode.window.showInformationMessage(`Geração de SEO cancelada pelo usuário.`);
          return;
        }
        
        // Gerar SEO com o estilo selecionado
        const seoData = await geminiClient.generateSEO(transcription, selectedStyle.value);
        if (!seoData) {
          vscode.window.showErrorMessage(`Falha ao gerar SEO.`);
          return;
        }
        
        // Criar um arquivo com os dados de SEO
        const seoPath = transcriptionPath.replace('.txt', '-seo.json');
        fs.writeFileSync(seoPath, JSON.stringify(seoData, null, 2));
        
        // Mostrar mensagem de sucesso
        vscode.window.showInformationMessage(`SEO gerado com sucesso! Salvo em ${path.basename(seoPath)}`);
        
        // Abrir os arquivos gerados
        setTimeout(async () => {
          // Abrir o arquivo de transcrição
          let document = await vscode.workspace.openTextDocument(vscode.Uri.file(transcriptionPath));
          await vscode.window.showTextDocument(document);
          
          // Abrir o arquivo de SEO em outra aba
          document = await vscode.workspace.openTextDocument(vscode.Uri.file(seoPath));
          await vscode.window.showTextDocument(document, { viewColumn: vscode.ViewColumn.Beside });
        }, 500);
        
        vscode.window.showInformationMessage(`Processamento completo! ✅`);
      } catch (error) {
        vscode.window.showErrorMessage(`Erro: ${error instanceof Error ? error.message : String(error)}`);
      }
    }),
    
    // Comando para Pre-Produção específico para pastas Built-in
    vscode.commands.registerCommand('audioTranscription.preProducao', async (uri: vscode.Uri) => {
      try {
        // Verificar se é uma pasta que começa com "Built-in"
        const folderName = path.basename(uri.fsPath);
        if (!folderName.startsWith('Built-in')) {
          vscode.window.showErrorMessage('Este comando só funciona em pastas que começam com "Built-in"');
          return;
        }
        
        vscode.window.showInformationMessage(`Organizando pasta para pré-produção: ${folderName}`);
        
        // Executar o comando CLI "pre-producao"
        const terminalName = 'Pre-Producao';
        let terminal = vscode.window.terminals.find(t => t.name === terminalName);
        
        if (!terminal) {
          terminal = vscode.window.createTerminal(terminalName);
        }
        
        // Ativar o terminal
        terminal.show();
        
        // Executar o script preproducao.sh com o caminho da pasta
        const scriptPath = context.asAbsolutePath(path.join('resources', 'preproducao.sh'));
        const comando = `${scriptPath} "${uri.fsPath}"`;
        terminal.sendText(comando);
        
        vscode.window.showInformationMessage(`Script de pré-produção iniciado para a pasta "${folderName}". Acompanhe o progresso no terminal.`);
      } catch (error) {
        vscode.window.showErrorMessage(`Erro ao processar pasta: ${error instanceof Error ? error.message : String(error)}`);
      }
    })
  );
}

export function deactivate(): void {
  console.log('Extensão "Agent for YouTuber" desativada');
} 