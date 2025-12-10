export const LIVE_SAMPLE_RATE = 24000;
export const INPUT_SAMPLE_RATE = 16000;

export function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export function arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

export async function decodeAudioData(
    audioData: Uint8Array, 
    context: AudioContext,
    sampleRate: number = 24000
): Promise<AudioBuffer> {
    // Convert 16-bit PCM (Little Endian) to Float32
    const int16Data = new Int16Array(audioData.buffer);
    const float32Data = new Float32Array(int16Data.length);
    
    for(let i = 0; i < int16Data.length; i++) {
        // Normalize int16 (-32768 to 32767) to float32 (-1.0 to 1.0)
        float32Data[i] = int16Data[i] / 32768.0;
    }
    
    // Create AudioBuffer directly
    const buffer = context.createBuffer(1, float32Data.length, sampleRate);
    buffer.copyToChannel(float32Data, 0);
    return buffer;
}