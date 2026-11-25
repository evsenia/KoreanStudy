
// ========================================
// НАСТРОЙКИ ОЗВУЧКИ
// ========================================

const SPEECH_SETTINGS_KEY = "koreanStudySpeech";

let koreanVoices = [];
let activeUtterance = null;

let speechSettings = {
    voiceURI: "",
    rate: 0.9,
    autoSpeak: true
};


// ========================================
// ПРОВЕРКА ПОДДЕРЖКИ ОЗВУЧКИ
// ========================================

function speechSupported() {

    return (
        "speechSynthesis" in window &&
        "SpeechSynthesisUtterance" in window
    );
}


// ========================================
// ЗАГРУЗКА НАСТРОЕК
// ========================================

function loadSpeechSettings() {

    try {

        const saved = JSON.parse(
            localStorage.getItem(SPEECH_SETTINGS_KEY)
        );

        if (saved) {

            speechSettings = {
                ...speechSettings,
                ...saved
            };
        }

    } catch (error) {

        console.warn(error);
    }
}


// ========================================
// СОХРАНЕНИЕ НАСТРОЕК
// ========================================

function saveSpeechSettings() {

    try {

        localStorage.setItem(
            SPEECH_SETTINGS_KEY,
            JSON.stringify(speechSettings)
        );

    } catch (error) {

        console.warn(error);
    }
}


// ========================================
// ПОЛУЧЕНИЕ КОРЕЙСКИХ ГОЛОСОВ
// ========================================

function loadKoreanVoices() {

    if (!speechSupported()) {
        return;
    }

    koreanVoices = speechSynthesis
        .getVoices()
        .filter(voice =>
            /^ko(?:[-_]|$)/i.test(voice.lang)
        );

    renderVoiceOptions();
}


// ========================================
// ВЫБОР ГОЛОСА
// ========================================

function getKoreanVoice() {

    const selected = koreanVoices.find(
        voice =>
            voice.voiceURI === speechSettings.voiceURI
    );

    if (selected) {
        return selected;
    }

    // При автоматическом выборе
    // предпочтение отдаём качественным голосам.

    return koreanVoices.find(voice =>
        /premium|enhanced|natural/i.test(voice.name)
    ) || koreanVoices.find(
        voice => voice.localService
    ) || koreanVoices[0] || null;
}


// ========================================
// СООБЩЕНИЯ ОБ ОЗВУЧКЕ
// ========================================

function speechMessage(message) {

    const settingsMessage =
        document.getElementById("speech-message");

    const quizMessage =
        document.getElementById("quiz-speech-message");

    if (settingsMessage) {
        settingsMessage.textContent = message;
    }

    if (quizMessage) {
        quizMessage.textContent = message;
    }
}


// ========================================
// ОСТАНОВКА ОЗВУЧКИ
// ========================================

function stopSpeech() {

    if (speechSupported()) {

        speechSynthesis.cancel();

        activeUtterance = null;
    }
}


// ========================================
// ПРОИЗНОШЕНИЕ КОРЕЙСКОГО СЛОВА
// ========================================

function speakKorean(text) {

    if (!speechSupported()) {

        speechMessage(
            "Браузер не поддерживает озвучку."
        );

        return false;
    }

    if (!text || !text.trim()) {
        return false;
    }

    stopSpeech();

    const voice = getKoreanVoice();

    const utterance =
        new SpeechSynthesisUtterance(text);

    utterance.lang = "ko-KR";

    utterance.rate = Math.min(
        1.5,
        Math.max(0.5, Number(speechSettings.rate) || 0.9)
    );

    utterance.pitch = 1;
    utterance.volume = 1;

    if (voice) {

        utterance.voice = voice;
        utterance.lang = voice.lang;
    }

    activeUtterance = utterance;

    speechMessage("");

    utterance.onstart = function () {

        if (activeUtterance === utterance) {

            speechMessage("Воспроизведение...");
        }
    };

    utterance.onend = function () {

        if (activeUtterance === utterance) {

            activeUtterance = null;
            speechMessage("");
        }
    };

    utterance.onerror = function (event) {

        if (activeUtterance !== utterance) {
            return;
        }

        activeUtterance = null;

        if (
            event.error === "canceled" ||
            event.error === "interrupted"
        ) {
            return;
        }

        speechMessage(
            "Не удалось воспроизвести слово. " +
            "Проверьте настройки голоса " +
            "или нажмите кнопку повторно."
        );

        console.warn("Speech error:", event.error);
    };

    try {

        speechSynthesis.speak(utterance);

        return true;

    } catch (error) {

        speechMessage("Ошибка воспроизведения.");

        return false;
    }
}


// ========================================
// СПИСОК ГОЛОСОВ В НАСТРОЙКАХ
// ========================================

function renderVoiceOptions() {

    const select =
        document.getElementById("voice-select");

    if (!select) {
        return;
    }

    select.innerHTML = "";

    const autoOption =
        document.createElement("option");

    autoOption.value = "";
    autoOption.textContent = "Автоматический выбор";

    select.appendChild(autoOption);

    koreanVoices.forEach(voice => {

        const option =
            document.createElement("option");

        option.value = voice.voiceURI;

        option.textContent =
            voice.name +
            (voice.localService ? " (локальный)" : "");

        select.appendChild(option);
    });

    select.value =
        speechSettings.voiceURI;

    if (select.selectedIndex === -1) {
        select.value = "";
    }

    select.disabled = koreanVoices.length === 0;

    speechMessage(
        koreanVoices.length
            ? "Доступно корейских голосов: " +
              koreanVoices.length
            : "Корейские голоса пока не обнаружены."
    );
}


// ========================================
// СОЗДАНИЕ НАСТРОЕК ОЗВУЧКИ
// ========================================

function initSpeechSettings() {

    loadSpeechSettings();

    const voiceSelect =
        document.getElementById("voice-select");

    const speedInput =
        document.getElementById("speech-speed");

    if (!voiceSelect || !speedInput) {
        return;
    }

    const card = voiceSelect.closest(".content-card");

    if (!card) {
        return;
    }

    const extraSettings =
        document.createElement("div");

    extraSettings.innerHTML = `

        <div class="speech-speed-info">

            Скорость:
            <strong id="speech-speed-value"></strong>

        </div>

        <label class="speech-checkbox">

            <input type="checkbox"
                   id="auto-speech">

            Автоматическая озвучка

        </label>

        <button class="secondary-button"
                id="test-voice">

            🔊 Проверить произношение

        </button>

        <p id="speech-message"
           class="hint"
           role="status">
        </p>
    `;

    card.appendChild(extraSettings);

    const autoSpeech =
        document.getElementById("auto-speech");

    const testButton =
        document.getElementById("test-voice");

    const speedValue =
        document.getElementById("speech-speed-value");

    speedInput.value = speechSettings.rate;

    speedValue.textContent =
        Number(speedInput.value).toFixed(1) + "×";

    autoSpeech.checked =
        speechSettings.autoSpeak;

    if (!speechSupported()) {

        testButton.disabled = true;
        autoSpeech.disabled = true;

        speechMessage(
            "Озвучка недоступна в этом браузере."
        );

        return;
    }

    speedInput.disabled = false;

    voiceSelect.onchange = function () {

        speechSettings.voiceURI = this.value;

        saveSpeechSettings();
    };

    speedInput.oninput = function () {

        speechSettings.rate = Number(this.value);

        speedValue.textContent =
            Number(this.value).toFixed(1) + "×";

        saveSpeechSettings();
    };

    autoSpeech.onchange = function () {

        speechSettings.autoSpeak = this.checked;

        saveSpeechSettings();
    };

    testButton.onclick = function () {

        loadKoreanVoices();

        speakKorean(
            "안녕하세요. 하나, 둘, 셋. 예순, 일흔, 여든, 아흔."
        );
    };

    loadKoreanVoices();

    speechSynthesis.addEventListener(
        "voiceschanged",
        loadKoreanVoices
    );
}


// ========================================
// ИНИЦИАЛИЗАЦИЯ
// ========================================

document.addEventListener(
    "DOMContentLoaded",
    initSpeechSettings
);
