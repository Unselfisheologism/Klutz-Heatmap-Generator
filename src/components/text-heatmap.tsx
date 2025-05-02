import React from 'react';
import { cn } from '@/lib/utils';

interface TextSegment {
  text: string;
  engagement: 'engaging' | 'medium' | 'boring' | 'neutral'; // Added 'medium'
}

interface TextHeatmapProps {
  segments: TextSegment[];
}

export function TextHeatmap({ segments }: TextHeatmapProps) {
  if (!segments || segments.length === 0) {
    return <p className="text-muted-foreground">No text analysis available.</p>;
  }

  // Helper to determine the CSS class based on engagement level
  const getSegmentClass = (engagement: TextSegment['engagement']): string => {
    switch (engagement) {
      case 'engaging':
        return 'heatmap-engaging'; // Defined in globals.css
      case 'medium':
        return 'heatmap-medium'; // Added case for medium
      case 'boring':
        return 'heatmap-boring'; // Defined in globals.css
      case 'neutral':
      default:
        return ''; // No specific class for neutral
    }
  };

  return (
    <div className="border rounded-lg p-4 bg-card text-card-foreground min-h-[100px] max-h-[400px] overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed">
      {segments.map((segment, index) => (
        <span key={index} className={cn(getSegmentClass(segment.engagement))}>
          {segment.text}{' '} {/* Add space between segments */}
        </span>
      ))}
    </div>
  );
}
