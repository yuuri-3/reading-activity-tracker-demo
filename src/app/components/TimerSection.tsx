import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Button } from './ui/button';
import { Play, Pause, Square } from 'lucide-react';
import { formatDuration } from '../utils/format';
import { SaveTimerDialog } from './SaveTimerDialog';

export function TimerSection() {
  const { timerState, startTimer, pauseTimer } = useApp();
  const [showSaveDialog, setShowSaveDialog] = useState(false);

  const handleStop = () => {
    if (timerState.elapsedTime > 0) {
      pauseTimer();
      setShowSaveDialog(true);
    }
  };

  return (
    <>
      <div className="flex flex-col gap-8 p-6 rounded-lg">
        <div className="flex items-center justify-center min-h-[80px]">
          <p className="text-5xl tabular-nums text-[96px] font-[Aclonica]">
            {formatDuration(timerState.elapsedTime)}
          </p>
        </div>
        
        <div className="flex gap-4">
          {!timerState.isRunning ? (
            <Button 
              onClick={startTimer} 
              className="flex-1"
              size="lg"
            >
              <Play className="size-4 mr-2" />
              {timerState.elapsedTime > 0 ? '再開' : '計測開始'}
            </Button>
          ) : (
            <>
              <Button 
                onClick={pauseTimer} 
                variant="outline"
                className="flex-1"
                size="lg"
              >
                <Pause className="size-4 mr-2" />
                一時停止
              </Button>
              <Button 
                onClick={handleStop}
                variant="outline"
                className="flex-1"
                size="lg"
              >
                <Square className="size-4 mr-2" />
                停止
              </Button>
            </>
          )}
        </div>
        
        {timerState.isRunning && (
          <p className="text-center text-sm text-muted-foreground">
            計測中
          </p>
        )}
      </div>

      <SaveTimerDialog
        open={showSaveDialog}
        onOpenChange={setShowSaveDialog}
        duration={timerState.elapsedTime}
      />
    </>
  );
}