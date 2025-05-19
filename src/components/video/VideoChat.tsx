
import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Loader2, Mic, MicOff, Video, VideoOff, X, AlertCircle, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface VideoChatProps {
  roomUrl: string;
  isOpen: boolean;
  onClose: () => void;
}

const VideoChat: React.FC<VideoChatProps> = ({ roomUrl, isOpen, onClose }) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(false);
  const [loadAttempts, setLoadAttempts] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  
  // Reset state when the component opens
  useEffect(() => {
    if (!isOpen) return;
    
    console.log('VideoChat opened, resetting state');
    setIsLoading(true);
    setError(null);
    
    if (!roomUrl) {
      console.error('No room URL provided');
      setError('No video room URL provided');
      setIsLoading(false);
      return;
    }

    // Validate that the URL is a proper Daily.co URL
    if (!roomUrl.includes('daily.co')) {
      console.error('Invalid room URL format:', roomUrl);
      setError('Invalid video room format. Please contact support.');
      setIsLoading(false);
      return;
    }
    
    // Force hide loading spinner after 8 seconds
    const timeoutId = setTimeout(() => {
      if (isLoading) {
        console.log('Video chat load timeout reached, forcing spinner to hide');
        setIsLoading(false);
      }
    }, 8000);
    
    return () => {
      console.log('Cleaning up VideoChat effects');
      clearTimeout(timeoutId);
    };
  }, [isOpen, roomUrl]);

  // Handle iframe loading
  useEffect(() => {
    if (!roomUrl || !isOpen) return;

    console.log('Setting up iframe load handlers');
    
    const handleIframeLoad = () => {
      console.log('Video iframe loaded via addEventListener');
      setIsLoading(false);
      setError(null); // Clear any previous errors
    };

    const handleIframeError = () => {
      console.error('Video iframe failed to load');
      setError('Failed to load video chat. Please check your internet connection.');
      setIsLoading(false);
    };

    const handleIframeMessage = (event: MessageEvent) => {
      // Listen for messages from Daily.co iframe that might indicate it's ready
      if (event.origin.includes('daily.co') && event.data) {
        console.log('Received message from Daily.co iframe', typeof event.data);
        // After receiving any message from daily.co, consider it loaded
        setIsLoading(false);
        setError(null); // Clear any previous errors
      }
    };

    // Add event listeners
    if (iframeRef.current) {
      iframeRef.current.addEventListener('load', handleIframeLoad);
      iframeRef.current.addEventListener('error', handleIframeError);
      window.addEventListener('message', handleIframeMessage);
    }

    return () => {
      // Clean up event listeners
      if (iframeRef.current) {
        iframeRef.current.removeEventListener('load', handleIframeLoad);
        iframeRef.current.removeEventListener('error', handleIframeError);
      }
      window.removeEventListener('message', handleIframeMessage);
    };
  }, [roomUrl, isOpen]);

  const handleRetry = () => {
    if (!iframeRef.current) return;
    
    setLoadAttempts(prev => prev + 1);
    setIsLoading(true);
    setError(null);
    
    // Add a cache-busting query parameter to force reload
    const cacheBuster = `?reload=${Date.now()}`;
    const urlWithCacheBuster = roomUrl.includes('?') 
      ? `${roomUrl}&_cb=${Date.now()}` 
      : `${roomUrl}?_cb=${Date.now()}`;
      
    // Reset the iframe src to force reload
    iframeRef.current.src = urlWithCacheBuster;
    
    toast({
      title: "Reconnecting",
      description: "Attempting to reconnect to video session...",
    });
  };

  const handleClose = () => {
    // Cleanup and close
    onClose();
  };

  const toggleAudio = () => {
    try {
      // This is a simple approach - in a more advanced implementation, 
      // we would use the Daily.co JavaScript API for finer control
      if (iframeRef.current && iframeRef.current.contentWindow) {
        // Send postMessage to iframe - this is just illustrative
        // A full implementation would use the Daily.co JS API
        iframeRef.current.contentWindow.postMessage(
          { action: 'toggle-audio' },
          '*'
        );
        setIsAudioEnabled(!isAudioEnabled);
      }
    } catch (error) {
      console.error('Error toggling audio:', error);
      toast({
        title: 'Error',
        description: 'Failed to toggle audio',
        variant: 'destructive',
      });
    }
  };

  const toggleVideo = () => {
    try {
      // Similar to audio toggle
      if (iframeRef.current && iframeRef.current.contentWindow) {
        iframeRef.current.contentWindow.postMessage(
          { action: 'toggle-video' },
          '*'
        );
        setIsVideoEnabled(!isVideoEnabled);
      }
    } catch (error) {
      console.error('Error toggling video:', error);
      toast({
        title: 'Error',
        description: 'Failed to toggle video',
        variant: 'destructive',
      });
    }
  };

  const renderVideoChatCard = () => (
    <Card className="w-full max-w-4xl h-[600px] mx-auto">
      <CardHeader className="flex flex-row items-center justify-between p-4">
        <h3 className="font-semibold">Video Session</h3>
        <Button variant="ghost" size="icon" onClick={handleClose}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="p-0 relative h-[450px]">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 z-10 pointer-events-none">
            <Loader2 className="h-8 w-8 text-white animate-spin" />
          </div>
        )}
        {error ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <p className="text-red-500 mb-4">{error}</p>
              <div className="space-x-2">
                {loadAttempts < 3 && (
                  <Button onClick={handleRetry} className="mr-2">
                    <RefreshCw className="h-4 w-4 mr-2" /> Retry Connection
                  </Button>
                )}
                <Button onClick={handleClose} variant="outline">Close</Button>
              </div>
            </div>
          </div>
        ) : (
          <iframe
            ref={iframeRef}
            src={roomUrl}
            allow="camera; microphone; fullscreen; display-capture"
            className="w-full h-full border-0"
            onLoad={() => {
              console.log('Iframe onLoad event fired directly');
              setIsLoading(false);
              setError(null);
            }}
            onError={() => {
              console.error('Iframe onError event fired');
              setError('Failed to load video chat. Please check your connection.');
              setIsLoading(false);
            }}
          ></iframe>
        )}
      </CardContent>
      <CardFooter className="flex justify-center space-x-4 p-4">
        <Button
          variant={isAudioEnabled ? "default" : "outline"}
          size="icon"
          onClick={toggleAudio}
          disabled={!!error}
        >
          {isAudioEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
        </Button>
        <Button
          variant={isVideoEnabled ? "default" : "outline"}
          size="icon"
          onClick={toggleVideo}
          disabled={!!error}
        >
          {isVideoEnabled ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
        </Button>
        <Button variant="destructive" onClick={handleClose}>
          End Call
        </Button>
      </CardFooter>
    </Card>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl p-0 overflow-hidden">
        <DialogTitle className="sr-only">Video Session</DialogTitle>
        <DialogDescription className="sr-only">Video call session interface</DialogDescription>
        {renderVideoChatCard()}
      </DialogContent>
    </Dialog>
  );
};

export default VideoChat;
