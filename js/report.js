const STORAGE_KEY = 'bebyte_transaksi_log'; 

export function saveTransaction(items, total, note, customerInfo) {
  try {
    // Antrian Harian
    let dailyCounter = parseInt(localStorage.getItem('daily_queue_counter') || '0');
    dailyCounter++;
    localStorage.setItem('daily_queue_counter', dailyCounter.toString());
    
    const queueNo = String(dailyCounter).padStart(3, '0');

    const newTx = { 
        id: Date.now(), 
        queueNo: queueNo, 
        date: new Date().toLocaleString('id-ID'), 
        items: items, 
        total: total, 
        note: note, 
        customer: customerInfo 
    };

    let history = [];
    try { history = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch (e) { history = []; }
    history.push(newTx);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    
    return newTx;
  } catch (error) { console.error("Gagal simpan:", error); return null; }
}

export function getReport() {
  try {
    const history = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    const totalOmset = history.reduce((acc, curr) => acc + (Number(curr.total) || 0), 0);
    const totalTrx = history.length;
    let itemCounts = {};
    history.forEach(tx => {
      if(Array.isArray(tx.items)) {
        tx.items.forEach(item => {
          let fullName = item.nickname || item.name;
          itemCounts[fullName] = (itemCounts[fullName] || 0) + item.qty;
        });
      }
    });
    return { totalOmset, totalTrx, itemCounts, history };
  } catch (error) { return { totalOmset: 0, totalTrx: 0, itemCounts: {}, history: [] }; }
}

export function clearReportData() {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem('menu_stock');
    localStorage.removeItem('cart_temp');
    localStorage.removeItem('daily_queue_counter');
    window.location.reload();
}

// --- UPDATE: BACKUP LEBIH LENGKAP ---
export function downloadBackup() {
    const history = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    const stock = JSON.parse(localStorage.getItem('menu_stock') || '[]');
    const counter = localStorage.getItem('daily_queue_counter') || '0';

    const fullBackup = {
        version: "2.0",
        timestamp: new Date().toISOString(),
        data: {
            history: history,
            stock: stock,
            dailyCounter: counter
        }
    };

    const blob = new Blob([JSON.stringify(fullBackup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `BEBYTE_FULL_BACKUP_${new Date().toLocaleDateString('id-ID').replace(/\//g,'-')}_${new Date().getHours()}.${new Date().getMinutes()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

// --- BARU: FUNGSI RESTORE ---
export function restoreBackup(file, callback) {
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const json = JSON.parse(e.target.result);
            
            // Cek apakah ini backup versi baru (objek) atau lama (array biasa)
            if (json.version && json.data) {
                // Restore Versi Baru (Lengkap)
                if(json.data.history) localStorage.setItem(STORAGE_KEY, JSON.stringify(json.data.history));
                if(json.data.stock) localStorage.setItem('menu_stock', JSON.stringify(json.data.stock));
                if(json.data.dailyCounter) localStorage.setItem('daily_queue_counter', json.data.dailyCounter);
            } else if (Array.isArray(json)) {
                // Fallback: Restore file backup versi lama (cuma history)
                localStorage.setItem(STORAGE_KEY, JSON.stringify(json));
            } else {
                throw new Error("Format tidak dikenali");
            }

            if(callback) callback(true);
        } catch (err) {
            console.error(err);
            if(callback) callback(false);
        }
    };
    reader.readAsText(file);
}