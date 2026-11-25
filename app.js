
// ========================================
// СОСТОЯНИЕ ПРИЛОЖЕНИЯ
// ========================================

let dictionaries = [];
let currentDictionary = null;
let editorDirty = false;
let saving = false;
let currentPage = "home";


// ========================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ========================================

function el(id) {
    return document.getElementById(id);
}


function escapeHTML(value) {

    const div = document.createElement("div");

    div.textContent = String(value ?? "");

    return div.innerHTML
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}


function wordCountText(count) {

    const last = count % 10;
    const lastTwo = count % 100;

    if (lastTwo >= 11 && lastTwo <= 14) {
        return count + " слов";
    }

    if (last === 1) {
        return count + " слово";
    }

    if (last >= 2 && last <= 4) {
        return count + " слова";
    }

    return count + " слов";
}


function learnedCount(dictionary) {

    return dictionary.words.filter(word =>
        word.streak >= 3
    ).length;
}


function progressPercent(dictionary) {

    if (dictionary.words.length === 0) {
        return 0;
    }

    return Math.round(
        learnedCount(dictionary) /
        dictionary.words.length * 100
    );
}


// ========================================
// ПЕРЕКЛЮЧЕНИЕ СТРАНИЦ
// ========================================

function showPage(pageName, force = false) {

    const target = el(pageName);

    if (!target) {
        return false;
    }

    if (
        currentPage === "dictionary-editor" &&
        pageName !== "dictionary-editor" &&
        editorDirty &&
        !force
    ) {

        if (!confirm("Выйти без сохранения изменений?")) {
            return false;
        }

        editorDirty = false;
    }

    document.querySelectorAll(".page")
        .forEach(page => {
            page.classList.remove("active");
        });

    target.classList.add("active");

    currentPage = pageName;

    const navPage = pageName === "dictionary-editor"
        ? "dictionaries"
        : pageName;

    document.querySelectorAll(".nav-button")
        .forEach(button => {

            const active =
                button.dataset.page === navPage;

            button.classList.toggle("active", active);

            if (active) {
                button.setAttribute("aria-current", "page");
            } else {
                button.removeAttribute("aria-current");
            }
        });

    window.scrollTo(0, 0);

    return true;
}


// ========================================
// ЗАГРУЗКА ДАННЫХ
// ========================================

async function refreshDictionaries() {

    dictionaries = await getDictionaries();

    renderHome();
    renderDictionaries();
    renderTrainingSelect();
    renderStatistics();
}


// ========================================
// ГЛАВНАЯ СТРАНИЦА
// ========================================

function renderHome() {

    const container = el("continue-container");

    if (dictionaries.length === 0) {

        container.innerHTML = `
            <article class="continue-card">
                <h2>Начните обучение</h2>
                <p>Создайте свой первый словарь.</p>
            </article>
        `;

        el("home-dictionaries").innerHTML = `
            <div class="empty-state">
                <p>У вас пока нет словарей.</p>
            </div>
        `;

        return;
    }

    let lastId = null;

    try {
        lastId = localStorage.getItem("lastDictionary");
    } catch (error) {
        console.warn(error);
    }

    const dictionary =
        dictionaries.find(d => d.id === lastId) ||
        dictionaries[0];

    const percent = progressPercent(dictionary);

    container.innerHTML = `
        <article class="continue-card">

            <span class="eyebrow">
                ПРОДОЛЖИТЬ ОБУЧЕНИЕ
            </span>

            <h2>${escapeHTML(dictionary.name)}</h2>

            <p>
                ${wordCountText(dictionary.words.length)}
                в словаре
            </p>

            <div class="progress-track"
                 role="progressbar"
                 aria-label="Прогресс изучения"
                 aria-valuenow="${percent}"
                 aria-valuemin="0"
                 aria-valuemax="100">

                <div class="progress-fill"
                     style="width: ${percent}%">
                </div>

            </div>

            <div class="progress-info">

                <span>
                    Изучено ${learnedCount(dictionary)}
                    из ${dictionary.words.length}
                </span>

                <span>${percent}%</span>

            </div>

            <button class="primary-button"
                    data-action="train"
                    data-id="${escapeHTML(dictionary.id)}">
                Начать тренировку
            </button>

        </article>
    `;

    el("home-dictionaries").innerHTML =
        dictionaries.slice(0, 3)
            .map(dictionary =>
                dictionaryCard(dictionary, false)
            ).join("");
}


// ========================================
// КАРТОЧКА СЛОВАРЯ
// ========================================

function dictionaryCard(dictionary, withActions) {

    const id = escapeHTML(dictionary.id);

    const icon = escapeHTML(
        Array.from(dictionary.words[0]?.korean || "한")[0]
    );

    const card = `
        <button class="dictionary-card"
                data-action="train"
                data-id="${id}">

            <span class="dictionary-icon" lang="ko">
                ${icon}
            </span>

            <span class="dictionary-info">

                <strong>
                    ${escapeHTML(dictionary.name)}
                </strong>

                <small>
                    ${wordCountText(dictionary.words.length)}
                </small>

            </span>

            <span class="chevron">›</span>

        </button>
    `;

    if (!withActions) {
        return card;
    }

    return `
        <div class="dictionary-entry">

            ${card}

            <div class="dictionary-actions">

                <button class="action-button"
                        data-action="edit"
                        data-id="${id}">
                    Редактировать
                </button>

                <button class="action-button"
                        data-action="export"
                        data-id="${id}">
                    Экспорт
                </button>

                <button class="action-button danger-button"
                        data-action="delete"
                        data-id="${id}">
                    Удалить
                </button>

            </div>

        </div>
    `;
}


// ========================================
// СПИСОК СЛОВАРЕЙ
// ========================================

function renderDictionaries() {

    const container = el("dictionary-list");

    if (dictionaries.length === 0) {

        container.innerHTML = `
            <div class="empty-state">
                <p>Создайте свой первый словарь.</p>
            </div>
        `;

        return;
    }

    container.innerHTML =
        dictionaries.map(dictionary =>
            dictionaryCard(dictionary, true)
        ).join("");
}


// ========================================
// ВЫБОР СЛОВАРЯ ДЛЯ ТРЕНИРОВКИ
// ========================================

function renderTrainingSelect() {

    const select = el("dictionary-select");
    const oldValue = select.value;

    select.innerHTML = "";

    if (dictionaries.length === 0) {

        const option = document.createElement("option");

        option.textContent = "Нет словарей";
        option.value = "";

        select.appendChild(option);
        select.disabled = true;

        return;
    }

    select.disabled = false;

    dictionaries.forEach(dictionary => {

        const option = document.createElement("option");

        option.value = dictionary.id;
        option.textContent = dictionary.name;

        select.appendChild(option);
    });

    if (dictionaries.some(d => d.id === oldValue)) {
        select.value = oldValue;
    }
}


function selectTrainingDictionary(id) {

    if (!showPage("training")) {
        return;
    }

    el("dictionary-select").value = id;

    try {
        localStorage.setItem("lastDictionary", id);
    } catch (error) {
        console.warn(error);
    }

    renderHome();
}


// ========================================
// ОТКРЫТИЕ РЕДАКТОРА
// ========================================

function openEditor(dictionary = null) {

    currentDictionary = dictionary
        ? JSON.parse(JSON.stringify(dictionary))
        : createDictionary("");

    editorDirty = false;

    el("editor-title").textContent = dictionary
        ? "Редактирование словаря"
        : "Новый словарь";

    el("dictionary-name").value =
        currentDictionary.name;

    el("paste-input").value = "";
    el("korean-input").value = "";
    el("russian-input").value = "";
    el("dictionary-file").value = "";

    setEditorMessage("");
    switchEditorTab("paste");
    renderEditorWords();

    showPage("dictionary-editor");
}


// ========================================
// ВКЛАДКИ РЕДАКТОРА
// ========================================

function switchEditorTab(tabName) {

    document.querySelectorAll(".editor-tab")
        .forEach(button => {

            button.classList.toggle(
                "active",
                button.dataset.editorTab === tabName
            );
        });

    document.querySelectorAll(".editor-panel")
        .forEach(panel => {

            panel.classList.toggle(
                "active",
                panel.id === "panel-" + tabName
            );
        });
}


// ========================================
// СООБЩЕНИЯ РЕДАКТОРА
// ========================================

function setEditorMessage(message, isError = false) {

    const element = el("editor-message");

    element.textContent = message;

    element.classList.toggle("error", isError);
}


// ========================================
// ОТОБРАЖЕНИЕ СЛОВ В РЕДАКТОРЕ
// ========================================

function renderEditorWords() {

    const words = currentDictionary.words;

    el("editor-word-count").textContent =
        wordCountText(words.length);

    const container = el("editor-word-list");

    if (words.length === 0) {

        container.innerHTML = `
            <div class="empty-state">
                <p>Добавьте первые слова.</p>
            </div>
        `;

        return;
    }

    container.innerHTML = words.map(word => `

        <div class="word-row"
             data-word-id="${escapeHTML(word.id)}">

            <input type="text"
                   class="korean-word"
                   data-field="korean"
                   lang="ko"
                   aria-label="Корейское слово"
                   value="${escapeHTML(word.korean)}">

            <input type="text"
                   data-field="russian"
                   aria-label="Русский перевод"
                   value="${escapeHTML(word.russian)}">

            <button class="remove-word"
                    data-remove-word="${escapeHTML(word.id)}"
                    aria-label="Удалить слово">
                ×
            </button>

        </div>

    `).join("");
}


// ========================================
// ДОБАВЛЕНИЕ СЛОВА
// ========================================

function addWord(korean, russian) {

    korean = korean.trim().normalize("NFC");
    russian = russian.trim().normalize("NFC");

    if (!korean || !russian) {
        return false;
    }

    const duplicate = currentDictionary.words.some(word =>
        word.korean.trim().normalize("NFC") === korean &&
        word.russian.trim().normalize("NFC").toLowerCase()
            === russian.toLowerCase()
    );

    if (duplicate) {
        return false;
    }

    currentDictionary.words.push(
        createWord(korean, russian)
    );

    editorDirty = true;

    return true;
}


// ========================================
// РУЧНОЕ ДОБАВЛЕНИЕ
// ========================================

function addManualWord() {

    const korean = el("korean-input").value.trim();
    const russian = el("russian-input").value.trim();

    if (!korean || !russian) {

        setEditorMessage(
            "Заполните оба поля.",
            true
        );

        return;
    }

    if (!addWord(korean, russian)) {

        setEditorMessage(
            "Такая пара слов уже существует.",
            true
        );

        return;
    }

    el("korean-input").value = "";
    el("russian-input").value = "";

    renderEditorWords();

    setEditorMessage("Слово добавлено.");

    el("korean-input").focus();
}


// ========================================
// ОПРЕДЕЛЕНИЕ РАЗДЕЛИТЕЛЯ
// ========================================

function detectDelimiter(text) {

    const firstLine = text.split(/\r?\n/)
        .find(line => line.trim()) || "";

    const delimiters = [";", "\t", ","];
    const counts = [0, 0, 0];

    let quoted = false;

    for (let i = 0; i < firstLine.length; i++) {

        const char = firstLine[i];

        if (char === '"') {

            if (quoted && firstLine[i + 1] === '"') {
                i++;
            } else {
                quoted = !quoted;
            }

        } else if (!quoted) {

            const index = delimiters.indexOf(char);

            if (index !== -1) {
                counts[index]++;
            }
        }
    }

    const exact = counts.indexOf(1);

    if (exact !== -1) {
        return delimiters[exact];
    }

    const max = Math.max(...counts);

    return max > 0
        ? delimiters[counts.indexOf(max)]
        : ";";
}


// ========================================
// РАЗБОР CSV / TXT
// ========================================

function parseTable(text, delimiter) {

    text = text.replace(/^\uFEFF/, "");

    const rows = [];

    let row = [];
    let field = "";
    let quoted = false;

    for (let i = 0; i < text.length; i++) {

        const char = text[i];

        if (char === '"') {

            if (quoted && text[i + 1] === '"') {

                field += '"';
                i++;

            } else if (quoted || field.length === 0) {

                quoted = !quoted;

            } else {

                field += char;
            }

        } else if (!quoted && char === delimiter) {

            row.push(field);
            field = "";

        } else if (
            !quoted &&
            (char === "\n" || char === "\r")
        ) {

            if (char === "\r" && text[i + 1] === "\n") {
                i++;
            }

            row.push(field);

            if (row.some(value => value.trim())) {
                rows.push(row);
            }

            row = [];
            field = "";

        } else {

            field += char;
        }
    }

    if (quoted) {
        throw new Error(
            "В файле обнаружена незакрытая кавычка."
        );
    }

    row.push(field);

    if (row.some(value => value.trim())) {
        rows.push(row);
    }

    return rows;
}


// ========================================
// ИМПОРТ СЛОВ ИЗ ТЕКСТА
// ========================================

function importWords(text) {

    text = text.replace(/^\uFEFF/, "").trim();

    if (!text) {

        setEditorMessage(
            "Нет текста для обработки.",
            true
        );

        return;
    }

    let rows;

    try {

        rows = parseTable(
            text,
            detectDelimiter(text)
        );

    } catch (error) {

        setEditorMessage(error.message, true);
        return;
    }

    let added = 0;
    let skipped = 0;
    let invalid = 0;

    const invalidRows = [];

    rows.forEach((row, index) => {

        const fields = row.map(value => value.trim());

        const first = fields[0]?.toLowerCase();
        const second = fields[1]?.toLowerCase();

        // Пропускаем стандартные заголовки таблицы

        if (
            index === 0 &&
            fields.length === 2 &&
            ["корейский", "korean", "корейское слово"]
                .includes(first) &&
            ["русский", "russian", "перевод"]
                .includes(second)
        ) {
            return;
        }

        if (
            fields.length !== 2 ||
            !fields[0] ||
            !fields[1]
        ) {

            invalid++;
            invalidRows.push(index + 1);

            return;
        }

        if (addWord(fields[0], fields[1])) {
            added++;
        } else {
            skipped++;
        }

    });

    renderEditorWords();

    let message =
        `Добавлено: ${added}. ` +
        `Дубликатов: ${skipped}. ` +
        `Ошибочных записей: ${invalid}.`;

    if (invalidRows.length > 0) {

        message += " Проверьте записи: " +
            invalidRows.slice(0, 10).join(", ") +
            (invalidRows.length > 10 ? "..." : ".");
    }

    setEditorMessage(
        message,
        invalid > 0
    );

    return { added, skipped, invalid };
}


// ========================================
// ЗАГРУЗКА ИЗ ФАЙЛА
// ========================================

async function importFile(event) {

    const file = event.target.files[0];

    if (!file) {
        return;
    }

    try {

        if (!/\.(csv|txt)$/i.test(file.name)) {

            throw new Error(
                "Поддерживаются только CSV и TXT."
            );
        }

        if (file.size > 5 * 1024 * 1024) {

            throw new Error(
                "Максимальный размер файла — 5 МБ."
            );
        }

        const editor = currentDictionary;

        const text = new TextDecoder(
            "utf-8",
            { fatal: true }
        ).decode(await file.arrayBuffer());

        if (
            currentPage !== "dictionary-editor" ||
            currentDictionary !== editor
        ) {
            return;
        }

        importWords(text);

        if (!el("dictionary-name").value.trim()) {

            el("dictionary-name").value =
                file.name.replace(/\.[^.]+$/, "");

            editorDirty = true;
        }

    } catch (error) {

        setEditorMessage(
            "Ошибка чтения файла: " + error.message,
            true
        );

    } finally {

        event.target.value = "";
    }
}


// ========================================
// СОХРАНЕНИЕ СЛОВАРЯ
// ========================================

async function saveCurrentDictionary() {

    if (saving) {
        return;
    }

    const name = el("dictionary-name").value.trim();

    if (!name) {

        alert("Введите название словаря.");
        el("dictionary-name").focus();

        return;
    }

    if (currentDictionary.words.length === 0) {

        alert("Добавьте хотя бы одно слово.");
        return;
    }

    const words = currentDictionary.words;

    for (const word of words) {

        word.korean =
            word.korean.trim().normalize("NFC");

        word.russian =
            word.russian.trim().normalize("NFC");

        if (!word.korean || !word.russian) {

            alert(
                "В словаре есть незаполненные поля."
            );

            return;
        }
    }

    const unique = new Set();

    for (const word of words) {

        const key = JSON.stringify([
            word.korean,
            word.russian.toLowerCase()
        ]);

        if (unique.has(key)) {

            alert(
                "В словаре есть повторяющиеся пары слов."
            );

            return;
        }

        unique.add(key);
    }

    // Если слово или перевод изменились,
    // старая статистика для этой пары сбрасывается.

    const original = dictionaries.find(
        d => d.id === currentDictionary.id
    );

    if (original) {

        for (const word of words) {

            const oldWord = original.words.find(
                w => w.id === word.id
            );

            if (
                oldWord &&
                (
                    oldWord.korean !== word.korean ||
                    oldWord.russian !== word.russian
                )
            ) {

                word.correct = 0;
                word.incorrect = 0;
                word.streak = 0;
            }
        }
    }

    currentDictionary.name = name;

    saving = true;
    el("save-dictionary").disabled = true;

    try {

        await saveDictionary(currentDictionary);

        editorDirty = false;

        await refreshDictionaries();

        showPage("dictionaries", true);

    } catch (error) {

        alert(
            "Не удалось сохранить словарь: " +
            error.message
        );

    } finally {

        saving = false;
        el("save-dictionary").disabled = false;
    }
}


// ========================================
// УДАЛЕНИЕ СЛОВАРЯ
// ========================================

async function removeDictionary(id) {

    const dictionary = dictionaries.find(
        d => d.id === id
    );

    if (!dictionary) {
        return;
    }

    const approved = confirm(
        `Удалить словарь «${dictionary.name}»?\n` +
        `Все слова и статистика будут удалены.`
    );

    if (!approved) {
        return;
    }

    try {

        await deleteDictionary(id);
        await refreshDictionaries();

    } catch (error) {

        alert(
            "Ошибка удаления: " + error.message
        );
    }
}


// ========================================
// ЭКСПОРТ СЛОВАРЯ
// ========================================

function exportDictionary(id) {

    const dictionary = dictionaries.find(
        d => d.id === id
    );

    if (!dictionary) {
        return;
    }

    function quoteCSV(value) {

        return '"' +
            String(value).replaceAll('"', '""') +
            '"';
    }

    const rows = ["Корейский;Русский"];

    dictionary.words.forEach(word => {

        rows.push(
            quoteCSV(word.korean) + ";" +
            quoteCSV(word.russian)
        );

    });

    const content = "\uFEFF" + rows.join("\r\n");

    const blob = new Blob(
        [content],
        { type: "text/csv;charset=utf-8" }
    );

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;

    link.download = dictionary.name
        .replace(/[\\/:*?"<>|]/g, "_") + ".csv";

    document.body.appendChild(link);

    link.click();
    link.remove();

    setTimeout(
        () => URL.revokeObjectURL(url),
        1000
    );
}


// ========================================
// СТАТИСТИКА
// ========================================

function renderStatistics() {

    const words = dictionaries.flatMap(
        dictionary => dictionary.words
    );

    const correct = words.reduce(
        (sum, word) => sum + word.correct,
        0
    );

    const incorrect = words.reduce(
        (sum, word) => sum + word.incorrect,
        0
    );

    el("stat-total-words").textContent =
        words.length;

    el("stat-dictionaries").textContent =
        dictionaries.length;

    el("stat-learned").textContent =
        words.filter(word => word.streak >= 3).length;

    el("stat-accuracy").textContent =
        correct + incorrect > 0
            ? Math.round(
                correct / (correct + incorrect) * 100
            ) + "%"
            : "—";

    el("dictionary-progress").innerHTML =
        dictionaries.map(dictionary => {

            const percent =
                progressPercent(dictionary);

            return `
                <div class="dictionary-progress-item">

                    <strong>
                        ${escapeHTML(dictionary.name)}
                    </strong>

                    <div class="progress-track"
                         role="progressbar"
                         aria-label="Прогресс изучения"
                         aria-valuenow="${percent}"
                         aria-valuemin="0"
                         aria-valuemax="100">

                        <div class="progress-fill"
                             style="width:${percent}%">
                        </div>

                    </div>

                    <div class="progress-info">

                        <span>
                            ${learnedCount(dictionary)}
                            из ${dictionary.words.length}
                        </span>

                        <span>${percent}%</span>

                    </div>

                </div>
            `;

        }).join("") ||
        "<p>Нет данных для отображения.</p>";
}


// ========================================
// ИНИЦИАЛИЗАЦИЯ ПРИЛОЖЕНИЯ
// ========================================

document.addEventListener(
    "DOMContentLoaded",
    async function () {

        // Общая обработка кнопок

        document.addEventListener(
            "click",
            async function (event) {

                const button =
                    event.target.closest("button");

                if (!button || button.disabled || saving) {
                    return;
                }

                if (button.dataset.page) {

                    showPage(button.dataset.page);
                    return;
                }

                if (button.dataset.editorTab) {

                    switchEditorTab(
                        button.dataset.editorTab
                    );

                    return;
                }

                if (button.dataset.removeWord) {

                    const id = button.dataset.removeWord;

                    currentDictionary.words =
                        currentDictionary.words.filter(
                            word => word.id !== id
                        );

                    editorDirty = true;

                    renderEditorWords();

                    return;
                }

                const id = button.dataset.id;

                if (button.dataset.action === "train") {

                    selectTrainingDictionary(id);
                }

                if (button.dataset.action === "edit") {

                    const dictionary = dictionaries.find(
                        d => d.id === id
                    );

                    if (dictionary) {
                        openEditor(dictionary);
                    }
                }

                if (button.dataset.action === "delete") {

                    await removeDictionary(id);
                }

                if (button.dataset.action === "export") {

                    exportDictionary(id);
                }

            }
        );


        // Создание словарей

        el("add-dictionary").onclick =
            () => openEditor();

        el("home-add-dictionary").onclick =
            () => openEditor();


        // Возврат из редактора

        el("editor-back").onclick =
            () => showPage("dictionaries");

        el("cancel-editor").onclick =
            () => showPage("dictionaries");


        // Добавление слов

        el("manual-add").onclick =
            addManualWord;

        el("parse-words").onclick = function () {

            const result = importWords(
                el("paste-input").value
            );

            if (result && result.invalid === 0) {
                el("paste-input").value = "";
            }
        };

        el("dictionary-file").onchange =
            importFile;


        // Сохранение словаря

        el("save-dictionary").onclick =
            saveCurrentDictionary;


        // Изменение названия

        el("dictionary-name").oninput = function () {

            currentDictionary.name = this.value;
            editorDirty = true;
        };


        // Несохранённые данные в полях добавления

        ["paste-input", "korean-input", "russian-input"]
            .forEach(id => {

                el(id).addEventListener("input", () => {
                    editorDirty = true;
                });
            });


        // Редактирование отдельных слов

        el("editor-word-list").addEventListener(
            "input",
            function (event) {

                const input = event.target;

                const row = input.closest("[data-word-id]");

                if (!row || !input.dataset.field) {
                    return;
                }

                const word = currentDictionary.words.find(
                    word => word.id === row.dataset.wordId
                );

                if (word) {

                    word[input.dataset.field] =
                        input.value;

                    editorDirty = true;
                }
            }
        );


        // Запоминаем последний выбранный словарь

        el("dictionary-select").onchange = function () {

            try {
                localStorage.setItem(
                    "lastDictionary",
                    this.value
                );
            } catch (error) {
                console.warn(error);
            }

            renderHome();
        };


        // Защита от случайного закрытия страницы

        window.addEventListener(
            "beforeunload",
            function (event) {

                if (
                    currentPage === "dictionary-editor" &&
                    editorDirty
                ) {

                    event.preventDefault();
                    event.returnValue = "";
                }
            }
        );


        // Загружаем приложение

        try {

            await openDatabase();
            await refreshDictionaries();

            showPage("home");

            console.log(
                "Korean Study v0.2 успешно запущен"
            );

        } catch (error) {

            console.error(error);

            alert(
                "Не удалось открыть базу данных. " +
                error.message
            );
        }
    }
);
