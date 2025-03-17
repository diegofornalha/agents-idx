from pathlib import Path
import json
import logging
import subprocess
import datetime
import re

logger = logging.getLogger(__name__)

class MetadataHandler:
    def __init__(self, recording_path: Path):
        self.recording_path = recording_path
        self.metadata = {}
        
    def extract_screenstudio_metadata(self):
        """Extrai metadados de uma gravação do ScreenStudio"""
        logger.info(f"Extraindo metadados do ScreenStudio em {self.recording_path}")
        
        # Verificar se o diretório existe
        if not self.recording_path.exists() or not self.recording_path.is_dir():
            raise FileNotFoundError(f"Diretório de gravação não encontrado: {self.recording_path}")
        
        # Verificar e carregar o arquivo project.json
        project_json = self.recording_path / "project.json"
        if project_json.exists():
            try:
                with open(project_json, 'r') as f:
                    self.metadata['project'] = json.load(f)
                logger.info("Arquivo project.json carregado")
            except json.JSONDecodeError:
                logger.warning("Erro ao decodificar project.json")
        
        # Extrair dados do polyrecorder.log
        log_file = self.recording_path / "recording" / "polyrecorder.log"
        if log_file.exists():
            try:
                with open(log_file, 'r') as f:
                    log_content = f.read()
                
                # Extrair informações importantes do log
                metadata = {
                    'timestamp': self._extract_timestamp(log_content),
                    'device': self._extract_device_info(log_content),
                    'duration': self._extract_duration_from_log(log_content)
                }
                
                self.metadata['recording_info'] = metadata
                logger.info("Informações extraídas do polyrecorder.log")
            except Exception as e:
                logger.warning(f"Erro ao processar polyrecorder.log: {e}")
                
        # Extrair metadados dos arquivos de mídia
        self.metadata['media'] = self._extract_media_metadata()
        
        return self.metadata
    
    def _extract_timestamp(self, log_content):
        """Extrai o timestamp da gravação do log"""
        timestamp_match = re.search(r'(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+)', log_content)
        if timestamp_match:
            return timestamp_match.group(1)
        return None
    
    def _extract_device_info(self, log_content):
        """Extrai informações do dispositivo do log"""
        model_match = re.search(r'modelIdentifier=([^\s]+)', log_content)
        os_match = re.search(r'operatingSystem=([^\n]+)', log_content)
        
        device_info = {}
        if model_match:
            device_info['model'] = model_match.group(1)
        if os_match:
            device_info['os'] = os_match.group(1)
            
        return device_info
    
    def _extract_duration_from_log(self, log_content):
        """Tenta extrair a duração da gravação a partir do log"""
        # Método simplificado - em um caso real, precisaríamos de lógica mais robusta
        # para determinar a duração total da gravação
        duration_match = re.search(r'Duração:(\d+\.\d+)', log_content)
        if duration_match:
            return float(duration_match.group(1))
        return None
    
    def _extract_media_metadata(self):
        """Extrai metadados dos arquivos de mídia"""
        media_info = {}
        
        # Verificar arquivos comuns em gravações do ScreenStudio
        media_files = {
            'display': self.recording_path / "channel-1-display-0.mp4",
            'microphone': self.recording_path / "channel-2-microphone-0.m4a",
            'webcam': self.recording_path / "channel-3-webcam-0.mp4"
        }
        
        for media_type, file_path in media_files.items():
            if file_path.exists():
                try:
                    info = self._get_media_info(file_path)
                    media_info[media_type] = info
                    logger.info(f"Metadados extraídos para {media_type}")
                except Exception as e:
                    logger.warning(f"Erro ao extrair metadados de {media_type}: {e}")
        
        return media_info
    
    def _get_media_info(self, file_path):
        """Obtém informações de um arquivo de mídia usando ffprobe"""
        cmd = [
            'ffprobe', 
            '-v', 'quiet', 
            '-print_format', 'json', 
            '-show_format', 
            '-show_streams',
            str(file_path)
        ]
        
        try:
            result = subprocess.run(cmd, capture_output=True, text=True, check=True)
            data = json.loads(result.stdout)
            
            # Simplificar os dados
            info = {
                'path': str(file_path),
                'duration': float(data['format'].get('duration', 0)),
                'size': int(data['format'].get('size', 0)),
                'format': data['format'].get('format_name', '')
            }
            
            # Adicionar informações de streams
            for stream in data.get('streams', []):
                stream_type = stream.get('codec_type')
                if stream_type:
                    if stream_type == 'video':
                        info['video'] = {
                            'codec': stream.get('codec_name', ''),
                            'width': stream.get('width', 0),
                            'height': stream.get('height', 0),
                            'framerate': self._calculate_framerate(stream.get('avg_frame_rate', '0/1'))
                        }
                    elif stream_type == 'audio':
                        info['audio'] = {
                            'codec': stream.get('codec_name', ''),
                            'sample_rate': stream.get('sample_rate', ''),
                            'channels': stream.get('channels', 0)
                        }
            
            return info
        except Exception as e:
            logger.error(f"Erro ao extrair informações de mídia: {e}")
            return {'error': str(e)}
    
    def _calculate_framerate(self, fraction_str):
        """Calcula a taxa de quadros a partir de uma string de fração"""
        if not fraction_str or '/' not in fraction_str:
            return 0
            
        num, den = map(int, fraction_str.split('/'))
        if den == 0:
            return 0
        return round(num / den, 2)
    
    def save_metadata(self, output_path: Path):
        """Salva os metadados em um arquivo JSON"""
        if not self.metadata:
            logger.warning("Nenhum metadado para salvar. Execute extract_screenstudio_metadata() primeiro.")
            return False
            
        # Adicionar timestamp da geração
        self.metadata['generated_at'] = datetime.datetime.now().isoformat()
        
        # Salvar no arquivo
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(self.metadata, f, ensure_ascii=False, indent=2)
            
        logger.info(f"Metadados salvos em {output_path}")
        return True
    
    def generate_summary(self):
        """Gera um resumo em texto dos metadados"""
        if not self.metadata:
            return "Nenhum metadado disponível"
            
        summary = []
        
        # Informações básicas do projeto
        project_data = self.metadata.get('project', {})
        if isinstance(project_data, dict) and 'json' in project_data:
            project = project_data['json']
            summary.append(f"Nome: {project.get('name', 'Desconhecido')}")
            summary.append(f"ID: {project.get('id', 'Desconhecido')}")
            summary.append(f"Criado: {project.get('createdAt', 'Desconhecido')}")
            summary.append(f"Atualizado: {project.get('updatedAt', 'Desconhecido')}")
        
        # Informações da gravação
        rec_info = self.metadata.get('recording_info', {})
        if rec_info:
            summary.append("\nInformações da Gravação:")
            if 'timestamp' in rec_info:
                summary.append(f"Timestamp: {rec_info['timestamp']}")
            if 'device' in rec_info:
                device = rec_info['device']
                if 'model' in device:
                    summary.append(f"Modelo: {device['model']}")
                if 'os' in device:
                    summary.append(f"Sistema Operacional: {device['os']}")
            if 'duration' in rec_info and rec_info['duration']:
                summary.append(f"Duração: {rec_info['duration']:.2f} segundos")
        
        # Informações de mídia
        media_info = self.metadata.get('media', {})
        if media_info:
            summary.append("\nArquivos de Mídia:")
            
            for media_type, info in media_info.items():
                summary.append(f"\n- {media_type.title()}:")
                summary.append(f"  Arquivo: {Path(info.get('path', '')).name}")
                summary.append(f"  Duração: {info.get('duration', 0):.2f} segundos")
                summary.append(f"  Tamanho: {info.get('size', 0) / (1024*1024):.2f} MB")
                
                if 'video' in info:
                    video = info['video']
                    summary.append(f"  Resolução: {video.get('width', 0)}x{video.get('height', 0)}")
                    summary.append(f"  Codec: {video.get('codec', 'Desconhecido')}")
                    summary.append(f"  Framerate: {video.get('framerate', 0)} FPS")
                
                if 'audio' in info:
                    audio = info['audio']
                    summary.append(f"  Codec de Áudio: {audio.get('codec', 'Desconhecido')}")
                    summary.append(f"  Canais: {audio.get('channels', 0)}")
                    summary.append(f"  Taxa de Amostragem: {audio.get('sample_rate', 'Desconhecido')} Hz")
        
        return "\n".join(summary) 