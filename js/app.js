import { MENU } from './data.js';
import { saveTransaction, getReport, clearReportData, downloadBackup } from './report.js';
import { sendToDiscord, sendOrderDone } from './discord.js';

const fmt = (v) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(v);

// --- SFX (Audio) ---
const sounds = {
    click: document.getElementById('sfx-click'),
    success: document.getElementById('sfx-success'),
    error: document.getElementById('sfx-error')
};
function playSound(type) {
    if(sounds[type]) {
        sounds[type].currentTime = 0;
        sounds[type].volume = 0.5; 
        sounds[type].play().catch(e => console.log("Audio blocked", e));
    }
}
window.playSound = playSound; 

// --- STATE MANAGEMENT ---
let cart = JSON.parse(localStorage.getItem('cart_temp') || '[]');
let isStockMode = false; 
let localMenu = [];

// Load Data & Sync Stock
try {
    const savedStock = JSON.parse(localStorage.getItem('menu_stock') || '[]');
    localMenu = MENU.map(newItem => {
        let item = { ...newItem };
        const oldItem = savedStock.find(old => old.id === item.id);
        if (oldItem) {
            if (item.variants && oldItem.variants) {
                item.variants = item.variants.map(newV => {
                    const oldV = oldItem.variants.find(ov => ov.name === newV.name);
                    return { ...newV, active: oldV ? oldV.active : true };
                });
            } else if (oldItem.active !== undefined) { item.active = oldItem.active; }
        }
        return item;
    });
} catch (err) { localMenu = JSON.parse(JSON.stringify(MENU)); localStorage.removeItem('menu_stock'); }
localStorage.setItem('menu_stock', JSON.stringify(localMenu));

let currentPaymentMethod = 'CASH';
let currentTotalBill = 0;
let currentQtyItem = null;
let reportPage = 1;
const itemsPerPage = 5; 
let isPrintingMode = false;
let editingItemData = null; 
let tempCashString = ""; // Variabel Numpad Tablet

// DOM ELEMENTS
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
  reportContent: document.getElementById('report-content'),
  btnReport: document.getElementById('btn-report'),
  btnCloseReport: document.getElementById('close-report'),
  btnResetDB: document.getElementById('btn-reset-db'), 
  btnBackup: document.getElementById('btn-backup'),
  btnStockMode: document.getElementById('btn-stock-mode'),
  modalVariant: document.getElementById('modal-variant'),
  variantTitle: document.getElementById('variant-title'),
  variantOptions: document.getElementById('variant-options')
};

const elsPay = {
    modal: document.getElementById('modal-payment'), total: document.getElementById('pay-total'), inputCash: document.getElementById('input-cash'),
    textChange: document.getElementById('text-change'), btnFinal: document.getElementById('btn-final-pay'), btnClose: document.getElementById('close-payment'),
    grpCash: document.getElementById('cash-input-group'), btnCash: document.getElementById('btn-cash'), btnQris: document.getElementById('btn-qris')
};

const elsQty = {
    modal: document.getElementById('modal-qty'), input: document.getElementById('input-qty-number'),
    total: document.getElementById('qty-total-price'), btnAdd: document.getElementById('btn-add-qty'), title: document.getElementById('qty-title')
};

const elsEdit = {
    modal: document.getElementById('modal-edit-qty'), input: document.getElementById('input-edit-qty'),
    itemName: document.getElementById('edit-item-name'), btnSave: document.getElementById('btn-save-qty')
};

const elsConfirm = {
    modal: document.getElementById('modal-confirm'), title: document.getElementById('confirm-title'), msg: document.getElementById('confirm-msg'),
    btnYes: document.getElementById('btn-confirm-yes'), btnNo: document.getElementById('btn-confirm-no')
};

function saveMenuStock() { localStorage.setItem('menu_stock', JSON.stringify(localMenu)); }

// --- HELPERS ---
let confirmCallback = null;
window.showConfirm = (title, msg, callback) => {
    playSound('click');
    if(elsConfirm.title) elsConfirm.title.innerText = title;
    if(elsConfirm.msg) elsConfirm.msg.innerText = msg;
    confirmCallback = callback; 
    elsConfirm.modal.classList.remove('hidden');
};
elsConfirm.btnYes.onclick = () => { playSound('click'); if(confirmCallback) confirmCallback(); elsConfirm.modal.classList.add('hidden'); confirmCallback = null; };
elsConfirm.btnNo.onclick = () => { playSound('click'); elsConfirm.modal.classList.add('hidden'); confirmCallback = null; };

window.showAlert = (t, m) => { 
    if(t.includes("ERROR")||t.includes("KURANG")) playSound('error'); else playSound('click'); 
    els.alertTitle.innerText = t; els.alertMsg.innerText = m; els.alertModal.classList.remove('hidden'); 
};
els.btnAlertOk.addEventListener('click', () => { playSound('click'); els.alertModal.classList.add('hidden'); });

// --- RENDER MENU ---
function renderMenu() {
  if(!els.grid) return;
  els.grid.className = isStockMode ? "grid grid-cols-2 sm:grid-cols-3 gap-4 border-4 border-red-500 p-2 rounded-xl bg-red-50" : "grid grid-cols-2 sm:grid-cols-3 gap-4";
  els.grid.innerHTML = localMenu.map(m => {
    let isFullOOS = false;
    if (m.variants) isFullOOS = m.variants.every(v => v.active === false); else isFullOOS = !m.active;
    const cardClass = isFullOOS ? "grayscale opacity-70" : "";
    let action, btnText, btnClass;
    if (isStockMode) { action = `toggleStock(${m.id})`; btnText = isFullOOS ? "SET: ADA" : "SET: HABIS"; btnClass = isFullOOS ? "bg-blue-500 text-white" : "bg-red-500 text-white"; }
    else { action = isFullOOS ? "" : `handleItemClick(${m.id})`; btnText = isFullOOS ? "HABIS ❌" : (m.variants ? 'PILIH ▾' : '+ ADD'); btnClass = isFullOOS ? "bg-bebyte-green text-black hover:bg-green-400 shadow-[2px_2px_0px_0px_black] active:translate-y-1 active:shadow-none"; }
    const displayName = (!m.variants && m.nickname) ? m.nickname : m.name;
    return `<article class="bg-white rounded-xl overflow-hidden card-pop flex flex-col h-full relative group ${cardClass}"><div class="relative h-40 w-full overflow-hidden bg-gray-200"><img src="${m.img}" onerror="this.src='https://placehold.co/300x200?text=No+Image'" class="w-full h-full object-cover transition duration-500 group-hover:scale-110">${isFullOOS ? '<div class="absolute inset-0 flex items-center justify-center bg-black/60 z-20"><span class="text-white font-black text-2xl border-4 border-white px-2 -rotate-12">HABIS!</span></div>' : ''}<div class="absolute top-2 right-2 bg-bebyte-purple text-white text-xs font-bold px-2 py-1 border-2 border-black rounded z-10">${m.category}</div></div><div class="p-3 flex flex-col flex-grow"><h3 class="font-black text-lg text-black leading-tight uppercase">${displayName}</h3><p class="text-xs text-gray-500 mb-2 leading-tight min-h-[2.5em]">${m.desc || m.name}</p><div class="flex-grow"></div><div class="flex justify-between items-end mt-2 pt-2 border-t-2 border-dashed border-gray-200"><span class="font-bold text-bebyte-purple bg-purple-100 px-2 py-1 rounded border border-purple-200 text-sm">${fmt(m.price)}</span><button onclick="playSound('click'); ${action}" class="${btnClass} border-2 border-black px-3 py-1 rounded-lg font-bold text-xs transition flex items-center gap-1">${btnText}</button></div></div></article>`;
  }).join('');
}

// --- ACTIONS (Stock & Variants) ---
window.toggleStockMode = () => { playSound('click'); isStockMode = !isStockMode; const btn = els.btnStockMode; if(isStockMode) { btn.classList.replace('bg-bebyte-purple', 'bg-red-600'); btn.innerHTML = "⚠️ EDIT STOK"; showAlert("MODE STOK", "Klik menu buat ubah status HABIS/ADA."); } else { btn.classList.replace('bg-red-600', 'bg-bebyte-purple'); btn.innerHTML = "📦 Stok"; } renderMenu(); };
window.toggleStock = (id) => { const item = localMenu.find(x => x.id === id); if(item.variants) openVariantStockModal(item); else { item.active = !item.active; saveMenuStock(); renderMenu(); } };
function openVariantStockModal(item) { els.variantTitle.innerText = `ATUR STOK: ${item.name}`; els.variantOptions.innerHTML = item.variants.map(v => `<button onclick="toggleVariantStock(${item.id}, '${v.name}')" class="w-full text-left px-4 py-3 border-2 border-black rounded-lg font-bold mb-2 flex justify-between items-center ${v.active ? 'bg-green-100' : 'bg-red-100'}"><span>${v.nickname || v.name}</span><span class="text-xs border border-black px-2 py-1 rounded bg-white font-black">${v.active ? '✅ ADA' : '❌ HABIS'}</span></button>`).join(''); els.modalVariant.classList.remove('hidden'); }
window.toggleVariantStock = (id, vName) => { const item = localMenu.find(x => x.id === id); const v = item.variants.find(x => x.name === vName); v.active = !v.active; saveMenuStock(); openVariantStockModal(item); renderMenu(); };
window.handleItemClick = (id) => { const item = localMenu.find(x => x.id === id); if (item.custom_qty) openQtyModal(item); else if (item.variants) openVariantModal(item); else addToCart(item, null, 1); };
function openVariantModal(item) { els.variantTitle.innerText = `Pilih Varian`; els.variantOptions.innerHTML = item.variants.map(v => { const isHabis = !v.active; const btnClass = isHabis ? "bg-gray-200 text-gray-400 cursor-not-allowed" : "bg-white hover:bg-bebyte-yellow cursor-pointer"; const action = isHabis ? "" : `onclick="selectVariant(${item.id}, '${v.name}')"`; return `<button ${action} class="w-full text-left px-4 py-3 border-2 border-black rounded-lg font-bold mb-2 group ${btnClass}"><div class="flex justify-between items-center"><span class="text-lg">${v.nickname || v.name}</span>${!isHabis ? '<span>➕</span>' : '🚫'}</div><div class="text-xs font-normal text-gray-500">${v.desc || ''}</div></button>`; }).join(''); els.modalVariant.classList.remove('hidden'); }
window.selectVariant = (id, vName) => { playSound('click'); addToCart(localMenu.find(x=>x.id===id), vName, 1); els.modalVariant.classList.add('hidden'); };
function openQtyModal(item) { currentQtyItem = item; elsQty.title.innerText = item.nickname || item.name; elsQty.input.value = 5; updateQtyTotal(item.price); elsQty.modal.classList.remove('hidden'); elsQty.input.focus(); elsQty.input.select(); }
window.closeModalQty = () => { playSound('click'); elsQty.modal.classList.add('hidden'); };
elsQty.input.addEventListener('input', () => { if(currentQtyItem) updateQtyTotal(currentQtyItem.price); });
function updateQtyTotal(price) { elsQty.total.innerText = fmt((Number(elsQty.input.value)||0) * price); }
elsQty.btnAdd.addEventListener('click', () => { playSound('click'); const qty = Number(elsQty.input.value); if(qty > 0 && currentQtyItem) { addToCart(currentQtyItem, null, qty); elsQty.modal.classList.add('hidden'); } });

// --- CART ---
function addToCart(item, variantName, quantity = 1) { 
    const exist = cart.find(x => x.id === item.id && x.variant === variantName); 
    let finalName = item.name; let finalNick = item.nickname || item.name; 
    if (variantName && item.variants) { const vData = item.variants.find(v => v.name === variantName); if(vData) { finalName = `${item.name} (${vData.name})`; finalNick = vData.nickname || finalName; } } 
    if(exist) { exist.qty += quantity; } else { cart.push({ id: item.id, name: finalName, nickname: finalNick, price: item.price, variant: variantName, qty: quantity }); } 
    updateCart(); 
    const badge = document.getElementById('cart-count');
    badge.classList.remove('animate-bounce-short'); void badge.offsetWidth; badge.classList.add('animate-bounce-short');
}
window.tryClearCart = () => { if(!cart.length) return; showConfirm("HAPUS SEMUA?", "Yakin mau kosongin keranjang?", () => { cart = []; updateCart(); }); };
window.removeCartItem = (id, v) => { playSound('click'); cart = cart.filter(x => !(x.id === id && x.variant === (v === 'null' ? null : v))); updateCart(); };
window.editCartQty = (id, v, currentQty) => { playSound('click'); const vKey = v === 'null' ? null : v; const item = cart.find(x => x.id === id && x.variant === vKey); if(item) { editingItemData = { id, vKey }; elsEdit.itemName.innerText = `Edit: ${item.nickname || item.name}`; elsEdit.input.value = currentQty; elsEdit.modal.classList.remove('hidden'); setTimeout(() => elsEdit.input.select(), 100); } };
window.changeEditInput = (delta) => { playSound('click'); let val = parseInt(elsEdit.input.value) || 0; val += delta; if(val < 0) val = 0; elsEdit.input.value = val; };
elsEdit.btnSave.addEventListener('click', () => { playSound('click'); if (!editingItemData) return; const newQty = parseInt(elsEdit.input.value); const item = cart.find(x => x.id === editingItemData.id && x.variant === editingItemData.vKey); if (item) { if (newQty > 0) { item.qty = newQty; updateCart(); elsEdit.modal.classList.add('hidden'); editingItemData = null; } else { elsEdit.modal.classList.add('hidden'); showConfirm("HAPUS ITEM?", "Jumlah 0, mau dihapus dari keranjang?", () => { window.removeCartItem(editingItemData.id, editingItemData.vKey); editingItemData = null; }); } } else { elsEdit.modal.classList.add('hidden'); } });
window.updateQty = (id, v, d) => { playSound('click'); const vKey = v === 'null' ? null : v; const item = cart.find(x => x.id === id && x.variant === vKey); if(item) { item.qty += d; if(item.qty<=0) cart = cart.filter(x=>x!==item); updateCart(); } };
function updateCart() { 
    localStorage.setItem('cart_temp', JSON.stringify(cart)); els.cartCount.textContent = cart.reduce((a,b)=>a+b.qty,0) + " Items"; els.total.textContent = fmt(cart.reduce((a,b)=>a+(b.price*b.qty),0)); 
    if(cart.length === 0) els.cartList.innerHTML = `<div class="text-center py-6 opacity-50 text-sm font-bold italic">Keranjang Kosong</div>`;
    else els.cartList.innerHTML = cart.map(i => `<div class="flex justify-between items-center bg-white p-2 rounded border-2 border-black mb-2 shadow-sm group hover:shadow-md transition"><div class="flex-1 pr-2"><div class="flex items-center gap-2"><button onclick="removeCartItem(${i.id}, '${i.variant}')" class="text-gray-300 hover:text-red-500 transition" title="Hapus Item">❌</button><div class="font-bold text-sm leading-tight">${i.nickname || i.name}</div></div><div class="text-xs text-gray-500 pl-6">${fmt(i.price)} x ${i.qty}</div></div><div class="flex items-center gap-1"><button onclick="updateQty(${i.id},'${i.variant}',-1)" class="w-6 h-6 bg-gray-200 rounded font-bold hover:bg-gray-300">-</button><button onclick="editCartQty(${i.id}, '${i.variant}', ${i.qty})" class="min-w-[1.5rem] px-1 h-6 text-center text-sm font-bold bg-white border border-gray-300 rounded hover:bg-yellow-100 transition">${i.qty}</button><button onclick="updateQty(${i.id},'${i.variant}',1)" class="w-6 h-6 bg-bebyte-purple text-white rounded font-bold hover:bg-purple-700">+</button></div></div>`).join('');
}

// --- TABLET NUMPAD LOGIC ---
window.numpad = (val) => { playSound('click'); if (val === 'backspace') tempCashString = tempCashString.slice(0, -1); else if (val === '10000' || val === '20000' || val === '50000') { let currentVal = Number(tempCashString) || 0; currentVal += Number(val); tempCashString = currentVal.toString(); } else tempCashString += val; updateCashDisplay(); };
window.clearCash = () => { playSound('click'); tempCashString = ""; updateCashDisplay(); };
window.setUangPas = () => { playSound('click'); tempCashString = currentTotalBill.toString(); updateCashDisplay(); };

// --- UPDATE DISPLAY CASH (LOGIC TOMBOL PINTAR) ---
function updateCashDisplay() {
    elsPay.inputCash.value = tempCashString ? parseInt(tempCashString).toLocaleString('id-ID') : "";
    const cash = Number(tempCashString) || 0;
    const change = cash - currentTotalBill;
    
    elsPay.textChange.innerText = fmt(change);
    elsPay.textChange.className = change < 0 ? 'font-black text-xl text-red-600' : 'font-black text-xl text-bebyte-green';
    
    // Validasi tombol bayar
    if(currentPaymentMethod === 'CASH' && change < 0) {
        elsPay.btnFinal.classList.add('opacity-50','cursor-not-allowed');
    } else {
        elsPay.btnFinal.classList.remove('opacity-50','cursor-not-allowed');
    }
}

// --- PAYMENT METHOD SELECTION ---
els.btnSend.addEventListener('click', () => { 
    playSound('click');
    if(!cart.length) return showAlert("KOSONG", "Pilih menu dulu!"); 
    if(!els.custName.value.trim()) { els.custName.focus(); return showAlert("NAMA?", "Isi nama pemesan!"); } 
    currentTotalBill = cart.reduce((a,b) => a + (b.price * b.qty), 0); 
    elsPay.total.innerText = fmt(currentTotalBill); 
    tempCashString = ""; updateCashDisplay();
    setMethod('CASH'); elsPay.modal.classList.remove('hidden'); 
});

window.setMethod = (type) => { 
    playSound('click'); 
    currentPaymentMethod = type; 
    
    if(type === 'CASH') { 
        elsPay.btnCash.className = "border-2 border-black py-2 rounded font-bold bg-bebyte-yellow ring-2 ring-black ring-offset-2 transition-all"; 
        elsPay.btnQris.className = "border-2 border-black py-2 rounded font-bold bg-white hover:bg-gray-100 transition-all"; 
        elsPay.grpCash.classList.remove('hidden'); 
    } 
    else { 
        elsPay.btnQris.className = "border-2 border-black py-2 rounded font-bold bg-bebyte-yellow ring-2 ring-black ring-offset-2 transition-all"; 
        elsPay.btnCash.className = "border-2 border-black py-2 rounded font-bold bg-white hover:bg-gray-100 transition-all"; 
        elsPay.grpCash.classList.add('hidden'); 
    }
    updateCashDisplay();
};

elsPay.btnFinal.addEventListener('click', async () => { 
    const cash = Number(tempCashString) || 0; 
    if(currentPaymentMethod === 'CASH' && cash < currentTotalBill) { playSound('error'); return showAlert("DUIT KURANG", "Cek lagi!"); }
    
    elsPay.btnFinal.disabled = true; elsPay.btnFinal.innerText = "SENDING..."; 
    const itemsReport = cart.map(i => ({ ...i, name: i.nickname || i.name })); 
    const customerInfo = { name: els.custName.value.trim().toUpperCase(), method: currentPaymentMethod, pay: cash, change: cash - currentTotalBill }; 
    
    const trxData = saveTransaction(itemsReport, currentTotalBill, els.note.value, customerInfo); 
    if(trxData) {
        sendToDiscord(itemsReport, currentTotalBill, els.note.value, trxData.queueNo, customerInfo).then(res => { if(!res.success) console.warn("Discord Log Fail"); });
    }
    playSound('success'); elsPay.modal.classList.add('hidden'); 
    showAlert("LUNAS!", `ANTRIAN: #${trxData ? trxData.queueNo : '?'}\n${currentPaymentMethod === 'CASH' ? `Kembalian: ${fmt(customerInfo.change)}` : "QRIS Lunas!"}`); 
    cart = []; els.custName.value = ''; elsPay.btnFinal.disabled = false; elsPay.btnFinal.innerText = "BAYAR & KIRIM 🚀"; updateCart(); 
});
elsPay.btnClose.addEventListener('click', () => { playSound('click'); elsPay.modal.classList.add('hidden'); });

// --- REPORT & PRINT (PERBAIKAN LOGIKA) ---
window.changeReportPage = (delta) => { playSound('click'); const data = getReport(); const totalPages = Math.ceil(data.totalTrx / itemsPerPage); const newPage = reportPage + delta; if(newPage >= 1 && newPage <= totalPages) { reportPage = newPage; renderReportTable(); } };
function renderReportTable() {
    const data = getReport();
    const history = data.history.sort((a,b) => b.id - a.id); 
    let currentData, paginationControls = '';

    if (isPrintingMode) { currentData = history; } 
    else {
        const totalPages = Math.ceil(history.length / itemsPerPage); if (history.length > 0 && reportPage > totalPages) reportPage = 1;
        const startIndex = (reportPage - 1) * itemsPerPage; currentData = history.slice(startIndex, startIndex + itemsPerPage);
        paginationControls = `<div class="pagination-controls flex justify-between items-center mt-4 pt-2 border-t border-gray-200 shrink-0"><span class="text-xs text-gray-500 font-bold">Halaman ${reportPage} dari ${totalPages || 1}</span><div class="flex gap-2"><button onclick="changeReportPage(-1)" class="px-3 py-1 border border-black rounded text-xs font-bold hover:bg-gray-200 disabled:opacity-50" ${reportPage === 1 ? 'disabled' : ''}>&lt; Prev</button><button onclick="changeReportPage(1)" class="px-3 py-1 border border-black rounded text-xs font-bold hover:bg-gray-200 disabled:opacity-50" ${reportPage >= totalPages ? 'disabled' : ''}>Next &gt;</button></div></div>`;
    }

    const headerHtml = `<div class="mb-6 shrink-0 text-center md:text-left border-b-4 border-black pb-4"><h2 class="font-black text-4xl mb-1 uppercase text-bebyte-purple">Laporan Transaksi</h2><p class="text-sm font-bold text-gray-600">Dicetak pada: ${new Date().toLocaleString('id-ID')}</p>${isPrintingMode ? '<p class="text-xs mt-2 font-bold italic text-gray-500">Event: Technopreneurship 5.0 • Booth BeByte</p>' : ''}</div>`;
    const tableHeader = `<thead class="bg-gray-100 text-gray-600 text-xs uppercase font-bold text-left sticky top-0 z-10"><tr><th class="px-4 py-3 border-b-2 border-gray-200 bg-gray-100">Antrian</th><th class="px-4 py-3 border-b-2 border-gray-200 bg-gray-100">Waktu</th><th class="px-4 py-3 border-b-2 border-gray-200 bg-gray-100">Pembeli</th><th class="px-4 py-3 w-1/3 border-b-2 border-gray-200 bg-gray-100">Detail Item</th><th class="px-4 py-3 border-b-2 border-gray-200 bg-gray-100">Metode</th><th class="px-4 py-3 text-right border-b-2 border-gray-200 bg-gray-100">Total</th></tr></thead>`;
    const tableRows = currentData.map((tx, index) => {
        const itemsSummary = tx.items.map(i => `<div class="font-bold text-xs text-black whitespace-nowrap">• ${i.qty}x ${i.name}</div>`).join('');
        const rowColor = index % 2 === 0 ? 'bg-white' : 'bg-gray-50';
        const methodBadge = tx.customer.method === 'QRIS' ? '<span class="text-blue-600 font-bold bg-blue-50 px-2 py-1 rounded border border-blue-100">QRIS</span>' : '<span class="text-green-600 font-bold bg-green-50 px-2 py-1 rounded border border-green-100">TUNAI</span>';
        const noteDisplay = tx.note ? `<div class="text-[10px] text-gray-500 italic mt-1 truncate max-w-[150px]">"${tx.note}"</div>` : '';
        const queueDisplay = tx.queueNo ? `<span class="text-lg font-black">#${tx.queueNo}</span>` : `#${tx.id.toString().slice(-4)}`;
        const actionBtn = isPrintingMode ? '' : `<button onclick="notifyDone('${tx.queueNo || '?'}', '${tx.customer.name}')" class="mt-2 bg-green-600 text-white text-[10px] font-bold px-2 py-1 rounded hover:bg-green-500 shadow active:scale-95 flex items-center gap-1 w-full justify-center">✅ PANGGIL</button>`;
        return `<tr class="${rowColor} border-b border-gray-200 hover:bg-gray-100 transition group"><td class="px-4 py-3 text-bebyte-purple align-top text-center">${queueDisplay}${actionBtn}</td><td class="px-4 py-3 text-xs font-medium text-gray-500 align-top whitespace-nowrap">${new Date(tx.id).toLocaleTimeString('id-ID')}<br><span class="text-[10px]">${new Date(tx.id).toLocaleDateString('id-ID')}</span></td><td class="px-4 py-3 align-top"><div class="font-bold text-sm text-black uppercase truncate max-w-[120px]">${tx.customer.name}</div>${noteDisplay}</td><td class="px-4 py-3 align-top"><div class="max-h-[100px] overflow-y-auto custom-scroll pr-1">${itemsSummary}</div></td><td class="px-4 py-3 text-xs align-top">${methodBadge}</td><td class="px-4 py-3 text-sm font-bold text-black text-right align-top">${fmt(tx.total)}</td></tr>`;
    }).join('');
    const summaryHtml = `<div class="mt-8 pt-4 border-t-4 border-black grid grid-cols-2 gap-4 break-inside-avoid"><div><h3 class="font-black text-lg uppercase mb-2">Ringkasan Penjualan</h3><p class="text-sm font-bold text-gray-600">Total Transaksi: <span class="text-black text-lg">${data.totalTrx}</span></p></div><div class="text-right"><p class="text-sm font-bold text-gray-600 uppercase">Total Omset</p><h2 class="font-black text-4xl text-bebyte-purple">${fmt(data.totalOmset)}</h2></div></div>${isPrintingMode ? '<div class="mt-8 text-center text-xs font-bold text-gray-400">--- End of Report ---</div>' : ''}`;
    const containerClass = isPrintingMode ? "" : "max-h-[50vh] overflow-y-auto custom-scroll border border-gray-200 rounded-lg";
    els.reportContent.innerHTML = `${headerHtml}<div class="${containerClass}"><table class="w-full">${tableHeader}<tbody>${tableRows || '<tr><td colspan="6" class="p-4 text-center text-gray-400">Belum ada data</td></tr>'}</tbody></table></div>${isPrintingMode ? summaryHtml : paginationControls}`;
}
els.btnReport.addEventListener('click', () => { playSound('click'); isPrintingMode = false; reportPage = 1; renderReportTable(); els.modalReport.classList.remove('hidden'); });

// === LOGIKA CETAK YANG DIPERBAIKI ===
document.getElementById('btn-print-pdf').addEventListener('click', () => { 
    playSound('click'); 
    isPrintingMode = true; 
    
    // 1. Render ulang tabel dalam mode cetak (semua data, tanpa scroll)
    renderReportTable(); 
    
    // 2. Ambil konten HTML
    const content = els.reportContent.innerHTML;
    const printArea = document.getElementById('print-area');
    
    // 3. Masukkan konten ke print-area dan pastikan TERLIHAT (Hapus hidden)
    printArea.innerHTML = content;
    printArea.classList.remove('hidden'); 
    
    // Trik: Paksa background putih di print-area agar tidak ikut warna body (ungu)
    printArea.style.backgroundColor = 'white';
    printArea.style.color = 'black';
    printArea.style.minHeight = '100vh';
    
    // 4. Beri jeda agar browser sempat merender DOM sebelum window.print()
    setTimeout(() => { 
        window.print(); 
        
        // 5. Bersihkan setelah selesai
        setTimeout(() => { 
            printArea.innerHTML = ''; 
            printArea.classList.add('hidden'); // Sembunyikan lagi
            printArea.style = ''; // Reset style inline
            isPrintingMode = false; 
            renderReportTable(); // Kembalikan ke tampilan modal biasa
        }, 500);
    }, 800); 
});

if(els.btnResetDB) els.btnResetDB.addEventListener('click', () => { showConfirm("RESET DATABASE?", "Semua data penjualan bakal ilang permanen, yakin?", () => { clearReportData(); }); });
if(els.btnBackup) els.btnBackup.addEventListener('click', () => { playSound('click'); downloadBackup(); });

// --- EXTRAS ---
window.notifyDone = (qNo, cName) => { showConfirm("PANGGIL PEMBELI?", `Kirim notif ke Discord antrian #${qNo} selesai?`, () => { sendOrderDone(qNo, cName); playSound('success'); showAlert("TERKIRIM! 📢", `Notif #${qNo} sent.`); }); };
window.addNote = (text) => { playSound('click'); els.note.value = els.note.value ? `${els.note.value}, ${text}` : text; els.note.focus(); };
window.toggleFullscreen = () => { playSound('click'); if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(e=>console.log(e)); else if (document.exitFullscreen) document.exitFullscreen(); };

document.addEventListener('keydown', (e) => {
    if (e.key === "Escape") { els.modalVariant.classList.add('hidden'); elsPay.modal.classList.add('hidden'); elsQty.modal.classList.add('hidden'); elsEdit.modal.classList.add('hidden'); els.alertModal.classList.add('hidden'); els.modalReport.classList.add('hidden'); }
    if (e.key === "F2") { e.preventDefault(); els.custName.focus(); }
});
window.addEventListener('beforeunload', (e) => { if (cart.length > 0) { e.preventDefault(); e.returnValue = ''; } });
document.getElementById('close-variant').addEventListener('click', () => { playSound('click'); els.modalVariant.classList.add('hidden'); });
document.getElementById('close-payment').addEventListener('click', () => { playSound('click'); elsPay.modal.classList.add('hidden'); });
document.getElementById('close-report').addEventListener('click', () => { playSound('click'); els.modalReport.classList.add('hidden'); });

const statusDot = document.getElementById('status-dot');
function updateOnlineStatus() { if (!statusDot) return; if (navigator.onLine) { statusDot.classList.remove('bg-red-600'); statusDot.classList.add('bg-green-500'); statusDot.title = "Online"; } else { statusDot.classList.remove('bg-green-500'); statusDot.classList.add('bg-red-600', 'animate-pulse'); statusDot.title = "OFFLINE!"; showAlert("KONEKSI PUTUS!", "Cek internet!"); } }
window.addEventListener('online', updateOnlineStatus); window.addEventListener('offline', updateOnlineStatus); updateOnlineStatus();

renderMenu(); updateCart();
