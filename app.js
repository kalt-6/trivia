/**************************************************************
 * 1. DATABASE SETUP
 **************************************************************/
const DB = {
    url: 'https://pjjfnnzvwrhzvycjgkmz.supabase.co',
    key: 'sb_publishable_J53ea-bCU35D1VSTK0l49A_b_BYW98W',
    client: null,
    init() {
        if (!window.supabase) throw new Error("Supabase failed to load.");
        this.client = window.supabase.createClient(this.url, this.key);
    },
    async fetchQuizzes() {
        // Keeps the home screen neatly organized by quiz ID
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
    quiz: {
        id: null,
        title: "",
        questionData: null, // Holds the single question row
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
    init: async () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        State.clearTimer();
        State.activeFilter = 'All';
        const root = document.getElementById('app-root');
        if (!root) return;

        root.innerHTML = `<div class="flex flex-col items-center justify-center mt-32 fade-in"><i class="fas fa-circle-notch fa-spin text-6xl text-primary mb-6"></i><h2 class="text-3xl font-extrabold text-primary tracking-wide uppercase">Opening Vault...</h2></div>`;

        try {
            if (!DB.client) DB.init();
            const { data, error } = await DB.fetchQuizzes();
            if (error) throw error;

            State.quizzes = data.map(quiz => ({ ...quiz, category: App.categorizeQuiz(quiz) }));

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
            console.error(err);
            root.innerHTML = `<div class="text-center text-red-500 font-bold mt-20">Connection Error. Please refresh.</div>`;
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
        if (text.includes('countr') || text.includes('capit') || text.includes('geography') || text.includes('state') || text.includes('ocean') || text.includes('cit')) return 'Geography';
        if (text.includes('scienc') || text.includes('planet') || text.includes('element')) return 'Science';
        if (text.includes('pop') || text.includes('movie') || text.includes('harry potter') || text.includes('disney') || text.includes('zodiac')) return 'Pop Culture';
        if (text.includes('histor') || text.includes('president')) return 'History & Arts';
        if (text.includes('sport') || text.includes('nfl')) return 'Sports & Food';
        return 'General';
    },

    setFilter: (category) => {
        State.activeFilter = category;
        App.renderHome();
    },

    renderHome: () => {
        const root = document.getElementById('app-root');
        const displayedQuizzes = State.activeFilter === 'All' ? State.quizzes : State.quizzes.filter(q => q.category === State.activeFilter);
        
        let filterHtml = `<div class="flex overflow-x-auto gap-3 pb-4 mb-8 justify-start no-scrollbar fade-in px-4 w-full">`;
        State.categories.forEach(cat => {
            const active = State.activeFilter === cat ? "bg-primary text-white border-primary shadow-lg transform scale-105" : "bg-surface text-text-light border-gray-200 hover:border-primary hover:text-primary";
            filterHtml += `<button onclick="App.setFilter('${cat}')" class="px-6 py-2 rounded-full font-black text-sm uppercase tracking-widest whitespace-nowrap transition-all cursor-pointer border-2 ${active}">${cat}</button>`;
        });
        filterHtml += `</div>`;

        let html = `<div class="text-center mb-8 fade-in"><h1 class="text-5xl md:text-6xl font-black text-primary mb-4 uppercase tracking-wider text-shadow">Select a Quiz!</h1></div>${filterHtml}<div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 fade-in">`;

        // Restored and updated dynamic icons!
        const getQuizIconData = (quiz) => {
            const title = (quiz.title || "").toLowerCase();
            if (title.includes('state') || title.includes('cit')) return { icon: 'fa-map', color: 'text-blue-500', bg: 'bg-blue-100' };
            if (title.includes('ocean') || title.includes('continent') || title.includes('geography')) return { icon: 'fa-globe-americas', color: 'text-green-500', bg: 'bg-green-100' };
            if (title.includes('countr') || title.includes('europ') || title.includes('capit')) return { icon: 'fa-landmark', color: 'text-purple-500', bg: 'bg-purple-100' };
            if (title.includes('element') || title.includes('scienc')) return { icon: 'fa-flask', color: 'text-teal-500', bg: 'bg-teal-100' };
            if (title.includes('planet') || title.includes('solar')) return { icon: 'fa-meteor', color: 'text-orange-500', bg: 'bg-orange-100' };
            if (title.includes('harry potter') || title.includes('disney')) return { icon: 'fa-magic', color: 'text-pink-500', bg: 'bg-pink-100' };
            if (title.includes('nfl') || title.includes('sport')) return { icon: 'fa-football-ball', color: 'text-orange-500', bg: 'bg-orange-100' };
            if (title.includes('president')) return { icon: 'fa-flag-usa', color: 'text-red-500', bg: 'bg-red-100' };
            if (title.includes('month') || title.includes('zodiac')) return { icon: 'fa-calendar-alt', color: 'text-indigo-500', bg: 'bg-indigo-100' };
            
            if (quiz.category === 'Geography') return { icon: 'fa-map-marked-alt', color: 'text-blue-500', bg: 'bg-blue-100' };
            if (quiz.category === 'Science') return { icon: 'fa-microscope', color: 'text-teal-500', bg: 'bg-teal-100' };
            if (quiz.category === 'Pop Culture') return { icon: 'fa-gamepad', color: 'text-pink-500', bg: 'bg-pink-100' };
            if (quiz.category === 'History & Arts') return { icon: 'fa-palette', color: 'text-purple-500', bg: 'bg-purple-100' };
            if (quiz.category === 'Sports & Food') return { icon: 'fa-football-ball', color: 'text-orange-500', bg: 'bg-orange-100' };
            return { icon: 'fa-star', color: 'text-yellow-500', bg: 'bg-yellow-100' };
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
                    <span class="font-bold text-sm text-text-main leading-tight">${quiz.title}</span>
                    <span class="text-[10px] text-text-light mt-1 font-black uppercase tracking-wider hidden sm:block">Play Now <i class="fas fa-play text-[8px] ml-1"></i></span>
                </div>
            </button>`;
        });
        
        root.innerHTML = html + `</div>`;
    },

    startQuiz: async (quizId, title, pushState = true) => {
        if (pushState) window.history.pushState({}, '', `?quiz=${encodeURIComponent(title)}`);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        
        const root = document.getElementById('app-root');
        root.innerHTML = `<div class="text-center mt-32 text-primary fade-in"><i class="fas fa-spinner fa-spin text-6xl mb-6"></i></div>`;
        
        try {
            const { data, error } = await DB.fetchQuestions(quizId);
            if (error) throw error;

            State.quiz = {
                id: quizId,
                title: title,
                questionData: data[0], // Only 1 row per quiz now!
                typedAnswers: [],
                timerInterval: null
            };
            App.renderQuizStep();
        } catch (err) {
            console.error(err);
            root.innerHTML = `<div class="text-center text-red-500 font-bold mt-20">Failed to load quiz.</div>`;
        }
    },

    renderQuizStep: () => {
  State.clearTimer();
  const qData = State.quiz.questionData;
  let optionsArray = typeof qData.options === 'string' ? JSON.parse(qData.options) : qData.options;
  const hintData = optionsArray.slice(1);
  
  // ⏱ Calculate dynamic time: 10 seconds per question
  const totalTime = hintData.length * 10;
  
  // Calculate rows for the grid so it perfectly flows Top-to-Bottom, Left-to-Right
  const rows = Math.ceil(hintData.length / 2);
  let quizHtml = `
    <div class="max-w-4xl mx-auto bouncy-card p-6 md:p-10 fade-in flex-grow flex flex-col justify-between">
      <h2 class="text-2xl md:text-4xl font-black text-center mb-8 text-text-main leading-tight">${State.quiz.title} (${totalTime} Seconds!)</h2>
      <div class="sticky top-0 z-30 bg-surface pb-4 mb-2 pt-2 border-b border-transparent shadow-[0_15px_15px_-15px_rgba(0,0,0,0.1)]">
        <div class="flex justify-between items-center mb-4 px-4 bg-background p-3 rounded-xl border-2 border-primary">
          <div class="text-2xl font-black text-red-500"><i class="fas fa-stopwatch mr-2"></i><span id="timer-display">${totalTime}</span>s</div>
          <div id="feedback" class="text-xl font-black uppercase tracking-wide text-text-light">Start Typing...</div>
        </div>
        <input type="text" id="type-input" class="w-full bg-surface border-4 border-primary p-5 rounded-2xl text-text-main text-2xl font-bold text-center focus:border-secondary focus:ring-0 outline-none transition-all shadow-inner" placeholder="Type answer here..." autocomplete="off">
      </div>
      <div class="grid gap-3 mb-6 p-2 border-2 border-background rounded-xl bg-background/30 shadow-inner" style="grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); grid-template-rows: repeat(${rows}, auto); grid-auto-flow: column;">
  `;
  
  hintData.forEach((h, i) => {
    quizHtml += `
        <div class="flex border-2 border-primary rounded-xl overflow-hidden shadow-sm bg-surface">
          <div class="bg-background text-primary font-bold p-3 w-1/2 border-r-2 border-primary flex items-center justify-start text-left text-sm md:text-base">${h.hint || "?"}</div>
          <div id="ans-${i}" class="p-3 w-1/2 font-black flex items-center justify-center text-center text-gray-300 transition-colors duration-300">???</div>
        </div>`;
  });
  
  quizHtml += `
      </div>
      <button onclick="App.finishQuiz()" id="finish-btn" class="btn-3d w-full bg-text-light text-white py-4 mt-4 rounded-xl font-black text-lg md:text-xl tracking-widest uppercase hover:bg-text-main transition-colors">Give Up / Finish</button>
    </div>`;
    
  document.getElementById('app-root').innerHTML = quizHtml;
  
  // Pass the new totalTime to the logic function
  App.setupTypingLogic(qData.correct_answer, hintData, totalTime);
},
    
    // Add totalTime as the third parameter here
setupTypingLogic: (correctAnswerString, hintData, totalTime) => {
  State.quiz.typedAnswers = [];
  const originalAnswers = correctAnswerString.split(',').map(a => a.trim());
  const validAnswers = originalAnswers.map(a => a.toLowerCase());
  const input = document.getElementById('type-input');
  const feedback = document.getElementById('feedback');
  const timerDisplay = document.getElementById('timer-display');
  
  // ⏱ Use the dynamic totalTime instead of a hardcoded 60
  let timeLeft = totalTime;
  
  State.quiz.timerInterval = setInterval(() => {
    timeLeft--;
    timerDisplay.textContent = timeLeft;
    if (timeLeft <= 0) App.finishQuiz(true); // Auto-finish if time runs out
  }, 1000);
  
  setTimeout(() => input.focus(), 100);
  
  input.addEventListener('input', function () {
    const guess = input.value.trim().toLowerCase();
    if (guess === '') return;
    const matchIndex = validAnswers.findIndex(answer => answer === guess);
    
    if (matchIndex !== -1 && !State.quiz.typedAnswers.includes(validAnswers[matchIndex])) {
      const matchedAnswer = originalAnswers[matchIndex];
      State.quiz.typedAnswers.push(validAnswers[matchIndex]);
      const cell = document.getElementById(`ans-${matchIndex}`);
      
      if (cell) {
        cell.textContent = matchedAnswer;
        cell.classList.remove('text-gray-300');
        cell.classList.add('text-white', 'bg-green-500', 'shadow-md');
      }
      
      feedback.innerHTML = `<span class="text-green-500 fade-in"><i class="fas fa-star text-accent mr-2"></i> Found: ${State.quiz.typedAnswers.length} / ${validAnswers.length}</span>`;
      input.value = '';
      
      if (State.quiz.typedAnswers.length === validAnswers.length) {
        App.finishQuiz(false); // Player won!
      }
    }
  });
},

    finishQuiz: (timeExpired = false) => {
        State.clearTimer();
        const input = document.getElementById('type-input');
        const feedback = document.getElementById('feedback');
        const finishBtn = document.getElementById('finish-btn');
        
        const qData = State.quiz.questionData;
        let optionsArray = typeof qData.options === 'string' ? JSON.parse(qData.options) : qData.options;
        const hintData = optionsArray.slice(1);
        const validAnswers = qData.correct_answer.split(',').map(a => a.trim());

        input.disabled = true;
        
        if (State.quiz.typedAnswers.length === validAnswers.length) {
            input.placeholder = "Perfect Score!";
            input.classList.add('bg-green-50', 'border-green-500');
            feedback.innerHTML = `<span class="text-green-500 fade-in font-black"><i class="fas fa-trophy text-accent mr-2"></i> You got them all!</span>`;
        } else {
            input.placeholder = timeExpired ? "Time's up!" : "Quiz Finished!";
            input.classList.add('opacity-50');
            feedback.innerHTML = `<span class="text-red-500 fade-in"><i class="fas ${timeExpired ? 'fa-clock' : 'fa-flag-checkered'} mr-2"></i> ${timeExpired ? "Time's Up!" : "Finished!"}</span>`;
            
            // Reveal missed answers in red
            hintData.forEach((h, i) => {
                const cell = document.getElementById(`ans-${i}`);
                if (cell && cell.textContent === '???') {
                    cell.textContent = h.answer;
                    cell.classList.remove('text-gray-300');
                    cell.classList.add('text-white', 'bg-red-400');
                }
            });
        }

        finishBtn.innerHTML = "See Final Results <i class='fas fa-arrow-right ml-2'></i>";
        finishBtn.classList.replace('bg-text-light', 'bg-primary');
        finishBtn.onclick = App.renderResults;
    },

    renderResults: () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        
        const totalPossible = State.quiz.questionData.correct_answer.split(',').length;
        const score = State.quiz.typedAnswers.length;
        const percentage = (score / totalPossible) * 100;
        
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
                ${score} <span class="text-3xl md:text-4xl text-text-light">/ ${totalPossible}</span>
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
        if (targetQuiz) App.startQuiz(targetQuiz.id, targetQuiz.title, false);
    } else if (State.quizzes.length > 0) {
        App.renderHome();
    } else {
        App.init();
    }
});

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', App.init);
} else {
    App.init();
}
