import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Play, RotateCcw, ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react';
import { 
  Point, 
  Direction, 
  GameStatus, 
  GRID_SIZE, 
  CANVAS_WIDTH, 
  CANVAS_HEIGHT, 
  INITIAL_SNAKE, 
  INITIAL_DIRECTION, 
  GAME_SPEED 
} from './constants';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [snake, setSnake] = useState<Point[]>(INITIAL_SNAKE);
  const [direction, setDirection] = useState<Direction>(INITIAL_DIRECTION);
  const [nextDirection, setNextDirection] = useState<Direction>(INITIAL_DIRECTION);
  const [food, setFood] = useState<Point>({ x: 5, y: 5 });
  const [status, setStatus] = useState<GameStatus>(GameStatus.START);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [speed, setSpeed] = useState(100); // 預設速度 (ms)
  
  // 遊戲迴圈使用的 ref，避免每次 render 都重新設定定時器
  const lastMoveTimeRef = useRef<number>(0);
  const requestRef = useRef<number>(0);

  // 隨機生成食物
  const generateFood = useCallback((currentSnake: Point[]) => {
    let newFood: Point;
    while (true) {
      newFood = {
        x: Math.floor(Math.random() * (CANVAS_WIDTH / GRID_SIZE)),
        y: Math.floor(Math.random() * (CANVAS_HEIGHT / GRID_SIZE)),
      };
      // 確保食物不會出現在蛇身體上
      const isOnSnake = currentSnake.some(segment => segment.x === newFood.x && segment.y === newFood.y);
      if (!isOnSnake) break;
    }
    setFood(newFood);
  }, []);

  // 重置遊戲
  const resetGame = () => {
    setSnake(INITIAL_SNAKE);
    setDirection(INITIAL_DIRECTION);
    setNextDirection(INITIAL_DIRECTION);
    setScore(0);
    setStatus(GameStatus.PLAYING);
    generateFood(INITIAL_SNAKE);
    lastMoveTimeRef.current = 0;
  };

  // 鍵盤控制
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowUp':
          if (direction !== 'DOWN') setNextDirection('UP');
          break;
        case 'ArrowDown':
          if (direction !== 'UP') setNextDirection('DOWN');
          break;
        case 'ArrowLeft':
          if (direction !== 'RIGHT') setNextDirection('LEFT');
          break;
        case 'ArrowRight':
          if (direction !== 'LEFT') setNextDirection('RIGHT');
          break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [direction]);

  // 繪製畫布
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 清除畫布
    ctx.fillStyle = '#0a0a0c';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // 繪製網格背景 (裝飾用)
    ctx.strokeStyle = '#1a1a1f';
    ctx.lineWidth = 1;
    for (let i = 0; i <= CANVAS_WIDTH; i += GRID_SIZE) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, CANVAS_HEIGHT);
      ctx.stroke();
    }
    for (let i = 0; i <= CANVAS_HEIGHT; i += GRID_SIZE) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(CANVAS_WIDTH, i);
      ctx.stroke();
    }

    // 繪製食物 (發光效果)
    ctx.fillStyle = '#ff007f';
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#ff007f';
    ctx.beginPath();
    ctx.arc(
      food.x * GRID_SIZE + GRID_SIZE / 2,
      food.y * GRID_SIZE + GRID_SIZE / 2,
      GRID_SIZE / 2 - 2,
      0,
      Math.PI * 2
    );
    ctx.fill();
    ctx.shadowBlur = 0;

    // 繪製蛇
    snake.forEach((segment, index) => {
      const isHead = index === 0;
      ctx.fillStyle = isHead ? '#00ff41' : '#00cc33';
      ctx.shadowBlur = isHead ? 20 : 0;
      ctx.shadowColor = '#00ff41';
      
      // 繪製圓角矩形
      const x = segment.x * GRID_SIZE;
      const y = segment.y * GRID_SIZE;
      const size = GRID_SIZE - 2;
      const radius = 4;
      
      ctx.beginPath();
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + size - radius, y);
      ctx.quadraticCurveTo(x + size, y, x + size, y + radius);
      ctx.lineTo(x + size, y + size - radius);
      ctx.quadraticCurveTo(x + size, y + size, x + size - radius, y + size);
      ctx.lineTo(x + radius, y + size);
      ctx.quadraticCurveTo(x, y + size, x, y + size - radius);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
      ctx.closePath();
      ctx.fill();
      
      // 眼睛 (如果是頭部)
      if (isHead) {
        ctx.fillStyle = 'black';
        ctx.shadowBlur = 0;
        const eyeSize = 2;
        if (direction === 'UP' || direction === 'DOWN') {
          ctx.fillRect(x + 4, y + (direction === 'UP' ? 4 : 12), eyeSize, eyeSize);
          ctx.fillRect(x + 12, y + (direction === 'UP' ? 4 : 12), eyeSize, eyeSize);
        } else {
          ctx.fillRect(x + (direction === 'LEFT' ? 4 : 12), y + 4, eyeSize, eyeSize);
          ctx.fillRect(x + (direction === 'LEFT' ? 4 : 12), y + 12, eyeSize, eyeSize);
        }
      }
    });
    ctx.shadowBlur = 0;
  }, [snake, food, direction]);

  // 移動邏輯
  const moveSnake = useCallback(() => {
    if (status !== GameStatus.PLAYING) return;

    setSnake(prevSnake => {
      const head = prevSnake[0];
      const newHead = { ...head };
      const currentDir = nextDirection;
      setDirection(currentDir);

      switch (currentDir) {
        case 'UP': newHead.y -= 1; break;
        case 'DOWN': newHead.y += 1; break;
        case 'LEFT': newHead.x -= 1; break;
        case 'RIGHT': newHead.x += 1; break;
      }

      // 檢查碰撞牆壁
      if (
        newHead.x < 0 || 
        newHead.x >= CANVAS_WIDTH / GRID_SIZE || 
        newHead.y < 0 || 
        newHead.y >= CANVAS_HEIGHT / GRID_SIZE
      ) {
        setStatus(GameStatus.GAME_OVER);
        return prevSnake;
      }

      // 檢查碰撞自己
      if (prevSnake.some(segment => segment.x === newHead.x && segment.y === newHead.y)) {
        setStatus(GameStatus.GAME_OVER);
        return prevSnake;
      }

      const newSnake = [newHead, ...prevSnake];

      // 檢查是否吃到食物
      if (newHead.x === food.x && newHead.y === food.y) {
        setScore(s => {
          const ns = s + 10;
          if (ns > highScore) setHighScore(ns);
          return ns;
        });
        generateFood(newSnake);
      } else {
        newSnake.pop();
      }

      return newSnake;
    });
  }, [status, nextDirection, food, generateFood, highScore]);

  // 遊戲迴圈
  const animate = useCallback((time: number) => {
    if (lastMoveTimeRef.current === 0) lastMoveTimeRef.current = time;
    
    const deltaTime = time - lastMoveTimeRef.current;
    
    if (deltaTime > speed) {
      moveSnake();
      lastMoveTimeRef.current = time;
    }
    
    draw();
    requestRef.current = requestAnimationFrame(animate);
  }, [moveSnake, draw]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(requestRef.current);
  }, [animate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      {/* 頂部資訊欄 */}
      <div className="w-full max-w-[800px] flex justify-between items-end mb-4 px-2">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tighter text-white mb-1">
            NEON<span className="text-[#00ff41]">SNAKE</span>
          </h1>
          <p className="text-gray-500 font-mono text-xs">VERSION 1.0.0 // REACT + CANVAS</p>
        </div>
        <div className="flex gap-8">
          <div className="text-right">
            <p className="text-gray-500 text-xs font-mono uppercase">Speed</p>
            <p className="text-sm font-bold font-mono text-[#00ff41]">{Math.round(1000/speed)} FPS</p>
          </div>
          <div className="text-right">
            <p className="text-gray-500 text-xs font-mono uppercase">Score</p>
            <p className="text-2xl font-bold font-mono text-[#00ff41]">{score.toString().padStart(4, '0')}</p>
          </div>
          <div className="text-right">
            <p className="text-gray-500 text-xs font-mono uppercase">High Score</p>
            <p className="text-2xl font-bold font-mono text-white mix-blend-difference">{highScore.toString().padStart(4, '0')}</p>
          </div>
        </div>
      </div>

      {/* 遊戲畫布容器 */}
      <div className="relative border border-[#1a1a1f] rounded-xl overflow-hidden shadow-2xl">
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="block"
        />

        {/* 覆蓋層 UI */}
        <AnimatePresence>
          {status === GameStatus.START && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center"
            >
              <motion.div 
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className="text-center p-8 rounded-3xl border border-[#333] bg-[#0f0f12]"
              >
                <div className="w-20 h-20 bg-[#00ff41]/20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Play className="w-10 h-10 text-[#00ff41] fill-[#00ff41]" />
                </div>
                <h2 className="text-3xl font-bold mb-2 text-white">準備好了嗎？</h2>
                <p className="text-gray-400 mb-6 max-w-xs">使用方向鍵來控制蛇的移動，避開牆壁和自己，並收集紅色能量點。</p>
                
                {/* 速度選擇 */}
                <div className="mb-8 px-4">
                  <div className="flex justify-between text-xs font-mono text-gray-500 mb-2 uppercase">
                    <span>速度設定</span>
                    <span className="text-[#00ff41]">{speed}ms / 步</span>
                  </div>
                  <input 
                    type="range" 
                    min="40" 
                    max="200" 
                    step="20"
                    value={speed}
                    onChange={(e) => setSpeed(Number(e.target.value))}
                    className="w-full h-1 bg-[#1a1a1f] rounded-lg appearance-none cursor-pointer accent-[#00ff41] border border-[#333]"
                  />
                  <div className="flex justify-between text-[10px] font-mono text-gray-600 mt-1 uppercase">
                    <span>極速</span>
                    <span>悠閒</span>
                  </div>
                </div>

                <button
                  id="start-button"
                  onClick={resetGame}
                  className="px-8 py-3 bg-[#00ff41] text-black font-bold rounded-lg hover:bg-[#00cc33] transition-colors flex items-center gap-2 mx-auto"
                >
                  開始遊戲
                </button>
              </motion.div>
            </motion.div>
          )}

          {status === GameStatus.GAME_OVER && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-red-500/10 backdrop-blur-md flex flex-col items-center justify-center"
            >
              <motion.div 
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className="text-center p-10 rounded-3xl border border-red-500/20 bg-[#0f0f12] shadow-[0_0_50px_rgba(255,0,0,0.2)]"
              >
                <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Trophy className="w-10 h-10 text-red-500" />
                </div>
                <h2 className="text-4xl font-black mb-1 text-white uppercase tracking-tighter">Game Over</h2>
                <p className="text-gray-400 mb-2 font-mono">你的得分：<span className="text-white font-bold">{score}</span></p>
                <div className="h-px w-full bg-[#333] my-6" />
                <button
                  id="restart-button"
                  onClick={resetGame}
                  className="px-8 py-3 bg-white text-black font-bold rounded-lg hover:bg-gray-200 transition-all flex items-center gap-2 mx-auto"
                >
                  <RotateCcw className="w-4 h-4" />
                  再試一次
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 控制提示 (手機適配提示) */}
      <div className="mt-8 grid grid-cols-3 gap-4 md:hidden">
        <div />
        <button id="btn-up" onClick={() => nextDirection !== 'DOWN' && setNextDirection('UP')} className="w-14 h-14 bg-[#1a1a1f] rounded-xl flex items-center justify-center border border-[#333]"><ArrowUp /></button>
        <div />
        <button id="btn-left" onClick={() => nextDirection !== 'RIGHT' && setNextDirection('LEFT')} className="w-14 h-14 bg-[#1a1a1f] rounded-xl flex items-center justify-center border border-[#333]"><ArrowLeft /></button>
        <button id="btn-down" onClick={() => nextDirection !== 'UP' && setNextDirection('DOWN')} className="w-14 h-14 bg-[#1a1a1f] rounded-xl flex items-center justify-center border border-[#333]"><ArrowDown /></button>
        <button id="btn-right" onClick={() => nextDirection !== 'LEFT' && setNextDirection('RIGHT')} className="w-14 h-14 bg-[#1a1a1f] rounded-xl flex items-center justify-center border border-[#333]"><ArrowRight /></button>
      </div>

      {/* 操作說明 */}
      <div className="mt-8 flex gap-6 text-gray-500 text-xs font-mono">
        <div className="flex items-center gap-2">
          <kbd className="px-2 py-1 bg-[#1a1a1f] border border-[#333] rounded">ARROWS</kbd>
          <span>MOVE</span>
        </div>
        <div className="flex items-center gap-2">
          <kbd className="px-2 py-1 bg-[#1a1a1f] border border-[#333] rounded">SPACE</kbd>
          <span>PAUSE</span>
        </div>
      </div>
    </div>
  );
}
