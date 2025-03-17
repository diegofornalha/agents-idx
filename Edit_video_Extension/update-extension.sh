#!/bin/bash

# Script para atualizar e instalar a extensão Agent for YouTuber
# Adaptado do readme-agent

# Cores para melhor visualização
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Função para exibir mensagem com formatação
function echo_step() {
  echo -e "${YELLOW}==>${NC} ${BLUE}$1${NC}"
}

# Função para incrementar versão (SemVer)
function increment_version() {
  local version=$1
  local level=$2
  
  # Divide a versão em partes (major.minor.patch)
  IFS='.' read -ra parts <<< "$version"
  local major=${parts[0]}
  local minor=${parts[1]}
  local patch=${parts[2]}
  
  # Incrementa a parte correspondente
  case "$level" in
    "patch")
      patch=$((patch + 1))
      ;;
    "minor")
      minor=$((minor + 1))
      patch=0
      ;;
    "major")
      major=$((major + 1))
      minor=0
      patch=0
      ;;
    *)
      echo "Nível de versão inválido. Use: patch, minor ou major"
      exit 1
      ;;
  esac
  
  # Retorna a versão atualizada
  echo "$major.$minor.$patch"
}

# Função para atualizar a versão no package.json
function update_version() {
  local level="${1:-patch}"
  local package_file="$PROJECT_DIR/package.json"
  
  # Obter a versão atual
  local current_version=$(grep -o '"version": "[^"]*"' "$package_file" | cut -d'"' -f4)
  
  # Incrementar a versão
  local new_version=$(increment_version "$current_version" "$level")
  
  # Atualizar package.json
  sed -i '' "s/\"version\": \"$current_version\"/\"version\": \"$new_version\"/" "$package_file"
  
  echo_step "🏷️  Versão atualizada: ${RED}$current_version${NC} -> ${GREEN}$new_version${NC}"
  
  # Retorna a nova versão
  echo "$new_version"
}

# Função para atualizar a versão no arquivo extension.ts
function update_extension_version() {
  local version=$1
  local extension_file="$PROJECT_DIR/src/scripts/extension.ts"
  
  if [ -f "$extension_file" ]; then
    # Procurar por padrões como version: 'x.y.z' ou versão '0.0.1' 
    if grep -q "version: '[0-9]*\.[0-9]*\.[0-9]*'" "$extension_file"; then
      sed -i '' "s/version: '[0-9]*\.[0-9]*\.[0-9]*'/version: '$version'/" "$extension_file"
      echo_step "🏷️  Versão atualizada no extension.ts: ${GREEN}$version${NC}"
    elif grep -q "versão '[0-9]*\.[0-9]*\.[0-9]*'" "$extension_file"; then  
      sed -i '' "s/versão '[0-9]*\.[0-9]*\.[0-9]*'/versão '$version'/" "$extension_file"
      echo_step "🏷️  Versão atualizada no extension.ts: ${GREEN}$version${NC}"
    fi
  fi
}

# Determinar qual modo executar
MODE="${1:-full}"
VERSION_LEVEL="${2:-patch}"

# Diretório base do projeto
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

echo_step "🚀 Iniciando atualização da extensão Agent for YouTuber em modo: $MODE"

# Verificar se há alterações não salvas
if [[ -n $(git status -s) ]]; then
  echo_step "📝 Alterações detectadas nos arquivos:"
  git status -s
fi

# Função para modo completo (compilar, empacotar e instalar)
function full_mode() {
  # Armazena a nova versão em uma variável silenciosamente (sem saída no terminal)
  if [[ "$VERSION_LEVEL" != "none" ]]; then
    # Capturar versão atual antes de atualizar
    CURR_VERSION=$(grep -o '"version": "[^"]*"' "package.json" | cut -d'"' -f4)
    
    # Atualizar a versão silenciosamente e capturar a nova versão
    NEW_VERSION=$(update_version "$VERSION_LEVEL")
    
    # Atualizar a versão no extension.ts se existir
    update_extension_version "$NEW_VERSION"
  else
    NEW_VERSION=$(grep -o '"version": "[^"]*"' "package.json" | cut -d'"' -f4)
    echo_step "⏩ Mantendo versão atual: ${PURPLE}$NEW_VERSION${NC}"
  fi
  
  # Armazenando a versão em um arquivo temporário para referência
  echo "$NEW_VERSION" > .version_temp
  
  echo_step "🔨 Compilando a extensão..."
  npm run compile || { echo "❌ Falha na compilação"; exit 1; }
  
  echo_step "📦 Empacotando a extensão..."
  npm run package || { echo "❌ Falha no empacotamento"; exit 1; }
  
  # Nome do arquivo .vsix baseado na versão
  VSIX_FILE="agent-for-youtuber-$NEW_VERSION.vsix"
  
  # Verificar se o arquivo existe antes de tentar instalar
  if [[ ! -f "$VSIX_FILE" ]]; then
    echo "❌ Arquivo $VSIX_FILE não encontrado"
    exit 1
  fi
  
  echo_step "💿 Instalando extensão..."
  code --install-extension "$VSIX_FILE" --force || { echo "❌ Falha na instalação"; exit 1; }
  
  echo -e "${GREEN}✅ Extensão v$NEW_VERSION atualizada com sucesso!${NC}"
  echo -e "${YELLOW}ℹ️  Reinicie o VS Code para aplicar as alterações${NC}"
  
  # Armazena informações da versão para uso futuro
  echo "$NEW_VERSION" > .last_version
  
  # Remover arquivo temporário
  rm -f .version_temp
}

# Função para modo de desenvolvimento
function dev_mode() {
  echo_step "👨‍💻 Iniciando modo de desenvolvimento..."
  
  echo_step "🔄 Iniciando compilação em modo watch..."
  npm run dev &
  DEV_PID=$!
  
  echo_step "🖥️  Abrindo VS Code com a extensão em desenvolvimento..."
  code --disable-extensions --extensionDevelopmentPath="$PROJECT_DIR" .
  
  # Aguarda o VS Code fechar para matar o processo de desenvolvimento
  echo_step "⏳ Extensão em modo de desenvolvimento. Pressione Ctrl+C para encerrar..."
  
  # Captura o sinal de interrupção para limpar
  trap 'echo_step "🛑 Encerrando modo de desenvolvimento..."; kill $DEV_PID 2>/dev/null; exit 0' INT
  
  # Mantém o script rodando
  wait $DEV_PID
}

# Executa o modo selecionado
case "$MODE" in
  "full")
    full_mode
    ;;
  "dev")
    dev_mode
    ;;
  "version")
    # Modo apenas para atualizar a versão sem compilar
    NEW_VERSION=$(update_version "$VERSION_LEVEL")
    update_extension_version "$NEW_VERSION"
    ;;
  *)
    echo "Modo desconhecido: $MODE"
    echo "Uso: ./update-extension.sh [full|dev|version] [patch|minor|major|none]"
    echo "Exemplos:"
    echo "  ./update-extension.sh full patch    # Compila e incrementa versão patch (0.0.x)"
    echo "  ./update-extension.sh full minor    # Compila e incrementa versão minor (0.x.0)"
    echo "  ./update-extension.sh full major    # Compila e incrementa versão major (x.0.0)"
    echo "  ./update-extension.sh dev           # Inicia modo de desenvolvimento"
    echo "  ./update-extension.sh version minor # Apenas atualiza a versão sem compilar"
    ;;
esac 