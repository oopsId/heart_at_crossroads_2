// Глобальная переменная путей (для GitHub Pages)
const ASSETS_PATH = './assets'; 

const CONFIG = {
    passwords: {
        correct: "umbertoeco",
        temp: "999000"
    },
    // Ключ сохранения (изменил, чтобы старые баги не влияли)
    storageKey: 'vn_crossroads_save_v2' 
};

// SVG иконки
const svgDecorations = {
    rosePetal: `<svg width="50" height="50" viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg"><path d="M10,25 Q25,5 40,25 Q25,45 10,25 Z" fill="#f8d7da" stroke="#e8b5b9" stroke-width="1" opacity="0.8" /></svg>`
};

// Галерея (Твои данные)
const cardSeries = {
    "romance": {
        title: "Романтика",
        titleEn: "Romance",
        cards: [
            { id: "card_sergey_and_wife", name: "Сергей и его жена", nameEn: "Sergey and his wife", unlock: "второе прохождение", unlockEn: "second playthrough" },
            { id: "card_anna_and_dima_final", name: "Анна и Дима: фото из финала", nameEn: "Anna and Dima: final photo", unlock: "второе прохождение", unlockEn: "second playthrough" },
            { id: "card_mark_childhood", name: "Марк в детстве", nameEn: "Mark as a child", unlock: "50", unlockEn: "50" },
            { id: "card_katya_and_anna_bff_birthday", name: "Катя и Анна: подруги", nameEn: "Katya and Anna: friends", unlock: "50", unlockEn: "50" }
        ],
        style: "Прошлое остается навсегда",
        styleEn: "The past remains forever"
    }
};