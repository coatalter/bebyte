import { CONFIG } from './data.js';

const fmt = (v) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(v);

// --- FUNGSI 1: KIRIM ORDER BARU (PING DAPUR) ---
export async function sendToDiscord(cart, total, note, queueNo, customerInfo) {
  if (!CONFIG.WEBHOOK_URL) return { success: false };

  let itemsList = cart.map(i => `• **${i.qty}x** ${i.name}`).join('\n');
  if (!itemsList) itemsList = "Tanpa Item";
  const safeNote = (note && note.trim().length > 0) ? note : "-";
  
  // Format Ping Role (Jika ada ID nya)
  const mentionRole = CONFIG.ROLE_ID_DAPUR ? `<@&${CONFIG.ROLE_ID_DAPUR}>` : "@here";

  const payload = {
    username: "BeByte Order",
    // 'content' berada di luar embeds agar bisa nge-PING orang
    content: `🔔 **ORDER BARU!** ${mentionRole} tolong masak ya!`,
    embeds: [
      {
        title: `🔥 Pesanan Baru #${queueNo}`, // SUDAH DIPERBAIKI: Pakai queueNo (001), bukan timestamp
        description: `**Pelanggan:** ${customerInfo.name}`,
        color: 16776960, // Kuning (Pending)
        fields: [
          { name: "📦 Menu", value: itemsList.substring(0, 1024), inline: false },
          { name: "📝 Catatan", value: safeNote.substring(0, 1024), inline: true },
          { name: "💰 Status", value: "LUNAS / SUDAH BAYAR", inline: true }
        ],
        footer: { text: `Masuk jam: ${new Date().toLocaleTimeString('id-ID')}` },
        timestamp: new Date().toISOString()
      }
    ]
  };

  return sendPayload(payload);
}

// --- FUNGSI 2: KIRIM NOTIFIKASI SELESAI ---
export async function sendOrderDone(queueNo, customerName) {
    if (!CONFIG.WEBHOOK_URL) return;
  
    const payload = {
      username: "BeByte Kitchen",
      content: `✅ **PESANAN SELESAI!**`,
      embeds: [
        {
          title: `✅ ORDER #${queueNo} SIAP DIAMBIL!`,
          description: `Halo **${customerName}**, pesananmu sudah jadi nih.\nSilakan ambil di booth ya!`,
          color: 5763719, // Hijau (Sukses)
          timestamp: new Date().toISOString()
        }
      ]
    };
  
    return sendPayload(payload);
}

// --- HELPER KIRIM ---
async function sendPayload(payload) {
    try {
        await fetch(CONFIG.WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        return { success: true };
    } catch (err) {
        console.error("Discord Error:", err);
        return { success: false };
    }
}