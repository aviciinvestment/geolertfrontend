export interface VideoAnalysis {
  summary: string;
  transcript: string;
  description: string;
  severityReason: string;
}

const API_URL = `${import.meta.env.VITE_API_URL}/api/gemini`;

export async function analyzeVideo(videoUrl: string, onStatus?: (status: string) => void): Promise<VideoAnalysis> {
  onStatus?.('Uploading video to Gemini...');

  const res = await fetch(`${API_URL}/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ videoUrl }),
  });

  onStatus?.('Analyzing video content...');

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    console.error('Gemini proxy error:', err);
    throw new Error(err.error || `Analysis failed: ${res.status}`);
  }

  const data = await res.json();
  return { summary: data.summary, transcript: data.transcript, description: data.description, severityReason: data.severityReason || '' };
}
