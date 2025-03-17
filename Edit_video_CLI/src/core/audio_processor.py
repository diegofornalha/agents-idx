from pathlib import Path
import logging
import subprocess
import json
import tempfile
from pydub import AudioSegment
from pydub.silence import split_on_silence, detect_silence

logger = logging.getLogger(__name__)

class AudioProcessor:
    def __init__(self, audio_path: Path):
        self.audio_path = audio_path
        self.audio_segment = None
        
    def load_audio(self):
        """Carrega o arquivo de áudio"""
        logger.info(f"Carregando áudio de {self.audio_path}")
        
        if not self.audio_path.exists():
            raise FileNotFoundError(f"Arquivo de áudio não encontrado: {self.audio_path}")
        
        # Verifica a extensão e carrega com pydub
        extension = self.audio_path.suffix.lower()
        if extension == '.m4a':
            # Para m4a, podemos precisar converter para mp3 primeiro
            logger.info("Convertendo M4A para MP3 temporariamente para processamento")
            with tempfile.NamedTemporaryFile(suffix='.mp3', delete=False) as temp_file:
                temp_path = Path(temp_file.name)
            
            # Usar ffmpeg para converter
            cmd = [
                'ffmpeg', '-i', str(self.audio_path), 
                '-vn', '-acodec', 'libmp3lame', '-q:a', '2', 
                str(temp_path)
            ]
            subprocess.run(cmd, check=True, capture_output=True)
            
            # Carregar o MP3 temporário
            self.audio_segment = AudioSegment.from_mp3(str(temp_path))
            # Remover arquivo temporário
            temp_path.unlink()
        else:
            # Carregar diretamente outros formatos
            formats = {
                '.mp3': 'mp3',
                '.wav': 'wav',
                '.ogg': 'ogg',
                '.flac': 'flac'
            }
            format_name = formats.get(extension)
            if not format_name:
                raise ValueError(f"Formato de áudio não suportado: {extension}")
                
            load_method = getattr(AudioSegment, f"from_{format_name}")
            self.audio_segment = load_method(str(self.audio_path))
            
        logger.info(f"Áudio carregado: {len(self.audio_segment)/1000:.2f} segundos")
        return self.audio_segment
        
    def detect_silences(self, min_silence_len=500, silence_thresh=-40, keep_silence=100):
        """Detecta períodos de silêncio no áudio"""
        if not self.audio_segment:
            self.load_audio()
            
        logger.info(f"Detectando silêncios (min_len={min_silence_len}ms, thresh={silence_thresh}dB)")
        
        # Detectar silêncios
        silences = detect_silence(
            self.audio_segment, 
            min_silence_len=min_silence_len, 
            silence_thresh=silence_thresh
        )
        
        # Converter para segundos para fácil leitura
        result = [
            {
                "start": start/1000, 
                "end": end/1000, 
                "duration": (end-start)/1000
            } 
            for start, end in silences
        ]
        
        logger.info(f"Detectados {len(result)} períodos de silêncio")
        return result
        
    def remove_silence(self, output_path: Path, min_silence_len=500, silence_thresh=-40, keep_silence=100):
        """Remove períodos de silêncio do áudio"""
        if not self.audio_segment:
            self.load_audio()
            
        logger.info(f"Removendo silêncios do áudio para {output_path}")
        
        # Dividir o áudio nos silêncios
        audio_chunks = split_on_silence(
            self.audio_segment,
            min_silence_len=min_silence_len,
            silence_thresh=silence_thresh,
            keep_silence=keep_silence
        )
        
        logger.info(f"Áudio dividido em {len(audio_chunks)} segmentos não silenciosos")
        
        # Concatenar os chunks sem silêncio
        output_audio = AudioSegment.empty()
        for chunk in audio_chunks:
            output_audio += chunk
            
        # Exportar para o caminho especificado
        extension = output_path.suffix.lower()
        format_name = extension[1:] if extension.startswith('.') else extension
        
        logger.info(f"Exportando áudio sem silêncio ({len(output_audio)/1000:.2f}s)")
        output_audio.export(str(output_path), format=format_name)
        
        # Calcular a redução de duração
        original_duration = len(self.audio_segment)/1000
        new_duration = len(output_audio)/1000
        reduction = (original_duration - new_duration) / original_duration * 100
        
        logger.info(f"Áudio processado: Duração original={original_duration:.2f}s, "
                   f"Nova duração={new_duration:.2f}s, Redução={reduction:.2f}%")
        
        return output_path
        
    def extract_metadata(self):
        """Extrai metadados do arquivo de áudio usando ffprobe"""
        logger.info(f"Extraindo metadados de {self.audio_path}")
        
        cmd = [
            'ffprobe', 
            '-v', 'quiet', 
            '-print_format', 'json', 
            '-show_format', 
            '-show_streams',
            str(self.audio_path)
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        metadata = json.loads(result.stdout)
        
        # Extrair informações importantes
        audio_info = {
            'duration': float(metadata['format'].get('duration', 0)),
            'bitrate': int(metadata['format'].get('bit_rate', 0)),
            'size': int(metadata['format'].get('size', 0)),
            'format': metadata['format'].get('format_name', ''),
        }
        
        # Adicionar informações específicas do stream de áudio
        for stream in metadata.get('streams', []):
            if stream.get('codec_type') == 'audio':
                audio_info.update({
                    'codec': stream.get('codec_name', ''),
                    'sample_rate': int(stream.get('sample_rate', 0)),
                    'channels': int(stream.get('channels', 0)),
                    'channel_layout': stream.get('channel_layout', '')
                })
                break
                
        logger.info(f"Metadados extraídos: {audio_info}")
        return audio_info 