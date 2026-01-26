
import React, { useState, useEffect, useCallback } from 'react';
import { getQuestions } from './data';
import { Question, GameState, UserInput, ElementData } from './types';
import { 
  Check, ChevronRight, RotateCcw, Trophy, X, 
  ArrowRight, ArrowLeft, Play, Star, HelpCircle, 
  Sparkles, Loader2, Info, BookOpen
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { GoogleGenAI } from "@google/genai";

const LEVEL_1_LIMIT = 30;
const LEVEL_2_LIMIT = 50;
const GOAL_STARS = 10;

// Componente de Átomo de Rutherford personalizado
const RutherfordAtom = ({ className = "w-12 h-12", color = "currentColor" }: { className?: string, color?: string }) => (
  <svg 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke={color} 
    strokeWidth="1.5" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    {/* Nucleus */}
    <circle cx="12" cy="12" r="2.5" fill={color} />
    
    {/* Orbits */}
    <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(0 12 12)" />
    <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(60 12 12)" />
    <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(120 12 12)" />
    
    {/* Electrons */}
    <circle cx="22" cy="12" r="0.8" fill={color} />
    <circle cx="7" cy="16.3" r="0.8" fill={color} />
    <circle cx="7" cy="7.7" r="0.8" fill={color} />
  </svg>
);

function shuffleArray<T>(array: T[]): T[] {
  const newArr = [...array];
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
  }
  return newArr;
}

const FormulaBadge = ({ label, formula }: { label: string, formula: string }) => (
  <div className="bg-white/50 border border-emerald-100 rounded-lg p-2 flex flex-col items-center justify-center min-w-[80px]">
    <span className="text-[9px] font-bold text-emerald-600 uppercase mb-1">{label}</span>
    <span className="text-xs font-mono font-bold text-emerald-900">{formula}</span>
  </div>
);

const Glossary = () => (
  <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
    <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100">
      <div className="flex items-center gap-2 mb-1">
        <span className="bg-emerald-600 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full">Z</span>
        <span className="font-bold text-emerald-900 text-xs">Nº Atómico</span>
      </div>
      <p className="text-[10px] text-emerald-700 leading-tight">Protones en el núcleo. Define el elemento.</p>
    </div>
    <div className="bg-blue-50 p-3 rounded-xl border border-blue-100">
      <div className="flex items-center gap-2 mb-1">
        <span className="bg-blue-600 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full">A</span>
        <span className="font-bold text-blue-900 text-xs">Nº Másico</span>
      </div>
      <p className="text-[10px] text-blue-700 leading-tight">Masa total: Protones + Neutrones (P + N).</p>
    </div>
    <div className="bg-purple-50 p-3 rounded-xl border border-purple-100">
      <div className="flex items-center gap-2 mb-1">
        <span className="bg-purple-600 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full">E</span>
        <span className="font-bold text-purple-900 text-xs">Electrones</span>
      </div>
      <p className="text-[10px] text-purple-700 leading-tight">Carga negativa. En átomos neutros E = P.</p>
    </div>
    <div className="bg-orange-50 p-3 rounded-xl border border-orange-100">
      <div className="flex items-center gap-2 mb-1">
        <span className="bg-orange-600 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full">N</span>
        <span className="font-bold text-orange-900 text-xs">Neutrones</span>
      </div>
      <p className="text-[10px] text-orange-700 leading-tight">Partículas neutras. Se hallan con A - Z.</p>
    </div>
    <div className="bg-rose-50 p-3 rounded-xl border border-rose-100 col-span-2 lg:col-span-1">
      <div className="flex items-center gap-2 mb-1">
        <span className="bg-rose-600 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full">C</span>
        <span className="font-bold text-rose-900 text-xs">Carga</span>
      </div>
      <p className="text-[10px] text-rose-700 leading-tight">Balance eléctrico: Protones - Electrones.</p>
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
  const [aiLoading, setAiLoading] = useState(false);
  const [aiExplanation, setAiExplanation] = useState<string | null>(null);

  useEffect(() => {
    setAllQuestions(getQuestions());
  }, []);

  function createEmptyInput(): UserInput {
    return { symbol: '', name: '', z: '', a: '', p: '', e: '', n: '', charge: '' };
  }

  const currentQuestion = activeQuestions[currentIndex];

  const startGame = (selectedLevel: 1 | 2) => {
    setLevel(selectedLevel);
    const pool = selectedLevel === 1 
      ? allQuestions.slice(0, LEVEL_1_LIMIT) 
      : allQuestions.slice(0, LEVEL_2_LIMIT);
    setActiveQuestions(shuffleArray(pool));
    setCurrentIndex(0);
    setStars(0);
    setFailures(0);
    setFeedback(null);
    setUserInput(createEmptyInput());
    setGameState('PLAYING');
    setShowInfo(selectedLevel === 1);
  };

  const handleInputChange = (field: keyof UserInput, value: string) => {
    setUserInput(prev => ({ ...prev, [field]: value }));
  };

  const normalizeCharge = (val: string) => {
    const v = val.trim().toLowerCase();
    if (!v || v === '0' || v === 'neutro') return '0';
    const match = v.match(/^([+-])?(\d+)([+-])?$/);
    if (match) {
      const num = match[2];
      const sign = match[1] || match[3] || '+';
      return `${num}${sign}`;
    }
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
      } else if (field === 'name' || field === 'symbol') {
        userVal = userVal.toLowerCase();
        correctVal = correctVal.toLowerCase();
      }
      
      if (userVal !== correctVal) isAllCorrect = false;
    });

    if (isAllCorrect) {
      setFeedback('correct');
      setStars(s => {
        const next = s + 1;
        if (next === GOAL_STARS) triggerConfetti();
        return next;
      });
      setAiExplanation(null);
    } else {
      setFeedback('incorrect');
      setFailures(f => f + 1);
    }
  };

  const triggerConfetti = () => {
    confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 }, colors: ['#10b981', '#34d399', '#059669'] });
  };

  const askGemini = async () => {
    if (!currentQuestion) return;
    setAiLoading(true);
    setAiExplanation(null);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `Actúa como un profesor de química experto y amable. Explica brevemente la estructura atómica del siguiente elemento/ion: 
      Nombre: ${currentQuestion.name}, Símbolo: ${currentQuestion.symbol}, Z: ${currentQuestion.z}, A: ${currentQuestion.a}, Protones: ${currentQuestion.p}, Electrones: ${currentQuestion.e}, Neutrones: ${currentQuestion.n}, Carga: ${currentQuestion.charge}. 
      Responde en 3-4 frases cortas explicando por qué tiene esos valores de electrones y neutrones basándote en la carga y el número másico. Usa un tono motivador.`;
      
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt
      });
      setAiExplanation(response.text);
    } catch (error) {
      setAiExplanation("Lo siento, no pude conectar con mi cerebro de IA en este momento. ¡Revisa las fórmulas!");
    } finally {
      setAiLoading(false);
    }
  };

  const nextQuestion = () => {
    if (stars >= GOAL_STARS) {
      setGameState('SUMMARY');
      return;
    }
    setFeedback(null);
    setAiExplanation(null);
    setUserInput(createEmptyInput());
    if (currentIndex < activeQuestions.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      const pool = level === 1 ? allQuestions.slice(0, LEVEL_1_LIMIT) : allQuestions.slice(0, LEVEL_2_LIMIT);
      setActiveQuestions(shuffleArray(pool));
      setCurrentIndex(0);
    }
  };

  const firstHiddenField = useCallback(() => {
    if (!currentQuestion) return null;
    const order: (keyof UserInput)[] = ['name', 'symbol', 'z', 'a', 'p', 'e', 'n', 'charge'];
    return order.find(field => currentQuestion.hiddenFields.includes(field as keyof ElementData)) || null;
  }, [currentQuestion]);

  if (gameState === 'MENU') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-700 via-emerald-600 to-teal-800 flex items-center justify-center p-6">
        <div className="bg-white rounded-[2.5rem] shadow-2xl p-10 max-w-lg w-full text-center border-8 border-white/20 glass-card relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
             <RutherfordAtom className="w-32 h-32" color="#10b981" />
          </div>
          <div className="flex justify-center mb-8">
            <div className="bg-emerald-100 p-6 rounded-3xl rotate-3 shadow-inner">
              <RutherfordAtom className="w-16 h-16" color="#059669" />
            </div>
          </div>
          <h1 className="text-4xl font-black text-emerald-900 mb-2 tracking-tight">Atom Master</h1>
          <p className="text-emerald-700/70 mb-10 text-sm font-medium">Domina la estructura atómica y consigue 10 estrellas.</p>
          
          <div className="space-y-4">
            <button onClick={() => startGame(1)} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-5 px-8 rounded-2xl transition-all flex items-center justify-between group shadow-xl shadow-emerald-200/50 hover:-translate-y-1">
              <div className="text-left">
                <div className="text-xl">Nivel 1</div>
                <div className="text-emerald-100 text-xs font-normal">Átomos Neutros (Carga 0)</div>
              </div>
              <ChevronRight className="w-8 h-8 text-emerald-200 group-hover:text-white group-hover:translate-x-1 transition-all" />
            </button>
            <button onClick={() => startGame(2)} className="w-full bg-teal-800 hover:bg-teal-900 text-white font-bold py-5 px-8 rounded-2xl transition-all flex items-center justify-between group shadow-xl shadow-teal-900/20 hover:-translate-y-1">
              <div className="text-left">
                <div className="text-xl">Nivel 2</div>
                <div className="text-teal-300 text-xs font-normal">Iones y Átomos Neutros</div>
              </div>
              <ChevronRight className="w-8 h-8 text-teal-400 group-hover:text-white group-hover:translate-x-1 transition-all" />
            </button>
          </div>
          <div className="mt-8 pt-6 border-t border-emerald-50 text-[10px] text-emerald-600/50 font-bold uppercase tracking-widest">
            Aprende Química con IA
          </div>
        </div>
      </div>
    );
  }

  if (gameState === 'SUMMARY') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-[3rem] shadow-2xl p-12 max-w-md w-full text-center border-4 border-emerald-100 animate-in zoom-in-95 duration-500">
          <div className="flex justify-center mb-8 relative">
            <div className="absolute inset-0 bg-yellow-400/20 blur-3xl rounded-full scale-150"></div>
            <div className="bg-yellow-50 p-8 rounded-full border-4 border-yellow-100 relative">
                <Trophy className="w-20 h-20 text-yellow-500" />
            </div>
          </div>
          <h2 className="text-3xl font-black mb-2 text-slate-900">¡ESPECTACULAR!</h2>
          <p className="text-emerald-600 font-bold mb-10 uppercase tracking-[0.2em] text-xs">Has dominado los átomos</p>
          <div className="grid grid-cols-2 gap-4 mb-10">
            <div className="bg-emerald-50 rounded-3xl p-6 border border-emerald-100">
                <div className="text-4xl font-black text-emerald-700 mb-1">{stars}</div>
                <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Estrellas</div>
            </div>
            <div className="bg-rose-50 rounded-3xl p-6 border border-rose-100">
                <div className="text-4xl font-black text-rose-700 mb-1">{failures}</div>
                <div className="text-[10px] font-bold text-rose-400 uppercase tracking-widest">Errores</div>
            </div>
          </div>
          <button onClick={() => setGameState('MENU')} className="w-full bg-slate-900 hover:bg-black text-white font-black py-5 rounded-2xl flex items-center justify-center gap-3 transition-all shadow-2xl hover:scale-[1.02] active:scale-95">
            <RotateCcw size={22} />
            REINTENTAR
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-start py-6 px-4">
      {/* Header Bar */}
      <div className="w-full max-w-5xl flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
         <div className="flex items-center gap-4">
             <button 
               onClick={() => setGameState('MENU')}
               className="p-3 rounded-2xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all active:scale-90"
             >
               <ArrowLeft size={20} />
             </button>
             <div className="flex items-center gap-3 border-l-2 border-emerald-100 pl-4">
                 <div className="bg-emerald-600 p-2 rounded-xl text-white">
                    <RutherfordAtom className="w-6 h-6" color="white" />
                 </div>
                 <div>
                    <h1 className="text-slate-900 font-black text-xl leading-none">Atom Master</h1>
                    <div className="text-emerald-600 text-[10px] font-black tracking-widest uppercase mt-1">MODO: NIVEL {level}</div>
                 </div>
             </div>
         </div>

         <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-3xl border border-slate-100">
             <div className="flex gap-1 items-center px-4 py-2 bg-white rounded-2xl shadow-sm border border-slate-200">
                 <span className="text-[10px] uppercase tracking-widest text-slate-400 font-black mr-2">Puntos</span>
                 {[...Array(GOAL_STARS)].map((_, i) => (
                    <Star key={i} size={16} className={`${i < stars ? 'text-yellow-400 fill-yellow-400 animate-star' : 'text-slate-200'}`} />
                 ))}
             </div>
             <div className="px-4 py-2 bg-rose-50 rounded-2xl border border-rose-100 flex items-center gap-3">
                 <span className="text-[10px] uppercase tracking-widest text-rose-400 font-black">Fallos</span>
                 <span className="text-xl font-black text-rose-600">{failures}</span>
             </div>
         </div>
      </div>

      {/* Formulas & Concepts Section */}
      <div className="w-full max-w-5xl mb-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8">
           <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-200">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xs font-black text-slate-800 uppercase flex items-center gap-2">
                  <BookOpen size={16} className="text-emerald-500" />
                  Machete de Fórmulas
                </h3>
                <button onClick={() => setShowInfo(!showInfo)} className="text-xs text-emerald-600 font-bold hover:underline">
                  {showInfo ? 'Ocultar Guía' : 'Ver Guía Completa'}
                </button>
              </div>
              <div className="flex flex-wrap gap-3">
                 <FormulaBadge label="Nº Másico" formula="A = Z + N" />
                 <FormulaBadge label="Nº Atómico" formula="Z = P" />
                 <FormulaBadge label="Carga" formula="C = P - E" />
                 <FormulaBadge label="Neutrones" formula="N = A - Z" />
                 <FormulaBadge label="Electrones" formula="E = P - C" />
              </div>
              {showInfo && (
                <div className="mt-5 pt-5 border-t border-slate-100 animate-in slide-in-from-top-2">
                  <Glossary />
                </div>
              )}
           </div>
        </div>
        <div className="lg:col-span-4">
           <div className="h-full bg-emerald-600 rounded-3xl p-6 text-white flex flex-col justify-center relative overflow-hidden shadow-xl shadow-emerald-200">
              <Sparkles className="absolute top-2 right-2 opacity-20 w-12 h-12" />
              <div className="relative z-10">
                <h4 className="text-xs font-black uppercase tracking-widest mb-2 text-emerald-200">Objetivo Actual</h4>
                <p className="text-2xl font-bold leading-tight">Completa los huecos para ganar la estrella #{stars + 1}</p>
              </div>
           </div>
        </div>
      </div>

      {/* Main Game Table */}
      <div className="w-full max-w-5xl bg-white rounded-[2rem] shadow-2xl border-4 border-slate-100 overflow-hidden mb-6">
          <div className="overflow-x-auto">
            <div className="min-w-[850px] grid grid-cols-[60px_1.5fr_1fr_0.8fr_0.8fr_0.8fr_0.8fr_0.8fr_1fr]">
              <HeaderCell label="#" />
              <HeaderCell label="Nombre" />
              <HeaderCell label="Símbolo" />
              <HeaderCell label="Z" />
              <HeaderCell label="A" />
              <HeaderCell label="P" />
              <HeaderCell label="E" />
              <HeaderCell label="N" />
              <HeaderCell label="Carga" />

              <div className="contents" key={currentIndex}>
                <div className="bg-slate-50 flex items-center justify-center font-black text-slate-400 border-r border-slate-100 text-lg">
                    {stars + 1}
                </div>
                <Cell field="name" question={currentQuestion} userInput={userInput} onChange={handleInputChange} isResult={feedback !== null} shouldFocus={firstHiddenField() === 'name'} />
                <Cell field="symbol" question={currentQuestion} userInput={userInput} onChange={handleInputChange} isResult={feedback !== null} shouldFocus={firstHiddenField() === 'symbol'} isSymbolColumn />
                <Cell field="z" question={currentQuestion} userInput={userInput} onChange={handleInputChange} isResult={feedback !== null} shouldFocus={firstHiddenField() === 'z'} />
                <Cell field="a" question={currentQuestion} userInput={userInput} onChange={handleInputChange} isResult={feedback !== null} shouldFocus={firstHiddenField() === 'a'} />
                <Cell field="p" question={currentQuestion} userInput={userInput} onChange={handleInputChange} isResult={feedback !== null} shouldFocus={firstHiddenField() === 'p'} />
                <Cell field="e" question={currentQuestion} userInput={userInput} onChange={handleInputChange} isResult={feedback !== null} shouldFocus={firstHiddenField() === 'e'} />
                <Cell field="n" question={currentQuestion} userInput={userInput} onChange={handleInputChange} isResult={feedback !== null} shouldFocus={firstHiddenField() === 'n'} />
                <Cell field="charge" question={currentQuestion} userInput={userInput} onChange={handleInputChange} isResult={feedback !== null} shouldFocus={firstHiddenField() === 'charge'} />
              </div>
            </div>
          </div>
      </div>

      {/* Feedback & Actions */}
      <div className="w-full max-w-5xl flex flex-col md:flex-row justify-between items-start gap-6">
           <div className="flex-1 space-y-4 w-full">
             {feedback === 'correct' && (
                <div className="flex items-center gap-4 bg-emerald-50 border-2 border-emerald-200 p-4 rounded-2xl animate-in slide-in-from-left-4 duration-300">
                  <div className="bg-emerald-500 text-white p-2 rounded-xl">
                    <Check size={24} />
                  </div>
                  <div>
                    <h4 className="font-black text-emerald-900 leading-none mb-1">¡IMPECABLE!</h4>
                    <p className="text-emerald-700 text-xs">Has calculado los valores correctamente.</p>
                  </div>
                </div>
             )}
             {feedback === 'incorrect' && (
               <div className="flex flex-col gap-3 w-full animate-in slide-in-from-left-4 duration-300">
                 <div className="flex items-center gap-4 bg-rose-50 border-2 border-rose-200 p-4 rounded-2xl">
                    <div className="bg-rose-500 text-white p-2 rounded-xl">
                      <X size={24} />
                    </div>
                    <div>
                      <h4 className="font-black text-rose-900 leading-none mb-1">HAY ALGÚN ERROR</h4>
                      <p className="text-rose-700 text-xs">Revisa las fórmulas o pide ayuda a la IA.</p>
                    </div>
                 </div>
                 <button 
                  onClick={askGemini} 
                  disabled={aiLoading}
                  className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-2xl transition-all shadow-lg active:scale-95 disabled:opacity-50"
                 >
                   {aiLoading ? <Loader2 className="animate-spin" size={20} /> : <Sparkles size={20} />}
                   {aiLoading ? 'Pensando...' : 'Explicación de Gemini'}
                 </button>
               </div>
             )}

             {aiExplanation && (
               <div className="bg-indigo-50 border border-indigo-100 p-5 rounded-3xl text-indigo-900 text-sm leading-relaxed animate-in fade-in zoom-in-95">
                 <div className="flex items-center gap-2 mb-2">
                   <Sparkles size={16} className="text-indigo-600" />
                   <span className="font-black uppercase tracking-widest text-[10px]">Profesor IA:</span>
                 </div>
                 {aiExplanation}
               </div>
             )}
           </div>

           <div className="md:w-auto w-full flex justify-end">
             {feedback === null ? (
               <button onClick={checkAnswer} className="w-full md:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-black py-5 px-12 rounded-[2rem] shadow-2xl shadow-emerald-200 transition-all flex items-center justify-center gap-3 transform active:scale-95 text-lg">
                COMPROBAR <Play size={24} className="fill-current" />
              </button>
             ) : (
               <button onClick={nextQuestion} className={`w-full md:w-auto font-black py-5 px-12 rounded-[2rem] shadow-2xl transition-all flex items-center justify-center gap-3 transform active:scale-95 text-lg ${feedback === 'correct' ? 'bg-emerald-600 shadow-emerald-200 text-white' : 'bg-slate-900 text-white shadow-slate-200'}`} autoFocus>
                {stars >= GOAL_STARS ? 'FINALIZAR' : 'SIGUIENTE'} <ArrowRight size={24} />
              </button>
             )}
          </div>
      </div>
    </div>
  );
}

const HeaderCell = ({ label }: { label: string }) => (
  <div className="bg-slate-900 h-14 flex items-center justify-center border-r border-white/10 last:border-r-0">
    <span className="font-black text-white text-[11px] uppercase tracking-[0.2em]">{label}</span>
  </div>
);

const IsotopeDisplay = ({ symbol, a, z, charge, hiddenA, hiddenZ }: { symbol: string, a: number, z: number, charge: string, hiddenA: boolean, hiddenZ: boolean }) => {
  const chargeDisplay = charge === '0' ? '' : charge;
  return (
    <div className="inline-flex items-center select-none">
      <div className="flex flex-col text-[9px] leading-[9px] mr-1 text-right font-black text-slate-500">
        <span className="mb-[2px]">{hiddenA ? '?' : a}</span>
        <span>{hiddenZ ? '?' : z}</span>
      </div>
      <span className="text-2xl font-serif font-black text-slate-900 leading-none">{symbol.replace(/[\d\+\-]+/g, '')}</span>
      <span className="text-[11px] font-black text-emerald-600 self-start ml-0.5 -mt-1">{chargeDisplay}</span>
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

  const checkEquality = (u: string, c: string) => {
    if (field === 'charge') {
      const nu = u.trim().toLowerCase();
      const nc = c.trim().toLowerCase();
      if ((nu === '0' || nu === 'neutro') && nc === '0') return true;
      // Comparar normalizados
      const normU = nu.replace(/[^0-9+-]/g, '');
      const normC = nc.replace(/[^0-9+-]/g, '');
      // Manejar '1+' vs '+1'
      const sortStr = (s: string) => s.split('').sort().join('');
      return sortStr(normU) === sortStr(normC);
    }
    return u.toLowerCase().trim() === c.toLowerCase().trim();
  };

  const isError = isResult && isHidden && !checkEquality(userValue, correctValue);

  const containerClasses = "p-4 flex items-center justify-center border-r border-slate-50 last:border-r-0 h-24 relative transition-colors";

  if (!isHidden) {
    return (
      <div className={`${containerClasses} bg-white`}>
        {isSymbolColumn ? (
           <IsotopeDisplay symbol={question.symbol} a={question.a} z={question.z} charge={question.charge} hiddenA={question.hiddenFields.includes('a')} hiddenZ={question.hiddenFields.includes('z')} />
        ) : (
          <span className={`text-slate-900 font-bold ${field === 'symbol' ? 'text-2xl font-serif' : 'text-base'}`}>
            {field === 'charge' && correctValue === '0' ? '0' : correctValue}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={`${containerClasses} ${isResult ? 'bg-white' : 'bg-emerald-50/50'}`}>
      {isResult ? (
        <div className="flex flex-col items-center w-full leading-tight">
            <div className={`text-base font-black ${isError ? 'text-rose-500 line-through decoration-2' : 'text-emerald-600'}`}>
                {userValue || <span className="text-slate-300 italic opacity-50 text-xs">Vacío</span>}
            </div>
            {isError && (
                <div className="text-[11px] text-emerald-600 font-black bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100 mt-2 shadow-sm">
                    {correctValue === '0' ? '0' : correctValue}
                </div>
            )}
        </div>
      ) : (
        <div className="w-full px-1">
            <input
              type="text"
              value={userInput[field]}
              onChange={(e) => onChange(field, e.target.value)}
              placeholder="?"
              autoComplete="off"
              autoFocus={shouldFocus}
              aria-label={`Ingresa el ${field} del átomo`}
              className={`w-full h-12 text-center bg-white border-2 border-emerald-100 rounded-xl focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all font-black text-lg text-emerald-900 placeholder-emerald-200 shadow-inner ${isSymbolColumn ? 'font-serif' : ''}`}
            />
        </div>
      )}
    </div>
  );
};

export default App;
