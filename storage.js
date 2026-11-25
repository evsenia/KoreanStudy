
// ========================================
// НАСТРОЙКИ БАЗЫ ДАННЫХ
// ========================================

const DB_NAME = "KoreanStudyDB";
const DB_VERSION = 1;
const STORE_NAME = "dictionaries";

let dbPromise = null;


// ========================================
// ОТКРЫТИЕ БАЗЫ ДАННЫХ
// ========================================

function openDatabase() {

    if (dbPromise) {
        return dbPromise;
    }

    dbPromise = new Promise((resolve, reject) => {

        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = function () {

            const db = request.result;

            if (!db.objectStoreNames.contains(STORE_NAME)) {

                const store = db.createObjectStore(
                    STORE_NAME,
                    { keyPath: "id" }
                );

                store.put(createDictionary(
                    "Корейские числительные",
                    [
                        ["하나", "Один"],
                        ["둘", "Два"],
                        ["셋", "Три"],
                        ["넷", "Четыре"],
                        ["다섯", "Пять"],
                        ["여섯", "Шесть"],
                        ["일곱", "Семь"],
                        ["여덟", "Восемь"],
                        ["아홉", "Девять"],
                        ["열", "Десять"]
                    ]
                ));

                store.put(createDictionary(
                    "Китайско-корейские числительные",
                    [
                        ["일", "Один"],
                        ["이", "Два"],
                        ["삼", "Три"],
                        ["사", "Четыре"],
                        ["오", "Пять"],
                        ["육", "Шесть"],
                        ["칠", "Семь"],
                        ["팔", "Восемь"],
                        ["구", "Девять"],
                        ["십", "Десять"]
                    ]
                ));
            }
        };

        request.onsuccess = function () {
            resolve(request.result);
        };

        request.onerror = function () {
            dbPromise = null;
            reject(request.error);
        };

    });

    return dbPromise;
}


// ========================================
// СОЗДАНИЕ ОБЪЕКТОВ
// ========================================

function createId() {
    return crypto.randomUUID
        ? crypto.randomUUID()
        : Date.now().toString(36) +
          Math.random().toString(36).slice(2);
}


function createWord(korean, russian) {

    return {
        id: createId(),
        korean: korean.trim(),
        russian: russian.trim(),

        correct: 0,
        incorrect: 0,
        streak: 0
    };
}


function createDictionary(name, pairs = []) {

    return {
        id: createId(),
        name: name.trim(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),

        words: pairs.map(pair =>
            createWord(pair[0], pair[1])
        )
    };
}


// ========================================
// ВЫПОЛНЕНИЕ ОПЕРАЦИЙ
// ========================================

async function databaseOperation(mode, operation) {

    const db = await openDatabase();

    return new Promise((resolve, reject) => {

        const transaction = db.transaction(
            STORE_NAME,
            mode
        );

        const store = transaction.objectStore(STORE_NAME);

        const request = operation(store);

        transaction.oncomplete = function () {
            resolve(request.result);
        };

        transaction.onerror = function () {
            reject(transaction.error || request.error);
        };

        transaction.onabort = function () {
            reject(transaction.error ||
                new Error("Операция прервана"));
        };

    });
}


// ========================================
// ПОЛУЧЕНИЕ ВСЕХ СЛОВАРЕЙ
// ========================================

async function getDictionaries() {

    const dictionaries = await databaseOperation(
        "readonly",
        store => store.getAll()
    );

    return dictionaries.sort((a, b) =>
        a.name.localeCompare(b.name, "ru")
    );
}


// ========================================
// ПОЛУЧЕНИЕ ОДНОГО СЛОВАРЯ
// ========================================

async function getDictionary(id) {

    return databaseOperation(
        "readonly",
        store => store.get(id)
    );
}


// ========================================
// СОХРАНЕНИЕ СЛОВАРЯ
// ========================================

async function saveDictionary(dictionary) {

    dictionary.updatedAt = new Date().toISOString();

    return databaseOperation(
        "readwrite",
        store => store.put(dictionary)
    );
}


// ========================================
// УДАЛЕНИЕ СЛОВАРЯ
// ========================================

async function deleteDictionary(id) {

    return databaseOperation(
        "readwrite",
        store => store.delete(id)
    );
}
