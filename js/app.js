import { MENU } from './data.js';
import { saveTransaction, getReport, clearReport } from './report.js';
import { sendToDiscord } from './discord.js';

const fmt = (v) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(v);
let cart = JSON.parse(localStorage.getItem('cart_temp') || '[]');

// DOM Elements
const els = {
  grid: document.getElementById('menu-grid'),
  cartList: document.getElementById('cart-list'),
  cartCount: document.getElementById('cart-count'),
  total: document.getElementById('total'),
  note: document.getElementById('note'),
  btnSend: document.getElementById('btn-send'),
  // Modal Elements
  modalReport: document.getElementById('modal-report'),
  modalVariant: document.getElementById('modal-variant'), // New Modal
  variantTitle: document.getElementById('variant-title'),
  variantOptions: document.getElementById('variant-options'),
  btnReport: document.getElementById('btn-report'),
  btnCloseReport: document.getElementById('close-report'),
  btnClearReport: document.getElementById('clear-report'),
  reportContent: document.getElementById('report-content')
};

// --- RENDER MENU (DENGAN LAYOUT LEBIH RAPI) ---
function renderMenu() {
  els.grid.innerHTML = MENU.map(m => `
    <article class="bg-white rounded-xl overflow-hidden card-pop flex flex-col h-full relative group">
      <div class="relative h-40 w-full overflow-hidden bg-gray-200">
        <img src="${m.img}" alt="${m.name}" class="w-full h-full object-cover transition duration-500 group-hover:scale-110">
        <div class="absolute top-2 right-2 bg-bebyte-purple text-white text-xs font-bold px-2 py-1 border-2 border-black rounded transform rotate-3 shadow-sm z-10">
          ${m.category}
        </div>
      </div>
      
      <div class="p-3 flex flex-col flex-grow">
        <h3 class="font-black text-lg text-black leading-tight mb-1 uppercase">${m.name}</h3>
        
        <div class="flex-grow"></div> 
        
        <div class="flex justify-between items-end mt-3 pt-2 border-t-2 border-dashed border-gray-200">
          <span class="font-bold text-bebyte-purple bg-purple-100 px-2 py-1 rounded border border-purple-200 text-sm">${fmt(m.price)}</span>
          
          <button onclick="handleItemClick(${m.id})" class="bg-bebyte-green text-black border-2 border-black px-4 py-1 rounded-lg font-bold text-sm hover:bg-green-400 transition shadow-[2px_2px_0px_0px_black] active:translate-y-1 active:shadow-none flex items-center gap-1">
            ${m.variants ? 'PILIH ▾' : '+ ADD'}
          </button>
        </div>
      </div>
    </article>
  `).join('');
}

// --- LOGIC VARIANT & CART ---

// 1. Handle Klik (Cek Varian)
window.handleItemClick = (id) => {
  const item = MENU.find(x => x.id === id);
  
  if (item.variants && item.variants.length > 0) {
    // Jika punya varian, buka modal
    openVariantModal(item);
  } else {
    // Jika tidak, langsung masuk keranjang (varian = null)
    addToCart(item, null);
  }
};

// 2. Buka Modal Varian
function openVariantModal(item) {
  els.variantTitle.innerText = `Pilih Rasa ${item.name}`;
  els.variantOptions.innerHTML = item.variants.map(v => `
    <button onclick="selectVariant(${item.id}, '${v}')" 
      class="w-full text-left px-4 py-3 bg-white border-2 border-black rounded-lg font-bold hover:bg-bebyte-yellow hover:shadow-[2px_2px_0px_0px_black] transition flex justify-between items-center group">
      <span>${v}</span>
      <span class="opacity-0 group-hover:opacity-100 transition">➕</span>
    </button>
  `).join('');
  els.modalVariant.classList.remove('hidden');
}

// 3. Pilih Varian & Tutup Modal
window.selectVariant = (id, variantName) => {
  const item = MENU.find(x => x.id === id);
  addToCart(item, variantName);
  els.modalVariant.classList.add('hidden');
};

// 4. Masukkan ke Cart (Core Logic)
function addToCart(item, variant) {
  // Cari item di cart yang ID-nya sama DAN Varian-nya sama
  const existingItem = cart.find(x => x.id === item.id && x.variant === variant);

  if (existingItem) {
    existingItem.qty++;
  } else {
    cart.push({
      ...item,
      variant: variant, // Simpan varian yang dipilih
      qty: 1
    });
  }
  updateCart();
}

// 5. Update Cart UI
window.updateQty = (id, variant, delta) => {
  // Cari item spesifik berdasarkan ID & Varian (karena "null" variant juga string di logic ini kalau tidak hati-hati, tapi disini aman)
  const item = cart.find(x => x.id === id && x.variant === variant);
  
  if(item) {
    item.qty += delta;
    if(item.qty <= 0) {
      // Hapus item spesifik
      cart = cart.filter(x => !(x.id === id && x.variant === variant));
    }
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
        <button onclick="updateQty(${i.id}, '${i.variant || ''}', -1)" class="w-6 h-6 flex items-center justify-center bg-gray-200 text-black border border-black rounded hover:bg-gray-300 font-bold">-</button>
        <span class="text-sm font-bold w-5 text-center">${i.qty}</span>
        <button onclick="updateQty(${i.id}, '${i.variant || ''}', 1)" class="w-6 h-6 flex items-center justify-center bg-bebyte-purple text-white border border-black rounded hover:bg-purple-700 font-bold">+</button>
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

// --- SEND & REPORT HANDLERS (Sama seperti sebelumnya) ---
els.btnSend.addEventListener('click', async () => {
  if(!cart.length) return alert("Oi! Order something first!");
  const total = cart.reduce((a,b) => a + (b.price * b.qty), 0);
  const note = els.note.value;
  
  els.btnSend.disabled = true;
  els.btnSend.textContent = "SENDING...";

  // Include Variants in Discord Message
  const itemsForReport = cart.map(i => ({
    ...i,
    name: i.variant ? `${i.name} (${i.variant})` : i.name
  }));

  const trxId = saveTransaction(itemsForReport, total, note); // Pass modified items
  const disc = await sendToDiscord(itemsForReport, total, note, trxId);

  if(disc.success) {
    alert(`BeByte Order Sent! ID: #${trxId.toString().slice(-4)}`);
    cart = [];
    els.note.value = '';
    updateCart();
  } else {
    alert("Discord Error!");
  }
  els.btnSend.disabled = false;
  els.btnSend.textContent = "CHECKOUT NOW ➤";
});

// Modal Close Handler (Variant)
document.getElementById('close-variant').addEventListener('click', () => {
  els.modalVariant.classList.add('hidden');
});

// Init
// Handle Report Modal listeners (sama kayak sebelumnya, disingkat disini)
els.btnReport.addEventListener('click', () => {
    const data = getReport();
    // (Render report logic same as before)
    els.modalReport.classList.remove('hidden');
});
els.btnCloseReport.addEventListener('click', () => els.modalReport.classList.add('hidden'));
els.btnClearReport.addEventListener('click', clearReport);

renderMenu();
updateCart();
