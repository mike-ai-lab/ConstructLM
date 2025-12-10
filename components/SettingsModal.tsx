
import React, { useState, useEffect } from 'react';
import { X, Save, Key, ShieldCheck, AlertCircle, CheckCircle, Loader2, Play } from 'lucide-react';
import { saveApiKey, getStoredApiKey } from '../services/modelRegistry';

interface SettingsModalProps {
    onClose: () => void;
}

type Provider = 'google' | 'openai' | 'groq';

const SettingsModal: React.FC<SettingsModalProps> = ({ onClose }) => {
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

        setTestingProvider(provider);
        setTestResults(prev => ({ ...prev, [provider]: null }));

        try {
            if (provider === 'google') {
                // Test Google Gemini
                const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: "Hi" }] }],
                        generationConfig: { maxOutputTokens: 1 }
                    })
                });
                
                if (!response.ok) {
                    const err = await response.json().catch(() => ({}));
                    throw new Error(err.error?.message || `Error ${response.status}`);
                }
            } 
            else if (provider === 'groq') {
                // Test Groq
                const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${key}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        model: 'llama-3.1-8b-instant',
                        messages: [{ role: 'user', content: 'Hi' }],
                        max_tokens: 1
                    })
                });

                if (!response.ok) {
                    const err = await response.json().catch(() => ({}));
                    throw new Error(err.error?.message || `Error ${response.status}`);
                }
            }
            else if (provider === 'openai') {
                // Test OpenAI
                const response = await fetch('https://api.openai.com/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${key}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        model: 'gpt-4o-mini',
                        messages: [{ role: 'user', content: 'Hi' }],
                        max_tokens: 1
                    })
                });

                if (!response.ok) {
                    const err = await response.json().catch(() => ({}));
                    throw new Error(err.error?.message || `Error ${response.status}`);
                }
            }

            setTestResults(prev => ({ ...prev, [provider]: { success: true, message: "Valid Key" } }));

        } catch (error: any) {
            setTestResults(prev => ({ ...prev, [provider]: { success: false, message: error.message || "Connection failed" } }));
        } finally {
            setTestingProvider(null);
        }
    };

    const handleSave = () => {
        saveApiKey('API_KEY', keys.google);
        saveApiKey('OPENAI_API_KEY', keys.openai);
        saveApiKey('GROQ_API_KEY', keys.groq);
        
        setShowSuccess(true);
        setTimeout(() => {
            setShowSuccess(false);
            onClose();
        }, 800);
    };

    const renderInput = (label: string, provider: Provider, placeholder: string, desc: string) => (
        <div className="space-y-1.5">
            <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">{label}</label>
                {testResults[provider] && (
                    <span className={`text-[10px] flex items-center gap-1 ${testResults[provider]?.success ? 'text-green-600' : 'text-red-500'}`}>
                        {testResults[provider]?.success ? <CheckCircle size={10} /> : <AlertCircle size={10} />}
                        {testResults[provider]?.message}
                    </span>
                )}
            </div>
            <div className="flex gap-2">
                <input 
                    type="password" 
                    value={keys[provider]}
                    onChange={e => {
                        setKeys({...keys, [provider]: e.target.value});
                        setTestResults(prev => ({ ...prev, [provider]: null })); // Reset test on change
                    }}
                    placeholder={placeholder}
                    className={`flex-1 px-3 py-2 bg-gray-50 border rounded-lg text-sm focus:outline-none focus:ring-2 transition-all ${testResults[provider]?.success === false ? 'border-red-300 focus:ring-red-200' : 'border-gray-200 focus:ring-blue-500/20 focus:border-blue-500'}`}
                />
                <button
                    onClick={() => validateKey(provider, keys[provider])}
                    disabled={testingProvider === provider || !keys[provider]}
                    className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    title="Test API Connection"
                >
                    {testingProvider === provider ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
                </button>
            </div>
            <p className="text-[10px] text-gray-400">{desc}</p>
        </div>
    );

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                            <Key size={18} />
                        </div>
                        <h2 className="font-semibold text-gray-800">API Configuration</h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full text-gray-500 transition-colors">
                        <X size={18} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto space-y-6">
                    <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 flex gap-3">
                        <ShieldCheck size={18} className="text-blue-600 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-blue-800 leading-relaxed">
                            Your API keys are stored securely in your browser's local storage. You can verify them before saving to ensure a smooth experience.
                        </p>
                    </div>

                    <div className="space-y-4">
                        {renderInput('Google Gemini API Key', 'google', 'AIzaSy...', 'Required for Gemini models and Text-to-Speech (Free Tier available).')}
                        {renderInput('Groq API Key', 'groq', 'gsk_...', 'Required for Llama 3 and Gemma 2 models (Free Tier available).')}
                        {renderInput('OpenAI API Key', 'openai', 'sk-...', 'Required for GPT-4o models (Paid).')}
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3">
                    <button 
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-200/50 rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={handleSave}
                        className={`
                            px-4 py-2 text-sm font-medium text-white rounded-lg shadow-sm flex items-center gap-2 transition-all
                            ${showSuccess ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'}
                        `}
                    >
                        {showSuccess ? (
                            <>Saved!</>
                        ) : (
                            <><Save size={16} /> Save Configuration</>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SettingsModal;
