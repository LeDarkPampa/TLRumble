import { readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export async function loadCommands(client) {
  const commandsPath = join(__dirname, '../commands');

  async function loadFromPath(dirPath) {
    const entries = readdirSync(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dirPath, entry.name);

      if (entry.isDirectory()) {
        await loadFromPath(fullPath);
        continue;
      }

      if (!entry.name.endsWith('.js')) continue;

      const fileUrl = `file://${fullPath.replace(/\\/g, '/')}`;
      const module = await import(fileUrl);
      const command = module.default;

      if (!command?.data?.name || typeof command.execute !== 'function') {
        console.warn(`⚠️ Commande ignorée (data/execute manquants): ${fullPath}`);
        continue;
      }

      client.commands.set(command.data.name, command);
      console.log(`✅ Commande chargée: ${command.data.name}`);
    }
  }

  await loadFromPath(commandsPath);
}
