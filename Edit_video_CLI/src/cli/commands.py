"""Comandos do CLI para o Editor de Vídeo"""
import os
import sys
import logging
import json
import re
import shutil
import subprocess
from pathlib import Path
from typing import Optional, List

import click
from rich.console import Console
from rich.progress import Progress, SpinnerColumn, TextColumn, BarColumn, TimeElapsedColumn
from rich.table import Table
from rich import print as rprint

from ..core import transcription, seo_generator
from ..utils import file_utils

# Configurar logger
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)

logger = logging.getLogger(__name__)
console = Console()

@click.group()
@click.version_option(version="1.0.0")
def cli():
    """CLI para o Editor de Vídeo - Transcrição e SEO para YouTube"""
    pass

#
# Comandos de processamento de vídeo
#

@cli.command()
@click.argument('input_dir', type=click.Path(exists=True, file_okay=False, dir_okay=True, path_type=Path))
@click.argument('output_file', type=click.Path(dir_okay=False, path_type=Path))
@click.option('--pip-webcam/--no-pip-webcam', default=True, help='Adicionar webcam como picture-in-picture')
@click.option('--pip-position', type=click.Choice(['top-left', 'top-right', 'bottom-left', 'bottom-right', 'center']), 
              default='bottom-right', help='Posição do PiP da webcam')
def process(input_dir: Path, output_file: Path, pip_webcam: bool, pip_position: str):
    """Processa uma gravação do ScreenStudio combinando todos os canais."""
    try:
        with Progress(
            SpinnerColumn(),
            TextColumn("[bold blue]{task.description}"),
            BarColumn(),
            TimeElapsedColumn()
        ) as progress:
            task = progress.add_task("[cyan]Processando vídeo...", total=100)
            
            # Atualizar progresso
            progress.update(task, advance=10, description="Carregando arquivos...")
            
            processor = VideoProcessor(input_dir)
            processor.load_screenstudio_recording()
            
            # Atualizar progresso
            progress.update(task, advance=30, description="Processando vídeo...")
            
            # Processar o vídeo
            processor.process_video(output_file, pip_webcam=pip_webcam, pip_position=pip_position)
            
            # Atualizar progresso
            progress.update(task, advance=60, description="Finalizado!")
            
        console.print(f"[green]✓[/green] Vídeo processado com sucesso: [bold]{output_file}[/bold]")
        
    except Exception as e:
        console.print(f"[red]✗ Erro ao processar vídeo:[/red] {str(e)}")
        logger.exception("Erro no processamento de vídeo")
        raise click.Abort()

@cli.command()
@click.argument('input_dir', type=click.Path(exists=True, file_okay=False, dir_okay=True, path_type=Path))
@click.option('--output-file', '-o', type=click.Path(dir_okay=False, path_type=Path), 
              help='Arquivo de saída para os metadados (JSON)')
def analyze(input_dir: Path, output_file: Optional[Path] = None):
    """Analisa uma gravação do ScreenStudio e extrai metadados."""
    try:
        with Progress(
            SpinnerColumn(),
            TextColumn("[bold blue]{task.description}"),
        ) as progress:
            task = progress.add_task("[cyan]Analisando gravação...", total=None)
            
            # Criar manipulador de metadados
            metadata_handler = MetadataHandler(input_dir)
            
            # Extrair metadados
            metadata = metadata_handler.extract_screenstudio_metadata()
            
            # Se o arquivo de saída foi especificado, salvar metadados
            if output_file:
                metadata_handler.save_metadata(output_file)
                progress.update(task, description=f"Metadados salvos em {output_file}")
            
            # Gerar e exibir resumo
            summary = metadata_handler.generate_summary()
            progress.stop()
            
            console.print("\n[bold cyan]Resumo da Gravação:[/bold cyan]")
            console.print(summary)
            
    except Exception as e:
        console.print(f"[red]✗ Erro ao analisar gravação:[/red] {str(e)}")
        logger.exception("Erro na análise da gravação")
        raise click.Abort()

#
# Comandos de processamento de áudio
#

@cli.command()
@click.argument('input_file', type=click.Path(exists=True, file_okay=True, dir_okay=False, path_type=Path))
@click.argument('output_file', type=click.Path(dir_okay=False, path_type=Path))
@click.option('--min-silence', '-m', type=int, default=500, 
              help='Duração mínima do silêncio a ser removido (ms)')
@click.option('--silence-threshold', '-t', type=int, default=-40, 
              help='Limiar para detecção de silêncio (dB)')
@click.option('--keep-silence', '-k', type=int, default=100, 
              help='Quantidade de silêncio a manter em cada extremidade (ms)')
def remove_silence(input_file: Path, output_file: Path, min_silence: int, silence_threshold: int, keep_silence: int):
    """Remove períodos de silêncio de um arquivo de áudio."""
    try:
        with Progress(
            SpinnerColumn(),
            TextColumn("[bold blue]{task.description}"),
            BarColumn(),
        ) as progress:
            task = progress.add_task("[cyan]Removendo silêncio...", total=100)
            
            # Atualizar progresso
            progress.update(task, advance=10, description="Carregando áudio...")
            
            # Processar o áudio
            processor = AudioProcessor(input_file)
            processor.load_audio()
            
            # Atualizar progresso
            progress.update(task, advance=40, description="Detectando e removendo silêncio...")
            
            # Remover silêncio
            processor.remove_silence(
                output_file,
                min_silence_len=min_silence,
                silence_thresh=silence_threshold,
                keep_silence=keep_silence
            )
            
            # Atualizar progresso
            progress.update(task, advance=50, description="Finalizado!")
            
        console.print(f"[green]✓[/green] Silêncio removido com sucesso: [bold]{output_file}[/bold]")
        
    except Exception as e:
        console.print(f"[red]✗ Erro ao remover silêncio:[/red] {str(e)}")
        logger.exception("Erro na remoção de silêncio")
        raise click.Abort()

@cli.command()
@click.argument('input_file', type=click.Path(exists=True, file_okay=True, dir_okay=False, path_type=Path))
@click.option('--min-silence', '-m', type=int, default=500, 
              help='Duração mínima do silêncio a detectar (ms)')
@click.option('--silence-threshold', '-t', type=int, default=-40, 
              help='Limiar para detecção de silêncio (dB)')
@click.option('--output-file', '-o', type=click.Path(dir_okay=False, path_type=Path), 
              help='Arquivo de saída para os períodos de silêncio (JSON)')
def detect_silence(input_file: Path, min_silence: int, silence_threshold: int, output_file: Optional[Path] = None):
    """Detecta períodos de silêncio em um arquivo de áudio."""
    try:
        with Progress(
            SpinnerColumn(),
            TextColumn("[bold blue]{task.description}"),
        ) as progress:
            task = progress.add_task("[cyan]Detectando silêncio...", total=None)
            
            # Processar o áudio
            processor = AudioProcessor(input_file)
            processor.load_audio()
            
            # Detectar silêncio
            silences = processor.detect_silences(
                min_silence_len=min_silence,
                silence_thresh=silence_threshold
            )
            
            progress.stop()
            
            # Exibir resultados
            if not silences:
                console.print("[yellow]Nenhum período de silêncio detectado com os parâmetros atuais.[/yellow]")
            else:
                console.print(f"[green]Detectados [bold]{len(silences)}[/bold] períodos de silêncio:[/green]")
                
                # Criar tabela
                table = Table(show_header=True)
                table.add_column("Início (s)", justify="right")
                table.add_column("Fim (s)", justify="right")
                table.add_column("Duração (s)", justify="right")
                
                for silence in silences:
                    table.add_row(
                        f"{silence['start']:.2f}",
                        f"{silence['end']:.2f}",
                        f"{silence['duration']:.2f}"
                    )
                
                console.print(table)
                
                # Salvar em arquivo se solicitado
                if output_file:
                    with open(output_file, 'w', encoding='utf-8') as f:
                        json.dump(silences, f, indent=2)
                    console.print(f"[green]Dados de silêncio salvos em: [bold]{output_file}[/bold][/green]")
        
    except Exception as e:
        console.print(f"[red]✗ Erro ao detectar silêncio:[/red] {str(e)}")
        logger.exception("Erro na detecção de silêncio")
        raise click.Abort()

#
# Comandos de transcrição e SEO
#

@cli.command()
@click.argument('audio_file', type=click.Path(exists=True))
@click.option('--output', '-o', help='Arquivo de saída para a transcrição')
def transcribe(audio_file, output):
    """Transcreve um arquivo de áudio"""
    click.echo(f"Transcrevendo arquivo: {audio_file}")
    
    # Verificar extensão
    if not file_utils.is_valid_audio(audio_file):
        click.echo("Formato de arquivo não suportado. Use MP3, WAV, M4A, OGG ou FLAC.")
        return
    
    # Processar o áudio
    try:
        text = transcription.transcribe_audio(audio_file)
        
        # Determinar arquivo de saída
        if not output:
            base_name = os.path.splitext(audio_file)[0]
            output = f"{base_name}.transcription.txt"
        
        # Salvar transcrição
        with open(output, 'w', encoding='utf-8') as f:
            f.write(text)
            
        click.echo(f"Transcrição salva em: {output}")
        
        # Perguntar se deseja gerar SEO
        if click.confirm("Deseja gerar SEO para YouTube?"):
            generate_seo(output)
            
    except Exception as e:
        click.echo(f"Erro ao transcrever áudio: {str(e)}")

@cli.command()
@click.argument('transcription_file', type=click.Path(exists=True))
@click.option('--style', '-s', 
              type=click.Choice(['clickbait', 'professional', 'educational', 'neutral']),
              default='professional',
              help='Estilo do SEO')
@click.option('--output', '-o', help='Arquivo de saída para o SEO (formato JSON)')
def seo(transcription_file, style, output):
    """Gera SEO para YouTube com base em uma transcrição"""
    generate_seo(transcription_file, style, output)

def generate_seo(transcription_file, style='professional', output=None):
    """Função compartilhada para gerar SEO"""
    click.echo(f"Gerando SEO em estilo '{style}' para: {transcription_file}")
    
    try:
        # Ler transcrição
        with open(transcription_file, 'r', encoding='utf-8') as f:
            text = f.read()
        
        # Gerar SEO
        seo_data = seo_generator.generate_seo(text, style)
        
        # Determinar arquivo de saída
        if not output:
            base_name = os.path.splitext(transcription_file)[0]
            output = f"{base_name}.seo.json"
        
        # Salvar SEO
        file_utils.save_json(seo_data, output)
        click.echo(f"SEO salvo em: {output}")
        
        # Mostrar resumo
        click.echo("\n==== SEO Gerado ====")
        click.echo(f"Título: {seo_data['title']}")
        click.echo(f"Tags: {', '.join(seo_data['tags'])}")
        click.echo("Descrição:")
        click.echo(seo_data['description'][:200] + "..." if len(seo_data['description']) > 200 else seo_data['description'])
        
    except Exception as e:
        click.echo(f"Erro ao gerar SEO: {str(e)}")

@cli.command(name="pre-producao")
@click.argument('recording_dir', type=click.Path(exists=True, file_okay=False, dir_okay=True, path_type=Path))
@click.option('--files-to-keep', '-f', multiple=True, help='Lista de arquivos para manter (use múltiplas vezes)')
def organize(recording_dir: Path, files_to_keep):
    """Organizado para pré produção.
    
    RECORDING_DIR: Diretório da gravação do ScreenStudio (ex: Built-in Retina Display 2025-03-16.screenstudio)
    
    O arquivo channel-2-microphone-0-seo.json será buscado automaticamente dentro da pasta recording.
    """
    try:
        # Verificar se há uma pasta 'recording' no diretório
        recording_path = recording_dir / 'recording'
        if not recording_path.exists():
            # Tenta encontrar uma pasta recording dentro do diretório fornecido
            for item in recording_dir.iterdir():
                if item.is_dir() and item.name == 'recording':
                    recording_path = item
                    recording_dir = item.parent
                    break
            
            if not recording_path.exists():
                console.print(f"[red]✗ Pasta 'recording' não encontrada em {recording_dir}[/red]")
                return
        
        # Define automaticamente o caminho para o arquivo channel-2-microphone-0-seo.json
        template_json = recording_path / 'channel-2-microphone-0-seo.json'
        
        # Verificar se o arquivo existe
        if not template_json.exists():
            console.print(f"[red]✗ Arquivo 'channel-2-microphone-0-seo.json' não encontrado em {recording_path}[/red]")
            return
        
        with Progress(
            SpinnerColumn(),
            TextColumn("[bold blue]{task.description}"),
            BarColumn(),
        ) as progress:
            # Extrair o título do arquivo JSON
            task = progress.add_task("[cyan]Extraindo título do arquivo JSON modelo...", total=100)
            
            # Ler o arquivo JSON modelo
            try:
                with open(template_json, 'r', encoding='utf-8') as f:
                    json_data = json.load(f)
                
                # Adicionar log para depuração
                console.print(f"[cyan]DEBUG: Conteúdo do JSON modelo:[/cyan] {json.dumps(json_data, indent=2)}")
                
                title = json_data.get('title', '')
                if not title:
                    console.print("[red]✗ Não foi possível encontrar a chave 'title' no arquivo JSON[/red]")
                    return
                
                console.print(f"[cyan]DEBUG: Título extraído:[/cyan] {title}")
                
                progress.update(task, advance=25, description="Criando diretório destino...")
                
                # Criar o nome do diretório seguro para o sistema de arquivos
                # Remover caracteres especiais e limitar o comprimento
                safe_title = re.sub(r'[^\w\s-]', '', title).strip()
                safe_title = re.sub(r'[-\s]+', '-', safe_title)
                
                # Limitar o comprimento para evitar caminhos muito longos
                if len(safe_title) > 50:
                    safe_title = safe_title[:50]
                
                # Criando a pasta de destino (no mesmo nível da pasta recording)
                destination_path = recording_dir.parent / safe_title
                if destination_path.exists():
                    # Adicionar um sufixo numérico se a pasta já existir
                    counter = 1
                    while (recording_dir.parent / f"{safe_title}_{counter}").exists():
                        counter += 1
                    destination_path = recording_dir.parent / f"{safe_title}_{counter}"
                
                # Criar pasta de destino
                destination_path.mkdir(exist_ok=True, parents=True)
                
                progress.update(task, advance=25, description=f"Copiando arquivos para {destination_path.name}...")
                
                # Definir arquivos para manter se não fornecidos
                files_to_keep_list = list(files_to_keep) if files_to_keep else [
                    'channel-1-display-0.mp4',
                    'channel-2-microphone-0.mp3',
                    'channel-2-microphone-0-seo.json', 
                    'channel-3-webcam-0.mp4'
                ]
                
                # Copiar apenas os arquivos necessários
                for file_name in files_to_keep_list:
                    source_file = recording_path / file_name
                    if source_file.exists():
                        shutil.copy2(source_file, destination_path)
                    else:
                        console.print(f"[yellow]⚠ Arquivo {file_name} não encontrado na pasta de origem[/yellow]")
                
                progress.update(task, advance=25, description="Organização concluída!")
            
            except json.JSONDecodeError:
                console.print(f"[red]✗ O arquivo {template_json} não é um JSON válido[/red]")
                return
            except Exception as e:
                console.print(f"[red]✗ Erro ao processar o arquivo JSON: {str(e)}[/red]")
                return
                
            # Finalizar
            progress.update(task, advance=25, description="Organização concluída!")
            
        # Mensagem de sucesso
        console.print(f"[green]✓[/green] Pasta criada com sucesso: [bold]{destination_path}[/bold]")
        console.print(f"[green]✓[/green] Título extraído: [bold]{title}[/bold]")
        
    except Exception as e:
        console.print(f"[red]✗ Erro ao organizar gravação:[/red] {str(e)}")
        logger.exception("Erro na organização da gravação")
        raise click.Abort()

@cli.command()
@click.argument('input_file', type=click.Path(exists=True, file_okay=True, dir_okay=False, path_type=Path))
@click.option('--style', '-s', 
              type=click.Choice(['clickbait', 'professional', 'educational', 'neutral']),
              default='clickbait',
              help='Estilo do SEO')
def converter_transcrever_seo(input_file: Path, style: str):
    """Converte, transcreve e gera SEO para um arquivo de áudio/vídeo em uma só operação.
    
    Similar à funcionalidade da extensão VS Code "Agent for YouTuber".
    """
    try:
        from ..core.audio_processor import AudioProcessor
        from ..utils import file_utils
        from ..core import transcription, seo_generator
        import os
        
        # 1. Processar o arquivo de entrada (converter para MP3)
        with Progress(
            SpinnerColumn(),
            TextColumn("[bold blue]{task.description}"),
            BarColumn()
        ) as progress:
            task = progress.add_task("[cyan]Processando arquivo...", total=100)
            
            # Verificar a extensão do arquivo
            file_ext = input_file.suffix.lower()
            mp3_path = input_file
            
            # Se não for MP3, converter
            if file_ext != '.mp3':
                progress.update(task, advance=10, description="Convertendo para MP3...")
                
                # Criar o caminho do arquivo MP3
                mp3_path = input_file.with_suffix('.mp3')
                
                # Verificar se é vídeo ou áudio
                video_formats = ['.mp4', '.avi', '.mov', '.mkv', '.webm']
                audio_formats = ['.m4a', '.wav', '.ogg', '.flac']
                is_video = file_ext in video_formats
                is_audio = file_ext in audio_formats
                
                if not (is_audio or is_video):
                    console.print(f"[red]✗ Formato não suportado: {file_ext}[/red]")
                    return
                
                if is_video:
                    # Para vídeo, extrair o áudio usando ffmpeg
                    cmd = ['ffmpeg', '-i', str(input_file), '-q:a', '0', '-map', 'a', str(mp3_path), '-y']
                    result = subprocess.run(cmd, capture_output=True, text=True)
                    if result.returncode != 0:
                        console.print(f"[red]✗ Erro ao extrair áudio do vídeo: {result.stderr}[/red]")
                        return
                else:
                    # Para áudio, converter para MP3
                    cmd = ['ffmpeg', '-i', str(input_file), '-codec:a', 'libmp3lame', '-qscale:a', '2', str(mp3_path), '-y']
                    result = subprocess.run(cmd, capture_output=True, text=True)
                    if result.returncode != 0:
                        console.print(f"[red]✗ Erro ao converter áudio: {result.stderr}[/red]")
                        return
                        
                console.print(f"[green]✓[/green] Arquivo convertido para MP3: [bold]{mp3_path}[/bold]")
            
            # 2. Transcrever o arquivo MP3
            progress.update(task, advance=40, description="Transcrevendo áudio...")
            
            try:
                text = transcription.transcribe_audio(str(mp3_path))
                
                # Salvar a transcrição em arquivo
                transcription_path = mp3_path.with_suffix('.txt')
                with open(transcription_path, 'w', encoding='utf-8') as f:
                    f.write(text)
                    
                console.print(f"[green]✓[/green] Transcrição salva em: [bold]{transcription_path}[/bold]")
                
                # 3. Gerar SEO
                progress.update(task, advance=40, description=f"Gerando SEO com estilo '{style}'...")
                
                seo_data = seo_generator.generate_seo(text, style=style)
                
                # Salvar SEO em arquivo JSON
                seo_path = mp3_path.with_suffix('-seo.json')
                with open(seo_path, 'w', encoding='utf-8') as f:
                    json.dump(seo_data, f, indent=2)
                
                console.print(f"[green]✓[/green] SEO salvo em: [bold]{seo_path}[/bold]")
                
                # Mostrar resumo
                console.print("\n[bold cyan]SEO Gerado:[/bold cyan]")
                console.print(f"Título: [bold]{seo_data['title']}[/bold]")
                console.print(f"Tags: {', '.join(seo_data['tags'])}")
                console.print("Descrição:")
                console.print(seo_data['description'][:200] + "..." if len(seo_data['description']) > 200 else seo_data['description'])
                
                progress.update(task, advance=10, description="Concluído!")
                
            except Exception as e:
                console.print(f"[red]✗ Erro ao processar: {str(e)}[/red]")
                logger.exception("Erro durante processamento")
                raise click.Abort()
                
    except Exception as e:
        console.print(f"[red]✗ Erro: {str(e)}[/red]")
        logger.exception("Erro no processamento completo")
        raise click.Abort()

if __name__ == '__main__':
    cli() 