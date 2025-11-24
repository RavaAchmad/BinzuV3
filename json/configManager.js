
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url); 
const __dirname = path.dirname(__filename);
// Ganti nama file-nya di sini
const configPath = path.resolve(__dirname, 'brainiesDB.json'); 

async function readConfig() {
  try {
    const data = await fs.readFile(configPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('File DB ga ada', error);
    return {};
  }
}

async function writeConfig(data) {
  try {
    await fs.writeFile(configPath, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('WADUH, GAGAL NULIS KE DB!', error);
  }
}

export { readConfig, writeConfig };