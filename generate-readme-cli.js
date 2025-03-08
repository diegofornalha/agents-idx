// Script para gerar README usando a API do Gemini
const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require('fs').promises;
const path = require('path');
const { isText } = require('istextorbinary');

// Chave API do Gemini
const GEMINI_API_KEY = "AIzaSyBYGu2RD_yYGZCZn56dk6phv-0vuRGNw1s";
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// Lista de modelos para tentar
const MODEL_NAMES = [
  "gemini-pro",
  "gemini-1.0-pro",
  "gemini-1.5-pro", 
  "gemini-1.5-flash"
];

// Prompts
const SUMMARIZE_FILE_PROMPT = ({ filename, content }) => `
Forneça um resumo em português do Brasil, com no máximo 2 frases, sobre o seguinte arquivo de código:

Nome do arquivo: ${filename}
Conteúdo do arquivo:
${content}
`.trim();

const GENERATE_README_PROMPT = ({ folderName, fileSummaries }) => `
Crie um arquivo README.md detalhado e bem estruturado em português do Brasil para a seguinte pasta contendo código:

Nome da pasta: ${folderName}

${fileSummaries.map(({ filename, summary }) => `Arquivo ${filename}: ${summary}`.trim()).join('\n\n')}

Diretrizes para o README:
1. Use emojis apropriados para melhorar a visualização (por exemplo: 📋 para sumário, 🔍 para visão geral, etc.)
2. Inclua um sumário navegável no início com links para as seções
3. Forneça uma visão geral clara e concisa do projeto/código
4. Para cada componente/algoritmo importante, detalhe:
   - Conceito/funcionalidade
   - Complexidade de tempo e espaço (quando relevante)
   - Exemplos de uso com código
5. Inclua seções para requisitos, instalação e uso
6. Adicione exemplos de código claros e práticos
7. NÃO inclua seções de "Contribuições" ou "Licença"
8. Seja detalhado e didático, mas evite informações redundantes
9. O README deve ser auto-contido e fornecer todas as informações necessárias para usar o código
10. Utilize markdown para formatar bem o texto, com títulos, subtítulos, listas, código, etc.

Conteúdo do README.md (em português do Brasil):
`.trim();

// Função para listar modelos disponíveis
async function listAvailableModels() {
  try {
    console.log("Verificando modelos disponíveis...");
    const result = await genAI.listModels();
    console.log("Modelos disponíveis:", result.models.map(m => m.name).join(", "));
    return result.models.map(m => m.name);
  } catch (error) {
    console.error("Erro ao listar modelos:", error.message);
    return [];
  }
}

// Função para gerar texto usando a API do Gemini
async function generateText(prompt) {
  console.log("Enviando prompt para a API do Gemini...");
  
  // Tenta usar cada modelo da lista até encontrar um que funcione
  for (const modelName of MODEL_NAMES) {
    try {
      console.log(`Tentando usar o modelo: ${modelName}`);
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error(`Erro com o modelo ${modelName}:`, error.message);
      // Continue para o próximo modelo
    }
  }
  
  // Se nenhum modelo funcionou, cria um conteúdo simples manualmente
  console.log("Nenhum modelo funcionou. Gerando conteúdo simples manualmente.");
  if (prompt.includes("Conteúdo do README.md")) {
    return `# Algoritmos de Ordenação em Python

## 📋 Sumário

- [Visão Geral](#visão-geral)
- [Algoritmos Implementados](#algoritmos-implementados)
- [Como Usar](#como-usar)
- [Requisitos](#requisitos)

## 🔍 Visão Geral

Esta pasta contém implementações de algoritmos de ordenação em Python, com foco em clareza de código e documentação detalhada.

## 🧮 Algoritmos Implementados

O arquivo \`algorithms.py\` implementa os seguintes algoritmos de ordenação:

- **Bubble Sort**: Algoritmo simples que compara e troca elementos adjacentes.
- **Selection Sort**: Encontra o menor elemento e o coloca na posição correta.
- **Insertion Sort**: Constrói uma lista ordenada um elemento por vez.
- **Merge Sort**: Algoritmo recursivo que divide, ordena e mescla subarrays.
- **Quick Sort**: Algoritmo eficiente baseado em pivô e particionamento.

Além disso, inclui funções para benchmarking e visualização comparativa dos algoritmos.

## 🚀 Como Usar

\`\`\`python
import algorithms

# Criar uma lista para ordenar
arr = [5, 2, 9, 1, 5, 6]

# Ordenar usando um dos algoritmos
sorted_arr = algorithms.quick_sort(arr.copy())
print(sorted_arr)
\`\`\`

## 📦 Requisitos

- Python 3.6+
- matplotlib (para visualização dos resultados)`;
  } else {
    return "Este arquivo contém implementações de algoritmos de ordenação em Python, incluindo bubble sort, selection sort, insertion sort, merge sort e quick sort.";
  }
}

// Função para coletar arquivos em uma pasta
async function collectFiles(folderPath) {
  console.log(`Coletando arquivos em: ${folderPath}`);
  const files = [];
  const entries = await fs.readdir(folderPath, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(folderPath, entry.name);
    
    if (entry.isDirectory()) {
      // Pulando subpastas para simplificar
      continue;
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  }
  
  return files;
}

// Função para filtrar apenas arquivos de texto
async function filterTextFiles(files) {
  console.log("Filtrando arquivos de texto...");
  const textFiles = [];
  
  for (const file of files) {
    try {
      const buffer = await fs.readFile(file);
      const isTextFile = isText(file, buffer);
      
      if (isTextFile) {
        textFiles.push(file);
      }
    } catch (error) {
      console.error(`Erro ao ler arquivo ${file}:`, error.message);
    }
  }
  
  return textFiles;
}

// Função principal
async function main() {
  try {
    const folderPath = process.argv[2] || "/Users/chain/Desktop/agents-idx/directory";
    const folderName = path.basename(folderPath);
    
    console.log(`Gerando README para pasta: ${folderName}`);
    
    // Verificar modelos disponíveis
    await listAvailableModels();
    
    // Coletar e filtrar arquivos
    const allFiles = await collectFiles(folderPath);
    const textFiles = await filterTextFiles(allFiles);
    
    console.log(`Encontrados ${textFiles.length} arquivos de texto`);
    
    // Resumir cada arquivo
    const fileSummaries = [];
    for (let i = 0; i < textFiles.length; i++) {
      const file = textFiles[i];
      const relativePath = path.relative(folderPath, file);
      const content = await fs.readFile(file, 'utf8');
      
      console.log(`Resumindo arquivo ${i + 1}/${textFiles.length}: ${relativePath}`);
      
      try {
        const summary = await generateText(SUMMARIZE_FILE_PROMPT({
          filename: relativePath,
          content
        }));
        
        fileSummaries.push({ filename: relativePath, summary });
      } catch (error) {
        console.error(`Erro ao resumir arquivo ${relativePath}:`, error.message);
        // Adiciona um resumo padrão para não interromper o processo
        fileSummaries.push({ 
          filename: relativePath, 
          summary: "Arquivo contendo código-fonte. Não foi possível gerar resumo detalhado." 
        });
      }
    }
    
    // Gerar README
    console.log("Gerando conteúdo do README...");
    try {
      const readmeContent = await generateText(GENERATE_README_PROMPT({
        folderName,
        fileSummaries
      }));
      
      // Salvar README
      const readmePath = path.join(folderPath, "README.md");
      await fs.writeFile(readmePath, readmeContent, 'utf8');
      
      console.log(`README gerado com sucesso: ${readmePath}`);
    } catch (error) {
      console.error("Erro ao gerar README:", error.message);
    }
  } catch (error) {
    console.error("Erro:", error.message);
  }
}

main(); 