import React from 'react';

function App(): React.JSX.Element {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <header className="border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <h1 className="text-2xl font-bold">TodoAssist</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          AI 감정 안전 비서
        </p>
      </header>
      <main className="p-6">
        <p>앱이 정상적으로 로드되었습니다.</p>
      </main>
    </div>
  );
}

export default App;
