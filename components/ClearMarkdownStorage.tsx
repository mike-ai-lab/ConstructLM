import React, { useState } from 'react';

const ClearMarkdownStorage: React.FC = () => {
  const [result, setResult] = useState('');

  const clearMarkdownFiles = async () => {
    try {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open('ConstructLM_PermanentStorage');
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      const tx = db.transaction(['files'], 'readwrite');
      const store = tx.objectStore('files');
      const allFiles = await new Promise<any[]>((resolve) => {
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
      });

      let deleted = 0;
      for (const file of allFiles) {
        if (file.name && file.name.endsWith('.md')) {
          await new Promise<void>((resolve) => {
            const req = store.delete(file.id);
            req.onsuccess = () => resolve();
          });
          deleted++;
          console.log('Deleted:', file.name);
        }
      }

      setResult(`✅ Deleted ${deleted} markdown files. Refresh the app and re-upload them.`);
    } catch (error) {
      setResult(`❌ Error: ${error}`);
    }
  };

  return (
    <div className="fixed top-4 right-4 z-50 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg border">
      <h3 className="font-bold mb-2">Clear Markdown Storage</h3>
      <button 
        onClick={clearMarkdownFiles}
        className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
      >
        Clear All .md Files
      </button>
      {result && <p className="mt-2 text-sm">{result}</p>}
    </div>
  );
};

export default ClearMarkdownStorage;
