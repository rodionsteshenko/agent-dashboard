import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const GATEWAY_URL = 'http://127.0.0.1:18789/v1/chat/completions';
const GATEWAY_TOKEN = 'b2cd9c1ca38aa28f50ffc2356b827d459dac5b90d7629062';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

export const POST: RequestHandler = async ({ request }) => {
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File | null;
    
    if (!audioFile) {
      return json({ error: 'No audio file provided' }, { status: 400 });
    }
    
    if (!OPENAI_API_KEY) {
      return json({ error: 'OpenAI API key not configured' }, { status: 500 });
    }
    
    // Step 1: Transcribe with Whisper
    console.log('[Voice] Transcribing audio...');
    const transcriptFormData = new FormData();
    transcriptFormData.append('file', audioFile, 'audio.webm');
    transcriptFormData.append('model', 'whisper-1');
    
    const whisperRes = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: transcriptFormData
    });
    
    if (!whisperRes.ok) {
      const err = await whisperRes.text();
      console.error('[Voice] Whisper error:', err);
      return json({ error: 'Transcription failed' }, { status: 500 });
    }
    
    const whisperData = await whisperRes.json();
    const transcript = whisperData.text?.trim();
    
    if (!transcript) {
      return json({ error: 'No speech detected' }, { status: 400 });
    }
    
    console.log('[Voice] Transcript:', transcript);
    
    // Step 2: Send to OpenClaw
    console.log('[Voice] Sending to OpenClaw...');
    const chatRes = await fetch(GATEWAY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GATEWAY_TOKEN}`
      },
      body: JSON.stringify({
        model: 'default',
        user: 'dashboard-voice',
        messages: [
          { role: 'user', content: transcript }
        ]
      })
    });
    
    if (!chatRes.ok) {
      const err = await chatRes.text();
      console.error('[Voice] Gateway error:', err);
      return json({ error: 'Failed to get response' }, { status: 500 });
    }
    
    const chatData = await chatRes.json();
    const responseText = chatData.choices?.[0]?.message?.content || 'No response';
    
    console.log('[Voice] Response:', responseText.substring(0, 100) + '...');
    
    // Step 3: Generate TTS
    console.log('[Voice] Generating speech...');
    const ttsRes = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'tts-1',
        input: responseText,
        voice: 'alloy',
        response_format: 'mp3'
      })
    });
    
    if (!ttsRes.ok) {
      const err = await ttsRes.text();
      console.error('[Voice] TTS error:', err);
      // Return text response even if TTS fails
      return json({ transcript, response: responseText });
    }
    
    // Convert audio to base64
    const audioBuffer = await ttsRes.arrayBuffer();
    const base64Audio = Buffer.from(audioBuffer).toString('base64');
    
    console.log('[Voice] Success! Audio size:', audioBuffer.byteLength);
    
    return json({
      transcript,
      response: responseText,
      audio: base64Audio
    });
    
  } catch (err) {
    console.error('[Voice] Error:', err);
    return json({ 
      error: err instanceof Error ? err.message : 'Voice processing failed' 
    }, { status: 500 });
  }
};
