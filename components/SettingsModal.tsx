
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
        <div className="space-y-1.5">
            <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-[#666666] dark:text-[#a0a0a0] uppercase tracking-wider">{label}</label>
                {testResults[provider] && (
                    <span className={`text-[10px] flex items-center gap-1 ${testResults[provider]?.success ? 'text-green-600' : 'text-red-500'}`}>
                        {testResults[provider]?.success ? <CheckCircle size={10} /> : <AlertCircle size={10} />}
                        {testResults[provider]?.message}
                    </span>
                )}
            </div>
            <div className="flex gap-2">
                <input 
                    type="text" 
                    value={keys[provider]}
                    onChange={e => {
                        setKeys({...keys, [provider]: e.target.value});
                        setTestResults(prev => ({ ...prev, [provider]: null }));
                    }}
                    placeholder={placeholder}
                    className={`flex-1 px-3 py-2 bg-[rgba(0,0,0,0.03)] dark:bg-[#1a1a1a] border rounded-lg text-sm text-[#1a1a1a] dark:text-white focus:outline-none focus:ring-2 transition-all ${testResults[provider]?.success === false ? 'border-red-300 focus:ring-red-200' : 'border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)] focus:ring-[rgba(68,133,209,0.2)] focus:border-[#4485d1]'}`}
                />
                <button
                    onClick={() => validateKey(provider, keys[provider])}
                    disabled={testingProvider === provider || !keys[provider] || (Date.now() - lastTestTime[provider] < 5000)}
                    className="px-3 py-2 bg-[rgba(0,0,0,0.03)] dark:bg-[#2a2a2a] hover:bg-[rgba(0,0,0,0.06)] dark:hover:bg-[#222222] text-[#666666] dark:text-[#a0a0a0] rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    title={Date.now() - lastTestTime[provider] < 5000 ? "Wait before testing again" : "Test API Connection"}
                >
                    {testingProvider === provider ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
                </button>
            </div>
            <p className="text-[10px] text-[#666666] dark:text-[#a0a0a0]">{desc}</p>
        </div>
    );

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-[#222222] w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="px-6 py-4 border-b border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)] flex items-center justify-between bg-[rgba(0,0,0,0.03)] dark:bg-[#2a2a2a]">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-[rgba(68,133,209,0.1)] text-[#4485d1] rounded-lg">
                            <Key size={18} />
                        </div>
                        <h2 className="font-semibold text-[#1a1a1a] dark:text-white">Configuration</h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-[rgba(0,0,0,0.06)] dark:hover:bg-[#222222] rounded-full text-[#a0a0a0] transition-colors">
                        <X size={18} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto space-y-6 flex-1">
                    <div className="bg-[rgba(68,133,209,0.1)] border border-[rgba(68,133,209,0.2)] dark:border-[rgba(68,133,209,0.3)] rounded-lg p-3 flex gap-3">
                        <ShieldCheck size={18} className="text-[#4485d1] flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-[#1a1a1a] dark:text-white leading-relaxed">
                            API Keys are stored locally on your device.
                        </p>
                    </div>
                    <div className="space-y-4">
                        {renderApiInput('Google Gemini', 'google', 'AIzaSy...', 'Required for Gemini models & TTS.')}
                        {renderApiInput('Groq', 'groq', 'gsk_...', 'Required for Llama 3 models.')}
                        {renderApiInput('OpenAI', 'openai', 'sk-...', 'Required for GPT-4o models.')}
                    </div>

                    {/* Local Models Section */}
                    <div className="border-t border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)] pt-6">
                        <div className="flex items-center gap-2 mb-3">
                            <Cpu size={16} className="text-purple-600" />
                            <h3 className="text-xs font-bold text-[#666666] dark:text-[#a0a0a0] uppercase tracking-wider">Local Models (Ollama)</h3>
                        </div>
                        <LocalModelsStatus />
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)] bg-[rgba(0,0,0,0.03)] dark:bg-[#2a2a2a] flex justify-end gap-3 flex-shrink-0">
                    <button 
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-[#666666] dark:text-[#a0a0a0] hover:text-[#1a1a1a] dark:hover:text-white hover:bg-[rgba(0,0,0,0.06)] dark:hover:bg-[#222222] rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={handleSave}
                        className={`
                            px-4 py-2 text-sm font-medium text-white rounded-lg shadow-sm flex items-center gap-2 transition-all
                            ${showSuccess ? 'bg-green-600 hover:bg-green-700' : 'bg-[#4485d1] hover:bg-[#3674c1]'}
                        `}
                    >
                        {showSuccess ? (
                            <>Saved!</>
                        ) : (
                            <><Save size={16} /> Save & Apply</>
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
        <div className="space-y-3">
            <div className="bg-purple-50 border border-purple-100 rounded-lg p-3 flex gap-3">
                <div className="flex-1">
                    <p className="text-xs text-purple-800 leading-relaxed">
                        <strong>Offline AI Models:</strong> Use Code Llama locally when you hit quota limits. No API keys needed.
                    </p>
                </div>
            </div>

            <div className="flex gap-2">
                <button
                    onClick={testConnection}
                    disabled={isTesting}
                    className="flex-1 px-3 py-2 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                    {isTesting ? (
                        <>
                            <Loader2 size={12} className="animate-spin" />
                            Testing...
                        </>
                    ) : (
                        <>
                            <Cpu size={12} />
                            Test Connection
                        </>
                    )}
                </button>
                <button
                    onClick={() => setShowSetupGuide(!showSetupGuide)}
                    className="flex-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-2"
                >
                    <ExternalLink size={12} />
                    Setup Guide
                </button>
            </div>

            {isConnected ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                        <CheckCircle size={14} className="text-green-600" />
                        <span className="text-xs font-bold text-green-700">Ollama Connected</span>
                    </div>
                    {models.length > 0 ? (
                        <div className="text-xs text-green-700 space-y-1">
                            <p className="font-medium">Available Models:</p>
                            <ul className="list-disc list-inside space-y-0.5">
                                {models.map(model => (
                                    <li key={model} className="text-green-600">{model}</li>
                                ))}
                            </ul>
                        </div>
                    ) : (
                        <p className="text-xs text-green-700">Ollama is running but no models found. Run: <code className="bg-green-100 px-1 rounded text-[9px]">ollama create codellama -f codellama.Modelfile</code></p>
                    )}
                </div>
            ) : (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                        <AlertCircle size={14} className="text-red-600" />
                        <span className="text-xs font-bold text-red-700">Ollama Not Connected</span>
                    </div>
                    <p className="text-xs text-red-700 mb-2">Make sure Ollama is installed and running on http://localhost:11434</p>
                    <a 
                        href="https://ollama.ai" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-xs text-red-600 hover:text-red-800 underline flex items-center gap-1"
                    >
                        Download Ollama <ExternalLink size={10} />
                    </a>
                </div>
            )}

            {showSetupGuide && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs text-gray-700 space-y-2 max-h-[200px] overflow-y-auto">
                    <p className="font-bold text-gray-800">Quick Setup:</p>
                    <ol className="list-decimal list-inside space-y-1 text-gray-600">
                        <li>Install Ollama from ollama.ai</li>
                        <li>Place model files in F:\Automations\Models\</li>
                        <li>Run: <code className="bg-white px-1 rounded">ollama create codellama -f codellama.Modelfile</code></li>
                        <li>Click "Test Connection" above</li>
                    </ol>
                    <p className="text-gray-500 italic mt-2">See LOCAL_MODELS_SETUP.md for detailed instructions</p>
                </div>
            )}
        </div>
    );
};

export default SettingsModal;
