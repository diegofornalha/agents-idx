#!/usr/bin/env node

/**
 * CLI para conversão de arquivos de áudio para MP3
 * Uso: node convert-test.js [caminho/para/arquivo.m4a]
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// Obter argumentos da linha de comando
const audioFile = process.argv[2];

// Verificar se foi fornecido um arquivo
if (!audioFile) {
  console.error('\n🔴 ERRO: Nenhum arquivo especificado!');
  console.log('\n📋 Uso: node convert-test.js [caminho/para/arquivo.m4a]');
  console.log('\n📌 Formatos suportados: .m4a, .wav, .ogg, .flac');
  process.exit(1);
}

// Função para converter áudio para MP3
async function convertToMp3(filePath) {
  return new Promise((resolve, reject) => {
    console.log(`\n🔍 Processando arquivo de áudio: ${filePath}`);
    
    // Verificar se o arquivo existe
    if (!fs.existsSync(filePath)) {
      console.error(`\n🔴 ERRO: Arquivo não encontrado: ${filePath}`);
      return reject(new Error('Arquivo não encontrado'));
    }
    
    // Se já for MP3, retornar o caminho diretamente
    const fileExt = path.extname(filePath).toLowerCase();
    if (fileExt === '.mp3') {
      console.log('\n🟢 Arquivo já está em formato MP3, nenhuma conversão necessária.');
      return resolve(filePath);
    }
    
    // Verificar se é um formato suportado
    if (!['.m4a', '.wav', '.ogg', '.flac'].includes(fileExt)) {
      console.error(`\n🔴 ERRO: Formato não suportado: ${fileExt}`);
      console.log('\n📌 Formatos suportados: .m4a, .wav, .ogg, .flac');
      return reject(new Error('Formato de áudio não suportado'));
    }
    
    // Preparar caminho de saída
    const outputPath = filePath.replace(/\.[^.]+$/, '.mp3');
    console.log(`\n🔄 Convertendo ${fileExt} para MP3: ${outputPath}`);
    
    // Executar ffmpeg para converter
    console.log('\n⏳ Iniciando conversão com ffmpeg...');
    const ffmpeg = spawn('ffmpeg', [
      '-i', filePath,
      '-vn',
      '-ar', '44100',
      '-ac', '2',
      '-b:a', '192k',
      '-y', // Sobrescrever arquivo existente
      outputPath
    ]);
    
    let errorOutput = '';
    
    ffmpeg.stderr.on('data', (data) => {
      // ffmpeg usa stderr para logs de progresso
      const message = data.toString();
      if (process.env.DEBUG) {
        console.log(`ffmpeg: ${message}`);
      }
      errorOutput += message;
    });
    
    ffmpeg.on('close', (code) => {
      if (code === 0) {
        console.log(`\n✅ Áudio convertido para MP3: ${outputPath}`);
        
        // Verificar se o arquivo foi realmente criado
        if (fs.existsSync(outputPath)) {
          const stats = fs.statSync(outputPath);
          console.log(`\n📊 Tamanho do arquivo MP3: ${(stats.size / 1024).toFixed(2)} KB`);
          resolve(outputPath);
        } else {
          console.error(`\n🔴 ERRO: Arquivo MP3 não foi criado: ${outputPath}`);
          reject(new Error('Arquivo MP3 não foi criado'));
        }
      } else {
        console.error(`\n🔴 ERRO ao converter áudio para MP3. Código: ${code}`);
        if (errorOutput) {
          console.error('\n📋 Detalhes do erro:');
          console.error(errorOutput.split('\n').slice(0, 5).join('\n')); // Mostrar apenas as primeiras 5 linhas
        }
        reject(new Error(`Erro na conversão. Código: ${code}`));
      }
    });
    
    ffmpeg.on('error', (err) => {
      console.error(`\n🔴 ERRO ao executar ffmpeg: ${err.message}`);
      console.error('\n💡 Verifique se o ffmpeg está instalado em seu sistema.');
      reject(err);
    });
  });
}

// Função principal
async function main() {
  console.log('\n🎵 CONVERSOR DE ÁUDIO PARA MP3');
  console.log('===========================');
  
  try {
    // Converter áudio para MP3
    const mp3FilePath = await convertToMp3(audioFile);
    console.log('\n🎉 Conversão concluída com sucesso!');
    console.log(`\n📁 Arquivo MP3: ${mp3FilePath}`);
  } catch (error) {
    console.error(`\n❌ Erro no processo: ${error.message}`);
    process.exit(1);
  }
}

// Iniciar o processo
main(); 