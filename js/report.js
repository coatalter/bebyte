const STORAGE_KEY = 'bebyte_transaksi_log'; // Ganti key biar data fresh

// Fungsi Simpan Transaksi
export function saveTransaction(items, total, note) {
  try {
    const newTx = {
      id: Date.now(),
      date: new Date().toLocaleString('id-ID'),
      items: items, // Array item yang sudah ada variannya
      total: total,
      note: note
    };

    // Ambil data lama, kalau error anggap array kosong
    let history = [];
    try {
      history = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    } catch (e) {
      history = [];
    }

    history.push(newTx);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    
    console.log("Transaksi Berhasil Disimpan:", newTx); // Cek di Console F12
    return newTx.id;
  } catch (error) {
    console.error("Gagal menyimpan transaksi:", error);
    return 0;
  }
}

// Fungsi Ambil Laporan
export function getReport() {
  try {
    const history = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    
    const totalOmset = history.reduce((acc, curr) => acc + (Number(curr.total) || 0), 0);
    const totalTrx = history.length;

    // Hitung Item Terlaris (Support nama item dengan varian)
    let itemCounts = {};
    history.forEach(tx => {
      if(Array.isArray(tx.items)) {
        tx.items.forEach(item => {
          // Gunakan nama lengkap termasuk varian jika ada
          // Contoh: "Sticky Milk (Mango)" atau hanya "Cilok"
          let fullName = item.name;
          if (item.variant && !fullName.includes('(')) { 
             fullName = `${item.name} (${item.variant})`;
          }
          
          itemCounts[fullName] = (itemCounts[fullName] || 0) + item.qty;
        });
      }
    });

    return { totalOmset, totalTrx, itemCounts, history };
  } catch (error) {
    console.error("Gagal load laporan:", error);
    return { totalOmset: 0, totalTrx: 0, itemCounts: {}, history: [] };
  }
}

// Fungsi Hapus Data
export function clearReport() {
  if(confirm('Yakin ingin menghapus seluruh riwayat penjualan? Data tidak bisa kembali!')) {
    localStorage.removeItem(STORAGE_KEY);
    alert('Database berhasil di-reset!');
    window.location.reload();
  }
}
