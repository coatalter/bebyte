import { MENU } from './data.js';
import { saveTransaction, getReport, clearReport } from './report.js';
import { sendToDiscord } from './discord.js';

const fmt = (v) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(v);

// --- STATE MANAGEMENT ---
let cart = JSON.parse(localStorage.getItem('cart_temp') || '[]');
let isStockMode = false; 
let localMenu = JSON.parse(localStorage.getItem('menu_stock')) || MENU;

// Variables untuk Pembayaran
let currentPaymentMethod = 'CASH';
let currentTotalBill = 0;

// Safety Check Data Menu
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
  btnSend: document.getElementById('btn-send'), // Tombol Checkout Utama
  
  // Alert & Report Modals
  alertModal: document.getElementById('custom-alert'),
  alertTitle: document.getElementById('alert-title'),
  alertMsg: document.getElementById('alert-msg'),
  btnAlertOk: document.getElementById('btn-alert-ok'),
  modalReport: document.getElementById('modal-report'),
  reportContent: document.getElementById('report-content'),
  btnReport: document.getElementById('btn-report'),
  btnCloseReport: document.getElementById('close-report'),
  btnClearReport: document.getElementById('clear-report'),
  btnStockMode: document.getElementById('btn-stock-mode'),
  modalVariant: document.getElementById('modal-variant'),
  variantTitle: document.getElementById('variant-title'),
  variantOptions: document.getElementById('variant-options')
};

// Elements Modal Pembayaran
const elsPay = {
    modal: document.getElementById('modal-payment'),
    total: document.getElementById('pay-total'),
    inputCash: document.getElementById('input-cash'),
    textChange: document.getElementById('text-change'),
    btnFinal: document.getElementById('btn-final-pay'),
    btnClose: document.getElementById('close-payment'),
    grpCash: document.getElementById('cash-input-group'),
    btnCash: document.getElementById('btn-cash'),
    btnQris: document.getElementById('btn-qris')
};

// --- HELPER FUNGSI ---
function saveMenuStock() { localStorage.setItem('menu_stock', JSON.stringify(localMenu)); }

// --- RENDER MENU ---
function renderMenu() {
  els.grid.className = isStockMode 
    ? "grid grid-cols-2 sm:grid-cols-3 gap-4 border-4 border-red-500 p-2 rounded-xl bg-red-50" 
    : "grid grid-cols-2 sm:grid-cols-3 gap-4";

  els.grid.innerHTML = localMenu.map(m => {
    let isFullOOS = false;
    if (m.variants) isFullOOS = m.variants.every(v => v.active === false);
    else isFullOOS = !m.active;

    const cardClass = isFullOOS ? "grayscale opacity-70" : "";
    
    let action, btnText, btnClass;
    if (isStockMode) {
        action = `toggleStock(${m.id})`;
        btnText = isFullOOS ? "SET: ADA" : "SET: HABIS";
        btnClass = isFullOOS ? "bg-blue-500 text-white" : "bg-red-500 text-white";
    } else {
        action = isFullOOS ? "" : `handleItemClick(${m.id})`;
        btnText = isFullOOS ? "HABIS ❌" : (m.variants ? 'PILIH ▾' : '+ ADD');
        btnClass = isFullOOS ? "bg-gray-400 border-gray-500 cursor-not-allowed" : "bg-bebyte-green text-black hover:bg-green-400 shadow-[2px_2px_0px_0px_black] active:translate-y-1 active:shadow-none";
    }

    return `
    <article class="bg-white rounded-xl overflow-hidden card-pop flex flex-col h-full relative group ${cardClass}">
      <div class="relative h-40 w-full overflow-hidden bg-gray-200">
        <img src="${m.img}" class="w-full h-full object-cover transition duration-500 group-hover:scale-110">
        ${isFullOOS ? '<div class="absolute inset-0 flex items-center justify-center bg-black/60 z-20"><span class="text-white font-black text-2xl border-4 border-white px-2 -rotate-12">HABIS!</span></div>' : ''}
        <div class="absolute top-2 right-2 bg-bebyte-purple text-white text-xs font-bold px-2 py-1 border-2 border-black rounded z-10">${m.category}</div>
      </div>
      <div class="p-3 flex flex-col flex-grow">
        <h3 class="font-black text-lg text-black leading-tight mb-1 uppercase">${m.name}</h3>
        <div class="flex-grow"></div> 
        <div class="flex justify-between items-end mt-3 pt-2 border-t-2 border-dashed border-gray-200">
          <span class="font-bold text-bebyte-purple bg-purple-100 px-2 py-1 rounded border border-purple-200 text-sm">${fmt(m.price)}</span>
          <button onclick="${action}" class="${btnClass} border-2 border-black px-4 py-1 rounded-lg font-bold text-sm transition flex items-center gap-1">${btnText}</button>
        </div>
      </div>
    </article>
  `}).join('');
}

// --- LOGIC STOK ---
window.toggleStockMode = () => {
    isStockMode = !isStockMode;
    const btn = els.btnStockMode;
    if(isStockMode) {
        btn.classList.replace('bg-bebyte-purple', 'bg-red-600');
        btn.innerHTML = "⚠️ EDIT STOK";
        showAlert("MODE STOK", "Klik menu buat ubah status HABIS/ADA.");
    } else {
        btn.classList.replace('bg-red-600', 'bg-bebyte-purple');
        btn.innerHTML = "📦 Stok";
    }
    renderMenu();
};

window.toggleStock = (id) => {
    const item = localMenu.find(x => x.id === id);
    if(item.variants) openVariantStockModal(item);
    else {
        item.active = !item.active;
        saveMenuStock(); renderMenu();
    }
};

function openVariantStockModal(item) {
    els.variantTitle.innerText = `ATUR STOK: ${item.name}`;
    els.variantOptions.innerHTML = item.variants.map(v => `
      <button onclick="toggleVariantStock(${item.id}, '${v.name}')" 
        class="w-full text-left px-4 py-3 border-2 border-black rounded-lg font-bold mb-2 flex justify-between items-center
        ${v.active ? 'bg-green-100 hover:bg-green-200' : 'bg-red-100 hover:bg-red-200'}">
        <span>${v.name}</span>
        <span class="text-xs border border-black px-2 py-1 rounded bg-white font-black">${v.active ? '✅ ADA' : '❌ HABIS'}</span>
      </button>
    `).join('');
    els.modalVariant.classList.remove('hidden');
}

window.toggleVariantStock = (id, vName) => {
    const item = localMenu.find(x => x.id === id);
    const v = item.variants.find(x => x.name === vName);
    v.active = !v.active;
    saveMenuStock(); openVariantStockModal(item); renderMenu();
};

// --- LOGIC CART ---
window.handleItemClick = (id) => {
  const item = localMenu.find(x => x.id === id);
  if (item.variants) openVariantModal(item);
  else addToCart(item, null);
};

function openVariantModal(item) {
  els.variantTitle.innerText = `Pilih Rasa ${item.name}`;
  els.variantOptions.innerHTML = item.variants.map(v => {
      const isHabis = !v.active;
      const btnClass = isHabis ? "bg-gray-200 text-gray-400 cursor-not-allowed" : "bg-white hover:bg-bebyte-yellow cursor-pointer";
      const action = isHabis ? "" : `onclick="selectVariant(${item.id}, '${v.name}')"`;
      return `<button ${action} class="w-full text-left px-4 py-3 border-2 border-black rounded-lg font-bold mb-2 flex justify-between items-center ${btnClass}">
          <span>${v.name} ${isHabis ? '(HABIS)' : ''}</span>${!isHabis ? '<span>➕</span>' : '🚫'}</button>`;
  }).join('');
  els.modalVariant.classList.remove('hidden');
}

window.selectVariant = (id, vName) => { addToCart(localMenu.find(x=>x.id===id), vName); els.modalVariant.classList.add('hidden'); };

function addToCart(item, vName) {
  const exist = cart.find(x => x.id === item.id && x.variant === vName);
  if(exist) exist.qty++;
  else cart.push({ id: item.id, name: item.name, price: item.price, variant: vName, qty: 1 });
  updateCart();
}

window.updateQty = (id, v, d) => {
    const vKey = v === 'null' ? null : v;
    const item = cart.find(x => x.id === id && x.variant === vKey);
    if(item) { item.qty += d; if(item.qty<=0) cart = cart.filter(x=>x!==item); updateCart(); }
};

function updateCart() {
  localStorage.setItem('cart_temp', JSON.stringify(cart));
  els.cartCount.textContent = cart.reduce((a,b)=>a+b.qty,0);
  els.total.textContent = fmt(cart.reduce((a,b)=>a+(b.price*b.qty),0));
  
  els.cartList.innerHTML = cart.length ? cart.map(i => `
    <div class="flex justify-between items-center bg-white p-2 rounded border-2 border-black mb-2 shadow-sm">
      <div class="flex-1"><div class="font-bold text-sm">${i.name} ${i.variant?`(${i.variant})`:''}</div><div class="text-xs text-gray-500">${fmt(i.price)} x ${i.qty}</div></div>
      <div class="flex gap-1"><button onclick="updateQty(${i.id},'${i.variant}',-1)" class="w-6 bg-gray-200 rounded font-bold">-</button><span class="w-5 text-center text-sm font-bold">${i.qty}</span><button onclick="updateQty(${i.id},'${i.variant}',1)" class="w-6 bg-bebyte-purple text-white rounded font-bold">+</button></div>
    </div>`).join('') : `<div class="text-center py-6 opacity-50 text-sm font-bold">Keranjang Kosong</div>`;
}

// --- LOGIC PEMBAYARAN & CHECKOUT (INI YANG DIPERBAIKI) ---

// 1. Tombol "CHECKOUT" -> Hanya Buka Modal, JANGAN KIRIM DATA
els.btnSend.addEventListener('click', () => {
    if(!cart.length) return showAlert("KOSONG", "Belum ada menu yang dipilih!");
    if(!els.custName.value.trim()) { els.custName.focus(); return showAlert("NAMA?", "Isi nama pemesan dulu!"); }

    // Kunci Total Tagihan
    currentTotalBill = cart.reduce((a,b) => a + (b.price * b.qty), 0);
    
    // Reset UI Modal Payment
    elsPay.total.innerText = fmt(currentTotalBill);
    elsPay.inputCash.value = '';
    elsPay.textChange.innerText = 'Rp 0';
    elsPay.textChange.className = 'font-black text-xl text-gray-500'; // Reset warna kembalian
    
    setMethod('CASH'); // Default Cash
    elsPay.modal.classList.remove('hidden'); // Buka Modal
    setTimeout(() => elsPay.inputCash.focus(), 100); // Auto focus
});

// 2. Helper Switch Metode Bayar
window.setMethod = (type) => {
    currentPaymentMethod = type;
    if(type === 'CASH') {
        elsPay.btnCash.className = "border-2 border-black py-2 rounded font-bold bg-bebyte-yellow ring-2 ring-black ring-offset-2";
        elsPay.btnQris.className = "border-2 border-black py-2 rounded font-bold bg-white hover:bg-gray-100";
        elsPay.grpCash.classList.remove('hidden');
        elsPay.inputCash.focus();
    } else {
        elsPay.btnQris.className = "border-2 border-black py-2 rounded font-bold bg-bebyte-yellow ring-2 ring-black ring-offset-2";
        elsPay.btnCash.className = "border-2 border-black py-2 rounded font-bold bg-white hover:bg-gray-100";
        elsPay.grpCash.classList.add('hidden');
    }
};

// 3. Hitung Kembalian Real-time
elsPay.inputCash.addEventListener('input', (e) => {
    const cash = Number(e.target.value);
    const change = cash - currentTotalBill; // Pakai total yang sudah dikunci
    elsPay.textChange.innerText = fmt(change);
    
    if(change < 0) {
        elsPay.textChange.className = 'font-black text-xl text-red-600';
        elsPay.btnFinal.classList.add('opacity-50', 'cursor-not-allowed');
    } else {
        elsPay.textChange.className = 'font-black text-xl text-bebyte-green';
        elsPay.btnFinal.classList.remove('opacity-50', 'cursor-not-allowed');
    }
});

// 4. Tombol "BAYAR & KIRIM" -> Disini baru kirim ke Discord!
elsPay.btnFinal.addEventListener('click', async () => {
    const cash = Number(elsPay.inputCash.value);
    
    // Validasi Duit
    if(currentPaymentMethod === 'CASH' && cash < currentTotalBill) return showAlert("DUIT KURANG", "Cek lagi uangnya!");

    elsPay.btnFinal.disabled = true; 
    elsPay.btnFinal.innerText = "SENDING...";

    const note = els.note.value;
    const custName = els.custName.value.trim();
    const itemsReport = cart.map(i => ({...i, name: i.variant ? `${i.name} (${i.variant})` : i.name}));
    
    const customerInfo = { 
        name: custName.toUpperCase(),
        method: currentPaymentMethod, 
        pay: currentPaymentMethod === 'CASH' ? cash : currentTotalBill,
        change: currentPaymentMethod === 'CASH' ? (cash - currentTotalBill) : 0
    };

    // Simpan & Kirim
    const trxId = saveTransaction(itemsReport, currentTotalBill, note, customerInfo);
    await sendToDiscord(itemsReport, currentTotalBill, note, trxId, customerInfo);

    // TUTUP MODAL DULU
    elsPay.modal.classList.add('hidden');

    // BARU MUNCUL ALERT SUKSES
    const msgSuccess = currentPaymentMethod === 'CASH' 
        ? `Kembalian: ${fmt(customerInfo.change)}` 
        : "Pembayaran QRIS Berhasil!";
    showAlert("LUNAS & TERKIRIM! 🚀", msgSuccess);

    // Reset Form
    cart = []; els.note.value = ''; els.custName.value = '';
    elsPay.btnFinal.disabled = false; elsPay.btnFinal.innerText = "BAYAR & KIRIM 🚀";
    updateCart();
});

elsPay.btnClose.addEventListener('click', () => elsPay.modal.classList.add('hidden'));

// --- REPORT & ALERT ---
window.showAlert = (t, m) => { els.alertTitle.innerText = t; els.alertMsg.innerText = m; els.alertModal.classList.remove('hidden'); };
els.btnAlertOk.addEventListener('click', () => els.alertModal.classList.add('hidden'));
document.getElementById('close-variant').addEventListener('click', () => els.modalVariant.classList.add('hidden'));
els.btnCloseReport.addEventListener('click', () => els.modalReport.classList.add('hidden'));
els.btnClearReport.addEventListener('click', clearReport);
document.getElementById('btn-print-pdf').addEventListener('click', () => window.print());

els.btnReport.addEventListener('click', () => {
    const data = getReport();
    const list = Object.entries(data.itemCounts).sort(([,a],[,b])=>b-a).map(([n,q])=>`<li class="flex justify-between border-b border-gray-300 mb-1"><span>${n}</span><strong>${q} sold</strong></li>`).join('');
    els.reportContent.innerHTML = `
        <div class="text-center border-b-4 border-black mb-4 pb-2"><h2 class="font-black text-2xl">BeByte Report</h2><p class="text-xs">${new Date().toLocaleDateString()}</p></div>
        <div class="grid grid-cols-2 gap-2 mb-4 text-center">
            <div class="border-2 border-black p-2"><div class="text-xs font-bold">OMSET</div><div class="font-black text-lg">${fmt(data.totalOmset)}</div></div>
            <div class="border-2 border-black p-2"><div class="text-xs font-bold">ORDER</div><div class="font-black text-lg">${data.totalTrx}</div></div>
        </div>
        <ul class="text-sm mb-4">${list || 'Belum ada data'}</ul>
    `;
    els.modalReport.classList.remove('hidden');
});

// INIT
renderMenu(); updateCart();