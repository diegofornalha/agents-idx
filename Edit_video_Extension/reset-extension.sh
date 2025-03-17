#!/bin/bash

# Script para resetar e reinstalar a extensão Agent for YouTuber
# Adaptado do readme-agent

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

# Verifica se o VS Code está rodando
function is_vscode_running() {
  if pgrep -f "Code" >/dev/null; then
    return 0
  else
    return 1
  fi
}

echo_step "🔄 Iniciando reset da extensão Agent for YouTuber..."

# Verificar se VS Code está em execução
if is_vscode_running; then
  echo_step "${RED}⚠️ O VS Code está em execução!${NC}"
  echo_step "Por favor, feche todas as instâncias do VS Code antes de prosseguir."
  read -p "Deseja continuar mesmo assim? (s/n): " FORCE
  if [ "$FORCE" != "s" ]; then
    echo_step "Operação cancelada."
    exit 1
  fi
fi

# Remover extensão instalada
echo_step "🗑️ Removendo extensão Agent for YouTuber..."
code --uninstall-extension diegofornalha.agent-for-youtuber 2>/dev/null

# Limpar caches
echo_step "🧹 Limpando caches e builds anteriores..."
rm -rf dist out
rm -f agent-for-youtuber-*.vsix
rm -f .version_temp .last_version

# Reconstruir os diretórios necessários
echo_step "📁 Recriando diretórios..."
mkdir -p dist out

# Recompilar a extensão
echo_step "🔨 Recompilando a extensão..."
npm run compile || echo_step "⚠️ Falha na compilação, pode ser necessário corrigir o código"

echo_step "${GREEN}✅ Reset concluído com sucesso!${NC}"
echo_step "Para reinstalar a extensão, execute: ./update-extension.sh full" 