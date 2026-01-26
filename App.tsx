import React, { useState, useEffect, useCallback } from 'react';
import { getQuestions } from './data';
import { Question, GameState, UserInput, ElementData } from './types';
import { 
  Check, ChevronRight, RotateCcw, Trophy, X, 
  ArrowRight, ArrowLeft, Star, BookOpen, 
  Sparkles, Loader2, Play
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { GoogleGenAI } from "@google/genai";

const LEVEL_1_LIMIT = 30;
const LEVEL_2_LIMIT = 50;
const GOAL_STARS = 10;
const APP_VERSION = "v1.4-stable-refresh";

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
    <circle cx="12" cy="12" r="2.5" fill={color} />
    <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(0 12 12)" />
    <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(60 12 12)" />
    <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(120 12 12)" />
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
  <div className="bg-white/60 border border-emerald-100 rounded-xl p-3 flex flex-col items-center justify-center min-w-[90px] shadow-sm">
    <span className="text-[10px] font-black text-emerald-600 uppercase mb-1">{label}</span>
    <span className="text-sm font-mono font-bold text-emerald-900">{formula}</span>
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
  const [userInput, setUserInput] = useState<UserInput>({ symbol: '', name: '', z: '', a: '', p: '', e: '', n: '', charge: '' });
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiExplanation, setAiExplanation] = useState<string | null>(null);

  useEffect(() => {
    setAllQuestions(getQuestions());
  }, []);

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
    setUserInput({ symbol: '', name: '', z: '', a: '', p: '', e: '', n: '', charge: '' });
    setGameState('PLAYING');
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
        if (next === GOAL_STARS) {
          confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 }, colors: ['#10b981', '#34d399', '#ffffff'] });
        }
        return next;
      });
      setAiExplanation(null);
    } else {
      setFeedback('incorrect');
      setFailures(f => f + 1);
    }
  };

  const askGemini = async () => {
    if (!currentQuestion) return;
    setAiLoading(true);
    setAiExplanation(null);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const promptText = `Explica la estructura del ${currentQuestion.name} (Z=${currentQuestion.z}, A=${currentQuestion.a}, P=${currentQuestion.p}, E=${currentQuestion.e}, N=${currentQuestion.n}, Carga=${currentQuestion.charge}). Responde en una o dos frases claras para un estudiante.`;
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: promptText
      });
      setAiExplanation(response.text);
    } catch (error) {
      setAiExplanation("La IA está descansando. ¡Repasa las fórmulas básicas!");
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
    setUserInput({ symbol: '', name: '', z: '', a: '', p: '', e: '', n: '', charge: '' });
    if (currentIndex < activeQuestions.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      const pool = level === 1 ? allQuestions.slice(0, LEVEL_1_LIMIT) : allQuestions.slice(0, LEVEL_2_LIMIT);
      setActiveQuestions(shuffleArray(pool));
      setCurrentIndex(0);
    }
  };

  if (gameState === 'MENU') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-emerald-900 to-slate-900 flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-white rounded-[3rem] shadow-2xl p-12 max-w-xl w-full glass-card border-8 border-white/10 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-emerald-500 to-indigo-500"></div>
          <div className="flex justify-center mb-8">
            <RutherfordAtom className="w-24 h-24" color="#059669" />
          </div>
          <h1 className="text-5xl font-black text-slate-900 mb-4 tracking-tighter italic">Atom Master</h1>
          <p className="text-slate-600 mb-10 font-medium px-4">Pon a prueba tus conocimientos sobre la estructura de átomos e iones.</p>
          
          <div className="grid grid-cols-1 gap-4 mb-10">
            <button onClick={() => startGame(1)} className="group bg-emerald-600 hover:bg-emerald-700 text-white font-black py-6 rounded-3xl transition-all shadow-xl flex items-center justify-between px-8 hover:-translate-y-1">
              <span className="text-lg">Nivel 1: Átomos Neutros</span>
              <Play className="group-hover:translate-x-1 transition-transform" fill="white" />
            </button>
            <button onClick={() => startGame(2)} className="group bg-slate-900 hover:bg-black text-white font-black py-6 rounded-3xl transition-all shadow-xl flex items-center justify-between px-8 hover:-translate-y-1">
              <span className="text-lg">Nivel 2: Átomos e Iones</span>
              <Play className="group-hover:translate-x-1 transition-transform" fill="white" />
            </button>
          </div>
          
          <div className="inline-block bg-slate-100 px-4 py-1.5 rounded-full text-[10px] text-slate-500 font-black uppercase tracking-[0.2em]">
            VERSION {APP_VERSION}
          </div>
        </div>
      </div>
    );
  }

  if (gameState === 'SUMMARY') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-[3rem] shadow-2xl p-12 max-w-md w-full text-center border-4 border-emerald-100">
          <Trophy className="w-24 h-24 text-yellow-500 mx-auto mb-6 drop-shadow-xl" />
          <h2 className="text-4xl font-black mb-2 text-slate-900 tracking-tight">¡ENHORABUENA!</h2>
          <p className="text-slate-500 mb-8 font-medium">Has completado el reto con éxito.</p>
          <div className="flex justify-center gap-4 mb-10">
            <div className="bg-emerald-50 px-8 py-5 rounded-3xl border border-emerald-100">
              <div className="text-4xl font-black text-emerald-700">{stars}</div>
              <div className="text-[10px] uppercase font-bold text-emerald-400 tracking-widest mt-1">Éxitos</div>
            </div>
            <div className="bg-rose-50 px-8 py-5 rounded-3xl border border-rose-100">
              <div className="text-4xl font-black text-rose-700">{failures}</div>
              <div className="text-[10px] uppercase font-bold text-rose-400 tracking-widest mt-1">Errores</div>
            </div>
          </div>
          <button onClick={() => setGameState('MENU')} className="w-full bg-slate-900 text-white font-black py-6 rounded-3xl flex items-center justify-center gap-3 hover:bg-black transition-all hover:scale-[1.02] active:scale-95 shadow-lg">
            <RotateCcw size={22} /> REPETIR DESAFÍO
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white py-10 px-4 max-w-6xl mx-auto flex flex-col">
      <div className="flex justify-between items-center mb-12">
        <button onClick={() => setGameState('MENU')} className="p-4 rounded-2xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors shadow-sm"><ArrowLeft size={24} /></button>
        <div className="flex items-center gap-4">
          <div className="bg-emerald-600 p-3.5 rounded-2xl shadow-lg shadow-emerald-100"><RutherfordAtom className="w-8 h-8" color="white" /></div>
          <div><h1 className="font-black text-2xl tracking-tight leading-none text-slate-900">Atom Master</h1><span className="text-emerald-600 text-[11px] font-black uppercase tracking-[0.25em]">NIVEL {level}</span></div>
        </div>
        <div className="bg-emerald-50 px-6 py-3.5 rounded-2xl border border-emerald-100 flex items-center gap-3 shadow-sm">
          <Star size={24} className="text-yellow-400 fill-yellow-400" />
          <span className="font-black text-emerald-800 text-2xl">{stars}<span className="text-emerald-200 text-lg ml-1">/10</span></span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 mb-12">
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-slate-50 p-6 rounded-[2.5rem] border border-slate-100">
            <h3 className="text-[11px] font-black uppercase tracking-widest flex items-center gap-2 text-slate-400 mb-6"><BookOpen size={16} /> RECUERDA</h3>
            <div className="space-y-4">
              <FormulaBadge label="Masa (A)" formula="Z + N" />
              <FormulaBadge label="Carga (C)" formula="P - E" />
              <FormulaBadge label="Neutros" formula="P = E = Z" />
            </div>
          </div>
        </div>

        <div className="lg:col-span-4">
          <div className="bg-white rounded-[3rem] shadow-2xl border-[6px] border-slate-50 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-center border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-white h-20">
                    <th className="px-6 text-[12px] font-black uppercase tracking-widest border-r border-white/5">Nombre</th>
                    <th className="px-6 text-[12px] font-black uppercase tracking-widest border-r border-white/5">Símbolo</th>
                    <th className="px-4 text-[12px] font-black uppercase tracking-widest border-r border-white/5">Z</th>
                    <th className="px-4 text-[12px] font-black uppercase tracking-widest border-r border-white/5">A</th>
                    <th className="px-4 text-[12px] font-black uppercase tracking-widest border-r border-white/5">P</th>
                    <th className="px-4 text-[12px] font-black uppercase tracking-widest border-r border-white/5">E</th>
                    <th className="px-4 text-[12px] font-black uppercase tracking-widest border-r border-white/5">N</th>
                    <th className="px-6 text-[12px] font-black uppercase tracking-widest">Carga</th>
                  </tr>
                </thead>
                <tbody key={currentIndex}>
                  <tr className="h-32">
                    <DataCell field="name" question={currentQuestion} userInput={userInput} onChange={handleInputChange} isResult={feedback !== null} />
                    <DataCell field="symbol" question={currentQuestion} userInput={userInput} onChange={handleInputChange} isResult={feedback !== null} isSymbol />
                    <DataCell field="z" question={currentQuestion} userInput={userInput} onChange={handleInputChange} isResult={feedback !== null} />
                    <DataCell field="a" question={currentQuestion} userInput={userInput} onChange={handleInputChange} isResult={feedback !== null} />
                    <DataCell field="p" question={currentQuestion} userInput={userInput} onChange={handleInputChange} isResult={feedback !== null} />
                    <DataCell field="e" question={currentQuestion} userInput={userInput} onChange={handleInputChange} isResult={feedback !== null} />
                    <DataCell field="n" question={currentQuestion} userInput={userInput} onChange={handleInputChange} isResult={feedback !== null} />
                    <DataCell field="charge" question={currentQuestion} userInput={userInput} onChange={handleInputChange} isResult={feedback !== null} />
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-10 space-y-4">
            {feedback === 'correct' && (
              <div className="bg-emerald-600 text-white p-7 rounded-[2.5rem] flex items-center justify-between shadow-2xl shadow-emerald-100 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center gap-5 font-black text-xl"><Check size={40} strokeWidth={3} /> ¡EXCELENTE! HAS GANADO 1 ESTRELLA</div>
                <button onClick={nextQuestion} className="bg-white text-emerald-700 font-black py-4 px-10 rounded-2xl hover:bg-emerald-50 transition-all active:scale-95 shadow-md">SIGUIENTE ELEMENTO</button>
              </div>
            )}
            {feedback === 'incorrect' && (
              <div className="space-y-4">
                <div className="bg-rose-600 text-white p-7 rounded-[2.5rem] flex items-center justify-between shadow-2xl shadow-rose-100 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="flex items-center gap-5 font-black text-xl"><X size={40} strokeWidth={3} /> HAY ALGÚN ERROR...</div>
                  <button onClick={askGemini} disabled={aiLoading} className="bg-white/20 hover:bg-white/30 text-white font-black py-4 px-10 rounded-2xl transition-all flex items-center gap-3 active:scale-95">
                    {aiLoading ? <Loader2 className="animate-spin" size={24} /> : <Sparkles size={24} />} AYUDA DE IA
                  </button>
                </div>
                {aiExplanation && <div className="bg-indigo-50 p-8 rounded-[2.5rem] border-2 border-indigo-100 text-indigo-900 font-semibold italic text-lg leading-relaxed shadow-inner">{aiExplanation}</div>}
              </div>
            )}
            {feedback === null && (
              <button onClick={checkAnswer} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-8 rounded-[2.5rem] shadow-2xl shadow-indigo-100 transition-all active:scale-[0.98] text-2xl tracking-tight">VERIFICAR RESPUESTAS</button>
            )}
          </div>
        </div>
      </div>
      
      <div className="mt-auto pt-10 text-center">
        <div className="inline-flex items-center gap-3 text-[11px] text-slate-300 font-black uppercase tracking-[0.4em]">
          QUÍMICA INTERACTIVA <span className="text-slate-200 text-base">•</span> {APP_VERSION}
        </div>
      </div>
    </div>
  );
}

const DataCell = ({ field, question, userInput, onChange, isResult, isSymbol }: any) => {
  const isHidden = question.hiddenFields.includes(field);
  const correctValue = String(question[field]);
  const userValue = userInput[field];

  const checkEquality = (u: string, c: string) => {
    if (field === 'charge') {
      const nu = u.trim().toLowerCase();
      const nc = c.trim().toLowerCase();
      if ((nu === '0' || nu === 'neutro') && nc === '0') return true;
      return nu.replace(/[^0-9+-]/g, '') === nc.replace(/[^0-9+-]/g, '');
    }
    return u.toLowerCase().trim() === c.toLowerCase().trim();
  };

  const isError = isResult && isHidden && !checkEquality(userValue, correctValue);

  if (!isHidden) {
    return (
      <td className="px-6 border-r border-slate-50 last:border-0 bg-white">
        {isSymbol ? (
          <div className="inline-flex items-center scale-110">
            <div className="flex flex-col text-[10px] mr-1 text-right font-black text-slate-400">
              <span>{question.a}</span><span>{question.z}</span>
            </div>
            <span className="text-4xl font-black text-slate-900">{question.symbol.replace(/[\d\+\-]+/g, '')}</span>
            <span className="text-[12px] font-black text-emerald-600 self-start ml-0.5 mt-1">{question.charge === '0' ? '' : question.charge}</span>
          </div>
        ) : (
          <span className="text-2xl font-black text-slate-800">{correctValue === '0' ? '0' : correctValue}</span>
        )}
      </td>
    );
  }

  return (
    <td className={`px-4 border-r border-slate-50 last:border-0 ${isResult ? 'bg-white' : 'bg-indigo-50/20'}`}>
      {isResult ? (
        <div className="flex flex-col items-center justify-center py-2">
          <span className={`text-2xl font-black ${isError ? 'text-rose-500 line-through decoration-[3px]' : 'text-emerald-600'}`}>{userValue || '?'}</span>
          {isError && <span className="text-[12px] font-black text-emerald-600 mt-2 bg-emerald-50 px-3 py-1 rounded-lg">{correctValue === '0' ? '0' : correctValue}</span>}
        </div>
      ) : (
        <input
          type="text"
          value={userValue}
          onChange={(e) => onChange(field, e.target.value)}
          placeholder="?"
          className="w-full text-center bg-white border-[3px] border-indigo-100 rounded-2xl py-4 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none font-black text-2xl text-indigo-900 transition-all placeholder-indigo-200"
        />
      )}
    </td>
  );
};

export default App;