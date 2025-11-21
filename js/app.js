import { MENU } from './data.js';
import { saveTransaction, getReport, clearReport } from './report.js';
import { sendToDiscord } from './discord.js';

const fmt = (v) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(v);

// --- STATE MANAGEMENT ---
let cart = JSON.parse(localStorage.getItem('cart_temp') || '[]');
let isStockMode = false; 

// Load menu dari LocalStorage jika ada (biar status stok tersimpan), kalau tidak pakai default dari data.js
let localMenu = JSON.parse(localStorage.getItem('menu_stock')) || MENU;

// Sinkronisasi ID (Jaga-jaga kalau kamu nambah menu baru di data.js, tapi localStorage masih data lama)
// Jika panjang array beda, kita reset ke default data.js
if(localMenu.length !== MENU.length) {
    localMenu = MENU;
    localStorage.setItem('menu_stock', JSON.stringify(localMenu));
}

// --- DOM ELEMENTS ---
const els = {
  grid: document.getElementById('menu-grid'),
  cartList: document.getElementById('cart-list'),
  cartCount: document.getElementById('cart-count'),
  total: document.getElementById('total'),
  note: document.getElementById('note'),
  custName: document.getElementById('customer-name'),
  btnSend: document.getElementById('btn-send'),
  alertModal: document.getElementById('custom-alert'),
  alertTitle: document.getElementById('alert-title'),
  alertMsg: document.getElementById('alert-msg'),
  btnAlertOk: document.getElementById('btn-alert-ok'),
  modalReport: document.getElementById('modal-report'),
  modalVariant: document.getElementById('modal-variant'),
  variantTitle: document.getElementById('variant-title'),
  variantOptions: document.getElementById('variant-options'),
  btnReport: document.getElementById('btn-report'),
  btnCloseReport: document.getElementById('close-report'),
  btnClearReport: document.getElementById('clear-report'),
  reportContent: document.getElementById('report-content'),
  // Tombol Stok Baru
  btnStockMode: document.getElementById('btn-stock-mode')
};

// --- HELPER STOK ---
function saveMenuStock() {
    localStorage.setItem('menu_stock', JSON.stringify(localMenu));
}

window.toggleStockMode = () => {
    isStockMode = !isStockMode;
    
    // Update Visual Tombol
    const btn = document.getElementById('btn-stock-mode');
    if(isStockMode) {
        btn.classList.add('bg-red-500', 'text-white', 'animate-pulse');
        btn.classList.remove('bg-bebyte-purple');
        btn.innerHTML = "⚠️ EDIT STOK";
        showAlert("MODE ATUR STOK", "Klik menu untuk ubah status HABIS/ADA.");
    } else {
        btn.classList.remove('bg-red-500', 'text-white', 'animate-pulse');
        btn.classList.add('bg-bebyte-purple');
        btn.innerHTML = "📦 Stok";
    }
    renderMenu();
};

// --- RENDER MENU (LOGIC CASHIER VS STOCK) ---
function renderMenu() {
  // Ubah tampilan grid kalau lagi mode edit stok
  els.grid.className = isStockMode 
    ? "grid grid-cols-2 sm:grid-cols-3 gap-4 border-4 border-red-500 p-2 rounded-xl bg-red-50 shadow-[0_0_15px_rgba(255,0,0,0.5)]" 
    : "grid grid-cols-2 sm:grid-cols-3 gap-4";

  els.grid.innerHTML = localMenu.map(m => {
    // Logic Cek Ketersediaan
    let isFullOOS = false;
    if (m.variants) {
       // Kalau semua varian active=false, maka menu mati total
       isFullOOS = m.variants.every(v => v.active === false);
    } else {
       isFullOOS = !m.active;
    }

    // Visual Logic
    const cardClass = isFullOOS ? "grayscale opacity-70" : "";
    
    // Tentukan aksi tombol (Beli vs Edit Stok)
    let action, btnText, btnClass;

    if (isStockMode) {
        // MODE EDIT
        action = `toggleStock(${m.id})`;
        btnText = isFullOOS ? "SET: ADA" : "SET: HABIS";
        btnClass = isFullOOS ? "bg-blue-500 text-white hover:bg-blue-600" : "bg-red-500 text-white hover:bg-red-600";
    } else {
        // MODE KASIR
        action = isFullOOS ? "" : `handleItemClick(${m.id})`;
        btnText = isFullOOS ? "HABIS ❌" : (m.variants ? 'PILIH ▾' : '+ ADD');
        btnClass = isFullOOS 
            ? "bg-gray-400 border-gray-500 cursor-not-allowed" 
            : "bg-bebyte-green text-black hover:bg-green-400 shadow-[2px_2px_0px_0px_black] active:translate-y-1 active:shadow-none";
    }

    return `
    <article class="bg-white rounded-xl overflow-hidden card-pop flex flex-col h-full relative group ${cardClass}">
      <div class="relative h-40 w-full overflow-hidden bg-gray-200">
        <img src="${m.img}" alt="${m.name}" class="w-full h-full object-cover transition duration-500 group-hover:scale-110">
        ${isFullOOS ? '<div class="absolute inset-0 flex items-center justify-center bg-black/60 z-20"><span class="text-white font-black text-2xl border-4 border-white px-2 -rotate-12">HABIS!</span></div>' : ''}
        
        <div class="absolute top-2 right-2 bg-bebyte-purple text-white text-xs font-bold px-2 py-1 border-2 border-black rounded transform rotate-3 shadow-sm z-10">
          ${m.category}
        </div>
      </div>
      
      <div class="p-3 flex flex-col flex-grow">
        <h3 class="font-black text-lg text-black leading-tight mb-1 uppercase">${m.name}</h3>
        <div class="flex-grow"></div> 
        <div class="flex justify-between items-end mt-3 pt-2 border-t-2 border-dashed border-gray-200">
          <span class="font-bold text-bebyte-purple bg-purple-100 px-2 py-1 rounded border border-purple-200 text-sm">${fmt(m.price)}</span>
          <button onclick="${action}" class="${btnClass} border-2 border-black px-4 py-1 rounded-lg font-bold text-sm transition flex items-center gap-1">
            ${btnText}
          </button>
        </div>
      </div>
    </article>
  `}).join('');
}

// --- LOGIC STOCK MANAGEMENT ---
window.toggleStock = (id) => {
    const item = localMenu.find(x => x.id === id);
    if(item.variants) {
        openVariantStockModal(item);
    } else {
        item.active = !item.active;
        saveMenuStock();
        renderMenu();
    }
};

function openVariantStockModal(item) {
    els.variantTitle.innerText = `ATUR STOK: ${item.name}`;
    els.variantOptions.innerHTML = item.variants.map(v => `
      <button onclick="toggleVariantStock(${item.id}, '${v.name}')" 
        class="w-full text-left px-4 py-3 border-2 border-black rounded-lg font-bold mb-2 flex justify-between items-center transition
        ${v.active ? 'bg-green-100 hover:bg-green-200' : 'bg-red-100 hover:bg-red-200'}">
        <span>${v.name}</span>
        <span class="text-xs border border-black px-2 py-1 rounded bg-white">${v.active ? '✅ ADA' : '❌ HABIS'}</span>
      </button>
    `).join('');
    els.modalVariant.classList.remove('hidden');
}

window.toggleVariantStock = (id, vName) => {
    const item = localMenu.find(x => x.id === id);
    const variant = item.variants.find(v => v.name === vName);
    variant.active = !variant.active;
    saveMenuStock();
    openVariantStockModal(item); // Refresh modal biar kelihatan updatenya
    renderMenu(); // Refresh grid belakang
};

// --- LOGIC TRANSAKSI (KASIR) ---
window.handleItemClick = (id) => {
  const item = localMenu.find(x => x.id === id);
  if (item.variants) openVariantModal(item);
  else addToCart(item, null);
};

function openVariantModal(item) {
  els.variantTitle.innerText = `Pilih Rasa ${item.name}`;
  els.variantOptions.innerHTML = item.variants.map(v => {
      // Cek Active Status
      const isHabis = !v.active;
      const btnClass = isHabis 
        ? "bg-gray-200 text-gray-400 border-gray-300 cursor-not-allowed"
        : "bg-white hover:bg-bebyte-yellow hover:shadow-[2px_2px_0px_0px_black] border-black cursor-pointer group";
      
      const clickAction = isHabis ? "" : `onclick="selectVariant(${item.id}, '${v.name}')"`;

      return `
        <button ${clickAction} 
          class="w-full text-left px-4 py-3 border-2 rounded-lg font-bold transition flex justify-between items-center ${btnClass}">
          <span>${v.name} ${isHabis ? '(HABIS)' : ''}</span>
          ${!isHabis ? '<span class="opacity-0 group-hover:opacity-100 transition">➕</span>' : '<span>🚫</span>'}
        </button>
      `;
  }).join('');
  els.modalVariant.classList.remove('hidden');
}

window.selectVariant = (id, variantName) => {
  const item = localMenu.find(x => x.id === id);
  addToCart(item, variantName);
  els.modalVariant.classList.add('hidden');
};

function addToCart(item, variantName) {
  // Cari item di cart berdasarkan ID dan Nama Varian
  const existingItem = cart.find(x => x.id === item.id && x.variant === variantName);
  if (existingItem) existingItem.qty++;
  else {
      // PENTING: Kita push object baru, jangan push referensi 'item' langsung karena 'item' ada property 'active' dll yg gak butuh di cart
      cart.push({ 
          id: item.id,
          name: item.name,
          price: item.price,
          variant: variantName, 
          qty: 1 
      });
  }
  updateCart();
}

window.updateQty = (id, variant, delta) => {
  // Handle variant string null/"null" agar matching aman
  const vKey = variant === 'null' ? null : variant;
  const item = cart.find(x => x.id === id && x.variant === vKey);
  if(item) {
    item.qty += delta;
    if(item.qty <= 0) cart = cart.filter(x => !(x.id === id && x.variant === vKey));
    updateCart();
  }
};

function updateCart() {
  localStorage.setItem('cart_temp', JSON.stringify(cart));
  els.cartCount.textContent = cart.reduce((a,b)=>a+b.qty,0);

  els.cartList.innerHTML = cart.length ? cart.map(i => `
    <div class="flex justify-between items-center bg-white p-2 rounded border-2 border-black mb-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)]">
      <div class="flex-1 pr-2">
        <div class="font-bold text-sm leading-tight text-black">
          ${i.name} 
          ${i.variant ? `<span class="text-bebyte-purple text-xs block mt-0.5">(${i.variant})</span>` : ''}
        </div>
        <div class="text-xs font-mono text-gray-500 mt-1">${fmt(i.price)} x ${i.qty}</div>
      </div>
      <div class="flex items-center gap-1">
        <button onclick="updateQty(${i.id}, '${i.variant}', -1)" class="w-6 h-6 flex items-center justify-center bg-gray-200 text-black border border-black rounded hover:bg-gray-300 font-bold">-</button>
        <span class="text-sm font-bold w-5 text-center">${i.qty}</span>
        <button onclick="updateQty(${i.id}, '${i.variant}', 1)" class="w-6 h-6 flex items-center justify-center bg-bebyte-purple text-white border border-black rounded hover:bg-purple-700 font-bold">+</button>
      </div>
    </div>
  `).join('') : `
    <div class="text-center py-6 opacity-50">
        <div class="text-4xl mb-2">🍽️</div>
        <p class="font-bold text-sm">Empty Plate!</p>
    </div>
  `;

  const total = cart.reduce((a,b) => a + (b.price * b.qty), 0);
  els.total.textContent = fmt(total);
}

// --- ALERT & MODAL HANDLERS ---
window.showAlert = (title, msg) => {
    els.alertTitle.innerText = title;
    els.alertMsg.innerText = msg;
    els.alertModal.classList.remove('hidden');
};
els.btnAlertOk.addEventListener('click', () => els.alertModal.classList.add('hidden'));
document.getElementById('close-variant').addEventListener('click', () => els.modalVariant.classList.add('hidden'));
els.btnCloseReport.addEventListener('click', () => els.modalReport.classList.add('hidden'));
els.btnClearReport.addEventListener('click', clearReport);

// --- SEND HANDLER ---
els.btnSend.addEventListener('click', async () => {
  if(!cart.length) return showAlert("KERANJANG KOSONG", "Oi! Pilih menu dulu sebelum bayar dong!");
  const custName = els.custName.value.trim();
  if(!custName) {
      els.custName.focus();
      return showAlert("SIAPA NI?", "Nama pemesan wajib diisi ya bro!");
  }

  const total = cart.reduce((a,b) => a + (b.price * b.qty), 0);
  const note = els.note.value;
  els.btnSend.disabled = true;
  els.btnSend.textContent = "SENDING...";

  // Format nama item untuk laporan
  const itemsForReport = cart.map(i => ({
    ...i,
    name: i.variant ? `${i.name} (${i.variant})` : i.name
  }));
  const customerInfo = { name: custName.toUpperCase() };

  const trxId = saveTransaction(itemsForReport, total, note, customerInfo);
  const disc = await sendToDiscord(itemsForReport, total, note, trxId, customerInfo);

  if(disc.success) {
    showAlert("SIAP SAJI!", `Pesanan ${custName} berhasil dikirim!`);
    cart = [];
    els.note.value = '';
    els.custName.value = '';
    updateCart();
  } else {
    showAlert("ERROR", "Gagal kirim ke Discord, tapi data aman di Admin.");
  }
  els.btnSend.disabled = false;
  els.btnSend.textContent = "CHECKOUT NOW ➤";
});

// --- REPORT HANDLER ---
els.btnReport.addEventListener('click', () => {
  try {
    const data = getReport();
    const topItemsHtml = Object.keys(data.itemCounts).length > 0 
      ? Object.entries(data.itemCounts)
          .sort(([,a], [,b]) => b - a)
          .map(([name, qty]) => 
            `<li class="flex justify-between border-b border-dashed border-gray-300 pb-1">
              <span class="capitalize text-black">${name.toLowerCase()}</span>
              <span class="font-bold bg-bebyte-yellow px-2 rounded-sm border border-black text-xs flex items-center">${qty} sold</span>
            </li>`
          ).join('')
      : '<li class="text-gray-400 text-center italic py-2">Belum ada penjualan.</li>';

    els.reportContent.innerHTML = `
      <div class="grid grid-cols-2 gap-4 mb-6">
        <div class="bg-gray-100 p-3 rounded border-2 border-black text-center shadow-sm">
          <div class="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Revenue</div>
          <div class="text-xl font-black text-bebyte-purple">${fmt(data.totalOmset)}</div>
        </div>
        <div class="bg-gray-100 p-3 rounded border-2 border-black text-center shadow-sm">
          <div class="text-xs font-bold text-gray-500 uppercase tracking-wider">Orders</div>
          <div class="text-xl font-black text-bebyte-purple">${data.totalTrx}</div>
        </div>
      </div>
      <h4 class="font-bold mb-2 text-sm uppercase tracking-wide text-bebyte-purple border-b-2 border-black pb-1 inline-block">🔥 Top Items:</h4>
      <ul class="space-y-2 text-sm max-h-40 overflow-y-auto pr-1 custom-scroll">${topItemsHtml}</ul>
    `;
    els.modalReport.classList.remove('hidden');
  } catch (err) {
    console.error(err);
    showAlert("ERROR", "Gagal memuat laporan.");
  }
});

// INIT
renderMenu();
updateCart();
