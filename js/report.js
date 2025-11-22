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

export function downloadBackup() {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return alert("Belum ada data transaksi!");
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `BEBYTE_BACKUP_${new Date().toLocaleDateString('id-ID').replace(/\//g,'-')}_${new Date().getHours()}.${new Date().getMinutes()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}