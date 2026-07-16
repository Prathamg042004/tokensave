"use client";
import { useState } from "react";

const languages: any = {
  curl: {
    name: "cURL",
    code: `curl -X POST https://tokensave.vercel.app/api/proxy \\
  -H "Content-Type: application/json" \\
  -d '{
    "provider": "anthropic",
    "apiKey": "your-key",
    "messages": [{"role": "user", "content": "Hello"}]
  }'`,
  },
  javascript: {
    name: "JavaScript",
    code: `const response = await fetch("https://tokensave.vercel.app/api/proxy", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    provider: "anthropic",
    apiKey: "your-key",
    messages: [{ role: "user", content: "Hello" }]
  })
});
const data = await response.json();
console.log(data);`,
  },
  python: {
    name: "Python",
    code: `import requests

response = requests.post(
    "https://tokensave.vercel.app/api/proxy",
    json={
        "provider": "anthropic",
        "apiKey": "your-key",
        "messages": [{"role": "user", "content": "Hello"}]
    }
)
print(response.json())`,
  },
  nodejs: {
    name: "Node.js",
    code: `const axios = require('axios');

const response = await axios.post('https://tokensave.vercel.app/api/proxy', {
  provider: 'anthropic',
  apiKey: 'your-key',
  messages: [{ role: 'user', content: 'Hello' }]
});
console.log(response.data);`,
  },
  ruby: {
    name: "Ruby",
    code: `require 'net/http'
require 'json'

uri = URI('https://tokensave.vercel.app/api/proxy')
http = Net::HTTP.new(uri.host, uri.port)
http.use_ssl = true

request = Net::HTTP::Post.new(uri)
request['Content-Type'] = 'application/json'
request.body = {
  provider: 'anthropic',
  apiKey: 'your-key',
  messages: [{ role: 'user', content: 'Hello' }]
}.to_json

response = http.request(request)
puts JSON.parse(response.body)`,
  },
  php: {
    name: "PHP",
    code: `$ch = curl_init('https://tokensave.vercel.app/api/proxy');
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
    'provider' => 'anthropic',
    'apiKey' => 'your-key',
    'messages' => [['role' => 'user', 'content' => 'Hello']]
]));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$response = curl_exec($ch);
echo $response;`,
  },
  go: {
    name: "Go",
    code: `package main

import (
    "bytes"
    "encoding/json"
    "fmt"
    "net/http"
    "io"
)

func main() {
    body, _ := json.Marshal(map[string]interface{}{
        "provider": "anthropic",
        "apiKey":   "your-key",
        "messages": []map[string]string{
            {"role": "user", "content": "Hello"},
        },
    })

    resp, _ := http.Post(
        "https://tokensave.vercel.app/api/proxy",
        "application/json",
        bytes.NewBuffer(body),
    )
    defer resp.Body.Close()
    result, _ := io.ReadAll(resp.Body)
    fmt.Println(string(result))
}`,
  },
  java: {
    name: "Java",
    code: `HttpClient client = HttpClient.newHttpClient();
String json = """
    {
        "provider": "anthropic",
        "apiKey": "your-key",
        "messages": [{"role": "user", "content": "Hello"}]
    }
    """;

HttpRequest request = HttpRequest.newBuilder()
    .uri(URI.create("https://tokensave.vercel.app/api/proxy"))
    .header("Content-Type", "application/json")
    .POST(HttpRequest.BodyPublishers.ofString(json))
    .build();

HttpResponse<String> response = client.send(request,
    HttpResponse.BodyHandlers.ofString());
System.out.println(response.body());`,
  },
};

export default function APIReference() {
  const [activeLang, setActiveLang] = useState("javascript");
  const [copied, setCopied] = useState(false);

  const copyCode = () => {
    navigator.clipboard.writeText(languages[activeLang].code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <nav className="flex justify-between items-center px-6 md:px-8 py-4 border-b border-gray-800/50 max-w-5xl mx-auto">
        <a href="/" className="flex items-center gap-2">
          <div className="w-7 h-7 bg-cyan-400 rounded-md flex items-center justify-center text-gray-950 font-bold text-xs">TS</div>
          <span className="text-lg font-bold">TokenSave</span>
        </a>
        <div className="flex gap-4">
          <a href="/docs" className="text-sm text-gray-500 hover:text-gray-300">Docs</a>
          <a href="/dashboard" className="text-sm text-gray-500 hover:text-gray-300">Dashboard</a>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 md:px-8 py-12">
        <h1 className="text-3xl font-bold mb-2">API Reference</h1>
        <p className="text-gray-500 mb-8">Code examples in 8 languages. Copy and paste into your project.</p>

        <div className="flex gap-2 flex-wrap mb-6">
          {Object.keys(languages).map((lang) => (
            <button key={lang} onClick={() => setActiveLang(lang)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeLang === lang ? "bg-cyan-400 text-gray-950" : "bg-gray-900 border border-gray-800 text-gray-400 hover:text-gray-200"}`}>
              {languages[lang].name}
            </button>
          ))}
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
            <span className="text-sm text-gray-400 font-mono">{languages[activeLang].name}</span>
            <button onClick={copyCode} className="text-xs text-gray-500 hover:text-cyan-400 transition-colors">{copied ? "Copied!" : "Copy code"}</button>
          </div>
          <pre className="p-4 text-sm text-gray-300 overflow-x-auto leading-relaxed">{languages[activeLang].code}</pre>
        </div>

        <div className="mt-12">
          <h2 className="text-xl font-semibold mb-6">All Endpoints</h2>
          <div className="space-y-4">
            {[
              { method: "POST", path: "/api/proxy", desc: "Send a single AI request through the optimization pipeline" },
              { method: "POST", path: "/api/batch", desc: "Process up to 50 prompts in a single request" },
              { method: "POST", path: "/api/trim-context", desc: "Trim old messages from long conversations" },
              { method: "GET", path: "/api/proxy", desc: "Check API status and version" },
              { method: "GET", path: "/api/stats", desc: "Get usage statistics and recent logs" },
              { method: "POST", path: "/api/generate-key", desc: "Generate or rotate your TokenSave API key" },
              { method: "POST", path: "/api/analytics", desc: "Submit anonymous usage stats from the SDK" },
            ].map((endpoint, i) => (
              <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                <span className={`px-3 py-1 rounded text-xs font-mono font-bold w-fit ${endpoint.method === "POST" ? "bg-cyan-400/10 text-cyan-400" : "bg-green-400/10 text-green-400"}`}>{endpoint.method}</span>
                <span className="text-gray-200 font-mono text-sm">{endpoint.path}</span>
                <span className="text-gray-500 text-sm sm:ml-auto">{endpoint.desc}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <footer className="border-t border-gray-800 max-w-4xl mx-auto px-6 md:px-8 py-8 flex flex-col md:flex-row justify-between items-center gap-4 text-gray-600 text-sm"><p>© 2026 TokenSave</p><div className="flex gap-4"><a href="/docs" className="hover:text-gray-400">Docs</a><a href="/security" className="hover:text-gray-400">Security</a><a href="/changelog" className="hover:text-gray-400">Changelog</a><a href="/status" className="hover:text-gray-400">Status</a></div></footer>
    </div>
  );
}