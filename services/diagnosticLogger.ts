// DIAGNOSTIC LOGGER - FOR DEBUGGING ONLY
// Logs raw data for RAG pipeline inspection

class DiagnosticLogger {
  private logs: string[] = [];
  private enabled = true;

  log(section: string, data: any) {
    if (!this.enabled) return;
    
    const timestamp = new Date().toISOString();
    const logEntry = `\n${'='.repeat(80)}\n[${timestamp}] ${section}\n${'='.repeat(80)}\n${JSON.stringify(data, null, 2)}\n`;
    
    this.logs.push(logEntry);
    console.log(logEntry);
  }

  logRaw(section: string, text: string) {
    if (!this.enabled) return;
    
    const timestamp = new Date().toISOString();
    const logEntry = `\n${'='.repeat(80)}\n[${timestamp}] ${section}\n${'='.repeat(80)}\n${text}\n`;
    
    this.logs.push(logEntry);
    console.log(logEntry);
  }

  getAllLogs(): string {
    return this.logs.join('\n');
  }

  clear() {
    this.logs = [];
  }

  enable() {
    this.enabled = true;
  }

  disable() {
    this.enabled = false;
  }
}

export const diagnosticLogger = new DiagnosticLogger();
