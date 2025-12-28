/**
 * pipelineTracker.ts
 * Global state manager for tracking file processing and query pipeline
 */

type StepStatus = 'waiting' | 'active' | 'complete' | 'error';

interface PipelineStep {
  id: string;
  label: string;
  status: StepStatus;
  progress?: string;
  detail?: string;
}

type PipelineListener = (steps: PipelineStep[]) => void;

class PipelineTrackerService {
  private steps: PipelineStep[] = [];
  private listeners: Set<PipelineListener> = new Set();
  private isActive = false;

  // File upload pipeline
  startFileUpload(fileName?: string) {
    console.log(`[PIPELINE] startFileUpload: ${fileName}`);
    this.isActive = true;
    this.steps = [
      { id: 'upload', label: 'Upload', status: 'active', detail: fileName },
      { id: 'parse', label: 'Parse', status: 'waiting' },
      { id: 'embed', label: 'Embed', status: 'waiting' },
      { id: 'store', label: 'Index', status: 'waiting' },
      { id: 'ready', label: 'Ready', status: 'waiting' }
    ];
    this.notify();
  }

  updateStep(stepId: string, status: StepStatus, progress?: string, detail?: string) {
    console.log(`[PIPELINE ${Date.now()}] updateStep: ${stepId} -> ${status}`, { progress, detail });
    const step = this.steps.find(s => s.id === stepId);
    if (step) {
      step.status = status;
      if (progress) step.progress = progress;
      if (detail) step.detail = detail;
      this.notify();
    }
  }

  completeStep(stepId: string) {
    console.log(`[PIPELINE] completeStep: ${stepId}`);
    this.updateStep(stepId, 'complete');
  }

  // Query pipeline
  startQuery(query: string) {
    console.log(`[PIPELINE] startQuery: ${query.slice(0, 30)}...`);
    this.isActive = true;
    this.steps = [
      { id: 'query', label: 'Query', status: 'complete', detail: query.slice(0, 20) + '...' },
      { id: 'search', label: 'Semantic Search', status: 'active' },
      { id: 'select', label: 'Select Context', status: 'waiting' },
      { id: 'llm', label: 'AI Processing', status: 'waiting' },
      { id: 'response', label: 'Response', status: 'waiting' }
    ];
    this.notify();
  }

  clear() {
    console.log(`[PIPELINE] clear`);
    this.isActive = false;
    this.steps = [];
    this.notify();
  }

  reset() {
    this.clear();
  }

  subscribe(listener: PipelineListener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach(listener => listener([...this.steps]));
  }

  getSteps() {
    return [...this.steps];
  }

  isTracking() {
    return this.isActive;
  }
}

export const pipelineTracker = new PipelineTrackerService();
