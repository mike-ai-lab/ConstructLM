import React, { useState, useEffect } from 'react';
import { X, FileText, Brain, Search, MessageSquare, ChevronDown, ChevronRight, Eye, Database, Zap } from 'lucide-react';

interface ProcessStep {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'active' | 'completed' | 'error';
  details?: any;
  timestamp?: string;
  icon: React.ReactNode;
}

interface RAGProcessViewerProps {
  isOpen: boolean;
  onClose: () => void;
  recordingState: {
    isRecording: boolean;
    processSteps: ProcessStep[];
    expandedSteps: Set<string>;
  };
  setRecordingState: (state: any) => void;
}

export const RAGProcessViewer: React.FC<RAGProcessViewerProps> = ({ isOpen, onClose, recordingState, setRecordingState }) => {
  const { isRecording, processSteps, expandedSteps } = recordingState;

  // Initialize process steps if empty
  useEffect(() => {
    if (isOpen && processSteps.length === 0) {
      resetProcess();
    }
  }, [isOpen]);

  const resetProcess = () => {
    const initialSteps: ProcessStep[] = [
      {
        id: 'file-upload',
        title: '📁 File Upload',
        description: 'User uploads a document to the system',
        status: 'pending',
        icon: <FileText className="w-5 h-5" />
      },
      {
        id: 'file-parsing',
        title: '📖 Document Processing',
        description: 'Extract text content from the uploaded file',
        status: 'pending',
        icon: <FileText className="w-5 h-5" />
      },
      {
        id: 'text-chunking',
        title: '✂️ Text Chunking',
        description: 'Break document into smaller, manageable pieces',
        status: 'pending',
        icon: <Database className="w-5 h-5" />
      },
      {
        id: 'embedding-generation',
        title: '🧠 AI Understanding',
        description: 'Convert text chunks into AI-readable format (embeddings)',
        status: 'pending',
        icon: <Brain className="w-5 h-5" />
      },
      {
        id: 'vector-storage',
        title: '💾 Knowledge Storage',
        description: 'Store the AI understanding in searchable database',
        status: 'pending',
        icon: <Database className="w-5 h-5" />
      },
      {
        id: 'user-query',
        title: '❓ User Question',
        description: 'User asks a question about the document',
        status: 'pending',
        icon: <MessageSquare className="w-5 h-5" />
      },
      {
        id: 'semantic-search',
        title: '🔍 Smart Search',
        description: 'Find relevant parts of document using AI understanding',
        status: 'pending',
        icon: <Search className="w-5 h-5" />
      },
      {
        id: 'context-selection',
        title: '🎯 Context Selection',
        description: 'Choose the most relevant information to answer the question',
        status: 'pending',
        icon: <Eye className="w-5 h-5" />
      },
      {
        id: 'ai-response',
        title: '🤖 AI Response',
        description: 'Generate answer using selected context and citations',
        status: 'pending',
        icon: <Zap className="w-5 h-5" />
      }
    ];
    setRecordingState({
      ...recordingState,
      processSteps: initialSteps,
      expandedSteps: new Set()
    });
  };

  const toggleExpanded = (stepId: string) => {
    const newExpanded = new Set(expandedSteps);
    if (newExpanded.has(stepId)) {
      newExpanded.delete(stepId);
    } else {
      newExpanded.add(stepId);
    }
    setRecordingState({
      ...recordingState,
      expandedSteps: newExpanded
    });
  };

  const startRecording = () => {
    console.log('🔍 Starting RAG recording...');
    
    setRecordingState({
      ...recordingState,
      isRecording: true
    });
    resetProcess();
    
    // Start the RAG process tracker
    import('../services/ragProcessTracker').then(({ ragProcessTracker }) => {
      ragProcessTracker.startTracking();
    });
    
    // Listen for RAG process events
    const handleRAGEvent = (event: any) => {
      console.log('📊 RAG Event received:', event.detail);
      updateProcessStep(event.detail);
    };
    
    window.addEventListener('rag-process-event', handleRAGEvent);
  };

  const stopRecording = () => {
    console.log('🚫 Stopping RAG recording...');
    
    setRecordingState({
      ...recordingState,
      isRecording: false
    });
    
    // Stop the RAG process tracker
    import('../services/ragProcessTracker').then(({ ragProcessTracker }) => {
      ragProcessTracker.stopTracking();
    });
    
    window.removeEventListener('rag-process-event', updateProcessStep);
  };

  const updateProcessStep = (eventData: any) => {
    console.log('🔄 Updating process step:', eventData);
    
    setRecordingState((prev: any) => ({
      ...prev,
      processSteps: prev.processSteps.map((step: ProcessStep) => {
        if (step.id === eventData.stepId) {
          return {
            ...step,
            status: eventData.status,
            details: eventData.details,
            timestamp: new Date().toLocaleTimeString()
          };
        }
        return step;
      })
    }));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-50 border-green-200';
      case 'active': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'error': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-500 bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return '✅';
      case 'active': return '⏳';
      case 'error': return '❌';
      default: return '⭕';
    }
  };

  const renderStepDetails = (step: ProcessStep) => {
    if (!step.details) return null;

    return (
      <div className="mt-3 p-3 bg-gray-50 rounded-lg text-sm">
        <div className="space-y-2">
          {step.id === 'file-upload' && step.details && (
            <>
              <div><strong>File:</strong> {step.details.fileName}</div>
              <div><strong>Size:</strong> {(step.details.fileSize / 1024).toFixed(1)} KB</div>
              <div><strong>Type:</strong> {step.details.fileType}</div>
            </>
          )}
          
          {step.id === 'file-parsing' && step.details && (
            <>
              <div><strong>Content Length:</strong> {step.details.contentLength?.toLocaleString()} characters</div>
              <div><strong>Sections Found:</strong> {step.details.sections || 'N/A'}</div>
              <div><strong>Estimated Tokens:</strong> {step.details.tokenCount?.toLocaleString()}</div>
            </>
          )}
          
          {step.id === 'text-chunking' && step.details && (
            <>
              <div><strong>Total Chunks:</strong> {step.details.chunksCount}</div>
              <div><strong>Chunk Size:</strong> ~{step.details.avgChunkSize} characters each</div>
              <div><strong>Overlap:</strong> 10% between chunks for context</div>
              {step.details.sampleChunk && (
                <div className="mt-2">
                  <strong>Sample Chunk:</strong>
                  <div className="mt-1 p-2 bg-white rounded border text-xs font-mono">
                    {step.details.sampleChunk.substring(0, 200)}...
                  </div>
                </div>
              )}
            </>
          )}
          
          {step.id === 'embedding-generation' && step.details && (
            <>
              <div><strong>AI Model:</strong> Xenova/all-MiniLM-L6-v2 (Local)</div>
              <div><strong>Embedding Dimensions:</strong> 384</div>
              <div><strong>Processing Time:</strong> {step.details.timeTaken}ms</div>
              <div><strong>Privacy:</strong> 100% Local - No data sent to external APIs</div>
              {step.details.sampleEmbedding && (
                <div className="mt-2">
                  <strong>Sample Embedding Vector:</strong>
                  <div className="mt-1 p-2 bg-white rounded border text-xs font-mono">
                    [{step.details.sampleEmbedding.slice(0, 10).map((v: number) => v.toFixed(4)).join(', ')}...]
                  </div>
                </div>
              )}
            </>
          )}
          
          {step.id === 'user-query' && step.details && (
            <>
              <div><strong>Question:</strong> "{step.details.query}"</div>
              <div><strong>Query Length:</strong> {step.details.queryLength} characters</div>
              <div><strong>Files to Search:</strong> {step.details.filesCount}</div>
            </>
          )}
          
          {step.id === 'semantic-search' && step.details && (
            <>
              <div><strong>Search Method:</strong> {step.details.method}</div>
              <div><strong>Files Searched:</strong> {step.details.filesSearched}</div>
              <div><strong>Chunks Found:</strong> {step.details.chunksFound}</div>
              <div><strong>Top Similarity Scores:</strong></div>
              {step.details.topMatches?.map((match: any, idx: number) => (
                <div key={idx} className="ml-4 text-xs">
                  • {(match.score * 100).toFixed(1)}% - "{match.content.substring(0, 50)}..."
                </div>
              ))}
            </>
          )}
          
          {step.id === 'context-selection' && step.details && (
            <>
              <div><strong>Selected Chunks:</strong> {step.details.selectedChunks}</div>
              <div><strong>Total Context Tokens:</strong> {step.details.totalTokens}</div>
              <div><strong>Token Efficiency:</strong> {step.details.efficiency}% reduction</div>
              <div><strong>Files Used:</strong> {step.details.filesUsed?.join(', ')}</div>
            </>
          )}
          
          {step.id === 'ai-response' && step.details && (
            <>
              <div><strong>Model Used:</strong> {step.details.modelId}</div>
              <div><strong>Response Length:</strong> {step.details.responseLength} characters</div>
              <div><strong>Citations Generated:</strong> {step.details.citationsCount}</div>
              <div><strong>Processing Time:</strong> {step.details.processingTime}ms</div>
            </>
          )}
          
          {step.timestamp && (
            <div className="text-xs text-gray-500 mt-2">
              <strong>Completed at:</strong> {step.timestamp}
            </div>
          )}
        </div>
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-5/6 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">🔍 RAG Process Viewer</h2>
            <p className="text-gray-600 mt-1">See how your documents are processed and searched</p>
            {isRecording && (
              <p className="text-blue-600 text-sm mt-1 font-medium">Recording continues even when this window is closed</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            {!isRecording ? (
              <button
                onClick={startRecording}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
              >
                <div className="w-3 h-3 bg-white rounded-full"></div>
                Start Recording
              </button>
            ) : (
              <>
                <button
                  onClick={stopRecording}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2"
                >
                  <div className="w-3 h-3 bg-white rounded-sm"></div>
                  Stop Recording
                </button>
                <button
                  onClick={() => {
                    console.log('🧪 Testing RAG event...');
                    const testEvent = new CustomEvent('rag-process-event', {
                      detail: {
                        stepId: 'file-upload',
                        status: 'completed',
                        details: { fileName: 'test.pdf', fileSize: 12345, fileType: 'application/pdf' }
                      }
                    });
                    window.dispatchEvent(testEvent);
                  }}
                  className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                >
                  Test
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {!isRecording && (
            <div className="text-center py-12 text-gray-500">
              <Brain className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium mb-2">Ready to Record RAG Process</h3>
              <p>Click "Start Recording" then upload a file and ask questions to see the complete flow</p>
            </div>
          )}

          {isRecording && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div className="flex items-center gap-2 text-blue-800">
                  <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                  <span className="font-medium">Recording Active</span>
                </div>
                <p className="text-blue-700 text-sm mt-1">
                  Upload a file and ask questions to see each step of the RAG process
                </p>
              </div>

              {processSteps.map((step, index) => (
                <div
                  key={step.id}
                  className={`border rounded-lg p-4 ${getStatusColor(step.status)}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="text-2xl">{getStatusIcon(step.status)}</div>
                      <div className="flex items-center gap-2">
                        {step.icon}
                        <span className="font-medium">{step.title}</span>
                      </div>
                    </div>
                    
                    {step.details && (
                      <button
                        onClick={() => toggleExpanded(step.id)}
                        className="p-1 hover:bg-white hover:bg-opacity-50 rounded"
                      >
                        {expandedSteps.has(step.id) ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </button>
                    )}
                  </div>
                  
                  <p className="text-sm mt-2 ml-8">{step.description}</p>
                  
                  {expandedSteps.has(step.id) && renderStepDetails(step)}
                  
                  {index < processSteps.length - 1 && (
                    <div className="flex justify-center mt-4">
                      <div className="w-px h-6 bg-gray-300"></div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t p-4 bg-gray-50">
          <div className="text-sm text-gray-600">
            <strong>What you'll see:</strong> Complete flow from file upload → AI understanding → smart search → accurate answers with citations
          </div>
        </div>
      </div>
    </div>
  );
};