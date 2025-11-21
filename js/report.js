const STORAGE_KEY = 'bebyte_transaksi_log'; 

export function saveTransaction(items, total, note, customerInfo) {
  try {
    const newTx = {
      id: Date.now(),
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
    return newTx.id;
  } catch (error) {
    console.error("Gagal menyimpan transaksi:", error);
    return 0;
  }
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
          let fullName = item.name;
          if (item.variant && !fullName.includes('(')) { fullName = `${item.name} (${item.variant})`; }
          itemCounts[fullName] = (itemCounts[fullName] || 0) + item.qty;
        });
      }
    });
    return { totalOmset, totalTrx, itemCounts, history };
  } catch (error) {
    return { totalOmset: 0, totalTrx: 0, itemCounts: {}, history: [] };
  }
}

export function clearReport() {
  if(confirm('RESET DATABASE?\nData penjualan akan dihapus permanen!')) {
    localStorage.removeItem(STORAGE_KEY);
    window.location.reload();
  }
}
