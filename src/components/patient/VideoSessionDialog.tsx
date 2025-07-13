import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ExternalLink, Loader2 } from "lucide-react";

interface VideoSessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  videoUrl: string | null;
}

const VideoSessionDialog = ({ open, onOpenChange, videoUrl }: VideoSessionDialogProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const handleIframeLoad = () => {
    setIsLoading(false);
  };

  const handleIframeError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  const handleOpenInNewTab = () => {
    if (videoUrl) {
      window.open(videoUrl, '_blank');
    }
  };

  if (!videoUrl) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Video Session</DialogTitle>
          <DialogDescription>
            Your therapy session is ready. You can also open this in a new tab if needed.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 relative bg-muted rounded-lg overflow-hidden">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-10">
              <div className="text-center space-y-3">
                <Loader2 className="h-8 w-8 animate-spin mx-auto" />
                <p className="text-sm text-muted-foreground">Connecting to video session...</p>
              </div>
            </div>
          )}
          
          {hasError ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center space-y-4">
                <p className="text-sm text-muted-foreground">
                  Unable to load video session in this window
                </p>
                <Button onClick={handleOpenInNewTab} variant="outline">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open in New Tab
                </Button>
              </div>
            </div>
          ) : (
            <iframe
              src={videoUrl}
              className="w-full h-full border-0"
              allow="camera; microphone; fullscreen; display-capture"
              allowFullScreen
              onLoad={handleIframeLoad}
              onError={handleIframeError}
              title="Video Session"
            />
          )}
        </div>
        
        <div className="flex justify-between items-center pt-2">
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
      </DialogContent>
    </Dialog>
  );
};

export default VideoSessionDialog;