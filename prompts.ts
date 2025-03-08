interface SimpleFile {
  filename: string;
  content: string;
}

interface FileSummary {
  filename: string;
  summary: string;
}

/**
 * Um prompt texto->texto para resumir um arquivo e seu conteúdo.
 */
export const SUMMARIZE_FILE_PROMPT = ({ filename, content }: SimpleFile) => `
Forneça um resumo em português do Brasil, com no máximo 2 frases, sobre o seguinte arquivo de código:

Nome do arquivo: ${filename}
Conteúdo do arquivo:
${content}
`.trim();

/**
 * Um prompt texto->texto para gerar um arquivo README.md para uma pasta com os
 * resumos de arquivos fornecidos.
 */
export const GENERATE_README_PROMPT = ({ folderName, fileSummaries }: { folderName: string; fileSummaries: FileSummary[] }) => `
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