import { MENU } from './data.js';
import { saveTransaction, getReport, clearReport } from './report.js';
import { sendToDiscord } from './discord.js';

const fmt = (v) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(v);

// --- STATE MANAGEMENT ---
let cart = JSON.parse(localStorage.getItem('cart_temp') || '[]');
let isStockMode = false; 

// Load menu dari LocalStorage agar status stok tersimpan
let localMenu = JSON.parse(localStorage.getItem('menu_stock')) || MENU;

// SAFETY CHECK: Jika jumlah menu di data.js berubah (kamu nambah menu baru),
// kita paksa reset localMenu agar tidak error karena data lama.
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
  btnStockMode: document.getElementById('btn-stock-mode') // Tombol Baru
};

// --- HELPER STOK ---
function saveMenuStock() {
    localStorage.setItem('menu_stock', JSON.stringify(localMenu));
}

window.toggleStockMode = () => {
    isStockMode = !isStockMode;
    
    // Update Visual Tombol Navbar
    const btn = els.btnStockMode;
    if(isStockMode) {
        btn.classList.remove('bg-bebyte-purple');
        btn.classList.add('bg-red-600', 'text-white', 'animate-pulse');
        btn.innerHTML = "⚠️ EDIT STOK";
        showAlert("MODE ATUR STOK", "Klik menu untuk mengubah status (HABIS / ADA).");
    } else {
        btn.classList.remove('bg-red-600', 'text-white', 'animate-pulse');
        btn.classList.add('bg-bebyte-purple');
        btn.innerHTML = "📦 Stok";
    }
    renderMenu();
};

// --- RENDER MENU ---
function renderMenu() {
  // Ubah style grid jika sedang mode edit stok
  els.grid.className = isStockMode 
    ? "grid grid-cols-2 sm:grid-cols-3 gap-4 border-4 border-red-500 p-2 rounded-xl bg-red-50" 
    : "grid grid-cols-2 sm:grid-cols-3 gap-4";

  els.grid.innerHTML = localMenu.map(m => {
    // 1. Cek Ketersediaan
    let isFullOOS = false;
    if (m.variants) {
       // Jika semua varian mati, maka menu mati total
       isFullOOS = m.variants.every(v => v.active === false);
    } else {
       isFullOOS = !m.active;
    }

    // 2. Visual Logic
    const cardClass = isFullOOS ? "grayscale opacity-70" : "";
    
    // 3. Tentukan Aksi Tombol
    let action, btnText, btnClass;

    if (isStockMode) {
        // -- MODE MANAGER --
        action = `toggleStock(${m.id})`;
        btnText = isFullOOS ? "SET: ADA" : "SET: HABIS";
        btnClass = isFullOOS ? "bg-blue-500 text-white" : "bg-red-500 text-white";
    } else {
        // -- MODE KASIR --
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
        <div class="absolute top-2 right-2 bg-bebyte-purple text-white text-xs font-bold px-2 py-1 border-2 border-black rounded z-10">
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

// --- LOGIC STOCK (MANAGER) ---
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
        <span class="text-xs border border-black px-2 py-1 rounded bg-white font-black">${v.active ? '✅ ADA' : '❌ HABIS'}</span>
      </button>
    `).join('');
    els.modalVariant.classList.remove('hidden');
}

window.toggleVariantStock = (id, vName) => {
    const item = localMenu.find(x => x.id === id);
    const variant = item.variants.find(v => v.name === vName);
    variant.active = !variant.active;
    saveMenuStock();
    openVariantStockModal(item); 
    renderMenu(); 
};

// --- LOGIC KASIR (CART) ---
window.handleItemClick = (id) => {
  const item = localMenu.find(x => x.id === id);
  if (item.variants) openVariantModal(item);
  else addToCart(item, null);
};

function openVariantModal(item) {
  els.variantTitle.innerText = `Pilih Rasa ${item.name}`;
  els.variantOptions.innerHTML = item.variants.map(v => {
      const isHabis = !v.active;
      const btnClass = isHabis 
        ? "bg-gray-200 text-gray-400 border-gray-300 cursor-not-allowed"
        : "bg-white hover:bg-bebyte-yellow hover:shadow-[2px_2px_0px_0px_black] border-black cursor-pointer group";
      
      const clickAction = isHabis ? "" : `onclick="selectVariant(${item.id}, '${v.name}')"`;

      return `
        <button ${clickAction} class="w-full text-left px-4 py-3 border-2 rounded-lg font-bold transition flex justify-between items-center ${btnClass}">
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
  const existingItem = cart.find(x => x.id === item.id && x.variant === variantName);
  if (existingItem) existingItem.qty++;
  else {
      cart.push({ 
          id: item.id, name: item.name, price: item.price, variant: variantName, qty: 1 
      });
  }
  updateCart();
}

window.updateQty = (id, variant, delta) => {
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
          ${i.name} ${i.variant ? `<span class="text-bebyte-purple text-xs">(${i.variant})</span>` : ''}
        </div>
        <div class="text-xs font-mono text-gray-500">${fmt(i.price)} x ${i.qty}</div>
      </div>
      <div class="flex items-center gap-1">
        <button onclick="updateQty(${i.id}, '${i.variant}', -1)" class="w-6 h-6 bg-gray-200 border border-black rounded font-bold">-</button>
        <span class="text-sm font-bold w-5 text-center">${i.qty}</span>
        <button onclick="updateQty(${i.id}, '${i.variant}', 1)" class="w-6 h-6 bg-bebyte-purple text-white border border-black rounded font-bold">+</button>
      </div>
    </div>
  `).join('') : `<div class="text-center py-6 opacity-50"><p class="font-bold text-sm">Kosong...</p></div>`;

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

// --- SEND HANDLER (CHECKOUT) ---
els.btnSend.addEventListener('click', async () => {
  if(!cart.length) return showAlert("OIT!", "Pilih menu dulu dong!");
  const custName = els.custName.value.trim();
  if(!custName) { els.custName.focus(); return showAlert("SIAPA?", "Isi nama pemesan dulu!"); }

  const total = cart.reduce((a,b) => a + (b.price * b.qty), 0);
  const note = els.note.value;
  els.btnSend.disabled = true;
  els.btnSend.textContent = "SENDING...";

  const itemsReport = cart.map(i => ({...i, name: i.variant ? `${i.name} (${i.variant})` : i.name}));
  const customer = { name: custName.toUpperCase() };

  const trxId = saveTransaction(itemsReport, total, note, customer);
  const disc = await sendToDiscord(itemsReport, total, note, trxId, customer);

  if(disc.success) {
    showAlert("BERHASIL!", `Pesanan ${custName} terkirim!`);
    cart = []; els.note.value = ''; els.custName.value = '';
    updateCart();
  } else {
    showAlert("OFFLINE?", "Gagal kirim ke Discord, tapi data tersimpan di Admin.");
  }
  els.btnSend.disabled = false;
  els.btnSend.textContent = "CHECKOUT NOW ➤";
});

// --- REPORT & PDF HANDLER ---
els.btnReport.addEventListener('click', () => {
  try {
    const data = getReport();
    const today = new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    
    const topItems = Object.keys(data.itemCounts).length 
      ? Object.entries(data.itemCounts).sort(([,a], [,b]) => b - a)
          .map(([n, q]) => `<li class="flex justify-between border-b border-gray-300 pb-1 mb-1"><span class="capitalize">${n}</span><span class="font-bold">${q} sold</span></li>`).join('')
      : '<li class="text-center italic">Belum ada data.</li>';

    els.reportContent.innerHTML = `
      <div class="text-center mb-6 border-b-4 border-black pb-4">
        <h2 class="font-black text-3xl uppercase tracking-widest">BeByte Report</h2>
        <p class="text-sm font-bold text-gray-600">Technopreneurship 5.0 Bazaar</p>
        <p class="text-xs text-gray-500 mt-1">${today}</p>
      </div>
      <div class="grid grid-cols-2 gap-4 mb-6">
        <div class="bg-white p-3 border-2 border-black text-center">
          <div class="text-xs font-bold uppercase">Pendapatan</div>
          <div class="text-xl font-black mt-1">${fmt(data.totalOmset)}</div>
        </div>
        <div class="bg-white p-3 border-2 border-black text-center">
          <div class="text-xs font-bold uppercase">Transaksi</div>
          <div class="text-xl font-black mt-1">${data.totalTrx}</div>
        </div>
      </div>
      <h4 class="font-bold mb-3 text-sm uppercase border-b-2 border-black inline-block">🔥 Rincian Produk:</h4>
      <ul class="space-y-1 text-sm mb-8">${topItems}</ul>
      <div class="text-center text-xs font-bold italic border-t-2 border-black border-dashed pt-4">"System by Raydamar v2.0"</div>
    `;
    els.modalReport.classList.remove('hidden');
  } catch (e) { console.error(e); showAlert("ERROR", "Gagal buka laporan."); }
});

// LISTENER TOMBOL PRINT PDF
document.getElementById('btn-print-pdf').addEventListener('click', () => window.print());

// INIT
renderMenu();
updateCart();
