# Guia de Atualização e Publicação da Extensão Agent for YouTuber

Este guia contém o passo a passo para atualizar, empacotar e publicar a extensão Agent for YouTuber no Visual Studio Code Marketplace.

## 1. Atualização de Versão e Empacotamento

Para atualizar a versão da extensão, utilize o script `update-extension.sh`. Este script automatiza o processo de incremento da versão, compilação e empacotamento da extensão.

### Opções de Atualização

O script suporta diferentes níveis de atualização de versão (seguindo SemVer):

```bash
# Atualiza a versão patch (0.0.X)
./update-extension.sh full patch

# Atualiza a versão minor (0.X.0)
./update-extension.sh full minor

# Atualiza a versão major (X.0.0)
./update-extension.sh full major

# Mantém a versão atual
./update-extension.sh full none
```

### Somente Atualização de Versão

Se você quiser apenas atualizar a versão sem compilar ou empacotar:

```bash
./update-extension.sh version patch
```

### Modo de Desenvolvimento

Para trabalhar no modo de desenvolvimento com recarga automática:

```bash
./update-extension.sh dev
```

## 2. Verificar Resultado

Após a execução do script, verifique se o processo foi bem-sucedido:

```bash
# Verificar a versão atual no package.json
grep -n '"version":' package.json

# Listar os arquivos .vsix gerados
ls -l agent-for-youtuber-*.vsix

# Verificar os arquivos na pasta release
ls -la release/
```

## 3. Publicação no VS Code Marketplace

Para publicar a extensão no marketplace, utilize o script `publish-extension.sh`:

```bash
./publish-extension.sh
```

Este script:
1. Pergunta qual tipo de incremento de versão você deseja fazer
2. Verifica se o token do marketplace está configurado
3. Empacota a extensão
4. Publica no marketplace
5. Cria uma tag git para a versão
6. Copia o arquivo .vsix para a pasta release

### Pré-requisitos para Publicação

- Você deve ter um token de acesso pessoal (PAT) do Visual Studio Marketplace
- O token deve ser configurado como variável de ambiente `VSCE_PAT` ou informado durante o processo

```bash
# Configurar o token como variável de ambiente
export VSCE_PAT=seu_token_aqui
```

## 4. Organização de Arquivos

Após a atualização e publicação, os arquivos são organizados da seguinte forma:

```
Edit_video_Extension/
├── agent-for-youtuber-X.Y.Z.vsix  # Pacote da extensão
├── release/                      # Pasta com todas as versões publicadas
│   ├── agent-for-youtuber-X.Y.Z.vsix
│   └── ...
```

## 5. Limpeza do Histórico Git (Opcional)

Se precisar limpar o histórico do repositório git para remover arquivos sensíveis ou reduzir o tamanho:

```bash
# Verificar o estado atual do repositório
git status -s
git log --oneline -n 5

# Executar o script de limpeza
./git-clean-history.sh

# Enviar o novo histórico para o repositório remoto
git push -f origin main
```

⚠️ **ATENÇÃO**: A limpeza do histórico git é uma operação irreversível que recria todo o histórico do repositório. Use com cautela.

## 6. Reset da Extensão

Para resetar a extensão (remover arquivos temporários e limpar o cache):

```bash
./reset-extension.sh
```

## 7. Comandos Úteis

```bash
# Copiar arquivo VSIX para a pasta release
mkdir -p release && cp agent-for-youtuber-X.Y.Z.vsix release/

# Tornar scripts executáveis
chmod +x update-extension.sh publish-extension.sh reset-extension.sh

# Instalar extensão manualmente no VS Code
code --install-extension agent-for-youtuber-X.Y.Z.vsix
```

---

## Fluxo Completo de Trabalho

Aqui está um fluxo de trabalho completo para atualização e publicação:

1. Faça suas alterações no código
2. Execute `./update-extension.sh full patch` para incrementar a versão, compilar e empacotar
3. Teste a extensão localmente instalando o arquivo .vsix gerado
4. Execute `./publish-extension.sh` para publicar no marketplace
5. Verifique se a extensão está disponível no [Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=diegofornalha.agent-for-youtuber)

---

*Último atualizado: Março 2025* 