// --- 1. SUPABASE CONNECTION ---
const supabaseUrl = 'https://pjjfnnzvwrhzvycjgkmz.supabase.co';
const supabaseAnonKey = 'sb_publishable_J53ea-bCU35D1VSTK0l49A_b_BYW98W'; 
const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseAnonKey);

// --- 2. STATE VARIABLES ---
let currentQuizId = null;
let currentQuestions = [];
let currentQuestionIndex = 0;
let score = 0;
let correctlyTypedAnswers = [];
let timerInterval; // <--- THIS WAS THE MISSING PIECE!

// --- 3. DOM ELEMENTS ---
const elements = {
    homeScreen: document.getElementById('home-screen'),
    quizScreen: document.getElementById('quiz-screen'),
    resultsScreen: document.getElementById('results-screen'),
    quizzesContainer: document.getElementById('quizzes-container'),
    quizTitle: document.getElementById('quiz-title'),
    questionText: document.getElementById('question-text'),
    optionsContainer: document.getElementById('options-container'),
    feedbackText: document.getElementById('feedback-text'),
    nextBtn: document.getElementById('next-btn'),
    scoreDisplay: document.getElementById('score-display')
};

// --- 4. INITIALIZATION ---
async function init() {
    await fetchQuizzes();
}

// --- 5. FETCH DATA ---
async function fetchQuizzes() {
    elements.quizzesContainer.innerHTML = '<li>Loading quizzes...</li>';
    const { data, error } = await supabaseClient.from('quizzes').select('*').order('id', { ascending: true });
    if (error) return;
    elements.quizzesContainer.innerHTML = '';
    data.forEach(quiz => {
        const li = document.createElement('li');
        const btn = document.createElement('button');
        btn.textContent = quiz.title;
        btn.onclick = () => startQuiz(quiz.id, quiz.title);
        li.appendChild(btn);
        elements.quizzesContainer.appendChild(li);
    });
}

async function startQuiz(quizId, title) {
    currentQuizId = quizId;
    currentQuestionIndex = 0;
    score = 0;
    elements.quizTitle.textContent = title;
    elements.homeScreen.classList.remove('active');
    elements.quizScreen.classList.add('active');
    const { data, error } = await supabaseClient.from('questions').select('*').eq('quiz_id', quizId);
    if (error) return;
    currentQuestions = data;
    renderCurrentQuestion();
}

// --- 6. RENDER LOGIC ---
function renderCurrentQuestion() {
    clearInterval(timerInterval); // Stop any old timers
    const question = currentQuestions[currentQuestionIndex];
    elements.questionText.textContent = question.question_text;
    elements.optionsContainer.innerHTML = '';
    elements.feedbackText.textContent = '';
    elements.nextBtn.style.display = 'none';

    const optionsArray = typeof question.options === 'string' ? JSON.parse(question.options) : question.options;

    if (optionsArray[0] === "TYPE_HINT") {
        renderJetPunkGame(question, optionsArray.slice(1));
    } else if (optionsArray[0] === "TYPE") {
        renderTypingGame(question);
    } else {
        optionsArray.forEach(option => {
            const btn = document.createElement('button');
            btn.textContent = option;
            btn.onclick = () => handleGuess(question.id, option, btn);
            elements.optionsContainer.appendChild(btn);
        });
    }
}

// --- 7. JETPUNK MODE (HINTS + TIMER) ---
function renderJetPunkGame(question, hintData) {
    correctlyTypedAnswers = [];
    const validAnswers = question.correct_answer.split(',').map(a => a.trim());
    
    // Timer UI
    const timerBox = document.createElement('div');
    timerBox.innerHTML = `<div style="font-size: 2rem; font-weight: 900; color: #ef4444; margin-bottom: 10px;">⏱️ <span id="timer-sec">60</span>s</div>`;
    elements.optionsContainer.appendChild(timerBox);

    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'Type an answer...';
    input.className = 'typing-input'; // Ensure this class exists in your CSS
    input.style.width = '100%';
    input.style.padding = '15px';
    input.style.marginBottom = '20px';
    elements.optionsContainer.appendChild(input);

    const grid = document.createElement('div');
    grid.style.display = 'grid';
    grid.style.gridTemplateColumns = '1fr 1fr';
    grid.style.gap = '10px';
    
    hintData.forEach((h, i) => {
        const item = document.createElement('div');
        item.id = `hint-${i}`;
        item.style.border = '2px solid var(--primary)';
        item.style.borderRadius = '8px';
        item.style.padding = '10px';
        item.innerHTML = `<div style="font-size: 0.8rem; color: var(--text-light)">${h.hint}</div><div class="answer-cell" style="font-weight: bold; color: #ccc;">???</div>`;
        grid.appendChild(item);
    });
    elements.optionsContainer.appendChild(grid);

    elements.nextBtn.style.display = 'block';
    elements.nextBtn.textContent = "Finish / Next";

    let timeLeft = 60;
    timerInterval = setInterval(() => {
        timeLeft--;
        document.getElementById('timer-sec').textContent = timeLeft;
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            input.disabled = true;
            elements.feedbackText.textContent = "Time's up!";
        }
    }, 1000);

    input.addEventListener('input', () => {
        const guess = input.value.trim().toLowerCase();
        const matchIdx = validAnswers.findIndex(a => a.toLowerCase() === guess);
        
        if (matchIdx !== -1 && !correctlyTypedAnswers.includes(validAnswers[matchIdx])) {
            const actualName = validAnswers[matchIdx];
            correctlyTypedAnswers.push(actualName);
            score++;
            
            const cell = grid.children[matchIdx].querySelector('.answer-cell');
            cell.textContent = actualName;
            cell.style.color = '#22c55e';
            
            input.value = '';
            elements.feedbackText.textContent = `Correct! (${correctlyTypedAnswers.length}/${validAnswers.length})`;
            
            if (correctlyTypedAnswers.length === validAnswers.length) {
                clearInterval(timerInterval);
                input.disabled = true;
                elements.feedbackText.textContent = "You got them all!";
            }
        }
    });
    setTimeout(() => input.focus(), 100);
}

// --- 8. NAVIGATION ---
function nextQuestion() {
    clearInterval(timerInterval);
    currentQuestionIndex++;
    if (currentQuestionIndex < currentQuestions.length) renderCurrentQuestion();
    else showResults();
}

function showResults() {
    elements.quizScreen.classList.remove('active');
    elements.resultsScreen.classList.add('active');
    elements.scoreDisplay.textContent = `You scored: ${score}!`;
}

function returnHome() {
    elements.resultsScreen.classList.remove('active');
    elements.homeScreen.classList.add('active');
    fetchQuizzes();
}

window.nextQuestion = nextQuestion;
window.returnHome = returnHome;
init();
