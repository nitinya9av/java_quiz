const state = {
  dataset: null,
  quizQuestions: [],
  currentIndex: 0,
  score: 0,
  answers: new Map(),
  quizSubmitted: false,
};

const THEME_KEY = "java-quiz-theme";

const els = {
  themeToggle: document.getElementById("themeToggle"),
  allWeeksCheckbox: document.getElementById("allWeeksCheckbox"),
  weekChecklist: document.getElementById("weekChecklist"),
  countSelect: document.getElementById("countSelect"),
  shuffleToggle: document.getElementById("shuffleToggle"),
  shuffleOptionsToggle: document.getElementById("shuffleOptionsToggle"),
  startBtn: document.getElementById("startBtn"),
  datasetMeta: document.getElementById("datasetMeta"),

  quizSection: document.getElementById("quizSection"),
  summarySection: document.getElementById("summarySection"),

  progressLabel: document.getElementById("progressLabel"),
  scoreLabel: document.getElementById("scoreLabel"),
  progressBar: document.getElementById("progressBar"),
  hintBtn: document.getElementById("hintBtn"),
  questionBody: document.getElementById("questionBody"),
  imageStrip: document.getElementById("imageStrip"),
  optionsList: document.getElementById("optionsList"),

  prevBtn: document.getElementById("prevBtn"),
  nextBtn: document.getElementById("nextBtn"),
  submitBtn: document.getElementById("submitBtn"),

  summaryText: document.getElementById("summaryText"),
  reviewList: document.getElementById("reviewList"),
  restartBtn: document.getElementById("restartBtn"),

  hintModal: document.getElementById("hintModal"),
  hintCloseBtn: document.getElementById("hintCloseBtn"),
  hintMeta: document.getElementById("hintMeta"),
  hintContent: document.getElementById("hintContent"),
};

init().catch((error) => {
  els.datasetMeta.textContent = `Failed to load quiz data: ${error.message}`;
  els.startBtn.disabled = true;
});

async function init() {
  initTheme();
  wireEvents();

  const response = await fetch("./data/quiz-data.json", { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  state.dataset = await response.json();
  populateWeekChecklist();
  syncCountLimit();
}

function wireEvents() {
  els.themeToggle.addEventListener("click", toggleTheme);
  els.startBtn.addEventListener("click", startQuiz);
  els.prevBtn.addEventListener("click", goToPreviousQuestion);
  els.nextBtn.addEventListener("click", goToNextQuestion);
  els.submitBtn.addEventListener("click", submitQuiz);
  els.restartBtn.addEventListener("click", resetToSetup);
  els.allWeeksCheckbox.addEventListener("change", handleAllWeeksToggle);
  els.weekChecklist.addEventListener("change", handleWeekChecklistChange);
  els.countSelect.addEventListener("change", syncCountLimit);
  els.hintBtn.addEventListener("click", openHintModal);
  els.hintCloseBtn.addEventListener("click", closeHintModal);

  els.hintModal.addEventListener("click", (event) => {
    if (event.target === els.hintModal) {
      closeHintModal();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (isHintModalOpen()) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeHintModal();
      }
      return;
    }

    if (els.quizSection.classList.contains("hidden")) {
      return;
    }

    const question = state.quizQuestions[state.currentIndex];
    if (!question) {
      return;
    }

    if (["1", "2", "3", "4"].includes(event.key)) {
      const option = question.options[Number(event.key) - 1];
      if (option) {
        event.preventDefault();
        selectOption(option.id);
      }
      return;
    }

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      goToPreviousQuestion();
      return;
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();
      goToNextQuestion();
      return;
    }

    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      submitQuiz();
      return;
    }

    if (!event.ctrlKey && !event.metaKey && event.key === "Enter") {
      event.preventDefault();
      if (state.currentIndex >= state.quizQuestions.length - 1) {
        submitQuiz();
      } else {
        goToNextQuestion();
      }
    }
  });
}

function initTheme() {
  const storedTheme = getStoredTheme();
  const initialTheme = storedTheme || getSystemTheme();
  applyTheme(initialTheme);

  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
  mediaQuery.addEventListener("change", (event) => {
    if (getStoredTheme()) {
      return;
    }
    applyTheme(event.matches ? "dark" : "light");
  });
}

function toggleTheme() {
  const currentTheme = document.body.dataset.theme === "dark" ? "dark" : "light";
  const nextTheme = currentTheme === "dark" ? "light" : "dark";
  localStorage.setItem(THEME_KEY, nextTheme);
  applyTheme(nextTheme);
}

function applyTheme(theme) {
  const resolved = theme === "dark" ? "dark" : "light";
  const isDark = resolved === "dark";

  document.body.dataset.theme = resolved;
  els.themeToggle.textContent = isDark ? "Light Mode" : "Dark Mode";
  els.themeToggle.setAttribute("aria-pressed", String(isDark));
  els.themeToggle.setAttribute("aria-label", isDark ? "Switch to light theme" : "Switch to dark theme");
}

function getStoredTheme() {
  const value = localStorage.getItem(THEME_KEY);
  return value === "dark" || value === "light" ? value : "";
}

function getSystemTheme() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function populateWeekChecklist() {
  els.weekChecklist.innerHTML = "";
  els.allWeeksCheckbox.checked = true;

  for (const week of state.dataset.weeks) {
    const label = document.createElement("label");
    label.className = "week-chip";
    label.setAttribute("for", `week-check-${week.week}`);

    const input = document.createElement("input");
    input.id = `week-check-${week.week}`;
    input.type = "checkbox";
    input.className = "week-checkbox";
    input.value = week.week;

    const text = document.createElement("span");
    text.textContent = week.week;

    label.appendChild(input);
    label.appendChild(text);
    els.weekChecklist.appendChild(label);
  }
}

function handleAllWeeksToggle() {
  const weekBoxes = getWeekCheckboxes();

  if (els.allWeeksCheckbox.checked) {
    for (const box of weekBoxes) {
      box.checked = false;
    }
  }

  syncCountLimit();
}

function handleWeekChecklistChange(event) {
  const target = event.target;
  if (!(target instanceof HTMLInputElement) || !target.classList.contains("week-checkbox")) {
    return;
  }

  if (target.checked) {
    els.allWeeksCheckbox.checked = false;
  }

  const selectedWeeks = getSelectedWeekValues();
  if (selectedWeeks.length === 0) {
    els.allWeeksCheckbox.checked = true;
  }

  syncCountLimit();
}

function updateMetaText() {
  const activeWeeks = getActiveWeeks();
  const questionCount = activeWeeks.reduce((total, week) => total + (week.questionCount || week.questions.length || 0), 0);
  const weekCount = activeWeeks.length;

  if (els.allWeeksCheckbox.checked) {
    els.datasetMeta.textContent = `Loaded ${questionCount} questions across ${weekCount} ${weekCount === 1 ? "week" : "weeks"}.`;
    return;
  }

  const selectedLabel = weekCount === 1 ? "selected week" : "selected weeks";
  els.datasetMeta.textContent = `Loaded ${questionCount} questions across ${weekCount} ${selectedLabel}.`;
}

function getFilteredQuestions() {
  return getActiveWeeks().flatMap((week) => week.questions);
}

function getActiveWeeks() {
  if (els.allWeeksCheckbox.checked) {
    return state.dataset.weeks;
  }

  const selectedWeeks = new Set(getSelectedWeekValues());
  return state.dataset.weeks.filter((week) => selectedWeeks.has(week.week));
}

function getWeekCheckboxes() {
  return Array.from(els.weekChecklist.querySelectorAll(".week-checkbox"));
}

function getSelectedWeekValues() {
  return getWeekCheckboxes().filter((box) => box.checked).map((box) => box.value);
}

function syncCountLimit() {
  const available = getFilteredQuestions().length;
  const options = Array.from(els.countSelect.options);

  for (const option of options) {
    option.disabled = Number(option.value) > available;
  }

  const enabledOptions = options.filter((option) => !option.disabled);
  if (enabledOptions.length === 0) {
    updateMetaText();
    return;
  }

  const current = Number.parseInt(els.countSelect.value, 10);
  const maxEnabled = Number(enabledOptions[enabledOptions.length - 1].value);
  if (Number.isNaN(current) || current > maxEnabled || !enabledOptions.some((option) => Number(option.value) === current)) {
    els.countSelect.value = String(maxEnabled);
  }

  updateMetaText();
}

function startQuiz() {
  const pool = getFilteredQuestions();
  if (pool.length === 0) {
    els.datasetMeta.textContent = "No questions available for the selected week.";
    return;
  }

  const countRaw = Number.parseInt(els.countSelect.value, 10);
  const requestedCount = Number.isNaN(countRaw) ? pool.length : countRaw;
  const questionCount = clamp(requestedCount, 1, pool.length);

  const source = [...pool];
  if (els.shuffleToggle.checked) {
    shuffleInPlace(source);
  }

  let quizSet = source.slice(0, questionCount).map(cloneQuestion);
  if (els.shuffleOptionsToggle.checked) {
    quizSet = quizSet.map(shuffleQuestionOptions);
  }

  state.quizQuestions = quizSet;
  state.currentIndex = 0;
  state.score = 0;
  state.answers.clear();
  state.quizSubmitted = false;

  closeHintModal();
  setQuizFocusMode(true);
  els.summarySection.classList.add("hidden");
  els.quizSection.classList.remove("hidden");

  renderCurrentQuestion();
}

function renderCurrentQuestion() {
  const question = state.quizQuestions[state.currentIndex];
  if (!question) {
    renderSummary();
    return;
  }

  const total = state.quizQuestions.length;
  const position = state.currentIndex + 1;
  const progressPct = (position / total) * 100;
  const selectedOptionId = state.answers.get(question.id) || "";

  els.progressLabel.textContent = `Question ${position} of ${total}`;
  els.progressBar.style.width = `${progressPct}%`;
  els.progressBar.parentElement.setAttribute("aria-valuenow", String(Math.round(progressPct)));

  renderBlocks(els.questionBody, question.questionBlocks);
  renderImages(els.imageStrip, question.images);
  renderOptions(question, selectedOptionId);
  updateProgressMeta();
  updateActionButtons();
}

function renderBlocks(container, blocks) {
  container.innerHTML = "";

  if (!blocks || blocks.length === 0) {
    return;
  }

  for (const block of blocks) {
    if (block.type === "code") {
      const pre = document.createElement("pre");
      const code = document.createElement("code");
      code.textContent = block.content;
      pre.appendChild(code);
      container.appendChild(pre);
      continue;
    }

    const p = document.createElement("p");
    p.textContent = block.content;
    container.appendChild(p);
  }
}

function renderImages(container, images) {
  container.innerHTML = "";

  if (!images || images.length === 0) {
    container.classList.add("hidden");
    return;
  }

  container.classList.remove("hidden");
  for (const path of images) {
    const image = document.createElement("img");
    image.src = path;
    image.alt = "Question visual";
    image.loading = "lazy";
    container.appendChild(image);
  }
}

function renderOptions(question, selectedOptionId) {
  els.optionsList.innerHTML = "";

  if (!question.options || question.options.length === 0) {
    const empty = document.createElement("p");
    empty.className = "option-empty";
    empty.textContent = "Options are unavailable for this question.";
    els.optionsList.appendChild(empty);
    return;
  }

  for (const option of question.options) {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "option-card";
    card.dataset.optionId = option.id;

    const key = document.createElement("span");
    key.className = "option-key";
    key.textContent = option.id;

    const content = document.createElement("div");
    content.className = "block-container";
    renderBlocks(content, option.blocks);

    card.appendChild(key);
    card.appendChild(content);
    card.addEventListener("click", () => selectOption(option.id));

    if (option.id === selectedOptionId) {
      card.classList.add("selected");
    }

    els.optionsList.appendChild(card);
  }
}

function selectOption(optionId) {
  const question = state.quizQuestions[state.currentIndex];
  if (!question) {
    return;
  }

  state.answers.set(question.id, optionId);
  for (const card of els.optionsList.querySelectorAll(".option-card")) {
    card.classList.toggle("selected", card.dataset.optionId === optionId);
  }

  updateProgressMeta();
}

function updateProgressMeta() {
  const total = state.quizQuestions.length;
  const answeredCount = state.answers.size;

  els.scoreLabel.textContent = `Answered: ${answeredCount}/${total}`;
  if (answeredCount >= total) {
    els.submitBtn.textContent = "Submit Quiz";
    return;
  }

  els.submitBtn.textContent = `Submit Quiz (${answeredCount}/${total} answered)`;
}

function updateActionButtons() {
  const total = state.quizQuestions.length;
  els.prevBtn.disabled = state.currentIndex <= 0;
  els.nextBtn.disabled = state.currentIndex >= total - 1;
  els.submitBtn.disabled = total === 0;
}

function goToPreviousQuestion() {
  if (state.currentIndex <= 0) {
    return;
  }

  state.currentIndex -= 1;
  renderCurrentQuestion();
}

function goToNextQuestion() {
  if (state.currentIndex >= state.quizQuestions.length - 1) {
    return;
  }

  state.currentIndex += 1;
  renderCurrentQuestion();
}

function submitQuiz() {
  if (state.quizQuestions.length === 0) {
    return;
  }

  closeHintModal();
  state.quizSubmitted = true;
  renderSummary();
}

function buildReviewDetails() {
  return state.quizQuestions.map((question) => {
    const selectedOptionId = state.answers.get(question.id) || "";
    const gradable = Boolean(question.correctOptionId);
    const isCorrect = gradable && selectedOptionId === question.correctOptionId;

    let status = "ungraded";
    if (gradable && !selectedOptionId) {
      status = "unanswered";
    } else if (gradable && isCorrect) {
      status = "correct";
    } else if (gradable) {
      status = "wrong";
    }

    return {
      question,
      selectedOptionId,
      gradable,
      isCorrect,
      status,
    };
  });
}

function renderSummary() {
  setQuizFocusMode(false);
  els.quizSection.classList.add("hidden");
  els.summarySection.classList.remove("hidden");

  const details = buildReviewDetails();
  const total = details.length;
  const answeredCount = details.filter((item) => Boolean(item.selectedOptionId)).length;
  const gradable = details.filter((item) => item.gradable).length;
  state.score = details.filter((item) => item.isCorrect).length;

  const accuracyBase = gradable > 0 ? gradable : total;
  const accuracy = accuracyBase > 0 ? Math.round((state.score / accuracyBase) * 100) : 0;

  els.summaryText.textContent = `You answered ${answeredCount} of ${total} questions. Final score: ${state.score}/${accuracyBase} (${accuracy}% accuracy).`;

  els.reviewList.innerHTML = "";

  if (details.length === 0) {
    const none = document.createElement("p");
    none.textContent = "No quiz attempts to review.";
    els.reviewList.appendChild(none);
    return;
  }

  const statusLabel = {
    correct: "Correct",
    wrong: "Wrong",
    unanswered: "Unanswered",
    ungraded: "Ungraded",
  };

  const title = document.createElement("p");
  title.textContent = "Detailed review:";
  els.reviewList.appendChild(title);

  for (const detail of details) {
    const question = detail.question;
    const item = document.createElement("article");
    item.className = `review-item status-${detail.status}`;

    const heading = document.createElement("p");
    heading.textContent = `${question.id} | ${question.week}`;

    const status = document.createElement("p");
    status.className = `small review-status ${detail.status}`;
    status.textContent = `Status: ${statusLabel[detail.status] || detail.status}`;

    const questionPreview = document.createElement("p");
    questionPreview.className = "small";
    questionPreview.textContent = firstTextBlock(question.questionBlocks) || "Question text unavailable";

    const selected = resolveOptionLabel(question, detail.selectedOptionId);
    const correct = resolveOptionLabel(question, question.correctOptionId);

    const meta = document.createElement("p");
    meta.className = "small";
    meta.textContent = `Selected: ${selected} | Correct: ${correct}`;

    const source = document.createElement("p");
    source.className = "small";
    source.textContent = `Source: ${question.sourcePdf} | Page ${question.sourcePages.start}${question.sourcePages.start !== question.sourcePages.end ? `-${question.sourcePages.end}` : ""}`;

    item.appendChild(heading);
    item.appendChild(status);
    item.appendChild(questionPreview);
    item.appendChild(meta);
    item.appendChild(source);

    if (question.solutionBlocks && question.solutionBlocks.length > 0) {
      const solutionTitle = document.createElement("p");
      solutionTitle.className = "small";
      solutionTitle.textContent = "Detailed solution:";

      const solutionWrap = document.createElement("div");
      solutionWrap.className = "block-container review-solution";
      renderBlocks(solutionWrap, question.solutionBlocks);

      item.appendChild(solutionTitle);
      item.appendChild(solutionWrap);
    }

    els.reviewList.appendChild(item);
  }
}

function resetToSetup() {
  closeHintModal();
  setQuizFocusMode(false);
  els.summarySection.classList.add("hidden");
  els.quizSection.classList.add("hidden");
  state.quizQuestions = [];
  state.currentIndex = 0;
  state.score = 0;
  state.answers.clear();
  state.quizSubmitted = false;
  syncCountLimit();
}

function resolveOptionLabel(question, optionId) {
  if (!optionId) {
    return "Not answered";
  }

  const option = question.options.find((item) => item.id === optionId);
  if (!option) {
    return optionId.toUpperCase();
  }

  const text = firstTextBlock(option.blocks);
  return `${optionId.toUpperCase()}${text ? ` - ${text}` : ""}`;
}

function firstTextBlock(blocks) {
  if (!blocks || blocks.length === 0) {
    return "";
  }

  const block = blocks.find((item) => item.type === "text") || blocks[0];
  const compact = block.content.replace(/\s+/g, " ").trim();
  return compact.length <= 120 ? compact : `${compact.slice(0, 117)}...`;
}

function shuffleInPlace(items) {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
}

function cloneQuestion(question) {
  return {
    ...question,
    questionBlocks: [...(question.questionBlocks || [])],
    options: (question.options || []).map((option) => ({
      ...option,
      blocks: [...(option.blocks || [])],
    })),
    solutionBlocks: [...(question.solutionBlocks || [])],
    images: [...(question.images || [])],
  };
}

function shuffleQuestionOptions(question) {
  const options = [...(question.options || [])];
  if (options.length > 1) {
    shuffleInPlace(options);
  }

  const targetCorrectId = (question.correctOptionId || "").toLowerCase();
  let remappedCorrectOptionId = "";
  const remappedOptions = options.map((option, index) => {
    const newId = optionIdForIndex(index);
    if (targetCorrectId && String(option.id || "").toLowerCase() === targetCorrectId) {
      remappedCorrectOptionId = newId;
    }
    return {
      ...option,
      id: newId,
    };
  });

  return {
    ...question,
    options: remappedOptions,
    correctOptionId: remappedCorrectOptionId || question.correctOptionId,
  };
}

function optionIdForIndex(index) {
  const alphabet = "abcdefghijklmnopqrstuvwxyz";
  return alphabet[index] || `opt${index + 1}`;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function setQuizFocusMode(enabled) {
  document.body.classList.toggle("quiz-focus-mode", enabled);
}

function openHintModal() {
  const question = state.quizQuestions[state.currentIndex];
  if (!question) {
    return;
  }

  els.hintMeta.textContent = `${question.id} | ${question.sourcePdf} | Page ${question.sourcePages.start}${question.sourcePages.start !== question.sourcePages.end ? `-${question.sourcePages.end}` : ""}`;
  els.hintContent.innerHTML = "";

  if (question.solutionBlocks && question.solutionBlocks.length > 0) {
    renderBlocks(els.hintContent, question.solutionBlocks);
  } else {
    const empty = document.createElement("p");
    empty.textContent = "Detailed solution is not available for this question.";
    els.hintContent.appendChild(empty);
  }

  els.hintModal.classList.remove("hidden");
  els.hintModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
  els.hintCloseBtn.focus();
}

function closeHintModal() {
  if (!els.hintModal || els.hintModal.classList.contains("hidden")) {
    return;
  }

  els.hintModal.classList.add("hidden");
  els.hintModal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
  els.hintBtn.focus();
}

function isHintModalOpen() {
  return Boolean(els.hintModal) && !els.hintModal.classList.contains("hidden");
}
