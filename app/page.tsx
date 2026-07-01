"use client";

import { useState } from "react";

type ApiResponse = {
  status: number;
  statusText: string;
  responseTime: number;
  headers: Record<string, string>;
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
  const [activeTab, setActiveTab] = useState("pretty");

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
            <div className="flex gap-2 mb-4">
  <button
    onClick={() => setActiveTab("pretty")}
    className={`px-4 py-2 rounded ${
      activeTab === "pretty"
        ? "bg-blue-600 text-white"
        : "bg-gray-200"
    }`}
  >
    Pretty
  </button>

  <button
    onClick={() => setActiveTab("raw")}
    className={`px-4 py-2 rounded ${
      activeTab === "raw"
        ? "bg-blue-600 text-white"
        : "bg-gray-200"
    }`}
  >
    Raw
  </button>

 <button
  onClick={() => setActiveTab("headers")}
  className={`px-4 py-2 rounded ${
    activeTab === "headers"
      ? "bg-blue-600 text-white"
      : "bg-gray-200"
  }`}
>
  Headers
</button>
</div>

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
  {activeTab === "pretty"
  ? formatJson(response.body)
  : activeTab === "raw"
  ? response.body
  : JSON.stringify(response.headers, null, 2)}
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