# **App Name**: Attention Insights

## Core Features:

- File Upload and Selection: Accept user uploads of image (png, jpg) or text (pdf, doc, txt) files via drag and drop, clipboard paste, or device upload. Only one file type can be analyzed at a time.
- AI-Powered Heatmap Generation: Use GPT-4 Vision (for images) and GPT-4o (for text) via the Puter.js AI API to analyze uploaded content. Generate a heatmap overlay on images showing areas of high and low visual attention. Highlight text with a heatmap to indicate interesting and boring sections. Use a tool that decides how to incorporate the analysis results into the heatmap.
- Heatmap Visualization and Download: Display the generated heatmap clearly on top of the uploaded image or text, with adjustable intensity and color gradients. Allow users to download the heatmap-overlaid content.

## Style Guidelines:

- Primary color: Neutral gray (#F0F0F0) for a clean background.
- Secondary color: Dark gray (#333333) for text and important UI elements.
- Accent: Teal (#008080) for interactive elements and heatmap highlights, providing a clear visual cue.
- Clean, minimalist layout with clear separation between upload area, analysis display, and controls.
- Simple, intuitive icons for upload, download, and heatmap adjustment controls.
- Subtle loading animations during file analysis and heatmap generation to indicate progress.