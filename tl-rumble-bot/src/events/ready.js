import { config } from '../config.js';
import { getSlotsForReminder, markReminderSent } from '../services/slotService.js';

function formatSlotDatetime(isoUtc) {
  try {
    const d = new Date(isoUtc);
    return d.toLocaleString('fr-FR', { timeZone: config.serverTimezone });
  } catch {
    return isoUtc;
  }
}

async function runReminders(client) {
  const slots = getSlotsForReminder();
  for (const slot of slots) {
    try {
      const localStr = formatSlotDatetime(slot.datetime_utc);
      const text = `⏰ **Rappel :** le wargame est dans **10 minutes** (${localStr}). Préparez-vous !`;

      if (slot.schedule_thread_id) {
        const thread = await client.channels.fetch(slot.schedule_thread_id).catch(() => null);
        if (thread) await thread.send(text).catch(() => {});
      } else if (config.wargameScheduleChannelId) {
        const channel = await client.channels.fetch(config.wargameScheduleChannelId).catch(() => null);
        if (channel) await channel.send(text).catch(() => {});
      }
      markReminderSent(slot.id);
    } catch (err) {
      console.error('Erreur rappel slot', slot.id, err);
    }
  }
}

export default {
  name: 'clientReady',
  once: true,
  execute(client) {
    console.log(`Connecté en tant que ${client.user.tag}`);
    setInterval(() => runReminders(client), 60 * 1000);
  },
};
