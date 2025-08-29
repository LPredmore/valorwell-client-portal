import { useState, useRef, useEffect, useCallback } from "react";
import DailyIframe from "@daily-co/daily-js";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ExternalLink, Loader2, Maximize, Mic, MicOff, Video, VideoOff, PhoneOff } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface VideoSessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  videoUrl: string | null;
}

const VideoSessionDialog = ({ open, onOpenChange, videoUrl }: VideoSessionDialogProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [participantCount, setParticipantCount] = useState(0);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const callObjectRef = useRef<any>(null);

  const handleOpenInNewTab = () => {
    if (videoUrl) {
      window.open(videoUrl, '_blank');
    }
  };

  const requestFullscreen = (el: HTMLElement) => {
    if (el.requestFullscreen) el.requestFullscreen();
    else if ((el as any).webkitRequestFullscreen) (el as any).webkitRequestFullscreen();
  };

  const toggleMic = useCallback(() => {
    if (callObjectRef.current) {
      callObjectRef.current.setLocalAudio(!isMicOn);
      setIsMicOn(!isMicOn);
    }
  }, [isMicOn]);

  const toggleCamera = useCallback(() => {
    if (callObjectRef.current) {
      callObjectRef.current.setLocalVideo(!isCameraOn);
      setIsCameraOn(!isCameraOn);
    }
  }, [isCameraOn]);

  const leaveCall = useCallback(() => {
    if (callObjectRef.current) {
      callObjectRef.current.leave();
    }
    onOpenChange(false);
  }, [onOpenChange]);

  // Initialize Daily.js call object
  useEffect(() => {
    if (!videoUrl || !open || !containerRef.current) return;

    const initializeCall = async () => {
      try {
        setIsLoading(true);
        setHasError(false);

        // Create call object
        const callObject = DailyIframe.createCallObject({
          iframeStyle: {
            position: 'absolute',
            top: '0',
            left: '0',
            width: '100%',
            height: '100%',
            border: 'none',
          },
        });

        callObjectRef.current = callObject;

        // Event handlers
        callObject.on('joined-meeting', () => {
          setIsConnected(true);
          setIsLoading(false);
          toast({
            title: "Connected",
            description: "Successfully joined the video session",
          });
        });

        callObject.on('left-meeting', () => {
          setIsConnected(false);
          onOpenChange(false);
        });

        callObject.on('participant-joined', (event: any) => {
          setParticipantCount(prev => prev + 1);
          if (event.participant.user_name) {
            toast({
              title: "Participant Joined",
              description: `${event.participant.user_name} joined the session`,
            });
          }
        });

        callObject.on('participant-left', (event: any) => {
          setParticipantCount(prev => Math.max(0, prev - 1));
          if (event.participant.user_name) {
            toast({
              title: "Participant Left",
              description: `${event.participant.user_name} left the session`,
            });
          }
        });

        callObject.on('error', (event: any) => {
          console.error('Daily.js error:', event);
          setHasError(true);
          setIsLoading(false);
          
          if (event.errorMsg?.includes('network') || event.errorMsg?.includes('connection')) {
            toast({
              title: "Connection Error",
              description: "Network issue detected. Please check your connection.",
              variant: "destructive",
            });
          } else {
            toast({
              title: "Video Session Error",
              description: event.errorMsg || "An error occurred during the video session",
              variant: "destructive",
            });
          }
        });

        // Media access errors are handled through the general error handler

        // Load and join the call
        await callObject.load({ url: videoUrl });
        
        if (containerRef.current) {
          containerRef.current.appendChild(callObject.iframe());
        }

        await callObject.join();

      } catch (error) {
        console.error('Failed to initialize call:', error);
        setHasError(true);
        setIsLoading(false);
        toast({
          title: "Connection Failed",
          description: "Unable to connect to video session. Please try again.",
          variant: "destructive",
        });
      }
    };

    initializeCall();

    return () => {
      if (callObjectRef.current) {
        callObjectRef.current.destroy();
        callObjectRef.current = null;
      }
    };
  }, [videoUrl, open, onOpenChange]);

  if (!videoUrl) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Video Session
            {isConnected && (
              <span className="text-sm font-normal text-muted-foreground">
                ({participantCount + 1} participant{participantCount !== 0 ? 's' : ''})
              </span>
            )}
          </DialogTitle>
          <DialogDescription>
            Your therapy session is ready. Use the controls below to manage your audio and video.
          </DialogDescription>
        </DialogHeader>
        
        <div 
          ref={containerRef}
          className="flex-1 relative bg-muted rounded-lg overflow-hidden"
          style={{ padding: 0, margin: 0 }}
        >
          <Button
            onClick={() => containerRef.current && requestFullscreen(containerRef.current)}
            className="absolute z-10 top-2 right-2"
            size="sm"
            variant="outline"
          >
            <Maximize className="h-4 w-4" />
          </Button>

          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-10">
              <div className="text-center space-y-3">
                <Loader2 className="h-8 w-8 animate-spin mx-auto" />
                <p className="text-sm text-muted-foreground">Connecting to video session...</p>
              </div>
            </div>
          )}
          
          {hasError && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center space-y-4">
                <p className="text-sm text-muted-foreground">
                  Unable to connect to video session
                </p>
                <Button onClick={handleOpenInNewTab} variant="outline">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open in New Tab
                </Button>
              </div>
            </div>
          )}
        </div>
        
        <div className="flex justify-between items-center pt-4 gap-4">
          <div className="flex items-center gap-2">
            <Button 
              variant={isMicOn ? "default" : "destructive"}
              size="sm"
              onClick={toggleMic}
              disabled={!isConnected}
            >
              {isMicOn ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
            </Button>
            <Button 
              variant={isCameraOn ? "default" : "destructive"}
              size="sm"
              onClick={toggleCamera}
              disabled={!isConnected}
            >
              {isCameraOn ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
            </Button>
            <Button 
              variant="destructive"
              size="sm"
              onClick={leaveCall}
              disabled={!isConnected}
            >
              <PhoneOff className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              onClick={handleOpenInNewTab}
              size="sm"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Open in New Tab
            </Button>
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              size="sm"
            >
              Close Session
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VideoSessionDialog;