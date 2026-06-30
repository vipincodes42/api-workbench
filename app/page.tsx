"use client";

import { useState } from "react";

type ApiResponse = {
  status: number;
  statusText: string;
  responseTime: number;
  body: string;
  error?: string;
};

export default function Home() {
  function formatJson(text: string) {
  try {
    return JSON.stringify(JSON.parse(text), null, 2);
  } catch {
    return text;
  }
}
  const [method, setMethod] = useState("GET");
  const [url, setUrl] = useState("https://api.github.com/users/octocat");
  const [response, setResponse] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(false);

  async function sendRequest() {
    setLoading(true);
    setResponse(null);

    const res = await fetch("/api/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        method,
        url,
        headers: {},
        body: null,
      }),
    });

    const data = await res.json();
    setResponse(data);
    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-gray-100 p-10">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-800 mb-8">
          API Workbench
        </h1>

        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex gap-4 mb-6">
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="border rounded-lg px-4 py-2"
            >
              <option>GET</option>
              <option>POST</option>
              <option>PUT</option>
              <option>DELETE</option>
              <option>PATCH</option>
            </select>

            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="flex-1 border rounded-lg px-4 py-2"
            />

            <button
              onClick={sendRequest}
              className="bg-blue-600 text-white px-6 rounded-lg hover:bg-blue-700"
            >
              {loading ? "Sending..." : "Send"}
            </button>
          </div>

          <div>
            <h2 className="font-semibold mb-2">Response</h2>

            <div className="border rounded-lg p-4 min-h-64 bg-gray-50">
              {!response && (
                <p className="text-gray-500">
                  Click <strong>Send</strong> to view the response.
                </p>
              )}

              {response && (
                <>
                  <div className="flex gap-4 mb-4 text-sm">
                    <span>Status: {response.status}</span>
                    <span>Text: {response.statusText}</span>
                    <span>Time: {response.responseTime}ms</span>
                  </div>

                  <pre className="bg-black text-green-400 p-4 rounded-lg overflow-auto text-sm">
                    {formatJson(response.body)}
                  </pre>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}