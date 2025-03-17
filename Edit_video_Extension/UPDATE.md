# GUIA DE ATUALIZAÇÃO DA EXTENSÃO

Este documento contém os comandos necessários para atualizar a extensão Agent for Youtuber.

## Comandos para Atualização

### 1. Navegar até o diretório da extensão

```bash
cd /Users/agents/Desktop/studio/agents-idx/Edit_video_Extension
```

### 2. Dar permissão de execução ao script (apenas na primeira vez)

```bash
chmod +x update-extension.sh
```

### 3. Executar o script de atualização

#### Para atualizar incrementando a versão patch (0.0.X)
```bash
./update-extension.sh full patch
```

#### Para atualizar incrementando a versão minor (0.X.0)
```bash
./update-extension.sh full minor
```

#### Para atualizar incrementando a versão major (X.0.0)
```bash
./update-extension.sh full major
```


### 4. Verificar a versão gerada

```bash
ls agent-for-youtuber-*.vsix
```

## Opções Disponíveis

O script aceita os seguintes modos:
- `full`: Compila, empacota e instala
- `dev`: Inicia modo de desenvolvimento
- `version`: Apenas atualiza a versão sem compilar

E os seguintes níveis de versão:
- `patch`: Incrementa o último número (0.0.X)
- `minor`: Incrementa o número do meio (0.X.0)
- `major`: Incrementa o primeiro número (X.0.0)
- `none`: Mantém a versão atual

## Exemplos de Uso

```bash
# Atualizar para nova versão patch, compilar e empacotar
./update-extension.sh full patch

# Iniciar modo de desenvolvimento
./update-extension.sh dev

# Apenas incrementar a versão minor sem compilar
./update-extension.sh version minor
``` 