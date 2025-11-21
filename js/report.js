const STORAGE_KEY = 'kasir_transaksi_log';

export function saveTransaction(cart, total, note) {
  const newTx = {
    id: Date.now(),
    date: new Date().toLocaleString('id-ID'),
    items: cart,
    total: total,
    note: note
  };

  let history = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  history.push(newTx);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  return newTx.id;
}

export function getReport() {
  const history = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  const totalOmset = history.reduce((acc, curr) => acc + curr.total, 0);
  const totalTrx = history.length;
  
  // Hitung item terlaris
  let itemCounts = {};
  history.forEach(tx => {
    tx.items.forEach(item => {
      itemCounts[item.name] = (itemCounts[item.name] || 0) + item.qty;
    });
  });

  return { totalOmset, totalTrx, itemCounts, history };
}

export function clearReport() {
  if(confirm('Hapus semua data laporan penjualan?')) {
    localStorage.removeItem(STORAGE_KEY);
    window.location.reload();
  }
}