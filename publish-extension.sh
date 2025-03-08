#!/bin/bash

# Cores para melhor visualização
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Função para exibir mensagem com formatação
function echo_step() {
  echo -e "${YELLOW}==>${NC} ${BLUE}$1${NC}"
}

echo_step "🚀 Iniciando processo de publicação da extensão README Agent..."

# Carregar variáveis do arquivo .env se existir
if [ -f .env ]; then
  echo_step "🔑 Carregando configurações do arquivo .env..."
  export $(grep -v '^#' .env | xargs)
fi

# Verificar se vsce está instalado
if ! command -v vsce &> /dev/null; then
  echo_step "⚙️ Instalando vsce globalmente..."
  npm install -g @vscode/vsce
fi

# Verificar a versão atual
CURRENT_VERSION=$(grep -o '"version": "[^"]*"' package.json | cut -d'"' -f4)
echo_step "📊 Versão atual: ${GREEN}$CURRENT_VERSION${NC}"

# Perguntar que tipo de incremento fazer
echo -e "${YELLOW}Que tipo de incremento deseja fazer?${NC}"
echo -e "1) Patch (0.0.x) - Para correções de bugs"
echo -e "2) Minor (0.x.0) - Para novas funcionalidades"
echo -e "3) Major (x.0.0) - Para mudanças importantes"
echo -e "4) Nenhum - Manter versão atual"
read -p "Escolha (1-4): " VERSION_CHOICE

VERSION_TYPE=""
case $VERSION_CHOICE in
  1) VERSION_TYPE="patch" ;;
  2) VERSION_TYPE="minor" ;;
  3) VERSION_TYPE="major" ;;
  4) VERSION_TYPE="" ;;
  *) echo "Opção inválida. Mantendo a versão atual."; VERSION_TYPE="" ;;
esac

# Verificar se o token está definido
if [ -z "$VSCE_PAT" ]; then
  echo_step "${RED}Token de acesso pessoal (PAT) não encontrado!${NC}"
  echo "Por favor, defina a variável de ambiente VSCE_PAT:"
  echo "export VSCE_PAT=seu_token_aqui"
  
  # Perguntar se deseja continuar mesmo sem o token
  read -p "Deseja inserir o token agora? (s/n): " TOKEN_CHOICE
  if [ "$TOKEN_CHOICE" = "s" ]; then
    read -sp "Insira seu token de acesso pessoal: " VSCE_PAT
    echo ""
    export VSCE_PAT
  else
    echo "Publicação cancelada. Configure o token e tente novamente."
    exit 1
  fi
fi

# Verificar se há arquivos não commitados
if [[ -n $(git status -s) ]]; then
  echo_step "${RED}⚠️ Existem mudanças não commitadas no repositório!${NC}"
  git status -s
  
  # Perguntar se deseja continuar mesmo com mudanças não commitadas
  read -p "Deseja continuar mesmo assim? (s/n): " CONTINUE_CHOICE
  if [ "$CONTINUE_CHOICE" != "s" ]; then
    echo "Publicação cancelada. Commit suas mudanças e tente novamente."
    exit 1
  fi
fi

# Preparar a extensão
echo_step "📦 Empacotando extensão..."
npx @vscode/vsce package

# Publicar a extensão
echo_step "🌎 Publicando extensão na VS Code Marketplace..."
if [ -n "$VERSION_TYPE" ]; then
  npx @vscode/vsce publish $VERSION_TYPE
else
  npx @vscode/vsce publish
fi

# Verificar se a publicação foi bem-sucedida
if [ $? -eq 0 ]; then
  # Obter a nova versão após a publicação
  NEW_VERSION=$(grep -o '"version": "[^"]*"' package.json | cut -d'"' -f4)
  
  echo_step "${GREEN}✅ Extensão publicada com sucesso!${NC}"
  echo -e "A extensão README Agent v${GREEN}$NEW_VERSION${NC} está disponível em:"
  echo -e "${BLUE}https://marketplace.visualstudio.com/items?itemName=diegofornalha.readme-agent-vsix${NC}"
  
  # Criar uma tag no Git para a versão
  echo_step "🏷️ Criando tag git para a versão..."
  git tag -a "v$NEW_VERSION" -m "Versão $NEW_VERSION"
  git push origin "v$NEW_VERSION"
else
  echo_step "${RED}❌ Falha ao publicar a extensão!${NC}"
  echo "Verifique os erros acima e tente novamente."
fi 