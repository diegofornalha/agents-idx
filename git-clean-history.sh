#!/bin/bash

# Script para reorganizar o histórico do Git
# Remove completamente arquivos temporários e sensíveis do histórico

# Cores para melhor visualização
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}==>${NC} ${BLUE}🧹 Iniciando limpeza profunda do histórico Git...${NC}"

# Arquivo para armazenar a versão atual
CURRENT_VERSION=$(grep -o '"version": "[^"]*"' package.json | cut -d'"' -f4)
echo -e "${YELLOW}==>${NC} ${BLUE}📊 Versão atual: ${GREEN}$CURRENT_VERSION${NC}"

# 1. Salvar o estado atual de todos os arquivos importantes
echo -e "${YELLOW}==>${NC} ${BLUE}📦 Criando backup temporário dos arquivos importantes...${NC}"
mkdir -p _git_temp_backup
cp -r \
  src/ \
  resources/ \
  .devcontainer/ \
  .vscode/ \
  package.json \
  package-lock.json \
  tsconfig.json \
  esbuild.js \
  generate-readme-cli.js \
  reset-extension.sh \
  update-extension.sh \
  idx-push.js \
  .gitignore \
  _git_temp_backup/

# 2. Criar um branch órfão (sem histórico)
echo -e "${YELLOW}==>${NC} ${BLUE}🌱 Criando novo branch órfão 'clean-history'...${NC}"
git checkout --orphan clean-history

# 3. Remover todos os arquivos rastreados pelo Git
echo -e "${YELLOW}==>${NC} ${BLUE}🗑️ Removendo todos os arquivos rastreados...${NC}"
git rm -rf .

# 4. Restaurar arquivos importantes do backup
echo -e "${YELLOW}==>${NC} ${BLUE}📂 Restaurando arquivos importantes...${NC}"
cp -r _git_temp_backup/* .
cp _git_temp_backup/.gitignore .

# 5. Remover arquivos temporários e sensíveis
echo -e "${YELLOW}==>${NC} ${BLUE}🔒 Removendo arquivos temporários e sensíveis...${NC}"
rm -rf \
  .last_version \
  .version_temp \
  .tmp_vsix/ \
  *.vsix \
  .env \
  _git_temp_backup/

# 6. Adicionar todos os arquivos ao novo branch
echo -e "${YELLOW}==>${NC} ${BLUE}➕ Adicionando arquivos ao novo branch...${NC}"
git add .

# 7. Fazer o commit inicial
echo -e "${YELLOW}==>${NC} ${BLUE}💾 Criando commit inicial limpo...${NC}"
git commit -m "Initial commit - Clean repository (v$CURRENT_VERSION)"

# 8. Renomear o branch para 'main' (ou outro nome padrão usado no projeto)
echo -e "${YELLOW}==>${NC} ${BLUE}🏷️ Renomeando branch para 'main'...${NC}"
git branch -M main

# 9. Avisar sobre push forçado
echo -e "${RED}⚠️  ATENÇÃO: ${NC}Execute o comando a seguir para forçar o push e substituir o histórico:"
echo -e "${GREEN}git push -f origin main${NC}"
echo ""
echo -e "${YELLOW}⚠️  AVISO IMPORTANTE:${NC} Esta operação é irreversível e substituirá o histórico do repositório remoto."
echo -e "Certifique-se de que todos os colaboradores estejam cientes desta mudança antes de prosseguir."
echo ""
echo -e "${BLUE}Para confirmar e realizar o push:${NC}"
echo -e "   1. Revise cuidadosamente os arquivos com ${GREEN}git status${NC}"
echo -e "   2. Execute ${GREEN}git push -f origin main${NC} para forçar o push" 