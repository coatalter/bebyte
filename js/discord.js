import { CONFIG } from './data.js';

const fmt = (v) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(v);

export async function sendToDiscord(cart, total, note, trxId, customerInfo) {
  if (!CONFIG.WEBHOOK_URL) return { success: false, msg: "Webhook URL kosong" };

  const itemsList = cart.map(i => `**${i.qty}x** ${i.name}`).join('\n');
  const custDisplay = `**${customerInfo.name}**`; 

  const payload = {
    username: CONFIG.STORE_NAME,
    avatar_url: "./assets/discordpfp.png", 
    embeds: [
      {
        title: `🔥 Pesanan Baru #${trxId.toString().slice(-4)}`,
        description: `Pemesan: ${custDisplay}`, 
        color: 16769280,
        fields: [
          { name: "Menu", value: itemsList ? itemsList : "-", inline: false },
          { name: "Notes", value: note || "-", inline: true },
          { name: "Payment", value: `${customerInfo.method}\n**${fmt(total)}**`, inline: true }
        ],
        footer: { text: `BeByte Bazaar • ${new Date().toLocaleTimeString('id-ID')}` },
        timestamp: new Date().toISOString()
      }
    ]
  };

  try {
    const res = await fetch(CONFIG.WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return { success: res.ok, status: res.status };
  } catch (err) {
    console.error(err);
    return { success: false, msg: err };
  }
}
