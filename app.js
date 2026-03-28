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

// --- 5. FETCH DATA FROM SUPABASE ---
async function fetchQuizzes() {
    elements.quizzesContainer.innerHTML = '<li>Loading quizzes...</li>';
    
    const { data, error } = await supabaseClient
        .from('quizzes')
        .select('*')
        .order('id', { ascending: true });

    if (error) {
        console.error('Error fetching quizzes:', error);
        elements.quizzesContainer.innerHTML = '<li>Error loading quizzes.</li>';
        return;
    }

    elements.quizzesContainer.innerHTML = '';

    if (data.length === 0) {
        elements.quizzesContainer.innerHTML = '<li>No quizzes found.</li>';
        return;
    }

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
    
    elements.questionText.textContent = "Loading questions...";
    elements.optionsContainer.innerHTML = '';
    elements.feedbackText.textContent = '';
    elements.nextBtn.style.display = 'none';

    const { data, error } = await supabaseClient
        .from('questions')
        .select('*')
        .eq('quiz_id', quizId);

    if (error) {
        console.error('Error fetching questions:', error);
        elements.questionText.textContent = "Error loading questions.";
        return;
    }

    currentQuestions = data;

    if (currentQuestions.length === 0) {
        elements.questionText.textContent = "No questions found for this quiz.";
        return;
    }

    renderCurrentQuestion();
}

// --- 6. GAMEPLAY LOGIC ---
function renderCurrentQuestion() {
    const question = currentQuestions[currentQuestionIndex];
    elements.questionText.textContent = question.question_text;
    elements.optionsContainer.innerHTML = '';
    elements.feedbackText.textContent = '';
    
    elements.nextBtn.textContent = "Next Question"; 
    elements.nextBtn.style.display = 'none';

    const optionsArray = typeof question.options === 'string' 
        ? JSON.parse(question.options) 
        : question.options;

    // Detect JetPunk-style typing quiz
    if (optionsArray.length === 1 && optionsArray[0] === "TYPE") {
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

// HANDLER: Multiple Choice Questions
async function handleGuess(questionId, selectedOption, buttonElement) {
    const allButtons = elements.optionsContainer.querySelectorAll('button');
    allButtons.forEach(btn => btn.disabled = true);

    elements.feedbackText.textContent = "Checking...";
    elements.feedbackText.className = '';

    const { data: isCorrect, error } = await supabaseClient.rpc('check_quiz_answer', {
        q_id: questionId,
        user_guess: selectedOption
    });

    if (error) {
        console.error("Error checking answer:", error);
        elements.feedbackText.textContent = "Error checking answer.";
        return;
    }

    if (isCorrect) {
        buttonElement.style.backgroundColor = '#22c55e'; 
        elements.feedbackText.textContent = "Correct!";
        elements.feedbackText.className = 'correct';
        score++;
    } else {
        buttonElement.style.backgroundColor = '#ef4444'; 
        elements.feedbackText.textContent = "Incorrect!";
        elements.feedbackText.className = 'incorrect';
    }

    elements.nextBtn.style.display = 'block';
}

// HANDLER: JetPunk Typing Questions (INSTANT SUBMIT UPDATE)
function renderTypingGame(question) {
    correctlyTypedAnswers = []; 
    
    // Parse the database answer string into an array of perfectly capitalized countries
    const validAnswers = question.correct_answer.split(',').map(a => a.trim());
    
    // Create the input box
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'Type a country...';
    input.style.width = '100%';
    input.style.boxSizing = 'border-box'; // Keeps it perfectly inside the container
    input.style.padding = '15px';
    input.style.fontSize = '1.2rem';
    input.style.borderRadius = '12px';
    input.style.border = '2px solid var(--primary)';
    input.style.outline = 'none';
    input.style.marginBottom = '20px'; // Forces space below it
    input.style.display = 'block';
    
    // Create a flexbox list to show the answers
    const answersList = document.createElement('ul');
    answersList.id = 'typed-answers-list';
    answersList.style.display = 'flex';
    answersList.style.flexWrap = 'wrap';
    answersList.style.justifyContent = 'center';
    answersList.style.gap = '10px';
    answersList.style.padding = '0';

    elements.optionsContainer.appendChild(input);
    elements.optionsContainer.appendChild(answersList);

    elements.nextBtn.textContent = "I'm Done / Next";
    elements.nextBtn.style.display = 'block';

    setTimeout(() => input.focus(), 100);

    // THE MAGIC: Listen to EVERY keystroke, not just "Enter"
    input.addEventListener('input', function () {
        const guess = input.value.trim().toLowerCase();
        if (guess === '') return;
        
        // Check if what they typed matches any valid answer (case-insensitive)
        const matchedAnswer = validAnswers.find(answer => answer.toLowerCase() === guess);

        if (matchedAnswer) {
            // Check if they already got this one
            if (!correctlyTypedAnswers.includes(matchedAnswer)) {
                correctlyTypedAnswers.push(matchedAnswer);
                score++; 
                
                // Add to visual list (Using the perfectly capitalized matchedAnswer!)
                const li = document.createElement('li');
                li.textContent = matchedAnswer;
                li.style.background = '#22c55e'; 
                li.style.color = 'white';
                li.style.padding = '8px 15px';
                li.style.borderRadius = '20px';
                li.style.fontWeight = 'bold';
                li.style.animation = 'popIn 0.3s ease'; // Tiny animation
                answersList.appendChild(li);
                
                elements.feedbackText.textContent = `Correct! (${correctlyTypedAnswers.length} / ${validAnswers.length})`;
                elements.feedbackText.className = 'correct';
                
                // INSTANTLY clear the box for the next country
                input.value = ''; 
            }
        }
    });
}

// --- 7. NAVIGATION ---
function nextQuestion() {
    currentQuestionIndex++;
    if (currentQuestionIndex < currentQuestions.length) {
        renderCurrentQuestion();
    } else {
        showResults();
    }
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
