'use client';

import { useState, useCallback, ChangeEvent, DragEvent } from 'react';
import { useFlow } from '@genkit-ai/next/client';
import { analyzeDocumentAttention } from '@/ai/flows/analyze-document-attention';
import { analyzeImageAttention } from '@/ai/flows/analyze-image-attention';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { UploadCloud, Download, RefreshCw, AlertCircle, X } from 'lucide-react';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';

type FileType = 'image' | 'text' | null;
type AnalysisResult = { type: 'image'; data: string } | { type: 'text'; data: string } | null;

export function AttentionAnalyzer() {
  const [file, setFile] = useState<File | null>(null);
  const [fileType, setFileType] = useState<FileType>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const { toast } = useToast();

  const analyzeTextFlow = useFlow(analyzeDocumentAttention);
  const analyzeImageFlow = useFlow(analyzeImageAttention);

  const resetState = () => {
    setFile(null);
    setFileType(null);
    setFilePreview(null);
    setAnalysisResult(null);
    setIsLoading(false);
    setError(null);
    setIsDragging(false);
  };

  const handleFileChange = useCallback((selectedFile: File | null) => {
    if (!selectedFile) {
      resetState();
      return;
    }

    resetState(); // Reset previous state on new file selection

    const reader = new FileReader();
    const type = selectedFile.type.startsWith('image/') ? 'image' : selectedFile.type.startsWith('text/') || selectedFile.type === 'application/pdf' || selectedFile.type.includes('document') ? 'text' : null;

    if (!type) {
        setError('Unsupported file type. Please upload an image (PNG, JPG) or a text document (TXT, PDF, DOC).');
        toast({
            title: 'Unsupported File Type',
            description: 'Please upload an image (PNG, JPG) or a text document (TXT, PDF, DOC).',
            variant: 'destructive',
        });
        return;
    }

    setFile(selectedFile);
    setFileType(type);

    reader.onloadend = () => {
      if (type === 'image') {
        setFilePreview(reader.result as string);
      } else if (type === 'text') {
        // For text files, we might not need a full preview initially,
        // but we can store the content if needed (handle large files carefully).
        // For simplicity, we'll just show the filename.
        // If it's a text file, read its content for analysis later.
         if (selectedFile.type === 'text/plain' || selectedFile.type === 'text/csv' || selectedFile.type === 'text/html') {
            reader.readAsText(selectedFile); // Read as text
            reader.onload = (e) => setFilePreview(e.target?.result as string);
        } else {
             setFilePreview(selectedFile.name); // Show filename for other text types like pdf/doc
        }
      }
    };

     if (type === 'image') {
       reader.readAsDataURL(selectedFile); // Read image as Data URL for preview
    } else if (selectedFile.type === 'text/plain' || selectedFile.type === 'text/csv' || selectedFile.type === 'text/html') {
        // We already set up onload for text above
    } else {
        // For PDF/DOC, just trigger onloadend to set filename preview
         reader.onloadend();
    }


  }, [toast]);

  const handleFileUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      handleFileChange(files[0]);
    } else {
       handleFileChange(null);
    }
    // Reset input value to allow uploading the same file again
    event.target.value = '';
  };

   const handlePaste = useCallback(async (event: ClipboardEvent) => {
    event.preventDefault();
    const items = event.clipboardData?.items;
    if (!items) return;

    resetState(); // Reset before pasting

    let foundFile = false;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.kind === 'file') {
        const file = item.getAsFile();
        if (file) {
          handleFileChange(file);
          foundFile = true;
          toast({ title: 'Pasted file successfully!' });
          break; // Handle only the first file found
        }
      } else if (item.kind === 'string' && item.type.startsWith('text/plain')) {
        item.getAsString((text) => {
           if (text) {
             const blob = new Blob([text], { type: 'text/plain' });
             const file = new File([blob], 'pasted_text.txt', { type: 'text/plain' });
             handleFileChange(file);
             foundFile = true;
             toast({ title: 'Pasted text successfully!' });
           }
        });
         break; // Handle only the first text item
      }
    }
     if (!foundFile) {
        toast({ title: 'No compatible content found in clipboard.', variant: 'destructive' });
     }

  }, [handleFileChange, toast]);


  const handleDrop = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
    resetState(); // Reset before dropping

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
    setIsDragging(false);
  }, []);

   const handleAnalyze = async () => {
    if (!file || !fileType) {
      setError('Please upload a file first.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setAnalysisResult(null);

    try {
      let result;
      const reader = new FileReader();

      if (fileType === 'image') {
        reader.readAsDataURL(file);
        reader.onloadend = async () => {
          const photoDataUri = reader.result as string;
           try {
               result = await analyzeImageFlow({ photoDataUri });
               setAnalysisResult({ type: 'image', data: result.heatmapDataUri });
               toast({ title: 'Image analysis complete!' });
           } catch (err) {
               console.error('Image Analysis Error:', err);
               setError('Failed to analyze the image. Please try again.');
               toast({ title: 'Analysis Error', description: 'Could not analyze the image.', variant: 'destructive' });
           } finally {
               setIsLoading(false);
           }
        };
         reader.onerror = () => {
           setError('Failed to read the image file.');
           toast({ title: 'File Read Error', description: 'Could not read the image file.', variant: 'destructive'});
           setIsLoading(false);
         }

      } else if (fileType === 'text') {
        // Handle different text file types (TXT, PDF, DOC)
         // For simplicity, we assume the AI flow can handle plain text extracted or the raw file data uri for others.
         // A robust solution would involve client-side or server-side parsing for PDF/DOC.
         // Here, we'll read plain text directly. For others, show error or attempt sending data URI (less likely to work).

         if (file.type === 'text/plain' || file.type === 'text/csv' || file.type === 'text/html') {
            reader.readAsText(file);
            reader.onloadend = async () => {
                const documentText = reader.result as string;
                try {
                    result = await analyzeTextFlow({ documentText });
                    // The result contains HTML with spans, render it directly
                    setAnalysisResult({ type: 'text', data: result.heatmapHighlightedText });
                    toast({ title: 'Text analysis complete!' });
                } catch (err) {
                    console.error('Text Analysis Error:', err);
                    setError('Failed to analyze the text. Please try again.');
                    toast({ title: 'Analysis Error', description: 'Could not analyze the text.', variant: 'destructive' });
                } finally {
                    setIsLoading(false);
                }
            };
             reader.onerror = () => {
               setError('Failed to read the text file.');
               toast({ title: 'File Read Error', description: 'Could not read the text file.', variant: 'destructive'});
               setIsLoading(false);
             }
         } else {
              // Handle PDF/DOC - Basic approach: Inform user or attempt sending data URI
              setError(`Analysis for ${file.type} is complex. Currently only plain text analysis is fully supported via direct text extraction. PDF/DOC analysis might require server-side processing not implemented here.`);
              toast({ title: 'Unsupported Text Format', description: `Analysis for ${file.type} requires advanced processing.`, variant: 'destructive'});
              setIsLoading(false);
              // Optional: Try sending data URI (might fail in Genkit flow)
              /*
              reader.readAsDataURL(file);
              reader.onloadend = async () => {
                  const documentDataUri = reader.result as string;
                   // Try sending Data URI - Adjust Genkit flow if it can handle this
                  console.warn("Attempting to send Data URI for non-plain text file. This might not be supported by the AI flow.");
                   // ... call analyzeTextFlow with appropriate input ...
                   setIsLoading(false);
              };
              */
         }
      }
    } catch (err) {
      console.error('Analysis Error:', err);
      setError('An unexpected error occurred during analysis.');
      toast({ title: 'Analysis Error', description: 'An unexpected error occurred.', variant: 'destructive' });
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
    if (!analysisResult) return;

    const link = document.createElement('a');
    link.download = `attention_heatmap_${file?.name || 'download'}.${analysisResult.type === 'image' ? 'png' : 'html'}`; // Save text as HTML

    if (analysisResult.type === 'image') {
      link.href = analysisResult.data;
    } else {
      // Create a basic HTML structure for the highlighted text
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Attention Heatmap - ${file?.name || 'Text Analysis'}</title>
          <style>
            body { font-family: sans-serif; line-height: 1.6; padding: 20px; }
            .heatmap-engaging { background-color: #008080; color: white; padding: 0.1em 0.2em; border-radius: 0.2em; }
            .heatmap-boring { background-color: #F0F0F0; color: #333333; padding: 0.1em 0.2em; border-radius: 0.2em; }
          </style>
        </head>
        <body>
          <h1>Attention Heatmap Analysis</h1>
          <h2>Original File: ${file?.name || 'Pasted Text'}</h2>
          <hr>
          <div>${analysisResult.data}</div>
        </body>
        </html>
      `;
      const blob = new Blob([htmlContent], { type: 'text/html' });
      link.href = URL.createObjectURL(blob);
    }
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href); // Clean up blob URL
     toast({ title: 'Download started!' });
  };

  return (
    <div className="space-y-6">
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
        className={`transition-colors ${isDragging ? 'border-primary border-2' : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onPaste={handlePaste} // Listen for paste events on the card
        tabIndex={0} // Make card focusable for paste
      >
        <CardHeader>
          <CardTitle>Upload Content</CardTitle>
          <CardDescription>Drag & drop, paste, or select an image (PNG, JPG) or text (TXT, PDF, DOC) file.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-lg p-10 text-center min-h-[200px]">
            <UploadCloud className="h-12 w-12 text-muted-foreground mb-4" />
             {filePreview && fileType === 'image' ? (
                 <div className="relative w-32 h-32 mb-4">
                    <Image src={filePreview} alt="Preview" layout="fill" objectFit="contain" />
                     <Button variant="ghost" size="icon" className="absolute -top-2 -right-2 bg-background rounded-full h-6 w-6 p-1" onClick={resetState}>
                         <X className="h-4 w-4" />
                     </Button>
                 </div>
             ) : file ? (
                 <div className="relative mb-4 text-center bg-muted p-2 rounded max-w-full overflow-hidden text-ellipsis whitespace-nowrap">
                    <span className="text-sm font-medium">{file.name}</span> ({file.type})
                    <Button variant="ghost" size="icon" className="absolute -top-2 -right-2 bg-background rounded-full h-6 w-6 p-1" onClick={resetState}>
                        <X className="h-4 w-4" />
                    </Button>
                 </div>
             ) : (
                <p className="text-muted-foreground">Drag & drop, paste content, or click to browse.</p>
             )}

            <Label htmlFor="file-upload" className="cursor-pointer text-primary hover:underline font-medium">
              Choose file
            </Label>
            <Input id="file-upload" type="file" className="hidden" onChange={handleFileUpload} accept="image/png, image/jpeg, .txt, .pdf, .doc, .docx, text/plain" />
             <p className="text-xs text-muted-foreground mt-2">Supported: PNG, JPG, TXT, PDF, DOC/X</p>
          </div>
          <Button onClick={handleAnalyze} disabled={!file || isLoading} className="w-full">
            {isLoading ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              'Analyze Attention'
            )}
          </Button>
          {isLoading && <Progress value={undefined} className="w-full h-2 animate-pulse" />}
        </CardContent>
      </Card>

      {analysisResult && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
                <CardTitle>Analysis Result</CardTitle>
                <CardDescription>Heatmap showing areas of attention.</CardDescription>
            </div>
             <Button onClick={handleDownload} variant="outline" size="sm">
              <Download className="mr-2 h-4 w-4" />
              Download
            </Button>
          </CardHeader>
          <CardContent>
            {analysisResult.type === 'image' ? (
              <div className="relative border rounded-lg overflow-hidden">
                 {/* Display original and heatmap side-by-side or allow toggle */}
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <h3 className="text-center font-medium mb-2">Original Image</h3>
                        <Image src={filePreview!} alt="Original Upload" width={500} height={500} objectFit="contain" />
                    </div>
                     <div>
                         <h3 className="text-center font-medium mb-2">Attention Heatmap</h3>
                        <Image src={analysisResult.data} alt="Attention Heatmap" width={500} height={500} objectFit="contain" data-ai-hint="heatmap overlay" />
                    </div>
                 </div>
              </div>
            ) : (
              <div
                className="border rounded-lg p-4 bg-card text-card-foreground max-h-[400px] overflow-y-auto whitespace-pre-wrap"
                // Use dangerouslySetInnerHTML to render the HTML with highlights
                dangerouslySetInnerHTML={{ __html: analysisResult.data }}
              />
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
