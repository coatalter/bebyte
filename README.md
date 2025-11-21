Siap — ini **README.md final** yang sudah **langsung siap upload** ke GitHub tanpa tambahan apa pun:

---

# **BeByte — Aplikasi Web Kasir (Simple POS)**

BeByte adalah aplikasi kasir berbasis web sederhana untuk usaha F&B. Dibangun menggunakan **HTML**, **CSS**, dan **Vanilla JavaScript**, aplikasi ini ringan, mudah digunakan, dan tidak memerlukan backend. Cukup buka **index.html**, dan sistem kasir langsung berjalan.

---

## **✨ Fitur Utama**

* Daftar produk lengkap dengan gambar.
* Tombol **Detail Produk** untuk melihat informasi tambahan.
* Tambah ke keranjang, update jumlah, dan hapus item.
* Perhitungan otomatis subtotal & total.
* Checkout sederhana.
* Manajemen data produk melalui `data.js`.
* Integrasi opsional dengan Discord Webhook melalui `discord.js`.

---

## **📂 Struktur Proyek**

```
/
├─ assets/
│  ├─ bebyte-logo.png
│  ├─ cilokahh.jpg
│  ├─ enoki.jpg
│  ├─ eslumut.jpg
│  ├─ stickymilk.jpg
│  └─ ubiunguahh.jpg
│
├─ css/
│  └─ style.css
│
├─ js/
│  ├─ app.js
│  ├─ data.js
│  ├─ discord.js
│  └─ report.js
│
└─ index.html
```

---

## **🚀 Cara Menjalankan**

1. Clone repo:

```bash
git clone <repo-url>
```

2. Buka folder proyek.
3. Jalankan dengan membuka **index.html** di browser.

   > Tidak perlu server atau instalasi tambahan.

Untuk pengembangan, gunakan extension **Live Server** agar auto-refresh.

---

## **🛠️ Cara Mengubah Data Produk**

Edit `js/data.js`:

```js
{
  id: 'p001',
  name: 'Lumpia Ubi Lumer',
  price: 12000,
  image: 'assets/ubiunguahh.jpg',
  description: 'Lumpia ubi lumer coklat keju.'
}
```

Tambahkan objek baru untuk menambah menu.

---

## **🎨 Kustomisasi Tampilan**

Semua style ada di:

```
css/style.css
```

Tema warna dapat disesuaikan, termasuk palet hijau untuk identitas BeByte.

---

## **📈 Pengembangan Selanjutnya**

* Sistem laporan transaksi otomatis.
* Simpan data ke IndexedDB atau database server.
* Cetak struk thermal printer.
* Fitur login kasir & owner.
* Integrasi pembayaran QRIS.

---


