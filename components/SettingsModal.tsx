
import React, { useState, useEffect } from 'react';
import { X, Save, Key, ShieldCheck, CheckCircle, Loader2, Play, AlertCircle, Cpu, ExternalLink } from 'lucide-react';
import { saveApiKey, getStoredApiKey } from '../services/modelRegistry';
import { checkOllamaConnection, getAvailableOllamaModels, getLocalModelSetupInstructions } from '../services/localModelService';

interface SettingsModalProps {
    onClose: () => void;
}

type Provider = 'google' | 'openai' | 'groq';

const SettingsModal: React.FC<SettingsModalProps> = ({ onClose }) => {
    // API Keys State
    const [keys, setKeys] = useState({
        google: '',
        openai: '',
        groq: ''
    });
    
    // Testing States
    const [testingProvider, setTestingProvider] = useState<Provider | null>(null);
    const [testResults, setTestResults] = useState<Record<Provider, { success: boolean; message: string } | null>>({
        google: null,
        openai: null,
        groq: null
    });

    const [showSuccess, setShowSuccess] = useState(false);
    const [lastTestTime, setLastTestTime] = useState<Record<Provider, number>>({
        google: 0,
        openai: 0,
        groq: 0
    });

    useEffect(() => {
        setKeys({
            google: getStoredApiKey('API_KEY'),
            openai: getStoredApiKey('OPENAI_API_KEY'),
            groq: getStoredApiKey('GROQ_API_KEY')
        });
    }, []);

    const validateKey = async (provider: Provider, key: string) => {
        if (!key.trim()) {
            setTestResults(prev => ({ ...prev, [provider]: { success: false, message: "Key is empty" } }));
            return;
        }

        // Rate limiting: prevent tests within 5 seconds
        const now = Date.now();
        const timeSinceLastTest = now - lastTestTime[provider];
        if (timeSinceLastTest < 5000) {
            const waitTime = Math.ceil((5000 - timeSinceLastTest) / 1000);
            setTestResults(prev => ({ ...prev, [provider]: { success: false, message: `Wait ${waitTime}s before testing again` } }));
            return;
        }
        setLastTestTime(prev => ({ ...prev, [provider]: now }));

        // Validate key format
        if (provider === 'google' && !key.startsWith('AIzaSy')) {
            setTestResults(prev => ({ ...prev, [provider]: { success: false, message: "Invalid Google API key format (should start with AIzaSy)" } }));
            return;
        }
        if (provider === 'groq' && !key.startsWith('gsk_')) {
            setTestResults(prev => ({ ...prev, [provider]: { success: false, message: "Invalid Groq API key format (should start with gsk_)" } }));
            return;
        }
        if (provider === 'openai' && !key.startsWith('sk-')) {
            setTestResults(prev => ({ ...prev, [provider]: { success: false, message: "Invalid OpenAI API key format (should start with sk-)" } }));
            return;
        }

        setTestingProvider(provider);
        setTestResults(prev => ({ ...prev, [provider]: null }));

        try {
            // Create abort controller with 10 second timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);

            try {
                if (provider === 'google') {
                    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            contents: [{ parts: [{ text: "Hi" }] }],
                            generationConfig: { maxOutputTokens: 1 }
                        }),
                        signal: controller.signal
                    });
                    if (!response.ok) {
                        const errorData = await response.json().catch(() => null);
                        if (response.status === 429) {
                            throw new Error(`Quota exceeded. Get a new key from ai.google.dev`);
                        }
                        throw new Error(`API Error ${response.status}`);
                    }
                } 
                else if (provider === 'groq') {
                    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
                        body: JSON.stringify({ model: 'llama-3.1-8b-instant', messages: [{ role: 'user', content: 'Hi' }], max_tokens: 1 }),
                        signal: controller.signal
                    });
                    if (!response.ok) throw new Error(`Error ${response.status}`);
                }
                else if (provider === 'openai') {
                    const response = await fetch('https://api.openai.com/v1/chat/completions', {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
                        body: JSON.stringify({ model: 'gpt-4o-mini', messages: [{ role: 'user', content: 'Hi' }], max_tokens: 1 }),
                        signal: controller.signal
                    });
                    if (!response.ok) throw new Error(`Error ${response.status}`);
                }

                clearTimeout(timeoutId);
                setTestResults(prev => ({ ...prev, [provider]: { success: true, message: "Valid Key" } }));
            } catch (fetchError: any) {
                clearTimeout(timeoutId);
                if (fetchError.name === 'AbortError') {
                    throw new Error('Request timeout (10s)');
                }
                throw fetchError;
            }
        } catch (error: any) {
            let errorMsg = error.message || "Connection failed";
            // Truncate long error messages
            if (errorMsg.length > 100) {
                errorMsg = errorMsg.substring(0, 100) + '...';
            }
            setTestResults(prev => ({ ...prev, [provider]: { success: false, message: errorMsg } }));
        } finally {
            setTestingProvider(null);
        }
    };

    const handleSave = () => {
        // Save API Keys
        saveApiKey('API_KEY', keys.google);
        saveApiKey('OPENAI_API_KEY', keys.openai);
        saveApiKey('GROQ_API_KEY', keys.groq);
        
        setShowSuccess(true);
        setTimeout(() => {
            setShowSuccess(false);
            onClose();
        }, 800);
    };

    const renderApiInput = (label: string, provider: Provider, placeholder: string, desc: string) => (
        <div className="space-y-1">
            <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-[#666666] dark:text-[#a0a0a0] uppercase tracking-wider">{label}</label>
                {testResults[provider] && (
                    <span className={`text-[12px] flex items-center gap-1 ${testResults[provider]?.success ? 'text-[#4485d1]' : 'text-[#666666] dark:text-[#a0a0a0]'}`}>
                        {testResults[provider]?.success ? <CheckCircle size={12} /> : <AlertCircle size={12} />}
                        {testResults[provider]?.message}
                    </span>
                )}
            </div>
            <div className="flex gap-1.5">
                <input 
                    type="text" 
                    value={keys[provider]}
                    onChange={e => {
                        setKeys({...keys, [provider]: e.target.value});
                        setTestResults(prev => ({ ...prev, [provider]: null }));
                    }}
                    placeholder={placeholder}
                    className="flex-1 px-2.5 py-1.5 bg-[rgba(0,0,0,0.03)] dark:bg-[#1a1a1a] border border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)] rounded-lg text-sm text-[#1a1a1a] dark:text-white focus:outline-none focus:ring-2 focus:ring-[rgba(68,133,209,0.2)] focus:border-[#4485d1] transition-all"
                />
                <button
                    onClick={() => validateKey(provider, keys[provider])}
                    disabled={testingProvider === provider || !keys[provider] || (Date.now() - lastTestTime[provider] < 5000)}
                    className="px-2.5 py-1.5 bg-[rgba(0,0,0,0.03)] dark:bg-[#2a2a2a] hover:bg-[rgba(0,0,0,0.06)] dark:hover:bg-[#222222] text-[#666666] dark:text-[#a0a0a0] rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    title={Date.now() - lastTestTime[provider] < 5000 ? "Wait before testing again" : "Test API Connection"}
                >
                    {testingProvider === provider ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
                </button>
            </div>
            <p className="text-[12px] text-[#666666] dark:text-[#a0a0a0]">{desc}</p>
        </div>
    );

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-[#222222] w-full max-w-md rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[75vh]">
                {/* Header */}
                <div className="px-4 py-2.5 border-b border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)] flex items-center justify-between bg-[rgba(0,0,0,0.03)] dark:bg-[#2a2a2a]">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-[rgba(68,133,209,0.1)] text-[#4485d1] rounded-lg">
                            <Key size={14} />
                        </div>
                        <h2 className="text-sm font-semibold text-[#1a1a1a] dark:text-white">Configuration</h2>
                    </div>
                    <button onClick={onClose} className="p-1.5 hover:bg-[rgba(0,0,0,0.06)] dark:hover:bg-[#222222] rounded-full text-[#a0a0a0] transition-colors">
                        <X size={16} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-4 overflow-y-auto space-y-4 flex-1">
                    <div className="bg-[rgba(68,133,209,0.1)] border border-[rgba(68,133,209,0.2)] dark:border-[rgba(68,133,209,0.3)] rounded-lg p-2 flex gap-2">
                        <ShieldCheck size={14} className="text-[#4485d1] flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-[#1a1a1a] dark:text-white leading-relaxed">
                            API Keys are stored locally on your device.
                        </p>
                    </div>
                    <div className="space-y-3">
                        {renderApiInput('Google Gemini', 'google', 'AIzaSy...', 'Required for Gemini models & TTS.')}
                        {renderApiInput('Groq', 'groq', 'gsk_...', 'Required for Llama 3 models.')}
                        {renderApiInput('OpenAI', 'openai', 'sk-...', 'Required for GPT-4o models.')}
                    </div>

                    {/* Local Models Section */}
                    <div className="border-t border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)] pt-4">
                        <div className="flex items-center gap-1.5 mb-2">
                            <Cpu size={12} className="text-[#666666] dark:text-[#a0a0a0]" />
                            <h3 className="text-xs font-bold text-[#666666] dark:text-[#a0a0a0] uppercase tracking-wider">Local Models (Ollama)</h3>
                        </div>
                        <LocalModelsStatus />
                    </div>
                </div>

                {/* Footer */}
                <div className="px-4 py-2.5 border-t border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)] bg-[rgba(0,0,0,0.03)] dark:bg-[#2a2a2a] flex justify-end gap-2 flex-shrink-0">
                    <button 
                        onClick={onClose}
                        className="px-3 py-1.5 text-xs font-medium text-[#666666] dark:text-[#a0a0a0] hover:text-[#1a1a1a] dark:hover:text-white hover:bg-[rgba(0,0,0,0.06)] dark:hover:bg-[#222222] rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={handleSave}
                        className="px-3 py-1.5 text-xs font-medium text-white rounded-lg shadow-sm flex items-center gap-1.5 transition-all bg-[#4485d1] hover:bg-[#3674c1]"
                    >
                        {showSuccess ? (
                            <>Saved!</>
                        ) : (
                            <><Save size={12} /> Save & Apply</>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

// Local Models Status Component
const LocalModelsStatus: React.FC = () => {
    const [isConnected, setIsConnected] = useState(false);
    const [models, setModels] = useState<string[]>([]);
    const [isTesting, setIsTesting] = useState(false);
    const [showSetupGuide, setShowSetupGuide] = useState(false);

    const testConnection = async () => {
        setIsTesting(true);
        try {
            const connected = await checkOllamaConnection();
            setIsConnected(connected);
            
            if (connected) {
                const availableModels = await getAvailableOllamaModels();
                setModels(availableModels);
            } else {
                setModels([]);
            }
        } catch (error) {
            console.error('Failed to test Ollama connection:', error);
            setIsConnected(false);
            setModels([]);
        } finally {
            setIsTesting(false);
        }
    };

    useEffect(() => {
        testConnection();
    }, []);

    return (
        <div className="space-y-2">
            <div className="bg-[rgba(0,0,0,0.03)] dark:bg-[#1a1a1a] border border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)] rounded-lg p-2 flex gap-2">
                <div className="flex-1">
                    <p className="text-xs text-[#1a1a1a] dark:text-white leading-relaxed">
                        <strong>Offline AI Models:</strong> Use Code Llama locally when you hit quota limits. No API keys needed.
                    </p>
                </div>
            </div>

            <div className="flex gap-1.5">
                <button
                    onClick={testConnection}
                    disabled={isTesting}
                    className="flex-1 px-2.5 py-1.5 bg-[rgba(0,0,0,0.03)] dark:bg-[#2a2a2a] hover:bg-[rgba(0,0,0,0.06)] dark:hover:bg-[#222222] text-[#666666] dark:text-[#a0a0a0] rounded-lg text-xs font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                    {isTesting ? (
                        <>
                            <Loader2 size={10} className="animate-spin" />
                            Testing...
                        </>
                    ) : (
                        <>
                            <Cpu size={10} />
                            Test Connection
                        </>
                    )}
                </button>
                <button
                    onClick={() => setShowSetupGuide(!showSetupGuide)}
                    className="flex-1 px-2.5 py-1.5 bg-[rgba(0,0,0,0.03)] dark:bg-[#2a2a2a] hover:bg-[rgba(0,0,0,0.06)] dark:hover:bg-[#222222] text-[#666666] dark:text-[#a0a0a0] rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1.5"
                >
                    <ExternalLink size={10} />
                    Setup Guide
                </button>
            </div>

            {isConnected ? (
                <div className="bg-[rgba(0,0,0,0.03)] dark:bg-[#1a1a1a] border border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)] rounded-lg p-2">
                    <div className="flex items-center gap-1.5 mb-1.5">
                        <CheckCircle size={12} className="text-[#4485d1]" />
                        <span className="text-xs font-bold text-[#1a1a1a] dark:text-white">Ollama Connected</span>
                    </div>
                    {models.length > 0 ? (
                        <div className="text-xs text-[#666666] dark:text-[#a0a0a0] space-y-0.5">
                            <p className="font-medium">Available Models:</p>
                            <ul className="list-disc list-inside space-y-0.5">
                                {models.map(model => (
                                    <li key={model} className="text-[#1a1a1a] dark:text-white">{model}</li>
                                ))}
                            </ul>
                        </div>
                    ) : (
                        <p className="text-xs text-[#666666] dark:text-[#a0a0a0]">Ollama is running but no models found. Run: <code className="bg-[rgba(0,0,0,0.06)] dark:bg-[#2a2a2a] px-1 rounded text-[12px]">ollama create codellama -f codellama.Modelfile</code></p>
                    )}
                </div>
            ) : (
                <div className="bg-[rgba(0,0,0,0.03)] dark:bg-[#1a1a1a] border border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)] rounded-lg p-2">
                    <div className="flex items-center gap-1.5 mb-1.5">
                        <AlertCircle size={12} className="text-[#666666] dark:text-[#a0a0a0]" />
                        <span className="text-xs font-bold text-[#1a1a1a] dark:text-white">Ollama Not Connected</span>
                    </div>
                    <p className="text-xs text-[#666666] dark:text-[#a0a0a0] mb-1.5">Make sure Ollama is installed and running on http://localhost:11434</p>
                    <a 
                        href="https://ollama.ai" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-xs text-[#4485d1] hover:text-[#3674c1] underline flex items-center gap-1"
                    >
                        Download Ollama <ExternalLink size={10} />
                    </a>
                </div>
            )}

            {showSetupGuide && (
                <div className="bg-[rgba(0,0,0,0.03)] dark:bg-[#1a1a1a] border border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)] rounded-lg p-2 text-xs text-[#666666] dark:text-[#a0a0a0] space-y-1.5 max-h-[150px] overflow-y-auto">
                    <p className="font-bold text-[#1a1a1a] dark:text-white">Quick Setup:</p>
                    <ol className="list-decimal list-inside space-y-0.5">
                        <li>Install Ollama from ollama.ai</li>
                        <li>Place model files in F:\Automations\Models\</li>
                        <li>Run: <code className="bg-[rgba(0,0,0,0.06)] dark:bg-[#2a2a2a] px-1 rounded text-[12px]">ollama create codellama -f codellama.Modelfile</code></li>
                        <li>Click "Test Connection" above</li>
                    </ol>
                    <p className="italic mt-1.5">See LOCAL_MODELS_SETUP.md for detailed instructions</p>
                </div>
            )}
        </div>
    );
};

export default SettingsModal;
