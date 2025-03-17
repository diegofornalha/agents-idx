import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { TranscriptionResult } from './types';

export class WebviewManager {
  private context: vscode.ExtensionContext;
  private panel: vscode.WebviewPanel | undefined;
  
  constructor(context: vscode.ExtensionContext) {
    this.context = context;
  }
  
  /**
   * Mostra os resultados da transcrição em uma webview
   */
  public showTranscription(transcription: TranscriptionResult, title: string): void {
    const columnToShowIn = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;
    
    if (this.panel) {
      this.panel.reveal(columnToShowIn);
    } else {
      this.panel = vscode.window.createWebviewPanel(
        'audioTranscriptionResults',
        `Transcrição: ${title}`,
        columnToShowIn || vscode.ViewColumn.One,
        {
          enableScripts: true,
          retainContextWhenHidden: true,
          localResourceRoots: [
            vscode.Uri.file(path.join(this.context.extensionPath, 'media'))
          ]
        }
      );
      
      this.panel.onDidDispose(
        () => {
          this.panel = undefined;
        },
        null,
        this.context.subscriptions
      );
    }
    
    this.panel.webview.html = this.generateHtml(transcription);
    
    this.panel.webview.onDidReceiveMessage(async (message: any) => {
      switch (message.command) {
        case 'save':
          await this.saveContentAsFile(message.content, message.fileType);
          return;
      }
    }, undefined, this.context.subscriptions);
  }
  
  /**
   * Salva o conteúdo como um arquivo
   */
  private async saveContentAsFile(content: string, fileType: string): Promise<void> {
    try {
      // Determinar o tipo de arquivo e extensão
      const fileExtension = fileType === 'markdown' ? 'md' : 'txt';
      
      // Solicitar ao usuário onde salvar o arquivo
      const uri = await vscode.window.showSaveDialog({
        filters: {
          [fileType === 'markdown' ? 'Markdown' : 'Texto']: [fileExtension]
        },
        saveLabel: 'Salvar como'
      });
      
      if (uri) {
        // Escrever o conteúdo no arquivo
        fs.writeFileSync(uri.fsPath, content);
        vscode.window.showInformationMessage(`Arquivo salvo como: ${uri.fsPath}`);
      }
    } catch (error) {
      vscode.window.showErrorMessage(`Erro ao salvar arquivo: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Gera o HTML para a webview
   */
  private generateHtml(transcription: TranscriptionResult): string {
    return `<!DOCTYPE html>
    <html lang="pt-br">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Resultado da Transcrição</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          padding: 0 20px;
          color: var(--vscode-foreground);
          background-color: var(--vscode-editor-background);
        }
        .container {
          max-width: 800px;
          margin: 0 auto;
        }
        .header {
          text-align: center;
          margin-bottom: 20px;
          padding: 10px;
        }
        h1 {
          font-size: 24px;
          margin-bottom: 10px;
        }
        .transcription {
          background-color: var(--vscode-editor-inactiveSelectionBackground);
          border-radius: 5px;
          padding: 15px;
          margin-bottom: 20px;
          white-space: pre-wrap;
          line-height: 1.5;
        }
        .actions {
          display: flex;
          gap: 10px;
          margin-bottom: 20px;
        }
        button {
          background-color: var(--vscode-button-background);
          color: var(--vscode-button-foreground);
          border: none;
          padding: 8px 12px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
        }
        button:hover {
          background-color: var(--vscode-button-hoverBackground);
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Resultado da Transcrição</h1>
        </div>
        
        <div class="actions">
          <button id="copyTranscription">Copiar Transcrição</button>
          <button id="saveAsTxt">Salvar como TXT</button>
          <button id="saveAsMd">Salvar como Markdown</button>
        </div>
        
        <h2>Transcrição</h2>
        <div class="transcription" id="transcriptionText">
          ${transcription.text}
        </div>
      </div>
      
      <script>
        (function() {
          const vscode = acquireVsCodeApi();
          
          document.getElementById('copyTranscription').addEventListener('click', () => {
            const text = document.getElementById('transcriptionText').innerText;
            navigator.clipboard.writeText(text)
              .then(() => alert('Transcrição copiada para a área de transferência!'))
              .catch(err => console.error('Erro ao copiar: ', err));
          });
          
          document.getElementById('saveAsTxt').addEventListener('click', () => {
            const text = document.getElementById('transcriptionText').innerText;
            vscode.postMessage({
              command: 'save',
              content: text,
              fileType: 'text'
            });
          });
          
          document.getElementById('saveAsMd').addEventListener('click', () => {
            const text = document.getElementById('transcriptionText').innerText;
            vscode.postMessage({
              command: 'save',
              content: text,
              fileType: 'markdown'
            });
          });
        })();
      </script>
    </body>
    </html>`;
  }

  /**
   * Exibe o resultado da geração de SEO em um webview
   * @param seoData Dados de SEO gerados (título, descrição, tags)
   * @param fileName Nome do arquivo de transcrição
   */
  public showSEO(seoData: any, fileName: string): void {
    // Cria e exibe o webview
    const panel = vscode.window.createWebviewPanel(
      'audioTranscription.seo',
      `SEO do YouTube: ${fileName}`,
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true
      }
    );

    // Constrói o HTML do webview
    panel.webview.html = this.getSEOWebviewContent(seoData, fileName);
  }

  /**
   * Gera o conteúdo HTML para o webview de SEO
   * @param seoData Dados de SEO gerados (título, descrição, tags)
   * @param fileName Nome do arquivo de transcrição
   * @returns HTML do webview
   */
  private getSEOWebviewContent(seoData: any, fileName: string): string {
    // Processar as tags para exibição
    const tagsHtml = Array.isArray(seoData.tags) 
      ? seoData.tags.map((tag: string) => `<span class="tag">${tag}</span>`).join(' ')
      : '';

    // Processar a descrição para formatação
    const formattedDescription = seoData.description
      ? seoData.description.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\*(.*?)\*/g, '<em>$1</em>')
      : '';

    return `<!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>SEO do YouTube: ${fileName}</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
          padding: 20px;
          line-height: 1.6;
          color: var(--vscode-editor-foreground);
          background-color: var(--vscode-editor-background);
        }
        h1, h2 {
          color: var(--vscode-titleBar-activeBackground);
          border-bottom: 1px solid var(--vscode-tab-border);
          padding-bottom: 10px;
        }
        .seo-container {
          margin-top: 20px;
          padding: 15px;
          background-color: var(--vscode-editor-background);
          border-radius: 5px;
          border: 1px solid var(--vscode-tab-border);
        }
        .section {
          margin-bottom: 20px;
        }
        .section-title {
          font-weight: bold;
          color: var(--vscode-textLink-foreground);
          margin-bottom: 10px;
        }
        .title-box {
          font-size: 1.2em;
          padding: 10px;
          background-color: var(--vscode-editorWidget-background);
          border-radius: 3px;
          margin-bottom: 15px;
        }
        .description-box {
          padding: 10px;
          background-color: var(--vscode-editorWidget-background);
          border-radius: 3px;
          white-space: pre-wrap;
        }
        .tag {
          display: inline-block;
          padding: 5px 10px;
          margin: 3px;
          background-color: var(--vscode-button-background);
          color: var(--vscode-button-foreground);
          border-radius: 15px;
          font-size: 0.9em;
        }
        .copy-button {
          background-color: var(--vscode-button-background);
          color: var(--vscode-button-foreground);
          border: none;
          padding: 5px 10px;
          border-radius: 3px;
          cursor: pointer;
          margin-top: 5px;
        }
        .copy-button:hover {
          background-color: var(--vscode-button-hoverBackground);
        }
      </style>
    </head>
    <body>
      <h1>SEO do YouTube: ${fileName}</h1>
      <div class="seo-container">
        <div class="section">
          <div class="section-title">Título do Vídeo:</div>
          <div class="title-box">${seoData.title || 'Não foi possível gerar um título'}</div>
          <button class="copy-button" onclick="copyToClipboard('title-content')">Copiar Título</button>
          <div id="title-content" style="display:none">${seoData.title || ''}</div>
        </div>
        
        <div class="section">
          <div class="section-title">Descrição:</div>
          <div class="description-box">${formattedDescription || 'Não foi possível gerar uma descrição'}</div>
          <button class="copy-button" onclick="copyToClipboard('description-content')">Copiar Descrição</button>
          <div id="description-content" style="display:none">${seoData.description || ''}</div>
        </div>
        
        <div class="section">
          <div class="section-title">Tags:</div>
          <div class="tags-box">
            ${tagsHtml || 'Não foi possível gerar tags'}
          </div>
          <button class="copy-button" onclick="copyToClipboard('tags-content')">Copiar Tags</button>
          <div id="tags-content" style="display:none">${Array.isArray(seoData.tags) ? seoData.tags.join(', ') : ''}</div>
        </div>
      </div>
      
      <script>
        function copyToClipboard(elementId) {
          const el = document.getElementById(elementId);
          const content = el.textContent;
          
          navigator.clipboard.writeText(content).then(() => {
            // Criar elemento temporário para notificação
            const notification = document.createElement('div');
            notification.textContent = 'Copiado para a área de transferência!';
            notification.style.position = 'fixed';
            notification.style.bottom = '20px';
            notification.style.right = '20px';
            notification.style.backgroundColor = 'var(--vscode-notificationToast-background)';
            notification.style.color = 'var(--vscode-notificationToast-foreground)';
            notification.style.padding = '10px 15px';
            notification.style.borderRadius = '4px';
            notification.style.zIndex = '1000';
            notification.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.3)';
            
            document.body.appendChild(notification);
            
            // Remover após 2 segundos
            setTimeout(() => {
              document.body.removeChild(notification);
            }, 2000);
          }).catch(err => {
            console.error('Erro ao copiar para a área de transferência: ', err);
          });
        }
      </script>
    </body>
    </html>`;
  }
} 