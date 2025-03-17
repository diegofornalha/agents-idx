#!/usr/bin/env node

/**
 * CLI para geração de SEO para YouTube com base em transcrições
 * Uso: GEMINI_API_KEY=sua_chave_api node seo-test.js [arquivo_de_transcrição.txt] [estilo]
 * 
 * Estilos disponíveis:
 * - clickbait: Títulos impactantes e chamativo com emojis
 * - educational: Foco educacional e informativo
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Obter argumentos da linha de comando
const transcriptionFile = process.argv[2];
const style = process.argv[3] || 'clickbait';

// Verificar se foi fornecido um arquivo
if (!transcriptionFile) {
  console.error('\n🔴 ERRO: Nenhum arquivo de transcrição especificado!');
  console.log('\n📋 Uso: GEMINI_API_KEY=sua_chave_api node seo-test.js [arquivo_de_transcrição.txt] [estilo]');
  console.log('\n📌 Estilos disponíveis: clickbait, educational');
  process.exit(1);
}

// Verificar se o estilo é válido
const validStyles = ['clickbait', 'educational'];
if (!validStyles.includes(style)) {
  console.error(`\n🔴 ERRO: Estilo "${style}" não reconhecido!`);
  console.log(`\n📌 Estilos disponíveis: ${validStyles.join(', ')}`);
  process.exit(1);
}

// API Key do Gemini - fornecida via variável de ambiente
const API_KEY = process.env.GEMINI_API_KEY || '';

// URL base da API Gemini
const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';

// Modelos disponíveis
const MODELS = ['gemini-1.5-pro', 'gemini-pro', 'gemini-1.0-pro'];

/**
 * Geração de SEO para YouTube
 */
async function generateSEO(filePath, style) {
  if (!API_KEY) {
    console.error('\n🔴 ERRO: GEMINI_API_KEY não definida.');
    console.error('\n💡 Execute com: GEMINI_API_KEY=sua_chave_api node seo-test.js [arquivo] [estilo]');
    process.exit(1);
  }
  
  console.log('\n🔍 Verificando arquivo de transcrição...');
  if (!fs.existsSync(filePath)) {
    console.error(`\n🔴 ERRO: Arquivo não encontrado: ${filePath}`);
    process.exit(1);
  }
  
  const fileExt = path.extname(filePath).toLowerCase();
  if (!['.txt', '.md'].includes(fileExt)) {
    console.error('\n🔴 ERRO: O arquivo deve ser um arquivo de texto (.txt) ou markdown (.md)');
    process.exit(1);
  }
  
  console.log(`\n📂 Lendo arquivo de transcrição: ${filePath}`);
  const transcription = fs.readFileSync(filePath, 'utf8');
  
  if (transcription.length < 10) {
    console.error('\n🔴 ERRO: Arquivo de transcrição vazio ou muito pequeno');
    process.exit(1);
  }
  
  console.log(`\n✅ Arquivo lido: ${transcription.length} caracteres`);
  console.log(`\n🎯 Estilo de SEO selecionado: ${style}`);
  
  // Construir prompt para o estilo selecionado
  let prompt = buildSEOPrompt(transcription, style);
  
  // Tentar cada modelo disponível
  let lastError = null;
  
  for (const model of MODELS) {
    try {
      console.log(`\n🤖 Tentando gerar SEO com modelo: ${model}`);
      
      const url = `${BASE_URL}/models/${model}:generateContent?key=${API_KEY}`;
      
      // Construir payload
      const payload = {
        contents: [
          {
            role: "user",
            parts: [
              { text: prompt }
            ]
          }
        ],
        generation_config: {
          temperature: 0.7, // Mais criatividade para SEO
          topP: 0.9,
          topK: 40,
          maxOutputTokens: 2048
        }
      };
      
      // Fazer a requisição
      console.log('\n⏳ Enviando requisição para a API Gemini...');
      
      const response = await axios.post(url, payload, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 60000 // 1 minuto
      });
      
      console.log('\n✅ Resposta recebida da API Gemini');
      
      // Verificar e extrair o resultado
      if (response.data && 
          response.data.candidates && 
          response.data.candidates.length > 0 && 
          response.data.candidates[0].content &&
          response.data.candidates[0].content.parts &&
          response.data.candidates[0].content.parts.length > 0) {
        
        // Extrair o texto da resposta
        const outputText = response.data.candidates[0].content.parts[0].text || '';
        
        if (outputText.length > 0) {
          // Buscar pelo JSON na resposta
          let seoData;
          try {
            const jsonMatch = outputText.match(/```json\s*([\s\S]*?)\s*```/) || 
                              outputText.match(/\{[\s\S]*?\}/);
            
            if (jsonMatch) {
              const jsonStr = jsonMatch[1] || jsonMatch[0];
              seoData = JSON.parse(jsonStr);
              
              // Verificar a estrutura do JSON
              if (!seoData.title || !seoData.description || !seoData.tags) {
                throw new Error('Estrutura de SEO incompleta');
              }
            } else {
              throw new Error('Nenhum objeto JSON encontrado na resposta');
            }
          } catch (error) {
            console.error(`\n🔴 ERRO ao processar JSON: ${error.message}`);
            console.error('\n📋 Resposta recebida:');
            console.log(outputText.substring(0, 500) + '...');
            throw error;
          }
          
          // Exibir resultado
          console.log('\n🎉 SEO gerado com sucesso!');
          console.log('\n📺 YOUTUBE SEO');
          console.log('==============');
          console.log(`\n🔤 TÍTULO (${seoData.title.length} caracteres):`);
          console.log(seoData.title);
          
          console.log('\n🏷️  TAGS:');
          console.log(seoData.tags.join(', '));
          
          console.log('\n📝 DESCRIÇÃO:');
          const previewDesc = seoData.description.length > 200 
            ? seoData.description.substring(0, 200) + '...' 
            : seoData.description;
          console.log(previewDesc);
          
          // Salvar o SEO em um arquivo JSON
          const jsonFilePath = filePath.replace(/\.[^.]+$/, '-seo.json');
          fs.writeFileSync(jsonFilePath, JSON.stringify(seoData, null, 2));
          console.log(`\n💾 SEO completo salvo em: ${jsonFilePath}`);
          
          return seoData;
        } else {
          throw new Error('Resposta vazia recebida da API');
        }
      } else {
        console.error('\n🔴 ERRO: Resposta recebida, mas formato inválido ou vazio');
        if (process.env.DEBUG && response.data) {
          console.error('\n📋 Dados da resposta:', JSON.stringify(response.data, null, 2));
        }
        throw new Error('Formato de resposta inválido');
      }
    } catch (error) {
      lastError = error;
      console.error(`\n🔴 ERRO ao gerar SEO com modelo ${model}: ${error.message}`);
      
      if (error.response) {
        console.error('\n📋 Detalhes do erro:');
        console.error(JSON.stringify(error.response.data, null, 2).substring(0, 500) + '...');
      }
      
      // Continuar tentando com o próximo modelo
      console.log('\n🔄 Tentando próximo modelo...');
    }
  }
  
  // Se chegou aqui, todos os modelos falharam
  console.error('\n❌ Todos os modelos disponíveis falharam');
  throw lastError || new Error('Falha na geração de SEO com todos os modelos');
}

/**
 * Constrói o prompt para a geração de SEO baseado no estilo escolhido
 */
function buildSEOPrompt(transcription, style) {
  let prompt = `
  Com base na transcrição a seguir, gere um pacote SEO otimizado para YouTube no estilo ${style}.
  
  ESTILO ${style.toUpperCase()}:
  `;
  
  if (style === 'clickbait') {
    prompt += `
    - Título: Crie um título impactante e atraente em português brasileiro, com elementos de curiosidade e urgência.
      Use CAPS estrategicamente, números, e emojis relevantes no início e/ou fim. Máximo 70 caracteres.
    - Descrição: Crie uma descrição detalhada com emojis, call-to-action, principais tópicos do vídeo.
      Inclua timestamps dos principais momentos. Até 5000 caracteres.
    - Tags: Liste até 15 tags relevantes, com foco em termos de busca populares.
    `;
  } else if (style === 'educational') {
    prompt += `
    - Título: Crie um título informativo e educacional em português brasileiro.
      Seja claro sobre o conteúdo e valor educacional. Máximo 70 caracteres.
    - Descrição: Crie uma descrição estruturada, destacando os principais aprendizados.
      Inclua timestamps precisos e referências adicionais. Até 5000 caracteres.
    - Tags: Liste até 15 tags relevantes, com foco em termos educacionais e de pesquisa.
    `;
  }
  
  prompt += `
  
  RETORNE APENAS UM OBJETO JSON com a seguinte estrutura:
  {
      "title": "O título gerado",
      "description": "A descrição completa",
      "tags": ["tag1", "tag2", "..."]
  }
  
  TRANSCRIÇÃO:
  ${transcription.length > 10000 ? transcription.substring(0, 10000) + "..." : transcription}
  `;
  
  return prompt;
}

// Função principal
async function main() {
  console.log('\n🔍 GERADOR DE SEO PARA YOUTUBE');
  console.log('===========================');
  
  try {
    // Gerar SEO
    await generateSEO(transcriptionFile, style);
    
    console.log('\n🎉 Processo concluído com sucesso!');
  } catch (error) {
    console.error(`\n❌ Erro no processo: ${error.message}`);
    process.exit(1);
  }
}

// Iniciar o processo
main();