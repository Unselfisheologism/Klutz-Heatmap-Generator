'use client';

import { useState, useCallback, ChangeEvent, DragEvent, useEffect, useRef } from 'react';
// Removed Genkit imports
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea'; // Using Textarea for result display
import { UploadCloud, Download, RefreshCw, AlertCircle, X } from 'lucide-react';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';

// Declare puter type globally or import if types are available
declare global {
  interface Window {
    puter: any; // Use 'any' for now, replace with actual type if available
  }
}

type FileType = 'image' | 'text' | null;
// Analysis result will now be text for both image and text inputs
type AnalysisResult = string | null;

export function AttentionAnalyzer() {
  const [puter, setPuter] = useState<any>(null); // State to hold the puter instance
  const [file, setFile] = useState<File | null>(null);
  const [fileType, setFileType] = useState<FileType>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null); // For image preview or text content
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [analysisMode, setAnalysisMode] = useState<'image' | 'text' | null>(null); // To know what was analyzed

  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null); // Ref for file input

  // Initialize Puter.js instance when component mounts
  useEffect(() => {
    if (typeof window !== 'undefined' && window.puter) {
      setPuter(window.puter);
    } else {
      // Optional: Poll for puter instance if script loads asynchronously
      const interval = setInterval(() => {
        if (typeof window !== 'undefined' && window.puter) {
          setPuter(window.puter);
          clearInterval(interval);
        }
      }, 100);
      // Cleanup interval on component unmount
      return () => clearInterval(interval);
    }
  }, []);

  const resetState = useCallback(() => {
    setFile(null);
    setFileType(null);
    setFilePreview(null);
    setAnalysisResult(null);
    setIsLoading(false);
    setError(null);
    setIsDragging(false);
    setAnalysisMode(null);
    // Reset file input visually
    if (fileInputRef.current) {
        fileInputRef.current.value = '';
    }
  }, []);


  const handleFileChange = useCallback((selectedFile: File | null) => {
    if (!selectedFile) {
      resetState();
      return;
    }

    // Reset previous state before processing new file
    resetState();

    const reader = new FileReader();
    const type = selectedFile.type.startsWith('image/') ? 'image' : 'text'; // Simplify: treat non-images as text

    // Basic validation for common types, can be expanded
    const allowedImageTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
    const allowedTextTypes = ['text/plain', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/html', 'text/csv']; // Add more if needed

    if (type === 'image' && !allowedImageTypes.includes(selectedFile.type)) {
      setError(`Unsupported image type: ${selectedFile.type}. Please use PNG, JPG, GIF, or WEBP.`);
      toast({
        title: 'Unsupported Image Type',
        description: `Please use PNG, JPG, GIF, or WEBP.`,
        variant: 'destructive',
      });
      return;
    }
    // For text, we'll attempt analysis but warn if it's not plain text
    // if (type === 'text' && !allowedTextTypes.includes(selectedFile.type)) {
    //   console.warn(`Attempting to analyze potentially unsupported text type: ${selectedFile.type}`);
    //    toast({
    //      title: 'Potentially Unsupported Text Type',
    //      description: `Analysis may work best with TXT, PDF, DOC files.`,
    //      variant: 'default', // Use default or warning variant
    //    });
    // }


    setFile(selectedFile);
    setFileType(type);

    reader.onloadend = () => {
      const resultString = reader.result as string;
      if (type === 'image') {
        setFilePreview(resultString); // Data URI for image preview
      } else {
        // For text, store the actual content for display/analysis if it's plain text
        if (selectedFile.type === 'text/plain' || selectedFile.type === 'text/html' || selectedFile.type === 'text/csv') {
           reader.onload = (e) => setFilePreview(e.target?.result as string); // Store text content
           reader.readAsText(selectedFile); // Reread as text
        } else {
           setFilePreview(selectedFile.name); // Show filename for PDF/DOC etc.
        }
      }
    };

    reader.onerror = () => {
        setError(`Failed to read the file: ${selectedFile.name}`);
        toast({ title: 'File Read Error', description: `Could not read file: ${selectedFile.name}`, variant: 'destructive' });
        resetState();
    };

    // Read as Data URL initially for potential image preview or sending non-plain text
    reader.readAsDataURL(selectedFile);

  }, [resetState, toast]);


  const handleFileUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    handleFileChange(files && files.length > 0 ? files[0] : null);
  };

   const handlePaste = useCallback(async (event: ClipboardEvent) => {
    if (!puter) {
       toast({ title: 'Puter.js not ready', description: 'Please wait a moment and try again.', variant: 'destructive' });
       return;
    }
    event.preventDefault();
    const items = event.clipboardData?.items;
    if (!items) return;

    let foundContent = false;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.kind === 'file' && item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          handleFileChange(file);
          foundContent = true;
          toast({ title: 'Pasted image successfully!' });
          break;
        }
      } else if (item.kind === 'string' && item.type.startsWith('text/plain')) {
        item.getAsString((text) => {
           if (text) {
             // Simulate a file for consistency
             const blob = new Blob([text], { type: 'text/plain' });
             const file = new File([blob], 'pasted_text.txt', { type: 'text/plain' });
             handleFileChange(file);
             foundContent = true;
             toast({ title: 'Pasted text successfully!' });
           }
        });
        // Need to break here because getAsString is async
         if (foundContent) break;
      }
    }

     if (!foundContent) {
       // Check for non-image files after images/text
        for (let i = 0; i < items.length; i++) {
           const item = items[i];
           if (item.kind === 'file') { // Handle any file type pasted
               const file = item.getAsFile();
               if (file) {
                   handleFileChange(file);
                   foundContent = true;
                   toast({ title: 'Pasted file successfully!' });
                   break;
               }
           }
        }
     }

     if (!foundContent) {
        toast({ title: 'No compatible content found in clipboard.', description: 'Paste an image, text, or a file.', variant: 'destructive' });
     }

  }, [handleFileChange, toast, puter]);


  const handleDrop = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);

    if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
      handleFileChange(event.dataTransfer.files[0]);
      event.dataTransfer.clearData();
    }
  }, [handleFileChange]);

  const handleDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    // Only set dragging to false if the leave target is outside the drop zone
    // This prevents flickering when dragging over child elements
    if ((event.relatedTarget as Node)?.contains && !(event.currentTarget as Node).contains(event.relatedTarget as Node)) {
        setIsDragging(false);
    } else if (!event.relatedTarget) {
        // Handles leaving the window entirely
        setIsDragging(false);
    }
  }, []);

   const handleAnalyze = async () => {
    if (!puter) {
      setError('Puter.js is not initialized. Please refresh or wait.');
      toast({ title: 'Puter.js Error', description: 'Puter.js failed to load.', variant: 'destructive' });
      return;
    }
    if (!file || !fileType) {
      setError('Please upload or paste a file first.');
      toast({ title: 'No File', description: 'Upload or paste a file to analyze.', variant: 'destructive' });
      return;
    }

    // Prompt for sign-in if not already signed in
    if (!puter.auth.isSignedIn()) {
        try {
            toast({ title: 'Authentication Required', description: 'Please sign in with Puter to continue.' });
            await puter.auth.signIn();
            toast({ title: 'Signed In Successfully!' });
        } catch (authError) {
            console.error('Authentication Error:', authError);
            setError('Authentication failed or was cancelled. Please sign in to analyze.');
            toast({ title: 'Authentication Failed', description: 'Could not sign in with Puter.', variant: 'destructive' });
            return; // Stop analysis if auth fails
        }
    }


    setIsLoading(true);
    setError(null);
    setAnalysisResult(null);
    setAnalysisMode(fileType); // Set the mode based on the input file type

    try {
      const reader = new FileReader();

      reader.onloadend = async () => {
          const dataUri = reader.result as string;
          let prompt = '';
          let analysisInput: any = null;
          let options = { model: 'gpt-4o' }; // Default to gpt-4o

          if (fileType === 'image') {
              prompt = `Analyze this image and identify areas of high visual attention (interesting spots) and low visual attention (boring spots). Describe these areas. Also, provide a general summary of where a viewer's eye might be drawn first and why. Format the response clearly, perhaps using markdown for headings (e.g., ## High Attention Areas).`;
              // Puter.js AI chat with image URL (data URI)
              analysisInput = [dataUri]; // Pass data URI as the second argument for image context
              options.model = 'gpt-4o'; // GPT-4o supports vision

          } else if (fileType === 'text') {
              // Extract text content for analysis. If it's not plain text, this might be inaccurate.
              // A more robust solution for PDF/DOC might use puter.ai.img2txt if applicable or server-side parsing.
              // For this example, we'll assume plain text extraction or send the whole content.
              let textContent = filePreview || ''; // Use preview if it's text content, otherwise filename

              if (file.type === 'text/plain' || file.type === 'text/html' || file.type === 'text/csv') {
                 // If we stored text content in filePreview
                 textContent = filePreview || '';
              } else {
                 // For non-plain text, read again as text (best effort)
                 textContent = await file.text().catch(e => {
                     console.error("Error reading non-plain text file:", e);
                     setError(`Could not read content from ${file.name}. Analysis might be based on filename only.`);
                     return `File: ${file.name}, Type: ${file.type}`; // Fallback content
                 });
              }

              prompt = `Analyze the following text content. Identify sentences or sections that are particularly engaging or attention-grabbing, and sections that might be considered boring or less engaging. Explain your reasoning for each. Also, provide an overall summary of the text's engagement potential. Structure the response clearly, perhaps using markdown. Text Content:\n\n"${textContent}"`;
              // Puter.js AI chat with text prompt
              analysisInput = prompt; // Pass only the prompt for text analysis
          }

          try {
              console.log(`Calling puter.ai.chat with model: ${options.model}`);
              const result = await puter.ai.chat(prompt, analysisInput, options);
              console.log("Puter AI Result:", result);
              // Puter's response format might vary, adjust access accordingly.
              // Assuming the result structure has a 'text' or similar property.
              const resultText = result?.message?.content || result?.text || JSON.stringify(result); // Adapt based on actual Puter response
              setAnalysisResult(resultText);
              toast({ title: `${fileType === 'image' ? 'Image' : 'Text'} analysis complete!` });
          } catch (err: any) {
              console.error(`${fileType === 'image' ? 'Image' : 'Text'} Analysis Error:`, err);
              setError(`Failed to analyze the ${fileType}. ${err.message || 'Please try again.'}`);
              toast({ title: 'Analysis Error', description: `Could not analyze the ${fileType}.`, variant: 'destructive' });
          } finally {
              setIsLoading(false);
          }
      };

       reader.onerror = () => {
         setError('Failed to read the file.');
         toast({ title: 'File Read Error', description: 'Could not read the file.', variant: 'destructive'});
         setIsLoading(false);
       }

      // Read the file as Data URI. This is needed for sending images to puter.ai.chat
      // and serves as a fallback for non-plain text files.
      reader.readAsDataURL(file);

    } catch (err: any) {
      console.error('Analysis Setup Error:', err);
      setError(`An unexpected error occurred during analysis setup. ${err.message}`);
      toast({ title: 'Analysis Error', description: 'An unexpected error occurred before analysis.', variant: 'destructive' });
      setIsLoading(false);
    }
  };


  const handleDownload = () => {
    if (!analysisResult || !analysisMode) return; // Need analysisMode to determine file type

    const link = document.createElement('a');
    const fileExtension = analysisMode === 'image' ? 'txt' : 'txt'; // Save analysis description as text
    const originalFileName = file?.name.replace(/\.[^/.]+$/, "") || 'analysis'; // Get original name without extension
    link.download = `attention_analysis_${originalFileName}.${fileExtension}`;

    const blob = new Blob([analysisResult], { type: 'text/plain' });
    link.href = URL.createObjectURL(blob);

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href); // Clean up blob URL
    toast({ title: 'Download started!' });
  };


  return (
    <div className="space-y-6">
       {!puter && (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Puter.js Loading</AlertTitle>
                <AlertDescription>
                    Puter.js is initializing. If this message persists, please refresh the page.
                    Make sure you have the Puter.js script tag in your HTML head.
                </AlertDescription>
            </Alert>
        )}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
           <Button variant="ghost" size="icon" className="absolute top-2 right-2" onClick={() => setError(null)}>
                <X className="h-4 w-4" />
           </Button>
        </Alert>
      )}

      <Card
        className={`transition-colors duration-200 ease-in-out ${isDragging ? 'border-primary border-2 ring-2 ring-primary ring-offset-2' : 'border-border'}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragEnter={handleDragOver} // Make sure enter also sets dragging state
        onDragLeave={handleDragLeave}
        onPaste={handlePaste} // Listen for paste events
        tabIndex={0} // Make card focusable for paste
        aria-label="Content upload area: Drag & drop, paste, or click to browse files"
      >
        <CardHeader>
          <CardTitle>Upload Content</CardTitle>
          <CardDescription>Drag & drop, paste, or select an image or text file.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className={`flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-10 text-center min-h-[200px] transition-colors ${isDragging ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'}`}>
            <UploadCloud className={`h-12 w-12 mb-4 transition-colors ${isDragging ? 'text-primary' : 'text-muted-foreground'}`} />
             {filePreview && fileType === 'image' ? (
                 <div className="relative w-32 h-32 mb-4 group">
                    <Image src={filePreview} alt="Preview" layout="fill" objectFit="contain" className="rounded border"/>
                     <Button variant="destructive" size="icon" className="absolute -top-2 -right-2 bg-background rounded-full h-6 w-6 p-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={resetState} aria-label="Remove file">
                         <X className="h-4 w-4" />
                     </Button>
                 </div>
             ) : file ? (
                 <div className="relative mb-4 text-center bg-muted p-2 rounded max-w-full overflow-hidden text-ellipsis whitespace-nowrap group">
                    <span className="text-sm font-medium">{file.name}</span> <span className="text-xs text-muted-foreground">({file.type || 'unknown type'})</span>
                    <Button variant="destructive" size="icon" className="absolute -top-2 -right-2 bg-background rounded-full h-6 w-6 p-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={resetState} aria-label="Remove file">
                        <X className="h-4 w-4" />
                    </Button>
                 </div>
             ) : (
                <p className="text-muted-foreground">{isDragging ? 'Drop the file here!' : 'Drag & drop, paste content, or click to browse.'}</p>
             )}

            <Label htmlFor="file-upload" className={`cursor-pointer text-primary hover:underline font-medium mt-2 ${file ? 'hidden' : ''}`}>
              {file ? 'Choose different file' : 'Choose file'}
            </Label>
            <Input
                ref={fileInputRef} // Attach ref
                id="file-upload"
                type="file"
                className="hidden"
                onChange={handleFileUpload}
                // Accept common image and text types
                accept="image/*,text/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
             />
             <p className="text-xs text-muted-foreground mt-2">Supports images (PNG, JPG, etc.) and text documents (TXT, PDF, DOCX, etc.)</p>
          </div>
          <Button onClick={handleAnalyze} disabled={!file || isLoading || !puter} className="w-full" aria-live="polite">
            {isLoading ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              `Analyze ${fileType ? (fileType === 'image' ? 'Image' : 'Text') : 'Content'}`
            )}
          </Button>
          {/* Simple visual loading indicator */}
          {isLoading && <div className="h-2 bg-primary/20 rounded-full w-full overflow-hidden"><div className="h-full bg-primary animate-pulse w-1/2 mx-auto"></div></div>}

        </CardContent>
      </Card>

      {analysisResult && analysisMode && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-x-4">
            <div>
                <CardTitle>Analysis Result</CardTitle>
                <CardDescription>AI-generated insights on content attention.</CardDescription>
            </div>
             <Button onClick={handleDownload} variant="outline" size="sm">
              <Download className="mr-2 h-4 w-4" />
              Download Analysis
            </Button>
          </CardHeader>
          <CardContent>
            {analysisMode === 'image' && filePreview && (
              <div className="mb-4 border rounded-lg overflow-hidden max-w-md mx-auto">
                 <Image src={filePreview} alt="Analyzed Image" width={500} height={500} objectFit="contain" data-ai-hint="uploaded image analysis" />
              </div>
            )}
             <h3 className="font-semibold mb-2 text-lg">AI Analysis:</h3>
              <Textarea
                readOnly
                value={analysisResult}
                className="border rounded-lg p-4 bg-card text-card-foreground min-h-[200px] max-h-[400px] overflow-y-auto whitespace-pre-wrap text-sm"
                aria-label="AI analysis result text"
              />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
