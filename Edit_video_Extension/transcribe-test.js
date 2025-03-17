#!/usr/bin/env node

/**
 * CLI para transcrição de arquivos de áudio usando a API Gemini
 * Uso: GEMINI_API_KEY=sua_chave_api node transcribe-test.js [caminho/para/arquivo.mp3]
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Obter argumentos da linha de comando
const audioFile = process.argv[2];

// Verificar se foi fornecido um arquivo
if (!audioFile) {
  console.error('\n🔴 ERRO: Nenhum arquivo especificado!');
  console.log('\n📋 Uso: GEMINI_API_KEY=sua_chave_api node transcribe-test.js [caminho/para/arquivo.mp3]');
  console.log('\n📌 Formatos suportados: .mp3 (use convert-test.js para converter outros formatos)');
  process.exit(1);
}

// API Key do Gemini - fornecida via variável de ambiente
const API_KEY = process.env.GEMINI_API_KEY || '';

// URL base da API Gemini
const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';

// Modelos disponíveis
const MODELS = ['gemini-1.5-pro', 'gemini-pro', 'gemini-1.0-pro'];

// Função para transcrever áudio
async function transcribeAudio(filePath) {
  if (!API_KEY) {
    console.error('\n🔴 ERRO: GEMINI_API_KEY não definida.');
    console.error('\n💡 Execute com: GEMINI_API_KEY=sua_chave_api node transcribe-test.js [arquivo]');
    process.exit(1);
  }
  
  console.log('\n🔍 Verificando arquivo...');
  if (!fs.existsSync(filePath)) {
    console.error(`\n🔴 ERRO: Arquivo não encontrado: ${filePath}`);
    process.exit(1);
  }
  
  const fileExt = path.extname(filePath).toLowerCase();
  if (fileExt !== '.mp3') {
    console.error('\n🔴 ERRO: O arquivo deve ser um MP3.');
    console.error('\n💡 Use o comando: node convert-test.js [arquivo] para converter primeiro.');
    process.exit(1);
  }
  
  console.log('\n📂 Lendo arquivo de áudio...');
  const audioBuffer = fs.readFileSync(filePath);
  const base64Audio = audioBuffer.toString('base64');
  console.log(`\n✅ Arquivo lido: ${(audioBuffer.length / 1024).toFixed(2)} KB`);
  
  // Prompt para transcrição
  const prompt = `
  Você é um assistente de transcrição de áudio profissional.
  
  Por favor, transcreva o conteúdo do áudio em português, formatando o texto corretamente com pontuação e parágrafos.
  Remova qualquer hesitação, repetições ou sons de preenchimento ("hmm", "ah", etc).
  Mantenha o texto limpo e legível, preservando o significado original.
  
  Caso o áudio esteja em outro idioma, transcreva no idioma original e forneça uma tradução para o português.
  `;
  
  // Tentar cada modelo disponível
  let lastError = null;
  
  for (const model of MODELS) {
    try {
      console.log(`\n🤖 Tentando transcrever com modelo: ${model}`);
      
      const url = `${BASE_URL}/models/${model}:generateContent?key=${API_KEY}`;
      
      // Construir payload
      const payload = {
        contents: [
          {
            role: "user",
            parts: [
              { text: prompt },
              { inline_data: { mime_type: "audio/mp3", data: base64Audio } }
            ]
          }
        ],
        generation_config: {
          temperature: 0.2,
          topP: 0.8,
          topK: 40
        }
      };
      
      // Fazer a requisição
      console.log('\n⏳ Enviando requisição para a API Gemini...');
      console.log(`\n📡 URL da API: ${url.replace(API_KEY, 'API_KEY_OCULTA')}`);
      
      const response = await axios.post(url, payload, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 180000 // 3 minutos
      });
      
      console.log('\n✅ Resposta recebida da API Gemini');
      
      // Verificar formato da resposta
      if (response.data && 
          response.data.candidates && 
          response.data.candidates.length > 0 && 
          response.data.candidates[0].content &&
          response.data.candidates[0].content.parts &&
          response.data.candidates[0].content.parts.length > 0) {
        
        // Extrair o texto da transcrição
        const transcription = response.data.candidates[0].content.parts[0].text || '';
        console.log(`\n🎉 Transcrição concluída com sucesso. Tamanho: ${transcription.length} caracteres`);
        
        if (transcription.length > 0) {
          console.log('\n📋 Amostra da transcrição:');
          console.log('---------------------------');
          console.log(transcription.substring(0, 200) + (transcription.length > 200 ? '...' : ''));
          console.log('---------------------------');
          
          // Salvar a transcrição como arquivo de texto
          const textFilePath = filePath.replace(/\.mp3$/, '.txt');
          fs.writeFileSync(textFilePath, transcription);
          console.log(`\n💾 Transcrição completa salva em: ${textFilePath}`);
          
          return transcription;
        } else {
          throw new Error('A transcrição retornada está vazia');
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
      console.error(`\n🔴 ERRO ao transcrever com modelo ${model}: ${error.message}`);
      
      if (error.response) {
        console.error('\n📋 Detalhes do erro:');
        const errorData = error.response.data;
        console.error(JSON.stringify(errorData, null, 2).substring(0, 500) + '...');
      }
      
      // Continuar tentando com o próximo modelo
      console.log('\n🔄 Tentando próximo modelo...');
    }
  }
  
  // Se chegou aqui, todos os modelos falharam
  console.error('\n❌ Todos os modelos disponíveis falharam');
  throw lastError || new Error('Falha na transcrição com todos os modelos');
}

// Função principal
async function main() {
  console.log('\n🎙️  TRANSCRIÇÃO DE ÁUDIO COM GEMINI AI');
  console.log('=====================================');
  
  try {
    // Transcrever o áudio
    await transcribeAudio(audioFile);
    
    console.log('\n🎉 Processo concluído com sucesso!');
  } catch (error) {
    console.error(`\n❌ Erro no processo: ${error.message}`);
    process.exit(1);
  }
}

// Iniciar o processo
main(); 