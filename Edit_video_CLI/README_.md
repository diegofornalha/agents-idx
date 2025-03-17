## EDIT VIDEO CLI

Este é um aplicativo de linha de comando para transcrição automática de áudio e geração de SEO para YouTube.

### Instalação

```bash
pip install -r requirements.txt
```

### Uso

O aplicativo oferece dois comandos principais:

#### Transcrição de Áudio

```bash
python -m src.main transcribe <arquivo_audio>
```

Opções:
- `--output`, `-o`: Arquivo de saída para a transcrição

#### Geração de SEO para YouTube

```bash
python -m src.main seo <arquivo_transcricao>
```

Opções:
- `--style`, `-s`: Estilo do SEO (clickbait, professional, educational, neutral)
- `--output`, `-o`: Arquivo de saída para o SEO (formato JSON)

### Requisitos

- Python 3.8+
- Chave API do Gemini (configurada como variável de ambiente `GEMINI_API_KEY`)

### Extensão VSCode

Este projeto tem uma extensão para VSCode disponível separadamente em [Edit_video_Extension](../Edit_video_Extension). 
A extensão oferece uma interface gráfica para as mesmas funcionalidades disponíveis no CLI, permitindo 
transcrever áudio e gerar SEO diretamente no VSCode.

### Estrutura do Projeto

```
Edit_video_CLI/
├── src/
│   ├── cli/        # Comandos da linha de comando
│   ├── core/       # Funcionalidades principais
│   ├── llm/        # Integração com modelos de linguagem
│   └── utils/      # Utilitários gerais
├── tests/          # Testes automatizados
└── requirements.txt
```

# Editor de Vídeo CLI

## 📝 Sobre o Projeto

### Visão Geral
Um editor de vídeo poderoso baseado em linha de comando (CLI) especializado para manipular gravações do ScreenStudio.

### Recursos Principais
- 🎥 Processamento de vídeo da webcam (`channel-3-webcam-0.mp4`)
- 🖥️ Manipulação de captura de tela (`channel-1-display-0.mp4`)
- 🎤 Edição de áudio do microfone (`channel-2-microphone-0.m4a`)
- 🖱️ Visualização de interações (cliques, movimentos do mouse e teclas)
- 📝 Transcrição inteligente com Gemini AI
- 🎯 Otimização de SEO para YouTube

## 🏗 Arquitetura

### Estrutura de Diretórios
```
video-editor-cli/
├── src/
│   ├── core/           # Processamento principal
│   │   ├── video_processor.py
│   │   ├── audio_processor.py
│   │   └── metadata_handler.py
│   ├── utils/          # Ferramentas auxiliares
│   │   ├── ffmpeg_wrapper.py
│   │   ├── file_handler.py
│   │   └── seo_optimizer.py    # Otimização de SEO
│   ├── llm/            # Integração com IA
│   │   ├── factory.py
│   │   └── gemini.py
│   ├── extension/      # Integração com VSCode
│   │   ├── transcribe.js  # Transcrição na extensão
│   │   └── seo.js         # SEO na extensão
│   └── cli/            # Interface de comando
│       └── commands.py
└── tests/              # Testes automatizados
```

### Componentes Principais
1. **Core**: Núcleo de processamento
   - Video Processor: Manipulação de vídeo
   - Audio Processor: Processamento de áudio
   - Metadata Handler: Gestão de metadados

2. **Utils**: Utilitários
   - FFmpeg Wrapper: Interface com FFmpeg
   - File Handler: Gerenciamento de arquivos

3. **CLI**: Interface de comando
   - Commands: Implementação dos comandos

4. **Extension**: Integração com VSCode
   - Transcrição de áudio com Gemini
   - Geração de SEO otimizado

## 🚀 Começando

### Requisitos do Sistema
- Sistema Operacional: macOS
- Python 3.8+
- FFmpeg


### Dependências
```
moviepy==1.0.3         # Processamento de vídeo
ffmpeg-python==0.2.0   # Interface com FFmpeg
click==8.1.7          # Interface CLI
rich==13.7.0          # Formatação de saída
aiohttp==3.9.1        # Cliente HTTP assíncrono
python-dotenv==1.0.0  # Variáveis de ambiente
pydub==0.25.1         # Processamento de áudio
numpy==1.24.3         # Computação numérica
```

### Exemplos de Uso

1. **Edição**
```bash
# Remover silêncios
video-editor remove-silence \
    --min-duration 0.5 \
    --sensitivity 0.7

# Adicionar PiP
video-editor edit --pip-webcam \
    --position "bottom-right"
```

2. **Exportação**
```bash
video-editor export \
    --format mp4 \
    --quality high
```

#### Automação via Script
```bash
#!/bin/bash
video-editor batch-process \
    --input-dir "./gravacoes" \
    --output-dir "./editados" \
    --config "config.yaml"
```

## 🎯 Funcionalidades

### Core (Núcleo)
- [ ] Extração de metadados
- [ ] Remoção de silêncio
- [ ] Cortes básicos
- [ ] Sincronização
- [ ] Transcrição de áudio com IA
- [ ] Decupagem inteligente de áudio
- [ ] Geração de SEO otimizado

### Transcrição e SEO no CLI
```bash
# Transcrever áudio com decupagem inteligente
video-editor transcribe \
    --input "channel-2-microphone-0.m4a" \
    --min-silence 500 \
    --silence-threshold -40

# Gerar SEO otimizado
video-editor generate-seo \
    --input "decupagem_metadata.json" \
    --platform youtube \
    --style "clickbait" \
    --language "pt-br"
```

## 🧩 Extensão VSCode

### Recursos da Extensão
- 📝 Transcrição de áudio diretamente no VSCode
- 🎯 Geração de SEO para YouTube
- 📊 Visualização de metadados da transcrição
- 🔄 Integração com o fluxo de trabalho de edição

### Comandos da Extensão
- `Transcrever Áudio`: Transcrição de áudios usando Gemini AI
- `Gerar SEO`: Criação de títulos, descrições e tags otimizados

### Como Usar a Extensão

1. **Transcrevendo Áudio**
   - Abra a paleta de comandos (Ctrl+Shift+P)
   - Digite "Transcrever Áudio"
   - Selecione o arquivo de áudio
   - Ajuste os parâmetros de transcrição
   - A transcrição será exibida em um novo arquivo

2. **Gerando SEO**
   - Com uma transcrição aberta, abra a paleta de comandos
   - Digite "Gerar SEO"
   - Selecione o estilo (clickbait, profissional)
   - O resultado será exibido em um arquivo JSON

### Configuração da Extensão
```json
{
  "videoEditor.transcription": {
    "minSilence": 500,
    "silenceThreshold": -40,
    "keepSilence": 100
  },
  "videoEditor.seo": {
    "defaultStyle": "clickbait",
    "defaultPlatform": "youtube"
  }
}
```

## ⚙️ Configuração do CLI

### Config Padrão
```yaml
export:
  default_format: "mp4"
  quality_presets:
    youtube: 
      codec: "h264"
      bitrate: "6M"
    twitter:
      codec: "h264"
      bitrate: "4M"

silence_detection:
  min_duration: 0.5
  sensitivity: 0.7
  
pip:
  default_position: "bottom-right"
  default_size: 0.25

seo_optimization:
  youtube:
    title_max_length: 70
    description_max_length: 5000
    tags_max_count: 500
    clickbait_level: "moderate"  # none, light, moderate, aggressive
    
  styles:
    clickbait:
      patterns:
        - "VOCÊ NÃO VAI ACREDITAR"
        - "REVELADO:"
        - "O SEGREDO QUE"
      emojis: true
      caps_ratio: 0.3  # Proporção de palavras em maiúsculas
    
    professional:
      patterns:
        - "Como fazer"
        - "Tutorial"
        - "Guia completo"
      emojis: false
      caps_ratio: 0.1

transcription:
  chunk_size: 60000  # 60 segundos
  min_silence: 500   # 500ms
  silence_threshold: -40  # -40 dBFS
  keep_silence: 100  # 100ms
```

### Exemplo de Saída SEO
```json
{
  "title": "🔥 REVELADO: O SEGREDO Por Trás do Python que NINGUÉM te Conta!",
  "description": "Neste vídeo incrível, você vai descobrir os segredos mais bem guardados da programação Python que podem transformar sua carreira! 🚀\n\nTópicos abordados:\n00:00 - Introdução\n01:23 - O segredo revelado\n...",
  "tags": [
    "python programming",
    "python secrets",
    "python tutorial",
    "programação python",
    "dicas python"
  ],
  "timestamps": [
    {
      "time": "00:00",
      "title": "Introdução explosiva",
      "description": "Revelando o que você vai aprender"
    }
  ]
}
```

### Variáveis de Ambiente
```bash
VIDEO_EDITOR_CONFIG=/path/to/config.yaml
FFMPEG_PATH=/usr/local/bin/ffmpeg
GEMINI_API_KEY=sua_chave_api_aqui
DEBUG_MODE=1
```

---

<p align="center">
  <b>Desenvolvido com ❤️ por Diego Fornalha</b><br>
  <a href="https://github.com/diegofornalha">GitHub</a> | 
  <a href="https://linkedin.com/in/diegofornalha">LinkedIn</a>
</p> 