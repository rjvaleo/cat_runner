
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  CellType, 
  Position, 
  Entity, 
  LevelData, 
  DigState, 
  PuddleState,
  GameStatus 
} from './types';
import { 
  GRID_WIDTH, 
  GRID_HEIGHT, 
  TICK_RATE, 
  PLAYER_SPEED,
  ENEMY_SPEED,
  DIG_DURATION, 
  PUDDLE_DURATION,
  PUDDLE_SLOW_FACTOR,
  DEFAULT_LEVELS,
  AUDIO_URLS,
  GRAVITY,
  JUMP_FORCE,
  TERMINAL_VELOCITY
} from './constants';
import { generateAiLevel } from './services/geminiService';
import { Trophy, Skull, Play, Cat, Sparkles, MousePointer2, MoveUp, FastForward, Rewind } from 'lucide-react';

const App: React.FC = () => {
  const [status, setStatus] = useState<GameStatus>('MENU');
  const [levelNumber, setLevelNumber] = useState(1);
  const [currentLevel, setCurrentLevel] = useState<LevelData>(DEFAULT_LEVELS[0]);
  const [grid, setGrid] = useState<CellType[][]>([]);
  const [player, setPlayer] = useState<Entity>({
    id: 'p1', type: 'player', x: 0, y: 0, direction: 'right', isFalling: false, isClimbing: false, vY: 0, jumpCount: 0
  });
  const [enemies, setEnemies] = useState<Entity[]>([]);
  const [digs, setDigs] = useState<DigState[]>([]);
  const [puddles, setPuddles] = useState<PuddleState[]>([]);
  const [score, setScore] = useState(0);
  const [goldCount, setGoldCount] = useState(0);
  const [loadingMsg, setLoadingMsg] = useState('');

  const playerTarget = useRef<Position>({ x: 0, y: 0 });
  const enemyTargets = useRef<Map<string, Position>>(new Map());
  const keysPressed = useRef<Set<string>>(new Set());
  const spaceWasDown = useRef<boolean>(false);
  const pWasDown = useRef<boolean>(false);
  const gameLoopRef = useRef<number | null>(null);

  const playOneShot = useCallback((url: string, volume: number = 0.5) => {
    const audio = new Audio(url);
    audio.volume = volume;
    audio.play().catch(() => {});
  }, []);

  const isStandingOnSolid = useCallback((x: number, y: number, currentGrid: CellType[][], currentDigs: DigState[]) => {
    const ix = Math.round(x);
    const iyBelow = Math.floor(y + 1.01); 
    if (iyBelow >= GRID_HEIGHT) return true;
    if (ix < 0 || ix >= GRID_WIDTH) return true;
    const cellBelow = currentGrid[iyBelow][ix];
    const isBelowDigged = currentDigs.find(d => d.x === ix && d.y === iyBelow);
    return !isBelowDigged && (cellBelow === CellType.BRICK || cellBelow === CellType.SOLID || cellBelow === CellType.LADDER);
  }, []);

  const isInsideLadder = useCallback((x: number, y: number, currentGrid: CellType[][]) => {
    const ix = Math.round(x);
    const iy = Math.round(y);
    if (ix < 0 || ix >= GRID_WIDTH || iy < 0 || iy >= GRID_HEIGHT) return false;
    return currentGrid[iy][ix] === CellType.LADDER;
  }, []);

  const canMoveTo = useCallback((x: number, y: number, currentGrid: CellType[][], currentDigs: DigState[]) => {
    const ix = Math.round(x);
    const iy = Math.round(y);
    if (ix < 0 || ix >= GRID_WIDTH || iy < 0 || iy >= GRID_HEIGHT) return false;
    const isDigged = currentDigs.find(d => d.x === ix && d.y === iy);
    if (isDigged) return true;
    const cell = currentGrid[iy][ix];
    return cell === CellType.EMPTY || cell === CellType.LADDER || cell === CellType.GOLD || cell === CellType.EXIT;
  }, []);

  const initLevel = useCallback((level: LevelData, num: number) => {
    setCurrentLevel(level);
    setLevelNumber(num);
    const workingGrid = level.grid.map(row => [...row]);
    // Safety check for start pos
    if (workingGrid[level.playerStart.y]?.[level.playerStart.x] === CellType.SOLID || workingGrid[level.playerStart.y]?.[level.playerStart.x] === CellType.BRICK) {
      workingGrid[level.playerStart.y][level.playerStart.x] = CellType.EMPTY;
    }
    setGrid(workingGrid);
    setPlayer({ id: 'player', type: 'player', x: level.playerStart.x, y: level.playerStart.y, direction: 'right', isFalling: false, isClimbing: false, vY: 0, jumpCount: 0 });
    playerTarget.current = { x: level.playerStart.x, y: level.playerStart.y };
    setEnemies(level.enemies.map((pos, i) => {
      const id = `enemy-${i}`;
      enemyTargets.current.set(id, { x: pos.x, y: pos.y });
      return { id, type: 'enemy', x: pos.x, y: pos.y, direction: 'left', isFalling: false, isClimbing: false };
    }));
    setDigs([]);
    setPuddles([]);
    setGoldCount(workingGrid.flat().filter(c => c === CellType.GOLD).length);
    setStatus('PLAYING');
  }, []);

  const handleNextLevel = useCallback(async () => {
    const nextNum = levelNumber + 1;
    if (nextNum <= DEFAULT_LEVELS.length) {
      initLevel(DEFAULT_LEVELS[nextNum - 1], nextNum);
    } else {
      setStatus('LOADING');
      setLoadingMsg("Summoning new challenges...");
      try {
        const aiLevel = await generateAiLevel(`Abstract Theme ${nextNum}`);
        initLevel(aiLevel, nextNum);
      } catch (err) {
        initLevel(DEFAULT_LEVELS[0], 1);
      }
    }
  }, [levelNumber, initLevel]);

  const handlePreviousLevel = useCallback(() => {
    if (levelNumber > 1) initLevel(DEFAULT_LEVELS[levelNumber - 2], levelNumber - 1);
  }, [levelNumber, initLevel]);

  // Reveal Exit Logic
  useEffect(() => {
    if (goldCount === 0 && status === 'PLAYING') {
      setGrid(prevGrid => {
        const nextGrid = prevGrid.map(r => [...r]);
        // Find a suitable spot for the exit (top row, near a ladder if possible)
        let placed = false;
        for (let y = 1; y < 4 && !placed; y++) {
          for (let x = 1; x < GRID_WIDTH - 1; x++) {
            if (nextGrid[y][x] === CellType.EMPTY || nextGrid[y][x] === CellType.LADDER) {
              nextGrid[y][x] = CellType.EXIT;
              placed = true;
              break;
            }
          }
        }
        return nextGrid;
      });
    }
  }, [goldCount, status]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => keysPressed.current.add(e.code);
    const handleKeyUp = (e: KeyboardEvent) => keysPressed.current.delete(e.code);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => { window.removeEventListener('keydown', handleKeyDown); window.removeEventListener('keyup', handleKeyUp); };
  }, []);

  const tick = useCallback(() => {
    if (status !== 'PLAYING') return;

    setDigs(prev => prev.map(d => ({ ...d, timer: d.timer - 1 })).filter(d => d.timer > 0));
    setPuddles(prev => prev.map(p => ({ ...p, timer: p.timer - 1 })).filter(p => p.timer > 0));

    setPlayer(prev => {
      let nextPlayer = { ...prev };
      const onLadder = isInsideLadder(nextPlayer.x, nextPlayer.y, grid);
      const standing = isStandingOnSolid(nextPlayer.x, nextPlayer.y, grid, digs);

      if (nextPlayer.vY !== 0 || (!standing && !onLadder)) {
        nextPlayer.vY = Math.min((nextPlayer.vY || 0) + GRAVITY, TERMINAL_VELOCITY);
        let potentialY = nextPlayer.y + nextPlayer.vY;
        if (nextPlayer.vY > 0 && isStandingOnSolid(nextPlayer.x, potentialY, grid, digs)) {
          potentialY = Math.floor(potentialY); 
          nextPlayer.vY = 0;
          playerTarget.current.y = potentialY;
          nextPlayer.jumpCount = 0;
        } else if (nextPlayer.vY < 0 && !canMoveTo(nextPlayer.x, potentialY, grid, digs) && !isInsideLadder(nextPlayer.x, potentialY, grid)) {
          potentialY = Math.ceil(potentialY); 
          nextPlayer.vY = 0;
          playerTarget.current.y = potentialY;
        }
        nextPlayer.y = potentialY;
      } else {
        nextPlayer.jumpCount = 0;
      }

      const xAligned = Math.abs(nextPlayer.x - playerTarget.current.x) < 0.05;
      const yAligned = Math.abs(nextPlayer.y - playerTarget.current.y) < 0.05;

      if (xAligned) {
        nextPlayer.x = playerTarget.current.x;
        const curX = playerTarget.current.x;
        const checkY = Math.round(nextPlayer.y);
        if (keysPressed.current.has('ArrowLeft') && canMoveTo(curX - 1, checkY, grid, digs)) {
          playerTarget.current.x = curX - 1;
          nextPlayer.direction = 'left';
        } else if (keysPressed.current.has('ArrowRight') && canMoveTo(curX + 1, checkY, grid, digs)) {
          playerTarget.current.x = curX + 1;
          nextPlayer.direction = 'right';
        }
      }

      const spaceDown = keysPressed.current.has('Space');
      if (spaceDown && !spaceWasDown.current && (nextPlayer.jumpCount ?? 0) < 2) {
        if (nextPlayer.jumpCount === 0 && (standing || onLadder)) {
          nextPlayer.vY = JUMP_FORCE;
          nextPlayer.jumpCount = 1;
          playOneShot(AUDIO_URLS.JUMP, 0.2);
        } else if (nextPlayer.jumpCount === 1) {
          nextPlayer.vY = JUMP_FORCE;
          nextPlayer.jumpCount = 2;
          playOneShot(AUDIO_URLS.JUMP, 0.3);
        }
      }
      spaceWasDown.current = spaceDown;

      const pDown = keysPressed.current.has('KeyP');
      if (pDown && !pWasDown.current) {
        const px = Math.round(nextPlayer.x);
        const py = Math.round(nextPlayer.y);
        setPuddles(prev => [...prev.filter(p => !(p.x === px && p.y === py)), { x: px, y: py, timer: PUDDLE_DURATION }]);
      }
      pWasDown.current = pDown;

      if (yAligned && xAligned && nextPlayer.vY === 0) {
        nextPlayer.y = playerTarget.current.y;
        const curX = playerTarget.current.x;
        const curY = playerTarget.current.y;
        if (keysPressed.current.has('ArrowUp') && (isInsideLadder(curX, curY, grid) || isInsideLadder(curX, curY - 1, grid))) {
          if (canMoveTo(curX, curY - 1, grid, digs)) { playerTarget.current.y = curY - 1; nextPlayer.isClimbing = true; }
        } else if (keysPressed.current.has('ArrowDown') && (isInsideLadder(curX, curY + 1, grid) || canMoveTo(curX, curY + 1, grid, digs))) {
          playerTarget.current.y = curY + 1; nextPlayer.isClimbing = true;
        }

        const rx = Math.round(curX);
        const ry = Math.round(curY);
        if (keysPressed.current.has('KeyZ') && grid[ry+1]?.[rx-1] === CellType.BRICK && grid[ry]?.[rx-1] === CellType.EMPTY) {
          setDigs(d => [...d.filter(x => !(x.x === rx-1 && x.y === ry+1)), { x: rx-1, y: ry+1, timer: DIG_DURATION }]);
        }
        if (keysPressed.current.has('KeyX') && grid[ry+1]?.[rx+1] === CellType.BRICK && grid[ry]?.[rx+1] === CellType.EMPTY) {
          setDigs(d => [...d.filter(x => !(x.x === rx+1 && x.y === ry+1)), { x: rx+1, y: ry+1, timer: DIG_DURATION }]);
        }
        if (keysPressed.current.has('KeyS') && grid[ry-1]?.[rx] === CellType.BRICK) {
          setDigs(d => [...d.filter(x => !(x.x === rx && x.y === ry-1)), { x: rx, y: ry-1, timer: DIG_DURATION }]);
        }
      }

      if (nextPlayer.x < playerTarget.current.x) nextPlayer.x = Math.min(nextPlayer.x + PLAYER_SPEED, playerTarget.current.x);
      else if (nextPlayer.x > playerTarget.current.x) nextPlayer.x = Math.max(nextPlayer.x - PLAYER_SPEED, playerTarget.current.x);
      
      if (nextPlayer.vY === 0 && (onLadder || standing)) {
        if (nextPlayer.y < playerTarget.current.y) nextPlayer.y = Math.min(nextPlayer.y + PLAYER_SPEED, playerTarget.current.y);
        else if (nextPlayer.y > playerTarget.current.y) nextPlayer.y = Math.max(nextPlayer.y - PLAYER_SPEED, playerTarget.current.y);
      }

      const finalIX = Math.round(nextPlayer.x);
      const finalIY = Math.round(nextPlayer.y);
      if (grid[finalIY]?.[finalIX] === CellType.GOLD) {
        setGrid(g => { const nextG = g.map(r => [...r]); nextG[finalIY][finalIX] = CellType.EMPTY; return nextG; });
        setScore(s => s + 100); setGoldCount(c => c - 1); playOneShot(AUDIO_URLS.GOLD, 0.3);
      }
      if (grid[finalIY]?.[finalIX] === CellType.EXIT) setStatus('VICTORY');
      return nextPlayer;
    });

    // Enemy Scaling Logic
    const baseEnemySpeed = ENEMY_SPEED * Math.pow(1.1, Math.floor((levelNumber - 1) / 10));

    setEnemies(prevEnemies => prevEnemies.map(enemy => {
      let nextEnemy = { ...enemy };
      const target = enemyTargets.current.get(enemy.id) || { x: enemy.x, y: enemy.y };
      const isAligned = Math.abs(enemy.x - target.x) < 0.05 && Math.abs(enemy.y - target.y) < 0.05;
      const ex_round = Math.round(enemy.x);
      const ey_round = Math.round(enemy.y);
      
      const inPuddle = puddles.some(p => p.x === ex_round && p.y === ey_round);
      const effectiveSpeed = inPuddle ? baseEnemySpeed * PUDDLE_SLOW_FACTOR : baseEnemySpeed;

      if (isAligned) {
        nextEnemy.x = target.x; nextEnemy.y = target.y;
        const onLadder = isInsideLadder(nextEnemy.x, nextEnemy.y, grid);
        const standing = isStandingOnSolid(nextEnemy.x, nextEnemy.y, grid, digs);
        if (!onLadder && !standing) {
          enemyTargets.current.set(enemy.id, { x: ex_round, y: ey_round + 1 });
        } else {
          let nextT = { x: ex_round, y: ey_round };
          const px = Math.round(player.x); const py = Math.round(player.y);
          if (onLadder && py !== ey_round) {
            if (py < ey_round && (isInsideLadder(ex_round, ey_round - 1, grid) || canMoveTo(ex_round, ey_round - 1, grid, digs))) nextT = { x: ex_round, y: ey_round - 1 };
            else if (py > ey_round && (isInsideLadder(ex_round, ey_round + 1, grid) || canMoveTo(ex_round, ey_round + 1, grid, digs))) nextT = { x: ex_round, y: ey_round + 1 };
          }
          if (nextT.y === ey_round && px !== ex_round) {
            if (px < ex_round && canMoveTo(ex_round - 1, ey_round, grid, digs)) { nextT = { x: ex_round - 1, y: ey_round }; nextEnemy.direction = 'left'; }
            else if (px > ex_round && canMoveTo(ex_round + 1, ey_round, grid, digs)) { nextT = { x: ex_round + 1, y: ey_round }; nextEnemy.direction = 'right'; }
          }
          enemyTargets.current.set(enemy.id, nextT);
        }
      }

      if (nextEnemy.x < target.x) nextEnemy.x = Math.min(nextEnemy.x + effectiveSpeed, target.x);
      else if (nextEnemy.x > target.x) nextEnemy.x = Math.max(nextEnemy.x - effectiveSpeed, target.x);
      if (nextEnemy.y < target.y) nextEnemy.y = Math.min(nextEnemy.y + effectiveSpeed, target.y);
      else if (nextEnemy.y > target.y) nextEnemy.y = Math.max(nextEnemy.y - effectiveSpeed, target.y);

      if (Math.abs(nextEnemy.x - player.x) < 0.6 && Math.abs(nextEnemy.y - player.y) < 0.6) {
        setStatus('GAMEOVER'); playOneShot(AUDIO_URLS.GAME_OVER, 0.5);
      }
      return nextEnemy;
    }));
  }, [status, grid, player.x, player.y, digs, puddles, playOneShot, levelNumber, canMoveTo, isInsideLadder, isStandingOnSolid]);

  useEffect(() => {
    if (status === 'PLAYING') gameLoopRef.current = window.setInterval(tick, TICK_RATE);
    else if (gameLoopRef.current) clearInterval(gameLoopRef.current);
    return () => { if (gameLoopRef.current) clearInterval(gameLoopRef.current); };
  }, [status, tick]);

  const getThemeStyles = (lvl: number) => {
    if (lvl > 90) return "psychedelic-brick border-black border-2";
    if (lvl > 80) return "bg-[repeating-linear-gradient(90deg,#f87171,#f87171_2px,#fff_2px,#fff_4px)] border-red-900";
    if (lvl > 70) return "bg-[repeating-linear-gradient(45deg,#000,#000_10px,#3b82f6_10px,#3b82f6_20px)] border-black";
    if (lvl > 60) return "bg-[repeating-linear-gradient(45deg,#000,#000_10px,#ef4444_10px,#ef4444_20px)] border-black";
    if (lvl > 50) return "bg-orange-600 border-orange-800 shadow-inner";
    if (lvl > 40) return "bg-pink-500 border-pink-300 shadow-[0_0_15px_rgba(255,0,255,0.6)] animate-pulse-subtle";
    if (lvl > 30) return "bg-purple-800 border-purple-950 shadow-inner";
    if (lvl > 20) return "bg-emerald-800 border-emerald-950 shadow-inner";
    if (lvl > 10) return "bg-sky-800 border-sky-950 shadow-inner";
    return "bg-amber-800 border-amber-950 shadow-inner";
  };

  const Cell: React.FC<{ type: CellType, x: number, y: number }> = ({ type, x, y }) => {
    const isDigged = digs.find(d => d.x === x && d.y === y);
    const hasPuddle = puddles.find(p => p.x === x && p.y === y);
    const themeClass = getThemeStyles(levelNumber);

    if (isDigged) return <div className="w-full h-full bg-black/60 flex items-center justify-center text-[8px] text-white font-bold">{(isDigged.timer / 60).toFixed(1)}</div>;

    return (
      <div className="relative w-full h-full">
        {hasPuddle && (
          <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-yellow-400/80 rounded-t-lg z-0 mx-0.5 animate-pulse shadow-[0_-2px_4px_rgba(250,204,21,0.5)]" />
        )}
        {type === CellType.BRICK && <div className={`w-full h-full border-[1px] rounded-sm ${themeClass}`} />}
        {type === CellType.SOLID && <div className="w-full h-full bg-zinc-800 border-[1px] border-black shadow-md" />}
        {type === CellType.LADDER && (
          <div className="w-full h-full flex flex-col justify-around px-1">
            <div className="h-1 w-full bg-slate-400 rounded-full" />
            <div className="h-1 w-full bg-slate-400 rounded-full" />
            <div className="h-1 w-full bg-slate-400 rounded-full" />
          </div>
        )}
        {type === CellType.GOLD && <div className="w-full h-full flex items-center justify-center text-xl floating">🐟</div>}
        {type === CellType.EXIT && (
          <div className="w-full h-full flex items-center justify-center text-2xl animate-bounce bg-white/20 rounded-full border-2 border-yellow-400 z-20">
            🏁
          </div>
        )}
      </div>
    );
  };

  const Sprite: React.FC<{ entity: Entity }> = ({ entity }) => (
    <div 
      className="absolute flex items-center justify-center z-10 transition-all duration-75"
      style={{ 
        width: `calc(100% / ${GRID_WIDTH})`, height: `calc(100% / ${GRID_HEIGHT})`,
        left: `calc(${entity.x} * 100% / ${GRID_WIDTH})`, top: `calc(${entity.y} * 100% / ${GRID_HEIGHT})`,
        transform: `${entity.direction === 'left' ? 'scaleX(-1)' : 'scaleX(1)'}`,
      }}
    >
      <span className="text-2xl drop-shadow-lg">{entity.type === 'player' ? '🐈' : '🐕'}</span>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-950 text-white p-4">
      <style>{`
        @keyframes psy-brick { 
          0% { background-color: #f00; filter: hue-rotate(0deg); } 
          50% { background-color: #0f0; filter: hue-rotate(180deg); }
          100% { background-color: #f00; filter: hue-rotate(360deg); } 
        }
        .psychedelic-brick { animation: psy-brick 2s infinite linear; }
        .animate-pulse-subtle { animation: pulse 2s infinite ease-in-out; }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.8; } }
        .animate-wiggle { animation: wiggle 1s infinite; }
        @keyframes wiggle { 0%, 100% { transform: rotate(-3deg); } 50% { transform: rotate(3deg); } }
      `}</style>
      
      <div className="w-full max-w-4xl flex justify-between items-start mb-4 px-6 bg-zinc-900/90 py-3 rounded-2xl border border-zinc-800 shadow-2xl backdrop-blur-xl">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <span className="pixel-font text-orange-500 text-xl">{levelNumber}</span>
            <h2 className="text-lg font-black uppercase tracking-tight text-white/90">{currentLevel.name}</h2>
          </div>
          <p className="text-xs text-zinc-400 font-medium italic">{currentLevel.description}</p>
        </div>
        <div className="flex gap-4">
          <div className="flex flex-col items-center">
            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Score</span>
            <span className="text-xl pixel-font text-yellow-500">{score}</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Fish</span>
            <span className="text-xl pixel-font text-cyan-400">{goldCount}</span>
          </div>
          <div className="flex gap-2">
            <button onClick={handlePreviousLevel} className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors" title="Previous Level"><Rewind size={18}/></button>
            <button onClick={handleNextLevel} className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors" title="Skip Level"><FastForward size={18}/></button>
          </div>
        </div>
      </div>

      <div className="relative w-full max-w-4xl aspect-[20/15] bg-black rounded-2xl overflow-hidden border-8 border-zinc-900 shadow-2xl ring-1 ring-white/10">
        <div className="absolute inset-0 grid grid-cols-[repeat(20,1fr)] grid-rows-[repeat(15,1fr)]">
          {grid.map((row, y) => row.map((cell, x) => <Cell key={`${x}-${y}`} type={cell} x={x} y={y} />))}
        </div>
        {status === 'PLAYING' && <><Sprite entity={player} />{enemies.map(e => <Sprite key={e.id} entity={e} />)}</>}
        
        {status === 'MENU' && (
          <div className="absolute inset-0 bg-black/95 flex flex-col items-center justify-center z-50 p-8 text-center">
            <Cat size={80} className="text-orange-500 mb-4 animate-bounce" />
            <h1 className="text-5xl font-black mb-2 text-white pixel-font tracking-tighter">LODE PURRER</h1>
            <p className="text-zinc-400 mb-8 max-w-md font-medium text-lg">100 unique levels of feline mayhem. Snag the fish. Dodge the dogs. Leave puddles.</p>
            <button onClick={() => initLevel(DEFAULT_LEVELS[0], 1)} className="bg-orange-600 hover:bg-orange-500 px-12 py-5 rounded-2xl font-black text-2xl flex items-center gap-3 transition-all transform hover:scale-105 active:scale-95 shadow-xl shadow-orange-900/40"><Play fill="white"/> START HUNT</button>
          </div>
        )}
        
        {status === 'GAMEOVER' && (
          <div className="absolute inset-0 bg-rose-950/90 flex flex-col items-center justify-center z-50 p-8 text-center backdrop-blur-sm">
            <Skull size={80} className="text-rose-500 mb-4 animate-wiggle" />
            <h2 className="text-4xl font-black pixel-font text-white mb-8 drop-shadow-lg">CAUGHT!</h2>
            <div className="flex gap-4">
              <button onClick={() => initLevel(currentLevel, levelNumber)} className="bg-white text-rose-950 px-10 py-4 rounded-2xl font-black text-xl hover:bg-zinc-200 transition-all shadow-lg">RETRY</button>
              <button onClick={() => setStatus('MENU')} className="bg-black/60 px-10 py-4 rounded-2xl font-black text-xl border border-white/20 hover:bg-black/80 transition-all">MENU</button>
            </div>
          </div>
        )}

        {status === 'VICTORY' && (
          <div className="absolute inset-0 bg-emerald-950/90 flex flex-col items-center justify-center z-50 p-8 text-center backdrop-blur-md">
            <Trophy size={90} className="text-yellow-400 mb-6 floating drop-shadow-[0_0_20px_rgba(250,204,21,0.5)]" />
            <h2 className="text-5xl font-black pixel-font text-white mb-10">MEOW-VELOUS!</h2>
            <button onClick={handleNextLevel} className="bg-white text-emerald-950 px-14 py-5 rounded-2xl font-black text-2xl hover:bg-zinc-200 transition-all shadow-xl shadow-emerald-900/40 transform hover:scale-105">NEXT LEVEL</button>
          </div>
        )}
        
        {status === 'LOADING' && (
          <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center z-50 p-8 text-center">
            <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mb-6" />
            <p className="text-xl font-bold italic text-zinc-400">{loadingMsg}</p>
          </div>
        )}
      </div>

      <footer className="mt-8 flex flex-wrap justify-center gap-6 text-[11px] font-black uppercase text-zinc-500 tracking-widest">
        <div className="flex items-center gap-2 bg-zinc-900/80 px-5 py-2.5 rounded-full border border-zinc-800 shadow-sm"><MousePointer2 size={12}/> ARROWS: MOVE</div>
        <div className="flex items-center gap-2 bg-zinc-900/80 px-5 py-2.5 rounded-full border border-zinc-800 text-orange-400 shadow-sm"><Sparkles size={12}/> SPACE: DOUBLE JUMP</div>
        <div className="flex items-center gap-2 bg-yellow-950/20 px-5 py-2.5 rounded-full border border-yellow-900/50 text-yellow-400 shadow-sm"><MoveUp size={12}/> P: PEE (SLOW DOGS)</div>
        <div className="flex items-center gap-2 bg-zinc-900/80 px-5 py-2.5 rounded-full border border-zinc-800 shadow-sm">Z/X/S: DIG & CLAW</div>
      </footer>
    </div>
  );
};

export default App;
