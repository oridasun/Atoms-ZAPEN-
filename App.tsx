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
    setShowInfo(false);
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
      const promptText = `Actúa como un profesor de química experto y amable. Explica brevemente la estructura atómica del siguiente elemento: ${currentQuestion.name}. P=${currentQuestion.p}, E=${currentQuestion.e}, N=${currentQuestion.n}, Carga=${currentQuestion.charge}. Responde en 2-3 frases cortas.`;
      
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [{ parts: [{ text: promptText }] }]
      });
      setAiExplanation(response.text);
    } catch (error) {
      setAiExplanation("No pude conectar con mi cerebro de IA. ¡Revisa las fórmulas!");
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
      <div className="min-h-screen bg-gradient-to-br from-emerald-700 via-emerald-600 to-teal-800 flex items-center justify-center p-6 text-center">
        <div className="bg-white rounded-[2.5rem] shadow-2xl p-10 max-w-2xl w-full border-8 border-white/20 glass-card">
          <div className="flex justify-center mb-8">
            <RutherfordAtom className="w-16 h-16" color="#059669" />
          </div>
          <h1 className="text-4xl font-black text-emerald-900 mb-2 tracking-tight">Atom Master</h1>
          <p className="text-emerald-700/70 mb-10 text-sm font-medium">Domina la estructura atómica y consigue 10 estrellas.</p>
          <div className="grid grid-cols-2 gap-4">
            <button onClick={() => startGame(1)} className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-6 rounded-2xl transition-all shadow-xl">
              Nivel 1 (Neutros)
            </button>
            <button onClick={() => startGame(2)} className="bg-teal-800 hover:bg-teal-900 text-white font-bold py-6 rounded-2xl transition-all shadow-xl">
              Nivel 2 (Iones)
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (gameState === 'SUMMARY') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-[3rem] shadow-2xl p-12 max-w-md w-full text-center border-4 border-emerald-100">
          <Trophy className="w-20 h-20 text-yellow-500 mx-auto mb-6" />
          <h2 className="text-3xl font-black mb-2 text-slate-900">¡ESPECTACULAR!</h2>
          <div className="grid grid-cols-2 gap-4 mb-10">
            <div className="bg-emerald-50 rounded-2xl p-4">
              <div className="text-3xl font-black text-emerald-700">{stars}</div>
              <div className="text-[10px] uppercase font-bold text-emerald-400">Estrellas</div>
            </div>
            <div className="bg-rose-50 rounded-2xl p-4">
              <div className="text-3xl font-black text-rose-700">{failures}</div>
              <div className="text-[10px] uppercase font-bold text-rose-400">Errores</div>
            </div>
          </div>
          <button onClick={() => setGameState('MENU')} className="w-full bg-slate-900 text-white font-black py-5 rounded-2xl flex items-center justify-center gap-2">
            <RotateCcw size={20} /> REINTENTAR
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white py-6 px-4 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <button onClick={() => setGameState('MENU')} className="p-3 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200"><ArrowLeft size={20} /></button>
        <div className="flex items-center gap-3">
          <div className="bg-emerald-600 p-2 rounded-xl"><RutherfordAtom className="w-6 h-6" color="white" /></div>
          <div><h1 className="font-black text-xl leading-none">Atom Master</h1><span className="text-emerald-600 text-[10px] font-black uppercase tracking-widest">NIVEL {level}</span></div>
        </div>
        <div className="flex gap-4">
          <div className="bg-slate-50 px-4 py-2 rounded-2xl border border-slate-100 flex items-center gap-2">
            <Star size={16} className="text-yellow-400 fill-yellow-400" />
            <span className="font-black text-slate-700">{stars}</span>
          </div>
          <div className="bg-rose-50 px-4 py-2 rounded-2xl border border-rose-100 flex items-center gap-2">
            <X size={16} className="text-rose-500" />
            <span className="font-black text-rose-700">{failures}</span>
          </div>
        </div>
      </div>

      <div className="mb-6 bg-white p-4 rounded-2xl border border-slate-200">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xs font-black uppercase tracking-widest flex items-center gap-2 text-slate-500"><BookOpen size={14} /> Fórmulas Básicas</h3>
          <button onClick={() => setShowInfo(!showInfo)} className="text-[10px] bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full font-bold">{showInfo ? 'Cerrar' : 'Ayuda'}</button>
        </div>
        <div className="flex flex-wrap gap-2">
          <FormulaBadge label="A" formula="Z + N" />
          <FormulaBadge label="Carga" formula="P - E" />
          <FormulaBadge label="N" formula="A - Z" />
        </div>
        {showInfo && <div className="mt-4"><Glossary /></div>}
      </div>

      <div className="bg-white rounded-3xl shadow-xl border-2 border-slate-100 overflow-hidden mb-6">
        <div className="overflow-x-auto">
          <div className="min-w-[700px] grid grid-cols-[1.5fr_1fr_0.8fr_0.8fr_0.8fr_0.8fr_0.8fr_1fr]">
            <HeaderCell label="Nombre" />
            <HeaderCell label="Símbolo" />
            <HeaderCell label="Z" />
            <HeaderCell label="A" />
            <HeaderCell label="P" />
            <HeaderCell label="E" />
            <HeaderCell label="N" />
            <HeaderCell label="Carga" />

            <div className="contents" key={currentIndex}>
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

      <div className="space-y-4">
        {feedback === 'correct' && (
          <div className="bg-emerald-50 border-2 border-emerald-100 p-4 rounded-2xl flex items-center gap-3 text-emerald-700 font-bold">
            <Check className="text-emerald-500" /> ¡Correcto! Has ganado una estrella.
          </div>
        )}
        {feedback === 'incorrect' && (
          <div className="space-y-3">
            <div className="bg-rose-50 border-2 border-rose-100 p-4 rounded-2xl flex items-center gap-3 text-rose-700 font-bold">
              <X className="text-rose-500" /> Hay errores. Revisa las fórmulas.
            </div>
            <button onClick={askGemini} disabled={aiLoading} className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2">
              {aiLoading ? <Loader2 className="animate-spin" /> : <Sparkles />} Explicación IA
            </button>
            {aiExplanation && <div className="bg-slate-50 p-4 rounded-xl text-slate-700 text-sm italic">{aiExplanation}</div>}
          </div>
        )}

        <div className="flex justify-end">
          {feedback === null ? (
            <button onClick={checkAnswer} className="bg-emerald-600 text-white font-black py-4 px-12 rounded-2xl shadow-lg hover:scale-105 active:scale-95 transition-all">COMPROBAR</button>
          ) : (
            <button onClick={nextQuestion} className="bg-slate-900 text-white font-black py-4 px-12 rounded-2xl shadow-lg flex items-center gap-2">SIGUIENTE <ArrowRight size={20} /></button>
          )}
        </div>
      </div>
    </div>
  );
}

const HeaderCell = ({ label }: { label: string }) => (
  <div className="bg-slate-900 h-12 flex items-center justify-center border-r border-white/10">
    <span className="font-black text-white text-[10px] uppercase tracking-widest">{label}</span>
  </div>
);

const IsotopeDisplay = ({ symbol, a, z, charge, hiddenA, hiddenZ }: { symbol: string, a: number, z: number, charge: string, hiddenA: boolean, hiddenZ: boolean }) => (
  <div className="inline-flex items-center">
    <div className="flex flex-col text-[10px] leading-[10px] mr-1 text-right font-black text-slate-400">
      <span>{hiddenA ? '?' : a}</span>
      <span>{hiddenZ ? '?' : z}</span>
    </div>
    <span className="text-2xl font-black text-slate-900">{symbol.replace(/[\d\+\-]+/g, '')}</span>
    <span className="text-[10px] font-black text-emerald-600 self-start ml-0.5">{charge === '0' ? '' : charge}</span>
  </div>
);

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
      return nu.replace(/[^0-9+-]/g, '') === nc.replace(/[^0-9+-]/g, '');
    }
    return u.toLowerCase().trim() === c.toLowerCase().trim();
  };

  const isError = isResult && isHidden && !checkEquality(userValue, correctValue);

  if (!isHidden) {
    return (
      <div className="p-4 flex items-center justify-center border-r border-slate-50 h-20 bg-white">
        {isSymbolColumn ? (
           <IsotopeDisplay symbol={question.symbol} a={question.a} z={question.z} charge={question.charge} hiddenA={question.hiddenFields.includes('a')} hiddenZ={question.hiddenFields.includes('z')} />
        ) : (
          <span className="text-slate-900 font-bold">{field === 'charge' && correctValue === '0' ? '0' : correctValue}</span>
        )}
      </div>
    );
  }

  return (
    <div className={`p-4 flex items-center justify-center border-r border-slate-50 h-20 ${isResult ? 'bg-white' : 'bg-emerald-50/30'}`}>
      {isResult ? (
        <div className="text-center">
            <div className={`font-black ${isError ? 'text-rose-500 line-through' : 'text-emerald-600'}`}>{userValue || '?'}</div>
            {isError && <div className="text-[10px] text-emerald-600 font-bold mt-1">{correctValue === '0' ? '0' : correctValue}</div>}
        </div>
      ) : (
        <input
          type="text"
          value={userInput[field]}
          onChange={(e) => onChange(field, e.target.value)}
          placeholder="?"
          autoFocus={shouldFocus}
          className="w-full text-center bg-white border-2 border-emerald-100 rounded-lg py-2 focus:border-emerald-500 outline-none font-bold"
        />
      )}
    </div>
  );
};

export default App;