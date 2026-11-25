
// ========================================
// СОСТОЯНИЕ ТРЕНИРОВКИ
// ========================================

let trainingSession = null;
let trainingBusy = false;


// ========================================
// ПЕРЕМЕШИВАНИЕ: АЛГОРИТМ ФИШЕРА — ЙЕТСА
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

    const answerField = mode === "ko-ru"
        ? "russian"
        : "korean";

    const questionField = mode === "ko-ru"
        ? "korean"
        : "russian";

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

    // У одного слова может быть несколько
    // допустимых переводов.

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

    const shuffled = shuffleArray(session.allWords);

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

    // Если все варианты соответствуют вопросу,
    // полноценный тест с выбором невозможен.

    if (incorrectAnswers.length === 0) {
        return [];
    }

    const options = [

        {
            text: correctAnswer,
            correct: true
        },

        ...incorrectAnswers

    ];

    return shuffleArray(options);
}


// ========================================
// ОТОБРАЖЕНИЕ ВОПРОСА
// ========================================

function renderQuestion() {

    const session = trainingSession;

    if (!session || session.finished) {
        return;
    }

    if (session.index >= session.words.length) {

        finishTraining();
        return;
    }

    const word = session.words[session.index];

    const options = generateOptions(word);

    // Пропускаем неоднозначные вопросы,
    // для которых нет неправильных вариантов.

    if (options.length === 0) {

        session.words.splice(session.index, 1);

        renderQuestion();
        return;
    }

    session.answered = false;
    session.options = options;

    const total = session.words.length;

    const percent = Math.round(
        session.index / total * 100
    );

    const questionLanguage =
        session.mode === "ko-ru"
            ? "ko"
            : "ru";

    const answerLanguage =
        session.mode === "ko-ru"
            ? "ru"
            : "ko";

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
                ВЫБЕРИТЕ ПРАВИЛЬНЫЙ ПЕРЕВОД
            </span>

            <div class="question-word"
                 lang="${questionLanguage}">

                ${escapeHTML(
                    word[session.questionField]
                )}

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

    try {

        // Сначала сохраняем ответ в базе данных.

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

    // Обновляем результаты тренировки.

    if (selected.correct) {

        session.correct++;

    } else {

        session.incorrect++;

        session.mistakes.push({

            id: word.id,
            korean: word.korean,
            russian: word.russian,

            question: word[session.questionField],

            selectedAnswer: selected.text,

            correctAnswer:
                word[session.answerField]

        });
    }

    // Подсвечиваем варианты.

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

        message =
            "Продолжайте практиковаться.";
    }

    el("quiz").innerHTML = `

        <article class="result-card">

            <span class="eyebrow">
                РЕЗУЛЬТАТЫ
            </span>

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
                    mistake => `

                    <div class="mistake-row">

                        <strong lang="ko">
                            ${escapeHTML(
                                mistake.korean
                            )}
                        </strong>

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

    `;

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

        finishTraining(true);
    }
}


// ========================================
// ИНИЦИАЛИЗАЦИЯ МОДУЛЯ
// ========================================

document.addEventListener(
    "DOMContentLoaded",
    function () {

        // Создаём отдельную страницу тренировки.

        const quiz = document.createElement(
            "section"
        );

        quiz.id = "quiz";
        quiz.className = "page";

        document.querySelector(".main")
            .appendChild(quiz);


        // Подключаем первые два режима.

        const modeButtons =
            document.querySelectorAll(
                "#training .mode-card"
            );

        const modes = ["ko-ru", "ru-ko"];

        modes.forEach((mode, index) => {

            const button = modeButtons[index];

            if (!button) {
                return;
            }

            button.disabled = false;

            button.onclick = function () {

                startTraining(mode);
            };
        });


        // Обновляем подсказку.

        const hint = document.querySelector(
            "#training .hint"
        );

        if (hint) {

            hint.textContent =
                "Доступны два режима выбора перевода. " +
                "Остальные режимы появятся позже.";
        }


        // Контролируем выход из тренировки
        // через нижнее меню или настройки.

        document.addEventListener(
            "click",
            function (event) {

                if (currentPage !== "quiz") {
                    return;
                }

                const button = event.target.closest(
                    "[data-page]"
                );

                if (!button) {
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

                trainingSession = null;

            },
            true
        );

        console.log(
            "Модуль тренировок подключён"
        );

    }
);
