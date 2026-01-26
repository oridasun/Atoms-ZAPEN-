import React, { useState, useEffect, useMemo } from 'react';
import { getQuestions } from './data';
import { Question, GameState, UserInput, ElementData } from './types';
import { Beaker, Check, ChevronRight, RotateCcw, Trophy, X, ArrowRight, ArrowLeft, Play, Star, Info, HelpCircle } from 'lucide-react';
import confetti from 'canvas-confetti';

const LEVEL_1_LIMIT = 30;
const LEVEL_2_LIMIT = 50;
const GOAL_STARS = 10;

// Helper function to shuffle an array
function shuffleArray<T>(array: T[]): T[] {
  const newArr = [...array];
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
  }
  return newArr;
}

const Glossary = ({ showClose = true, onClose = () => {} }: { showClose?: boolean; onClose?: () => void }) => (
  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-left">
    <div className="bg-emerald-50 p-2.5 rounded-xl border border-emerald-100">
      <div className="flex items-center gap-2 mb-1">
        <span className="bg-emerald-600 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full">Z</span>
        <span className="font-bold text-emerald-900 text-xs">Número Atómico</span>
      </div>
      <p className="text-[10px] text-emerald-700 leading-tight">Cantidad de protones en el núcleo.</p>
    </div>
    <div className="bg-emerald-50 p-2.5 rounded-xl border border-emerald-100">
      <div className="flex items-center gap-2 mb-1">
        <span className="bg-emerald-600 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full">A</span>
        <span className="font-bold text-emerald-900 text-xs">Número Másico</span>
      </div>
      <p className="text-[10px] text-emerald-700 leading-tight">Suma de protones y neutrones (P + N).</p>
    </div>
    <div className="bg-emerald-50 p-2.5 rounded-xl border border-emerald-100">
      <div className="flex items-center gap-2 mb-1">
        <span className="bg-emerald-600 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full">P</span>
        <span className="font-bold text-emerald-900 text-xs">Protones</span>
      </div>
      <p className="text-[10px] text-emerald-700 leading-tight">Partículas positivas. Igual a Z.</p>
    </div>
    <div className="bg-emerald-50 p-2.5 rounded-xl border border-emerald-100">
      <div className="flex items-center gap-2 mb-1">
        <span className="bg-emerald-600 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full">E</span>
        <span className="font-bold text-emerald-900 text-xs">Electrones</span>
      </div>
      <p className="text-[10px] text-emerald-700 leading-tight">Partículas negativas fuera del núcleo.</p>
    </div>
    <div className="bg-emerald-50 p-2.5 rounded-xl border border-emerald-100">
      <div className="flex items-center gap-2 mb-1">
        <span className="bg-emerald-600 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full">N</span>
        <span className="font-bold text-emerald-900 text-xs">Neutrones</span>
      </div>
      <p className="text-[10px] text-emerald-700 leading-tight">Partículas sin carga. (N = A - Z).</p>
    </div>
    <div className="bg-emerald-50 p-2.5 rounded-xl border border-emerald-100">
      <div className="flex items-center gap-2 mb-1">
        <span className="bg-emerald-600 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full">C</span>
        <span className="font-bold text-emerald-900 text-xs">Carga Eléctrica</span>
      </div>
      <p className="text-[10px] text-emerald-700 leading-tight">Diferencia entre protones y electrones (P - E).</p>
    </div>
  </div>
);

function App() {
  const [gameState, setGameState] = useState<GameState>('MENU');
  const [level, setLevel] = useState<1 | 2>(1);
  const [allQuestions, setAllQuestions] = useState<Question[]>([]);
  const [activeQuestions, setActiveQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [stars, setStars] = useState(0);
  const [failures, setFailures] = useState(0);
  const [userInput, setUserInput] = useState<UserInput>(createEmptyInput());
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);
  const [showInfo, setShowInfo] = useState(false);

  useEffect(() => {
    const loaded = getQuestions();
    setAllQuestions(loaded);
  }, []);

  function createEmptyInput(): UserInput {
    return {
      symbol: '',
      name: '',
      z: '',
      a: '',
      p: '',
      e: '',
      n: '',
      charge: '',
    };
  }

  const currentQuestion = activeQuestions[currentIndex];

  const startGame = (selectedLevel: 1 | 2) => {
    setLevel(selectedLevel);
    const pool = selectedLevel === 1 
      ? allQuestions.slice(0, LEVEL_1_LIMIT) 
      : allQuestions.slice(0, LEVEL_2_LIMIT);
    const shuffled = shuffleArray(pool);
    setActiveQuestions(shuffled);
    setCurrentIndex(0);
    setStars(0);
    setFailures(0);
    setFeedback(null);
    setUserInput(createEmptyInput());
    setGameState('PLAYING');
    // Force concepts to be open for level 1, hidden for level 2
    setShowInfo(selectedLevel === 1);
  };

  const handleInputChange = (field: keyof UserInput, value: string) => {
    setUserInput(prev => ({ ...prev, [field]: value }));
  };

  const normalizeCharge = (val: string) => {
    const v = val.trim();
    if (!v || v === '0') return '0';
    if (v.endsWith('+') || v.endsWith('-')) return v;
    if (v.startsWith('+')) return v.substring(1) + '+';
    if (v.startsWith('-')) return v.substring(1) + '-';
    return v;
  };

  const checkAnswer = () => {
    if (!currentQuestion) return;
    let isAllCorrect = true;
    currentQuestion.hiddenFields.forEach(field => {
      let userVal = userInput[field as keyof UserInput].trim();
      let correctVal = String(currentQuestion[field as keyof ElementData]);
      if (field === 'charge') {
        userVal = normalizeCharge(userVal);
        correctVal = normalizeCharge(correctVal);
      } else if (field === 'name') {
        userVal = userVal.toLowerCase();
        correctVal = correctVal.toLowerCase();
      }
      if (userVal !== correctVal) isAllCorrect = false;
    });

    if (isAllCorrect) {
      setFeedback('correct');
      setStars(s => {
          const newStars = s + 1;
          if (newStars === GOAL_STARS) triggerConfetti();
          return newStars;
      });
    } else {
      setFeedback('incorrect');
      setFailures(f => f + 1);
    }
  };

  const triggerConfetti = () => {
    const duration = 3 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };
    const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;
    const interval: any = setInterval(function() {
      const timeLeft = animationEnd - Date.now();
      if (timeLeft <= 0) return clearInterval(interval);
      const particleCount = 50 * (timeLeft / duration);
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
    }, 250);
  };

  const nextQuestion = () => {
    if (stars >= GOAL_STARS) {
      setGameState('SUMMARY');
      return;
    }
    setFeedback(null);
    setUserInput(createEmptyInput());
    if (currentIndex < activeQuestions.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      const pool = level === 1 ? allQuestions.slice(0, LEVEL_1_LIMIT) : allQuestions.slice(0, LEVEL_2_LIMIT);
      setActiveQuestions(shuffleArray(pool));
      setCurrentIndex(0);
    }
  };

  const getFirstHiddenField = (): keyof UserInput | null => {
    if (!currentQuestion) return null;
    const order: (keyof UserInput)[] = ['name', 'symbol', 'z', 'a', 'p', 'e', 'n', 'charge'];
    return order.find(field => currentQuestion.hiddenFields.includes(field as keyof ElementData)) || null;
  };
  const firstHiddenField = getFirstHiddenField();

  if (gameState === 'MENU') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-600 to-teal-900 flex items-center justify-center p-4 font-sans">
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center border-4 border-emerald-100">
          <div className="flex justify-center mb-6">
            <div className="bg-emerald-100 p-4 rounded-full">
              <Beaker className="w-12 h-12 text-emerald-600" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-emerald-900 mb-2">Atom Master</h1>
          <p className="text-emerald-600/70 mb-8 text-sm px-4">Completa la tabla de estructura atómica y consigue 10 estrellas.</p>
          
          <div className="space-y-4">
            <button onClick={() => startGame(1)} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-4 px-6 rounded-2xl transition-all flex items-center justify-between group shadow-lg shadow-emerald-200">
              <div className="text-left">
                <div className="text-lg">Nivel 1</div>
                <div className="text-emerald-100 text-xs">Átomos Neutros</div>
              </div>
              <ChevronRight className="w-6 h-6 text-emerald-100 group-hover:text-white" />
            </button>
            <button onClick={() => startGame(2)} className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold py-4 px-6 rounded-2xl transition-all flex items-center justify-between group shadow-lg shadow-teal-200">
              <div className="text-left">
                <div className="text-lg">Nivel 2</div>
                <div className="text-teal-200 text-xs">Átomos + Iones</div>
              </div>
              <ChevronRight className="w-6 h-6 text-teal-200 group-hover:text-white" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (gameState === 'SUMMARY') {
    return (
      <div className="min-h-screen bg-emerald-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-10 max-w-md w-full text-center animate-in fade-in zoom-in duration-500 border-4 border-emerald-100">
          <div className="flex justify-center mb-6">
            <div className="bg-emerald-100 p-6 rounded-full">
                <Trophy className="w-16 h-16 text-emerald-600" />
            </div>
          </div>
          <h2 className="text-2xl font-black mb-2 text-emerald-900 uppercase">¡Misión cumplida!</h2>
          <p className="text-emerald-600 font-medium mb-8 uppercase tracking-widest text-[10px]">Has obtenido las 10 estrellas</p>
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-100">
                <div className="text-3xl font-black text-emerald-800 mb-1">{stars}</div>
                <div className="text-[10px] font-bold text-emerald-500 uppercase">Puntos</div>
            </div>
            <div className="bg-red-50 rounded-2xl p-4 border border-red-100">
                <div className="text-3xl font-black text-red-800 mb-1">{failures}</div>
                <div className="text-[10px] font-bold text-red-500 uppercase">Fallos</div>
            </div>
          </div>
          <button onClick={() => setGameState('MENU')} className="w-full bg-emerald-800 hover:bg-emerald-900 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all transform active:scale-95 shadow-xl shadow-emerald-900/20">
            <RotateCcw size={20} />
            Volver a empezar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-start py-4 px-2 font-sans">
      <div className="w-full max-w-[1000px] flex justify-between items-center mb-4 px-2">
         <div className="flex items-center gap-3">
             <button 
               onClick={() => setGameState('MENU')}
               className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-100 transition-all shadow-sm active:scale-90"
               title="Volver al menú inicial"
             >
               <ArrowLeft size={18} />
             </button>
             <div className="flex items-center gap-2 border-l border-emerald-50 pl-3">
                 <Beaker size={20} className="text-emerald-600" />
                 <div>
                    <h1 className="text-emerald-900 font-bold text-lg leading-none">Atom Master</h1>
                    <div className="text-emerald-600 text-[9px] font-bold tracking-widest uppercase mt-0.5">Nivel {level}</div>
                 </div>
             </div>
         </div>
         <div className="flex items-center gap-4">
             {level === 2 && (
               <button 
                onClick={() => setShowInfo(!showInfo)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all font-bold text-[10px] uppercase tracking-wider ${showInfo ? 'bg-emerald-600 text-white shadow-md' : 'bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-100'}`}
               >
                 <HelpCircle size={14} />
                 <span>Conceptos</span>
               </button>
             )}
             <div className="flex gap-0.5 items-center bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100">
                 <span className="text-[9px] uppercase tracking-wider text-emerald-500 font-bold mr-1">Estrellas:</span>
                 {[...Array(GOAL_STARS)].map((_, i) => (
                    <Star key={i} size={14} className={`${i < stars ? 'text-yellow-400 fill-yellow-400 animate-star' : 'text-emerald-200'}`} />
                 ))}
             </div>
             <div className="text-right">
                 <span className="text-[9px] uppercase tracking-wider text-red-400 font-bold block leading-none">Fallos</span>
                 <span className="text-lg font-black text-red-500">{failures}</span>
             </div>
         </div>
      </div>

      {showInfo && (
        <div className="w-full max-w-[1000px] mb-4 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl animate-in slide-in-from-top-2 duration-300">
           <div className="flex justify-between items-center mb-3">
             <h3 className="text-xs font-bold text-emerald-900 uppercase flex items-center gap-2">
               <HelpCircle size={14} />
               Guía de Conceptos Básicos
             </h3>
             {level === 2 && (
               <button onClick={() => setShowInfo(false)} className="text-emerald-400 hover:text-emerald-600 bg-white p-1 rounded-full border border-emerald-100 shadow-sm"><X size={14} /></button>
             )}
           </div>
           <Glossary showClose={level === 2} onClose={() => setShowInfo(false)} />
        </div>
      )}

      <div className="w-full max-w-[1000px] bg-white rounded-2xl shadow-xl border-2 border-emerald-100 overflow-hidden">
          <div className="overflow-x-auto scrollbar-hide">
            <div className="min-w-[780px] grid grid-cols-[40px_1.5fr_1fr_0.7fr_0.7fr_0.7fr_0.7fr_0.7fr_0.8fr]">
              <div className="bg-[#8fcfa8] h-12 flex items-center justify-center border-r border-emerald-900/10"></div>
              <HeaderCell label="Nombre" />
              <HeaderCell label="Símbolo" />
              <HeaderCell label="Z" />
              <HeaderCell label="A" />
              <HeaderCell label="P" />
              <HeaderCell label="E" />
              <HeaderCell label="N" />
              <HeaderCell label="Carga" />

              <div className="contents" key={currentIndex}>
                <div className="bg-[#bbf7d0]/30 flex items-center justify-center font-bold text-emerald-700 border-r border-emerald-100 text-base">
                    {stars + 1}
                </div>
                <Cell field="name" question={currentQuestion} userInput={userInput} onChange={handleInputChange} isResult={feedback !== null} shouldFocus={firstHiddenField === 'name'} />
                <Cell field="symbol" question={currentQuestion} userInput={userInput} onChange={handleInputChange} isResult={feedback !== null} shouldFocus={firstHiddenField === 'symbol'} isSymbolColumn />
                <Cell field="z" question={currentQuestion} userInput={userInput} onChange={handleInputChange} isResult={feedback !== null} shouldFocus={firstHiddenField === 'z'} />
                <Cell field="a" question={currentQuestion} userInput={userInput} onChange={handleInputChange} isResult={feedback !== null} shouldFocus={firstHiddenField === 'a'} />
                <Cell field="p" question={currentQuestion} userInput={userInput} onChange={handleInputChange} isResult={feedback !== null} shouldFocus={firstHiddenField === 'p'} />
                <Cell field="e" question={currentQuestion} userInput={userInput} onChange={handleInputChange} isResult={feedback !== null} shouldFocus={firstHiddenField === 'e'} />
                <Cell field="n" question={currentQuestion} userInput={userInput} onChange={handleInputChange} isResult={feedback !== null} shouldFocus={firstHiddenField === 'n'} />
                <Cell field="charge" question={currentQuestion} userInput={userInput} onChange={handleInputChange} isResult={feedback !== null} shouldFocus={firstHiddenField === 'charge'} />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 w-full max-w-[1000px] flex justify-between items-center px-2">
           <div className="flex-1">
             {feedback === 'correct' && (
                <div className="flex items-center text-emerald-600 animate-in fade-in slide-in-from-left-2 duration-300 bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-100 inline-flex">
                  <Star className="w-4 h-4 fill-emerald-600 mr-2" />
                  <div>
                    <span className="font-bold text-base block leading-tight">¡Correcto!</span>
                  </div>
                </div>
             )}
             {feedback === 'incorrect' && (
               <div className="flex items-center text-red-600 animate-in fade-in slide-in-from-left-2 duration-300 bg-red-50 px-4 py-2 rounded-xl border border-red-100 inline-flex">
                  <X className="w-4 h-4 mr-2" />
                  <div>
                    <span className="font-bold text-base block leading-tight">Vuelve a mirar</span>
                  </div>
               </div>
             )}
           </div>
           <div>
             {feedback === null ? (
               <button onClick={checkAnswer} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-8 rounded-xl shadow-md transition-all flex items-center gap-2 transform active:scale-95 text-base">
                Comprobar <Play size={18} className="fill-current" />
              </button>
             ) : (
               <button onClick={nextQuestion} className={`font-bold py-3 px-8 rounded-xl shadow-md transition-all flex items-center gap-2 transform active:scale-95 text-base ${feedback === 'correct' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-slate-800 hover:bg-slate-900 text-white'}`} autoFocus>
                {stars >= GOAL_STARS ? 'Finalizar' : 'Siguiente'} <ArrowRight size={18} />
              </button>
             )}
          </div>
        </div>
    </div>
  );
}

const HeaderCell = ({ label }: { label: string }) => (
  <div className="bg-[#8fcfa8] h-12 flex items-center justify-center border-r border-emerald-900/10 last:border-r-0">
    <span className="font-bold text-emerald-950 text-[10px] uppercase tracking-wider">{label}</span>
  </div>
);

const IsotopeDisplay = ({ symbol, a, z, charge, hiddenA, hiddenZ }: { symbol: string, a: number, z: number, charge: string, hiddenA: boolean, hiddenZ: boolean }) => {
  const chargeDisplay = charge === '0' ? '' : charge;
  return (
    <div className="inline-flex items-center scale-90">
      <div className="flex flex-col text-[8px] leading-[8px] mr-0.5 text-right font-bold text-emerald-800">
        <span className="mb-[1px]">{hiddenA ? '?' : a}</span>
        <span>{hiddenZ ? '?' : z}</span>
      </div>
      <span className="text-lg font-serif text-emerald-900 leading-none">{symbol}</span>
      <span className="text-[10px] font-bold text-emerald-800 self-start ml-0.5 -mt-0.5">{chargeDisplay}</span>
    </div>
  );
};

interface CellProps {
  field: keyof UserInput;
  question: Question;
  userInput: UserInput;
  onChange: (field: keyof UserInput, value: string) => void;
  isResult: boolean;
  shouldFocus?: boolean;
  isSymbolColumn?: boolean;
}

const Cell: React.FC<CellProps> = ({ field, question, userInput, onChange, isResult, shouldFocus, isSymbolColumn }) => {
  const isHidden = question.hiddenFields.includes(field as keyof ElementData);
  const correctValue = String(question[field as keyof ElementData]);
  const userValue = userInput[field];

  const isError = isResult && isHidden && (
      field === 'charge' 
      ? (userValue.trim() !== correctValue && (userValue.trim() !== '0' || correctValue !== '0'))
      : userValue.toLowerCase().trim() !== correctValue.toLowerCase().trim()
  );

  const containerClasses = "p-1.5 flex items-center justify-center border-r border-slate-100 last:border-r-0 h-16 relative bg-white";

  if (!isHidden) {
    return (
      <div className={containerClasses}>
        {isSymbolColumn ? (
           <IsotopeDisplay symbol={question.symbol} a={question.a} z={question.z} charge={question.charge} hiddenA={question.hiddenFields.includes('a')} hiddenZ={question.hiddenFields.includes('z')} />
        ) : (
          <span className={`text-emerald-900 font-semibold ${field === 'symbol' ? 'text-lg font-serif' : 'text-sm'}`}>
            {field === 'charge' && correctValue === '0' ? '0' : correctValue}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={`${containerClasses} ${isResult ? 'bg-white' : 'bg-[#e6f4ea]'}`}>
      {isResult ? (
        <div className="flex flex-col items-center w-full leading-tight">
            <div className={`text-sm font-bold ${isError ? 'text-red-500 line-through' : 'text-emerald-600'}`}>
                {userValue || <span className="text-[10px] text-slate-300 italic">...</span>}
            </div>
            {isError && (
                <div className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-1 rounded border border-emerald-100 mt-0.5">
                    {correctValue}
                </div>
            )}
        </div>
      ) : (
        <div className="w-full h-full flex items-center justify-center">
            <input
            type="text"
            value={userInput[field]}
            onChange={(e) => onChange(field, e.target.value)}
            placeholder=""
            autoComplete="off"
            autoFocus={shouldFocus}
            className={`w-full h-8 text-center bg-white border border-emerald-200 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all font-bold text-sm text-emerald-900 shadow-sm ${isSymbolColumn ? 'font-serif' : ''}`}
            />
        </div>
      )}
    </div>
  );
};

export default App;
