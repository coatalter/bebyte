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
    variants: [
      { name: 'Coklat', active: true },
      { name: 'Keju', active: true }
    ] 
  },
  { 
    id: 2, 
    name: 'Cilok Bumbu Kacang', 
    price: 8000, 
    category: 'Food', 
    img: './assets/cilokahh.jpg',
    variants: null,
    active: true 
  },
  { 
    id: 3, 
    name: 'Sticky Milk Series', 
    price: 15000, 
    category: 'Drink', 
    img: './assets/stickymilk.jpg',
    variants: [
      { name: 'Mango', active: true },
      { name: 'Matcha', active: true }
    ] 
  },
  { 
    id: 5, 
    name: 'Es Lumut', 
    price: 7000, 
    category: 'Drink', 
    img: './assets/eslumut.jpg',
    variants: null,
    active: true
  },
  { 
    id: 6, 
    name: 'Jamur Enoki Goreng', 
    price: 10000, 
    category: 'Food', 
    img: './assets/enoki.jpg',
    variants: [
      { name: 'Mix', active: true }, 
      { name: 'BBQ', active: true }, 
      { name: 'Balado', active: true }
    ]
  },
];