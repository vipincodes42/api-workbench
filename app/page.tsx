"use client";

import { useEffect, useMemo, useState } from "react";

type ApiResponse = {
  status?: number;
  statusText?: string;
  responseTime?: number;
  responseSize?: number;
  headers?: Record<string, string>;
  body?: string;
  error?: string;
};

type QueryParam = {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
};

type SavedRequest = {
  id: string;
  name: string;
  method: string;
  url: string;
  headersText: string;
  bodyText: string;
  queryParams: QueryParam[];
  createdAt: string;
};

type Collection = {
  id: string;
  name: string;
  requests: SavedRequest[];
};

const tabs = ["pretty", "raw", "headers"];
const bodyMethods = ["POST", "PUT", "PATCH", "DELETE"];
const historyKey = "api-workbench-history";
const collectionsKey = "api-workbench-collections";

const emptyParam = (): QueryParam => ({
  id: crypto.randomUUID(),
  key: "",
  value: "",
  enabled: true,
});

export default function Home() {
  const [method, setMethod] = useState("GET");
  const [url, setUrl] = useState("https://api.github.com/users/octocat");
  const [headersText, setHeadersText] = useState("");
  const [bodyText, setBodyText] = useState("");
  const [queryParams, setQueryParams] = useState<QueryParam[]>([emptyParam()]);
  const [response, setResponse] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("pretty");
  const [history, setHistory] = useState<SavedRequest[]>(readHistory);
  const [collections, setCollections] = useState<Collection[]>(readCollections);
  const [collectionName, setCollectionName] = useState("Favorites");
  const [selectedCollectionId, setSelectedCollectionId] = useState("");
  const [curlText, setCurlText] = useState("");
  const [copyLabel, setCopyLabel] = useState("Copy");

  useEffect(() => {
    localStorage.setItem(historyKey, JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    localStorage.setItem(collectionsKey, JSON.stringify(collections));
  }, [collections]);

  const builtUrl = useMemo(() => buildUrl(url, queryParams), [url, queryParams]);
  const canSend = Boolean(url.trim()) && !loading;
  const supportsBody = bodyMethods.includes(method);

  const responseBody =
    response &&
    (activeTab === "pretty"
      ? formatJson(response.body ?? "")
      : activeTab === "raw"
        ? response.body
        : JSON.stringify(response.headers ?? {}, null, 2));

  const statusTone =
    response?.status && response.status >= 200 && response.status < 300
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : response?.status && response.status >= 400
        ? "border-rose-200 bg-rose-50 text-rose-700"
        : "border-amber-200 bg-amber-50 text-amber-700";

  function updateParam(id: string, field: keyof QueryParam, value: string | boolean) {
    setQueryParams((params) =>
      params.map((param) =>
        param.id === id ? { ...param, [field]: value } : param,
      ),
    );
  }

  function removeParam(id: string) {
    setQueryParams((params) =>
      params.length === 1 ? [emptyParam()] : params.filter((param) => param.id !== id),
    );
  }

  function currentRequest(): SavedRequest {
    return {
      id: crypto.randomUUID(),
      name: `${method} ${url || "Untitled request"}`,
      method,
      url,
      headersText,
      bodyText,
      queryParams,
      createdAt: new Date().toISOString(),
    };
  }

  function loadRequest(request: SavedRequest) {
    setMethod(request.method);
    setUrl(request.url);
    setHeadersText(request.headersText);
    setBodyText(request.bodyText);
    setQueryParams(request.queryParams.length ? request.queryParams : [emptyParam()]);
    setResponse(null);
  }

  async function sendRequest() {
    if (!url.trim()) {
      setResponse({ error: "Enter a URL before sending the request." });
      return;
    }

    let requestUrl = "";

    try {
      requestUrl = builtUrl;
      new URL(requestUrl);
    } catch {
      setResponse({ error: "Invalid URL. Include http:// or https://." });
      return;
    }

    setLoading(true);
    setResponse(null);

    try {
      const res = await fetch("/api/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          method,
          url: requestUrl,
          headers: parseHeaders(headersText),
          body: supportsBody && bodyText.trim() ? bodyText : null,
        }),
      });

      const data = await res.json();
      setResponse(data);

      if (!data.error) {
        setHistory((items) => [currentRequest(), ...items].slice(0, 12));
      }
    } catch {
      setResponse({ error: "Network failure. Check your connection and try again." });
    } finally {
      setLoading(false);
    }
  }

  async function copyResponse() {
    if (!responseBody) {
      return;
    }

    await navigator.clipboard.writeText(responseBody);
    setCopyLabel("Copied");
    window.setTimeout(() => setCopyLabel("Copy"), 1200);
  }

  function clearWorkbench() {
    setMethod("GET");
    setUrl("");
    setHeadersText("");
    setBodyText("");
    setQueryParams([emptyParam()]);
    setResponse(null);
    setActiveTab("pretty");
  }

  function saveToCollection() {
    const request = currentRequest();
    const targetId = selectedCollectionId || crypto.randomUUID();

    setCollections((items) => {
      const existing = items.find((collection) => collection.id === targetId);

      if (existing) {
        return items.map((collection) =>
          collection.id === targetId
            ? { ...collection, requests: [request, ...collection.requests] }
            : collection,
        );
      }

      const newCollection = {
        id: targetId,
        name: collectionName.trim() || "Favorites",
        requests: [request],
      };
      setSelectedCollectionId(targetId);
      return [newCollection, ...items];
    });
  }

  function importCurl() {
    const imported = parseCurl(curlText);

    if (!imported) {
      setResponse({ error: "Could not parse that cURL command." });
      return;
    }

    setMethod(imported.method);
    setUrl(imported.url);
    setHeadersText(imported.headersText);
    setBodyText(imported.bodyText);
    setQueryParams(imported.queryParams);
    setResponse(null);
  }

  function exportCollections() {
    const file = new Blob([JSON.stringify(collections, null, 2)], {
      type: "application/json",
    });
    const downloadUrl = URL.createObjectURL(file);
    const link = document.createElement("a");

    link.href = downloadUrl;
    link.download = "api-workbench-collections.json";
    link.click();
    URL.revokeObjectURL(downloadUrl);
  }

  return (
    <main className="min-h-screen bg-[#f5f7fb] text-slate-950">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-5 sm:px-6 lg:px-8">
        <header className="mb-5 flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Request console
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
              API Workbench
            </h1>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={clearWorkbench}
              className="h-10 rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-400"
            >
              Clear
            </button>
            <button
              onClick={saveToCollection}
              className="h-10 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
            >
              Save Request
            </button>
          </div>
        </header>

        <section className="grid flex-1 gap-5 xl:grid-cols-[minmax(340px,430px)_1fr_minmax(280px,340px)]">
          <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-5 py-4">
              <h2 className="text-base font-semibold text-slate-950">Request</h2>
            </div>

            <div className="space-y-5 p-5">
              <div className="grid grid-cols-[120px_1fr] gap-3">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">
                    Method
                  </span>
                  <select
                    value={method}
                    onChange={(event) => setMethod(event.target.value)}
                    className="h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-slate-950 focus:ring-4 focus:ring-slate-200"
                  >
                    <option>GET</option>
                    <option>POST</option>
                    <option>PUT</option>
                    <option>PATCH</option>
                    <option>DELETE</option>
                  </select>
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">
                    URL
                  </span>
                  <input
                    type="text"
                    value={url}
                    onChange={(event) => setUrl(event.target.value)}
                    placeholder="https://api.example.com/search"
                    className="h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-950 focus:ring-4 focus:ring-slate-200"
                  />
                </label>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-medium text-slate-700">
                    Query Params
                  </h3>
                  <button
                    onClick={() => setQueryParams((params) => [...params, emptyParam()])}
                    className="text-sm font-semibold text-slate-950 hover:text-slate-600"
                  >
                    Add
                  </button>
                </div>
                <div className="space-y-2">
                  {queryParams.map((param) => (
                    <div
                      key={param.id}
                      className="grid grid-cols-[24px_1fr_1fr_32px] gap-2"
                    >
                      <input
                        type="checkbox"
                        checked={param.enabled}
                        onChange={(event) =>
                          updateParam(param.id, "enabled", event.target.checked)
                        }
                        className="mt-3 h-4 w-4 accent-slate-950"
                        aria-label="Enable query parameter"
                      />
                      <input
                        value={param.key}
                        onChange={(event) =>
                          updateParam(param.id, "key", event.target.value)
                        }
                        placeholder="key"
                        className="h-10 rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-slate-950 focus:ring-4 focus:ring-slate-200"
                      />
                      <input
                        value={param.value}
                        onChange={(event) =>
                          updateParam(param.id, "value", event.target.value)
                        }
                        placeholder="value"
                        className="h-10 rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-slate-950 focus:ring-4 focus:ring-slate-200"
                      />
                      <button
                        onClick={() => removeParam(param.id)}
                        className="h-10 rounded-md border border-slate-300 text-sm font-semibold text-slate-600 hover:border-rose-300 hover:text-rose-600"
                        aria-label="Remove query parameter"
                      >
                        x
                      </button>
                    </div>
                  ))}
                </div>
                <p className="mt-2 break-all text-xs text-slate-500">{builtUrl}</p>
              </div>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  Headers
                </span>
                <textarea
                  value={headersText}
                  onChange={(event) => setHeadersText(event.target.value)}
                  rows={5}
                  placeholder={
                    "Authorization: Bearer token123\nAccept: application/json"
                  }
                  className="w-full resize-y rounded-md border border-slate-300 bg-slate-50 p-3 font-mono text-sm leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-950 focus:bg-white focus:ring-4 focus:ring-slate-200"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  Body
                </span>
                <textarea
                  value={bodyText}
                  onChange={(event) => setBodyText(event.target.value)}
                  rows={7}
                  disabled={!supportsBody}
                  placeholder={
                    supportsBody
                      ? '{\n  "name": "octocat"\n}'
                      : "Choose POST, PUT, PATCH, or DELETE to send a body"
                  }
                  className="w-full resize-y rounded-md border border-slate-300 bg-slate-50 p-3 font-mono text-sm leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-950 focus:bg-white focus:ring-4 focus:ring-slate-200 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                />
              </label>

              <button
                onClick={sendRequest}
                disabled={!canSend}
                className="flex h-11 w-full items-center justify-center rounded-md bg-slate-950 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {loading ? "Sending..." : "Send Request"}
              </button>
            </div>
          </div>

          <div className="flex min-h-[620px] flex-col rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-base font-semibold text-slate-950">Response</h2>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={copyResponse}
                  disabled={!responseBody}
                  className="h-9 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-400 disabled:cursor-not-allowed disabled:text-slate-400"
                >
                  {copyLabel}
                </button>
                <div className="grid grid-cols-3 overflow-hidden rounded-md border border-slate-200 bg-slate-100 p-1 text-sm">
                  {tabs.map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`h-8 rounded px-3 font-medium capitalize transition ${
                        activeTab === tab
                          ? "bg-white text-slate-950 shadow-sm"
                          : "text-slate-600 hover:text-slate-950"
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex flex-1 flex-col p-5">
              {!response && !loading && (
                <div className="flex flex-1 items-center justify-center rounded-md border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                  <p className="max-w-sm text-sm leading-6 text-slate-500">
                    Send a request to inspect the status, timing, size, headers,
                    and response body.
                  </p>
                </div>
              )}

              {loading && (
                <div className="flex flex-1 items-center justify-center rounded-md border border-slate-200 bg-slate-50 p-8 text-sm font-medium text-slate-600">
                  Waiting for the server response...
                </div>
              )}

              {response && (
                <div className="flex flex-1 flex-col gap-4">
                  {response.error ? (
                    <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
                      {response.error}
                    </div>
                  ) : (
                    <div className="grid gap-3 md:grid-cols-4">
                      <Metric
                        label="Status"
                        value={`${response.status} ${response.statusText}`}
                        className={statusTone}
                      />
                      <Metric
                        label="Time"
                        value={`${response.responseTime}ms`}
                        className="border-slate-200 bg-slate-50 text-slate-950"
                      />
                      <Metric
                        label="Size"
                        value={formatBytes(response.responseSize ?? 0)}
                        className="border-slate-200 bg-slate-50 text-slate-950"
                      />
                      <Metric
                        label="Headers"
                        value={`${Object.keys(response.headers ?? {}).length}`}
                        className="border-slate-200 bg-slate-50 text-slate-950"
                      />
                    </div>
                  )}

                  <pre className="min-h-[420px] flex-1 overflow-auto rounded-md border border-slate-900 bg-[#0b1020] p-4 font-mono text-sm leading-6 text-cyan-50 shadow-inner">
                    {responseBody || "No response body."}
                  </pre>
                </div>
              )}
            </div>
          </div>

          <aside className="space-y-5">
            <Panel title="Import cURL">
              <textarea
                value={curlText}
                onChange={(event) => setCurlText(event.target.value)}
                rows={5}
                placeholder={`curl -X POST https://api.example.com/users \\\n  -H "Content-Type: application/json" \\\n  -d '{"name":"Ada"}'`}
                className="w-full resize-y rounded-md border border-slate-300 bg-slate-50 p-3 font-mono text-xs leading-5 outline-none focus:border-slate-950 focus:bg-white focus:ring-4 focus:ring-slate-200"
              />
              <button
                onClick={importCurl}
                className="mt-3 h-10 w-full rounded-md border border-slate-300 bg-white text-sm font-semibold text-slate-700 shadow-sm hover:border-slate-400"
              >
                Import
              </button>
            </Panel>

            <Panel title="Collections">
              <div className="grid grid-cols-[1fr_120px] gap-2">
                <input
                  value={collectionName}
                  onChange={(event) => setCollectionName(event.target.value)}
                  placeholder="Folder name"
                  className="h-10 rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-slate-950 focus:ring-4 focus:ring-slate-200"
                />
                <select
                  value={selectedCollectionId}
                  onChange={(event) => setSelectedCollectionId(event.target.value)}
                  className="h-10 rounded-md border border-slate-300 bg-white px-2 text-sm outline-none focus:border-slate-950 focus:ring-4 focus:ring-slate-200"
                >
                  <option value="">New</option>
                  {collections.map((collection) => (
                    <option key={collection.id} value={collection.id}>
                      {collection.name}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={exportCollections}
                disabled={!collections.length}
                className="mt-3 h-10 w-full rounded-md border border-slate-300 bg-white text-sm font-semibold text-slate-700 shadow-sm hover:border-slate-400 disabled:cursor-not-allowed disabled:text-slate-400"
              >
                Export JSON
              </button>

              <div className="mt-4 space-y-3">
                {collections.length === 0 && (
                  <p className="text-sm text-slate-500">No saved collections yet.</p>
                )}
                {collections.map((collection) => (
                  <div key={collection.id}>
                    <p className="text-sm font-semibold text-slate-900">
                      {collection.name}
                    </p>
                    <div className="mt-2 space-y-2">
                      {collection.requests.slice(0, 4).map((request) => (
                        <RequestButton
                          key={request.id}
                          request={request}
                          onClick={() => loadRequest(request)}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel title="History">
              <div className="space-y-2">
                {history.length === 0 && (
                  <p className="text-sm text-slate-500">
                    Successful requests will appear here.
                  </p>
                )}
                {history.map((request) => (
                  <RequestButton
                    key={request.id}
                    request={request}
                    onClick={() => loadRequest(request)}
                  />
                ))}
              </div>
            </Panel>
          </aside>
        </section>
      </div>
    </main>
  );
}

function Metric({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className: string;
}) {
  return (
    <div className={`rounded-md border px-4 py-3 ${className}`}>
      <p className="text-xs font-medium uppercase tracking-wide opacity-75">
        {label}
      </p>
      <p className="mt-1 truncate text-lg font-semibold">{value}</p>
    </div>
  );
}

function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="mb-3 text-base font-semibold text-slate-950">{title}</h2>
      {children}
    </div>
  );
}

function RequestButton({
  request,
  onClick,
}: {
  request: SavedRequest;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="block w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-left transition hover:border-slate-300 hover:bg-white"
    >
      <span className="block truncate text-sm font-semibold text-slate-900">
        {request.method} {request.url}
      </span>
      <span className="mt-1 block text-xs text-slate-500">
        {new Date(request.createdAt).toLocaleString()}
      </span>
    </button>
  );
}

function parseHeaders(text: string) {
  const headers: Record<string, string> = {};

  text.split("\n").forEach((line) => {
    const [key, ...valueParts] = line.split(":");
    const value = valueParts.join(":").trim();

    if (key && value) {
      headers[key.trim()] = value;
    }
  });

  return headers;
}

function buildUrl(baseUrl: string, params: QueryParam[]) {
  if (!baseUrl.trim()) {
    return "";
  }

  try {
    const nextUrl = new URL(baseUrl);
    params.forEach((param) => {
      if (param.enabled && param.key.trim()) {
        nextUrl.searchParams.set(param.key.trim(), param.value);
      }
    });

    return nextUrl.toString();
  } catch {
    return baseUrl;
  }
}

function formatJson(text: string) {
  try {
    return JSON.stringify(JSON.parse(text), null, 2);
  } catch {
    return text;
  }
}

function formatBytes(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  return `${(bytes / 1024).toFixed(1)} KB`;
}

function parseCurl(command: string) {
  const tokens = command.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g);

  if (!tokens?.length || tokens[0] !== "curl") {
    return null;
  }

  let method = "GET";
  let requestUrl = "";
  const headers: string[] = [];
  let bodyText = "";

  for (let index = 1; index < tokens.length; index += 1) {
    const token = unquote(tokens[index]);
    const next = unquote(tokens[index + 1] ?? "");

    if ((token === "-X" || token === "--request") && next) {
      method = next.toUpperCase();
      index += 1;
    } else if ((token === "-H" || token === "--header") && next) {
      headers.push(next);
      index += 1;
    } else if (
      ["-d", "--data", "--data-raw", "--data-binary", "--data-ascii"].includes(token) &&
      next
    ) {
      bodyText = next;
      method = method === "GET" ? "POST" : method;
      index += 1;
    } else if (!token.startsWith("-") && !requestUrl) {
      requestUrl = token;
    }
  }

  if (!requestUrl) {
    return null;
  }

  const queryParams = extractQueryParams(requestUrl);
  const cleanUrl = stripQueryParams(requestUrl);

  return {
    method,
    url: cleanUrl,
    headersText: headers.join("\n"),
    bodyText,
    queryParams: queryParams.length ? queryParams : [emptyParam()],
  };
}

function extractQueryParams(requestUrl: string): QueryParam[] {
  try {
    const parsedUrl = new URL(requestUrl);
    return Array.from(parsedUrl.searchParams.entries()).map(([key, value]) => ({
      id: crypto.randomUUID(),
      key,
      value,
      enabled: true,
    }));
  } catch {
    return [];
  }
}

function stripQueryParams(requestUrl: string) {
  try {
    const parsedUrl = new URL(requestUrl);
    parsedUrl.search = "";
    return parsedUrl.toString();
  } catch {
    return requestUrl;
  }
}

function unquote(value: string) {
  return value.replace(/^["']|["']$/g, "");
}

function readHistory() {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    return JSON.parse(localStorage.getItem(historyKey) ?? "[]") as SavedRequest[];
  } catch {
    return [];
  }
}

function readCollections() {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    return JSON.parse(localStorage.getItem(collectionsKey) ?? "[]") as Collection[];
  } catch {
    return [];
  }
}
