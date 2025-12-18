/* Global değişkenler: görev listesi, oyuncu bilgileri ve streak verisi */
var tasks = []; // { id, title, category, difficulty, status, createdAt }

/* Oyuncu verileri (level/xp/coin) */
var player = {
    level: 1,
    xp: 0,
    xpForNext: 60, // Bir sonraki level için gereken XP
    coins: 0,
    ownedItems: [] // Satın alınan ürünlerin id listesi
};

/* Streak: hangi günlerde en az 1 görev bitirildi */
var streakData = {
    daysWithDoneTask: []
};

/* DOM elemanlarını tutacağımız değişkenler (sayfa yüklenince dolduracağız) */
var titleInput;
var catSelect;
var diffSelect;
var addBtn;
var taskListEl;
var filterCategory;
var filterStatus;
var sortMode;

var coinsDisplay;
var shopItemsContainer;

/* Mağazada görünen ürünler (id, isim, fiyat, açıklama, resim yolu) */
var shopItems = [
    {
        id: "headphones",
        name: "Kulaklık 🎧",
        price: 250,
        description: "Odaklanmanı artırmak için tasarlanmış premium kulaklık.",
        image: "images/headphones.jpeg"
    },
    {
        id: "game-pass",
        name: "Mini Oyun 🎮",
        price: 100,
        description: "Çalışma molalarında eğlenceli bir deneyim sunar.",
        image: "images/game.webp"
    },
    {
        id: "smart-watch",
        name: "Akıllı Saat ⌚",
        price: 60,
        description: "Zaman yönetimini temsil eden şık bir aksesuar.",
        image: "images/smart-watch.jpeg"
    }
];

/* localStorage'dan kayıtlı verileri yükler */
function loadState() {
    var savedTasks = localStorage.getItem("hq_tasks");
    var savedPlayer = localStorage.getItem("hq_player");
    var savedStreak = localStorage.getItem("hq_streak");

    if (savedTasks) tasks = JSON.parse(savedTasks);
    if (savedPlayer) player = JSON.parse(savedPlayer);
    if (savedStreak) streakData = JSON.parse(savedStreak);

    /* Eski kayıtlarla uyumluluk: coins ve ownedItems yoksa ekle */
    if (typeof player.coins !== "number") player.coins = 0;
    if (!player.ownedItems) player.ownedItems = [];
}

/* Verileri localStorage'a kaydeder */
function saveState() {
    localStorage.setItem("hq_tasks", JSON.stringify(tasks));
    localStorage.setItem("hq_player", JSON.stringify(player));
    localStorage.setItem("hq_streak", JSON.stringify(streakData));
}

/* Zorluk seviyesine göre XP miktarı döndürür */
function getXpForDifficulty(diff) {
    if (diff === "zor") return 30;
    if (diff === "orta") return 20;
    return 10;
}

/* Zorluk seviyesine göre coin miktarı döndürür */
function getCoinsForDifficulty(diff) {
    if (diff === "zor") return 5;
    if (diff === "orta") return 3;
    return 2;
}

/* XP ekler, level atlamayı kontrol eder, level atlarsa coin bonusu verir */
function addXp(amount) {
    player.xp += amount;

    var prevLevel = player.level;

    /* XP, xpForNext'i geçiyorsa seviye atlar (birden fazla da olabilir) */
    while (player.xp >= player.xpForNext) {
        player.xp -= player.xpForNext;  // Bir levelin XP'sini düş
        player.level += 1;              // Level artır
        player.xpForNext += 30;         // Her levelde gereken XP’yi arttır
        addCoins(10);                   // Level atlama bonusu
    }

    /* Level 4'e ilk kez gelince mağaza açılır */
    if (prevLevel < 4 && player.level >= 4) {
        alert("Tebrikler! Mağaza artık açıldı (Level 4).");
    }

    updatePlayerDom();
    updateShopVisibility();
}

/* Coin ekler ve ekrana yansıtır */
function addCoins(amount) {
    player.coins += amount;
    updateCoinsDom();
    saveState();
}

/* Oyuncu panelini (level, xp bar) günceller */
function updatePlayerDom() {
    var levelSpan = document.getElementById("player-level");
    var xpText = document.getElementById("xp-text");
    var xpFill = document.getElementById("xp-fill");

    var label = "Level: " + player.level;

    levelSpan.textContent = label;
    xpText.textContent = player.xp + " / " + player.xpForNext + " XP";

    /* XP bar genişliği (%) */
    xpFill.style.width = (player.xp * 100) / player.xpForNext + "%";
}

/* Coin sayısını ekranda günceller */
function updateCoinsDom() {
    if (coinsDisplay) {
        coinsDisplay.textContent = "Coin: " + player.coins;
    }
}

/* Bugünün tarihini YYYY-MM-DD formatında döndürür */
function getToday() {
    var d = new Date();
    return d.toISOString().split("T")[0];
}

/* Bugün en az 1 görev bitti ise streak listesine bugünü ekler */
function markTodayForStreak() {
    var today = getToday();
    if (streakData.daysWithDoneTask.indexOf(today) === -1) {
        streakData.daysWithDoneTask.push(today);
        saveState();
    }
}

/* Arka arkaya kaç gün streak olduğunu hesaplar */
function calculateStreak() {
    var streak = 0;
    var today = new Date(getToday());

    /* Bugünden geriye giderek streak var mı kontrol eder */
    while (true) {
        var d = new Date(today.getTime() - streak * 86400000); // 1 gün = 86400000ms
        var dayStr = d.toISOString().split("T")[0];
        if (streakData.daysWithDoneTask.indexOf(dayStr) !== -1) {
            streak++;
        } else {
            break;
        }
    }
    return streak;
}

/* Streak değerini ekranda gösterir */
function updateStreakDom() {
    document.getElementById("streak-value").textContent = calculateStreak();
}

/* Son 7 günün grafiğini çizer */
function renderWeekChart() {
    var chart = document.getElementById("week-chart");
    chart.innerHTML = "";

    var today = new Date(getToday());

    /* 6 gün önce -> bugün */
    for (var i = 6; i >= 0; i--) {
        var d = new Date(today.getTime() - i * 86400000);

        /* O gün biten görev sayısı */
        var dateStr = d.toISOString().split("T")[0];
        var count = tasks.filter(function (t) {
            return t.status === "bitti" && t.createdAt.startsWith(dateStr);
        }).length;

        /* Bar elemanı */
        var bar = document.createElement("div");
        bar.className = "chart-bar";

        var inner = document.createElement("div");
        inner.className = "chart-bar-inner";
        inner.style.height = count * 15 + "px"; // Her görev 15px yükseklik

        bar.appendChild(inner);

        /* Gün label (sadece gün numarası) */
        var label = document.createElement("span");
        label.textContent = d.getDate();
        bar.appendChild(label);

        chart.appendChild(bar);
    }
}

/* Mağazayı ekrana basar */
function renderShop() {
    shopItemsContainer.innerHTML = "";

    shopItems.forEach(function (item) {
        var card = document.createElement("div");
        card.className = "shop-item-card";

        /* Ürün resmi */
        var img = document.createElement("img");
        img.src = item.image;
        img.className = "shop-item-img";
        img.alt = item.name;
        card.appendChild(img);

        /* Ürün bilgileri (isim/açıklama/fiyat) */
        card.innerHTML += `
            <div class="shop-item-title">${item.name}</div>
            <div class="shop-item-desc">${item.description}</div>
            <div class="shop-item-price">${item.price} coin</div>
        `;

        var footer = document.createElement("div");
        footer.className = "shop-item-footer";

        /* Ürün satın alındıysa "Satın alındı" etiketi göster */
        if (player.ownedItems.indexOf(item.id) !== -1) {
            footer.innerHTML = "<div class='shop-owned-label'>Satın alındı</div>";
        } else {
            /* Satın alma butonu */
            var btn = document.createElement("button");
            btn.textContent = "Satın Al";

            /* Butona tıklanınca coin kontrolü + satın alma */
            btn.onclick = function () {
                if (player.coins < item.price) {
                    alert("Yeterli coin yok!");
                    return;
                }
                player.coins -= item.price;
                player.ownedItems.push(item.id);
                saveState();
                updateCoinsDom();
                updatePlayerDom();
                renderShop();
            };

            footer.appendChild(btn);
        }

        card.appendChild(footer);
        shopItemsContainer.appendChild(card);
    });
}

/* Mağaza sadece Level 4 ve üstünde görünür */
function updateShopVisibility() {
    var shop = document.getElementById("shop-section");
    shop.style.display = player.level >= 4 ? "block" : "none";
}

/* Tek bir görevi (li) DOM'a çevirir */
function createTaskElement(task) {
    var li = document.createElement("li");

    /* Görev bittiyse done class eklenir */
    li.className = "task-item" + (task.status === "bitti" ? " done" : "");

    /* Görev içeriği: başlık + badge'ler + butonlar */
    li.innerHTML = `
        <div>
            <span class="task-item-title">${task.title}</span>
            <div class="badge-row">
                <span class="badge ${task.category}">${task.category}</span>
                <span class="badge ${task.difficulty}">${task.difficulty}</span>
            </div>
        </div>
        <div class="task-actions">
            <button>${task.status === "bitti" ? "Geri Al" : "Bitti"}</button>
            <button class="btn-secondary">Sil</button>
        </div>
    `;

    /* "Bitti / Geri Al" butonu */
    li.querySelector("button").onclick = function () {
        if (task.status === "aktif") {
            task.status = "bitti";
            addXp(getXpForDifficulty(task.difficulty));
            addCoins(getCoinsForDifficulty(task.difficulty));
            markTodayForStreak();
        } else {
            task.status = "aktif";
        }

        saveState();
        renderTasks();
        updateStreakDom();
        renderWeekChart();
    };

    /* "Sil" butonu */
    li.querySelector(".btn-secondary").onclick = function () {
        tasks = tasks.filter(function (t) {
            return t.id !== task.id;
        });

        saveState();
        renderTasks();
        updateStreakDom();
        renderWeekChart();
    };

    return li;
}

/* Görevleri filtreleyip ekrana basar */
function renderTasks() {
    taskListEl.innerHTML = "";

    var list = tasks.slice();

    /* Kategori filtresi */
    if (filterCategory.value !== "hepsi") {
        list = list.filter(function (t) {
            return t.category === filterCategory.value;
        });
    }

    /* Durum filtresi */
    if (filterStatus.value !== "hepsi") {
        list = list.filter(function (t) {
            return t.status === filterStatus.value;
        });
    }

    /* Filtrelenmiş listeyi ekrana çiz */
    list.forEach(function (t) {
        taskListEl.appendChild(createTaskElement(t));
    });

    updatePlayerDom();
}

/* Sayfa yüklenince: DOM elemanlarını al, eventleri bağla, verileri yükle ve çiz */
window.onload = function () {
    titleInput = document.getElementById("task-title");
    catSelect = document.getElementById("task-category");
    diffSelect = document.getElementById("task-difficulty");
    addBtn = document.getElementById("add-task-btn");
    taskListEl = document.getElementById("task-list");
    filterCategory = document.getElementById("filter-category");
    filterStatus = document.getElementById("filter-status");
    sortMode = document.getElementById("sort-mode");

    coinsDisplay = document.getElementById("coins-display");
    shopItemsContainer = document.getElementById("shop-items");

    /* Yeni görev ekleme */
    addBtn.onclick = function () {
        if (!titleInput.value.trim()) return;

        tasks.push({
            id: Date.now(),
            title: titleInput.value,
            category: catSelect.value,
            difficulty: diffSelect.value,
            status: "aktif",
            createdAt: new Date().toISOString()
        });

        saveState();
        renderTasks();
        titleInput.value = "";
    };

    /* Filtre değişince listeyi yeniden çiz */
    filterCategory.onchange = renderTasks;
    filterStatus.onchange = renderTasks;

    /* Kayıtlı verileri yükle */
    loadState();

    /* İlk çizimler */
    updatePlayerDom();
    updateCoinsDom();
    renderTasks();
    updateStreakDom();
    renderWeekChart();
    updateShopVisibility();
    renderShop();
};