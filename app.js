/**************************************************************
 * 1. DATABASE SETUP
 **************************************************************/
const DB = {
    url: 'https://pjjfnnzvwrhzvycjgkmz.supabase.co',
    key: 'sb_publishable_J53ea-bCU35D1VSTK0l49A_b_BYW98W',
    client: null,
    init() {
        if (!window.supabase) {
            throw new Error("Supabase failed to load. Check your internet connection or ad-blocker.");
        }
        this.client = window.supabase.createClient(this.url, this.key);
    },
    async fetchQuizzes() {
        return await this.client.from('quizzes').select('*').order('id', { ascending: true });
    },
    async fetchQuestions(quizId) {
        // Since we migrated, this now returns 1 row containing all the hints/answers
        return await this.client.from('questions').select('*').eq('quiz_id', quizId);
    }
};

/**************************************************************
 * 2. STATE MANAGEMENT
 **************************************************************/
const State = {
    quizzes: [],
    categories: ['All', 'Geography', 'Science', 'Pop Culture', 'History & Arts', 'Sports & Food', 'General'],
    activeFilter: 'All',
    // Current Session Data
    quiz: {
        id: null,
        title: "",
        questionRow: null,
        hintData: [], // Stores the active, shuffled hints
        relatedQuizzes: [],
        score: 0,
        totalAnswers: 0,
        typedIndices: [], // Tracks which specific answers have been guessed
        timerInterval: null
    },
    clearTimer() {
        if (this.quiz.timerInterval) {
            clearInterval(this.quiz.timerInterval);
            this.quiz.timerInterval = null;
        }
    }
};

/**************************************************************
 * 3. APPLICATION LOGIC
 **************************************************************/
window.App = {
    // --- Initialization & Navigation ---
    init: async () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        State.clearTimer();
        State.activeFilter = 'All';
        const root = document.getElementById('app-root');
        if (!root) return; 

        root.innerHTML = `
        <div class="flex flex-col items-center justify-center mt-32 fade-in">
            <i class="fas fa-circle-notch fa-spin text-6xl text-primary mb-6"></i>
            <h2 class="text-3xl font-extrabold text-primary tracking-wide uppercase">Opening Vault...</h2>
        </div>`;

        try {
            if (!DB.client) DB.init();
            const { data, error } = await DB.fetchQuizzes();
            if (error) throw error;
            if (!data) throw new Error("No data returned from the database.");

            State.quizzes = data.map(quiz => ({ ...quiz, category: App.categorizeQuiz(quiz) }));

            // Check URL for direct routing
            const urlParams = new URLSearchParams(window.location.search);
            const quizTitleFromURL = urlParams.get('quiz');
            
            if (quizTitleFromURL) {
                const targetQuiz = State.quizzes.find(q => q.title === quizTitleFromURL);
                if (targetQuiz) {
                    App.startQuiz(targetQuiz.id, targetQuiz.title, false);
                    return;
                }
            }

            App.renderHome();

        } catch (err) {
            console.error("Initialization Error:", err);
            root.innerHTML = `
            <div class="text-center text-red-500 mt-20 bouncy-card p-10 max-w-md mx-auto fade-in">
                <i class="fas fa-exclamation-triangle text-5xl mb-4"></i>
                <h2 class="text-3xl font-black uppercase">Connection Error</h2>
                <p class="mt-4 font-bold text-text-light">${err.message}</p>
                <button onclick="App.init()" class="mt-6 btn-3d bg-primary text-white py-3 px-6 rounded-xl font-bold uppercase">Retry</button>
            </div>`;
        }
    },

    goHome: () => {
        window.history.pushState({}, '', window.location.pathname);
        State.clearTimer();
        App.renderHome();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    },

    categorizeQuiz: (quiz) => {
        const text = ((quiz.title || "") + " " + (quiz.description || "")).toLowerCase();
        if (text.includes('countr') || text.includes('capit') || text.includes('geography') || text.includes('state') || text.includes('ocean')) return 'Geography';
        if (text.includes('scienc') || text.includes('biolog') || text.includes('space') || text.includes('planet') || text.includes('element')) return 'Science';
        if (text.includes('movi') || text.includes('game') || text.includes('pop') || text.includes('song') || text.includes('oscar')) return 'Pop Culture';
        if (text.includes('art') || text.includes('mytholog') || text.includes('histor')) return 'History & Arts';
        if (text.includes('sport') || text.includes('food') || text.includes('culinary')) return 'Sports & Food';
        return 'General';
    },

    // --- Home Screen ---
    setFilter: (category) => {
        State.activeFilter = category;
        App.renderHome();
    },

    renderHome: () => {
        const root = document.getElementById('app-root');
        const displayedQuizzes = State.activeFilter === 'All' ? State.quizzes : State.quizzes.filter(q => q.category === State.activeFilter);
        
        let filterHtml = `<div class="flex overflow-x-auto gap-3 pb-4 mb-8 justify-start no-scrollbar fade-in px-4 w-full">`;
        State.categories.forEach(cat => {
            const isActive = State.activeFilter === cat;
            const activeClass = isActive ? "bg-primary text-white border-primary shadow-lg transform scale-105" : "bg-surface text-text-light border-gray-200 hover:border-primary hover:text-primary";
            filterHtml += `<button onclick="App.setFilter('${cat}')" class="px-6 py-2 rounded-full font-black text-sm uppercase tracking-widest whitespace-nowrap transition-all cursor-pointer border-2 ${activeClass}">${cat}</button>`;
        });
        filterHtml += `</div>`;

        let html = `
        <div class="text-center mb-8 fade-in">
            <h1 class="text-5xl md:text-6xl font-black text-primary mb-4 uppercase tracking-wider text-shadow">Select a Quiz!</h1>
        </div>
        ${filterHtml}
        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 fade-in">
        `;

        if (displayedQuizzes.length === 0) {
            html += `<div class="col-span-full text-center py-10 text-text-light font-bold text-xl">No quizzes found!</div>`;
        }

        const getQuizIconData = (quiz) => {
            const title = (quiz.title || "").toLowerCase();
            if (title.includes('state')) return { icon: 'fa-map', color: 'text-blue-500', bg: 'bg-blue-100' };
            if (title.includes('ocean') || title.includes('continent') || title.includes('geography')) return { icon: 'fa-globe-americas', color: 'text-green-500', bg: 'bg-green-100' };
            if (title.includes('countr') || title.includes('europ') || title.includes('capit')) return { icon: 'fa-landmark', color: 'text-purple-500', bg: 'bg-purple-100' };
            if (title.includes('element') || title.includes('scienc')) return { icon: 'fa-flask', color: 'text-teal-500', bg: 'bg-teal-100' };
            if (title.includes('planet') || title.includes('solar')) return { icon: 'fa-meteor', color: 'text-orange-500', bg: 'bg-orange-100' };
            if (title.includes('song') || title.includes('music') || title.includes('90s')) return { icon: 'fa-music', color: 'text-pink-500', bg: 'bg-pink-100' };
            if (title.includes('oscar') || title.includes('movie')) return { icon: 'fa-film', color: 'text-yellow-500', bg: 'bg-yellow-100' };
            
            if (quiz.category === 'Geography') return { icon: 'fa-map-marked-alt', color: 'text-blue-500', bg: 'bg-blue-100' };
            if (quiz.category === 'Science') return { icon: 'fa-microscope', color: 'text-teal-500', bg: 'bg-teal-100' };
            if (quiz.category === 'Pop Culture') return { icon: 'fa-gamepad', color: 'text-pink-500', bg: 'bg-pink-100' };
            if (quiz.category === 'History & Arts') return { icon: 'fa-palette', color: 'text-purple-500', bg: 'bg-purple-100' };
            if (quiz.category === 'Sports & Food') return { icon: 'fa-football-ball', color: 'text-orange-500', bg: 'bg-orange-100' };
            return { icon: 'fa-star', color: 'text-gray-500', bg: 'bg-gray-200' };
        };

        displayedQuizzes.forEach((quiz) => {
            const safeTitle = (quiz.title || "Untitled").replace(/'/g, "\\'");
            const iconData = getQuizIconData(quiz);
            html += `
            <button onclick="App.startQuiz('${quiz.id}', '${safeTitle}')" class="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-3 p-4 bg-surface border border-gray-200 hover:border-primary hover:shadow-lg transition-all group rounded-xl cursor-pointer">
                <div class="p-3 rounded-lg flex items-center justify-center ${iconData.bg} ${iconData.color} group-hover:scale-110 transition-transform">
                    <i class="fas ${iconData.icon} text-xl"></i>
                </div>
                <div class="flex flex-col justify-center sm:pt-1">
                    <span class="font-bold text-sm text-text-main leading-tight">${quiz.title || "Untitled Quiz"}</span>
                    <span class="text-[10px] text-text-light mt-1 font-black uppercase tracking-wider hidden sm:block">Play Now <i class="fas fa-play text-[8px] ml-1"></i></span>
                </div>
            </button>
            `;
        });
        html += `</div>`;
        root.innerHTML = html;
    },

    // --- Quiz Logic ---
    startQuiz: async (quizId, title, pushState = true) => {
        if (pushState) {
            window.history.pushState({}, '', `?quiz=${encodeURIComponent(title)}`);
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
        
        const root = document.getElementById('app-root');
        root.innerHTML = `<div class="text-center mt-32 text-primary fade-in"><i class="fas fa-spinner fa-spin text-6xl mb-6"></i><h2 class="text-3xl font-black uppercase">Loading...</h2></div>`;
        
        try {
            const { data, error } = await DB.fetchQuestions(quizId);
            if (error) throw error;
            if (!data || data.length === 0) {
                root.innerHTML = `<div class="text-center text-red-500 mt-20 bouncy-card p-10"><h2 class="text-3xl font-black">Empty Quiz!</h2><button onclick="App.goHome()" class="mt-6 btn-3d bg-primary text-white py-3 px-6 rounded-xl font-bold uppercase">Go Back</button></div>`;
                return;
            }

            State.quiz = {
                id: quizId,
                title: title,
                questionRow: data[0], // Only 1 row per quiz now!
                score: 0,
                typedIndices: [],
                timerInterval: null,
                relatedQuizzes: App.calculateRelatedQuizzes(quizId)
            };
            App.renderQuizUI();

        } catch (err) {
            console.error("Error loading questions:", err);
            root.innerHTML = `<div class="text-center text-red-500 font-bold mt-20">Failed to load questions.</div>`;
        }
    },

    calculateRelatedQuizzes: (currentQuizId) => {
        const currentQuiz = State.quizzes.find(q => q.id === currentQuizId);
        if (!currentQuiz) return [];
        return State.quizzes.filter(q => q.category === currentQuiz.category && q.id !== currentQuizId).slice(0, 3);
    },

    renderSidebar: () => {
        const related = State.quiz.relatedQuizzes;
        if (related.length === 0) return '';
        let html = `<div class="bouncy-card p-6 sticky top-24 bg-surface hidden lg:block fade-in"><h3 class="text-lg font-black text-primary mb-4 uppercase tracking-widest border-b-2 border-background pb-3">Also Try</h3><div class="space-y-4">`;
        related.forEach(q => {
            const safeTitle = (q.title || "Untitled").replace(/'/g, "\\'");
            html += `<div onclick="App.startQuiz('${q.id}', '${safeTitle}')" class="group cursor-pointer bg-background rounded-xl p-4 border-2 border-transparent hover:border-secondary transition-all"><h4 class="font-bold text-text-main group-hover:text-secondary">${q.title}</h4></div>`;
        });
        return html + `</div></div>`;
    },

    renderQuizUI: () => {
        State.clearTimer();
        const row = State.quiz.questionRow;
        
        // Parse options safely
        let options = [];
        try { options = typeof row.options === 'string' ? JSON.parse(row.options) : row.options; } 
        catch(e) { console.error("Failed to parse options"); }

        // Safely clone the array so we don't mutate the original database pull
        let hintData = options[0] === "TYPE_HINT" || options[0] === "TYPE" ? [...options.slice(1)] : [...options];
        
        // True Fisher-Yates Shuffle
        for (let i = hintData.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            const temp = hintData[i];
            hintData[i] = hintData[j];
            hintData[j] = temp;
        }
        
        // Save the shuffled array to state so finishQuiz uses the exact same order
        State.quiz.hintData = hintData;
        State.quiz.totalAnswers = hintData.length;
        
        // Dynamic timer: 8 seconds per hint, minimum 30 seconds
        const allottedTime = Math.max(hintData.length * 8, 30); 
        
        let quizHtml = `
        <div class="bouncy-card p-6 md:p-10 fade-in text-center flex-grow flex flex-col justify-between">
            <h2 class="text-2xl md:text-3xl font-black mb-6 text-text-main leading-tight">${row.question_text || State.quiz.title}</h2>
            
            <div class="sticky top-0 z-30 bg-surface pb-4 mb-2 pt-2 border-b border-transparent shadow-[0_15px_15px_-15px_rgba(0,0,0,0.1)]">
                <div class="flex justify-between items-center mb-4 px-4 bg-background p-3 rounded-xl border-2 border-primary">
                    <div class="text-2xl font-black text-red-500"><i class="fas fa-stopwatch mr-2"></i><span id="timer-display">${allottedTime}</span>s</div>
                    <div id="feedback" class="text-xl font-black uppercase tracking-wide text-text-light">Start Typing...</div>
                </div>
                <input type="text" id="type-input" class="w-full bg-surface border-4 border-primary p-5 rounded-2xl text-text-main text-2xl font-bold text-center focus:border-secondary focus:ring-0 outline-none transition-all shadow-inner" placeholder="Type answer here..." autocomplete="off">
            </div>
            
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6 max-h-[50vh] overflow-y-auto p-2 border-2 border-background rounded-xl bg-background/30 shadow-inner">
        `;

        // Render the Hints Grid
        hintData.forEach((h, i) => {
            // Using 50/50 split for Hint and Answer area as requested
            quizHtml += `
            <div class="flex border-2 border-primary rounded-xl overflow-hidden shadow-sm bg-surface transition-colors duration-300">
                <div class="bg-background text-primary font-bold p-3 w-1/2 border-r-2 border-primary flex items-center justify-start text-left text-sm md:text-base">${h.hint || "?"}</div>
                <div id="ans-${i}" class="p-3 w-1/2 font-black flex items-center justify-center text-center text-gray-300 transition-colors duration-300">???</div>
            </div>`;
        });

        quizHtml += `
            </div>
            <button onclick="App.finishQuiz()" class="btn-3d w-full bg-text-light text-white py-4 mt-4 rounded-xl font-black text-lg md:text-xl tracking-widest uppercase hover:bg-red-500">Give Up / Finish</button>
        </div>`;

        document.getElementById('app-root').innerHTML = `
        <div class="flex flex-col lg:flex-row gap-8 max-w-7xl mx-auto items-stretch h-full">
            <div class="w-full lg:w-2/3 xl:w-3/4 flex flex-col">${quizHtml}</div>
            <div class="w-full lg:w-1/3 xl:w-1/4">${App.renderSidebar()}</div>
        </div>`;

        App.setupTypingLogic(hintData, allottedTime);
    },

    setupTypingLogic: (hintData, allottedTime) => {
        const validAnswers = hintData.map(h => h.answer.toLowerCase().trim());
        const input = document.getElementById('type-input');
        const feedback = document.getElementById('feedback');
        const timerDisplay = document.getElementById('timer-display');

        let timeLeft = allottedTime;
        State.quiz.timerInterval = setInterval(() => {
            timeLeft--;
            timerDisplay.textContent = timeLeft;
            if (timeLeft <= 0) {
                App.finishQuiz(); // Auto-finish when time is up
            }
        }, 1000);

        setTimeout(() => input.focus(), 100);

        input.addEventListener('input', function () {
            const guess = input.value.trim().toLowerCase();
            if (guess === '') return;
            
            // Find the index of the matched answer that hasn't been typed yet
            const matchIndex = validAnswers.findIndex((ans, idx) => ans === guess && !State.quiz.typedIndices.includes(idx));
            
            if (matchIndex !== -1) {
                State.quiz.typedIndices.push(matchIndex);
                State.quiz.score++;
                
                // Update UI immediately
                const cell = document.getElementById(`ans-${matchIndex}`);
                if (cell) {
                    cell.textContent = hintData[matchIndex].answer;
                    cell.classList.remove('text-gray-300');
                    cell.classList.add('text-white', 'bg-green-500', 'shadow-md');
                }
                
                feedback.innerHTML = `<span class="text-green-500 fade-in"><i class="fas fa-star text-accent mr-2"></i> Found: ${State.quiz.score} / ${State.quiz.totalAnswers}</span>`;
                input.value = '';
                
                // Check Win Condition
                if (State.quiz.score === State.quiz.totalAnswers) {
                    App.finishQuiz();
                }
            }
        });
    },

    finishQuiz: () => {
        State.clearTimer();
        const input = document.getElementById('type-input');
        const feedback = document.getElementById('feedback');
        
        if (input) {
            input.disabled = true;
            input.placeholder = State.quiz.score === State.quiz.totalAnswers ? "Perfect Score!" : "Time's up!";
            input.classList.add('opacity-50');
        }

        // Reveal missing answers in red using the saved, shuffled hintData
        const hintData = State.quiz.hintData;

        hintData.forEach((h, i) => {
            const cell = document.getElementById(`ans-${i}`);
            if (cell && cell.textContent === '???') {
                cell.textContent = h.answer;
                cell.classList.remove('text-gray-300');
                cell.classList.add('text-white', 'bg-red-400');
            }
        });

        // Wait 2.5 seconds so they can see what they missed, then show results
        if (feedback) feedback.innerHTML = `<span class="text-primary fade-in">Calculating Results...</span>`;
        setTimeout(() => App.renderResults(), 2500);
    },

    renderResults: () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        
        const percentage = (State.quiz.score / State.quiz.totalAnswers) * 100;
        let message = "Good Job!";
        let icon = "fa-star";
        let colorClass = "text-primary";
        
        if (percentage === 100) { message = "Flawless Victory!"; icon = "fa-crown"; colorClass = "text-accent"; }
        else if (percentage >= 80) { message = "Awesome Work!"; icon = "fa-fire"; colorClass = "text-orange-500"; }
        else if (percentage <= 50) { message = "Keep Practicing!"; icon = "fa-dumbbell"; colorClass = "text-blue-500"; }

        document.getElementById('app-root').innerHTML = `
        <div class="max-w-xl mx-auto text-center bouncy-card p-10 md:p-16 fade-in mt-10">
            <div class="w-32 h-32 bg-background rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner border-4 border-primary">
                <i class="fas ${icon} text-6xl ${colorClass}"></i>
            </div>
            <h2 class="text-4xl font-black mb-2 text-text-main uppercase tracking-widest">${message}</h2>
            <p class="text-text-light font-bold text-lg mb-6">You completed: <span class="text-primary">${State.quiz.title}</span></p>
            
            <div class="text-7xl md:text-8xl font-black ${colorClass} my-8 tracking-tighter drop-shadow-md bg-surface p-6 rounded-3xl border-2 border-gray-100 shadow-sm inline-block">
                ${State.quiz.score} <span class="text-3xl md:text-4xl text-text-light">/ ${State.quiz.totalAnswers}</span>
            </div>
            
            <div class="space-y-4 mt-8 pt-6 border-t-2 border-background">
                <button onclick="App.goHome()" class="btn-3d w-full bg-secondary text-white py-4 rounded-xl font-black text-xl uppercase tracking-widest hover:bg-pink-600">Back to Vault <i class="fas fa-home ml-2"></i></button>
            </div>
        </div>
        `;
    }
};

window.addEventListener('popstate', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const quizTitleFromURL = urlParams.get('quiz');
    
    if (quizTitleFromURL && State.quizzes.length > 0) {
        const targetQuiz = State.quizzes.find(q => q.title === quizTitleFromURL);
        if (targetQuiz) {
            App.startQuiz(targetQuiz.id, targetQuiz.title, false);
            return;
        }
    }
    
    if (State.quizzes.length > 0) App.renderHome();
    else App.init();
});

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', App.init);
} else {
    App.init();
}
