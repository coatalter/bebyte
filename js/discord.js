import { CONFIG } from './data.js';

const fmt = (v) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(v);

export async function sendToDiscord(cart, total, note, trxId) {
  if (!CONFIG.WEBHOOK_URL) return { success: false, msg: "Webhook URL kosong" };

  // Format text item supaya rapi di Discord
  const itemsList = cart.map(i => `**${i.qty}x** ${i.name} (${fmt(i.price * i.qty)})`).join('\n');

  const payload = {
    username: CONFIG.STORE_NAME,
    avatar_url: "https://i.pinimg.com/736x/40/12/59/401259c5a33e523f7a934ac21007988d.jpg", 
    embeds: [
      {
        title: `🛒 Pesanan Baru #${trxId.toString().slice(-4)}`, 
        color: 3066993, // Warna Hijau (Decimal)
        fields: [
          { name: "Menu Dipesan", value: itemsList ? itemsList : "Tidak ada item", inline: false },
          { name: "Catatan", value: note || "-", inline: true },
          { name: "Total Bayar", value: `**${fmt(total)}**`, inline: true }
        ],
        footer: { text: `Waktu: ${new Date().toLocaleTimeString('id-ID')} | Klik reaksi ✅ jika selesai.` },
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

// https://discord.com/api/webhooks/1441533794224967730/9nSnB7dKxyGBnrx7-da0dcioAUIs6MpP_Lu-FCQbd6cdky34ykRkHHl9ka8GI-qrGkjO