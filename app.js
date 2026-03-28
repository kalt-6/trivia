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
        questions: [],
        relatedQuizzes: [], 
        currentIndex: 0,
        score: 0,
        isProcessing: false,
        typedAnswers: [],
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
    
    // --- Initialization & Data Fetching ---
    init: async () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        State.clearTimer();
        State.activeFilter = 'All'; 
        
        const root = document.getElementById('app-root');
        if (!root) return; // Failsafe
        
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

            // Append category data (Added fallback strings to prevent crashes on null fields)
            State.quizzes = data.map(quiz => ({ ...quiz, category: App.categorizeQuiz(quiz) }));
            App.renderHome();

        } catch (err) {
            console.error("Initialization Error:", err);
            root.innerHTML = `
                <div class="text-center text-red-500 mt-20 bouncy-card p-10 max-w-md mx-auto fade-in">
                    <i class="fas fa-exclamation-triangle text-5xl mb-4"></i>
                    <h2 class="text-3xl font-black uppercase">Connection Error</h2>
                    <p class="mt-4 font-bold text-text-light">${err.message || 'We couldn\'t connect to the vault.'}</p>
                    <button onclick="App.init()" class="mt-6 btn-3d bg-primary text-white py-3 px-6 rounded-xl font-bold uppercase">Retry</button>
                </div>`;
        }
    },

    // --- Categorization Algorithm ---
    categorizeQuiz: (quiz) => {
        // NULL CHECK: Safely combines text even if title/description are missing in the DB
        const text = ((quiz.title || "") + " " + (quiz.description || "")).toLowerCase();
        
        if (text.includes('countr') || text.includes('capit') || text.includes('geography') || text.includes('state') || text.includes('ocean')) return 'Geography';
        if (text.includes('scienc') || text.includes('biolog') || text.includes('space') || text.includes('planet') || text.includes('element')) return 'Science';
        if (text.includes('movi') || text.includes('game') || text.includes('pop') || text.includes('song') || text.includes('oscar')) return 'Pop Culture';
        if (text.includes('art') || text.includes('mytholog') || text.includes('histor')) return 'History & Arts';
        if (text.includes('sport') || text.includes('food') || text.includes('culinary')) return 'Sports & Food';
        return 'General';
    },

    // --- Home Screen Renderer ---
    setFilter: (category) => {
        State.activeFilter = category;
        App.renderHome();
    },

    renderHome: () => {
        const root = document.getElementById('app-root');
        const displayedQuizzes = State.activeFilter === 'All' 
            ? State.quizzes 
            : State.quizzes.filter(q => q.category === State.activeFilter);

        let filterHtml = `<div class="flex overflow-x-auto gap-3 pb-4 mb-8 justify-start no-scrollbar fade-in px-4 w-full">`;
        State.categories.forEach(cat => {
            const isActive = State.activeFilter === cat;
            const base = "px-6 py-2 rounded-full font-black text-sm uppercase tracking-widest whitespace-nowrap transition-all cursor-pointer border-2";
            const active = isActive 
                ? "bg-primary text-white border-primary shadow-lg transform scale-105" 
                : "bg-surface text-text-light border-gray-200 hover:border-primary hover:text-primary";
            filterHtml += `<button onclick="App.setFilter('${cat}')" class="${base} ${active}">${cat}</button>`;
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
            html += `<div class="col-span-full text-center py-10 text-text-light font-bold text-xl">No quizzes found in this category yet!</div>`;
        }

        // Smart icon mapping based on quiz content
        const getQuizIconData = (quiz) => {
            const title = (quiz.title || "").toLowerCase();
            
            if (title.includes('state')) return { icon: 'fa-map', color: 'text-blue-500', bg: 'bg-blue-100' };
            if (title.includes('ocean') || title.includes('continent') || title.includes('geography')) return { icon: 'fa-globe-americas', color: 'text-green-500', bg: 'bg-green-100' };
            if (title.includes('countr') || title.includes('europ') || title.includes('capit')) return { icon: 'fa-landmark', color: 'text-purple-500', bg: 'bg-purple-100' };
            if (title.includes('element') || title.includes('scienc')) return { icon: 'fa-flask', color: 'text-teal-500', bg: 'bg-teal-100' };
            if (title.includes('planet') || title.includes('solar')) return { icon: 'fa-meteor', color: 'text-orange-500', bg: 'bg-orange-100' };
            if (title.includes('song') || title.includes('music') || title.includes('90s')) return { icon: 'fa-music', color: 'text-pink-500', bg: 'bg-pink-100' };
            if (title.includes('oscar') || title.includes('movie')) return { icon: 'fa-film', color: 'text-yellow-500', bg: 'bg-yellow-100' };
            
            // Fallbacks by category
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

    // --- Game Logic ---
    startQuiz: async (quizId, title) => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        const root = document.getElementById('app-root');
        root.innerHTML = `<div class="text-center mt-32 text-primary fade-in"><i class="fas fa-spinner fa-spin text-6xl mb-6"></i><h2 class="text-3xl font-black uppercase">Loading...</h2></div>`;
        
        try {
            const { data, error } = await DB.fetchQuestions(quizId);

            if (error) throw error;
            if (!data || data.length === 0) {
                root.innerHTML = `
                    <div class="text-center text-red-500 mt-20 bouncy-card p-10 max-w-md mx-auto fade-in">
                        <h2 class="text-3xl font-black uppercase">Oops!</h2>
                        <p class="mt-4 font-bold text-text-light">This quiz has no questions available.</p>
                        <button onclick="App.init()" class="mt-6 btn-3d bg-primary text-white py-3 px-6 rounded-xl font-bold uppercase">Back to Vault</button>
                    </div>`;
                return;
            }

            State.quiz = {
                id: quizId,
                title: title,
                questions: data,
                currentIndex: 0,
                score: 0,
                isProcessing: false,
                typedAnswers: [],
                timerInterval: null,
                relatedQuizzes: App.calculateRelatedQuizzes(quizId) 
            };

            App.renderQuizStep();
        } catch (err) {
            console.error("Error loading questions:", err);
            root.innerHTML = `<div class="text-center text-red-500 font-bold mt-20">Failed to load questions. Please try again.</div>`;
        }
    },

    calculateRelatedQuizzes: (currentQuizId) => {
        const currentQuiz = State.quizzes.find(q => q.id === currentQuizId);
        if (!currentQuiz) return [];

        const stopWords = ['the', 'a', 'an', 'and', 'or', 'in', 'on', 'with', 'to', 'for', 'of', 'how', 'many', 'what', 'which', 'is', 'are', 'test', 'your', 'knowledge'];
        const getWords = (text) => (text || '').toLowerCase().match(/\b\w+\b/g)?.filter(w => !stopWords.includes(w)) || [];
        const targetWords = [...getWords(currentQuiz.title), ...getWords(currentQuiz.description)];

        let scored = State.quizzes
            .filter(q => q.id !== currentQuizId) 
            .map(q => {
                let score = (q.category === currentQuiz.category) ? 5 : 0;
                const tWords = getWords(q.title);
                const dWords = getWords(q.description);
                targetWords.forEach(word => {
                    if (tWords.includes(word)) score += 3; 
                    if (dWords.includes(word)) score += 1;  
                });
                return { ...q, score };
            });

        scored.sort((a, b) => b.score - a.score);
        if (scored.length > 0 && scored[0].score === 0) scored.sort(() => 0.5 - Math.random());
        return scored.slice(0, 3);
    },

    renderSidebar: () => {
        const related = State.quiz.relatedQuizzes;
        if (related.length === 0) return '';

        let html = `
            <div class="bouncy-card p-6 sticky top-24 bg-surface hidden lg:block fade-in">
                <h3 class="text-lg font-black text-primary mb-4 uppercase tracking-widest border-b-2 border-background pb-3"><i class="fas fa-fire mr-2 text-accent"></i>Also Try</h3>
                <div class="space-y-4">
        `;
        related.forEach(q => {
            const safeTitle = (q.title || "Untitled").replace(/'/g, "\\'");
            html += `
                <div onclick="App.startQuiz('${q.id}', '${safeTitle}')" class="group cursor-pointer bg-background rounded-xl p-4 border-2 border-transparent hover:border-secondary transition-all">
                    <span class="text-[10px] font-black uppercase text-primary mb-1 block">${q.category}</span>
                    <h4 class="font-bold text-text-main group-hover:text-secondary transition-colors leading-tight mb-1">${q.title || "Untitled"}</h4>
                    <p class="text-xs text-text-light line-clamp-2">${q.description || ""}</p>
                </div>
            `;
        });
        return html + `</div></div>`;
    },

    renderQuizStep: () => {
        State.clearTimer(); 
        State.quiz.isProcessing = false;

        const question = State.quiz.questions[State.quiz.currentIndex];
        
        // Safety parsing options
        let optionsArray = [];
        try {
            optionsArray = typeof question.options === 'string' ? JSON.parse(question.options) : question.options;
        } catch(e) {
            console.error("Failed to parse options for question", question.id);
            optionsArray = [];
        }

        const isTypeIn = optionsArray.length === 1 && optionsArray[0] === "TYPE";
        const isHintTypeIn = optionsArray.length > 1 && optionsArray[0] === "TYPE_HINT"; 

        let quizHtml = `
            <div class="bouncy-card p-6 md:p-10 fade-in text-center flex-grow flex flex-col justify-between">
                <div>
                    <div class="flex justify-center items-center mb-6">
                        <span class="bg-background text-primary border-2 border-primary font-black px-4 py-2 rounded-full tracking-widest uppercase text-xs md:text-sm shadow-sm">
                            ${State.quiz.title} - Q${State.quiz.currentIndex + 1}/${State.quiz.questions.length}
                        </span>
                    </div>
                    <h2 class="text-2xl md:text-4xl font-black mb-8 text-text-main leading-tight">${question.question_text || "No Question Text"}</h2>
        `;

        if (isTypeIn || isHintTypeIn) {
            // --- Typing Challenges ---
            quizHtml += `
                <div class="flex justify-between items-center mb-4 px-4 bg-background p-3 rounded-xl border-2 border-primary">
                    <div class="text-2xl font-black ${isHintTypeIn ? 'text-red-500' : 'hidden'}"><i class="fas fa-stopwatch mr-2"></i><span id="timer-display">60</span>s</div>
                    <div id="feedback" class="text-xl font-black uppercase tracking-wide text-text-light">Start Typing...</div>
                </div>
                <input type="text" id="type-input" class="w-full bg-surface border-4 border-primary p-5 rounded-2xl mb-6 text-text-main text-2xl font-bold text-center focus:border-secondary focus:ring-0 outline-none transition-all shadow-inner" placeholder="Type answer here..." autocomplete="off">
            `;

            if (isHintTypeIn) {
                const hintData = optionsArray.slice(1);
                quizHtml += `<div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">`;
                hintData.forEach((h, i) => {
                    quizHtml += `
                    <div class="flex border-2 border-primary rounded-xl overflow-hidden shadow-sm bg-surface transition-colors duration-300">
                        <div class="bg-background text-primary font-black p-3 w-1/3 border-r-2 border-primary flex items-center justify-center text-center text-sm md:text-base">${h.hint || "?"}</div>
                        <div id="ans-${i}" class="p-3 w-2/3 font-bold flex items-center justify-center text-center text-gray-300 transition-colors duration-300">???</div>
                    </div>`;
                });
                quizHtml += `</div>`;
            } else {
                quizHtml += `<ul id="typed-answers-list" class="flex flex-wrap justify-center gap-3 mb-6 p-0 list-none min-h-[50px]"></ul>`;
            }
            quizHtml += `</div><button onclick="App.nextQuestion()" class="btn-3d w-full bg-text-light text-white py-4 mt-4 rounded-xl font-black text-lg md:text-xl tracking-widest uppercase hover:bg-text-main">I'm Done / Next</button></div>`;
        
        } else {
            // --- Standard Multiple Choice ---
            const safeCorrect = (question.correct_answer || "").replace(/'/g, "\\'");
            let optionsHtml = `<div class="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full" id="btn-grid">`;
            optionsArray.forEach((opt, i) => {
                const safeOpt = (opt || "").replace(/'/g, "\\'");
                optionsHtml += `<button onclick="App.submitMC('${safeCorrect}', '${safeOpt}', this)" class="opt-btn opt-${i % 4} btn-3d w-full p-6 rounded-2xl font-black text-lg md:text-2xl shadow-sm border-none transition-all">${opt}</button>`;
            });
            optionsHtml += `</div>`;
            
            quizHtml += `${optionsHtml}
                </div>
                <div>
                    <div id="feedback" class="mt-8 h-10 text-2xl md:text-3xl font-black uppercase tracking-wide flex items-center justify-center"></div>
                    <button id="next-btn" onclick="App.nextQuestion()" class="btn-3d w-full bg-primary text-white py-4 mt-6 rounded-xl font-black text-lg md:text-xl tracking-widest uppercase hidden">Next Question <i class="fas fa-arrow-right ml-2"></i></button>
                </div>
            </div>`;
        }

        document.getElementById('app-root').innerHTML = `
            <div class="flex flex-col lg:flex-row gap-8 max-w-7xl mx-auto items-stretch h-full">
                <div class="w-full lg:w-2/3 xl:w-3/4 flex flex-col">${quizHtml}</div>
                <div class="w-full lg:w-1/3 xl:w-1/4">${App.renderSidebar()}</div>
            </div>`;
        
        if (isTypeIn || isHintTypeIn) App.setupTypingLogic(question, isHintTypeIn, isHintTypeIn ? optionsArray.slice(1) : []);
    },

    submitMC: (correctAnswer, selectedOption, clickedBtn) => {
        if (State.quiz.isProcessing) return;
        State.quiz.isProcessing = true;

        const isCorrect = correctAnswer.trim().toLowerCase() === selectedOption.trim().toLowerCase();
        const feedback = document.getElementById('feedback');
        const nextBtn = document.getElementById('next-btn');
        const allBtns = document.querySelectorAll('.opt-btn');

        allBtns.forEach(btn => {
            btn.disabled = true;
            if (btn.innerText.trim().toLowerCase() === correctAnswer.trim().toLowerCase()) {
                btn.classList.add('mc-correct', 'text-white');
                btn.classList.remove('opt-0', 'opt-1', 'opt-2', 'opt-3');
            }
        });

        if (isCorrect) {
            State.quiz.score++;
            feedback.innerHTML = `<span class="text-green-500 fade-in drop-shadow-sm"><i class="fas fa-check-circle mr-2"></i> Spot On!</span>`;
        } else {
            clickedBtn.classList.add('mc-incorrect', 'text-white');
            clickedBtn.classList.remove('opt-0', 'opt-1', 'opt-2', 'opt-3');
            feedback.innerHTML = `<span class="text-red-500 fade-in drop-shadow-sm"><i class="fas fa-times-circle mr-2"></i> Incorrect!</span>`;
        }

        nextBtn.classList.remove('hidden');
        nextBtn.classList.add('fade-in');
    },

    setupTypingLogic: (question, isHintTypeIn, hintData) => {
        State.quiz.typedAnswers = []; 
        const originalAnswers = (question.correct_answer || "").split(',').map(a => a.trim());
        const validAnswers = originalAnswers.map(a => a.toLowerCase()); 
        
        const input = document.getElementById('type-input');
        const feedback = document.getElementById('feedback');
        const timerDisplay = document.getElementById('timer-display');

        if (isHintTypeIn) {
            let timeLeft = 60;
            State.quiz.timerInterval = setInterval(() => {
                timeLeft--;
                timerDisplay.textContent = timeLeft;
                if (timeLeft <= 0) {
                    State.clearTimer();
                    input.disabled = true;
                    input.placeholder = "Time's up!";
                    input.classList.add('opacity-50');
                    feedback.innerHTML = `<span class="text-red-500 fade-in"><i class="fas fa-clock mr-2"></i> Time's Up!</span>`;
                    
                    hintData.forEach((h, i) => {
                        const cell = document.getElementById(`ans-${i}`);
                        if (cell && cell.textContent === '???') {
                            cell.textContent = h.answer;
                            cell.classList.remove('text-gray-300');
                            cell.classList.add('text-white', 'bg-red-400');
                        }
                    });
                }
            }, 1000);
        }

        setTimeout(() => input.focus(), 100);

        input.addEventListener('input', function () {
            const guess = input.value.trim().toLowerCase();
            if (guess === '') return;
            
            const matchIndex = validAnswers.findIndex(answer => answer === guess);

            if (matchIndex !== -1 && !State.quiz.typedAnswers.includes(validAnswers[matchIndex])) {
                const matchedAnswer = originalAnswers[matchIndex];
                State.quiz.typedAnswers.push(validAnswers[matchIndex]);
                
                if (isHintTypeIn) {
                    const cell = document.getElementById(`ans-${matchIndex}`);
                    if (cell) {
                        cell.textContent = matchedAnswer;
                        cell.classList.remove('text-gray-300');
                        cell.classList.add('text-white', 'bg-green-500', 'shadow-md');
                    }
                } else {
                    const answersList = document.getElementById('typed-answers-list');
                    const li = document.createElement('li');
                    li.innerHTML = `<span class="bg-green-500 text-white font-black px-4 py-2 rounded-full md:text-lg shadow-md block fade-in border-2 border-white"><i class="fas fa-check mr-2"></i>${matchedAnswer}</span>`;
                    answersList.appendChild(li);
                }
                
                feedback.innerHTML = `<span class="text-green-500 fade-in"><i class="fas fa-star text-accent mr-2"></i> Found: ${State.quiz.typedAnswers.length} / ${validAnswers.length}</span>`;
                input.value = ''; 

                if (State.quiz.typedAnswers.length === validAnswers.length) {
                    State.clearTimer();
                    input.disabled = true;
                    input.placeholder = "Perfect Score!";
                    input.classList.add('bg-green-50', 'border-green-500');
                    feedback.innerHTML = `<span class="text-green-500 fade-in font-black"><i class="fas fa-trophy text-accent mr-2"></i> You got them all!</span>`;
                    State.quiz.score += validAnswers.length;
                }
            }
        });
    },

    nextQuestion: () => {
        if (!State.quiz.isProcessing && State.quiz.typedAnswers.length > 0) {
             const question = State.quiz.questions[State.quiz.currentIndex];
             let optionsArray = [];
             try { optionsArray = JSON.parse(question.options); } catch(e) { optionsArray = question.options; }

             if (optionsArray && (optionsArray[0] === "TYPE" || optionsArray[0] === "TYPE_HINT")) {
                 const validAnswers = (question.correct_answer || "").split(',').length;
                 if (State.quiz.typedAnswers.length !== validAnswers) {
                      State.quiz.score += State.quiz.typedAnswers.length;
                 }
             }
        }

        State.quiz.currentIndex++;
        if (State.quiz.currentIndex < State.quiz.questions.length) {
            App.renderQuizStep();
        } else {
            App.renderResults();
        }
    },

    renderResults: () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        
        let totalPossible = 0;
        State.quiz.questions.forEach(q => {
            let opts = [];
            try { opts = JSON.parse(q.options); } catch(e) { opts = q.options; }

            if (opts && opts.length > 0 && (opts[0] === "TYPE" || opts[0] === "TYPE_HINT")) {
                totalPossible += (q.correct_answer || "").split(',').length;
            } else {
                totalPossible += 1;
            }
        });

        // Optimization: Prevent NaN if totalPossible is 0
        const safeTotal = totalPossible || 1;
        const percentage = (State.quiz.score / safeTotal) * 100;
        
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
                    ${State.quiz.score} <span class="text-3xl md:text-4xl text-text-light">/ ${totalPossible}</span>
                </div>
                
                <div class="space-y-4 mt-8 pt-6 border-t-2 border-background">
                    <button onclick="App.init()" class="btn-3d w-full bg-secondary text-white py-4 rounded-xl font-black text-xl uppercase tracking-widest hover:bg-pink-600">Back to Vault <i class="fas fa-home ml-2"></i></button>
                </div>
            </div>
        `;
    }
};

// --- Execute Application on Load (Failsafe Execution) ---
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', App.init);
} else {
    App.init(); 
}
