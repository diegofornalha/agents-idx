#!/bin/bash

# Cores para melhor visualização
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Função para exibir mensagem formatada
echo_step() {
  echo -e "${YELLOW}==>${NC} ${BLUE}$1${NC}"
}

# Função para exibir erro
echo_error() {
  echo -e "${RED}✗ ERRO:${NC} $1"
}

# Função para exibir sucesso
echo_success() {
  echo -e "${GREEN}✓${NC} $1"
}

# Função para exibir ajuda
show_help() {
  echo "Uso: ./preproducao.sh [OPÇÕES] [PASTA]"
  echo
  echo "Executa o comando de pré-produção em uma pasta de gravação do Screen Studio."
  echo
  echo "Opções:"
  echo "  -h, --help     Exibe esta ajuda e sai"
  echo
  echo "Se nenhuma pasta for fornecida, o script exibirá uma lista de pastas"
  echo "disponíveis para escolha."
  echo
  echo "Exemplos:"
  echo "  ./preproducao.sh                       # Lista pastas disponíveis"
  echo "  ./preproducao.sh \"Built-in Retina Display 2025-03-16 20:43:25.screenstudio\""
  echo
}

# Verificar se é uma solicitação de ajuda
if [ "$1" = "-h" ] || [ "$1" = "--help" ]; then
  show_help
  exit 0
fi

# Diretório base
BASE_DIR="/Users/agents/Desktop/studio"

# Verificar se um caminho foi fornecido
if [ $# -eq 0 ]; then
  # Listar pastas que começam com "Built-in" no diretório atual
  echo_step "Buscando pastas de Screen Studio no diretório atual..."
  
  # Entrar no diretório base
  cd "$BASE_DIR"
  
  # Armazenar o IFS original e alterá-lo para evitar separação por espaços
  OLD_IFS="$IFS"
  IFS=$'\n'
  
  # Encontrar pastas Built-in usando -name com aspas para manter nomes com espaços
  FOLDERS=($(find . -maxdepth 1 -type d -name "Built-in*" | sort -r))
  
  # Restaurar o IFS original
  IFS="$OLD_IFS"
  
  if [ ${#FOLDERS[@]} -eq 0 ]; then
    echo_error "Nenhuma pasta de Screen Studio encontrada no diretório atual."
    exit 1
  fi
  
  # Exibir as pastas encontradas
  echo_step "Pastas encontradas:"
  for i in "${!FOLDERS[@]}"; do
    # Remover ./ do início do caminho
    folder=${FOLDERS[$i]}
    folder=${folder#./}
    echo "   $((i+1)). $folder"
  done
  
  # Solicitar que o usuário escolha uma pasta
  echo
  read -p "Escolha uma pasta pelo número (ou pressione Enter para usar a mais recente): " choice
  
  # Se não houver escolha, usar a primeira pasta (mais recente)
  if [ -z "$choice" ]; then
    choice=1
  fi
  
  # Verificar se a escolha é válida
  if ! [[ "$choice" =~ ^[0-9]+$ ]] || [ "$choice" -lt 1 ] || [ "$choice" -gt ${#FOLDERS[@]} ]; then
    echo_error "Escolha inválida."
    exit 1
  fi
  
  # Obter o caminho da pasta escolhida (remover ./ do início)
  FOLDER_PATH="${FOLDERS[$((choice-1))]}"
  FOLDER_PATH=${FOLDER_PATH#./}
  
else
  # Usar o caminho fornecido
  FOLDER_PATH="$1"
  
  # Verificar se a pasta existe
  if [ ! -d "$BASE_DIR/$FOLDER_PATH" ]; then
    echo_error "A pasta '$FOLDER_PATH' não existe em $BASE_DIR."
    echo_step "Execute o script sem argumentos para ver as pastas disponíveis."
    exit 1
  fi
  
  # Verificar se é uma pasta de Screen Studio
  if [[ ! "$FOLDER_PATH" == Built-in* ]]; then
    echo_error "A pasta '$FOLDER_PATH' não parece ser uma pasta de Screen Studio (deve começar com 'Built-in')."
    echo_step "As pastas de Screen Studio geralmente começam com 'Built-in'."
    exit 1
  fi
fi

# Executar o comando de pré-produção
echo_step "Processando pasta: $FOLDER_PATH"
echo

# Executar o comando
cd "$BASE_DIR"
python -m agents-idx.Edit_video_CLI.src.main pre-producao "$FOLDER_PATH"

# Verificar resultado
if [ $? -eq 0 ]; then
  echo
  echo_success "Processamento concluído com sucesso!"
else
  echo
  echo_error "Houve um erro no processamento. Verifique as mensagens acima."
  exit 1
fi 