export const CONFIG = {
  WEBHOOK_URL: 'https://discord.com/api/webhooks/1441533794224967730/9nSnB7dKxyGBnrx7-da0dcioAUIs6MpP_Lu-FCQbd6cdky34ykRkHHl9ka8GI-qrGkjO', 
  STORE_NAME: 'BeByte'
};

export const MENU = [
  { 
    id: 1, 
    name: 'Lumpia Ubi Lumer', 
    price: 12000, 
    category: 'Food', 
    img: './assets/ubiunguahh.jpg',
    active: true,
    variants: [
      { name: 'Coklat', nickname: 'CHUBI 🍫', desc: 'Lumpia Ubi Ungu isi Coklat Lumer', active: true },
      { name: 'Keju', nickname: 'CHEUBI 🧀', desc: 'Lumpia Ubi Ungu isi Keju Gurih', active: true }
    ] 
  },
  { 
    id: 2, 
    name: 'Cilok Bumbu Kacang', 
    nickname: 'CIBYTE 🍡',
    desc: 'Cilok kenyal dengan sambal kacang pedas manis',
    price: 1000, 
    category: 'Food', 
    img: './assets/cilokahh.jpg',
    variants: null,
    active: true,
    custom_qty: true 
  },
  { 
    id: 3, 
    name: 'Sticky Milk Series', 
    price: 15000, 
    category: 'Drink', 
    img: './assets/stickymilk.jpg',
    active: true,
    variants: [
      { name: 'Mango', nickname: 'MANGO STICKY', desc: 'Susu creamy rasa Mangga', active: true },
      { name: 'Matcha', nickname: 'MATCHA STICKY', desc: 'Susu creamy rasa Matcha', active: true }
    ] 
  },
  { 
    id: 5, 
    name: 'Es Lumut', 
    nickname: 'ES LUMUT',
    desc: 'Es segar penghilang dahaga',
    price: 7000, 
    category: 'Drink', 
    img: './assets/eslumut.jpg',
    variants: null,
    active: true
  },
  { 
    id: 6, 
    name: 'Jamur Enoki Goreng', 
    nickname: 'EGOKING 🍄',
    desc: 'Enoki Goreng King Crispy',
    price: 10000, 
    category: 'Food', 
    img: './assets/enoki.jpg',
    active: true,
    variants: [
      { name: 'Mix', nickname: 'EGOSTICK MIX', desc: 'Rasa Campur', active: true }, 
      { name: 'BBQ', nickname: 'EGOSTICK BBQ', desc: 'Rasa BBQ', active: true }, 
      { name: 'Balado', nickname: 'EGOSTICK BALADO', desc: 'Rasa Balado', active: true },
      { name: 'Originl', nickname: 'EGOKING', desc: 'Flavourless as hell', active: true }
    ]
  },
];