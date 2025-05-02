# Editor de Vídeo CLI

Uma ferramenta de linha de comando para processamento de vídeo, transcrição e geração de SEO para YouTube.

## Instalação

```bash
# Clone o repositório
git clone https://github.com/yourusername/edit_video_cli.git
cd edit_video_cli

# Instale as dependências
pip install -e .
```

## Configuração

Copie o arquivo de exemplo `.env.example` para `.env` e adicione sua chave API do Gemini:

```bash
cp .env.example .env
# Edite o arquivo .env com sua chave API
```

Obtenha sua chave API em: https://aistudio.google.com/app/apikey

## Comandos disponíveis

### Processamento de Vídeo

```bash
# Processar uma gravação do ScreenStudio
edit-video process /caminho/para/gravacao /caminho/para/saida.mp4

# Analisar uma gravação do ScreenStudio 
edit-video analyze /caminho/para/gravacao
```

### Processamento de Áudio

```bash
# Remover silêncio de um arquivo de áudio
edit-video remove-silence /caminho/para/audio.mp3 /caminho/para/saida.mp3

# Detectar períodos de silêncio em um arquivo de áudio
edit-video detect-silence /caminho/para/audio.mp3
```

### Transcrição e SEO

```bash
# Transcrever um arquivo de áudio
edit-video transcribe /caminho/para/audio.mp3

# Gerar SEO para YouTube com base em uma transcrição
edit-video seo /caminho/para/transcricao.txt --style clickbait
```

### Comando Completo (estilo extensão VS Code)

```bash
# Converter, transcrever e gerar SEO em uma só operação (similar à extensão VS Code)
edit-video converter-transcrever-seo /caminho/para/arquivo.mp4 --style clickbait
```

Este comando faz exatamente a mesma coisa que a extensão VS Code "Agent for YouTuber":
1. Converte o arquivo para MP3 (se não for MP3)
2. Transcreve o áudio usando a API Gemini
3. Gera SEO para YouTube com base na transcrição

## Requisitos

- Python 3.8+
- FFmpeg instalado no sistema 