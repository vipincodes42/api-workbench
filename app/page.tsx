export default function Home() {
  return (
    <main className="min-h-screen bg-gray-100 p-10">
      <div className="max-w-6xl mx-auto">
        {/* Title */}
        <h1 className="text-4xl font-bold text-gray-800 mb-8">
          API Workbench
        </h1>

        {/* Request Builder */}
        <div className="bg-white rounded-xl shadow-md p-6">

          {/* Top Row */}
          <div className="flex gap-4 mb-6">
            <select className="border rounded-lg px-4 py-2">
              <option>GET</option>
              <option>POST</option>
              <option>PUT</option>
              <option>DELETE</option>
              <option>PATCH</option>
            </select>

            <input
              type="text"
              placeholder="https://api.example.com/users"
              className="flex-1 border rounded-lg px-4 py-2"
            />

            <button className="bg-blue-600 text-white px-6 rounded-lg hover:bg-blue-700">
              Send
            </button>
          </div>

          {/* Headers */}
          <div className="mb-6">
            <h2 className="font-semibold mb-2">Headers</h2>

            <div className="border rounded-lg p-4 text-gray-400">
              No headers added yet.
            </div>
          </div>

          {/* Body */}
          <div className="mb-6">
            <h2 className="font-semibold mb-2">Request Body</h2>

            <textarea
              rows={8}
              placeholder='{
  "name": "John"
}'
              className="w-full border rounded-lg p-4 font-mono"
            />
          </div>

          {/* Response */}
          <div>
            <h2 className="font-semibold mb-2">Response</h2>

            <div className="border rounded-lg p-4 h-64 bg-gray-50">
              <p className="text-gray-500">
                Click <strong>Send</strong> to view the response.
              </p>
            </div>
          </div>

        </div>
      </div>
    </main>
  );
}