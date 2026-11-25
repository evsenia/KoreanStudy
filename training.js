
// ========================================
// СОСТОЯНИЕ ТРЕНИРОВКИ
// ========================================

let trainingSession = null;
let trainingBusy = false;


// ========================================
// ПЕРЕМЕШИВАНИЕ МАССИВА
// ========================================

function shuffleArray(array) {

    const result = [...array];

    for (let i = result.length - 1; i > 0; i--) {

        const j = Math.floor(
            Math.random() * (i + 1)
        );

        [result[i], result[j]] =
            [result[j], result[i]];
    }

    return result;
}


// ========================================
// НОРМАЛИЗАЦИЯ ОТВЕТА
// ========================================

function normalizeAnswer(value) {

    return value
        .normalize("NFC")
        .trim()
        .replace(/\s+/g, " ")
        .toLowerCase();
}


// ========================================
// НАЗВАНИЯ РЕЖИМОВ
// ========================================

function trainingModeName(mode) {

    const names = {
        "ko-ru": "Корейский → русский",
        "ru-ko": "Русский → корейский",
        "listening": "Аудирование"
    };

    return names[mode] || "";
}


// ========================================
// НАЧАЛО ТРЕНИРОВКИ
// ========================================

function startTraining(mode, retryWords = null) {

    if (trainingBusy) {
        return;
    }

    const dictionaryId =
        el("dictionary-select").value;

    const dictionary = dictionaries.find(
        d => d.id === dictionaryId
    );

    if (!dictionary) {

        alert("Сначала выберите словарь.");
        return;
    }

    if (mode === "listening" && !speechSupported()) {

        alert("Этот браузер не поддерживает озвучку.");
        return;
    }

    const answerField = mode === "ru-ko"
        ? "korean"
        : "russian";

    const questionField = mode === "ru-ko"
        ? "russian"
        : "korean";

    const uniqueAnswers = new Set(
        dictionary.words.map(word =>
            normalizeAnswer(word[answerField])
        )
    );

    if (uniqueAnswers.size < 2) {

        alert(
            "Для тренировки необходимо минимум " +
            "два разных варианта ответа."
        );

        return;
    }

    const sourceWords = retryWords
        ? dictionary.words.filter(word =>
            retryWords.includes(word.id)
        )
        : dictionary.words;

    if (sourceWords.length === 0) {

        alert("Нет слов для тренировки.");
        return;
    }

    stopSpeech();

    trainingSession = {

        dictionaryId: dictionary.id,
        dictionaryName: dictionary.name,

        mode: mode,

        answerField: answerField,
        questionField: questionField,

        allWords: dictionary.words.map(
            word => ({ ...word })
        ),

        words: shuffleArray(
            sourceWords.map(word => ({ ...word }))
        ),

        index: 0,

        correct: 0,
        incorrect: 0,

        mistakes: [],

        answered: false,
        finished: false
    };

    // Исключаем вопросы, для которых
    // невозможно подобрать неправильные ответы.

    trainingSession.words =
        trainingSession.words.filter(
            word => generateOptions(word).length > 0
        );

    if (trainingSession.words.length === 0) {

        trainingSession = null;

        alert(
            "В словаре нет подходящих вопросов " +
            "для выбранного режима."
        );

        return;
    }

    try {

        localStorage.setItem(
            "lastDictionary",
            dictionary.id
        );

    } catch (error) {

        console.warn(error);
    }

    showPage("quiz");

    renderQuestion();
}


// ========================================
// ФОРМИРОВАНИЕ ВАРИАНТОВ ОТВЕТА
// ========================================

function generateOptions(word) {

    const session = trainingSession;

    const answerField = session.answerField;
    const questionField = session.questionField;

    const correctAnswer = word[answerField];

    const validAnswers = new Set(

        session.allWords

            .filter(item =>
                normalizeAnswer(item[questionField]) ===
                normalizeAnswer(word[questionField])
            )

            .map(item =>
                normalizeAnswer(item[answerField])
            )
    );

    const incorrectAnswers = [];
    const usedAnswers = new Set(validAnswers);

    const shuffled = shuffleArray(
        session.allWords
    );

    for (const item of shuffled) {

        const value = item[answerField];

        const normalized = normalizeAnswer(value);

        if (usedAnswers.has(normalized)) {
            continue;
        }

        usedAnswers.add(normalized);

        incorrectAnswers.push({

            text: value,
            correct: false
        });

        if (incorrectAnswers.length === 3) {
            break;
        }
    }

    if (incorrectAnswers.length === 0) {
        return [];
    }

    return shuffleArray([

        {
            text: correctAnswer,
            correct: true
        },

        ...incorrectAnswers
    ]);
}


// ========================================
// ОЗВУЧКА ТЕКУЩЕГО СЛОВА
// ========================================

function speakCurrentWord() {

    const session = trainingSession;

    if (!session || session.finished) {
        return;
    }

    const word = session.words[session.index];

    if (word) {
        speakKorean(word.korean);
    }
}


// ========================================
// ОТОБРАЖЕНИЕ ВОПРОСА
// ========================================

function renderQuestion() {

    const session = trainingSession;

    if (!session || session.finished) {
        return;
    }

    stopSpeech();

    if (session.index >= session.words.length) {

        finishTraining();
        return;
    }

    const word = session.words[session.index];

    const options = generateOptions(word);

    session.answered = false;
    session.options = options;

    const total = session.words.length;

    const percent = Math.round(
        session.index / total * 100
    );

    const listening =
        session.mode === "listening";

    const reverse =
        session.mode === "ru-ko";

    const questionLanguage =
        reverse ? "ru" : "ko";

    const answerLanguage =
        reverse ? "ko" : "ru";

    el("quiz").innerHTML = `

        <div class="quiz-top">

            <button class="text-button"
                    id="quit-training">
                ← Завершить
            </button>

            <span class="quiz-counter">
                ${session.index + 1} из ${total}
            </span>

        </div>

        <p class="quiz-dictionary">
            ${escapeHTML(session.dictionaryName)}
        </p>

        <p class="training-mode-name">
            ${trainingModeName(session.mode)}
        </p>

        <div class="progress-track"
             role="progressbar"
             aria-label="Ход тренировки"
             aria-valuenow="${percent}"
             aria-valuemin="0"
             aria-valuemax="100">

            <div class="progress-fill"
                 style="width:${percent}%">
            </div>

        </div>

        <div class="quiz-score">

            <span class="quiz-correct">
                ✓ ${session.correct}
            </span>

            <span class="quiz-incorrect">
                × ${session.incorrect}
            </span>

        </div>

        <article class="question-card">

            <span class="eyebrow">

                ${listening
                    ? "ПРОСЛУШАЙТЕ СЛОВО"
                    : "ВЫБЕРИТЕ ПРАВИЛЬНЫЙ ПЕРЕВОД"}

            </span>

            <div class="question-word"
                 id="question-word"
                 lang="${questionLanguage}"
                 ${listening ? "hidden" : ""}>

                ${escapeHTML(
                    word[session.questionField]
                )}

            </div>

            <div class="speech-controls"
                 id="quiz-speech-controls"
                 ${reverse ? "hidden" : ""}>

                <button class="speech-button"
                        id="speak-question"
                        type="button"
                        aria-label="Прослушать корейское слово">

                    <svg viewBox="0 0 24 24"
                         width="28"
                         height="28"
                         fill="none"
                         stroke="currentColor"
                         stroke-width="1.8"
                         stroke-linecap="round"
                         stroke-linejoin="round"
                         aria-hidden="true">

                        <path d="M11 5 6 9H3v6h3l5 4V5Z"/>
                        <path d="M15 9a4 4 0 0 1 0 6"/>
                        <path d="M18 6a8 8 0 0 1 0 12"/>

                    </svg>

                </button>

                <span class="speech-caption">
                    Прослушать
                </span>

                <p id="quiz-speech-message"
                   role="status">
                </p>

            </div>

        </article>

        <div class="answer-list">

            ${options.map((option, index) => `

                <button class="answer-button"
                        data-answer="${index}"
                        lang="${answerLanguage}">

                    <span>
                        ${escapeHTML(option.text)}
                    </span>

                    <span class="answer-mark"></span>

                </button>

            `).join("")}

        </div>

        <div id="answer-feedback"
             class="answer-feedback"
             role="status">
        </div>

        <button class="primary-button"
                id="next-question"
                disabled>

            ${session.index === total - 1
                ? "Посмотреть результаты"
                : "Далее"}

        </button>
    `;

    document.querySelectorAll(
        "#quiz [data-answer]"
    ).forEach(button => {

        button.onclick = function () {

            checkAnswer(
                Number(this.dataset.answer)
            );
        };
    });

    el("next-question").onclick =
        nextQuestion;

    el("quit-training").onclick =
        quitTraining;

    el("speak-question").onclick =
        speakCurrentWord;

    el("speak-question").disabled =
        !speechSupported();

    // Автоматическая озвучка.
    // В аудировании слово произносится
    // независимо от настройки autoSpeak.

    if (
        listening ||
        (
            session.mode === "ko-ru" &&
            speechSettings.autoSpeak
        )
    ) {

        speakCurrentWord();
    }
}


// ========================================
// ПРОВЕРКА ОТВЕТА
// ========================================

async function checkAnswer(selectedIndex) {

    const session = trainingSession;

    if (
        !session ||
        session.answered ||
        session.finished ||
        trainingBusy
    ) {
        return;
    }

    const selected = session.options[selectedIndex];

    if (!selected) {
        return;
    }

    session.answered = true;
    trainingBusy = true;

    const word = session.words[session.index];

    const buttons = document.querySelectorAll(
        "#quiz [data-answer]"
    );

    buttons.forEach(button => {
        button.disabled = true;
    });

    // Озвучиваем правильное корейское слово
    // в обратном режиме непосредственно
    // после действия пользователя.

    if (
        session.mode === "ru-ko" &&
        speechSettings.autoSpeak
    ) {

        speakCurrentWord();
    }

    try {

        const dictionary = await getDictionary(
            session.dictionaryId
        );

        if (!dictionary) {

            throw new Error(
                "Словарь больше не существует."
            );
        }

        const savedWord = dictionary.words.find(
            item => item.id === word.id
        );

        if (!savedWord) {

            throw new Error(
                "Слово больше не существует."
            );
        }

        if (selected.correct) {

            savedWord.correct =
                (savedWord.correct || 0) + 1;

            savedWord.streak =
                (savedWord.streak || 0) + 1;

        } else {

            savedWord.incorrect =
                (savedWord.incorrect || 0) + 1;

            savedWord.streak = 0;
        }

        await saveDictionary(dictionary);

    } catch (error) {

        session.answered = false;
        trainingBusy = false;

        buttons.forEach(button => {
            button.disabled = false;
        });

        alert(
            "Не удалось сохранить ответ: " +
            error.message
        );

        return;
    }

    // Обновляем счётчики.

    if (selected.correct) {

        session.correct++;

    } else {

        session.incorrect++;

        session.mistakes.push({

            id: word.id,
            korean: word.korean,
            russian: word.russian,

            question:
                word[session.questionField],

            selectedAnswer: selected.text,

            correctAnswer:
                word[session.answerField]
        });
    }

    // Подсвечиваем ответы.

    buttons.forEach((button, index) => {

        const option = session.options[index];

        const mark = button.querySelector(
            ".answer-mark"
        );

        if (option.correct) {

            button.classList.add("correct");
            mark.textContent = "✓";

        } else if (index === selectedIndex) {

            button.classList.add("incorrect");
            mark.textContent = "×";
        }
    });

    const feedback = el("answer-feedback");

    if (selected.correct) {

        feedback.className =
            "answer-feedback success";

        feedback.textContent =
            "정답! Правильно!";

    } else {

        feedback.className =
            "answer-feedback error";

        feedback.textContent =
            "Правильный ответ: " +
            word[session.answerField];
    }

    // После ответа в аудировании
    // показываем написание корейского слова.

    if (session.mode === "listening") {

        el("question-word").hidden = false;

        feedback.textContent +=
            " · " + word.korean +
            " — " + word.russian;
    }

    // В обратном режиме после ответа
    // становится доступна кнопка озвучки.

    if (session.mode === "ru-ko") {

        el("quiz-speech-controls").hidden = false;
    }

    document.querySelector(
        "#quiz .quiz-correct"
    ).textContent = "✓ " + session.correct;

    document.querySelector(
        "#quiz .quiz-incorrect"
    ).textContent = "× " + session.incorrect;

    try {

        await refreshDictionaries();

    } catch (error) {

        console.error(
            "Ошибка обновления интерфейса:",
            error
        );
    }

    trainingBusy = false;

    el("next-question").disabled = false;
}


// ========================================
// СЛЕДУЮЩИЙ ВОПРОС
// ========================================

function nextQuestion() {

    const session = trainingSession;

    if (
        !session ||
        !session.answered ||
        trainingBusy
    ) {
        return;
    }

    stopSpeech();

    session.index++;

    if (session.index >= session.words.length) {

        finishTraining();

    } else {

        renderQuestion();
    }

    window.scrollTo(0, 0);
}


// ========================================
// ЗАВЕРШЕНИЕ ТРЕНИРОВКИ
// ========================================

function finishTraining(early = false) {

    const session = trainingSession;

    if (!session || session.finished) {
        return;
    }

    stopSpeech();

    session.finished = true;

    const total =
        session.correct + session.incorrect;

    const accuracy = total > 0

        ? Math.round(
            session.correct / total * 100
        )

        : 0;

    let message;

    if (total === 0) {

        message = "Нет отвеченных вопросов.";

    } else if (accuracy === 100) {

        message = "완벽해요! Превосходно!";

    } else if (accuracy >= 80) {

        message = "잘했어요! Отличная работа!";

    } else if (accuracy >= 50) {

        message = "Хороший результат!";

    } else {

        message = "Продолжайте практиковаться.";
    }

    el("quiz").innerHTML = `

        <article class="result-card">

            <span class="eyebrow">
                РЕЗУЛЬТАТЫ
            </span>

            <p>
                ${trainingModeName(session.mode)}
            </p>

            <div class="result-symbol">
                ${total === 0 ? "—" :
                    accuracy === 100 ? "★" : "✓"}
            </div>

            <h1>

                ${early
                    ? "Тренировка остановлена"
                    : "Тренировка завершена"}

            </h1>

            <p>${escapeHTML(message)}</p>

            <div class="result-percent">
                ${total > 0 ? accuracy + "%" : "—"}
            </div>

            <p>Правильных ответов</p>

            <div class="result-details">

                <div>

                    <strong class="quiz-correct">
                        ${session.correct}
                    </strong>

                    <span>Правильно</span>

                </div>

                <div>

                    <strong class="quiz-incorrect">
                        ${session.incorrect}
                    </strong>

                    <span>Ошибки</span>

                </div>

                <div>

                    <strong>
                        ${total}
                    </strong>

                    <span>Ответов</span>

                </div>

            </div>

        </article>

        ${session.mistakes.length > 0 ? `

            <article class="content-card">

                <h2>Работа над ошибками</h2>

                ${session.mistakes.map(
                    (mistake, index) => `

                    <div class="mistake-row">

                        <div class="mistake-heading">

                            <strong lang="ko">

                                ${escapeHTML(
                                    mistake.korean
                                )}

                            </strong>

                            <button
                                class="mistake-speech-button"
                                data-speak-mistake="${index}"
                                aria-label="Прослушать слово">

                                🔊

                            </button>

                        </div>

                        <p>

                            ${escapeHTML(
                                mistake.russian
                            )}

                        </p>

                        <p class="mistake-answer">

                            Ваш ответ:

                            ${escapeHTML(
                                mistake.selectedAnswer
                            )}

                        </p>

                        <p class="correct-answer">

                            Правильный ответ:

                            ${escapeHTML(
                                mistake.correctAnswer
                            )}

                        </p>

                    </div>

                `).join("")}

            </article>

            <button class="primary-button"
                    id="retry-mistakes">

                Повторить ошибки

            </button>

        ` : ""}

        <button class="secondary-button"
                id="repeat-training">

            Повторить тренировку

        </button>

        <button class="secondary-button"
                id="return-training">

            К выбору тренировок

        </button>

        <p id="quiz-speech-message"
           role="status">
        </p>
    `;

    // Озвучка слов, в которых были ошибки.

    document.querySelectorAll(
        "[data-speak-mistake]"
    ).forEach(button => {

        button.disabled = !speechSupported();

        button.onclick = function () {

            const index = Number(
                this.dataset.speakMistake
            );

            const mistake =
                session.mistakes[index];

            if (mistake) {

                speakKorean(mistake.korean);
            }
        };
    });

    const retryButton = el("retry-mistakes");

    if (retryButton) {

        retryButton.onclick = function () {

            restartTraining(true);
        };
    }

    el("repeat-training").onclick = function () {

        restartTraining(false);
    };

    el("return-training").onclick = function () {

        stopSpeech();

        const id = session.dictionaryId;

        trainingSession = null;

        selectTrainingDictionary(id);
    };

    window.scrollTo(0, 0);
}


// ========================================
// ПОВТОРНАЯ ТРЕНИРОВКА
// ========================================

function restartTraining(onlyMistakes) {

    const session = trainingSession;

    if (!session) {
        return;
    }

    stopSpeech();

    const mode = session.mode;

    const ids = onlyMistakes

        ? session.mistakes.map(
            mistake => mistake.id
        )

        : null;

    el("dictionary-select").value =
        session.dictionaryId;

    startTraining(mode, ids);
}


// ========================================
// ДОСРОЧНОЕ ЗАВЕРШЕНИЕ
// ========================================

function quitTraining() {

    if (trainingBusy) {
        return;
    }

    if (
        confirm(
            "Завершить текущую тренировку?\n" +
            "Полученные результаты сохранятся."
        )
    ) {

        stopSpeech();

        finishTraining(true);
    }
}


// ========================================
// ИНИЦИАЛИЗАЦИЯ МОДУЛЯ
// ========================================

document.addEventListener(
    "DOMContentLoaded",

    function () {

        const quiz = document.createElement(
            "section"
        );

        quiz.id = "quiz";
        quiz.className = "page";

        document.querySelector(".main")
            .appendChild(quiz);

        // Подключаем три режима обучения.

        const modeButtons =
            document.querySelectorAll(
                "#training .mode-card"
            );

        const modes = [

            "ko-ru",
            "ru-ko",
            "listening"
        ];

        modes.forEach((mode, index) => {

            const button = modeButtons[index];

            if (!button) {
                return;
            }

            button.disabled =

                mode === "listening" &&
                !speechSupported();

            button.onclick = function () {

                startTraining(mode);
            };
        });

        const hint = document.querySelector(
            "#training .hint"
        );

        if (hint) {

            hint.textContent =

                "Доступны перевод в обоих " +
                "направлениях и аудирование.";
        }

        // Останавливаем звук при переходах
        // и контролируем выход из тренировки.

        document.addEventListener(

            "click",

            function (event) {

                const button = event.target.closest(
                    "[data-page]"
                );

                if (!button) {
                    return;
                }

                if (currentPage !== "quiz") {

                    stopSpeech();
                    return;
                }

                if (trainingBusy) {

                    event.preventDefault();
                    event.stopImmediatePropagation();

                    return;
                }

                if (
                    trainingSession &&
                    !trainingSession.finished
                ) {

                    const approved = confirm(

                        "Прервать тренировку?\n" +

                        "Уже полученные результаты " +
                        "будут сохранены."
                    );

                    if (!approved) {

                        event.preventDefault();

                        event.stopImmediatePropagation();

                        return;
                    }
                }

                stopSpeech();

                trainingSession = null;

            },

            true
        );

        window.addEventListener(
            "pagehide",
            stopSpeech
        );

        console.log(
            "Модуль тренировок v0.4 подключён"
        );
    }
);
