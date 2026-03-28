// Import Supabase directly from the CDN (Perfect for GitHub Pages)
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

// API Keys
const supabaseUrl = 'https://pjjfnnzvwrhzvycjgkmz.supabase.co'
const supabaseKey = 'sb_publishable_J53ea-bCU35D1VSTK0l49A_b_BYW98W'
const supabase = createClient(supabaseUrl, supabaseKey)

// DOM Elements
const screens = {
    quizList: document.getElementById('quiz-list-screen'),
    game: document.getElementById('game-screen')
}
const elements = {
    quizzesContainer: document.getElementById('quizzes-container'),
    loadingText: document.getElementById('loading-text'),
    questionText: document.getElementById('question-text'),
    optionsContainer: document.getElementById('options-container'),
    feedbackText: document.getElementById('feedback-text'),
    nextBtn: document.getElementById('next-btn'),
    backBtn: document.getElementById('back-btn')
}

// State variables
let currentQuestions = [];
let currentQuestionIndex = 0;

// --- INITIALIZATION ---
async function init() {
    await loadQuizzes();
    
    // Event listener for the back button
    elements.backBtn.addEventListener('click', () => {
        showScreen('quizList');
    });

    // Event listener for the next question button
    elements.nextBtn.addEventListener('click', loadNextQuestion);
}

// --- DATA FETCHING ---
async function loadQuizzes() {
    // Fetch from your 'quizzes' table. Assuming it has 'id' and 'title' columns.
    const { data, error } = await supabase.from('quizzes').select('*');
    
    elements.loadingText.style.display = 'none';

    if (error) {
        console.error('Error loading quizzes:', error);
        elements.quizzesContainer.innerHTML = '<p>Failed to load quizzes.</p>';
        return;
    }

    elements.quizzesContainer.innerHTML = '';
    data.forEach(quiz => {
        const li = document.createElement('li');
        const btn = document.createElement('button');
        // Assuming your quizzes table has a column named 'title'
        btn.textContent = quiz.title || 'Untitled Quiz'; 
        btn.onclick = () => startQuiz(quiz.id);
        
        li.appendChild(btn);
        elements.quizzesContainer.appendChild(li);
    });
}

async function startQuiz(quizId) {
    showScreen('game');
    elements.questionText.textContent = "Loading...";
    elements.optionsContainer.innerHTML = '';
    elements.feedbackText.textContent = '';
    elements.nextBtn.style.display = 'none';

    // Fetch questions securely (no correct_answer fetched!)
    const { data, error } = await supabase
        .from('questions')
        .select('id, question_text, options')
        .eq('quiz_id', quizId);

    if (error || data.length === 0) {
        elements.questionText.textContent = "No questions found for this quiz yet!";
        return;
    }

    currentQuestions = data;
    currentQuestionIndex = 0;
    renderCurrentQuestion();
}

// --- GAMEPLAY LOGIC ---
function renderCurrentQuestion() {
    const question = currentQuestions[currentQuestionIndex];
    elements.questionText.textContent = question.question_text;
    elements.optionsContainer.innerHTML = '';
    elements.feedbackText.textContent = '';
    elements.nextBtn.style.display = 'none';

    // Parse options if they are a JSON string, or map directly if it's already an array
    const optionsArray = typeof question.options === 'string' 
        ? JSON.parse(question.options) 
        : question.options;

    optionsArray.forEach(option => {
        const btn = document.createElement('button');
        btn.textContent = option;
        btn.onclick = () => handleGuess(question.id, option, btn);
        elements.optionsContainer.appendChild(btn);
    });
}

async function handleGuess(questionId, userGuess, clickedButton) {
    // Disable all buttons to prevent multiple clicks
    const allButtons = elements.optionsContainer.querySelectorAll('button');
    allButtons.forEach(btn => btn.disabled = true);
    
    elements.feedbackText.textContent = "Checking...";
    elements.feedbackText.className = '';

    // Securely check answer via your Supabase RPC function
    const { data: isCorrect, error } = await supabase.rpc('check_quiz_answer', {
        q_id: questionId,
        user_guess: userGuess
    });

    if (error) {
        console.error("Error checking answer:", error);
        elements.feedbackText.textContent = "Error checking answer.";
        return;
    }

    // Update UI based on the secure result
    if (isCorrect) {
        clickedButton.style.backgroundColor = '#16a34a'; // Green
        elements.feedbackText.textContent = "Correct! 🎉";
        elements.feedbackText.className = 'correct';
    } else {
        clickedButton.style.backgroundColor = '#dc2626'; // Red
        elements.feedbackText.textContent = "Incorrect. 😔";
        elements.feedbackText.className = 'incorrect';
    }

    // Determine if game is over or show next button
    if (currentQuestionIndex < currentQuestions.length - 1) {
        elements.nextBtn.style.display = 'inline-block';
    } else {
        elements.nextBtn.textContent = "Finish Quiz";
        elements.nextBtn.style.display = 'inline-block';
        elements.nextBtn.onclick = () => {
            alert("Quiz Complete!");
            showScreen('quizList');
            elements.nextBtn.onclick = loadNextQuestion; // reset handler
            elements.nextBtn.textContent = "Next Question";
        };
    }
}

function loadNextQuestion() {
    currentQuestionIndex++;
    renderCurrentQuestion();
}

// --- UTILS ---
function showScreen(screenName) {
    screens.quizList.classList.remove('active');
    screens.game.classList.remove('active');
    
    if (screenName === 'quizList') screens.quizList.classList.add('active');
    if (screenName === 'game') screens.game.classList.add('active');
}

// Start the app
init();