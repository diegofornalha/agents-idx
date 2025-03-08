#!/bin/bash

echo "🔄 Iniciando processo de reset do README Agent..."

# Verificar a versão atual antes do reset
CURRENT_VERSION=$(grep -o '"version": "[^"]*"' package.json | cut -d'"' -f4)
echo "📊 Versão atual: $CURRENT_VERSION"

# Desinstalar versão atual
echo "🗑️ Desinstalando versão atual..."
code --uninstall-extension readme-agent-vsix

# Atualizar versão no package.json diretamente antes de compilar
echo "📝 Atualizando versão no package.json..."
# Extrair componentes da versão
MAJOR=$(echo $CURRENT_VERSION | cut -d. -f1)
MINOR=$(echo $CURRENT_VERSION | cut -d. -f2)
PATCH=$(echo $CURRENT_VERSION | cut -d. -f3)

# Incrementar o patch
NEW_PATCH=$((PATCH + 1))
NEW_VERSION="$MAJOR.$MINOR.$NEW_PATCH"

# Atualizar package.json com a nova versão
sed -i '' "s/\"version\": \"$CURRENT_VERSION\"/\"version\": \"$NEW_VERSION\"/" package.json
echo "🆙 Nova versão: $NEW_VERSION"

# Compilar sem incrementar a versão novamente
echo "🔨 Compilando nova versão..."
# Usar "none" como nível de versão para evitar mais incrementos
./update-extension.sh full none

# Se o comando acima falhar, tentar compilação direta
if [ $? -ne 0 ]; then
  echo "⚠️ Erro no update-extension.sh, tentando compilação direta..."
  npm run compile
  npx @vscode/vsce package --skip-license
fi

# Encontrar o arquivo .vsix mais recente
LATEST_VSIX=$(find . -name "readme-agent-vsix-*.vsix" | sort -V | tail -n 1)

if [ -z "$LATEST_VSIX" ]; then
  echo "❌ Erro: Arquivo .vsix não encontrado!"
  echo "⚠️ Tentando compilar manualmente..."
  # Criar .vsix com a versão correta
  npx @vscode/vsce package --skip-license
  LATEST_VSIX=$(find . -name "readme-agent-vsix-*.vsix" | sort -V | tail -n 1)
  
  if [ -z "$LATEST_VSIX" ]; then
    echo "❌ Erro crítico: Não foi possível criar o arquivo .vsix!"
    exit 1
  fi
fi

# Instalar nova versão
echo "📦 Instalando nova versão: $LATEST_VSIX"
code --install-extension "$LATEST_VSIX" --force

echo "✅ Reset concluído! A extensão README Agent foi atualizada para v$NEW_VERSION."
echo "📝 Para usar: clique com botão direito em uma pasta e selecione 'Regras Diego > Gerar README'"
echo "🔁 Recomendação: Reinicie o VS Code para aplicar todas as mudanças." 