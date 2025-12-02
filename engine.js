// === Глобальные переменные ===
let currentChapter = 1;
let currentScene = 0;
let choices = [];
let stats = {
    crown: 0, heart: 0, leaf: 0, diamonds: 100,
    relationships: { mark: 0, lera: 0, vika: 0, sergey: 0, anna: 0, dima: 0, lesha: 0 },
    appearance: "style1", isAuthorized: false,
    memories: [], language: "ru",
    completionCount: 0 // Важная переменная для галереи
};
let isTyping = false;
let scriptData = null;
let currentBackground = null;
let activeTimer = null; // Для очистки таймеров

// Инициализация Telegram
const isTelegram = !!(window.Telegram?.WebApp?.initDataUnsafe);
if (isTelegram) Telegram.WebApp.ready();

// === 1. УЛУЧШЕННАЯ СИСТЕМА СОХРАНЕНИЙ ===

async function saveSession() {
    const data = JSON.stringify({ currentScene, currentChapter, stats, choices });
    
    // 1. Пробуем Telegram Cloud
    if (isTelegram && Telegram.WebApp.CloudStorage) {
        try {
            await new Promise((resolve, reject) => {
                Telegram.WebApp.CloudStorage.setItem(CONFIG.storageKey, data, (err, stored) => {
                    if (err) reject(err); else resolve(stored);
                });
            });
            console.log('Saved to Cloud');
            return;
        } catch (e) { console.warn('Cloud save error', e); }
    }
    // 2. Fallback на LocalStorage
    localStorage.setItem(CONFIG.storageKey, data);
}

async function loadSession(callback) {
    try {
        let sessionStr = null;
        if (isTelegram && Telegram.WebApp.CloudStorage) {
             sessionStr = await new Promise(resolve => 
                Telegram.WebApp.CloudStorage.getItem(CONFIG.storageKey, (err, val) => resolve(val))
            );
        }
        if (!sessionStr) sessionStr = localStorage.getItem(CONFIG.storageKey);

        if (sessionStr) {
            const session = JSON.parse(sessionStr); // ВАЖНО: парсим JSON
            currentChapter = session.currentChapter;
            currentScene = session.currentScene;
            choices = session.choices || [];
            stats = { ...stats, ...session.stats };
            console.log('Сессия загружена');
        }
        if (callback) callback();
    } catch (error) {
        console.error('Ошибка загрузки:', error);
    }
}

// === 2. УТИЛИТА СОБЫТИЙ (Фикс двойных кликов) ===
function addTapListener(element, handler) {
    if (!element) return;
    element.removeEventListener('click', handler); // Чистим старые
    element.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        handler(e);
    });
}

// === 3. ТВОИ МЕХАНИКИ (Оверлеи, Текст) ===

// Твой сложный оверлей телефона (восстановлен)
function showMessengerOverlay(sceneId) {
    const existing = document.getElementById('messenger-overlay');
    if (existing) existing.remove();

    // Создаем SVG
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('id', 'messenger-overlay');
    svg.setAttribute('width', '240');
    svg.setAttribute('height', '400');
    svg.setAttribute('viewBox', '0 0 300 500');
    svg.classList.add('phone-overlay');

    // Логика контента (аватарки и текст)
    const sceneData = scriptData.scenes.find(s => s.id === sceneId) || {};
    const speaker = sceneData.speaker?.[stats.language] || "Unknown";
    const msgText = sceneData.text?.[stats.language]?.substring(0, 50) || "...";
    
    // Используем правильный путь к ассетам
    const avatarSrc = `${ASSETS_PATH}/characters/${speaker.toLowerCase()}/${speaker.toLowerCase()}_messenger_ava.png`;

    svg.innerHTML = `
        <rect x="20" y="20" width="260" height="460" rx="30" fill="#333" stroke="#555" stroke-width="2"/>
        <rect x="30" y="50" width="240" height="400" rx="10" fill="#fff"/>
        <image href="${ASSETS_PATH}/backgrounds/bg_phone_messenger.png" x="30" y="50" width="240" height="400" preserveAspectRatio="xMidYMid slice" opacity="0.3"/>
        <rect x="30" y="50" width="240" height="50" fill="#fff"/>
        <circle cx="60" cy="75" r="15" fill="#eee"/>
        <image href="${avatarSrc}" x="45" y="60" width="30" height="30" onerror="this.style.display='none'"/>
        <text x="85" y="85" fill="#000" font-size="16" font-family="Arial">${speaker}</text>
        <line x1="30" y1="100" x2="270" y2="100" stroke="#ccc"/>
        <rect x="50" y="120" width="200" height="40" rx="10" fill="#E1F5C4"/>
        <text x="60" y="145" fill="#000" font-size="14">${msgText}</text>
    `;

    document.getElementById('overlay-layer').appendChild(svg);
    
    // Твоя анимация GSAP
    if (window.gsap) {
        gsap.from(svg, { y: 50, opacity: 0, duration: 0.5 });
    }
}

// Твоя функция печати текста с паузами ||
function typeText(text, element, callback) {
    if (isTyping) return;
    isTyping = true;
    element.textContent = '';
    
    const parts = text.split('||').map(p => p.trim()).filter(p => p.length > 0);
    let partIndex = 0;
    let charIndex = 0;
    const box = document.getElementById('dialogue-box');

    // Функция печати одной части
    function type() {
        if (partIndex >= parts.length) {
            isTyping = false;
            box.onclick = null; // Снимаем клик
            if (callback) callback();
            return;
        }

        if (charIndex < parts[partIndex].length) {
            element.textContent += parts[partIndex].charAt(charIndex);
            charIndex++;
            activeTimer = setTimeout(type, 30);
        } else {
            // Часть завершена. Ждем клика.
            isTyping = false; 
            if (partIndex < parts.length - 1) {
                // Стрелочка или индикатор паузы тут можно добавить
                addTapListener(box, () => {
                    partIndex++;
                    charIndex = 0;
                    element.textContent = '';
                    isTyping = true;
                    type();
                });
            } else {
                if (callback) callback();
            }
        }
    }

    // Пропуск анимации по клику
    addTapListener(box, () => {
        if (isTyping) {
            clearTimeout(activeTimer);
            element.textContent = parts[partIndex];
            charIndex = parts[partIndex].length;
            type(); // Вызовет логику завершения части
        }
    });

    type();
}

// === 4. ДВИЖОК ===

async function startGame() {
    document.getElementById('start-screen').style.display = 'none';
    document.getElementById('game-container').style.display = 'block';
    
    await loadChapter(currentChapter);
    showScene(currentScene);
    
    document.getElementById('menu').style.display = 'flex';
}

async function loadChapter(id) {
    try {
        const res = await fetch(`${ASSETS_PATH}/data/chapter${id}.json`);
        if (!res.ok) throw new Error('Глава не найдена');
        scriptData = await res.json();
    } catch (e) {
        alert("Ошибка загрузки. Проверьте папку assets/data");
        console.error(e);
    }
}

async function showScene(sceneId) {
    // Чистим всё старое
    clearInterval(activeTimer);
    document.getElementById('messenger-overlay')?.remove();
    document.getElementById('timer-countdown')?.remove();
    document.querySelectorAll('.choice-btn').forEach(b => b.remove());

    const scene = scriptData.scenes.find(s => s.id === sceneId);
    if (!scene) {
        currentChapter++;
        currentScene = 0;
        await loadChapter(currentChapter);
        return showScene(0);
    }

    currentScene = sceneId;
    saveSession();

    // 1. Фон
    const bgUrl = scene.background ? `url('${ASSETS_PATH}/backgrounds/${scene.background}.png')` : 'none';
    document.getElementById('background').style.backgroundImage = bgUrl;

    // 2. Персонажи (твои анимации и эффекты)
    setupCharacters(scene);

    // 3. Оверлей телефона
    if (scene.phone) showMessengerOverlay(scene.id);

    // 4. Текст
    const name = scene.speaker?.[stats.language] || "";
    document.getElementById('speaker-name').textContent = name;

    let text = scene.text[stats.language];
    // Проверка на второе прохождение в тексте
    if (stats.completionCount > 0 && scene.second_playthrough_text) {
        text = scene.second_playthrough_text[stats.language];
    }

    typeText(text, document.getElementById('dialogue-text'), () => {
        showChoices(scene);
    });
}

function setupCharacters(scene) {
    const setChar = (id, charStr, isSpeaker) => {
        const el = document.getElementById(id);
        if (!charStr) { el.style.backgroundImage = 'none'; return; }
        
        // Подстановка стиля (одежды)
        const name = charStr.replace('${stats.appearance}', stats.appearance);
        const folder = name.split('_')[0];
        el.style.backgroundImage = `url('${ASSETS_PATH}/characters/${folder}/${name}.png')`;
        
        // Твои эффекты (shiver, heartbeat)
        el.className = id === 'character-left' ? 'character-left' : 'character-right'; // сброс
        if (isSpeaker) el.classList.add('character-speaker');
        else el.classList.add('character-non-speaker');
        
        // Если в сцене указана анимация (например в JSON: "leftAnim": "shiver")
        if (id === 'character-left' && scene.leftAnim) el.classList.add(scene.leftAnim);
        if (id === 'character-right' && scene.rightAnim) el.classList.add(scene.rightAnim);
    };

    const speakerName = scene.speaker?.en; // Имя на английском для проверки
    const leftIsSpeaker = speakerName && scene.characterLeft?.includes(speakerName.toLowerCase());
    
    setChar('character-left', scene.characterLeft, leftIsSpeaker);
    setChar('character-right', scene.characterRight, !leftIsSpeaker);
}

function showChoices(scene) {
    const box = document.getElementById('dialogue-box');
    
    if (scene.choices) {
        scene.choices.forEach(choice => {
            // Проверка условий
            if (choice.condition && !checkCondition(choice.condition)) return;

            const btn = document.createElement('div');
            btn.className = 'choice-btn';
            
            // Текст и цена
            let label = choice.text[stats.language];
            if (choice.cost) label += ` (${choice.cost} 💎)`;
            btn.textContent = label;

            // Блокировка если нет денег
            if (choice.cost && stats.diamonds < choice.cost) {
                btn.setAttribute('disabled', 'true');
                btn.style.opacity = '0.5';
                box.appendChild(btn);
                return;
            }

            addTapListener(btn, () => {
                if (choice.cost) {
                    stats.diamonds -= choice.cost;
                    document.getElementById('diamonds-count').textContent = stats.diamonds;
                }
                
                // Твой таймер (очистка)
                clearInterval(activeTimer);
                document.getElementById('timer-countdown')?.remove();
                
                // Эффекты
                if (choice.effects) applyEffects(choice.effects);
                
                // Переход
                if (choice.nextScene !== undefined) showScene(choice.nextScene);
            });
            
            box.appendChild(btn);

            // Твой таймер на выбор
            if (choice.timer) startChoiceTimer(choice.timer, scene);
        });
    } else {
        // Клик по тексту для продолжения
        addTapListener(box, () => {
            if (scene.nextScene !== undefined) showScene(scene.nextScene);
        });
    }
}

function startChoiceTimer(seconds, scene) {
    const timerEl = document.createElement('div');
    timerEl.id = 'timer-countdown';
    document.getElementById('overlay-layer').appendChild(timerEl);
    
    let left = seconds;
    timerEl.textContent = left;
    
    activeTimer = setInterval(() => {
        left--;
        timerEl.textContent = left;
        if (left <= 0) {
            clearInterval(activeTimer);
            // Дефолтный выбор (первый доступный)
            const def = scene.choices[0];
            if (def && def.nextScene !== undefined) showScene(def.nextScene);
        }
    }, 1000);
}

// === 5. ИСПРАВЛЕННАЯ ГАЛЕРЕЯ (completionCount) ===
function openGallery() {
    const container = document.getElementById('gallery-container');
    const startScreen = document.getElementById('start-screen');
    container.innerHTML = '';
    container.style.display = 'flex';
    startScreen.style.display = 'none';

    // Кнопка закрыть
    const closeBtn = document.createElement('button');
    closeBtn.textContent = "Закрыть";
    closeBtn.className = "card-unlock-button"; // Используем тот же стиль
    closeBtn.style.marginBottom = "20px";
    addTapListener(closeBtn, () => {
        container.style.display = 'none';
        startScreen.style.display = 'flex';
    });
    container.appendChild(closeBtn);

    const wrapper = document.createElement('div');
    wrapper.className = 'cards-container';
    
    cardSeries['romance'].cards.forEach(card => {
        const isUnlocked = stats.memories.includes(card.id);
        
        // АВТО-РАЗБЛОКИРОВКА (Исправлено)
        if (!isUnlocked && card.unlock === "второе прохождение" && stats.completionCount >= 1) {
            stats.memories.push(card.id);
            saveSession();
            // Считаем открытой прямо сейчас
        }
        
        // Повторная проверка
        const finalUnlocked = stats.memories.includes(card.id);

        const el = document.createElement('div');
        el.className = `premium-card ${finalUnlocked ? '' : 'locked'}`;
        
        if (finalUnlocked) {
            el.innerHTML = `<img src="${ASSETS_PATH}/memories/${card.id}.png" style="width:100%;height:100%;object-fit:cover;border-radius:10px;">`;
        } else {
            // Замок
            const cost = parseInt(card.unlock);
            const isNumeric = !isNaN(cost);
            
            el.innerHTML = `<div style="color:white;text-align:center;padding:10px;">
                ${stats.language==='ru' ? card.unlock : card.unlockEn}
            </div>`;
            
            // Кнопка покупки (только если цена - число)
            if (isNumeric) {
                const buyBtn = document.createElement('button');
                buyBtn.className = 'card-unlock-button';
                buyBtn.textContent = stats.language==='ru' ? "Купить" : "Buy";
                addTapListener(buyBtn, () => {
                    if (stats.diamonds >= cost) {
                        stats.diamonds -= cost;
                        stats.memories.push(card.id);
                        saveSession();
                        openGallery(); // Перерисовка
                    } else {
                        alert("Need diamonds!");
                    }
                });
                el.appendChild(buyBtn);
            }
        }
        
        // Твоя 3D анимация GSAP
        if (window.gsap) {
             gsap.from(el, { opacity:0, y:50, duration:0.5, delay: 0.1 });
        }
        
        wrapper.appendChild(el);
    });
    
    container.appendChild(wrapper);
}

// === Утилиты ===
function checkCondition(cond) {
    const [k, op, v] = cond.split(' ');
    const val = parseInt(v);
    const stat = stats[k] ?? stats.relationships[k] ?? 0;
    if (op === '>') return stat > val;
    // ... остальные операторы ...
    return false;
}

function applyEffects(effects) {
    // Простая реализация
    for (let k in effects) {
        if (typeof effects[k] === 'number') stats[k] = (stats[k]||0) + effects[k];
    }
}

// === СТАРТ ===
document.addEventListener('DOMContentLoaded', () => {
    // Привязка кнопок
    addTapListener(document.getElementById('start-game'), () => {
        // Сброс статов, но сохранение открытых карт
        const savedMems = stats.memories;
        const savedCompl = stats.completionCount;
        stats = { ...stats, completionCount: savedCompl, memories: savedMems }; 
        startGame();
    });
    
    addTapListener(document.getElementById('continue-game'), () => {
        loadSession(() => startGame());
    });

    addTapListener(document.getElementById('gallery-btn'), openGallery);

    // Пароль
    addTapListener(document.getElementById('password-submit'), () => {
        if (document.getElementById('password-input').value === CONFIG.passwords.correct) {
            startGame();
        } else {
            alert("Wrong password");
        }
    });
    
    addTapListener(document.getElementById('show-password'), () => {
        document.querySelector('.start-buttons').style.display = 'none';
        document.getElementById('password-form').style.display = 'flex';
    });
});