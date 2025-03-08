const { exec } = require('child_process');
const { promisify } = require('util');
const execPromise = promisify(exec);
const packageJson = require('./package.json');

exports.pushExtensionToIdx = async () => {
  try {
    const fqExtensionId = `${packageJson.publisher || 'undefined_publisher'}.${packageJson.name}`;
    const version = packageJson.version;
    const vsixFilename = `${packageJson.name}-${version}.vsix`;
    
    // Empacotar com a versão correta
    await execPromise(`npx @vscode/vsce package --allow-missing-repository --skip-license`);
    
    // Desinstalar versão anterior
    await execPromise(`code --uninstall-extension ${fqExtensionId}`);
    
    // Instalar nova versão
    await execPromise(`code --install-extension ${vsixFilename} --force`);
    
    console.log(`Reinstalled extension version ${version} (refresh the browser to try it)`);
  } catch (e) {
    console.error(e);
  }
};