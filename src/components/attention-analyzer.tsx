'use client';

import { useState, useCallback, ChangeEvent, DragEvent, useEffect, useRef } from 'react';
// Declare puter type globally or import if types are available
declare global {
  interface Window {
    puter: any; // Use 'any' for now, replace with actual type if available
  }
}
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"; // Added Tabs
import { UploadCloud, Download, RefreshCw, AlertCircle, X, Type, File } from 'lucide-react'; // Added Type, File icons
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';
import { TextHeatmap } from './text-heatmap'; // Import the new component

type InputMode = 'file' | 'text';

// Define a type for structured text analysis results
interface TextSegment {
    text: string;
    engagement: 'engaging' | 'medium' | 'boring' | 'neutral'; // Add 'medium'
}

interface ImageAnalysisResult {
    description: string;
    // Add heatmapData if the AI provides structured image heatmap info
    // heatmapData?: any;
}

// Union type for analysis results
type AnalysisResult =
  | { type: 'text'; segments: TextSegment[]; rawResponse: string }
  | { type: 'image'; result: ImageAnalysisResult }
  | null;


export function AttentionAnalyzer() {
  const [puter, setPuter] = useState<any>(null);
  const [inputMode, setInputMode] = useState<InputMode>('file');
  const [uploadedFile, setUploadedFile] = useState<globalThis.File | null>(null);
  const [fileType, setFileType] = useState<'image' | 'text' | null>(null); // Type of uploaded file
  const [filePreview, setFilePreview] = useState<string | null>(null); // For image preview or uploaded text filename
  const [textInput, setTextInput] = useState<string>(''); // For direct text input
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult>(null); // Updated type
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [analysisMode, setAnalysisMode] = useState<'image' | 'text' | null>(null); // What was analyzed (image or text)

  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null); // Ref for file input

  // Initialize Puter.js instance
  useEffect(() => {
    if (typeof window !== 'undefined' && window.puter) {
      setPuter(window.puter);
    } else {
      // Retry mechanism in case Puter.js loads after initial check
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
    setUploadedFile(null);
    setFileType(null);
    setFilePreview(null);
    // Keep textInput unless fully resetting
    setAnalysisResult(null);
    setIsLoading(false);
    setError(null);
    setIsDragging(false);
    setAnalysisMode(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const resetFull = useCallback(() => {
    resetState();
    setTextInput(''); // Reset text input on full reset
  }, [resetState]);

   // Helper function to parse the AI's text analysis response
   const parseTextAnalysis = (rawResponse: string): TextSegment[] => {
    // Updated parsing logic to include MEDIUM
    // Assumes AI returns segments marked like:
    // [ENGAGING]This part is great![/ENGAGING]
    // [MEDIUM]This part is okay.[/MEDIUM]
    // [BORING]This part needs work.[/BORING]
    // This part is neutral.
    const segments: TextSegment[] = [];
    // Regex improved to handle nested structures better and multiple lines within tags
    const regex = /\[(ENGAGING|MEDIUM|BORING)\]([\s\S]*?)\[\/\1\]|([\s\S]+?(?=\[(?:ENGAGING|MEDIUM|BORING)\]|$))/g;
    let lastIndex = 0;

    // Clean up potential artifacts or explanations before parsing the core structure
    // This is a heuristic; might need refinement based on actual AI output variations.
    let structuredContent = rawResponse.split("Explanation:")[0] || rawResponse; // Attempt to remove trailing explanations
    structuredContent = structuredContent.replace(/## \w+ Attention Areas##\n/g, ''); // Remove potential markdown headers

    let match;
    while ((match = regex.exec(structuredContent)) !== null) {
        const fullMatch = match[0];
        const currentIndex = match.index;

        // Capture any neutral text before the current match, but only if it hasn't been captured already
        if (currentIndex > lastIndex) {
            const neutralText = structuredContent.substring(lastIndex, currentIndex).trim();
            if (neutralText) {
                segments.push({ text: neutralText, engagement: 'neutral' });
            }
        }

        if (match[1] && match[2]) { // Matched tagged segment
            let engagementLevel: TextSegment['engagement'] = 'neutral';
            if (match[1] === 'ENGAGING') {
                engagementLevel = 'engaging';
            } else if (match[1] === 'MEDIUM') {
                engagementLevel = 'medium';
            } else if (match[1] === 'BORING') {
                engagementLevel = 'boring';
            }
            const taggedText = match[2].trim();
            if (taggedText) {
                segments.push({ text: taggedText, engagement: engagementLevel });
            }
        } else if (match[3]) { // Matched potentially neutral text segment
            const neutralText = match[3].trim();
            if (neutralText) {
                 segments.push({ text: neutralText, engagement: 'neutral' });
            }
        }

        lastIndex = currentIndex + fullMatch.length; // Update lastIndex to the end of the current match
        regex.lastIndex = lastIndex; // Ensure regex continues from the correct position
    }

    // Capture any remaining neutral text after the last match
    if (lastIndex < structuredContent.length) {
        const remainingText = structuredContent.substring(lastIndex).trim();
        if (remainingText) {
            segments.push({ text: remainingText, engagement: 'neutral' });
        }
    }

    // If parsing yields nothing but the original text is non-empty, treat it all as neutral
    if (segments.length === 0 && structuredContent.trim()) {
        return [{ text: structuredContent.trim(), engagement: 'neutral' }];
    }

    // Filter out any empty segments that might have slipped through
    return segments.filter(s => s.text.length > 0);
   };


  const handleFileChange = useCallback((selectedFile: globalThis.File | null) => {
    if (!selectedFile) {
      // Only reset file state if a file was previously selected
      if (uploadedFile) {
        setUploadedFile(null);
        setFileType(null);
        setFilePreview(null);
        // Keep analysis result if it exists
      }
      return;
    }

    // Reset previous file state before processing new file
    setUploadedFile(null);
    setFileType(null);
    setFilePreview(null);
    setAnalysisResult(null); // Reset analysis when new file is selected
    setAnalysisMode(null);
    setError(null); // Clear errors

    const reader = new FileReader();
    const type = selectedFile.type.startsWith('image/') ? 'image' : 'text';

    const allowedImageTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
    // Basic text check, Puter.js handles more complex types
    const isLikelyText = type === 'text' || selectedFile.type.includes('text') || selectedFile.type.includes('pdf') || selectedFile.type.includes('document');

    if (type === 'image' && !allowedImageTypes.includes(selectedFile.type)) {
      setError(`Unsupported image type: ${selectedFile.type}. Please use PNG, JPG, GIF, or WEBP.`);
      toast({ title: 'Unsupported Image Type', description: `Please use PNG, JPG, GIF, or WEBP.`, variant: 'destructive' });
      resetState(); // Reset everything including file input
      return;
    }
    // Warn but allow potentially unsupported text types
    if (type === 'text' && !isLikelyText) {
        console.warn(`Attempting to analyze potentially unsupported text type: ${selectedFile.type}`);
        toast({ title: 'Potentially Unsupported Type', description: `Analysis might work best with standard image or text formats.`, variant: 'default' });
    }


    setUploadedFile(selectedFile);
    setFileType(type);

    reader.onloadend = () => {
      const resultString = reader.result as string;
      if (type === 'image') {
        setFilePreview(resultString); // Data URI for image preview
      } else {
        setFilePreview(selectedFile.name); // Show filename for text files
      }
    };

    reader.onerror = () => {
      setError(`Failed to read the file: ${selectedFile.name}`);
      toast({ title: 'File Read Error', description: `Could not read file: ${selectedFile.name}`, variant: 'destructive' });
      resetState();
    };

    reader.readAsDataURL(selectedFile); // Read as Data URL for consistency and image preview

  }, [resetState, toast, uploadedFile]);


  const handleFileUploadEvent = (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    handleFileChange(files && files.length > 0 ? files[0] : null);
  };

  const handlePaste = useCallback(async (event: ClipboardEvent) => {
    if (inputMode !== 'file') return; // Only handle paste in file mode
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
      } else if (item.kind === 'file') { // Handle any file type pasted as text source
         const file = item.getAsFile();
         if (file) {
             handleFileChange(file);
             foundContent = true;
             toast({ title: 'Pasted file successfully!' });
             break;
         }
      }
    }

    // Fallback to pasting plain text into the text input mode if no file found
    if (!foundContent) {
        for (let i = 0; i < items.length; i++) {
             const item = items[i];
             if (item.kind === 'string' && item.type.startsWith('text/plain')) {
                 item.getAsString((text) => {
                   if (text) {
                     setInputMode('text'); // Switch to text mode
                     setTextInput(text);
                     resetState(); // Clear file state
                     foundContent = true;
                     toast({ title: 'Pasted text successfully!' });
                   }
                 });
                 // Need to break here because getAsString is async
                 if (foundContent) break; // Exit loop once text is handled
             }
        }
    }

     if (!foundContent) {
        toast({ title: 'No compatible content found in clipboard.', description: 'Paste an image, file, or plain text.', variant: 'destructive' });
     }

  }, [handleFileChange, toast, puter, inputMode, resetState]);


  const handleDrop = useCallback((event: DragEvent<HTMLDivElement>) => {
    if (inputMode !== 'file') return; // Only handle drop in file mode
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);

    if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
      handleFileChange(event.dataTransfer.files[0]);
      event.dataTransfer.clearData();
    }
  }, [handleFileChange, inputMode]);

  const handleDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    if (inputMode !== 'file') return;
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(true);
  }, [inputMode]);

  const handleDragLeave = useCallback((event: DragEvent<HTMLDivElement>) => {
     if (inputMode !== 'file') return;
    event.preventDefault();
    event.stopPropagation();
    // Check if the leave event target is outside the current drop zone
    if ((event.relatedTarget as Node)?.contains && !(event.currentTarget as Node).contains(event.relatedTarget as Node)) {
        setIsDragging(false);
    } else if (!event.relatedTarget) { // Handle leaving the browser window entirely
        setIsDragging(false);
    }
  }, [inputMode]);

   const handleAnalyze = async () => {
    if (!puter) {
      setError('Puter.js is not initialized. Please refresh or wait.');
      toast({ title: 'Puter.js Error', description: 'Puter.js failed to load.', variant: 'destructive' });
      return;
    }

    const isAnalyzingFile = inputMode === 'file' && !!uploadedFile;
    const isAnalyzingText = inputMode === 'text' && textInput.trim().length > 0;

    if (!isAnalyzingFile && !isAnalyzingText) {
      setError('Please provide content to analyze (upload/paste a file or enter text).');
      toast({ title: 'No Content', description: 'Provide content to analyze.', variant: 'destructive' });
      return;
    }

    // Prompt for sign-in if not already signed in
     if (!puter.auth.isSignedIn()) {
        try {
            toast({ title: 'Authentication Required', description: 'Please sign in with Puter to continue.' });
            await puter.auth.signIn();
            toast({ title: 'Signed In Successfully!' });
        } catch (authError: any) {
            console.error('Authentication Error:', authError);
            // Check if the error indicates user cancellation
             if (authError?.message?.includes('closed')) {
                 setError('Authentication cancelled. Please sign in to analyze.');
                 toast({ title: 'Authentication Cancelled', description: 'Sign in is required for analysis.', variant: 'destructive' });
             } else {
                 setError('Authentication failed. Please try signing in again.');
                 toast({ title: 'Authentication Failed', description: `Could not sign in with Puter: ${authError?.message || 'Unknown error'}`, variant: 'destructive' });
             }
            return; // Stop analysis if auth fails or is cancelled
        }
    }

    setIsLoading(true);
    setError(null);
    setAnalysisResult(null);
    const currentAnalysisMode = isAnalyzingFile ? fileType : 'text'; // 'image' or 'text'
    setAnalysisMode(currentAnalysisMode);

    try {
      let prompt = '';
      let analysisInput: any = null; // Will hold prompt string or [prompt, dataUri]
      let options = { model: 'gpt-4o' }; // Default model

      if (isAnalyzingFile && currentAnalysisMode === 'image') {
        prompt = `Analyze this image and identify areas of high visual attention (interesting spots) and low visual attention (boring spots). Describe these areas. Also, provide a general summary of where a viewer's eye might be drawn first and why. Format the response clearly, perhaps using markdown for headings (e.g., ## High Attention Areas).`;
        // Need Data URI for image analysis with Puter
        const reader = new FileReader();
        reader.onloadend = async () => {
            const dataUri = reader.result as string;
             try {
                 console.log(`Calling puter.ai.chat (Image) with model: ${options.model}`);
                 // Pass prompt and data URI
                 const result = await puter.ai.chat(prompt, dataUri, false, options); // Added testMode=false explicitly
                 console.log("Puter AI Result (Image):", result);
                 const resultText = result?.message?.content || result?.text || JSON.stringify(result);
                 // Store the raw response for images
                 setAnalysisResult({ type: 'image', result: { description: resultText } });
                 toast({ title: 'Image analysis complete!' });
             } catch (err: any) {
                  console.error(`Image Analysis Error:`, err);
                   setError(`Failed to analyze the image. ${err.message || 'Please try again.'}`);
                   toast({ title: 'Analysis Error', description: `Could not analyze the image.`, variant: 'destructive' });
             } finally {
                  setIsLoading(false);
             }
        };
         reader.onerror = () => {
             setError('Failed to read the image file for analysis.');
             toast({ title: 'File Read Error', description: 'Could not read image file.', variant: 'destructive'});
             setIsLoading(false);
         };
         reader.readAsDataURL(uploadedFile as globalThis.File);
         // Return here because the analysis happens in the async onloadend
         return;

      } else { // Text analysis (either from uploaded file or direct input)
          let textContent = '';
          if (isAnalyzingFile && currentAnalysisMode === 'text') {
              // Read text from uploaded file
              try {
                  textContent = await (uploadedFile as globalThis.File).text();
                  setTextInput(textContent); // Update textInput state with file content
              } catch (readError: any) {
                   console.error("Error reading text file:", readError);
                   setError(`Could not read content from ${uploadedFile?.name}. ${readError.message}`);
                   toast({ title: 'File Read Error', description: `Could not read file ${uploadedFile?.name}.`, variant: 'destructive' });
                   setIsLoading(false);
                   return;
              }
          } else if (isAnalyzingText) {
              textContent = textInput;
          }

          // Update the prompt to request specific formatting for parsing, including MEDIUM
          prompt = `Analyze the following text content. Identify sentences or sections that are particularly engaging (high attention), moderately engaging (medium attention), and sections that might be considered boring or less engaging (low attention). Explain your reasoning for each category briefly if possible, but prioritize the tagging. Format the response ONLY by wrapping highly engaging parts in [ENGAGING]...[/ENGAGING], moderately engaging parts in [MEDIUM]...[/MEDIUM], and boring parts in [BORING]...[/BORING]. Leave neutral parts as plain text. Do NOT include any other text like introductions, summaries, or explanations outside of the tagged segments. Text Content:\n\n"${textContent}"`;
           analysisInput = prompt; // Only prompt needed for text
           options.model = 'gpt-4o'; // Use gpt-4o for text analysis
      }

       // Execute text analysis if we didn't return early for image reading
        try {
            console.log(`Calling puter.ai.chat (Text) with model: ${options.model}`);
            // Pass only the prompt for text analysis
            const result = await puter.ai.chat(analysisInput, false, options); // Pass prompt, no imageURL, testMode=false
            console.log("Puter AI Result (Text):", result);
            const resultText = result?.message?.content || result?.text || JSON.stringify(result);

            // Parse the resultText to create structured segments
            const parsedSegments = parseTextAnalysis(resultText);
            console.log("Parsed Segments:", parsedSegments); // Log parsed segments

            setAnalysisResult({ type: 'text', segments: parsedSegments, rawResponse: resultText });
            toast({ title: 'Text analysis complete!' });
        } catch (err: any) {
            console.error(`Text Analysis Error:`, err);
            setError(`Failed to analyze the text. ${err.message || 'Please try again.'}`);
            toast({ title: 'Analysis Error', description: `Could not analyze the text.`, variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }

    } catch (err: any) {
      console.error('Analysis Setup Error:', err);
      setError(`An unexpected error occurred during analysis setup. ${err.message}`);
      toast({ title: 'Analysis Error', description: 'An unexpected error occurred before analysis.', variant: 'destructive' });
      setIsLoading(false);
    }
  };


  const handleDownload = () => {
    if (!analysisResult) return;

    const link = document.createElement('a');
    const fileExtension = 'txt';
    let originalFileName = 'analysis';
    let contentToSave = '';

    if (analysisResult.type === 'text') {
        contentToSave = analysisResult.rawResponse; // Save the raw AI response for text
         if (inputMode === 'file' && uploadedFile) {
             originalFileName = uploadedFile.name.replace(/\.[^/.]+$/, "") || 'file_analysis';
         } else if (inputMode === 'text') {
             originalFileName = 'text_analysis';
         }
    } else if (analysisResult.type === 'image') {
        contentToSave = analysisResult.result.description; // Save the description for image
        if (inputMode === 'file' && uploadedFile) {
            originalFileName = uploadedFile.name.replace(/\.[^/.]+$/, "") || 'image_analysis';
        }
    }


    link.download = `attention_${originalFileName}.${fileExtension}`;

    const blob = new Blob([contentToSave], { type: 'text/plain' });
    link.href = URL.createObjectURL(blob);

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
    toast({ title: 'Download started!' });
  };

  const isAnalyzeDisabled = isLoading || !puter || (inputMode === 'file' && !uploadedFile) || (inputMode === 'text' && textInput.trim().length === 0);


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
        <Alert variant="destructive" className="relative">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
           <Button variant="ghost" size="icon" className="absolute top-1 right-1 h-6 w-6" onClick={() => setError(null)}>
                <X className="h-4 w-4" />
                <span className="sr-only">Dismiss error</span>
           </Button>
        </Alert>
      )}

        <Tabs value={inputMode} onValueChange={(value) => setInputMode(value as InputMode)} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="file"><File className="mr-2 h-4 w-4" /> Upload File</TabsTrigger>
                <TabsTrigger value="text"><Type className="mr-2 h-4 w-4" /> Enter Text</TabsTrigger>
            </TabsList>

             <TabsContent value="file">
                 <Card
                    className={`mt-4 transition-colors duration-200 ease-in-out ${isDragging ? 'border-primary border-2 ring-2 ring-primary ring-offset-2' : 'border-border'}`}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragEnter={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onPaste={handlePaste} // Listen for paste events here
                    tabIndex={0} // Make card focusable for paste
                    aria-label="Content upload area: Drag & drop, paste, or click to browse files"
                    >
                    <CardHeader>
                        <CardTitle>Upload Content File</CardTitle>
                        <CardDescription>Drag & drop, paste, or select an image or document file.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className={`flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-10 text-center min-h-[200px] transition-colors ${isDragging ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'}`}>
                        <UploadCloud className={`h-12 w-12 mb-4 transition-colors ${isDragging ? 'text-primary' : 'text-muted-foreground'}`} />
                         {filePreview && fileType === 'image' && uploadedFile ? (
                             <div className="relative w-32 h-32 mb-4 group">
                                <Image src={filePreview} alt="Preview" layout="fill" objectFit="contain" className="rounded border"/>
                                 <Button variant="destructive" size="icon" className="absolute -top-2 -right-2 bg-background rounded-full h-6 w-6 p-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={resetFull} aria-label="Remove file">
                                     <X className="h-4 w-4" />
                                 </Button>
                             </div>
                         ) : uploadedFile ? ( // Display info for any uploaded file (image or text)
                             <div className="relative mb-4 text-center bg-muted p-2 rounded max-w-full overflow-hidden text-ellipsis whitespace-nowrap group">
                                <span className="text-sm font-medium">{uploadedFile.name}</span> <span className="text-xs text-muted-foreground">({uploadedFile.type || 'unknown type'})</span>
                                <Button variant="destructive" size="icon" className="absolute -top-2 -right-2 bg-background rounded-full h-6 w-6 p-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={resetFull} aria-label="Remove file">
                                    <X className="h-4 w-4" />
                                </Button>
                             </div>
                         ) : (
                            <p className="text-muted-foreground">{isDragging ? 'Drop the file here!' : 'Drag & drop file, paste content, or click browse.'}</p>
                         )}

                         {/* Hide button if file is uploaded */}
                        {!uploadedFile && (
                            <>
                                <Label htmlFor="file-upload" className={`cursor-pointer text-primary hover:underline font-medium mt-2`}>
                                Choose file
                                </Label>
                                <Input
                                    ref={fileInputRef}
                                    id="file-upload"
                                    type="file"
                                    className="hidden"
                                    onChange={handleFileUploadEvent}
                                    accept="image/*,text/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                                />
                                <p className="text-xs text-muted-foreground mt-2">Supports images (PNG, JPG, etc.) and documents (TXT, PDF, DOCX, etc.)</p>
                            </>
                        )}
                        </div>
                    </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="text">
                <Card className="mt-4">
                    <CardHeader>
                        <CardTitle>Enter Text</CardTitle>
                        <CardDescription>Paste or type the text you want to analyze.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Textarea
                        value={textInput}
                        onChange={(e) => {
                            setTextInput(e.target.value);
                            if (e.target.value) {
                                // If user starts typing, clear any file-related state
                                resetState();
                            }
                            setAnalysisResult(null); // Clear analysis if text changes
                            setAnalysisMode(null);
                            setError(null);
                        }}
                        placeholder="Paste or type your text here..."
                        className="min-h-[200px]"
                        aria-label="Text input for analysis"
                        />
                    </CardContent>
                </Card>
            </TabsContent>
        </Tabs>

      {/* Common Analyze Button */}
       <Button onClick={handleAnalyze} disabled={isAnalyzeDisabled} className="w-full mt-4" aria-live="polite">
            {isLoading ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Analyzing...
              </>
            ) : (
                `Analyze ${inputMode === 'file' ? (fileType === 'image' ? 'Image' : (fileType === 'text' ? 'Document' : 'File')) : 'Text'}`
            )}
        </Button>
          {/* Simple visual loading indicator */}
        {isLoading && <div className="h-2 bg-primary/20 rounded-full w-full overflow-hidden mt-2"><div className="h-full bg-primary animate-pulse w-1/2 mx-auto"></div></div>}


      {/* Analysis Result Display */}
      {analysisResult && (
        <Card className="mt-6">
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
            {analysisResult.type === 'image' && filePreview && uploadedFile && (
              <div className="mb-4 border rounded-lg overflow-hidden max-w-md mx-auto">
                 <Image src={filePreview} alt="Analyzed Image" width={500} height={500} objectFit="contain" data-ai-hint="uploaded image analysis" />
              </div>
            )}

            {/* Conditional rendering based on analysis type */}
            {analysisResult.type === 'text' && (
              <>
                <h3 className="font-semibold mb-2 text-lg">Engagement Heatmap:</h3>
                <TextHeatmap segments={analysisResult.segments} />
                 {/* Optionally display raw response for debugging or if parsing fails */}
                 {/*
                 <h3 className="font-semibold mt-4 mb-2 text-lg">Raw AI Response:</h3>
                 <Textarea
                     readOnly
                     value={analysisResult.rawResponse}
                     className="border rounded-lg p-4 bg-muted text-muted-foreground min-h-[100px] max-h-[300px] overflow-y-auto whitespace-pre-wrap text-xs"
                     aria-label="Raw AI analysis explanation"
                 />
                 */}
              </>
            )}

            {analysisResult.type === 'image' && (
              <>
                <h3 className="font-semibold mb-2 text-lg">AI Analysis:</h3>
                <Textarea
                  readOnly
                  value={analysisResult.result.description}
                  className="border rounded-lg p-4 bg-card text-card-foreground min-h-[200px] max-h-[400px] overflow-y-auto whitespace-pre-wrap text-sm"
                  aria-label="AI image analysis result text"
                />
                {/* Placeholder for image heatmap visualization if implemented */}
                 {/* <div className="mt-4 text-sm text-muted-foreground">[Image heatmap visualization would go here]</div> */}
              </>
            )}

          </CardContent>
        </Card>
      )}
    </div>
  );
}
